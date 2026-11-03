/* これまでに作った図案を再現する設定 */
(function (root) {
  var R = 533.14 / 566.93, TEAL = '#00A3AF', WHITE = '#FFFFFF';
  var C_GAI = { bg: TEAL, pat: WHITE, logo: WHITE, win: WHITE };
  var C_WIN = { bg: TEAL, pat: WHITE, logo: TEAL, win: WHITE };
  function base(o) {
    return Object.assign({
      W: 340, H: 850, patScale: 1, patRot: 0, patDX: 0, patDY: 0,
      logoH: 200, logoX: 170, logoY: 425, logoRot: 0, style: 'gaikei', gap: 7, border: 0, twin: false,
      winR: 120, winDX: 0, winDY: 0, padX: 9, padY: 27, corner: 18,
      frame: false, frameInset: 9, frameW: 1.6, frameCorner: 12,
      fuchi: false, fuchiIn: 4.6, fuchiW: 1.9, obiSide: 'bottom', obiSize: 285,
      colors: Object.assign({}, C_GAI)
    }, o);
  }
  var T = { W: 340, H: 850, patRot: 0 }, Y = { W: 850, H: 340, patRot: 90 };
  function small(o, W, H) {
    var h = 110, w = h * R;
    return {
      s1: base(Object.assign({}, o, { logoH: h, logoX: W - 28 - w / 2, logoY: H - 28 - h / 2, gap: 10 })),
      s2: base(Object.assign({}, o, { style: 'maru', winR: h * 0.66, logoH: h * 0.92, logoX: W - 22 - h * 0.66, logoY: H - 22 - h * 0.66 + 2, winDY: -2, gap: 4.5, colors: Object.assign({}, C_WIN) })),
      s3: (function () {
        var ww = w * 1.12 + 10, hh = h * 1.2 + 4, x0 = W - 24 - ww, y0 = H - 24 - hh;
        return base(Object.assign({}, o, { style: 'fuda', logoH: h, logoX: x0 + ww / 2, logoY: y0 + hh / 2 + 2, winDY: -2,
          padX: (ww - w) / 2, padY: (hh - h) / 2, corner: 10, frame: true, frameInset: 5, frameW: 1.2, frameCorner: 7, gap: 4.5, colors: Object.assign({}, C_WIN) }));
      })()
    };
  }
  var st = small(T, 340, 850), sy = small(Y, 850, 340);
  var P = [];
  function add(id, label, group, cfg) { P.push({ id: id, label: label, group: group, cfg: cfg }); }
  add('towel_tate_A_gaikei', 'A 外形くり抜き・下寄せ', '縦 340×850', base(Object.assign({}, T, { logoH: 215, logoY: 850 - 45 - 107.5 })));
  add('towel_tate_B_marumado', 'B 丸窓', '縦 340×850', base(Object.assign({}, T, { style: 'maru', winR: 128, logoH: 196, logoY: 850 - 40 - 128 + 4, winDY: -4, gap: 6, colors: Object.assign({}, C_WIN) })));
  add('towel_tate_C_fudamado', 'C 札形の窓', '縦 340×850', base(Object.assign({}, T, { style: 'fuda', logoH: 232, logoY: 850 - 40 - 143 + 4, winDY: -4,
    padX: (236 - 232 * R) / 2, padY: (286 - 232) / 2, corner: 18, frame: true, frameInset: 9, frameW: 1.6, frameCorner: 12, gap: 6, colors: Object.assign({}, C_WIN) })));
  add('towel_tate_D_obi', 'D 下を無地の帯に', '縦 340×850', base(Object.assign({}, T, { style: 'obi', obiSide: 'bottom', obiSize: 285, logoH: 215, logoY: 565 + 142.5 + 6 })));
  add('towel_tate_E_chuou', 'E 中央に大きく・白フチ', '縦 340×850', base(Object.assign({}, T, { logoH: 270, logoY: 850 * 0.56, gap: 11, fuchi: true })));
  add('towel_tate_small1_gaikei', '右下に小さく・外形', '縦 340×850', st.s1);
  add('towel_tate_small2_marumado', '右下に小さく・丸窓', '縦 340×850', st.s2);
  add('towel_tate_small3_fudamado', '右下に小さく・札形の窓', '縦 340×850', st.s3);
  add('towel_yoko_Y1_gaikei_migi', 'Y1 外形くり抜き・右', '横 850×340', base(Object.assign({}, Y, { logoH: 262, logoX: 850 - 70 - 262 * R / 2, logoY: 170 })));
  [150, 200, 262, 300].forEach(function (h) {
    add('towel_yoko_Y1_h' + h + '_fuchi8', 'Y1 札' + h + 'mm・端8mm無地', '横 850×340（端8mm）', base(Object.assign({}, Y, { logoH: h, logoX: 850 - 60 - h * R / 2, logoY: 170, border: 8 })));
  });
  [150, 200].forEach(function (h) {
    add('towel_yoko_Y1_h' + h + '_migishita_fuchi8', 'Y1 札' + h + 'mm・右下・端8mm無地', '横 850×340（端8mm）', base(Object.assign({}, Y, { logoH: h, logoX: 850 - 28 - h * R / 2, logoY: 340 - 28 - h / 2, border: 8 })));
  });
  add('towel_yoko_Y2_marumado_migi', 'Y2 丸窓・右', '横 850×340', base(Object.assign({}, Y, { style: 'maru', winR: 138, logoH: 212, logoX: 850 - 40 - 138, logoY: 174, winDY: -4, gap: 6, colors: Object.assign({}, C_WIN) })));
  add('towel_yoko_Y3_migi_muji', 'Y3 右を無地の帯に', '横 850×340', base(Object.assign({}, Y, { style: 'obi', obiSide: 'right', obiSize: 300, logoH: 256, logoX: 850 - 150, logoY: 174 })));
  add('towel_yoko_Y4_chuou', 'Y4 中央・白フチ', '横 850×340', base(Object.assign({}, Y, { logoH: 286, logoX: 425, logoY: 172, gap: 11, fuchi: true })));
  add('towel_yoko_Y5_ryouhashi', 'Y5 両端に2つ', '横 850×340', base(Object.assign({}, Y, { logoH: 236, logoX: 50 + 236 * R / 2, logoY: 170, twin: true })));
  add('towel_yoko_small1_gaikei', '右下に小さく・外形', '横 850×340', sy.s1);
  add('towel_yoko_small2_marumado', '右下に小さく・丸窓', '横 850×340', sy.s2);
  add('towel_yoko_small3_fudamado', '右下に小さく・札形の窓', '横 850×340', sy.s3);
  add('tenugui_340x840', '手ぬぐい 340×840（外形くり抜き）', '手ぬぐい', base({ W: 340, H: 840, patDY: 5, logoH: 200, logoY: 840 - 45 - 100 }));
  root.TOWEL_PRESETS = P;
  root.TOWEL_BASE = base;
  if (typeof module !== 'undefined' && module.exports) module.exports = { P: P, base: base };
})(typeof window !== 'undefined' ? window : this);
