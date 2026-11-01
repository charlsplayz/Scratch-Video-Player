// Name: Audio Tags
// ID: charlieaudiotags
// Description: Read title, artist, album, year, track, genre and duration from audio files (MP3, M4A, FLAC, OGG, Opus).
// License: MIT

(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('Audio Tags must be loaded as an unsandboxed extension');
  }

  /* ------------------------------------------------------------------ *
   *  Small byte helpers
   * ------------------------------------------------------------------ */

  // Big-endian unsigned 32-bit integer. ">>> 0" stops it going negative.
  const u32be = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  // Little-endian unsigned 32-bit integer (used by Vorbis comments).
  const u32le = (b, o) => ((b[o + 3] << 24) | (b[o + 2] << 16) | (b[o + 1] << 8) | b[o]) >>> 0;
  // ID3v2 "synchsafe" integer: 4 bytes, only the low 7 bits of each are used.
  const synchsafe = (b, o) => (b[o] << 21) | (b[o + 1] << 14) | (b[o + 2] << 7) | b[o + 3];
  // Bytes -> string, one char per byte (for 4-character codes like "moov").
  const ascii = (b, s, e) => String.fromCharCode(...b.subarray(s, e));
  const utf8 = (b) => new TextDecoder('utf-8').decode(b);

  // Find a byte pattern inside a buffer. Returns -1 if it is not there.
  const indexOfBytes = (buf, pattern) => {
    outer: for (let i = 0; i <= buf.length - pattern.length; i++) {
      for (let j = 0; j < pattern.length; j++) {
        if (buf[i + j] !== pattern[j]) continue outer;
      }
      return i;
    }
    return -1;
  };

  // Undo ID3 "unsynchronisation": every FF 00 pair really means FF.
  const unsync = (b) => {
    const out = [];
    for (let i = 0; i < b.length; i++) {
      out.push(b[i]);
      if (b[i] === 0xff && b[i + 1] === 0x00) i++;
    }
    return Uint8Array.from(out);
  };

  /* ------------------------------------------------------------------ *
   *  BlobReader: read small slices of a file without loading all of it
   * ------------------------------------------------------------------ */

  class BlobReader {
    constructor(blob) {
      this.blob = blob;
      this.size = blob.size;
    }
    async read(offset, length) {
      const end = Math.min(this.size, offset + length);
      if (offset < 0 || offset >= end) return new Uint8Array(0);
      return new Uint8Array(await this.blob.slice(offset, end).arrayBuffer());
    }
  }

  /* ------------------------------------------------------------------ *
   *  Result object + clean-up
   * ------------------------------------------------------------------ */

  const emptyTags = () => ({
    title: '', artist: '', album: '', albumArtist: '',
    year: '', track: '', genre: '', duration: '', format: 'none'
  });

  // Tidy raw values: first 4-digit year, track number without "/total", "(13)Pop" -> "Pop".
  const cleanTags = (t) => {
    for (const k of ['title', 'artist', 'album', 'albumArtist', 'genre']) {
      t[k] = String(t[k] || '').trim();
    }
    const y = /\d{4}/.exec(t.year || '');
    t.year = y ? y[0] : '';
    const n = /^\d+/.exec(String(t.track || '').trim());
    t.track = n ? n[0] : '';
    t.genre = t.genre.replace(/^\(\d+\)(?=.)/, '');
    return t;
  };

  /* ------------------------------------------------------------------ *
   *  ID3v2 (MP3). Versions 2.2, 2.3 and 2.4.
   * ------------------------------------------------------------------ */

  // v2.2 used 3-letter frame IDs; map them to the modern 4-letter ones.
  const V22_IDS = { TT2: 'TIT2', TP1: 'TPE1', TAL: 'TALB', TP2: 'TPE2', TYE: 'TYER', TRK: 'TRCK', TCO: 'TCON' };
  // Which frame holds which tag.
  const FRAME_KEYS = {
    TIT2: 'title', TPE1: 'artist', TALB: 'album', TPE2: 'albumArtist',
    TDRC: 'year', TYER: 'year', TRCK: 'track', TCON: 'genre'
  };

  // The first byte of a text frame says which text encoding follows.
  const decodeID3Text = (bytes) => {
    const enc = bytes[0];
    let body = bytes.subarray(1);
    let label = 'windows-1252'; // 0 = ISO-8859-1
    if (enc === 1) {
      label = 'utf-16le';
      if (body[0] === 0xff && body[1] === 0xfe) { body = body.subarray(2); }
      else if (body[0] === 0xfe && body[1] === 0xff) { label = 'utf-16be'; body = body.subarray(2); }
    } else if (enc === 2) label = 'utf-16be';
    else if (enc === 3) label = 'utf-8';
    return new TextDecoder(label).decode(body)
      .replace(/﻿/g, '')
      .split('\u0000').map((s) => s.trim()).filter(Boolean).join(', ');
  };

  async function readID3v2(reader) {
    const head = await reader.read(0, 10);
    if (head.length < 10 || ascii(head, 0, 3) !== 'ID3') return null;

    const major = head[3];
    const flags = head[5];
    const tagSize = synchsafe(head, 6);
    let data = await reader.read(10, tagSize);
    if (major === 3 && (flags & 0x80)) data = unsync(data);

    let pos = 0;
    // Skip the optional extended header.
    if (major >= 3 && (flags & 0x40)) {
      pos = major === 4 ? synchsafe(data, 0) : u32be(data, 0) + 4;
    }

    const idLen = major === 2 ? 3 : 4;
    const hdrLen = major === 2 ? 6 : 10;
    const tags = {};

    while (pos + hdrLen <= data.length) {
      if (data[pos] === 0) break; // padding reached, no more frames
      let id = ascii(data, pos, pos + idLen);
      let size;
      if (major === 2) size = (data[pos + 3] << 16) | (data[pos + 4] << 8) | data[pos + 5];
      else if (major === 3) size = u32be(data, pos + 4);
      else size = synchsafe(data, pos + 4);

      const start = pos + hdrLen;
      const end = start + size;
      if (size <= 0 || end > data.length) break;
      pos = end;

      if (major === 2) id = V22_IDS[id] || id;
      const key = FRAME_KEYS[id];
      if (!key || tags[key]) continue; // not a frame we want (or already have it)

      let body = data.subarray(start, end);
      const fmt = major >= 3 ? data[start - 1] : 0; // second flag byte
      if (major === 3) {
        if (fmt & 0xc0) continue;            // compressed or encrypted: skip
        if (fmt & 0x20) body = body.subarray(1); // grouping byte
      } else if (major === 4) {
        if (fmt & 0x0c) continue;            // compressed or encrypted: skip
        let skip = 0;
        if (fmt & 0x40) skip += 1;           // grouping byte
        if (fmt & 0x01) skip += 4;           // data length indicator
        body = body.subarray(skip);
        if (fmt & 0x02) body = unsync(body); // per-frame unsynchronisation
      }
      if (body.length < 2) continue;
      tags[key] = decodeID3Text(body);
    }
    return tags;
  }

  /* ------------------------------------------------------------------ *
   *  ID3v1 (MP3): a fixed 128-byte block at the very end of the file
   * ------------------------------------------------------------------ */

  async function readID3v1(reader) {
    if (reader.size < 128) return null;
    const t = await reader.read(reader.size - 128, 128);
    if (ascii(t, 0, 3) !== 'TAG') return null;
    // Fields are padded with zeros: cut each at the first zero byte.
    const field = (a, b) => new TextDecoder('windows-1252').decode(t.subarray(a, b)).replace(/\0[\s\S]*$/, '').trim();
    const tags = {
      title: field(3, 33), artist: field(33, 63), album: field(63, 93), year: field(93, 97)
    };
    // ID3v1.1 stores the track number in the last byte of the comment.
    if (t[125] === 0 && t[126] !== 0) tags.track = String(t[126]);
    return tags;
  }

  /* ------------------------------------------------------------------ *
   *  MP4 / M4A: a tree of "boxes" (atoms). Tags live at
   *  moov > udta > meta > ilst > (item) > data
   * ------------------------------------------------------------------ */

  async function readBoxHeader(reader, off, limit) {
    const h = await reader.read(off, 16);
    if (h.length < 8) return null;
    let size = u32be(h, 0);
    const type = ascii(h, 4, 8);
    let hdr = 8;
    if (size === 1) {               // 64-bit size follows the type
      if (h.length < 16) return null;
      size = u32be(h, 8) * 4294967296 + u32be(h, 12);
      hdr = 16;
    } else if (size === 0) {        // box runs to the end of the file
      size = limit - off;
    }
    if (size < hdr) return null;
    return { type, start: off, hdr, end: Math.min(off + size, limit) };
  }

  // Walk sibling boxes between start..end until one has the wanted type.
  async function findBox(reader, start, end, type) {
    let off = start;
    while (off + 8 <= end) {
      const b = await readBoxHeader(reader, off, end);
      if (!b) return null;
      if (b.type === type) return b;
      off = b.end;
    }
    return null;
  }

  // ilst item types: "\xA9" is the (c) symbol, so \xA9nam = title.
  const MP4_KEYS = {
    '©nam': 'title', '©ART': 'artist', '©alb': 'album',
    'aART': 'albumArtist', '©day': 'year', '©gen': 'genre', 'trkn': 'track'
  };

  async function readMP4(reader) {
    const moov = await findBox(reader, 0, reader.size, 'moov');
    if (!moov) return null;
    const udta = await findBox(reader, moov.start + moov.hdr, moov.end, 'udta');
    if (!udta) return null;
    const meta = await findBox(reader, udta.start + udta.hdr, udta.end, 'meta');
    if (!meta) return null;
    // "meta" is normally a full box (4 extra version/flag bytes); try both.
    let ilst = await findBox(reader, meta.start + meta.hdr + 4, meta.end, 'ilst');
    if (!ilst) ilst = await findBox(reader, meta.start + meta.hdr, meta.end, 'ilst');
    if (!ilst) return null;

    const tags = {};
    let off = ilst.start + ilst.hdr;
    while (off + 8 <= ilst.end) {
      const item = await readBoxHeader(reader, off, ilst.end);
      if (!item) break;
      off = item.end;
      const key = MP4_KEYS[item.type];
      if (!key) continue; // skips big items like cover art without reading them

      const p = await reader.read(item.start + item.hdr, item.end - item.start - item.hdr);
      if (p.length < 16 || ascii(p, 4, 8) !== 'data') continue;
      const dataSize = Math.min(u32be(p, 0), p.length);
      const value = p.subarray(16, dataSize); // 8 header + 4 type/flags + 4 locale
      if (key === 'track') {
        if (value.length >= 4) tags.track = String((value[2] << 8) | value[3]);
      } else {
        tags[key] = utf8(value);
      }
    }
    return tags;
  }

  /* ------------------------------------------------------------------ *
   *  FLAC / Ogg: "Vorbis comments" (KEY=value strings)
   * ------------------------------------------------------------------ */

  const VORBIS_KEYS = {
    TITLE: 'title', ARTIST: 'artist', ALBUM: 'album', ALBUMARTIST: 'albumArtist',
    DATE: 'year', YEAR: 'year', TRACKNUMBER: 'track', GENRE: 'genre'
  };

  function parseVorbisComments(b, off) {
    const tags = {};
    if (off + 4 > b.length) return tags;
    off += 4 + u32le(b, off);            // skip the vendor string
    if (off + 4 > b.length) return tags;
    const count = u32le(b, off); off += 4;
    for (let i = 0; i < count && off + 4 <= b.length; i++) {
      const len = u32le(b, off); off += 4;
      if (off + len > b.length) break;
      const s = utf8(b.subarray(off, off + len)); off += len;
      const eq = s.indexOf('=');
      if (eq < 1) continue;
      const key = VORBIS_KEYS[s.slice(0, eq).toUpperCase()];
      if (key && !tags[key]) tags[key] = s.slice(eq + 1);
    }
    return tags;
  }

  async function readFLAC(reader) {
    let off = 4; // after "fLaC"
    for (let i = 0; i < 64; i++) {
      const h = await reader.read(off, 4);
      if (h.length < 4) return null;
      const isLast = (h[0] & 0x80) !== 0;
      const type = h[0] & 0x7f;
      const len = (h[1] << 16) | (h[2] << 8) | h[3];
      if (type === 4) {
        const body = await reader.read(off + 4, len);
        return parseVorbisComments(body, 0);
      }
      if (isLast) return null;
      off += 4 + len;
    }
    return null;
  }

  const enc = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));
  const VORBIS_MARK = Uint8Array.from([0x03, 0x76, 0x6f, 0x72, 0x62, 0x69, 0x73]); // 03 "vorbis"
  const OPUS_MARK = enc('OpusTags');

  async function readOgg(reader) {
    const buf = await reader.read(0, 131072); // comment header is near the start
    let i = indexOfBytes(buf, VORBIS_MARK);
    if (i >= 0) return parseVorbisComments(buf, i + VORBIS_MARK.length);
    i = indexOfBytes(buf, OPUS_MARK);
    if (i >= 0) return parseVorbisComments(buf, i + OPUS_MARK.length);
    return null;
  }

  /* ------------------------------------------------------------------ *
   *  Put it together: detect the format, read tags, fill in blanks
   * ------------------------------------------------------------------ */

  async function readAllTags(reader) {
    const result = emptyTags();
    const head = await reader.read(0, 12);
    let found = null;
    let format = 'none';

    if (ascii(head, 0, 3) === 'ID3') { found = await readID3v2(reader); format = 'id3v2'; }
    else if (ascii(head, 4, 8) === 'ftyp') { found = await readMP4(reader); format = 'mp4'; }
    else if (ascii(head, 0, 4) === 'fLaC') { found = await readFLAC(reader); format = 'flac'; }
    else if (ascii(head, 0, 4) === 'OggS') { found = await readOgg(reader); format = 'ogg'; }

    // Plain MP3 files can also carry the old ID3v1 block at the end.
    if (!found || !(found.title || found.artist)) {
      const v1 = await readID3v1(reader);
      if (v1) { found = v1; format = 'id3v1'; }
    }

    if (found) Object.assign(result, found);
    result.format = found ? format : 'none';
    return cleanTags(result);
  }

  // The browser can tell us the length without us parsing audio frames.
  function probeDuration(url) {
    return new Promise((resolve) => {
      const a = new Audio();
      a.preload = 'metadata';
      const done = (v) => {
        clearTimeout(timer);
        a.onloadedmetadata = a.onerror = null;
        a.removeAttribute('src');
        resolve(v);
      };
      const timer = setTimeout(() => done(''), 5000);
      a.onloadedmetadata = () => done(isFinite(a.duration) ? Math.round(a.duration * 1000) / 1000 : '');
      a.onerror = () => done('');
      a.src = url;
    });
  }

  /* ------------------------------------------------------------------ *
   *  The Scratch extension itself
   * ------------------------------------------------------------------ */

  class AudioTags {
    constructor() {
      this.tags = emptyTags();
    }

    getInfo() {
      return {
        id: 'charlieaudiotags',
        name: 'Audio Tags',
        color1: '#fa2d48',
        blocks: [
          {
            opcode: 'readTags',
            blockType: Scratch.BlockType.COMMAND,
            text: 'read tags from [URL]',
            arguments: { URL: { type: Scratch.ArgumentType.STRING, defaultValue: '' } }
          },
          {
            opcode: 'getTag',
            blockType: Scratch.BlockType.REPORTER,
            text: 'tag [TAG]',
            arguments: { TAG: { type: Scratch.ArgumentType.STRING, menu: 'TAGS', defaultValue: 'title' } }
          },
          {
            opcode: 'tagsJSON',
            blockType: Scratch.BlockType.REPORTER,
            text: 'tags as JSON'
          },
          {
            opcode: 'tagsFound',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'tags found?'
          },
          {
            opcode: 'tagFormat',
            blockType: Scratch.BlockType.REPORTER,
            text: 'tag format'
          }
        ],
        menus: {
          TAGS: {
            acceptReporters: true,
            items: [
              { text: 'title', value: 'title' },
              { text: 'artist', value: 'artist' },
              { text: 'album', value: 'album' },
              { text: 'album artist', value: 'albumArtist' },
              { text: 'year', value: 'year' },
              { text: 'track number', value: 'track' },
              { text: 'genre', value: 'genre' },
              { text: 'duration (seconds)', value: 'duration' }
            ]
          }
        }
      };
    }

    async readTags({ URL }) {
      this.tags = emptyTags(); // clear old results first
      try {
        const res = await Scratch.fetch(String(URL));
        const blob = await res.blob();
        const [tags, duration] = await Promise.all([
          readAllTags(new BlobReader(blob)),
          probeDuration(String(URL))
        ]);
        tags.duration = duration;
        this.tags = tags;
      } catch (e) {
        console.warn('[Audio Tags] could not read tags:', e);
        this.tags = emptyTags();
        this.tags.format = 'error';
      }
    }

    getTag({ TAG }) {
      const v = this.tags[String(TAG)];
      return v === undefined ? '' : v;
    }

    tagsJSON() {
      return JSON.stringify(this.tags);
    }

    tagsFound() {
      return Boolean(this.tags.title || this.tags.artist);
    }

    tagFormat() {
      return this.tags.format;
    }
  }

  Scratch.extensions.register(new AudioTags());

  // Exposed only so the file can be unit-tested outside TurboWarp.
  if (typeof globalThis !== 'undefined' && globalThis.__AUDIO_TAGS_TEST__) {
    globalThis.__AUDIO_TAGS_TEST__.readAllTags = readAllTags;
    globalThis.__AUDIO_TAGS_TEST__.BlobReader = BlobReader;
  }
})(Scratch);
