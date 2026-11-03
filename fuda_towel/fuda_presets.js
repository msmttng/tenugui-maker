/* 札の調整ツール：最初の設定と、作った案（L1〜L6・S2〜S6） */
(function (root) {
  function baseTag(P) {
    return { top: 'flat', topSize: 0.3, rTop: 0.13, rBot: 0.13, rApex: 0.05, botCut: 0,
      dir: 'right', gap: +P.G.toFixed(2), thick: +P.B.toFixed(2), start: +P.start.toFixed(2), endRound: 1, showSide: true,
      hatch: false, hatchSp: 0.075, hatchW: 0.5, hatchEdge: 2.6,
      teri: false, teriPos: 0.05, teriW: 0.024, teriLen: 0.8,
      kousen: false, kousenW: 1, kousenPos: 0,
      rim: false, rimPos: 0.07, rimW: 0.022,
      roundAdd: 0, gapAdj: 0, thickAdj: 0 };
  }
  function presets(D) {
    var P = D.par;
    function st(mode, over) {
      var t = Object.assign(baseTag(P), over || {});
      return { mode: mode, tags: { L: Object.assign({}, t), R: Object.assign({}, t) }, quads: JSON.parse(JSON.stringify(D.quads)),
        knot: true, ring: +P.ring.toFixed(2), lines: D.lines.map(function () { return true; }), strokes: [], color: '#0032AD' };
    }
    return [
      ['cur', 'いまの札（採用版）を調整', st('cur')],
      ['orig', 'いまの札（形は変えず、消す・足すだけ）', st('orig')],
      ['L1', '描き直し案 L1 いまの光', st('param')],
      ['L2', '描き直し案 L2 右上から光', st('param', { dir: 'left' })],
      ['L3', '描き直し案 L3 へりの照り', st('param', { teri: true })],
      ['L4', '描き直し案 L4 光沢の筋', st('param', { kousen: true })],
      ['L5', '描き直し案 L5 影を線で', st('param', { hatch: true })],
      ['L6', '描き直し案 L6 正面から光', st('param', { dir: 'none', rim: true })],
      ['S2', '描き直し案 S2 角札', st('param', { rTop: 0.035, rBot: 0.035 })],
      ['S3', '描き直し案 S3 駒形', st('param', { top: 'yama', topSize: 0.38, rTop: 0.05, rApex: 0.05 })],
      ['S4', '描き直し案 S4 頭の角落とし', st('param', { top: 'kado', topSize: 0.28, rTop: 0.03 })],
      ['S5', '描き直し案 S5 頭が丸い', st('param', { top: 'maru', topSize: 0.42 })],
      ['S6', '描き直し案 S6 八角', st('param', { top: 'kado', topSize: 0.24, botCut: 0.12, rTop: 0.02, rBot: 0.02 })]
    ];
  }
  root.FUDA_PRESETS = presets;
  if (typeof module !== 'undefined' && module.exports) module.exports = presets;
})(typeof window !== 'undefined' ? window : this);
