/* 手ぬぐい・タオル図案の生成エンジン（ブラウザと node の両方で動く）
   設定から、角字柄を敷き詰めてくり抜いた SVG（塗りのパスのみ・線なし）を作る */
(function (root) {
  'use strict';
  var SC = 100;                                   // Clipper 用の倍率（0.01mm 単位）

  function makeEngine(DATA, CL) {
    var V1 = DATA.V1, V3 = DATA.V3, F = DATA.F;
    var LW = DATA.logoW, LH = DATA.logoH;
    var P0 = [170, 425];                           // 柄の基準点

    var fb = [Infinity, Infinity, -Infinity, -Infinity];
    F.forEach(function (p) { p.forEach(function (q) {
      fb[0] = Math.min(fb[0], q[0]); fb[1] = Math.min(fb[1], q[1]); fb[2] = Math.max(fb[2], q[0]); fb[3] = Math.max(fb[3], q[1]);
    }); });
    var det = V1[0] * V3[1] - V1[1] * V3[0];
    function toLattice(x, y) { return [(x * V3[1] - y * V3[0]) / det, (V1[0] * y - V1[1] * x) / det]; }
    function rotPt(x, y, deg) {
      var r = deg * Math.PI / 180, c = Math.round(Math.cos(r) * 1e9) / 1e9, s = Math.round(Math.sin(r) * 1e9) / 1e9;
      return [x * c + y * s, -x * s + y * c];      // 90 で (x,y)→(y,-x)：元の上端が左へ
    }

    function patternPolys(cfg) {
      var W = cfg.W, H = cfg.H, k = cfg.patScale, deg = cfg.patRot;
      var C = [W / 2 + cfg.patDX, H / 2 + cfg.patDY];
      function fwd(x, y) { var v = rotPt(x - P0[0], y - P0[1], deg); return [C[0] + k * v[0], C[1] + k * v[1]]; }
      function inv(x, y) { var v = rotPt((x - C[0]) / k, (y - C[1]) / k, -deg); return [v[0] + P0[0], v[1] + P0[1]]; }
      var corners = [inv(0, 0), inv(W, 0), inv(0, H), inv(W, H)];
      var pads = [[fb[0], fb[1]], [fb[2], fb[1]], [fb[0], fb[3]], [fb[2], fb[3]]];
      var mi = Infinity, ma = -Infinity, mj = Infinity, mb = -Infinity;
      corners.forEach(function (c) { pads.forEach(function (pd) {
        var l = toLattice(c[0] - pd[0], c[1] - pd[1]);
        mi = Math.min(mi, l[0]); ma = Math.max(ma, l[0]); mj = Math.min(mj, l[1]); mb = Math.max(mb, l[1]);
      }); });
      var out = [];
      for (var i = Math.floor(mi) - 1; i <= Math.ceil(ma) + 1; i++) {
        for (var j = Math.floor(mj) - 1; j <= Math.ceil(mb) + 1; j++) {
          var sx = i * V1[0] + j * V3[0], sy = i * V1[1] + j * V3[1];
          for (var n = 0; n < F.length; n++) {
            var p = F[n], q = new Array(p.length), x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            for (var m = 0; m < p.length; m++) {
              var c = fwd(p[m][0] + sx, p[m][1] + sy); q[m] = c;
              if (c[0] < x0) x0 = c[0]; if (c[0] > x1) x1 = c[0]; if (c[1] < y0) y0 = c[1]; if (c[1] > y1) y1 = c[1];
            }
            if (x1 < 0 || y1 < 0 || x0 > W || y0 > H) continue;
            out.push({ pts: q, bb: [x0, y0, x1, y1] });
          }
        }
      }
      return out;
    }

    function place(h, cx, cy, rot) {
      var s = h / LH, w = LW * s, r = (rot || 0) * Math.PI / 180;
      return { s: s, ox: cx - w / 2, oy: cy - h / 2, w: w, h: h, cx: cx, cy: cy, rot: rot || 0, c: Math.cos(r), sn: Math.sin(r) };
    }
    // 札の中心を軸に回す（画面上で右回りが＋）
    function rp(pl, x, y) { var dx = x - pl.cx, dy = y - pl.cy; return [pl.cx + dx * pl.c - dy * pl.sn, pl.cy + dx * pl.sn + dy * pl.c]; }
    function rotPath(pl, path) {
      if (!pl.rot) return path;
      return path.map(function (q) { var r = rp(pl, q.X / SC, q.Y / SC); return { X: Math.round(r[0] * SC), Y: Math.round(r[1] * SC) }; });
    }
    function logoD(pl) {
      var parts = [];
      DATA.logo.forEach(function (c) {
        if (c[0] === 'Z') { parts.push('Z'); return; }
        var s = c[0];
        for (var i = 1; i < c.length; i += 2) {
          var q = rp(pl, c[i] * pl.s + pl.ox, c[i + 1] * pl.s + pl.oy);
          s += (i > 1 ? ' ' : '') + q[0].toFixed(3) + ' ' + q[1].toFixed(3);
        }
        parts.push(s);
      });
      return parts.join(' ');
    }
    function toPath(pts) { return pts.map(function (p) { return { X: Math.round(p[0] * SC), Y: Math.round(p[1] * SC) }; }); }
    function orient(paths) { paths.forEach(function (p) { if (!CL.Clipper.Orientation(p)) p.reverse(); }); return paths; }
    function silPaths(pl) {
      return orient(DATA.sil.map(function (r) { return toPath(r.map(function (p) { return rp(pl, p[0] * pl.s + pl.ox, p[1] * pl.s + pl.oy); })); }));
    }
    function offset(paths, mm) {
      var co = new CL.ClipperOffset(2, 2.5), sol = new CL.Paths();
      co.AddPaths(paths, CL.JoinType.jtRound, CL.EndType.etClosedPolygon);
      co.Execute(sol, mm * SC); return sol;
    }
    function bool(type, subj, clip) {
      var c = new CL.Clipper(), sol = new CL.Paths();
      c.AddPaths(subj, CL.PolyType.ptSubject, true);
      if (clip && clip.length) c.AddPaths(clip, CL.PolyType.ptClip, true);
      c.Execute(type, sol, CL.PolyFillType.pftNonZero, CL.PolyFillType.pftNonZero); return sol;
    }
    function union(a) { return a.length ? bool(CL.ClipType.ctUnion, a, []) : []; }
    function circle(cx, cy, r) {
      var p = [], n = Math.max(96, Math.round(r * 2));
      for (var i = 0; i < n; i++) { var a = 2 * Math.PI * i / n; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
      return toPath(p);
    }
    function rrect(x, y, w, h, r) {
      r = Math.max(0, Math.min(r, w / 2, h / 2)); var p = [], n = 18;
      if (r < 0.01) return toPath([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
      [[x + w - r, y + r, -90], [x + w - r, y + h - r, 0], [x + r, y + h - r, 90], [x + r, y + r, 180]].forEach(function (c) {
        for (var i = 0; i <= n; i++) { var a = (c[2] + 90 * i / n) * Math.PI / 180; p.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); }
      });
      return toPath(p);
    }
    function rect(x0, y0, x1, y1) { return toPath([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]); }
    function bounds(paths) {
      var b = [Infinity, Infinity, -Infinity, -Infinity];
      paths.forEach(function (p) { p.forEach(function (q) {
        var x = q.X / SC, y = q.Y / SC;
        if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y;
      }); });
      return b;
    }
    function dOf(paths) {
      return paths.map(function (p) { return 'M' + p.map(function (q) { return (q.X / SC).toFixed(2) + ' ' + (q.Y / SC).toFixed(2); }).join('L') + 'Z'; }).join('');
    }

    function build(cfg) {
      var W = cfg.W, H = cfg.H, b = cfg.border || 0;
      var logos = [place(cfg.logoH, cfg.logoX, cfg.logoY, cfg.logoRot)];
      if (cfg.twin) logos.push(place(cfg.logoH, W - cfg.logoX, cfg.logoY, -(cfg.logoRot || 0)));   // 2つ目は左右対称の傾き
      var sil = union([].concat.apply([], logos.map(silPaths)));
      var knock = [], win = [], frame = [], lines = [], fuchi = [];
      var st = cfg.style;
      logos.forEach(function (pl) {
        var wq = rp(pl, pl.cx + (cfg.winDX || 0), pl.cy + (cfg.winDY || 0)), wx = wq[0], wy = wq[1];
        if (st === 'maru') {
          win.push(circle(wx, wy, cfg.winR)); knock.push(circle(wx, wy, cfg.winR + cfg.gap));
        } else if (st === 'fuda') {
          var ww = pl.w + 2 * cfg.padX, hh = pl.h + 2 * cfg.padY, x = wx - ww / 2, y = wy - hh / 2;
          var wpl = { cx: wx, cy: wy, rot: pl.rot, c: pl.c, sn: pl.sn };      // 札形の窓も札と一緒に傾ける
          var o = rotPath(wpl, rrect(x, y, ww, hh, cfg.corner));
          win.push(o);
          offset([o], cfg.gap).forEach(function (p) { knock.push(p); });
          if (cfg.frame) {
            var t = cfg.frameInset, lw = Math.max(cfg.frameW, cfg.minLine || 0) / 2, rc = cfg.frameCorner;
            var a = rrect(x + t - lw, y + t - lw, ww - 2 * t + 2 * lw, hh - 2 * t + 2 * lw, rc + lw);
            var bb = rrect(x + t + lw, y + t + lw, ww - 2 * t - 2 * lw, hh - 2 * t - 2 * lw, Math.max(0, rc - lw));
            bool(CL.ClipType.ctDifference, [rotPath(wpl, a)], [rotPath(wpl, bb)]).forEach(function (p) { frame.push(p); });
          }
        }
      });
      if (st === 'gaikei') {
        knock = offset(sil, cfg.gap);
        if (cfg.fuchi) fuchi = bool(CL.ClipType.ctDifference, offset(sil, cfg.fuchiIn + cfg.fuchiW), offset(sil, cfg.fuchiIn));
      } else if (st === 'obi') {
        var e = cfg.obiSize, L = Math.max(2.4, cfg.minLine || 0), T = Math.max(1.0, cfg.minLine || 0), D = Math.max(3.8, T + (cfg.minGap || 0)), D2 = Math.max(2.8, cfg.minGap || 0);
        if (cfg.obiSide === 'right') {
          var ex = W - e; knock.push(rect(ex + 5, -1, W + 1, H + 1));       // 横 Y3 と同じ組み方
          lines.push(rect(ex, 0, ex + L, H)); lines.push(rect(ex - D, 0, ex - D + T, H));
        } else if (cfg.obiSide === 'left') {
          knock.push(rect(-1, -1, e - 5, H + 1));
          lines.push(rect(e - L, 0, e, H)); lines.push(rect(e + D - T, 0, e + D, H));
        } else if (cfg.obiSide === 'top') {
          knock.push(rect(-1, -1, W + 1, e + 5));
          lines.push(rect(0, e, W, e + L)); lines.push(rect(0, e - D2 - T, W, e - D2));
        } else {
          var ey = H - e; knock.push(rect(-1, ey - 5, W + 1, H + 1));
          lines.push(rect(0, ey - L, W, ey)); lines.push(rect(0, ey + D2, W, ey + D2 + T));
        }
        if (b > 0) lines = bool(CL.ClipType.ctIntersection, lines, [rect(b, b, W - b, H - b)]);   // 線も端の無地帯にはかけない
      }
      if (st !== 'gaikei') knock = union(knock);
      var inner = [rect(b, b, W - b, H - b)];
      var allowed = knock.length ? bool(CL.ClipType.ctDifference, inner, knock) : inner;
      var kb = knock.length ? bounds(knock) : [Infinity, Infinity, -Infinity, -Infinity];
      var keep = [], clipList = [];
      patternPolys(cfg).forEach(function (o) {
        var q = o.bb;
        if (q[2] <= b || q[0] >= W - b || q[3] <= b || q[1] >= H - b) return;
        var insideInner = q[0] >= b && q[1] >= b && q[2] <= W - b && q[3] <= H - b;
        var hitsKnock = !(q[2] < kb[0] || q[0] > kb[2] || q[3] < kb[1] || q[1] > kb[3]);
        if (insideInner && !hitsKnock) keep.push(o.pts); else clipList.push(toPath(o.pts));
      });
      var clipped = clipList.length ? bool(CL.ClipType.ctIntersection, clipList, allowed) : [];
      var boxes = [bounds(sil)]; if (win.length) boxes.push(bounds(win));     // 端の無地帯にはみ出していないか
      var over = 0;
      boxes.forEach(function (q) { over = Math.max(over, b - q[0], b - q[1], q[2] - (W - b), q[3] - (H - b)); });
      return { cfg: cfg, logos: logos, keep: keep, clipped: clipped, win: win, frame: frame, lines: lines, fuchi: fuchi,
               logoBox: bounds(sil), over: over > 0.05 ? over : 0 };
    }

    function toSVG(res, opts) {
      opts = opts || {};
      var c = res.cfg, W = c.W, H = c.H, col = c.colors, o = [];
      if (opts.standalone !== false) o.push('<?xml version="1.0" encoding="UTF-8"?>');
      o.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + 'mm" height="' + H + 'mm" viewBox="0 0 ' + W + ' ' + H + '"' + (opts.attrs || '') + '>');
      o.push('<g id="Background"><rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + col.bg + '"/></g>');
      o.push('<g id="HanedaNaka_Kakuji" fill="' + col.pat + '">');
      res.keep.forEach(function (p) { o.push('<path d="M' + p.map(function (q) { return q[0].toFixed(2) + ' ' + q[1].toFixed(2); }).join('L') + 'Z"/>'); });
      if (res.clipped.length) o.push('<path d="' + dOf(res.clipped) + '"/>');
      o.push('</g>');
      if (res.lines.length) o.push('<g id="Lines" fill="' + col.logo + '"><path d="' + dOf(res.lines) + '"/></g>');
      if (res.win.length) o.push('<g id="Window" fill="' + col.win + '"><path d="' + dOf(res.win) + '"/></g>');
      if (res.frame.length) o.push('<g id="Window_Frame" fill="' + col.logo + '"><path d="' + dOf(res.frame) + '"/></g>');
      if (res.fuchi.length) o.push('<g id="Outline" fill="' + col.logo + '"><path d="' + dOf(res.fuchi) + '"/></g>');
      res.logos.forEach(function (pl, i) {
        o.push('<g id="Fuda_Logo' + (res.logos.length > 1 ? '_' + (i + 1) : '') + '" fill="' + col.logo + '"><path d="' + logoD(pl) + '"/></g>');
      });
      o.push('</svg>');
      return o.join('\n');
    }
    return { build: build, toSVG: toSVG, logoRatio: LW / LH };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = makeEngine;
  else root.makeTowelEngine = makeEngine;
})(this);
