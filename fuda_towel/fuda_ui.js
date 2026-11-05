/* 札の調整ツールの画面 */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var D = window.FUDA_DATA, CL = window.ClipperLib;
  if (!D || !CL || !window.makeFudaEngine) { var c0 = $('#fcv'); if (c0) c0.textContent = '部品を読み込めませんでした。再読み込みしてください。'; return; }
  var eng = window.makeFudaEngine(D, CL), PRE = window.FUDA_PRESETS(D), SC = eng.SC;
  var MM = 25.4 / 72, KEY = 'fuda_state_v3';
  var st = null, target = 'both', tool = 'none', last = null, selLine = -1;
  var view = { z: 1, cx: null, cy: null }, vbFit = null;
  var hist = [], fut = [];
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function say(t) { $('#fmsg').textContent = t; }

  /* ---------- 数値の入力欄 ---------- */
  // [キー, 名前, 最小, 最大, 刻み, 表示の倍率（pt→mm は MM、割合→% は 100）, 単位, 'p'描き直し案のみ / 'c'いまの札のみ]
  var ROWS = {
    fshapeRows: [['topSize', '頭の大きさ', 0, 0.7, 0.005, 100, '%'], ['rTop', '上の角の丸み', 0, 0.5, 0.005, 100, '%'], ['rApex', '山の先の丸み', 0, 0.4, 0.005, 100, '%'],
                 ['rBot', '下の角の丸み', 0, 0.5, 0.005, 100, '%', 'p'], ['botCut', '下の角落とし', 0, 0.4, 0.005, 100, '%'], ['roundAdd', '角をさらに丸く', 0, 0.3, 0.002, 100, '%', 'c']],
    fthickRows: [['thick', '厚み', 0, 45, 0.25, MM, 'mm', 'p'], ['gap', '白いすき間', 0, 20, 0.25, MM, 'mm', 'p'], ['start', '厚みの始まり', -30, 80, 0.5, MM, 'mm', 'p'], ['endRound', '帯の端の丸み', 0, 1, 0.05, 100, '%', 'p'],
                 ['thickAdj', '厚みを増やす／減らす', -12, 20, 0.1, MM, 'mm', 'c'], ['gapAdj', '白いすき間を広げる／狭める', -5, 10, 0.1, MM, 'mm', 'c']],
    fhatchRows: [['hatchSp', '斜線の間隔', 0.03, 0.2, 0.002, 100, '%'], ['hatchW', '斜線の太さ', 0.15, 0.85, 0.01, 100, '%'], ['hatchEdge', '外の縁の太さ', 0, 8, 0.1, MM, 'mm']],
    fteriRows: [['teriPos', '縁からの距離', 0.005, 0.2, 0.002, 100, '%'], ['teriW', '線の太さ', 0.004, 0.08, 0.001, 100, '%'], ['teriLen', '左の線の長さ', 0.2, 1, 0.01, 100, '%']],
    fkousenRows: [['kousenW', '筋の太さ', 0.3, 2.5, 0.05, 100, '%'], ['kousenPos', '筋の位置', -0.35, 0.35, 0.005, 100, '%']],
    frimRows: [['rimPos', '縁からの距離', 0.01, 0.25, 0.002, 100, '%'], ['rimW', '線の太さ', 0.004, 0.08, 0.001, 100, '%']]
  };
  var XF = [['scale', '大きさ', 60, 140, 0.5, 1, '%'], ['rot', '傾き', -30, 30, 0.25, 1, '°'], ['dx', '左右の位置', -80, 80, 0.5, MM, 'mm'], ['dy', '上下の位置', -80, 80, 0.5, MM, 'mm']];
  var KXF = [['scale', '結びの大きさ', 30, 200, 0.5, 1, '%'], ['rot', '結びの傾き', -60, 60, 0.5, 1, '°'], ['dx', '結びの左右', -150, 150, 0.5, MM, 'mm'], ['dy', '結びの上下', -150, 150, 0.5, MM, 'mm']];
  var LXF = [['rot', '線の角度', -180, 180, 0.5, 1, '°'], ['scale', '線の長さ・大きさ', 20, 300, 1, 1, '%'], ['dx', '線の左右', -250, 250, 0.5, MM, 'mm'], ['dy', '線の上下', -250, 250, 0.5, MM, 'mm']];
  function mkRow(box, def, onSet) {
    var id = 'f_' + def[0] + '_' + box.id, row = document.createElement('div'); row.className = 'row';
    row.innerHTML = '<label for="' + id + '"></label><input type="range" id="' + id + '"><input type="number">';
    row.querySelector('label').textContent = def[1] + '（' + def[6] + '）';
    var r = row.querySelector('input[type=range]'), n = row.querySelector('input[type=number]');
    r.min = def[2] * def[5]; r.max = def[3] * def[5]; r.step = def[4] * def[5]; n.step = r.step;
    r.addEventListener('input', function () { n.value = r.value; onSet(def[0], r.value / def[5], true); });
    r.addEventListener('change', function () { onSet(def[0], r.value / def[5], false); });
    n.addEventListener('change', function () { r.value = n.value; onSet(def[0], parseFloat(n.value) / def[5], false); });
    box.appendChild(row);
    return { key: def[0], row: row, only: def[7], set: function (v) { var x = +(v * def[5]).toFixed(2); r.value = x; n.value = x; } };
  }
  var tagRows = [], xfRows = [], knotRows = [], lineRows = [], ringRow, eyeRow;
  Object.keys(ROWS).forEach(function (bid) {
    ROWS[bid].forEach(function (def) { tagRows.push(mkRow($('#' + bid), def, function (k, v, live) { setTag(k, v, live); })); });
  });
  XF.forEach(function (def) { xfRows.push(mkRow($('#fxfRows'), def, function (k, v, live) { setXf(k, v, live); })); });
  KXF.forEach(function (def) { knotRows.push(mkRow($('#fknotRows'), def, function (k, v, live) { pushOnce(live); st.knotXf[k] = v; schedule(); })); });
  ringRow = mkRow($('#fknotRows'), ['ring', '結びのまわりの白ふち', 0, 12, 0.1, MM, 'mm'], function (k, v, live) { pushOnce(live); st.ring = v; schedule(); });
  eyeRow = mkRow($('#fknotRows'), ['eyeY', '穴の位置（札の上から）', 0.02, 0.3, 0.002, 100, '%'], function (k, v, live) { pushOnce(live); st.eyeY = v; schedule(); });
  var lineRingRow = mkRow($('#flayerRows'), ['lineRing', '揺れ線のまわりの白ふち', 0, 8, 0.1, MM, 'mm'], function (k, v, live) { pushOnce(live); st.lineRing = v; schedule(); });
  LXF.forEach(function (def) { lineRows.push(mkRow($('#flineRows'), def, function (k, v, live) {
    if (selLine < 0) return; pushOnce(live); st.lineObjs[selLine][k] = v; schedule();
  })); });

  /* ---------- 状態の変更（元に戻すの記録つき） ---------- */
  var pending = false;
  function pushOnce(live) {
    if (!pending) { hist.push(clone(st)); if (hist.length > 80) hist.shift(); fut = []; pending = true; }
    if (!live) pending = false;
  }
  function commit() { hist.push(clone(st)); if (hist.length > 80) hist.shift(); fut = []; }
  function tags() { return target === 'both' ? ['L', 'R'] : [target]; }
  function setTag(k, v, live) { pushOnce(live); tags().forEach(function (t) { st.tags[t][k] = v; }); schedule(); }
  function setXf(k, v, live) { pushOnce(live); tags().forEach(function (t) { st.xf[t][k] = v; }); schedule(); }
  function upgrade(s) {                // 古い保存データにも新しい項目を足す
    if (!s.xf) s.xf = { L: { scale: 100, rot: 0, dx: 0, dy: 0 }, R: { scale: 100, rot: 0, dx: 0, dy: 0 } };
    if (!s.lineObjs) s.lineObjs = D.lines.map(function (l, i) { return { src: i, on: s.lines ? s.lines[i] !== false : true, dx: 0, dy: 0, rot: 0, scale: 100 }; });
    if (!s.knotType) s.knotType = 'cur';
    if (!s.knotXf) s.knotXf = { scale: 100, rot: 0, dx: 0, dy: 0 };
    if (s.eyelet == null) s.eyelet = true;
    if (s.eyeY == null) s.eyeY = 0.09;
    if (!s.strokes) s.strokes = [];
    if (!s.custom) s.custom = [];
    if (!s.order) s.order = eng.ORDER.slice();
    [['textL', 'tagL'], ['textR', 'tagR']].forEach(function (t) { if (s.order.indexOf(t[0]) < 0) { var j = s.order.indexOf(t[1]); s.order.splice(j < 0 ? 0 : j + 1, 0, t[0]); } });
    eng.ORDER.forEach(function (n) { if (s.order.indexOf(n) < 0) s.order.push(n); });
    if (!s.textXf) s.textXf = { L: { scale: 100, rot: 0, dx: 0, dy: 0 }, R: { scale: 100, rot: 0, dx: 0, dy: 0 } };
    s.custom.forEach(function (c) { if (s.order.indexOf(c.id) < 0) s.order.splice(s.order.length - 1, 0, c.id); });
    s.order = s.order.filter(function (n) { return eng.ORDER.indexOf(n) >= 0 || s.custom.some(function (c) { return c.id === n; }); });
    if (s.lineRing == null) s.lineRing = 0;
    ['L', 'R'].forEach(function (t) { ['roundAdd', 'gapAdj', 'thickAdj'].forEach(function (k) { if (s.tags[t][k] == null) s.tags[t][k] = 0; }); });
    return s;
  }
  function fresh(id) {
    var p = PRE.filter(function (x) { return x[0] === id; })[0] || PRE[0];
    var s = clone(p[2]); s.preset = p[0]; return upgrade(s);
  }
  function effQuads(s) {
    var o = {};
    ['L', 'R'].forEach(function (t) {
      var q = s.quads[t], x = s.xf[t], cx = 0, cy = 0;
      q.forEach(function (p) { cx += p[0] / 4; cy += p[1] / 4; });
      var a = x.rot * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a), k = x.scale / 100;
      o[t] = q.map(function (p) { var dx = (p[0] - cx) * k, dy = (p[1] - cy) * k; return [cx + dx * c - dy * sn + x.dx, cy + dx * sn + dy * c + x.dy]; });
    });
    return o;
  }

  /* ---------- 揺れ線の一覧 ---------- */
  function lineName(o, i) {
    if (o.stroke) return '描いた揺れ線';
    var l = D.lines[o.src], side = l.c[0] < D.W / 2 ? '左' : '右', h = l.c[1] < D.H * 0.6 ? '上' : '下';
    return '揺れ線' + (o.src + 1) + '（' + side + h + '）' + (o.copy ? 'のコピー' : '');
  }
  function renderLineList() {
    var box = $('#flines'); box.textContent = '';
    st.lineObjs.forEach(function (o, i) {
      var row = document.createElement('div'); row.className = 'lrow';
      var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = o.on !== false; cb.title = '表示する';
      cb.addEventListener('change', function () { commit(); o.on = cb.checked; schedule(true); });
      var b = document.createElement('button'); b.type = 'button'; b.textContent = (i + 1) + '. ' + lineName(o, i);
      b.setAttribute('aria-pressed', String(i === selLine));
      b.addEventListener('click', function () { selLine = selLine === i ? -1 : i; renderLineList(); syncUI(); drawOverlay(); });
      row.appendChild(cb); row.appendChild(b); box.appendChild(row);
    });
  }

  /* ---------- レイヤーの順番・描いた線の記録 ---------- */
  var LAYER_NAME = { pen: 'ペン・消しゴム・なめらか（全体）', knot: '結び', lines: '揺れ線', tagR: '青年会の札', tagL: '仲羽田の札', textL: '「仲羽田」の文字', textR: '「青年会」の文字' };
  var LAYER_SHORT = { all: '全体', knot: '結び', lines: '揺れ線', tagR: '青年会の札', tagL: '仲羽田の札', textL: '「仲羽田」の文字', textR: '「青年会」の文字' };
  var activeLayer = 'all';
  function cust(id) { return (st.custom || []).filter(function (c) { return c.id === id; })[0]; }
  function lname(id) { var c = cust(id); return c ? c.name : (LAYER_SHORT[id] || LAYER_NAME[id] || id); }
  function fillActiveSel() {
    var sel = $('#factiveSel'); sel.textContent = '';
    [['all', '全体（ぜんぶに）'], ['tagL', '仲羽田の札'], ['textL', '「仲羽田」の文字'], ['tagR', '青年会の札'], ['textR', '「青年会」の文字'], ['knot', '結び'], ['lines', '揺れ線']].concat((st.custom || []).map(function (c) { return [c.id, c.name]; }))
      .forEach(function (o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; sel.appendChild(op); });
    if (activeLayer !== 'all' && eng.ORDER.indexOf(activeLayer) < 0 && !cust(activeLayer)) activeLayer = 'all';
    sel.value = activeLayer;
  }
  function setActive(ly) {
    activeLayer = ly;
    fillActiveSel();
    renderLayers(); renderCustomEdit(); renderTextEdit(); paintActive(); syncUI();
    if (ly !== 'all') say('「' + lname(ly) + '」だけを編集します。ペン・消しゴム・なめらかは、このレイヤーにだけかかります。');
  }
  // 追加したレイヤーの設定（名前・白ふち・移動・大きさ・傾き）
  var custRows = [];
  (function () {
    var box = $('#fcustRows');
    [['ring', 'まわりの白ふち', 0, 10, 0.1, MM, 'mm'], ['scale', '大きさ', 10, 400, 1, 1, '%'], ['rot', '傾き', -180, 180, 0.5, 1, '°'], ['dx', '左右', -300, 300, 0.5, MM, 'mm'], ['dy', '上下', -300, 300, 0.5, MM, 'mm']].forEach(function (def) {
      custRows.push(mkRow(box, def, function (k, v, live) {
        var c = cust(activeLayer); if (!c) return; pushOnce(live);
        if (k === 'ring') c.ring = v; else c.xf[k] = v; schedule();
      }));
    });
  })();
  // 文字のレイヤーの位置・大きさ・傾き
  var textRows = [];
  (function () {
    var box = $('#ftextRows');
    [['scale', '文字の大きさ', 30, 250, 0.5, 1, '%'], ['rot', '文字の傾き', -90, 90, 0.25, 1, '°'], ['dx', '文字の左右', -150, 150, 0.25, MM, 'mm'], ['dy', '文字の上下', -150, 150, 0.25, MM, 'mm']].forEach(function (def) {
      textRows.push(mkRow(box, def, function (k, v, live) {
        var t = textKey(); if (!t) return; pushOnce(live); st.textXf[t][k] = v; schedule();
      }));
    });
  })();
  function textKey() { return activeLayer === 'textL' ? 'L' : (activeLayer === 'textR' ? 'R' : null); }
  function renderTextEdit() {
    var t = textKey();
    $('#ftextEdit').style.display = t ? '' : 'none';
    if (!t) return;
    var x = st.textXf[t];
    textRows.forEach(function (r) { r.set(x[r.key] == null ? (r.key === 'scale' ? 100 : 0) : x[r.key]); });
    $('#ftextTitle').textContent = (t === 'L' ? '「仲羽田」' : '「青年会」') + 'の文字の位置・大きさ（札とは別に動きます）';
  }
  function renderCustomEdit() {
    var c = cust(activeLayer);
    $('#fcustEdit').style.display = c ? '' : 'none';
    if (!c) return;
    $('#fcustName').value = c.name;
    custRows.forEach(function (r) { r.set(r.key === 'ring' ? (c.ring || 0) : (c.xf[r.key] == null ? (r.key === 'scale' ? 100 : 0) : c.xf[r.key])); });
    $('#fcustSrc').textContent = c.src ? '「' + lname(c.src) + '」の写し（元を変えると、写しも変わります）' : '空のレイヤー（ペンで描いて作ります）';
  }
  var nextId = function () { var n = 1; while (cust('c' + n)) n++; return 'c' + n; };
  function addLayer(src) {
    commit();
    var id = nextId(), num = +id.slice(1);
    var c = { id: id, name: src ? lname(src) + 'の写し' : 'レイヤー' + num, src: src || null, ring: src === 'knot' ? st.ring : 1.5, xf: { dx: src ? 15 : 0, dy: src ? 15 : 0, scale: 100, rot: 0, cx: D.W / 2, cy: D.H / 2 } };
    if (src && last && last.layers && last.layers[src]) { var bc = eng.bboxC(last.layers[src]); c.xf.cx = bc[0]; c.xf.cy = bc[1]; }
    st.custom.push(c);
    var pi = st.order.indexOf('pen'); st.order.splice(pi < 0 ? st.order.length : pi, 0, id);
    activeLayer = id; schedule(true); fillActiveSel(); renderCustomEdit();
    say(src ? '「' + c.name + '」を作りました。位置・大きさは下の欄か「レイヤーを動かす」で変えられます。' : '「' + c.name + '」を作りました。ペンで描くと、このレイヤーに入ります。');
    if (!src) { tool = 'draw'; svg.classList.add('tool'); }
  }
  function renderLayers() {
    var box = $('#flayers'); box.textContent = '';
    var top = st.order.slice().reverse();
    top.forEach(function (name, i) {
      var row = document.createElement('div'); row.className = 'lrow';
      var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !(st.hide && st.hide[name]); cb.title = '表示する';
      cb.addEventListener('change', function () { commit(); st.hide = st.hide || {}; st.hide[name] = !cb.checked; schedule(true); });
      var c = cust(name);
      var sp = document.createElement('span'); sp.textContent = (i + 1) + '. ' + (c ? '★ ' + c.name : LAYER_NAME[name]) + (i === 0 ? '（手前）' : (i === top.length - 1 ? '（奥）' : ''));
      var ly = name === 'pen' ? 'all' : name;
      var ed = document.createElement('button'); ed.type = 'button'; ed.textContent = '編集'; ed.className = 'ledit';
      ed.setAttribute('aria-pressed', String(activeLayer === ly));
      ed.addEventListener('click', function () { setActive(activeLayer === ly ? 'all' : ly); });
      var up = document.createElement('button'); up.type = 'button'; up.textContent = '↑'; up.title = '手前へ'; up.disabled = i === 0;
      var dn = document.createElement('button'); dn.type = 'button'; dn.textContent = '↓'; dn.title = '奥へ'; dn.disabled = i === top.length - 1;
      function mv(d) { commit(); var o = st.order, j = o.indexOf(name), k = j + d; if (k < 0 || k >= o.length) return; o[j] = o[k]; o[k] = name; schedule(true); }
      up.addEventListener('click', function () { mv(1); }); dn.addEventListener('click', function () { mv(-1); });
      row.appendChild(cb); row.appendChild(sp); row.appendChild(ed); row.appendChild(up); row.appendChild(dn);
      if (c) {
        var del = document.createElement('button'); del.type = 'button'; del.textContent = '×'; del.title = 'このレイヤーを削除';
        del.addEventListener('click', function () {
          commit(); st.custom = st.custom.filter(function (x) { return x.id !== name; }); st.order = st.order.filter(function (x) { return x !== name; });
          st.strokes = st.strokes.filter(function (x) { return x.layer !== name; });
          st.custom.forEach(function (x) { if (x.src === name) x.src = null; });
          if (activeLayer === name) activeLayer = 'all'; schedule(true); fillActiveSel(); renderCustomEdit();
        });
        row.appendChild(del);
      }
      box.appendChild(row);
    });
  }
  // 編集中のレイヤーを濃く、ほかを薄く見せる
  function paintActive() {
    var a = $('#factive'), ink = $('#fink');
    var g = last && last.layers && activeLayer !== 'all' ? last.layers[activeLayer] : null;
    var white = activeLayer === 'textL' || activeLayer === 'textR';
    if (g && (white || $('#fdim').checked)) {
      a.setAttribute('d', eng.toD(g));
      if (white) {                       // 文字は白抜きなので、赤い輪郭で場所を示す
        a.setAttribute('fill', 'rgba(255,90,60,.18)'); a.setAttribute('stroke', '#ff3b30'); a.setAttribute('stroke-width', (1.2 / view.z).toFixed(3));
        if ($('#fdim').checked) ink.setAttribute('fill-opacity', '0.45'); else ink.removeAttribute('fill-opacity');
      } else { a.setAttribute('fill', st.color); a.removeAttribute('stroke'); ink.setAttribute('fill-opacity', '0.22'); }
    }
    else { a.setAttribute('d', ''); a.removeAttribute('stroke'); ink.removeAttribute('fill-opacity'); }
  }
  var hiStroke = -1;
  function renderStrokes() {
    var box = $('#fstrokes'); box.textContent = '';
    if (!st.strokes.length) { var e0 = document.createElement('div'); e0.className = 'hint'; e0.textContent = 'まだありません。'; box.appendChild(e0); return; }
    var nm = { draw: 'ペン', erase: '消しゴム', smooth: 'なめらか' };
    st.strokes.forEach(function (s, i) {
      var row = document.createElement('div'); row.className = 'lrow';
      var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !s.off; cb.title = '使う';
      cb.addEventListener('change', function () { commit(); s.off = !cb.checked; schedule(true); });
      var sp = document.createElement('span'); sp.textContent = (i + 1) + '. ' + nm[s.mode] + '［' + lname(s.layer || 'all') + '］' + (s.mode === 'smooth' ? '（強さ ' + (s.strength * MM).toFixed(1) + 'mm）' : '（太さ ' + (s.size * MM).toFixed(1) + 'mm）');
      sp.addEventListener('pointerenter', function () { hiStroke = i; drawOverlay(); });
      sp.addEventListener('pointerleave', function () { hiStroke = -1; drawOverlay(); });
      var del = document.createElement('button'); del.type = 'button'; del.textContent = '×'; del.title = '削除';
      del.addEventListener('click', function () { commit(); st.strokes.splice(i, 1); hiStroke = -1; schedule(true); });
      row.appendChild(cb); row.appendChild(sp); row.appendChild(del); box.appendChild(row);
    });
  }

  /* ---------- 画面の同期 ---------- */
  function syncUI() {
    var t = st.tags[target === 'R' ? 'R' : 'L'], x = st.xf[target === 'R' ? 'R' : 'L'];
    tagRows.forEach(function (r) { r.set(t[r.key] || 0); r.row.style.display = (!r.only || (r.only === 'c') === (st.mode === 'cur')) ? '' : 'none'; });
    var dl = st.mode === 'cur' ? ['右と下（いまのまま）', '左と下（反転）', 'なし'] : ['右と下', '左と下', 'なし'];
    $$('#fdir button').forEach(function (b, i) { b.textContent = dl[i]; });
    $('#ftop button[data-v="flat"]').textContent = st.mode === 'cur' ? 'いまのまま' : '平ら';
    xfRows.forEach(function (r) { r.set(x[r.key]); });
    knotRows.forEach(function (r) { r.set(st.knotXf[r.key]); });
    ringRow.set(st.ring); eyeRow.set(st.eyeY); lineRingRow.set(st.lineRing || 0);
    var kn = eng.knots.filter(function (k) { return k.id === st.knotType; })[0];
    eyeRow.row.style.display = kn ? '' : 'none';
    $('#feyeWrap').style.display = kn && kn.punch ? '' : 'none';
    $('#feyelet').checked = st.eyelet !== false;
    $('#fknotType').value = st.knotType;
    $('#flineEdit').style.display = selLine >= 0 ? '' : 'none';
    if (selLine >= 0) { var o = st.lineObjs[selLine]; lineRows.forEach(function (r) { r.set(o[r.key] == null ? (r.key === 'scale' ? 100 : 0) : o[r.key]); }); }
    $$('#ftop button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === t.top)); });
    $$('#fdir button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === t.dir)); });
    $$('[data-fchk]').forEach(function (c) { c.checked = !!t[c.dataset.fchk]; });
    $$('#ftarget button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.g === target)); });
    $$('#ftool button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.t === tool)); });
    $('#fpenOpts').classList.toggle('on', tool === 'draw' || tool === 'erase' || tool === 'line');
    $('#fsmoothOpts').classList.toggle('on', tool === 'smooth');
    $('#fknot').checked = !!st.knot;
    $('#fcolor').value = st.color.toLowerCase(); $('#fcolorCode').textContent = st.color.toUpperCase();
    $('#fpreset').value = st.preset;
    var orig = st.mode === 'orig';
    $$('.fparam').forEach(function (f) { f.disabled = orig; });
    $('#fhandles').disabled = orig;
    var hint = {
      none: '空いている所をつかむと表示が動きます。「札の角をドラッグで動かす」をオンにすると、角（○）で形、札をつかんで位置を変えられます。',
      mvline: '動かしたい揺れ線をドラッグしてください。角度・長さは右の「揺れ線」で変えられます。',
      mvknot: '結びをドラッグして動かします。大きさ・傾きは右の「結び」で変えられます。',
      mvlayer: '「編集するレイヤー」で選んだレイヤーを、ドラッグでまるごと動かします。',
      draw: 'なぞって描きます。端が近くの線や札に近いと、自然につながります。',
      erase: 'なぞった所を消します。',
      line: 'なぞると、両端が細い揺れ線を新しく描けます（あとで動かせます）。',
      pan: 'ドラッグで表示を動かします。拡大はホイール・二本指・「＋」。',
      smooth: 'なめらかにしたい所をぐるっと囲んでください。'
    }[tool] + '　拡大：ホイール／二本指／＋ボタン。表示を動かす：「選ぶ・動かす」で空いている所をつかむ・「手のひら」・スペースキーを押しながら・二本指。';
    $('#flayerNow').textContent = activeLayer === 'all' ? '全体' : lname(activeLayer);
    $('#fhint').textContent = orig ? 'この案では形は変えられません。形や光も変えるときは「いまの札（採用版）を調整」を選んでください。' + hint : hint;
    $('#fundo').disabled = !hist.length; $('#fredo').disabled = !fut.length;
  }

  /* ---------- 描画 ---------- */
  var timer = null, NS = 'http://www.w3.org/2000/svg';
  function schedule(now) {
    if ($('#fuda').hidden) return;
    $('#fcv').classList.add('working');
    clearTimeout(timer); timer = setTimeout(run, now ? 0 : 160);
  }
  function effState() { var s = clone(st); s.quads = effQuads(st); return s; }
  function bounds(paths) {
    var b = [0, 0, D.W, D.H];
    paths.forEach(function (p) { p.forEach(function (q) { var x = q.X / SC, y = q.Y / SC; if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; }); });
    return b;
  }
  function run() {
    try { last = eng.build(effState()); } catch (e) { say('作成でエラー：' + e.message); $('#fcv').classList.remove('working'); return; }
    $('#fink').setAttribute('d', eng.toD(last)); $('#fink').setAttribute('fill', st.color); paintActive();
    var b = bounds(last), m = 10;                                    // はみ出した分も見えるように
    vbFit = [b[0] - m, b[1] - m, b[2] - b[0] + 2 * m, b[3] - b[1] + 2 * m];
    $('#fcv').classList.remove('working');
    fillActiveSel(); applyView(); renderLineList(); renderLayers(); renderStrokes(); renderCustomEdit(); renderTextEdit(); syncUI();
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
  }
  /* ---------- ズーム・表示の移動 ---------- */
  function applyView() {
    if (!vbFit) return;
    if (view.cx == null || view.z <= 1.0001) { view.z = Math.max(1, view.z); if (view.z <= 1.0001) { view.cx = vbFit[0] + vbFit[2] / 2; view.cy = vbFit[1] + vbFit[3] / 2; } }
    var w = vbFit[2] / view.z, h = vbFit[3] / view.z;
    // 表示が絵の外へ行きすぎないように
    view.cx = Math.min(Math.max(view.cx, vbFit[0] + w / 2 - 20), vbFit[0] + vbFit[2] - w / 2 + 20);
    view.cy = Math.min(Math.max(view.cy, vbFit[1] + h / 2 - 20), vbFit[1] + vbFit[3] - h / 2 + 20);
    var x = view.cx - w / 2, y = view.cy - h / 2;
    svg.setAttribute('viewBox', [x, y, w, h].map(function (v) { return v.toFixed(2); }).join(' '));
    var bg = $('#fbg'); bg.setAttribute('x', x - 50); bg.setAttribute('y', y - 50); bg.setAttribute('width', w + 100); bg.setAttribute('height', h + 100);
    $('#fzoomLbl').textContent = Math.round(view.z * 100) + '%';
    drawOverlay();
  }
  function s2v(sx, sy) { var q = svg.createSVGPoint(); q.x = sx; q.y = sy; var r = q.matrixTransform(svg.getScreenCTM().inverse()); return [r.x, r.y]; }
  function keepUnder(target, sx, sy) {     // 絵の点 target が画面の (sx,sy) に来るように表示をずらす
    var now = s2v(sx, sy); view.cx += target[0] - now[0]; view.cy += target[1] - now[1]; applyView();
  }
  function zoomAt(z, sx, sy) {            // 画面上の点 (sx,sy) を動かさずに倍率を変える
    if (!vbFit) return;
    z = Math.max(1, Math.min(16, z));
    var r = svg.getBoundingClientRect();
    if (sx == null) { sx = r.left + r.width / 2; sy = r.top + r.height / 2; }
    if (view.cx == null) { view.cx = vbFit[0] + vbFit[2] / 2; view.cy = vbFit[1] + vbFit[3] / 2; }
    var p0 = s2v(sx, sy);
    view.z = z; applyView();
    if (z > 1.0001) keepUnder(p0, sx, sy);
  }
  function el(tag, at) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); return e; }
  var live = null;
  function drawOverlay() {
    var g = $('#fover'); while (g.firstChild) g.removeChild(g.firstChild);
    var k = 1 / view.z;
    var b = bounds(last || []);
    if (b[1] < -0.5 || b[0] < -0.5 || b[2] > D.W + 0.5 || b[3] > D.H + 0.5)       // いつもの札ロゴの大きさ（188×200mm）
      g.appendChild(el('rect', { x: 0, y: 0, width: D.W, height: D.H, fill: 'none', stroke: '#999', 'stroke-width': 0.8 * k, 'stroke-dasharray': 5 * k + ' ' + 4 * k }));
    if (selLine >= 0 && st.lineObjs[selLine]) {
      g.appendChild(el('path', { d: eng.toD(eng.lineGeom(st.lineObjs[selLine])), fill: 'rgba(255,59,48,.75)', stroke: '#ff3b30', 'stroke-width': 2.5 * k }));
    }
    if (hiStroke >= 0 && st.strokes[hiStroke]) {
      var hs = st.strokes[hiStroke];
      if (hs.mode === 'smooth') g.appendChild(el('polygon', { points: hs.lasso.map(function (p) { return p.join(','); }).join(' '), fill: 'rgba(0,170,100,.18)', stroke: '#00a060', 'stroke-width': 2 * k }));
      else g.appendChild(el('path', { d: eng.toD(eng.strokeGeom(hs)), fill: 'rgba(255,59,48,.6)', stroke: '#ff3b30', 'stroke-width': 1.5 * k }));
    }
    if (drag && drag.kind === 'knot') {
      var kg = eng.knotGeom(effState(), effQuads(st));
      g.appendChild(el('path', { d: eng.toD(kg.ink), fill: 'rgba(255,59,48,.55)' }));
    }
    if (live && live.pts.length && live.mode === 'smooth') {
      g.appendChild(el('polygon', { points: live.pts.map(function (p) { return p.join(','); }).join(' '), fill: 'rgba(0,170,100,.12)', stroke: '#00a060', 'stroke-width': 1.5 * k, 'stroke-dasharray': 4 * k + ' ' + 3 * k }));
    } else if (live && live.pts.length) {
      var c = live.mode === 'erase' ? 'rgba(255,60,40,.55)' : 'rgba(0,120,255,.55)';
      g.appendChild(el('polyline', { points: live.pts.map(function (p) { return p.join(','); }).join(' '), fill: 'none',
        stroke: c, 'stroke-width': live.size, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      if (live.snapA) g.appendChild(el('circle', { cx: live.snapA[0], cy: live.snapA[1], r: 4 * k, fill: 'none', stroke: '#00a060', 'stroke-width': 1.5 * k }));
    }
    if ($('#fhandles').checked && st.mode !== 'orig' && tool === 'none') {
      var Q = effQuads(st);
      ['L', 'R'].forEach(function (t) {
        var q = Q[t];
        g.appendChild(el('polygon', { points: q.map(function (p) { return p.join(','); }).join(' '), fill: 'none', stroke: '#ff5a3c', 'stroke-width': 1.2 * k, 'stroke-dasharray': 4 * k + ' ' + 3 * k }));
        q.forEach(function (p, i) { g.appendChild(el('circle', { cx: p[0], cy: p[1], r: 7 * k, class: 'hd', 'stroke-width': 1.6 * k, 'data-h': t + i })); });
        var cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
        g.appendChild(el('circle', { cx: cx, cy: cy, r: 14 * k, class: 'hc-hit', 'data-h': t + 'c' }));
        g.appendChild(el('path', { d: 'M' + (cx - 10 * k) + ' ' + cy + 'H' + (cx + 10 * k) + 'M' + cx + ' ' + (cy - 10 * k) + 'V' + (cy + 10 * k), class: 'hc', 'stroke-width': 2.2 * k, 'data-h': t + 'c' }));
      });
    }
  }

  /* ---------- ペンの処理：手ぶれ補正・なめらか化・線のつなぎ ---------- */
  function num(id) { return parseFloat($('#' + id).value); }
  function rdp(pts, eps) {                 // 点を間引く（形は保つ）
    if (pts.length < 3) return pts.slice();
    var keep = new Array(pts.length).fill(false); keep[0] = keep[pts.length - 1] = true;
    (function rec(a, b) {
      var ax = pts[a][0], ay = pts[a][1], bx = pts[b][0], by = pts[b][1], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9, md = 0, mi = -1;
      for (var i = a + 1; i < b; i++) { var d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L; if (d > md) { md = d; mi = i; } }
      if (md > eps && mi > 0) { keep[mi] = true; rec(a, mi); rec(mi, b); }
    })(0, pts.length - 1);
    return pts.filter(function (p, i) { return keep[i]; });
  }
  function chaikin(pts, n) {               // 角をなめらかに
    for (var k = 0; k < n; k++) {
      if (pts.length < 3) return pts;
      var o = [pts[0]];
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      o.push(pts[pts.length - 1]); pts = o;
    }
    return pts;
  }
  // つなぐ先の候補：いまの絵の輪郭の点と、ペンの線の端
  function snapCandidates(exclude) {
    var c = [];
    var src = (activeLayer !== 'all' && last && last.layers && last.layers[activeLayer]) || last || [];
    src.forEach(function (p) { for (var i = 0; i < p.length; i += 2) c.push([p[i].X / SC, p[i].Y / SC]); });
    st.strokes.forEach(function (s) { if (s !== exclude && s.mode === 'draw' && s.pts.length && (s.layer || 'all') === activeLayer) { c.push(s.pts[0]); c.push(s.pts[s.pts.length - 1]); } });
    return c;
  }
  function inInk(p) {
    var n = 0, P = { X: Math.round(p[0] * SC), Y: Math.round(p[1] * SC) };
    ((activeLayer !== 'all' && last && last.layers && last.layers[activeLayer]) || last || []).forEach(function (path) { if (CL.Clipper.PointInPolygon(P, path) !== 0) n++; });
    return n % 2 === 1;
  }
  function nearest(p, cands, maxD) {
    var best = null, bd = maxD * maxD;
    for (var i = 0; i < cands.length; i++) { var dx = cands[i][0] - p[0], dy = cands[i][1] - p[1], d = dx * dx + dy * dy; if (d < bd) { bd = d; best = cands[i]; } }
    return best;
  }
  function toLocal(s) {                   // 移動・拡大した追加レイヤーには、元の座標に戻して記録する
    var c = cust(s.layer); if (!c) return;
    var xf = c.xf, f = eng.invFn(xf), k = (xf.scale || 100) / 100;
    if (s.pts && s.pts.length) s.pts = s.pts.map(function (p) { var r = f(p[0], p[1]); return [+r[0].toFixed(2), +r[1].toFixed(2)]; });
    if (s.lasso) s.lasso = s.lasso.map(function (p) { return f(p[0], p[1]); });
    if (s.size) s.size = s.size / k;
    if (s.strength) s.strength = s.strength / k;
    if (s.tin) s.tin /= k; if (s.tout) s.tout /= k;
  }
  function finishStroke(s) {
    var pts = s.pts;
    if ($('#fstraight').checked && pts.length > 1) pts = [pts[0], pts[pts.length - 1]];
    else if (pts.length > 2) { pts = chaikin(rdp(pts, 0.25 + num('fsmooth') / 100 * 0.9), 2); }
    var size = s.size, tin = num('ftin') / MM, tout = num('ftout') / MM;
    if ($('#fsnap').checked && s.mode === 'draw' && pts.length > 1) {
      var cands = snapCandidates(null), dmax = num('fsnapD') / MM + size / 2;
      [0, 1].forEach(function (end) {
        var idx = end ? pts.length - 1 : 0, p = pts[idx];
        if (inInk(p)) return;                            // もう絵の上にある端はそのまま
        var q = nearest(p, cands, dmax);
        if (!q) return;
        var dx = q[0] - p[0], dy = q[1] - p[1];
        // 端から少しの長さだけ、なだらかにずらして相手に寄せる（折れ曲がらないように）
        var L = 0, span = Math.max(dmax * 3, 8);
        for (var k = 0; k < pts.length; k++) {
          var j = end ? pts.length - 1 - k : k;
          if (k > 0) { var pj = end ? pts[j + 1] : pts[j - 1]; L += Math.hypot(pts[j][0] - pj[0], pts[j][1] - pj[1]); }
          if (L > span) break;
          var w = 1 - L / span; w = w * w * (3 - 2 * w);
          pts[j] = [pts[j][0] + dx * w, pts[j][1] + dy * w];
        }
        // 相手の中へ少し入れて、すき間なく重ねる
        var a = pts[end ? pts.length - 2 : 1] || pts[idx], tx = q[0] - a[0], ty = q[1] - a[1], tl = Math.hypot(tx, ty) || 1;
        var ext = [q[0] + tx / tl * size * 0.35, q[1] + ty / tl * size * 0.35];
        if (end) pts.push(ext); else pts.unshift(ext);
        if (end) tout = 0; else tin = 0;                 // つないだ側は細くしない
      });
    }
    var o = { mode: s.mode === 'line' ? 'draw' : s.mode, size: size, pts: pts.map(function (p) { return [+p[0].toFixed(2), +p[1].toFixed(2)]; }) };
    if (s.mode === 'draw' && $('#fpenRing').checked) o.ring = true;
    if (s.mode === 'line') { o.tinF = 0.42; o.toutF = 0.42; } else if (s.mode === 'draw') { o.tin = tin; o.tout = tout; }
    return o;
  }

  /* ---------- プレビューでの操作 ---------- */
  var svg = $('#fsvg');
  function pt(e) { var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; var r = p.matrixTransform(svg.getScreenCTM().inverse()); return [+r.x.toFixed(2), +r.y.toFixed(2)]; }
  function ptPerPx() { var r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal; return vb && r.width ? Math.max(vb.width / r.width, vb.height / r.height) : 1; }
  function pickLine(p) {                 // 線の上（中）か、画面で 12px 以内の線を選ぶ
    var best = -1, bd = Math.pow(12 * ptPerPx(), 2), P = { X: Math.round(p[0] * SC), Y: Math.round(p[1] * SC) };
    st.lineObjs.forEach(function (o, i) {
      if (o.on === false) return;
      eng.lineGeom(o).forEach(function (path) {
        if (CL.Clipper.PointInPolygon(P, path) !== 0) { bd = -1; best = i; return; }
        for (var k = 0; k < path.length; k++) {
          var a = path[k], b = path[(k + 1) % path.length], ax = a.X / SC, ay = a.Y / SC, dx = b.X / SC - ax, dy = b.Y / SC - ay, L2 = dx * dx + dy * dy || 1e-9;
          var t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / L2)), ex = ax + t * dx - p[0], ey = ay + t * dy - p[1], d = ex * ex + ey * ey;
          if (d < bd) { bd = d; best = i; }
        }
      });
    });
    return best;
  }
  function inQuad(q, p) {
    var c = false;
    for (var i = 0, j = 3; i < 4; j = i++) { var a = q[i], b = q[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; }
    return c;
  }
  var drag = null, ptrs = {}, pinch = null, spaceDown = false;
  document.addEventListener('keydown', function (e) { if (e.code === 'Space' && !$('#fuda').hidden && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') { spaceDown = true; svg.classList.add('tool-pan'); e.preventDefault(); } });
  document.addEventListener('keyup', function (e) { if (e.code === 'Space') { spaceDown = false; svg.classList.toggle('tool-pan', tool === 'pan'); } });
  function startPinch() {
    var ids = Object.keys(ptrs); if (ids.length < 2) return;
    var a = ptrs[ids[0]], b = ptrs[ids[1]];
    var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    if (view.cx == null) { view.cx = vbFit[0] + vbFit[2] / 2; view.cy = vbFit[1] + vbFit[3] / 2; }
    pinch = { d0: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, z0: view.z, p0: s2v(mx, my) };
    if (live) live = null;
    if (drag && drag.kind !== 'pan') { if (hist.length) st = hist.pop(); }
    drag = null; drawOverlay();
  }
  svg.addEventListener('pointerdown', function (e) {
    ptrs[e.pointerId] = [e.clientX, e.clientY];
    if (Object.keys(ptrs).length >= 2) { e.preventDefault(); startPinch(); return; }
    var h = e.target.getAttribute && e.target.getAttribute('data-h'), p = pt(e);
    if (e.button === 1 || tool === 'pan' || spaceDown) {          // 表示を動かす（手のひら・中ボタン・スペースを押しながら）
      e.preventDefault(); svg.setPointerCapture(e.pointerId);
      if (view.cx == null) { view.cx = vbFit[0] + vbFit[2] / 2; view.cy = vbFit[1] + vbFit[3] / 2; }
      drag = { kind: 'pan', p0: p }; return;
    }
    if (!h && tool === 'none' && $('#fhandles').checked && st.mode !== 'orig') {   // 札そのものをつかんで移動
      var EQ = effQuads(st); h = inQuad(EQ.R, p) ? 'Rc' : (inQuad(EQ.L, p) ? 'Lc' : null);
    }
    if (!h && tool === 'none') {                     // 何もない所をつかむと表示が動く
      e.preventDefault(); svg.setPointerCapture(e.pointerId);
      if (view.cx == null) { view.cx = vbFit[0] + vbFit[2] / 2; view.cy = vbFit[1] + vbFit[3] / 2; }
      drag = { kind: 'pan', p0: p }; svg.classList.add('panning'); return;
    }
    if (h && st.mode !== 'orig' && tool === 'none') {
      e.preventDefault(); svg.setPointerCapture(e.pointerId);
      commit(); drag = { kind: 'quad', t: h[0], i: h[1], p0: p, q0: clone(st.quads[h[0]]), xf: st.xf[h[0]] }; return;
    }
    if (tool === 'mvline') {
      var i = pickLine(p); if (i < 0) { say('近くに揺れ線がありません。線の上を押してください。'); return; }
      e.preventDefault(); svg.setPointerCapture(e.pointerId);
      commit(); selLine = i; var o = st.lineObjs[i]; drag = { kind: 'line', i: i, p0: p, dx0: o.dx || 0, dy0: o.dy || 0 }; renderLineList(); syncUI(); drawOverlay(); return;
    }
    if (tool === 'mvlayer') {
      var cl = cust(activeLayer);
      e.preventDefault(); svg.setPointerCapture(e.pointerId); commit();
      if (cl) { drag = { kind: 'cust', c: cl, p0: p, dx0: cl.xf.dx || 0, dy0: cl.xf.dy || 0 }; return; }
      if (activeLayer === 'knot') { drag = { kind: 'knot', p0: p, dx0: st.knotXf.dx || 0, dy0: st.knotXf.dy || 0 }; drawOverlay(); return; }
      if (activeLayer === 'tagL' || activeLayer === 'tagR') { var tk = activeLayer.slice(-1); drag = { kind: 'quad', t: tk, i: 'c', p0: p, q0: clone(st.quads[tk]), xf: st.xf[tk] }; return; }
      if (activeLayer === 'textL' || activeLayer === 'textR') { var tx = st.textXf[activeLayer.slice(-1)]; drag = { kind: 'text', x: tx, p0: p, dx0: tx.dx || 0, dy0: tx.dy || 0 }; return; }
      if (activeLayer === 'lines') { drag = { kind: 'alllines', p0: p, d0: st.lineObjs.map(function (o) { return [o.dx || 0, o.dy || 0]; }) }; return; }
      hist.pop(); say('動かすレイヤーを「編集するレイヤー」で選んでください。'); drag = null; return;
    }
    if (tool === 'mvknot') {
      if (!st.knot) { say('結びが非表示です。'); return; }
      e.preventDefault(); svg.setPointerCapture(e.pointerId);
      commit(); drag = { kind: 'knot', p0: p, dx0: st.knotXf.dx || 0, dy0: st.knotXf.dy || 0 }; drawOverlay(); return;
    }
    if (tool === 'none') return;
    e.preventDefault(); svg.setPointerCapture(e.pointerId);
    live = { mode: tool, size: num('fbrush') / MM, pts: [p], sm: p };
    if (tool === 'draw' && $('#fsnap').checked) live.snapA = nearest(p, snapCandidates(null), num('fsnapD') / MM + live.size / 2);
    drawOverlay();
  });
  svg.addEventListener('pointermove', function (e) {
    if (ptrs[e.pointerId]) ptrs[e.pointerId] = [e.clientX, e.clientY];
    if (pinch) {
      var ids = Object.keys(ptrs); if (ids.length < 2) return;
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      view.z = Math.max(1, Math.min(16, pinch.z0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d0)); applyView();
      keepUnder(pinch.p0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); return;
    }
    if (drag && drag.kind === 'pan') { keepUnder(drag.p0, e.clientX, e.clientY); return; }
    var p = pt(e);
    if (drag) {
      var dx = p[0] - drag.p0[0], dy = p[1] - drag.p0[1];
      if (drag.kind === 'quad') {
        var an = -drag.xf.rot * Math.PI / 180, kk = 100 / drag.xf.scale, ux = (dx * Math.cos(an) - dy * Math.sin(an)) * kk, uy = (dx * Math.sin(an) + dy * Math.cos(an)) * kk;
        var q = clone(drag.q0);
        if (drag.i === 'c') q = q.map(function (r2) { return [r2[0] + ux, r2[1] + uy]; }); else { q[+drag.i][0] += ux; q[+drag.i][1] += uy; }
        st.quads[drag.t] = q;
      } else if (drag.kind === 'line') { st.lineObjs[drag.i].dx = drag.dx0 + dx; st.lineObjs[drag.i].dy = drag.dy0 + dy; }
      else if (drag.kind === 'knot') { st.knotXf.dx = drag.dx0 + dx; st.knotXf.dy = drag.dy0 + dy; }
      else if (drag.kind === 'text') { drag.x.dx = drag.dx0 + dx; drag.x.dy = drag.dy0 + dy; schedule(); }
      else if (drag.kind === 'cust') { drag.c.xf.dx = drag.dx0 + dx; drag.c.xf.dy = drag.dy0 + dy; schedule(); }
      else if (drag.kind === 'alllines') { st.lineObjs.forEach(function (o, j) { var d0 = drag.d0[j] || [0, 0]; o.dx = d0[0] + dx; o.dy = d0[1] + dy; }); schedule(); }
      drawOverlay(); return;
    }
    if (!live) return;
    if (live.mode === 'smooth') {             // 囲みは補正なしでそのまま
      var l0 = live.pts[live.pts.length - 1];
      if (Math.hypot(p[0] - l0[0], p[1] - l0[1]) > 0.6 / view.z) { live.pts.push(p); drawOverlay(); }
      return;
    }
    // 手ぶれ補正：ペン先を少し遅れて追いかける
    var f = 1 - Math.min(0.9, num('fsmooth') / 100) * 0.85;
    live.sm = [live.sm[0] + (p[0] - live.sm[0]) * f, live.sm[1] + (p[1] - live.sm[1]) * f];
    var l = live.pts[live.pts.length - 1];
    if (Math.hypot(live.sm[0] - l[0], live.sm[1] - l[1]) > 0.5 / view.z) { live.pts.push(live.sm.slice()); drawOverlay(); }
  });
  function endPtr(e) {
    if (e) delete ptrs[e.pointerId];
    if (pinch) { if (Object.keys(ptrs).length < 2) pinch = null; return; }
    if (drag) { var k = drag.kind; drag = null; svg.classList.remove('panning'); if (k === 'pan') return; fut = []; schedule(true); if (k === 'line') syncUI(); return; }
    if (!live) return;
    if (live.mode === 'smooth') {
      var lp = live.pts; live = null;
      if (lp.length < 4) { drawOverlay(); return; }
      var sm = { mode: 'smooth', lasso: rdp(lp, 0.3 / view.z), strength: num('fsmStr') / MM, pts: [] }; if (activeLayer !== 'all') sm.layer = activeLayer;
      toLocal(sm);
      commit(); st.strokes.push(sm);
      say('囲んだ所をなめらかにしました。'); schedule(true); return;
    }
    if (e && e.type === 'pointerup') { var p = pt(e); live.pts.push(p); }
    commit();
    var s = finishStroke(live), mode = live.mode; live = null;
    if (mode === 'line') { st.lineObjs.push({ stroke: { pts: s.pts, size: s.size, tinF: s.tinF, toutF: s.toutF }, on: true, dx: 0, dy: 0, rot: 0, scale: 100 }); selLine = st.lineObjs.length - 1; }
    else { if (activeLayer !== 'all') s.layer = activeLayer; toLocal(s); st.strokes.push(s); }
    schedule(true);
  }
  svg.addEventListener('wheel', function (e) {
    e.preventDefault();
    zoomAt(view.z * Math.pow(1.0015, -e.deltaY * (e.deltaMode === 1 ? 30 : 1)), e.clientX, e.clientY);
  }, { passive: false });
  function setMax(on) {
    var sec = $('#fuda'); sec.classList.toggle('fmax', on); document.documentElement.classList.toggle('fmax-on', on);
    $('#fmaxBtn').textContent = on ? '全画面を閉じる（Esc）' : '全画面で編集';
    try {
      if (on && document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(function () {});
      if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    } catch (e) {}
    setTimeout(function () { applyView(); }, 60);
  }
  $('#fmaxBtn').addEventListener('click', function () { setMax(!$('#fuda').classList.contains('fmax')); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('#fuda').classList.contains('fmax')) setMax(false); });
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && $('#fuda').classList.contains('fmax')) setMax(false); });
  window.addEventListener('resize', function () { if (!$('#fuda').hidden) applyView(); });
  $$('#fzoom button').forEach(function (b) { b.addEventListener('click', function () {
    var z = b.dataset.z;
    if (z === 'fit') { view.z = 1; view.cx = null; applyView(); }
    else if (z === 'in') zoomAt(view.z * 1.5); else if (z === 'out') zoomAt(view.z / 1.5); else zoomAt(+z);
  }); });
  svg.addEventListener('pointerup', endPtr); svg.addEventListener('pointercancel', endPtr);

  /* ---------- ボタン類 ---------- */
  (function () {
    var sel = $('#fpreset');
    PRE.forEach(function (p) { var o = document.createElement('option'); o.value = p[0]; o.textContent = p[1]; sel.appendChild(o); });
    sel.addEventListener('change', function () { commit(); var keep = { color: st.color }; st = fresh(sel.value); st.color = keep.color; selLine = -1; schedule(true); say('「' + sel.options[sel.selectedIndex].text + '」から始めます。'); });
    var ks = $('#fknotType');
    [['cur', 'いまの結び（梅結び＋玉）']].concat(eng.knots.map(function (k) { return [k.id, k.id + ' ' + k.name]; })).forEach(function (k) {
      var o = document.createElement('option'); o.value = k[0]; o.textContent = k[1]; ks.appendChild(o);
    });
    ks.addEventListener('change', function () { commit(); st.knotType = ks.value; st.knotXf = { scale: 100, rot: 0, dx: 0, dy: 0 }; st.knot = true; schedule(true); });
    var sw = $('#fsw');
    [['紺', '#0032AD'], ['ティール', '#00A3AF'], ['白', '#FFFFFF'], ['藍', '#1E3550'], ['朱', '#D9442B'], ['墨', '#222222']].forEach(function (c) {
      var b = document.createElement('button'); b.type = 'button';
      var i = document.createElement('i'); i.style.background = c[1]; b.appendChild(i); b.appendChild(document.createTextNode(c[0]));
      b.addEventListener('click', function () { commit(); st.color = c[1]; schedule(true); });
      sw.appendChild(b);
    });
    ['fbrush', 'fsmooth', 'ftin', 'ftout', 'fsnapD', 'fsmStr'].forEach(function (id) {
      var r = $('#' + id), n = $('[data-ffor="' + id + '"]');
      r.addEventListener('input', function () { n.value = r.value; });
      n.addEventListener('change', function () { r.value = n.value; });
    });
  })();
  $$('#ftarget button').forEach(function (b) { b.addEventListener('click', function () { target = b.dataset.g; syncUI(); }); });
  $$('#ftop button').forEach(function (b) { b.addEventListener('click', function () { commit(); tags().forEach(function (t) {
    st.tags[t].top = b.dataset.v;
    if (b.dataset.v === 'yama' && st.tags[t].topSize < 0.1) st.tags[t].topSize = 0.38;
  }); schedule(true); }); });
  $$('#fdir button').forEach(function (b) { b.addEventListener('click', function () { commit(); tags().forEach(function (t) { st.tags[t].dir = b.dataset.v; }); schedule(true); }); });
  $$('[data-fchk]').forEach(function (c) { c.addEventListener('change', function () { commit(); tags().forEach(function (t) { st.tags[t][c.dataset.fchk] = c.checked; }); schedule(true); }); });
  $('#factiveSel').addEventListener('change', function (e) { setActive(e.target.value); });
  $('#flayAdd').addEventListener('click', function () { addLayer(null); });
  $('#ftextReset').addEventListener('click', function () { var t = textKey(); if (!t) return; commit(); st.textXf[t] = { scale: 100, rot: 0, dx: 0, dy: 0 }; schedule(true); });
  $('#flayDup').addEventListener('click', function () {
    if (activeLayer === 'all') { say('写したいレイヤーを「編集」で選んでから押してください。'); return; }
    addLayer(activeLayer);
  });
  $('#fcustName').addEventListener('change', function (e) { var c = cust(activeLayer); if (!c) return; commit(); c.name = e.target.value || c.name; fillActiveSel(); renderLayers(); renderStrokes(); syncUI(); try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (er) {} });
  $('#fdim').addEventListener('change', paintActive);
  $('#fknot').addEventListener('change', function (e) { commit(); st.knot = e.target.checked; schedule(true); });
  $('#feyelet').addEventListener('change', function (e) { commit(); st.eyelet = e.target.checked; schedule(true); });
  $('#fknotReset').addEventListener('click', function () { commit(); st.knotXf = { scale: 100, rot: 0, dx: 0, dy: 0 }; st.eyeY = 0.09; schedule(true); });
  $('#flineDup').addEventListener('click', function () {
    if (selLine < 0) return; commit();
    var o = clone(st.lineObjs[selLine]); o.dx = (o.dx || 0) + 8; o.dy = (o.dy || 0) + 8; o.copy = true; o.on = true;
    st.lineObjs.splice(selLine + 1, 0, o); selLine = selLine + 1; schedule(true); say('揺れ線を増やしました。ドラッグか数値で位置を決めてください。');
  });
  $('#flineDel').addEventListener('click', function () { if (selLine < 0) return; commit(); st.lineObjs.splice(selLine, 1); selLine = -1; schedule(true); });
  $('#flineReset').addEventListener('click', function () { if (selLine < 0) return; commit(); var o = st.lineObjs[selLine]; o.dx = 0; o.dy = 0; o.rot = 0; o.scale = 100; schedule(true); });
  $$('#ftool button').forEach(function (b) { b.addEventListener('click', function () {
    tool = b.dataset.t;
    svg.classList.toggle('tool', tool === 'draw' || tool === 'erase' || tool === 'line');
    svg.classList.toggle('tool-mv', tool === 'mvline' || tool === 'mvknot' || tool === 'mvlayer');
    svg.classList.toggle('tool-pan', tool === 'pan');
    if (tool === 'smooth') svg.classList.add('tool');
    if (tool === 'line') { $('#fbrush').value = Math.max(num('fbrush'), 3); $('[data-ffor="fbrush"]').value = $('#fbrush').value; }
    syncUI(); drawOverlay();
  }); });
  $('#fhandles').addEventListener('change', function (e) {
    svg.classList.toggle('handles', e.target.checked);
    if (e.target.checked && tool !== 'none') { tool = 'none'; svg.classList.remove('tool', 'tool-mv'); syncUI(); }
    drawOverlay();
  });
  $('#fquadReset').addEventListener('click', function () {
    commit(); tags().forEach(function (t) { st.quads[t] = clone(D.quads[t]); st.xf[t] = { scale: 100, rot: 0, dx: 0, dy: 0 }; }); schedule(true);
  });
  $('#fundo').addEventListener('click', function () { if (!hist.length) return; fut.push(clone(st)); st = hist.pop(); if (selLine >= st.lineObjs.length) selLine = -1; schedule(true); });
  $('#fredo').addEventListener('click', function () { if (!fut.length) return; hist.push(clone(st)); st = fut.pop(); if (selLine >= st.lineObjs.length) selLine = -1; schedule(true); });
  $('#fclear').addEventListener('click', function () { if (!st.strokes.length) return; commit(); st.strokes = []; schedule(true); say('ペン・消しゴム・なめらかにした所を、全部取り消しました。'); });
  $('#fcolor').addEventListener('input', function (e) { st.color = e.target.value.toUpperCase(); $('#fink').setAttribute('fill', st.color); $('#fcolorCode').textContent = st.color; });
  $('#fcolor').addEventListener('change', function () { commit(); schedule(true); });
  $$('#fbgSeg button').forEach(function (b) { b.addEventListener('click', function () {
    $('#fbg').setAttribute('fill', b.dataset.v); $$('#fbgSeg button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
  }); });
  document.addEventListener('keydown', function (e) {
    if ($('#fuda').hidden || !(e.ctrlKey || e.metaKey) || e.target.tagName === 'INPUT') return;
    if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); $('#fundo').click(); }
    if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); $('#fredo').click(); }
  });

  /* ---------- 保存・タオルへ ---------- */
  function fname() { return ($('#ffname').value || 'fuda_logo_custom').replace(/[\\/:*?"<>|]/g, '_').replace(/\.(svg|png)$/i, ''); }
  function ensure() { if (!last) run(); return last; }
  // はみ出しがあれば、その分だけデータの範囲を広げる（いつもの大きさ・位置はそのまま）
  function svgOut(paths, color, title) {
    var b = bounds(paths), s = eng.toSVG(paths, color, title);
    if (b[0] >= -0.5 && b[1] >= -0.5 && b[2] <= D.W + 0.5 && b[3] <= D.H + 0.5) return s;
    var m = 2, x = b[0] - m, y = b[1] - m, w = b[2] - b[0] + 2 * m, h = b[3] - b[1] + 2 * m;
    return s.replace(/width="[^"]+mm" height="[^"]+mm" viewBox="[^"]+"/, 'width="' + (w * MM).toFixed(2) + 'mm" height="' + (h * MM).toFixed(2) + 'mm" viewBox="' + [x, y, w, h].map(function (v) { return v.toFixed(2); }).join(' ') + '"');
  }
  $('#fsaveSvg').addEventListener('click', function () {
    if (!window.__saveFile) return;
    window.__saveFile(fname() + '.svg', svgOut(ensure(), st.color, '仲羽田青年会 札ロゴ（調整版）'), say);
  });
  $('#fsavePng').addEventListener('click', function () {
    if (!window.__saveFile) return;
    var txt = svgOut(ensure(), st.color), vb = txt.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number), px = 2000 / D.W, w = Math.round(vb[2] * px), h = Math.round(vb[3] * px);
    txt = txt.replace(/width="[^"]+mm" height="[^"]+mm"/, 'width="' + w + '" height="' + h + '"');
    var img = new Image(), url = URL.createObjectURL(new Blob([txt], { type: 'image/svg+xml' }));
    img.onload = function () {
      var c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0); URL.revokeObjectURL(url);
      c.toBlob(function (b) { window.__saveFile(fname() + '.png', b, say); }, 'image/png');
    };
    img.src = url;
  });
  $('#ftoKobo').addEventListener('click', function () {
    if (!window.__ftPost) return;
    window.__ftPost({ type: 'fudaTowel:logo', svg: svgOut(ensure(), st.color, '仲羽田青年会 札ロゴ（調整版）'), name: fname() });
    say('手ぬぐい工房のロゴ保管棚に送りました。');
  });
  function toTowel(paths, label) { var t = eng.forTowel(paths); window.__towelSetLogo(t.logo, t.sil, label, t.parts); return t; }
  $('#fuseTowel').addEventListener('click', function () {
    toTowel(ensure(), '調整した札');
    try { localStorage.setItem('towel_logo_custom', JSON.stringify(st)); } catch (e) {}
    say('作成ツールの札を、この調整版に替えました。');
    var tb = $('.tabs button[data-tab="ed"]'); if (tb) tb.click();
  });

  /* ---------- 開始 ---------- */
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && sv.tags && sv.quads) st = upgrade(sv); } catch (e) {}
  if (!st) st = fresh('cur');
  fillActiveSel(); renderLineList(); renderLayers(); renderStrokes(); renderCustomEdit(); renderTextEdit(); syncUI();
  try {
    var ts = JSON.parse(localStorage.getItem('towel_logo_custom') || 'null');
    if (ts && ts.tags && window.__towelSetLogo) { ts = upgrade(ts); var s2 = clone(ts); s2.quads = effQuads(ts); toTowel(eng.build(s2), '調整した札'); }
  } catch (e) {}
  window.__fudaShow = function () { schedule(true); };
  if (!$('#fuda').hidden) schedule(true);
})();
