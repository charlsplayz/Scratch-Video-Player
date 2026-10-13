// Cover Blobs - TurboWarp extension (must be loaded "without sandbox")
// 1) Fetches an album cover from a link, blurs + saturates it, and lets any sprite
//    (including clones) wear it as a soft blob or a filled backdrop.
// 2) Analyses the playing track (bass / mids / highs / loudness / kick) so the
//    blobs can react to the music. Levels are normalised per song.
(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('Cover Blobs must run unsandboxed (tick "Run extension without sandbox").');
  }

  const vm = Scratch.vm;
  const SMALL = 48;   // size the cover is shrunk to before blurring
  const OUT = 128;    // size of the finished skins (stage pixels at 100% sprite size)
  const BLUR_RADIUS = 5;
  const BLUR_PASSES = 3;
  const SATURATION = 1.45;
  const BRIGHTNESS = 0.92;

  const skins = { soft: null, filled: null };
  let loaded = false;
  let lastError = '';
  let loadToken = 0;

  const getRenderer = () => vm.runtime.renderer;

  const blobToImage = (blob) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not decode that image')); };
    img.src = url;
  });

  const boxBlur = (a, w, h, r) => {
    const tmp = new Float32Array(a.length);
    const k = r * 2 + 1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let o = -r; o <= r; o++) {
          const xx = Math.min(w - 1, Math.max(0, x + o));
          sum += a[y * w + xx];
        }
        tmp[y * w + x] = sum / k;
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let o = -r; o <= r; o++) {
          const yy = Math.min(h - 1, Math.max(0, y + o));
          sum += tmp[yy * w + x];
        }
        a[y * w + x] = sum / k;
      }
    }
  };

  const makeBlurredCover = (img) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SMALL;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const sw = img.naturalWidth || img.width;
    const sh = img.naturalHeight || img.height;
    const s = Math.min(sw, sh);
    ctx.drawImage(img, (sw - s) / 2, (sh - s) / 2, s, s, 0, 0, SMALL, SMALL);

    const image = ctx.getImageData(0, 0, SMALL, SMALL);
    const d = image.data;
    const n = SMALL * SMALL;
    const ch = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
    for (let i = 0; i < n; i++) {
      ch[0][i] = d[i * 4];
      ch[1][i] = d[i * 4 + 1];
      ch[2][i] = d[i * 4 + 2];
    }
    for (const a of ch) {
      for (let p = 0; p < BLUR_PASSES; p++) boxBlur(a, SMALL, SMALL, BLUR_RADIUS);
    }
    const clamp = (v) => Math.max(0, Math.min(255, v));
    for (let i = 0; i < n; i++) {
      const r = ch[0][i], g = ch[1][i], b = ch[2][i];
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      d[i * 4] = clamp((l + (r - l) * SATURATION) * BRIGHTNESS);
      d[i * 4 + 1] = clamp((l + (g - l) * SATURATION) * BRIGHTNESS);
      d[i * 4 + 2] = clamp((l + (b - l) * SATURATION) * BRIGHTNESS);
      d[i * 4 + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
  };

  const upscale = (small, feather) => {
    const out = document.createElement('canvas');
    out.width = out.height = OUT;
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(small, 0, 0, OUT, OUT);
    if (feather) {
      ctx.globalCompositeOperation = 'destination-in';
      const grad = ctx.createRadialGradient(OUT / 2, OUT / 2, 0, OUT / 2, OUT / 2, OUT / 2);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.4, 'rgba(0,0,0,0.9)');
      grad.addColorStop(0.75, 'rgba(0,0,0,0.35)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, OUT, OUT);
    }
    return out;
  };

  const setSkin = (name, canvas) => {
    const renderer = getRenderer();
    const center = [canvas.width / 2, canvas.height / 2];
    if (skins[name] === null) {
      skins[name] = renderer.createBitmapSkin(canvas, 1, center);
    } else {
      renderer.updateBitmapSkin(skins[name], canvas, 1, center);
    }
  };


  // ---------- audio analysis ----------
  const AN_RATE = 22050;      // decode rate (plenty for bass, mids and highs)
  const HOPS_PER_SEC = 60;    // analysis resolution
  const LOOKAHEAD = 0.04;     // seconds, hides the lag between audio and screen
  const ATTACK = 0.025;       // seconds, how fast levels rise
  const DECAY = { bass: 0.22, kick: 0.12, mids: 0.25, highs: 0.18, loud: 0.35 };
  const BANDS = ['bass', 'mids', 'highs', 'loud', 'kick'];

  let analysis = null;        // { duration, bass, mids, highs, loud, kick }
  let analysisStatus = 'idle';
  let analysisToken = 0;
  const levels = { bass: 0, mids: 0, highs: 0, loud: 0, kick: 0 };
  let lastUpdate = 0;

  const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0));

  const decodeAudio = async (url) => {
    let data;
    if (/^(data|blob):/i.test(url)) {
      data = await (await fetch(url)).arrayBuffer();
    } else {
      const res = await Scratch.fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      data = await res.arrayBuffer();
    }
    const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ctx = new Ctx(1, 1, AN_RATE);
    return new Promise((resolve, reject) => {
      const p = ctx.decodeAudioData(data, resolve, reject);
      if (p && p.catch) p.catch(reject);
    });
  };

  const percentile = (arr, p) => {
    const sorted = Float32Array.from(arr).sort();
    return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] || 0;
  };

  const analyseBuffer = async (buffer, token) => {
    const sr = buffer.sampleRate;
    const hop = Math.round(sr / HOPS_PER_SEC);
    const hops = Math.floor(buffer.length / hop);
    if (hops < 2) throw new Error('Audio too short');
    const chans = [];
    for (let c = 0; c < buffer.numberOfChannels; c++) chans.push(buffer.getChannelData(c));

    const bass = new Float32Array(hops);
    const mids = new Float32Array(hops);
    const highs = new Float32Array(hops);
    const loud = new Float32Array(hops);
    const coef = (fc) => 1 - Math.exp((-2 * Math.PI * fc) / sr);
    const aBass = coef(140), aMidLo = coef(250), aMidHi = coef(2000), aHigh = coef(4000);
    let b1 = 0, b2 = 0, ml = 0, mh = 0, h1 = 0, h2 = 0;

    for (let k = 0; k < hops; k++) {
      let sb = 0, sm = 0, sh = 0, sl = 0;
      const start = k * hop;
      for (let i = start; i < start + hop; i++) {
        let x = 0;
        for (let c = 0; c < chans.length; c++) x += chans[c][i];
        x /= chans.length;
        b1 += aBass * (x - b1);
        b2 += aBass * (b1 - b2);
        ml += aMidLo * (x - ml);
        mh += aMidHi * (x - mh);
        h1 += aHigh * (x - h1);
        const hp1 = x - h1;
        h2 += aHigh * (hp1 - h2);
        const mid = mh - ml;
        const high = hp1 - h2;
        sb += b2 * b2; sm += mid * mid; sh += high * high; sl += x * x;
      }
      bass[k] = Math.sqrt(sb / hop);
      mids[k] = Math.sqrt(sm / hop);
      highs[k] = Math.sqrt(sh / hop);
      loud[k] = Math.sqrt(sl / hop);
      if (k % 600 === 599) {
        await yieldToBrowser();
        if (token !== analysisToken) return null;
      }
    }

    const refLoud = Math.max(percentile(loud, 0.97), 1e-6);
    for (const arr of [bass, mids, highs, loud]) {
      const ref = Math.max(percentile(arr, 0.97), refLoud * 0.05, 1e-6);
      for (let i = 0; i < arr.length; i++) arr[i] = Math.min(1.5, arr[i] / ref);
    }

    const kick = new Float32Array(hops);
    const W = 36;
    let run = 0;
    for (let k = 0; k < hops; k++) {
      const base = k > 0 ? run / Math.min(k, W) : 0;
      kick[k] = Math.max(0, bass[k] - base * 1.1);
      run += bass[k];
      if (k >= W) run -= bass[k - W];
    }
    const kickRef = Math.max(percentile(kick, 0.97), 0.15);
    for (let i = 0; i < hops; i++) kick[i] = Math.min(1.5, kick[i] / kickRef);

    return { duration: buffer.length / sr, bass, mids, highs, loud, kick };
  };

  const sampleAnalysis = (progress) => {
    if (!analysis) return null;
    const p = Math.max(0, Math.min(1, progress));
    const pos = Math.max(0, p * analysis.duration + LOOKAHEAD) * HOPS_PER_SEC;
    const last = analysis.bass.length - 1;
    const i0 = Math.min(last, Math.floor(pos));
    const i1 = Math.min(last, i0 + 1);
    const f = Math.min(1, pos - i0);
    const out = {};
    for (const band of BANDS) out[band] = analysis[band][i0] * (1 - f) + analysis[band][i1] * f;
    return out;
  };

  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());


  // ---------- cover loading helpers ----------
  const coverCache = new Map();   // key -> { soft, filled } canvases (this session only)
  const COVER_CACHE_MAX = 40;

  const applyCover = (pair) => {
    setSkin('soft', pair.soft);
    setSkin('filled', pair.filled);
    loaded = true;
    lastError = '';
  };

  const rememberCover = (key, pair) => {
    if (!key) return;
    coverCache.delete(key);
    coverCache.set(key, pair);
    if (coverCache.size > COVER_CACHE_MAX) coverCache.delete(coverCache.keys().next().value);
  };

  const loadCoverFrom = async (url, key) => {
    const token = ++loadToken;
    try {
      const res = await Scratch.fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const img = await blobToImage(await res.blob());
      if (token !== loadToken) return;
      const small = makeBlurredCover(img);
      const pair = { soft: upscale(small, true), filled: upscale(small, false) };
      rememberCover(key || url, pair);
      applyCover(pair);
    } catch (e) {
      lastError = String((e && e.message) || e);
      console.warn('[Cover Blobs]', lastError);
    }
    vm.runtime.requestRedraw();
  };

  const artworkFromITunes = (jsonText) => {
    let data;
    try {
      data = JSON.parse(jsonText);
    } catch (e) {
      throw new Error('iTunes results are not valid JSON');
    }
    const first = data && Array.isArray(data.results) ? data.results[0] : null;
    const url = first && (first.artworkUrl100 || first.artworkUrl60 || first.artworkUrl30);
    if (!url) throw new Error('no artwork in the iTunes results');
    return url;
  };

  class CoverBlobs {
    getInfo() {
      return {
        id: 'coverblobs',
        name: 'Cover Blobs',
        color1: '#fa2d48',
        color2: '#d81f3a',
        blocks: [
          {
            opcode: 'loadCover',
            blockType: Scratch.BlockType.COMMAND,
            text: 'load cover art from [URL]',
            arguments: {
              URL: { type: Scratch.ArgumentType.STRING, defaultValue: 'https://' }
            }
          },
          {
            opcode: 'loadCoverITunes',
            blockType: Scratch.BlockType.COMMAND,
            text: 'load cover art from iTunes results [JSON] save as [KEY]',
            arguments: {
              JSON: { type: Scratch.ArgumentType.STRING, defaultValue: '{}' },
              KEY: { type: Scratch.ArgumentType.STRING, defaultValue: 'song' }
            }
          },
          {
            opcode: 'useSavedCover',
            blockType: Scratch.BlockType.COMMAND,
            text: 'use saved cover [KEY]',
            arguments: {
              KEY: { type: Scratch.ArgumentType.STRING, defaultValue: 'song' }
            }
          },
          {
            opcode: 'hasSavedCover',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'saved cover [KEY] exists?',
            arguments: {
              KEY: { type: Scratch.ArgumentType.STRING, defaultValue: 'song' }
            }
          },
          {
            opcode: 'showCover',
            blockType: Scratch.BlockType.COMMAND,
            text: 'show [KIND] cover on this sprite',
            arguments: {
              KIND: { type: Scratch.ArgumentType.STRING, menu: 'kinds', defaultValue: 'soft' }
            }
          },
          {
            opcode: 'isLoaded',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'cover art loaded?'
          },
          {
            opcode: 'getError',
            blockType: Scratch.BlockType.REPORTER,
            text: 'cover art error'
          },
          '---',
          {
            opcode: 'analyzeAudio',
            blockType: Scratch.BlockType.COMMAND,
            text: 'analyze audio from [URL]',
            arguments: {
              URL: { type: Scratch.ArgumentType.STRING, defaultValue: 'data:audio/...' }
            }
          },
          {
            opcode: 'updateLevels',
            blockType: Scratch.BlockType.COMMAND,
            text: 'update audio levels at progress [PROGRESS]',
            arguments: {
              PROGRESS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
            }
          },
          {
            opcode: 'getLevel',
            blockType: Scratch.BlockType.REPORTER,
            text: '[BAND] level',
            arguments: {
              BAND: { type: Scratch.ArgumentType.STRING, menu: 'bands', defaultValue: 'bass' }
            }
          },
          {
            opcode: 'getAnalysisStatus',
            blockType: Scratch.BlockType.REPORTER,
            text: 'audio analysis status'
          }
        ],
        menus: {
          bands: {
            acceptReporters: true,
            items: [
              { text: 'bass', value: 'bass' },
              { text: 'kick', value: 'kick' },
              { text: 'mids', value: 'mids' },
              { text: 'highs', value: 'highs' },
              { text: 'loudness', value: 'loud' }
            ]
          },
          kinds: {
            acceptReporters: true,
            items: [
              { text: 'soft blob', value: 'soft' },
              { text: 'filled backdrop', value: 'filled' }
            ]
          }
        }
      };
    }

    async loadCover(args) {
      const url = Scratch.Cast.toString(args.URL).trim();
      if (!url) return;
      await loadCoverFrom(url, url);
    }

    async loadCoverITunes(args) {
      const key = Scratch.Cast.toString(args.KEY).trim();
      let url;
      try {
        url = artworkFromITunes(Scratch.Cast.toString(args.JSON));
      } catch (e) {
        lastError = e.message;
        console.warn('[Cover Blobs]', lastError);
        return;
      }
      await loadCoverFrom(url, key || url);
    }

    useSavedCover(args) {
      const key = Scratch.Cast.toString(args.KEY).trim();
      const pair = coverCache.get(key);
      if (!pair) {
        lastError = 'no saved cover named "' + key + '"';
        return;
      }
      loadToken++;               // cancels any slower download still in flight
      applyCover(pair);
      vm.runtime.requestRedraw();
    }

    hasSavedCover(args) {
      return coverCache.has(Scratch.Cast.toString(args.KEY).trim());
    }

    showCover(args, util) {
      const kind = Scratch.Cast.toString(args.KIND) === 'filled' ? 'filled' : 'soft';
      const skinId = skins[kind];
      const renderer = getRenderer();
      if (skinId === null || !renderer || util.target.drawableID === undefined) return;
      renderer.updateDrawableSkinId(util.target.drawableID, skinId);
    }

    async analyzeAudio(args) {
      const url = Scratch.Cast.toString(args.URL).trim();
      const token = ++analysisToken;
      analysis = null;
      for (const band of BANDS) levels[band] = 0;
      if (!url) { analysisStatus = 'idle'; return; }
      analysisStatus = 'analyzing';
      // runs in the background so the project keeps going
      (async () => {
        try {
          const buffer = await decodeAudio(url);
          if (token !== analysisToken) return;
          const result = await analyseBuffer(buffer, token);
          if (!result || token !== analysisToken) return;
          analysis = result;
          analysisStatus = 'ready';
        } catch (e) {
          if (token !== analysisToken) return;
          analysisStatus = 'error: ' + String((e && e.message) || e);
          console.warn('[Cover Blobs] audio analysis failed:', e);
        }
      })();
    }

    updateLevels(args) {
      const t = now();
      const dt = Math.min(0.1, Math.max(0.001, (t - lastUpdate) / 1000));
      lastUpdate = t;
      const raw = sampleAnalysis(Scratch.Cast.toNumber(args.PROGRESS));
      for (const band of BANDS) {
        const target = raw ? raw[band] : 0;
        const tau = target > levels[band] ? ATTACK : DECAY[band];
        levels[band] += (target - levels[band]) * (1 - Math.exp(-dt / tau));
      }
    }

    getLevel(args) {
      const band = Scratch.Cast.toString(args.BAND);
      return Math.round((levels[band] || 0) * 1000) / 1000;
    }

    getAnalysisStatus() {
      return analysisStatus;
    }

    isLoaded() {
      return loaded;
    }

    getError() {
      return lastError;
    }
  }

  Scratch.extensions.register(new CoverBlobs());
})(Scratch);
