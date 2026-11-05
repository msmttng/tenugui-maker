/* 手ぬぐい・タオル図案の生成エンジン（ブラウザと node の両方で動く）
   設定から、角字柄を敷き詰めてくり抜いた SVG（塗りのパスのみ・線なし）を作る */
(function (root) {
  'use strict';
  var SC = 100;                                   // Clipper 用の倍率（0.01mm 単位）

  // 採用ロゴ（121サブパス）の部位別インデックス分類
  var LEFT_FACE_IDX = [103];
  var LEFT_SIDE_IDX = [114, 49, 52, 56, 58, 61, 64, 67, 71, 75, 78, 82, 86, 89, 95, 98, 101, 102, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113];
  var LEFT_CHARS_IDX = [50, 44, 45, 72, 62, 65, 68, 100, 81, 84, 92, 94];
  var RIGHT_FACE_IDX = [91];
  var RIGHT_SIDE_IDX = [99, 15, 20, 24, 28, 31, 33, 35, 37, 38, 40, 42, 43, 47, 48, 51, 53, 55, 57, 60, 63, 66, 70, 73, 76, 77, 80, 85, 87, 88, 90, 93, 96, 97];
  var RIGHT_CHARS_IDX = [39, 41, 46, 54, 59, 69, 74, 79, 83];
  var KNOT_IDX = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 29, 30, 32, 34, 36];
  var SHAKE_IDX = [115, 116, 117, 118, 119, 120];

  function splitSubpaths(logoCmds) {
    var subs = [], cur = [];
    if (!logoCmds) return subs;
    logoCmds.forEach(function (c) {
      cur.push(c);
      if (c[0] === 'Z') { subs.push(cur); cur = []; }
    });
    if (cur.length) subs.push(cur);
    return subs;
  }

  function makeEngine(DATA, CL) {
    var V1 = DATA.V1, V3 = DATA.V3, F = DATA.F;
    var LW = DATA.logoW, LH = DATA.logoH;
    var P0 = [170, 425];                           // 柄の基準点
    var SUBS = splitSubpaths(DATA.logo);
    var IS_STD_121 = SUBS.length === 121 && !DATA.parts;

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
    function cmdsToD(cmds, pl) {
      var parts = [];
      cmds.forEach(function (c) {
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
    function logoD(pl) {
      return cmdsToD(DATA.logo, pl);
    }
    function idxsToD(idxs, pl) {
      var cmds = [];
      idxs.forEach(function (idx) {
        if (SUBS[idx]) cmds = cmds.concat(SUBS[idx]);
      });
      return cmdsToD(cmds, pl);
    }
    function toPath(pts) { return pts.map(function (p) { return { X: Math.round(p[0] * SC), Y: Math.round(p[1] * SC) }; }); }
    function orient(paths) { paths.forEach(function (p) { if (!CL.Clipper.Orientation(p)) p.reverse(); }); return paths; }
    function silPaths(pl) {
      return orient(DATA.sil.map(function (r) { return toPath(r.map(function (p) { return rp(pl, p[0] * pl.s + pl.ox, p[1] * pl.s + pl.oy); })); }));
    }
    function offset(paths, mm) {
      if (!paths || !paths.length) return [];
      var co = new CL.ClipperOffset(2, 2.5), sol = new CL.Paths();
      co.AddPaths(paths, CL.JoinType.jtRound, CL.EndType.etClosedPolygon);
      co.Execute(sol, mm * SC); return sol;
    }
    function bool(type, subj, clip) {
      var c = new CL.Clipper(), sol = new CL.Paths();
      if (subj && subj.length) c.AddPaths(subj, CL.PolyType.ptSubject, true);
      if (clip && clip.length) c.AddPaths(clip, CL.PolyType.ptClip, true);
      c.Execute(type, sol, CL.PolyFillType.pftNonZero, CL.PolyFillType.pftNonZero); return sol;
    }
    function union(a) { return a && a.length ? bool(CL.ClipType.ctUnion, a, []) : []; }
    function circle(cx, cy, r) {
      var p = [], n = Math.max(96, Math.round(r * 2));
      for (var i = 0; i < n; i++) { var a = 2 * Math.PI * i / n; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
      return toPath(p);
    }
    function ellipse(cx, cy, rx, ry) {
      var p = [], n = Math.max(96, Math.round(Math.max(rx, ry) * 2));
      for (var i = 0; i < n; i++) { var a = 2 * Math.PI * i / n; p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
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
    function kadoRect(x, y, w, h, c) {
      c = Math.max(0, Math.min(c, w * 0.42, h * 0.42));
      if (c < 0.1) return toPath([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
      return toPath([
        [x + c, y], [x + w - c, y], [x + w, y + c], [x + w, y + h - c],
        [x + w - c, y + h], [x + c, y + h], [x, y + h - c], [x, y + c]
      ]);
    }
    function yamaShape(x, y, w, h, r) {
      var sh = Math.min(h * 0.22, w * 0.30);
      var base = toPath([[x + w / 2, y], [x + w, y + sh], [x + w, y + h], [x, y + h], [x, y + sh]]);
      r = Math.max(0, Math.min(r || 0, w * 0.2, h * 0.2));
      if (r < 0.2) return base;
      var rounded = offset(offset([base], -r), r);
      return rounded.length ? rounded[0] : base;
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
    function isWinStyle(st) {
      return st === 'maru' || st === 'koban' || st === 'fuda' || st === 'yama' || st === 'kado';
    }

    function build(cfg) {
      var W = cfg.W, H = cfg.H, b = cfg.border || 0;
      var bgRim = Math.max(0, cfg.bgRim || 0);
      var logos = [place(cfg.logoH, cfg.logoX, cfg.logoY, cfg.logoRot)];
      if (cfg.twin) logos.push(place(cfg.logoH, W - cfg.logoX, cfg.logoY, -(cfg.logoRot || 0)));   // 2つ目は左右対称の傾き
      var sil = union([].concat.apply([], logos.map(silPaths)));
      // 札内部（文字や厚みの隙間）を埋めた札シルエット＋背景の縁（bgRim mm）
      var closeMm = Math.max(1.2, (cfg.logoH || 200) / LH * 4.2);
      var logoBackBase = offset(offset(sil, closeMm), -closeMm);
      var logoBack = bgRim >= closeMm ? offset(sil, bgRim) : (bgRim > 0 ? offset(offset(sil, closeMm), bgRim - closeMm) : logoBackBase);

      var knock = [], win = [], frame = [], lines = [], fuchi = [], borderFrame = [], gapFill = [];
      var st = cfg.style;
      var inner = [rect(b, b, W - b, H - b)];
      if (b > 0 && logoBack.length) {
        logoBack = bool(CL.ClipType.ctIntersection, logoBack, inner);
      }

      logos.forEach(function (pl) {
        var wq = rp(pl, pl.cx + (cfg.winDX || 0), pl.cy + (cfg.winDY || 0)), wx = wq[0], wy = wq[1];
        var wpl = { cx: wx, cy: wy, rot: pl.rot, c: pl.c, sn: pl.sn };
        var ww = pl.w + 2 * ((cfg.padX != null ? cfg.padX : 9) + bgRim);
        var hh = pl.h + 2 * ((cfg.padY != null ? cfg.padY : 27) + bgRim);
        var x = wx - ww / 2, y = wy - hh / 2;
        var o = null;

        if (st === 'maru') {
          var effWinR = (cfg.winR || Math.round(cfg.logoH * 0.66)) + bgRim;
          o = circle(wx, wy, effWinR);
          win.push(o);
          knock.push(circle(wx, wy, effWinR + cfg.gap));
        } else if (st === 'koban') {
          o = rotPath(wpl, ellipse(wx, wy, ww / 2, hh / 2));
          win.push(o);
          offset([o], cfg.gap).forEach(function (p) { knock.push(p); });
        } else if (st === 'fuda') {
          o = rotPath(wpl, rrect(x, y, ww, hh, cfg.corner));
          win.push(o);
          offset([o], cfg.gap).forEach(function (p) { knock.push(p); });
        } else if (st === 'yama') {
          o = rotPath(wpl, yamaShape(x, y, ww, hh, cfg.corner));
          win.push(o);
          offset([o], cfg.gap).forEach(function (p) { knock.push(p); });
        } else if (st === 'kado') {
          o = rotPath(wpl, kadoRect(x, y, ww, hh, cfg.corner));
          win.push(o);
          offset([o], cfg.gap).forEach(function (p) { knock.push(p); });
        }

        if (o && cfg.frame) {
          var t = cfg.frameInset != null ? cfg.frameInset : 9;
          var lw = Math.max(cfg.frameW != null ? cfg.frameW : 1.6, cfg.minLine || 0) / 2;
          if (st === 'fuda' && !cfg.frameDouble) {
            var rc = cfg.frameCorner != null ? cfg.frameCorner : Math.max(0, (cfg.corner || 0) - t * 0.65);
            var a = rrect(x + t - lw, y + t - lw, ww - 2 * t + 2 * lw, hh - 2 * t + 2 * lw, rc + lw);
            var bb = rrect(x + t + lw, y + t + lw, ww - 2 * t - 2 * lw, hh - 2 * t - 2 * lw, Math.max(0, rc - lw));
            bool(CL.ClipType.ctDifference, [rotPath(wpl, a)], [rotPath(wpl, bb)]).forEach(function (p) { frame.push(p); });
          } else {
            var fOuter1 = offset([o], -(t - lw)), fInner1 = offset([o], -(t + lw));
            bool(CL.ClipType.ctDifference, fOuter1, fInner1).forEach(function (p) { frame.push(p); });
            if (cfg.frameDouble) {
              var dStep = Math.max(lw * 2 + (cfg.minGap || 1.6), 3.2);
              var lw2 = Math.max(lw * 0.8, (cfg.minLine || 0) / 2);
              var fOuter2 = offset([o], -(t + dStep - lw2)), fInner2 = offset([o], -(t + dStep + lw2));
              bool(CL.ClipType.ctDifference, fOuter2, fInner2).forEach(function (p) { frame.push(p); });
            }
          }
        }
      });

      if (st === 'gaikei') {
        var effGap = bgRim + (cfg.gap || 0);
        if (cfg.fuchi) {
          var fIn = bgRim + (cfg.fuchiIn || 0);
          var f1 = bool(CL.ClipType.ctDifference, offset(sil, fIn + cfg.fuchiW), offset(sil, fIn));
          if (cfg.fuchiDouble) {
            var fStep = Math.max((cfg.fuchiIn || 3.2) * 0.65, cfg.minGap || 1.5);
            var in2 = fIn + cfg.fuchiW + fStep;
            var w2 = Math.max(cfg.fuchiW * 0.8, cfg.minLine || 0.8);
            var f2 = bool(CL.ClipType.ctDifference, offset(sil, in2 + w2), offset(sil, in2));
            fuchi = union(f1.concat(f2));
            effGap = Math.max(effGap, in2 + w2 + Math.max(1.5, cfg.minGap || 0));
          } else {
            fuchi = f1;
            effGap = Math.max(effGap, fIn + cfg.fuchiW + Math.max(1.2, cfg.minGap || 0));
          }
        }
        knock = offset(sil, effGap);
      } else if (st === 'obi') {
        var e = cfg.obiSize, L = Math.max(2.4, cfg.minLine || 0), T = Math.max(1.0, cfg.minLine || 0), D = Math.max(3.8, T + (cfg.minGap || 0)), D2 = Math.max(2.8, cfg.minGap || 0);
        // obiGap が指定されていれば境界線と柄の間隔として使い、未指定なら従来互換（+5 / -5）
        var hasCustomObiGap = cfg.obiGap != null && cfg.obiGap > 0;
        if (cfg.obiSide === 'right') {
          var ex = W - e;
          var kEdgeR = hasCustomObiGap ? (ex - D - cfg.obiGap) : (ex + 5);
          knock.push(rect(kEdgeR, -1, W + 1, H + 1));
          win.push(rect(ex + L, 0, W, H));
          gapFill.push(rect(kEdgeR, 0, ex + L, H));
          lines.push(rect(ex, 0, ex + L, H)); lines.push(rect(ex - D, 0, ex - D + T, H));
        } else if (cfg.obiSide === 'left') {
          var kEdgeL = hasCustomObiGap ? (e + D + cfg.obiGap) : (e - 5);
          knock.push(rect(-1, -1, kEdgeL, H + 1));
          win.push(rect(0, 0, e - L, H));
          gapFill.push(rect(e - L, 0, kEdgeL, H));
          lines.push(rect(e - L, 0, e, H)); lines.push(rect(e + D - T, 0, e + D, H));
        } else if (cfg.obiSide === 'top') {
          var kEdgeT = hasCustomObiGap ? (e + D2 + cfg.obiGap) : (e + 5);
          knock.push(rect(-1, -1, W + 1, kEdgeT));
          win.push(rect(0, 0, W, e));
          gapFill.push(rect(0, Math.min(e - D2 - T, e), W, Math.max(kEdgeT, e + L)));
          lines.push(rect(0, e, W, e + L)); lines.push(rect(0, e - D2 - T, W, e - D2));
        } else {
          var ey = H - e;
          var kEdgeB = hasCustomObiGap ? (ey - L - cfg.obiGap) : (ey - 5);
          knock.push(rect(-1, kEdgeB, W + 1, H + 1));
          win.push(rect(0, ey + D2 + T, W, H));
          gapFill.push(rect(0, kEdgeB, W, ey + D2 + T));
          lines.push(rect(0, ey - L, W, ey)); lines.push(rect(0, ey + D2, W, ey + D2 + T));
        }
        if (b > 0) {
          lines = bool(CL.ClipType.ctIntersection, lines, inner);
          win = bool(CL.ClipType.ctIntersection, win, inner);
          gapFill = bool(CL.ClipType.ctIntersection, gapFill, inner);
        }
      }

      if (st !== 'gaikei') knock = union(knock);
      if (st === 'gaikei') {
        var innerCore = cfg.fuchi
          ? offset(sil, bgRim + (cfg.fuchiIn || 3.2) + (cfg.fuchiW || 1.5))
          : (bgRim > 0 ? logoBack : offset(sil, Math.min(2.0, Math.max(1.0, (cfg.gap || 0) * 0.3))));
        var kClip = knock.length ? bool(CL.ClipType.ctIntersection, knock, inner) : [];
        gapFill = kClip.length ? bool(CL.ClipType.ctDifference, kClip, innerCore) : [];
      } else if (isWinStyle(st)) {
        var kClipW = knock.length ? bool(CL.ClipType.ctIntersection, knock, inner) : [];
        gapFill = kClipW.length ? bool(CL.ClipType.ctDifference, kClipW, win) : [];
      }
      if (b > 0 && isWinStyle(st) && win.length) {
        win = bool(CL.ClipType.ctIntersection, win, inner);
      }
      if (b > 0 && cfg.borderFrame) {
        var bfw = Math.max(cfg.borderFrameW || 1.6, cfg.minLine || 0);
        borderFrame = bool(CL.ClipType.ctDifference, [rect(b, b, W - b, H - b)], [rect(b + bfw, b + bfw, W - b - bfw, H - b - bfw)]);
      }

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
      var boxes = [bounds(sil)]; if (win.length && isWinStyle(st)) boxes.push(bounds(win));     // 端の無地帯にはみ出していないか
      var over = 0;
      boxes.forEach(function (q) { over = Math.max(over, b - q[0], b - q[1], q[2] - (W - b), q[3] - (H - b)); });
      return {
        cfg: cfg, logos: logos, keep: keep, clipped: clipped,
        sil: sil, knock: knock, inner: inner,
        win: win, frame: frame, lines: lines, fuchi: fuchi,
        gapFill: gapFill, logoBack: logoBack, logoBackBase: logoBackBase, borderFrame: borderFrame,
        logoBox: bounds(sil), over: over > 0.05 ? over : 0
      };
    }

    function winShapesForStyle(cfg, logos, st) {
      var out = [];
      var bgRim = Math.max(0, cfg.bgRim || 0);
      logos.forEach(function (pl) {
        var wq = rp(pl, pl.cx + (cfg.winDX || 0), pl.cy + (cfg.winDY || 0)), wx = wq[0], wy = wq[1];
        var wpl = { cx: wx, cy: wy, rot: pl.rot, c: pl.c, sn: pl.sn };
        var ww = pl.w + 2 * ((cfg.padX != null ? cfg.padX : 9) + bgRim);
        var hh = pl.h + 2 * ((cfg.padY != null ? cfg.padY : 27) + bgRim);
        var x = wx - ww / 2, y = wy - hh / 2;
        if (st === 'maru') out.push(circle(wx, wy, (cfg.winR || Math.round(cfg.logoH * 0.66)) + bgRim));
        else if (st === 'koban') out.push(rotPath(wpl, ellipse(wx, wy, ww / 2, hh / 2)));
        else if (st === 'fuda') out.push(rotPath(wpl, rrect(x, y, ww, hh, cfg.corner != null ? cfg.corner : 16)));
        else if (st === 'yama') out.push(rotPath(wpl, yamaShape(x, y, ww, hh, cfg.corner != null ? cfg.corner : 16)));
        else if (st === 'kado') out.push(rotPath(wpl, kadoRect(x, y, ww, hh, cfg.corner ? cfg.corner : 18)));
      });
      return out;
    }

    function previewFramePaths(cfg, wBase, forceDouble) {
      var out = [];
      var t = cfg.frameInset != null ? cfg.frameInset : 9;
      var lw = Math.max(cfg.frameW != null ? cfg.frameW : 1.6, cfg.minLine || 0.8) / 2;
      wBase.forEach(function (o) {
        var fOuter1 = offset([o], -(t - lw)), fInner1 = offset([o], -(t + lw));
        bool(CL.ClipType.ctDifference, fOuter1, fInner1).forEach(function (p) { out.push(p); });
        if (forceDouble || cfg.frameDouble) {
          var dStep = Math.max(lw * 2 + (cfg.minGap || 1.6), 3.2);
          var lw2 = Math.max(lw * 0.8, (cfg.minLine || 0.8) / 2);
          var fOuter2 = offset([o], -(t + dStep - lw2)), fInner2 = offset([o], -(t + dStep + lw2));
          bool(CL.ClipType.ctDifference, fOuter2, fInner2).forEach(function (p) { out.push(p); });
        }
      });
      return out;
    }

    function highlight(res, key) {
      if (!res || !key) return null;
      var cfg = res.cfg, st = cfg.style, W = cfg.W, H = cfg.H;
      var bgRim = Math.max(0, cfg.bgRim || 0);
      var wBase = (res.win && res.win.length && isWinStyle(st)) ? res.win : winShapesForStyle(cfg, res.logos, isWinStyle(st) ? st : 'fuda');

      if (key.indexOf('style:') === 0) {
        var stT = key.slice(6);
        var stNames = {
          gaikei: '外形くり抜き（札の輪郭に沿って柄をくり抜く）',
          maru: '丸窓（正円の窓でくり抜く）',
          koban: '小判窓（楕円の窓でくり抜く）',
          fuda: '札形の窓（角丸長方形の窓でくり抜く）',
          yama: '駒形窓（山形五角形の窓でくり抜く）',
          kado: '八角窓（隅切り八角形の窓でくり抜く）',
          obi: '無地の帯（端を帯状にくり抜く）',
          none: 'くり抜きなし（柄の上にそのまま札を置く）'
        };
        if (stT === 'gaikei') {
          var gPreview = bool(CL.ClipType.ctDifference, offset(res.sil, Math.max(bgRim + (cfg.gap || 6), 5)), res.logoBackBase || res.logoBack);
          return { d: dOf(gPreview), subD: dOf(res.logoBack), label: stNames[stT] };
        }
        if (isWinStyle(stT)) {
          var wp = winShapesForStyle(cfg, res.logos, stT);
          var wpArea = bool(CL.ClipType.ctDifference, wp, res.logoBackBase || res.logoBack);
          return { d: dOf(wpArea.length ? wpArea : wp), subD: dOf(wp), label: stNames[stT] };
        }
        if (stT === 'obi') {
          var e = cfg.obiSize || 200, side = cfg.obiSide || (W > H ? 'right' : 'bottom');
          var ob = side === 'right' ? [rect(W - e, 0, W, H)] : (side === 'left' ? [rect(0, 0, e, H)] : (side === 'top' ? [rect(0, 0, W, e)] : [rect(0, H - e, W, H)]));
          return { d: dOf(bool(CL.ClipType.ctDifference, ob, res.logoBackBase || res.logoBack)), subD: dOf(ob), label: stNames[stT] };
        }
        if (stT === 'none') {
          return { d: dOf(res.logoBackBase || res.logoBack), label: stNames[stT] };
        }
      }

      if (key === 'gap') {
        if (st === 'gaikei') {
          var gRing = (res.gapFill && res.gapFill.length) ? res.gapFill : bool(CL.ClipType.ctDifference, offset(res.sil, bgRim + 6), offset(res.sil, bgRim + 1.8));
          return {
            d: dOf(gRing),
            subD: dOf((res.fuchi && res.fuchi.length) ? res.fuchi : res.logoBack),
            label: '柄との間（柄をくり抜いて最背景を見せる幅 ' + (cfg.gap || 0) + 'mm）'
          };
        }
        if (isWinStyle(st)) {
          var wRing = (res.gapFill && res.gapFill.length) ? res.gapFill : bool(CL.ClipType.ctDifference, offset(wBase, 6), wBase);
          return { d: dOf(wRing), subD: dOf(wBase), label: '柄との間（窓の外側 ' + (cfg.gap || 0) + 'mm の最背景のすき間）' };
        }
        if (st === 'obi') {
          var obiBand = bool(CL.ClipType.ctDifference, res.gapFill || [], union((res.win || []).concat(res.lines || [])));
          return { d: dOf(obiBand.length ? obiBand : (res.lines || [])), label: '柄との間（帯と柄のあいだのすき間）' };
        }
        return { d: dOf(bool(CL.ClipType.ctDifference, offset(res.sil, 6), offset(res.sil, 1.8))), label: '柄との間（くり抜き余白）' };
      }

      if (key === 'bgRim') {
        if (isWinStyle(st)) {
          var wRim = bool(CL.ClipType.ctDifference, wBase, offset(wBase, -Math.max(bgRim, 5)));
          return { d: dOf(wRim.length ? wRim : wBase), subD: dOf(wBase), label: '背景の縁（窓・背景を外へ広げる幅 ' + bgRim + 'mm）' };
        }
        var effRim = Math.max(bgRim, 4.5);
        var rimOuter = offset(res.logoBackBase || res.sil, effRim);
        var rimBand = bool(CL.ClipType.ctDifference, rimOuter, res.logoBackBase || res.sil);
        return {
          d: dOf(rimBand.length ? rimBand : res.logoBack),
          subD: dOf(res.logoBack),
          label: '札の背景の縁（札の背景を外側に広げる幅 ' + bgRim + 'mm）'
        };
      }

      if (key === 'alignM') {
        var amv = cfg.alignM || 28;
        var amRing = bool(CL.ClipType.ctDifference, [rect(0, 0, W, H)], [rect(amv, amv, W - amv, H - amv)]);
        return { d: dOf(amRing), subD: dOf(res.logoBack), label: '寄せ余白（端から札までの余白 ' + amv + 'mm）' };
      }

      if (key === 'fuchi' || key === 'fuchiW') {
        var fIn1 = bgRim + (cfg.fuchiIn || 3.2), fW1 = cfg.fuchiW || 1.5;
        var fp1 = (res.fuchi && res.fuchi.length) ? res.fuchi : bool(CL.ClipType.ctDifference, offset(res.sil, fIn1 + fW1), offset(res.sil, fIn1));
        return { d: dOf(fp1), subD: dOf(res.logoBack), label: key === 'fuchiW' ? 'フチの太さ（' + fW1 + 'mm — ロゴ外周のフチ線）' : 'ロゴのまわりのフチ線' };
      }

      if (key === 'fuchiDouble') {
        var fIn2 = bgRim + (cfg.fuchiIn || 3.2), fW2 = cfg.fuchiW || 1.5;
        var fStep = Math.max((cfg.fuchiIn || 3.2) * 0.65, cfg.minGap || 1.5), in2 = fIn2 + fW2 + fStep, w2 = Math.max(fW2 * 0.8, cfg.minLine || 0.8);
        var fa = bool(CL.ClipType.ctDifference, offset(res.sil, fIn2 + fW2), offset(res.sil, fIn2));
        var fb2 = bool(CL.ClipType.ctDifference, offset(res.sil, in2 + w2), offset(res.sil, in2));
        return { d: dOf(union(fa.concat(fb2))), label: '二重フチ線（ロゴのまわりの二重線）' };
      }

      if (key === 'fuchiIn') {
        var fIn3 = bgRim + (cfg.fuchiIn || 3.2), fW3 = cfg.fuchiW || 1.5;
        var inGap = bool(CL.ClipType.ctDifference, offset(res.sil, fIn3), res.logoBack);
        var fLine3 = (res.fuchi && res.fuchi.length) ? res.fuchi : bool(CL.ClipType.ctDifference, offset(res.sil, fIn3 + fW3), offset(res.sil, fIn3));
        return { d: dOf(inGap), subD: dOf(fLine3), label: 'フチの位置（札の背景からフチ線までのすき間 ' + (cfg.fuchiIn || 3.2) + 'mm）' };
      }

      if (key === 'win' || key === 'winR' || key === 'winDX' || key === 'winDY') {
        var wUse = (res.win && res.win.length) ? res.win : wBase;
        var wSub = bool(CL.ClipType.ctDifference, wUse, res.logoBackBase || res.logoBack);
        var wLabels = {
          win: '窓・無地帯の領域（窓の塗り色）',
          winR: '丸窓の半径（中心から窓の縁まで ' + (cfg.winR || 0) + 'mm）',
          winDX: '窓の左右ずれ（' + (cfg.winDX || 0) + 'mm）',
          winDY: '窓の上下ずれ（' + (cfg.winDY || 0) + 'mm）'
        };
        return { d: dOf(wSub.length ? wSub : wUse), subD: dOf(wUse), label: wLabels[key] };
      }

      if (key === 'padX' || key === 'padY') {
        var padClips = [];
        res.logos.forEach(function (pl) {
          var wq = rp(pl, pl.cx + (cfg.winDX || 0), pl.cy + (cfg.winDY || 0)), wx = wq[0], wy = wq[1];
          var wpl = { cx: wx, cy: wy, rot: pl.rot, c: pl.c, sn: pl.sn };
          var ww = pl.w + 2 * ((cfg.padX != null ? cfg.padX : 9) + bgRim) + 20;
          var hh = pl.h + 2 * ((cfg.padY != null ? cfg.padY : 27) + bgRim) + 20;
          if (key === 'padX') {
            var lx = pl.w * 0.36;
            padClips.push(rotPath(wpl, rect(wx - ww / 2, wy - hh / 2, wx - lx, wy + hh / 2)));
            padClips.push(rotPath(wpl, rect(wx + lx, wy - hh / 2, wx + ww / 2, wy + hh / 2)));
          } else {
            var ly = pl.h * 0.36;
            padClips.push(rotPath(wpl, rect(wx - ww / 2, wy - hh / 2, wx + ww / 2, wy - ly)));
            padClips.push(rotPath(wpl, rect(wx - ww / 2, wy + ly, wx + ww / 2, wy + hh / 2)));
          }
        });
        var wDiff = bool(CL.ClipType.ctDifference, wBase, res.logoBackBase || res.logoBack);
        var padZone = bool(CL.ClipType.ctIntersection, wDiff, padClips);
        return {
          d: dOf(padZone.length ? padZone : wDiff),
          subD: dOf(wBase),
          label: key === 'padX' ? '窓の余白 左右（札の左右と窓の縁のあいだ ' + (cfg.padX || 0) + 'mm）' : '窓の余白 上下（札の上下と窓の縁のあいだ ' + (cfg.padY || 0) + 'mm）'
        };
      }

      if (key === 'corner') {
        var rim = bool(CL.ClipType.ctDifference, wBase, offset(wBase, -6));
        return { d: dOf(rim.length ? rim : wBase), subD: dOf(wBase), label: (st === 'kado' ? '角落とし量（窓の四隅の切り落とし ' : '角の丸み（窓の角の丸み半径 ') + (cfg.corner || 0) + 'mm）' };
      }

      if (key === 'frame' || key === 'frameW' || key === 'frameDouble') {
        var fp = (res.frame && res.frame.length && key !== 'frameDouble') ? res.frame
          : (st === 'gaikei' && res.fuchi && res.fuchi.length ? res.fuchi
          : (st === 'obi' && res.lines && res.lines.length ? res.lines
          : previewFramePaths(cfg, wBase, key === 'frameDouble')));
        if (res.borderFrame && res.borderFrame.length && key === 'frame') fp = fp.concat(res.borderFrame);
        return {
          d: dOf(fp),
          subD: dOf(wBase),
          label: key === 'frameDouble' ? '二重枠線（窓の内側の二重ライン）' : (key === 'frameW' ? '枠の太さ（' + (cfg.frameW || 1.6) + 'mm）' : '枠線・フチ線・帯の境界線')
        };
      }

      if (key === 'frameInset') {
        var tIns = cfg.frameInset != null ? cfg.frameInset : 9;
        var insBand = bool(CL.ClipType.ctDifference, wBase, offset(wBase, -tIns));
        var fpRef = (res.frame && res.frame.length) ? res.frame : previewFramePaths(cfg, wBase, false);
        return { d: dOf(insBand), subD: dOf(fpRef), label: '枠の位置（窓の外縁から内枠線までの距離 ' + tIns + 'mm）' };
      }

      if (key === 'obi' || key === 'obiSize') {
        var obiZone = union((res.win || []).concat(res.lines || []));
        return { d: dOf(obiZone), subD: dOf(res.lines || []), label: '無地の帯（帯の幅 ' + (cfg.obiSize || 0) + 'mm）' };
      }

      if (key === 'obiGap') {
        var og = bool(CL.ClipType.ctDifference, res.gapFill || [], union((res.win || []).concat(res.lines || [])));
        return { d: dOf(og.length ? og : offset(res.lines || [], 4)), subD: dOf(res.lines || []), label: '柄との間（帯の境界線と柄のすき間 ' + (cfg.obiGap || 0) + 'mm）' };
      }

      if (key === 'border') {
        var bEff = (cfg.border && cfg.border > 0) ? cfg.border : 8;
        var bRing = bool(CL.ClipType.ctDifference, [rect(0, 0, W, H)], [rect(bEff, bEff, W - bEff, H - bEff)]);
        return { d: dOf(bRing), label: '端の無地（タオル外周の余白 ' + (cfg.border || 0) + 'mm）' };
      }

      if (key === 'borderFrame' || key === 'borderFrameW') {
        var bEff2 = (cfg.border && cfg.border > 0) ? cfg.border : 8;
        var bfw2 = Math.max(cfg.borderFrameW || 1.6, 1.6);
        var bf = (res.borderFrame && res.borderFrame.length) ? res.borderFrame
          : bool(CL.ClipType.ctDifference, [rect(bEff2, bEff2, W - bEff2, H - bEff2)], [rect(bEff2 + bfw2, bEff2 + bfw2, W - bEff2 - bfw2, H - bEff2 - bfw2)]);
        return { d: dOf(bf), label: '端の無地の内側の外周枠線（太さ ' + (cfg.borderFrameW || 1.6) + 'mm）' };
      }

      if (key === 'logoBg') {
        if (isWinStyle(st) || st === 'obi') {
          var wUse2 = (res.win && res.win.length) ? res.win : wBase;
          var wSub2 = bool(CL.ClipType.ctDifference, wUse2, res.logoBackBase || res.logoBack);
          return { d: dOf(wSub2.length ? wSub2 : wUse2), subD: dOf(wUse2), label: '札の背景（窓・帯の塗り色）' };
        }
        var holes = bool(CL.ClipType.ctDifference, res.logoBack, res.sil);
        var lds = res.logos.map(logoD).join(' ');
        return {
          d: dOf(holes.length ? holes : res.logoBack),
          subD: lds || dOf(res.logoBack),
          label: '札の背景（札のうしろ・文字の抜きと背景の縁の色）'
        };
      }

      if (key === 'logo' || key === 'tagL' || key === 'tagR' || key === 'side' || key === 'logoText' || key === 'knot' || key === 'shake') {
        var ds = [], fillRule = 'nonzero';
        res.logos.forEach(function (pl) {
          if (key === 'logo') ds.push(logoD(pl));
          else if (IS_STD_121) {
            if (key === 'tagL') ds.push(idxsToD(LEFT_FACE_IDX.concat(LEFT_CHARS_IDX), pl));
            else if (key === 'tagR') ds.push(idxsToD(RIGHT_FACE_IDX.concat(RIGHT_CHARS_IDX), pl));
            else if (key === 'side') ds.push(idxsToD(LEFT_SIDE_IDX.concat(RIGHT_SIDE_IDX), pl));
            else if (key === 'logoText') { ds.push(idxsToD(LEFT_CHARS_IDX.concat(RIGHT_CHARS_IDX), pl)); fillRule = 'evenodd'; }
            else if (key === 'knot') ds.push(idxsToD(KNOT_IDX, pl));
            else if (key === 'shake') ds.push(idxsToD(SHAKE_IDX, pl));
          } else if (DATA.parts) {
            var P = DATA.parts;
            if (key === 'tagL' && P.tagL) ds.push(cmdsToD(P.tagL, pl));
            else if (key === 'tagR' && P.tagR) ds.push(cmdsToD(P.tagR, pl));
            else if (key === 'logoText' && P.text) { ds.push(cmdsToD(P.text, pl)); fillRule = 'evenodd'; }
            else if (key === 'knot' && P.knot) ds.push(cmdsToD(P.knot, pl));
            else if (key === 'shake' && P.shake) ds.push(cmdsToD(P.shake, pl));
            else ds.push(logoD(pl));
          } else {
            ds.push(logoD(pl));
          }
        });
        var partLabels = {
          logo: '札の色（元の色）— 札ロゴ全体',
          tagL: '左札（仲羽田）の札面',
          tagR: '右札（青年会）の札面',
          side: '札の厚み（立体側面・斜線ハッチング影）',
          logoText: '札の彫り文字（仲羽田・青年会）',
          knot: '結び（組紐）',
          shake: '揺れ線（左右6本のスイング線）'
        };
        return { d: ds.join(' '), fillRule: fillRule, label: partLabels[key] };
      }

      return null;
    }

    function sameCol(a, b) {
      return String(a || '').toUpperCase() === String(b || '').toUpperCase();
    }

    function toSVG(res, opts) {
      opts = opts || {};
      var c = res.cfg, W = c.W, H = c.H, b = c.border || 0, st = c.style;
      var bgRim = Math.max(0, c.bgRim || 0);
      var col = c.colors || {};
      var cBg = col.bg || '#00A3AF';
      var cPat = col.pat || '#FFFFFF';
      var cLogo = col.logo || '#FFFFFF';
      var cWin = col.win || cPat;
      var cFrame = col.frame || cLogo;
      var cBorder = col.border || cBg;
      // 札の背景色：窓・帯のときは cWin、外形・なしのときは col.logoBg（未指定なら最背景の地色 cBg）
      var defLogoBg = (isWinStyle(st) || st === 'obi') ? cWin : cBg;
      var cLogoBg = col.logoBg || defLogoBg;

      var o = [];
      if (opts.standalone !== false) o.push('<?xml version="1.0" encoding="UTF-8"?>');
      o.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + 'mm" height="' + H + 'mm" viewBox="0 0 ' + W + ' ' + H + '"' + (opts.attrs || '') + '>');

      // 1. 最背景（地色）＆端の無地色
      if (b > 0 && !sameCol(cBorder, cBg)) {
        o.push('<g id="Background"><rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + cBorder + '"/><rect x="' + b + '" y="' + b + '" width="' + (W - 2 * b) + '" height="' + (H - 2 * b) + '" fill="' + cBg + '"/></g>');
      } else {
        o.push('<g id="Background"><rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + cBg + '"/></g>');
      }

      // 2. 仲羽田（角字柄）— くり抜き部分（柄との間）には最背景（Background）がそのまま見える
      o.push('<g id="HanedaNaka_Kakuji" fill="' + cPat + '">');
      res.keep.forEach(function (p) { o.push('<path d="M' + p.map(function (q) { return q[0].toFixed(2) + ' ' + q[1].toFixed(2); }).join('L') + 'Z"/>'); });
      if (res.clipped.length) o.push('<path d="' + dOf(res.clipped) + '"/>');
      o.push('</g>');

      // 3. 窓・無地の帯の塗り
      var winCol = (isWinStyle(st) || st === 'obi') ? (col.logoBg || cWin) : cWin;
      if (res.win.length && (isWinStyle(st) || (st === 'obi' && !sameCol(winCol, cBg)))) {
        o.push('<g id="Window" fill="' + winCol + '"><path d="' + dOf(res.win) + '"/></g>');
      }

      // 4. 札の背景（外形・くり抜きなしのときの札シルエット＋背景の縁 bgRim）
      if (!isWinStyle(st) && st !== 'obi' && res.logoBack && res.logoBack.length && (!sameCol(cLogoBg, cBg) || (st === 'none' && bgRim > 0))) {
        o.push('<g id="Logo_Back" fill="' + cLogoBg + '"><path d="' + dOf(res.logoBack) + '"/></g>');
      }

      // 5. 帯の境界線・窓の内枠線・外形のフチ線・端の無地内枠線
      if (res.lines.length) o.push('<g id="Lines" fill="' + cFrame + '"><path d="' + dOf(res.lines) + '"/></g>');
      if (res.frame.length) o.push('<g id="Window_Frame" fill="' + cFrame + '"><path d="' + dOf(res.frame) + '"/></g>');
      if (res.fuchi.length) o.push('<g id="Outline" fill="' + cFrame + '"><path d="' + dOf(res.fuchi) + '"/></g>');
      if (res.borderFrame && res.borderFrame.length) o.push('<g id="Border_Frame" fill="' + cFrame + '"><path d="' + dOf(res.borderFrame) + '"/></g>');

      // 6. 札ロゴ
      var cTagL = col.tagL || cLogo;
      var cTagR = col.tagR || cLogo;
      var cSide = col.side || '';
      var cKnot = col.knot || cLogo;
      var cShake = col.shake || cLogo;
      var cLogoText = col.logoText || '';
      var hasPartColors = !sameCol(cTagL, cLogo) || !sameCol(cTagR, cLogo) || (cSide && !sameCol(cSide, cLogo)) || !sameCol(cKnot, cLogo) || !sameCol(cShake, cLogo) || !!cLogoText;

      res.logos.forEach(function (pl, i) {
        var gid = 'Fuda_Logo' + (res.logos.length > 1 ? '_' + (i + 1) : '');
        if (hasPartColors && IS_STD_121) {
          var sideLCol = cSide || cTagL;
          var sideRCol = cSide || cTagR;
          o.push('<g id="' + gid + '" fill="' + cLogo + '">');
          o.push('<path id="' + gid + '_TagL_Face" fill="' + cTagL + '" d="' + idxsToD(LEFT_FACE_IDX.concat(LEFT_CHARS_IDX), pl) + '"/>');
          o.push('<path id="' + gid + '_TagL_Side" fill="' + sideLCol + '" d="' + idxsToD(LEFT_SIDE_IDX, pl) + '"/>');
          o.push('<path id="' + gid + '_TagR_Face" fill="' + cTagR + '" d="' + idxsToD(RIGHT_FACE_IDX.concat(RIGHT_CHARS_IDX), pl) + '"/>');
          o.push('<path id="' + gid + '_TagR_Side" fill="' + sideRCol + '" d="' + idxsToD(RIGHT_SIDE_IDX, pl) + '"/>');
          if (cLogoText) {
            o.push('<path id="' + gid + '_Text" fill="' + cLogoText + '" fill-rule="evenodd" d="' + idxsToD(LEFT_CHARS_IDX.concat(RIGHT_CHARS_IDX), pl) + '"/>');
          }
          o.push('<path id="' + gid + '_Knot" fill="' + cKnot + '" d="' + idxsToD(KNOT_IDX, pl) + '"/>');
          o.push('<path id="' + gid + '_Shake" fill="' + cShake + '" d="' + idxsToD(SHAKE_IDX, pl) + '"/>');
          o.push('</g>');
        } else if (hasPartColors && DATA.parts) {
          var P = DATA.parts;
          o.push('<g id="' + gid + '" fill="' + cLogo + '">');
          if (P.tagL && P.tagL.length) o.push('<path id="' + gid + '_TagL" fill="' + cTagL + '" d="' + cmdsToD(P.tagL, pl) + '"/>');
          if (P.tagR && P.tagR.length) o.push('<path id="' + gid + '_TagR" fill="' + cTagR + '" d="' + cmdsToD(P.tagR, pl) + '"/>');
          if (cLogoText && P.text && P.text.length) o.push('<path id="' + gid + '_Text" fill="' + cLogoText + '" fill-rule="evenodd" d="' + cmdsToD(P.text, pl) + '"/>');
          if (P.knot && P.knot.length) o.push('<path id="' + gid + '_Knot" fill="' + cKnot + '" d="' + cmdsToD(P.knot, pl) + '"/>');
          if (P.shake && P.shake.length) o.push('<path id="' + gid + '_Shake" fill="' + cShake + '" d="' + cmdsToD(P.shake, pl) + '"/>');
          o.push('</g>');
        } else {
          o.push('<g id="' + gid + '" fill="' + cLogo + '"><path d="' + logoD(pl) + '"/></g>');
        }
      });
      o.push('</svg>');
      return o.join('\n');
    }
    return { build: build, toSVG: toSVG, highlight: highlight, logoRatio: LW / LH };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = makeEngine;
  else root.makeTowelEngine = makeEngine;
})(this);
