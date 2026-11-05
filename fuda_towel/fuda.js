/* 札ロゴの組み立てエンジン：札の面・厚み・光を設定から描き、文字・結び・揺れ線（元のロゴから取り出した部品）と重ねる
   座標は pt（ロゴ全体 533.14×566.93pt ＝ 188×200mm）。結果は塗りの多角形のみ。 */
(function (root) {
  'use strict';
  var SC = 100;

  function makeFudaEngine(D, CL) {
    var P = D.par;
    function fp(flat) { var o = []; for (var i = 0; i < flat.length; i += 2) o.push({ X: Math.round(flat[i] * SC), Y: Math.round(flat[i + 1] * SC) }); return o; }
    function pts2path(pts) { return pts.map(function (p) { return { X: Math.round(p[0] * SC), Y: Math.round(p[1] * SC) }; }); }
    function many(list) { return list.map(fp); }
    var TEXT = { L: many(D.textL), R: many(D.textR) }, KNOT = many(D.knot), ORIG = many(D.origTags);
    var LINES = D.lines.map(function (l) { return many(l.p); });

    function bool(type, a, b) {
      var c = new CL.Clipper(), s = new CL.Paths();
      if (a && a.length) c.AddPaths(a, CL.PolyType.ptSubject, true);
      if (b && b.length) c.AddPaths(b, CL.PolyType.ptClip, true);
      c.Execute(type, s, CL.PolyFillType.pftNonZero, CL.PolyFillType.pftNonZero); return s;
    }
    var U = function (a, b) { return bool(CL.ClipType.ctUnion, a, b || []); };
    var I = function (a, b) { return (a.length && b.length) ? bool(CL.ClipType.ctIntersection, a, b) : []; };
    var Dif = function (a, b) { return a.length ? (b && b.length ? bool(CL.ClipType.ctDifference, a, b) : a) : []; };
    function off(paths, d) {
      if (!paths.length || Math.abs(d) < 1e-6) return paths;
      var co = new CL.ClipperOffset(2, 0.6), s = new CL.Paths();
      co.AddPaths(paths, CL.JoinType.jtRound, CL.EndType.etClosedPolygon); co.Execute(s, d * SC); return s;
    }
    function offLine(pts, d, square) {
      var co = new CL.ClipperOffset(2, 0.6), s = new CL.Paths();
      co.AddPath(pts2path(pts), CL.JoinType.jtRound, square ? CL.EndType.etOpenButt : CL.EndType.etOpenRound); co.Execute(s, d * SC); return s;
    }
    function move(paths, dx, dy) { return paths.map(function (p) { return p.map(function (q) { return { X: q.X + Math.round(dx * SC), Y: q.Y + Math.round(dy * SC) }; }); }); }
    function hull(paths) {
      var pts = []; paths.forEach(function (p) { p.forEach(function (q) { pts.push([q.X, q.Y]); }); });
      pts.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
      function cr(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
      var lo = [], up = [];
      pts.forEach(function (p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); });
      for (var i = pts.length - 1; i >= 0; i--) { var p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
      up.pop(); lo.pop();
      return [lo.concat(up).map(function (p) { return { X: p[0], Y: p[1] }; })];
    }

    /* ---- 四角形への射影（札ごとの局所座標 → 全体） */
    function homog(q, W, H) { return homogPts([[0, 0], [W, 0], [W, H], [0, H]], q); }
    function homogPts(src, q) {
      var A = [], b = [];
      for (var i = 0; i < 4; i++) {
        var x = src[i][0], y = src[i][1], X = q[i][0], Y = q[i][1];
        A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); b.push(X);
        A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); b.push(Y);
      }
      for (var c = 0; c < 8; c++) {                       // ガウスの消去法
        var piv = c; for (var r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
        var t = A[c]; A[c] = A[piv]; A[piv] = t; t = b[c]; b[c] = b[piv]; b[piv] = t;
        for (r = c + 1; r < 8; r++) { var f = A[r][c] / A[c][c]; for (var k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
      }
      var h = new Array(8);
      for (c = 7; c >= 0; c--) { var s = b[c]; for (k = c + 1; k < 8; k++) s -= A[c][k] * h[k]; h[c] = s / A[c][c]; }
      return function (x, y) { var w = h[6] * x + h[7] * y + 1; return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w]; };
    }
    function frame(q) {
      function d(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
      var W = (d(q[1], q[0]) + d(q[2], q[3])) / 2, H = (d(q[3], q[0]) + d(q[2], q[1])) / 2;
      var u = [(q[1][0] - q[0][0]) + (q[2][0] - q[3][0]), (q[1][1] - q[0][1]) + (q[2][1] - q[3][1])];
      var v = [(q[3][0] - q[0][0]) + (q[2][0] - q[1][0]), (q[3][1] - q[0][1]) + (q[2][1] - q[1][1])];
      var nu = Math.hypot(u[0], u[1]), nv = Math.hypot(v[0], v[1]);
      return { W: W, H: H, M: homog(q, W, H), u: [u[0] / nu, u[1] / nu], v: [v[0] / nv, v[1] / nv] };
    }
    function mapPaths(paths, M) {         // 局所座標の Clipper パス → 全体
      return paths.map(function (p) { return p.map(function (q) { var r = M(q.X / SC, q.Y / SC); return { X: Math.round(r[0] * SC), Y: Math.round(r[1] * SC) }; }); });
    }

    /* ---- 札の形（局所座標の点列）。角ごとに丸みを付ける */
    function fillet(verts) {           // verts: [[x,y,r], ...]（凸多角形）
      var out = [], n = verts.length;
      for (var i = 0; i < n; i++) {
        var p = verts[i], a = verts[(i + n - 1) % n], b = verts[(i + 1) % n], r = p[2] || 0;
        if (r <= 0.01) { out.push([p[0], p[1]]); continue; }
        var da = [a[0] - p[0], a[1] - p[1]], db = [b[0] - p[0], b[1] - p[1]];
        var la = Math.hypot(da[0], da[1]), lb = Math.hypot(db[0], db[1]);
        da = [da[0] / la, da[1] / la]; db = [db[0] / lb, db[1] / lb];
        var ang = Math.acos(Math.max(-1, Math.min(1, da[0] * db[0] + da[1] * db[1])));
        var t = r / Math.tan(ang / 2), lim = Math.min(la, lb) * 0.5;
        if (t > lim) { t = lim; r = t * Math.tan(ang / 2); }
        var s = [p[0] + da[0] * t, p[1] + da[1] * t], e = [p[0] + db[0] * t, p[1] + db[1] * t];
        var bis = [da[0] + db[0], da[1] + db[1]], lbis = Math.hypot(bis[0], bis[1]);
        var cd = r / Math.sin(ang / 2), c = [p[0] + bis[0] / lbis * cd, p[1] + bis[1] / lbis * cd];
        var a0 = Math.atan2(s[1] - c[1], s[0] - c[0]), a1 = Math.atan2(e[1] - c[1], e[0] - c[0]);
        var dA = a1 - a0; while (dA > Math.PI) dA -= 2 * Math.PI; while (dA < -Math.PI) dA += 2 * Math.PI;
        var steps = Math.max(4, Math.ceil(Math.abs(dA) * r / 0.6));
        for (var k = 0; k <= steps; k++) { var aa = a0 + dA * k / steps; out.push([c[0] + r * Math.cos(aa), c[1] + r * Math.sin(aa)]); }
      }
      return out;
    }
    function shapeLocal(S, W, H) {
      var rT = S.rTop * W, rB = S.rBot * W, d = S.botCut * W, ts = S.topSize * W, v = [];
      if (S.top === 'yama') v.push([0, ts, rT], [W / 2, 0, S.rApex * W], [W, ts, rT]);
      else if (S.top === 'kado') v.push([0, ts, rT], [ts, 0, rT], [W - ts, 0, rT], [W, ts, rT]);
      else if (S.top === 'maru') {
        var n = 48; v.push([0, ts, 0]);
        for (var i = 1; i < n; i++) { var a = Math.PI + Math.PI * i / n; v.push([W / 2 + W / 2 * Math.cos(a), ts + ts * Math.sin(a), 0]); }
        v.push([W, ts, 0]);
      } else v.push([0, 0, rT], [W, 0, rT]);
      if (d > 0.01) v.push([W, H - d, rB], [W - d, H, rB], [d, H, rB], [0, H - d, rB]);
      else v.push([W, H, rB], [0, H, rB]);
      return { pts: fillet(v), sh: (S.top === 'flat' ? 0 : ts) };
    }

    /* ---- 札1枚。mode 'param'：数値から描き直す ／ 'cur'：いまの札の部品を変形・加工する */
    var CUR = D.cur ? { L: { face: many(D.cur.L.face), side: many(D.cur.L.side) }, R: { face: many(D.cur.R.face), side: many(D.cur.R.side) } } : null;
    var SQ = [[0, 0], [1, 0], [1, 1], [0, 1]];
    var wcache = {};
    function warp(key, q, paths, mirror) {
      var sig = key + JSON.stringify(q) + (mirror ? 'm' : '') + paths.length + (paths[0] ? paths[0].length : 0);
      if (wcache[sig]) return wcache[sig];
      var keys = Object.keys(wcache); if (keys.length > 24) delete wcache[keys[0]];
      var A = homogPts(D.quads[key], SQ), Bm = homogPts(SQ, q);
      var out = paths.map(function (path) { return path.map(function (pt) {
        var a = A(pt.X / SC, pt.Y / SC); if (mirror) a[0] = 1 - a[0];
        var r = Bm(a[0], a[1]); return { X: Math.round(r[0] * SC), Y: Math.round(r[1] * SC) };
      }); });
      return (wcache[sig] = out);
    }
    function tag(key, q, S, mode) {
      var F = frame(q), W = F.W, H = F.H, M = F.M, face, faceL, side = [], whites = [], sl = null;
      var Minv = homogPts(q, [[0, 0], [W, 0], [W, H], [0, H]]);
      if (mode === 'cur') {
        face = warp(key, q, CUR[key].face, false);
        if (S.dir === 'right') side = warp(key, q, CUR[key].side, false);
        else if (S.dir === 'left') side = warp(key, q, CUR[key].side, true);
        if (S.top !== 'flat' || S.botCut > 0.001) {                // 形を切り取る
          var ms = shapeLocal(S, W, H), mask = off(mapPaths([pts2path(ms.pts)], M), 1.2);
          face = I(face, mask); side = I(side, off(mask, P.G + P.B + 8));
        }
        if (S.roundAdd > 0.001) face = off(off(face, -S.roundAdd * W), S.roundAdd * W);
        if (Math.abs(S.gapAdj) > 0.01) face = off(face, -S.gapAdj);
        if (side.length && S.thickAdj > 0.01) side = Dif(off(side, S.thickAdj), off(face, P.G + Math.max(0, S.gapAdj)));
        if (side.length && S.thickAdj < -0.01) side = off(side, S.thickAdj / 2);
        faceL = mapPaths(face, Minv);
      } else {
        sl = shapeLocal(S, W, H); faceL = [pts2path(sl.pts)];
        face = mapPaths(faceL, M);
        var G = S.gap, B = S.thick;
        if (S.dir !== 'none' && B > 0.05) {
          var sgn = S.dir === 'left' ? -1 : 1;
          var outer = off(face, G + B), ring = Dif(outer, off(face, G));
          var rect = mapPaths([pts2path([[0, 0], [W, 0], [W, H], [0, H]])], M);
          var stt = S.start + sl.sh;
          var f0 = move(rect, F.v[0] * stt, F.v[1] * stt);
          var su = [F.u[0] * 1000 * sgn, F.u[1] * 1000 * sgn], sv = [F.v[0] * 1000, F.v[1] * 1000];
          var wedge = hull([].concat(f0, move(f0, su[0], su[1]), move(f0, sv[0], sv[1]), move(f0, su[0] + sv[0], su[1] + sv[1])));
          side = I(ring, wedge);
          if (S.endRound > 0) side = off(off(side, -B * 0.45 * S.endRound), B * 0.45 * S.endRound);
        }
      }
      if (S.showSide === false) side = [];
      if (S.hatch && side.length) {
        var sp = Math.max(1, S.hatchSp * W), ang = Math.atan2(F.u[1], F.u[0]) + Math.PI / 4;
        var cx = (q[0][0] + q[2][0]) / 2, cy = (q[0][1] + q[2][1]) / 2, ca = Math.cos(ang), sa = Math.sin(ang), stripes = [];
        for (var t = -900; t <= 900; t += sp) {
          var w2 = sp * S.hatchW / 2, L = 900;
          stripes.push(pts2path([[-L, t - w2], [L, t - w2], [L, t + w2], [-L, t + w2]].map(function (p) { return [cx + p[0] * ca - p[1] * sa, cy + p[0] * sa + p[1] * ca]; })));
        }
        var sil0 = U(face, side), edge = Dif(sil0, off(sil0, -S.hatchEdge));
        side = U(I(side, stripes), I(edge, side));
      }
      // 光（局所座標で作ってから全体へ）
      function inset(dd) { return off(faceL, -dd * W); }
      function box(x0, y0, x1, y1) { return [pts2path([[x0, y0], [x1, y0], [x1, y1], [x0, y1]])]; }
      if (S.teri) {
        var r1 = Dif(inset(S.teriPos), inset(S.teriPos + S.teriW));
        var keep = U(box(-1, -1, 0.30 * W, S.teriLen * H), box(-1, -1, 0.72 * W, 0.11 * H));
        whites = whites.concat(mapPaths(I(r1, keep), M));
      }
      if (S.rim) whites = whites.concat(mapPaths(Dif(inset(S.rimPos), inset(S.rimPos + S.rimW)), M));
      if (S.kousen) {
        var zone = I(inset(0.045), box(0.25 * W, -1, W, 0.5 * W)), k = S.kousenPos * W;
        var st1 = offLine([[0.40 * W - k, 0.60 * W + k], [1.10 * W - k, -0.10 * W + k]], 0.05 * W * S.kousenW);
        var st2 = offLine([[0.62 * W - k, 0.62 * W + k], [1.30 * W - k, -0.06 * W + k]], 0.024 * W * S.kousenW);
        whites = whites.concat(mapPaths(I(zone, U(st1, st2)), M));
      }
      return { face: face, side: side, whites: whites, sil: U(face, side) };
    }

    // 札を動かしたら文字も一緒に動かす（元の四角形 → 新しい四角形）
    var tcache = {};
    function followText(key, q) {
      var o = D.quads[key], same = true;
      for (var i = 0; i < 4; i++) if (Math.abs(o[i][0] - q[i][0]) > 1e-3 || Math.abs(o[i][1] - q[i][1]) > 1e-3) same = false;
      if (same) return TEXT[key];
      var sig = JSON.stringify(q); if (tcache[key] && tcache[key].sig === sig) return tcache[key].p;
      var A = homogPts(o, SQ), B = homogPts(SQ, q);
      var p = TEXT[key].map(function (path) { return path.map(function (pt) { var a = A(pt.X / SC, pt.Y / SC), r = B(a[0], a[1]); return { X: Math.round(r[0] * SC), Y: Math.round(r[1] * SC) }; }); });
      tcache[key] = { sig: sig, p: p }; return p;
    }
    var ringCache = {};
    function knotRing(r) { if (!ringCache[r]) ringCache[r] = off(KNOT, r); return ringCache[r]; }

    /* ---- 点の変換 */
    function xformPaths(paths, fn) { return paths.map(function (p) { return p.map(function (q) { var r = fn(q.X / SC, q.Y / SC); return { X: Math.round(r[0] * SC), Y: Math.round(r[1] * SC) }; }); }); }
    function aroundFn(cx, cy, xf) {           // 中心まわりに 大きさ・傾き、そのあと移動
      var k = (xf.scale == null ? 100 : xf.scale) / 100, a = (xf.rot || 0) * Math.PI / 180, c = Math.cos(a) * k, sn = Math.sin(a) * k, dx = xf.dx || 0, dy = xf.dy || 0;
      return function (x, y) { var u = x - cx, v = y - cy; return [cx + u * c - v * sn + dx, cy + u * sn + v * c + dy]; };
    }
    function isId(xf) { return !xf || (!xf.dx && !xf.dy && !xf.rot && (xf.scale == null || xf.scale === 100)); }
    function bboxC(paths) {
      var x0 = 1e18, y0 = 1e18, x1 = -1e18, y1 = -1e18;
      paths.forEach(function (p) { p.forEach(function (q) { if (q.X < x0) x0 = q.X; if (q.X > x1) x1 = q.X; if (q.Y < y0) y0 = q.Y; if (q.Y > y1) y1 = q.Y; }); });
      return [(x0 + x1) / 2 / SC, (y0 + y1) / 2 / SC];
    }

    /* ---- 線（ペン・消しゴム・描いた揺れ線）：入り・抜きのある太さの変わる線 */
    function taperPoly(pts, size, tin, tout) {
      var n = pts.length;
      if (n < 2 || (tin <= 0.01 && tout <= 0.01)) {
        var q = n === 1 ? [pts[0], [pts[0][0] + 0.01, pts[0][1]]] : pts;
        return offLine(q, size / 2);
      }
      var cum = [0];
      for (var i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      var Lt = cum[n - 1] || 1;
      function ease(x) { return x >= 1 ? 1 : Math.sin(Math.max(0, x) * Math.PI / 2); }
      var left = [], right = [], rs = [];
      for (i = 0; i < n; i++) {
        var f = 1;
        if (tin > 0.01) f = Math.min(f, ease(cum[i] / tin));
        if (tout > 0.01) f = Math.min(f, ease((Lt - cum[i]) / tout));
        var r = size / 2 * Math.max(0.12, f); rs.push(r);
        var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
        var nx = -ty / l, ny = tx / l;
        left.push([pts[i][0] + nx * r, pts[i][1] + ny * r]); right.push([pts[i][0] - nx * r, pts[i][1] - ny * r]);
      }
      function cap(c, from, r, k) {           // 端を半円で閉じる
        var a0 = Math.atan2(from[1] - c[1], from[0] - c[0]), o = [];
        for (var j = 1; j < k; j++) { var aa = a0 - Math.PI * j / k; o.push([c[0] + r * Math.cos(aa), c[1] + r * Math.sin(aa)]); }
        return o;
      }
      var poly = left.concat(cap(pts[n - 1], left[n - 1], rs[n - 1], 10), right.slice().reverse(), cap(pts[0], right[0], rs[0], 10));
      var res = CL.Clipper.SimplifyPolygon(pts2path(poly), CL.PolyFillType.pftNonZero);
      return U(res, offLine(pts, size / 2 * 0.12));
    }
    function strokeGeom(s) {
      var L = 0; for (var i = 1; i < s.pts.length; i++) L += Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]);
      var tin = s.tinF != null ? s.tinF * L : (s.tin || 0), tout = s.toutF != null ? s.toutF * L : (s.tout || 0);
      return taperPoly(s.pts, s.size, tin, tout);
    }

    /* ---- 揺れ線：元の線（src）か描いた線（stroke）に、移動・傾き・長さをかける */
    var lcache = {};
    function lineGeom(o) {
      var key = JSON.stringify(o); if (lcache[key]) return lcache[key];
      var base, c;
      if (o.src != null && LINES[o.src]) { base = LINES[o.src]; c = D.lines[o.src].c; }
      else if (o.stroke) { base = strokeGeom(o.stroke); c = bboxC(base); }
      else return [];
      var g = isId(o) ? base : xformPaths(base, aroundFn(c[0], c[1], o));
      var ks = Object.keys(lcache); if (ks.length > 200) lcache = {};
      return (lcache[key] = g);
    }
    function lineObjs(st) {
      if (st.lineObjs) return st.lineObjs;
      return D.lines.map(function (l, i) { return { src: i, on: st.lines ? st.lines[i] !== false : true }; });
    }

    /* ---- 結び：いまの結び（cur）か 10種類から。札の穴の位置に合わせて置く */
    var KN = {}; (D.knots || []).forEach(function (k) { KN[k.id] = { k: k, p: many(k.p) }; });
    var kcache = {};
    function knotGeom(st, quads) {
      var t = st.knotType || 'cur', xf = st.knotXf || {};
      if (t === 'cur' || !KN[t]) {
        if (isId(xf)) return { ink: KNOT, ring: knotRing(st.ring), holes: [] };
        var c = bboxC(KNOT), g = xformPaths(KNOT, aroundFn(c[0], c[1], xf));
        return { ink: g, ring: off(g, st.ring), holes: [] };
      }
      var key = t + JSON.stringify([quads, xf, st.eyeY, st.ring]); if (kcache.key === key) return kcache.v;
      var K = KN[t], k = K.k, ey = st.eyeY == null ? 0.09 : st.eyeY;
      function target(q) { var F = frame(q); return F.M(F.W / 2, F.H * ey); }
      var tL = target(quads.L), tR = target(quads.R);
      var hx = k.hR[0] - k.hL[0], hy = k.hR[1] - k.hL[1], tx = tR[0] - tL[0], ty = tR[1] - tL[1];
      var s = Math.hypot(tx, ty) / Math.hypot(hx, hy), a = Math.atan2(ty, tx) - Math.atan2(hy, hx), ca = Math.cos(a) * s, sa = Math.sin(a) * s;
      var m = [(tL[0] + tR[0]) / 2, (tL[1] + tR[1]) / 2], X = aroundFn(m[0], m[1], xf);
      var fn = function (x, y) { var u = x - k.hL[0], v = y - k.hL[1]; return X(tL[0] + u * ca - v * sa, tL[1] + u * sa + v * ca); };
      var ink = xformPaths(K.p, fn), ks = s * (xf.scale == null ? 1 : xf.scale / 100);
      var holes = k.punch ? [fn(k.hL[0], k.hL[1]), fn(k.hR[0], k.hR[1])] : [];
      var v = { ink: ink, ring: off(ink, st.ring), holes: holes, pr: 0.085 * k.TW * ks, rr: 0.13 * k.TW * ks, lw: 0.0216 * k.TW * ks };
      kcache = { key: key, v: v }; return v;
    }
    function circle(c, r) { var o = []; for (var i = 0; i < 64; i++) { var a = 2 * Math.PI * i / 64; o.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); } return pts2path(o); }

    // レイヤーの順番（下 → 上）
    var ORDER = ['tagL', 'textL', 'tagR', 'textR', 'lines', 'knot', 'pen'];
    // ペン・消しゴム・なめらかを順にかける
    function applyStrokes(geo, list) {
      if (!list || !list.length) return geo;
      var group = null, groups = [];
      list.forEach(function (s) {
        if (s.mode === 'smooth') { group = null; groups.push(s); return; }
        if (!s.pts.length) return;
        var g = strokeGeom(s);
        if (group && group.mode === s.mode) group.p = group.p.concat(g); else { group = { mode: s.mode, p: g }; groups.push(group); }
      });
      groups.forEach(function (g) {
        if (g.mode === 'smooth') geo = smoothIn(geo, g);
        else geo = g.mode === 'draw' ? U(geo, g.p) : Dif(geo, g.p);
      });
      return geo;
    }
    // 描いた線のまわりにも白ふちを付けるか（線ごとに記録。消しゴムは形を減らすので常に反映）
    function ringStroke(s) { return s.mode === 'erase' || (s.mode === 'draw' && s.ring === true); }
    function build(st) {
      var hide = st.hide || {}, layers = {}, base = ORDER.slice(), custom = st.custom || [];
      var order = (st.order || []).filter(function (n) { return base.indexOf(n) >= 0 || custom.some(function (c) { return c.id === n; }); });
      base.forEach(function (n) { if (order.indexOf(n) < 0) order.push(n); });
      custom.forEach(function (c) { if (order.indexOf(c.id) < 0) order.push(c.id); });
      var SL = {}; (st.strokes || []).forEach(function (s) { if (s.off) return; var ly = s.layer || 'all'; (SL[ly] = SL[ly] || []).push(s); });
      var G = {};                                     // レイヤーごとの形 { body, sil, gap, ring }
      // ---- 札
      if (st.mode === 'orig') {
        var o = applyStrokes(ORIG.slice(), (SL.tagL || []).concat(SL.tagR || []));
        G.tagL = { body: o, sil: [], gap: 0, orig: true }; G.tagR = { body: [], sil: [], gap: 0 };
      } else {
        [['tagL', 'L'], ['tagR', 'R']].forEach(function (k) {
          var T = tag(k[1], st.quads[k[1]], st.tags[k[1]], st.mode), text = followText(k[1], st.quads[k[1]]);
          var body = Dif(T.sil, T.whites), sil = T.sil;
          if (SL[k[0]]) { body = applyStrokes(body, SL[k[0]]); sil = applyStrokes(sil, SL[k[0]].filter(ringStroke)); }
          G[k[0]] = { body: body, sil: sil, gap: st.mode === 'cur' ? P.G : st.tags[k[1]].gap };
          // ---- 文字（白く抜く）：札について動き、さらに文字だけの移動・大きさ・傾きをかける
          var tk = 'text' + k[1], xf = (st.textXf || {})[k[1]] || {};
          if (!isId(xf)) { var c = bboxC(text); text = xformPaths(text, aroundFn(c[0], c[1], xf)); }
          if (SL[tk]) text = applyStrokes(text, SL[tk]);
          G[tk] = { body: text, white: true };
        });
      }
      // ---- 揺れ線
      var ls = []; lineObjs(st).forEach(function (o2) { if (o2.on !== false) ls = ls.concat(lineGeom(o2)); });
      ls = applyStrokes(ls.length > 1 ? U(ls) : ls, SL.lines);
      G.lines = { body: ls, sil: ls, gap: st.lineRing || 0 };
      // ---- 結び
      var kg = (st.knot && !(st.mode === 'orig' && (st.knotType || 'cur') === 'cur' && isId(st.knotXf))) ? knotGeom(st, st.quads) : null;
      if (st.knot) {
        var kInk = kg ? kg.ink : KNOT, kRing = kg ? kg.ring : (st.mode === 'orig' ? [] : knotRing(st.ring));
        if (SL.knot) {
          var kBase = kInk; kInk = applyStrokes(kInk, SL.knot);
          if (kRing.length || st.mode !== 'orig') kRing = off(applyStrokes(kBase, SL.knot.filter(ringStroke)), st.ring);
        }
        G.knot = { body: kInk, ringPaths: kRing };
      } else G.knot = { body: [], ringPaths: [] };
      // ---- 追加したレイヤー（空のレイヤー、またはほかのレイヤーの写し）
      custom.forEach(function (c) {
        var src = c.src && G[c.src] ? G[c.src].body : [];
        var xf = c.xf || {}, body = src;
        if (src.length && !isId(xf)) body = xformPaths(src, aroundFn(xf.cx || 0, xf.cy || 0, xf));
        var strokes = SL[c.id], sil = body;
        if (strokes && strokes.length) {
          // 描いた線はレイヤーの座標で記録 → レイヤーの移動・大きさをかけて置く
          var put = function (g) { return isId(xf) ? g : xformPaths(g, aroundFn(xf.cx || 0, xf.cy || 0, xf)); };
          var local = isId(xf) ? body : xformPaths(body, invFn(xf));
          body = put(applyStrokes(local, strokes));
          sil = put(applyStrokes(local, strokes.filter(ringStroke)));
        }
        G[c.id] = { body: body, sil: sil, gap: c.ring || 0, custom: true };
      });
      function holes() {
        if (!kg || !kg.holes.length || st.eyelet === false || hide.knot || !st.knot) return [];
        var hw = [];
        kg.holes.forEach(function (h) { hw.push(circle(h, kg.pr)); hw = hw.concat(Dif([circle(h, kg.rr + kg.lw / 2)], [circle(h, kg.rr - kg.lw / 2)])); });
        return hw;
      }
      // ---- 重ねる（下 → 上）
      var ink = [];
      order.forEach(function (layer) {
        if (hide[layer] || layer === 'pen') { if (layer === 'pen' && !hide.pen) ink = applyStrokes(ink, SL.all); return; }
        var g = G[layer]; if (!g) return;
        layers[layer] = g.body;
        if (layer === 'knot') {
          if (!st.knot) return;
          var hw = holes(); if (hw.length) ink = Dif(ink, hw);
          ink = U(Dif(ink, g.ringPaths), g.body); return;
        }
        if (g.orig) { ink = U(ink, g.body); return; }
        if (g.white) { ink = Dif(ink, g.body); return; }      // 文字は下の色を白く抜く
        if (!g.body.length) return;
        if (g.gap > 0.01 && ink.length) ink = Dif(ink, off(g.sil, g.gap));
        ink = U(ink, g.body);
      });
      if (kg && st.knot && !hide.knot && order.indexOf('knot') < Math.max(order.indexOf('tagL'), order.indexOf('tagR'))) {
        var hw2 = holes(); if (hw2.length) ink = U(Dif(ink, hw2), I(G.knot.body, hw2));
      }
      var res = CL.Clipper.CleanPolygons(ink, 0.5);
      res.layers = layers;
      return res;
    }
    function invFn(xf) {                        // aroundFn の逆
      var k = (xf.scale == null ? 100 : xf.scale) / 100, a = -(xf.rot || 0) * Math.PI / 180, c = Math.cos(a) / k, sn = Math.sin(a) / k, cx = xf.cx || 0, cy = xf.cy || 0, dx = xf.dx || 0, dy = xf.dy || 0;
      return function (x, y) { var u = x - dx - cx, v = y - dy - cy; return [cx + u * c - v * sn, cy + u * sn + v * c]; };
    }

    /* ---- 囲んだ所だけ、輪郭をなめらかにする
       gauss：輪郭の点をならす（囲みの縁に向かって効きを弱め、つなぎ目を出さない）
       round：小さなでこぼこを取り、角を丸める */
    var scache = {};
    function inkSig(ink) {
      var n = 0, sx = 0, sy = 0;
      ink.forEach(function (p) { n += p.length; for (var i = 0; i < p.length; i += 37) { sx = (sx * 31 + p[i].X) % 1000000007; sy = (sy * 17 + p[i].Y) % 1000000007; } });
      return ink.length + ':' + n + ':' + sx + ':' + sy;
    }
    function smoothIn(ink, op) {
      var lasso = op.lasso; if (!lasso || lasso.length < 3) return ink;
      var key = op.strength + '|' + JSON.stringify(lasso) + '|' + inkSig(ink);
      if (scache[key]) return scache[key];
      var res = smoothCore(ink, lasso, Math.max(0.05, op.strength));
      if (Object.keys(scache).length > 12) scache = {};
      return (scache[key] = res);
    }
    function smoothCore(ink, lasso, str) {
      var bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
      lasso.forEach(function (p) { bx0 = Math.min(bx0, p[0]); by0 = Math.min(by0, p[1]); bx1 = Math.max(bx1, p[0]); by1 = Math.max(by1, p[1]); });
      var n = lasso.length;
      function inside(x, y) {
        var c = false;
        for (var i = 0, j = n - 1; i < n; j = i++) {
          var a = lasso[i], b = lasso[j];
          if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
        }
        return c;
      }
      function edgeDist(x, y) {
        var md = 1e18;
        for (var i = 0, j = n - 1; i < n; j = i++) {
          var a = lasso[j], b = lasso[i], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9;
          var t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)), ex = a[0] + t * dx - x, ey = a[1] + t * dy - y;
          var d = ex * ex + ey * ey; if (d < md) md = d;
        }
        return Math.sqrt(md);
      }
      var feather = Math.max(2 * str, 3), h = Math.min(0.5, str / 3), out = [];
      ink.forEach(function (path) {
        var hit = false;
        for (var k = 0; k < path.length && !hit; k++) { var x = path[k].X / SC, y = path[k].Y / SC; if (x >= bx0 && x <= bx1 && y >= by0 && y <= by1) hit = true; }
        if (!hit) { out.push(path); return; }
        // 等間隔に点を打ち直す
        var P = [], m = path.length;
        for (k = 0; k < m; k++) {
          var a = path[k], b = path[(k + 1) % m], ax = a.X / SC, ay = a.Y / SC, dx = b.X / SC - ax, dy = b.Y / SC - ay, L = Math.hypot(dx, dy), ns = Math.max(1, Math.ceil(L / h));
          for (var j = 0; j < ns; j++) P.push([ax + dx * j / ns, ay + dy * j / ns]);
        }
        var N = P.length; if (N < 8) { out.push(path); return; }
        var sig = str / h, R = Math.min(Math.floor(N / 2) - 1, Math.ceil(sig * 3)), wts = [], ws = 0;
        for (j = -R; j <= R; j++) { var w = Math.exp(-j * j / (2 * sig * sig)); wts.push(w); ws += w; }
        var Q = [];
        for (k = 0; k < N; k++) {
          var p = P[k], wgt = 0;
          if (p[0] >= bx0 - 1 && p[0] <= bx1 + 1 && p[1] >= by0 - 1 && p[1] <= by1 + 1 && inside(p[0], p[1])) {
            var t = Math.min(1, edgeDist(p[0], p[1]) / feather); wgt = t * t * (3 - 2 * t);
          }
          if (wgt <= 0) { Q.push(p); continue; }
          var sx = 0, sy = 0;
          for (j = -R; j <= R; j++) { var q = P[(k + j + N) % N], ww = wts[j + R]; sx += q[0] * ww; sy += q[1] * ww; }
          sx /= ws; sy /= ws;
          Q.push([p[0] + (sx - p[0]) * wgt, p[1] + (sy - p[1]) * wgt]);
        }
        // 点を間引いて戻す
        var keep = [Q[0]];
        for (k = 1; k < N; k++) {
          var l2 = keep[keep.length - 1], nx = Q[(k + 1) % N];
          var cr = Math.abs((Q[k][0] - l2[0]) * (nx[1] - l2[1]) - (Q[k][1] - l2[1]) * (nx[0] - l2[0])) / (Math.hypot(nx[0] - l2[0], nx[1] - l2[1]) || 1);
          if (cr > 0.02 || Math.hypot(Q[k][0] - l2[0], Q[k][1] - l2[1]) > 3) keep.push(Q[k]);
        }
        if (keep.length > 2) out.push(pts2path(keep));
      });
      return CL.Clipper.SimplifyPolygons(out, CL.PolyFillType.pftNonZero);
    }
    function toD(paths) {
      return paths.map(function (p) { return 'M' + p.map(function (q) { return (q.X / SC).toFixed(2) + ' ' + (q.Y / SC).toFixed(2); }).join('L') + 'Z'; }).join('');
    }
    function toSVG(paths, color, title) {
      var mm = 25.4 / 72;
      return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="' + (D.W * mm).toFixed(2) + 'mm" height="' + (D.H * mm).toFixed(2) +
        'mm" viewBox="0 0 ' + D.W + ' ' + D.H + '">\n  <title>' + (title || '仲羽田青年会 札ロゴ') + '</title>\n  <path id="logo" fill="' + color + '" fill-rule="nonzero" d="' + toD(paths) + '"/>\n</svg>\n';
    }
    // タオル作成ツール用：ロゴの命令列と外形（および部位別レイヤー）
    function pathsToCmds(ps) {
      var o = [];
      (ps || []).forEach(function (p) { p.forEach(function (q, i) { o.push([i ? 'L' : 'M', q.X / SC, q.Y / SC]); }); o.push(['Z']); });
      return o;
    }
    function forTowel(paths) {
      var logo = pathsToCmds(paths);
      var big = paths.reduce(function (m, p) { var a = Math.abs(CL.Clipper.Area(p)); return a > m.a ? { a: a, o: CL.Clipper.Orientation(p) } : m; }, { a: 0, o: true });
      var outers = paths.filter(function (p) { return CL.Clipper.Orientation(p) === big.o && Math.abs(CL.Clipper.Area(p)) > 4 * SC * SC; });
      var sil = U(outers).filter(function (p) { return CL.Clipper.Orientation(p) === big.o; })
        .map(function (p) { return p.map(function (q) { return [q.X / SC, q.Y / SC]; }); });
      var parts = null;
      if (paths.layers && paths.layers.tagL && paths.layers.tagL.length && paths.layers.tagR && paths.layers.tagR.length) {
        var L = paths.layers;
        parts = {
          tagL: pathsToCmds(Dif(L.tagL || [], L.textL || [])),
          tagR: pathsToCmds(Dif(L.tagR || [], L.textR || [])),
          text: pathsToCmds((L.textL || []).concat(L.textR || [])),
          knot: pathsToCmds(L.knot || []),
          shake: pathsToCmds(L.lines || [])
        };
      }
      return { logo: logo, sil: sil, parts: parts };
    }
    return { build: build, toD: toD, toSVG: toSVG, forTowel: forTowel, frame: frame, lineGeom: lineGeom, knotGeom: knotGeom, strokeGeom: strokeGeom, lineObjs: lineObjs, knots: D.knots || [], SC: SC, ORDER: ORDER, aroundFn: aroundFn, invFn: invFn, bboxC: bboxC };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = makeFudaEngine;
  else root.makeFudaEngine = makeFudaEngine;
})(this);
