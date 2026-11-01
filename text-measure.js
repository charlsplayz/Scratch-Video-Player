// Name: Text Measure
// ID: charlietextmeasure
// Description: Measures text, reads wrapped rows, and adds blur and glow to Animated Text sprites.
// By: Charlie and Claude
// License: MIT

(function (Scratch) {
  "use strict";

  if (!Scratch.extensions.unsandboxed) {
    throw new Error("Text Measure must be loaded unsandboxed");
  }

  const renderer = Scratch.vm.renderer;
  const ctx = document.createElement("canvas").getContext("2d");

  // Finds the Animated Text skin on this sprite (or null if it has none).
  const getTextSkin = (target) => {
    const drawable = renderer._allDrawables[target.drawableID];
    const skin = drawable && drawable.skin;
    if (
      skin &&
      Array.isArray(skin.lines) &&
      typeof skin.fontFamily === "string"
    ) {
      return skin;
    }
    return null;
  };

  /* ------------------------------------------------------------------ *
   *  Blur and glow
   *
   *  Animated Text draws onto a normal HTML canvas using strokeText()
   *  (the outline) and fillText() (the letters). We wrap those two
   *  functions on the sprite's own canvas. When blur or glow is on:
   *    - blur: the letters are drawn far off-canvas, and only their
   *      canvas "shadow" (which is blurred) lands on the canvas.
   *    - glow: a blurred shadow is drawn first, then the sharp letters.
   *  Blur needs room around the letters, so the skin's outline width is
   *  raised to act as padding (the outline itself is skipped or kept at
   *  its original thickness, so the letters do not get fatter).
   * ------------------------------------------------------------------ */

  const OFFSET = 20000; // how far off-canvas the letters go for pure blur

  // "#rrggbb" or "rgb(...)" -> [r, g, b] (so we can fade it with an alpha).
  const colorCtx = document.createElement("canvas").getContext("2d");
  const toRGB = (css) => {
    colorCtx.fillStyle = "#ffffff";
    colorCtx.fillStyle = css;
    const v = colorCtx.fillStyle;
    if (v[0] === "#") {
      return [
        parseInt(v.slice(1, 3), 16),
        parseInt(v.slice(3, 5), 16),
        parseInt(v.slice(5, 7), 16),
      ];
    }
    const m = /(\d+)\D+(\d+)\D+(\d+)/.exec(v);
    return m ? [+m[1], +m[2], +m[3]] : [255, 255, 255];
  };

  const patchSkin = (skin) => {
    if (skin.__fxPatched) return;
    skin.__fxPatched = true;
    const c = skin.ctx;
    const proto = Object.getPrototypeOf(c);
    const fillOrig = proto.fillText;
    const strokeOrig = proto.strokeText;

    // Which row of the text is being drawn (worked out from its y position).
    const rowOf = (y) =>
      Math.round(
        (y - skin.verticalPadding - skin.baseFontSize) / skin.lineHeight
      );

    // The fill edge for a row: a number of text pixels, or null for "no edge".
    // A row that is not in the list counts as empty (edge 0).
    const edgeFor = (fx, y) => {
      if (!fx.edges) return null;
      const e = fx.edges[rowOf(y)];
      return e === undefined ? 0 : e;
    };

    // A left-to-right fade: solid up to (edge - soft), clear at edge.
    // "shift" moves the gradient along with letters drawn off-canvas.
    const styleFor = (fx, base, x, edge, shift) => {
      if (edge === null) return base;
      const rgb = toRGB(typeof base === "string" ? base : "#ffffff");
      const soft = Math.max(0.01, fx.soft);
      const g = c.createLinearGradient(
        x + edge - soft + shift,
        0,
        x + edge + shift,
        0
      );
      g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`);
      g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      return g;
    };

    // Draw only the blurred shadow of the text at (x, y).
    const shadowOnly = (fx, text, x, y, radius, color, base, edge) => {
      const k = c.getTransform().a; // device pixels per text pixel
      c.save();
      c.shadowColor = color;
      c.shadowBlur = radius * k;
      c.shadowOffsetX = OFFSET;
      c.shadowOffsetY = 0;
      c.fillStyle = styleFor(fx, base, x, edge, -OFFSET / k);
      fillOrig.call(c, text, x - OFFSET / k, y);
      c.restore();
    };

    c.fillText = function (text, x, y) {
      const fx = skin.__fx;
      if (!fx || (fx.blur <= 0 && fx.glow <= 0 && !fx.edges)) {
        return fillOrig.call(c, text, x, y);
      }
      const base = c.fillStyle;
      const own = typeof base === "string" ? base : "#ffffff";
      const edge = edgeFor(fx, y);
      if (edge !== null && edge <= 0) return undefined; // empty row
      if (fx.blur > 0) {
        shadowOnly(fx, text, x, y, fx.blur, own, own, edge);
        return undefined;
      }
      if (fx.glow > 0) {
        shadowOnly(fx, text, x, y, fx.glow, fx.glowColor, own, edge);
      }
      c.save();
      c.fillStyle = styleFor(fx, own, x, edge, 0);
      fillOrig.call(c, text, x, y);
      c.restore();
      return undefined;
    };

    c.strokeText = function (text, x, y) {
      const fx = skin.__fx;
      if (!fx || (fx.blur <= 0 && fx.glow <= 0 && !fx.edges)) {
        return strokeOrig.call(c, text, x, y);
      }
      if (fx.blur > 0) return undefined; // blurry text has no outline
      const edge = edgeFor(fx, y);
      if (edge !== null && edge <= 0) return undefined;
      const width = fx.blur > 0 || fx.glow > 0 ? fx.baseOutline : c.lineWidth;
      if (!(width > 0)) return undefined;
      c.save();
      c.lineWidth = width; // keep the original thickness
      if (edge !== null) {
        c.strokeStyle = styleFor(fx, c.strokeStyle, x, edge, 0);
      }
      strokeOrig.call(c, text, x, y);
      c.restore();
      return undefined;
    };
  };

  // Re-make the text after blur or glow changed.
  const refreshFx = (skin) => {
    const fx = skin.__fx;
    const need = Math.max(fx.blur, fx.glow);
    const pad = need > 0 ? Math.ceil(need * 1.15) + 1 : 0;
    const want = Math.max(fx.baseOutline, pad);
    if (skin.outlineWidth !== want) {
      skin.setOutlineWidth(want); // changes the padding (and redraws)
    } else {
      skin._invalidateTexture(); // just redraws
    }
  };

  const getFx = (skin) => {
    if (!skin.__fx) {
      skin.__fx = {
        blur: 0,
        glow: 0,
        glowColor: "#ffffff",
        edges: null, // per-row fill edges in text pixels, or null
        soft: 14, // how wide the soft edge is, in text pixels
        baseOutline: skin.outlineWidth,
      };
      patchSkin(skin);
    }
    return skin.__fx;
  };

  class TextMeasure {
    getInfo() {
      return {
        id: "charlietextmeasure",
        name: "Text Measure",
        color1: "#5b6bff",
        blocks: [
          {
            opcode: "widthOf",
            blockType: Scratch.BlockType.REPORTER,
            text: "width of [TEXT] in this sprite's font",
            arguments: {
              TEXT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Hey, bud",
              },
            },
          },
          {
            opcode: "rows",
            blockType: Scratch.BlockType.REPORTER,
            text: "wrapped rows of this text",
            disableMonitor: true,
          },
          "---",
          {
            opcode: "setBlur",
            blockType: Scratch.BlockType.COMMAND,
            text: "set text blur [PX]",
            arguments: {
              PX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "setGlow",
            blockType: Scratch.BlockType.COMMAND,
            text: "set text glow [PX] color [COLOR]",
            arguments: {
              PX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              COLOR: {
                type: Scratch.ArgumentType.COLOR,
                defaultValue: "#ffffff",
              },
            },
          },
          {
            opcode: "setFillEdges",
            blockType: Scratch.BlockType.COMMAND,
            text: "set text fill edge [EDGES] soft [SOFT]",
            arguments: {
              EDGES: { type: Scratch.ArgumentType.STRING, defaultValue: "100" },
              SOFT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 14 },
            },
          },
          {
            opcode: "clearFillEdges",
            blockType: Scratch.BlockType.COMMAND,
            text: "clear text fill edge",
          },
        ],
      };
    }

    // Width of the text at 100% size, using the same font string as Animated Text.
    widthOf(args, util) {
      const skin = getTextSkin(util.target);
      const size = skin ? skin.baseFontSize : 24;
      const family = skin ? skin.fontFamily : "Sans Serif";
      ctx.font = `${size}px ${family}, sans-serif`;
      return ctx.measureText(Scratch.Cast.toString(args.TEXT)).width;
    }

    // JSON list of rows: [{"start":1,"end":13,"width":190.2}, ...]
    // start/end are 1-based letter positions in the displayed text.
    rows(args, util) {
      const skin = getTextSkin(util.target);
      if (!skin) return "[]";
      void skin.size; // makes the skin lay out its text if it needs to
      const full = String(skin.text);
      const out = [];
      let index = 0;
      for (const line of skin.lines) {
        let at = full.indexOf(line.text, index);
        if (at < 0) at = index;
        out.push({
          start: at + 1,
          end: at + line.text.length,
          width: line.width,
        });
        index = at + line.text.length;
      }
      return JSON.stringify(out);
    }

    // Blur radius in text pixels (at 100% size). 0 = sharp.
    setBlur(args, util) {
      const skin = getTextSkin(util.target);
      if (!skin) return;
      const px = Math.max(0, Number(args.PX) || 0);
      if (!skin.__fx && px <= 0) return; // nothing to turn off
      const fx = getFx(skin);
      if (Math.abs(fx.blur - px) < 0.05) return;
      fx.blur = px;
      refreshFx(skin);
    }

    // Show only the left part of each row, with a soft fading edge.
    // EDGES is one number (first row only) or a list like [200,45] (one per
    // row), in text pixels at 100% size. A row that is missing or 0 is empty.
    setFillEdges(args, util) {
      const skin = getTextSkin(util.target);
      if (!skin) return;
      let list;
      const raw = Scratch.Cast.toString(args.EDGES).trim();
      if (raw[0] === "[") {
        try {
          list = JSON.parse(raw).map((n) => Number(n) || 0);
        } catch (e) {
          list = [0];
        }
      } else {
        list = [Number(raw) || 0];
      }
      const soft = Math.max(0, Number(args.SOFT) || 0);
      const fx = getFx(skin);
      const same =
        fx.edges &&
        fx.edges.length === list.length &&
        fx.edges.every((n, i) => Math.abs(n - list[i]) < 0.05) &&
        Math.abs(fx.soft - soft) < 0.05;
      if (same) return;
      fx.edges = list;
      fx.soft = soft;
      skin._invalidateTexture();
    }

    clearFillEdges(args, util) {
      const skin = getTextSkin(util.target);
      if (!skin || !skin.__fx || !skin.__fx.edges) return;
      skin.__fx.edges = null;
      skin._invalidateTexture();
    }

    // Glow radius in text pixels (at 100% size). 0 = no glow.
    setGlow(args, util) {
      const skin = getTextSkin(util.target);
      if (!skin) return;
      const px = Math.max(0, Number(args.PX) || 0);
      const color = Scratch.Cast.toString(args.COLOR);
      if (!skin.__fx && px <= 0) return;
      const fx = getFx(skin);
      if (Math.abs(fx.glow - px) < 0.05 && fx.glowColor === color) return;
      fx.glow = px;
      fx.glowColor = color;
      refreshFx(skin);
    }
  }

  Scratch.extensions.register(new TextMeasure());
})(Scratch);
