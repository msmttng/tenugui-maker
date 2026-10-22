# -*- coding: utf-8 -*-
"""
大小あられ柄の画像から「あられ（白い粒）」をベクター化し、手ぬぐいサイズに継ぎ足して書き出す。

出力（--out のフォルダへ）:
  tenugui_arare_<W>x<H>.svg   … mm実寸。グループ Background_Navy（地色）/ Arare_Dots（粒）
  tenugui_arare_<W>x<H>.pdf   … 同内容のPDF（cairosvg がある場合のみ）
  tenugui_arare_<W>x<H>.ai    … Illustrator 8 形式。2レイヤー（Arare_Dots / Background_Navy）
  tenugui_arare_layers.jsx    … Illustratorで実行すると日本語名の2レイヤーで同じデータを作るスクリプト
  arare_shapes.json           … アプリ用の粒形状ライブラリ（--shapes 指定時）

処理の流れ:
  1. 画像のR成分を8倍に拡大・平滑化 → 大津の二値化で白い粒を抽出
  2. 画像の幅を布の幅(mm)に合わせ、丈が足りない分は同じ柄を縦に継ぎ足す
     継ぎ目では途中で切れた粒を削除し、元柄の粒を元柄と同じ密度・間隔で並べ直して埋める
  3. 粒の輪郭を等間隔の点に間引き、Catmull-Rom → 3次ベジェで滑らかな閉曲線にする

必要: Python 3.9+, numpy, opencv-python, scipy（PDFも出すなら cairosvg）
使い方:
  python arare_trace.py daishou_arare_source.png --width 350 --height 900 --out out --shapes
文字コード: 出力はすべて UTF-8（.jsx は BOM付きUTF-8、.ai はASCII）。
"""
import argparse, json, re
from pathlib import Path
import numpy as np
import cv2

S = 8  # 拡大倍率（輪郭を滑らかにするため）


def trace(img_path, W_MM, H_MM, seed=7):
    rng = np.random.default_rng(seed)
    src = cv2.imread(str(img_path))
    g = src[:, :, 2].astype(np.float32)                    # 白い粒はR成分が高く、紺地は低い
    h, w = g.shape
    mmpp = W_MM / w
    k = mmpp / S
    up = cv2.GaussianBlur(cv2.resize(g, (w * S, h * S), interpolation=cv2.INTER_CUBIC), (0, 0), S * 0.6)
    _, m = cv2.threshold(up.astype(np.uint8), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    H, Wp = m.shape
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    min_area = (1.2 / mmpp * S) ** 2                       # 1.2mm角未満のゴミは捨てる
    keep = [i for i in range(1, n) if st[i][4] >= min_area]
    top = np.zeros_like(m); bot = np.zeros_like(m); lib = []
    for i in keep:
        x, y, bw, bh, a = st[i]
        comp = lab == i
        if y + bh < H: top[comp] = 255                    # 下端で切れた粒を除いた版
        if y > 0: bot[comp] = 255                         # 上端で切れた粒を除いた版
        if x > 0 and y > 0 and x + bw < Wp and y + bh < H:
            lib.append((lab[y:y + bh, x:x + bw] == i).astype(np.uint8) * 255)
    need = int(np.ceil(H_MM / mmpp * S))
    t0 = top.copy()                                       # 1枚目: 布の上端の切れ粒は残す
    t1 = cv2.bitwise_and(top, bot)                        # 2枚目以降: 上下とも切れ粒を除く
    reps = int(np.ceil(need / H)) + 1
    comp_mask = np.vstack([t0] + [t1] * reps)[:need].copy()

    # 元柄の密度と粒間隔を測る
    cov = (m > 0).mean()
    from scipy.spatial import cKDTree
    cent = np.array([(st[i][0] + st[i][2] / 2, st[i][1] + st[i][3] / 2, np.sqrt(st[i][4] / np.pi)) for i in keep])
    dd, ii = cKDTree(cent[:, :2]).query(cent[:, :2], k=2)
    edge = dd[:, 1] - cent[:, 2] - cent[ii[:, 1], 2]
    gap = int(max(np.percentile(edge, 25), 1.5 / mmpp * S))
    ker = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * gap + 1, 2 * gap + 1))

    # 継ぎ目を元柄の粒で埋める（帯の被覆率が元柄に達するまで）
    band = int(9 / mmpp * S)
    seam = H
    while seam < need:
        ya_, yb_ = seam - band, min(need, seam + band)
        for _ in range(20000):
            if (comp_mask[ya_:yb_] > 0).mean() >= cov: break
            b = lib[rng.integers(len(lib))]
            bh, bw = b.shape
            cy = int(seam + rng.integers(-band, band)); cx = int(rng.integers(0, Wp - bw))
            y0 = cy - bh // 2
            if y0 < 0 or y0 + bh > need: continue
            ya, yb, xa, xb = max(0, y0 - gap), min(need, y0 + bh + gap), max(0, cx - gap), min(Wp, cx + bw + gap)
            region = comp_mask[ya:yb, xa:xb]
            stamp = np.zeros_like(region)
            stamp[y0 - ya:y0 - ya + bh, cx - xa:cx - xa + bw] = b
            if np.any(cv2.bitwise_and(cv2.dilate(stamp, ker), region)): continue
            comp_mask[ya:yb, xa:xb] = cv2.bitwise_or(region, stamp)
        seam += H

    # 輪郭 → ベジェ
    cnts, _ = cv2.findContours(comp_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    dots = []   # 各粒: [(x,y) 始点, [(c1x,c1y,c2x,c2y,px,py), ...]]
    for c in cnts:
        if cv2.contourArea(c) < min_area: continue
        pts = c[:, 0, :].astype(np.float64)
        nn = max(8, int(cv2.arcLength(c, True) / (S * 1.5)))
        p = pts[np.linspace(0, len(pts), nn, endpoint=False).astype(int)] * k
        segs = []
        for i in range(nn):
            p0, p1, p2, p3 = p[i - 1], p[i], p[(i + 1) % nn], p[(i + 2) % nn]
            c1 = p1 + (p2 - p0) / 6; c2 = p2 - (p3 - p1) / 6
            segs.append((c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]))
        dots.append(((p[0][0], p[0][1]), segs))
    return dots, src, lab, st, keep, mmpp, k


def write_svg(path, dots, W, H, bg="#183574", fg="#ffffff"):
    f = lambda v: f"{v:.2f}"
    out = [f'<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="{W}mm" height="{H}mm" viewBox="0 0 {W} {H}">',
           f'<g id="Background_Navy"><rect width="{W}" height="{H}" fill="{bg}"/></g>', f'<g id="Arare_Dots" fill="{fg}">']
    for (sx, sy), segs in dots:
        d = f"M{f(sx)},{f(sy)}" + "".join(f"C{f(a)},{f(b)} {f(c)},{f(e)} {f(g)},{f(h)}" for a, b, c, e, g, h in segs)
        out.append(f'<path d="{d}Z"/>')
    out += ["</g>", "</svg>"]
    Path(path).write_text("\n".join(out) + "\n", encoding="utf-8")


def write_ai(path, dots, W, H, bg_cmyk=(1, .85, .2, .15)):
    """Illustrator 8 形式（PostScriptベース）。最新Illustratorで開くと変換されて開く。"""
    MM = 72 / 25.4; Wp, Hp = W * MM, H * MM
    P = lambda x, y: f"{x * MM:.3f} {(H - y) * MM:.3f}"   # mm（左上原点）→ pt（左下原点）
    L = ["%!PS-Adobe-3.0 ", "%%Creator: Adobe Illustrator(R) 8.0", "%%AI8_CreatorVersion: 8.0", "%%For: (arare) ()",
         f"%%Title: ({Path(path).name})", f"%%BoundingBox: 0 0 {int(Wp + 1)} {int(Hp + 1)}",
         f"%%HiResBoundingBox: 0 0 {Wp:.4f} {Hp:.4f}", "%%DocumentProcessColors: Cyan Magenta Yellow Black",
         "%AI5_FileFormat 4.0", "%AI3_ColorUsage: Color", "%AI7_ImageSettings: 0", "%%CMYKProcessColor: 1 1 1 1 ([Registration])",
         f"%AI3_TemplateBox: {Wp/2:.3f} {Hp/2:.3f} {Wp/2:.3f} {Hp/2:.3f}", f"%AI3_TileBox: 0 0 {Wp:.3f} {Hp:.3f}",
         "%AI3_DocumentPreview: None", f"%AI5_ArtSize: {Wp:.4f} {Hp:.4f}", "%AI5_RulerUnits: 1",
         "%AI5_ArtFlags: 0 0 0 1 0 0 1 0 0", "%AI5_TargetResolution: 800", "%AI5_NumLayers: 2", "%AI5_OpenViewLayers: 77",
         "%%PageOrigin:0 0", f"%%AI3_PaperRect:0 {Hp:.3f} {Wp:.3f} 0", f"%%AI3_Margin:0 {Hp:.3f} {Wp:.3f} 0",
         "%%EndComments", "%%BeginProlog", "%%EndProlog", "%%BeginSetup", "%%EndSetup",
         # レイヤー1（下）: 地色
         "%AI5_BeginLayer", "1 1 1 1 0 0 0 79 128 255 Lb", "(Background_Navy) Ln", "0 A", "0 O",
         " ".join(str(v) for v in bg_cmyk) + " k", "0 R", "0 i 0 J 0 j 1 w 4 M []0 d",
         P(0, 0) + " m", P(W, 0) + " L", P(W, H) + " L", P(0, H) + " L", P(0, 0) + " L", "f", "LB", "%AI5_EndLayer--",
         # レイヤー2（上）: あられ
         "%AI5_BeginLayer", "1 1 1 1 0 0 1 255 79 79 Lb", "(Arare_Dots) Ln", "0 A", "0 O", "0 0 0 0 k", "0 R",
         "0 i 0 J 0 j 1 w 4 M []0 d"]
    for (sx, sy), segs in dots:
        L.append(P(sx, sy) + " m")
        L += [f"{P(a, b)} {P(c, e)} {P(g, h)} c" for a, b, c, e, g, h in segs]
        L.append("f")
    L += ["LB", "%AI5_EndLayer--", "%%PageTrailer", "gsave annotatepage grestore showpage", "%%Trailer", "%%EOF"]
    Path(path).write_text("\r\n".join(L) + "\r\n", encoding="ascii", newline="")


def write_jsx(path, dots, W, H):
    """Illustratorで実行するスクリプト。各アンカーの [x, y, 左ハンドルx, y, 右ハンドルx, y]（mm）を埋め込む。"""
    data = []
    for (sx, sy), segs in dots:
        n = len(segs); pts = []
        for j in range(n):
            a = (sx, sy) if j == 0 else segs[j - 1][4:6]
            pts.append([round(v, 2) for v in (a[0], a[1], segs[j - 1][2], segs[j - 1][3], segs[j][0], segs[j][1])])
        data.append(pts)
    js = f"""// 大小あられ 手ぬぐい {W}x{H}mm — Illustrator用スクリプト（UTF-8 BOM付き）
// 使い方：Illustrator → ファイル → スクリプト → その他のスクリプト… でこのファイルを選ぶ
#target illustrator
(function(){{
var MM = 72/25.4, W = {W}, H = {H};
var DOTS = {json.dumps(data, separators=(',', ':'))};
app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
var doc = app.documents.add(DocumentColorSpace.CMYK, W*MM, H*MM);
var ab = doc.artboards[0].artboardRect, L = ab[0], T = ab[1];
function P(x, y){{ return [L + x*MM, T - y*MM]; }}
function cmyk(c,m,y,k){{ var o = new CMYKColor(); o.cyan=c; o.magenta=m; o.yellow=y; o.black=k; return o; }}
var bg = doc.layers[0]; bg.name = "地色_紺";
var r = bg.pathItems.rectangle(T, L, W*MM, H*MM); r.filled = true; r.fillColor = cmyk(100,85,20,15); r.stroked = false;
var lay = doc.layers.add(); lay.name = "大小あられ"; var white = cmyk(0,0,0,0);
for (var i = 0; i < DOTS.length; i++) {{
  var d = DOTS[i], anchors = [];
  for (var j = 0; j < d.length; j++) anchors.push(P(d[j][0], d[j][1]));
  var p = lay.pathItems.add(); p.setEntirePath(anchors);
  for (var j = 0; j < d.length; j++) {{ var pp = p.pathPoints[j];
    pp.leftDirection = P(d[j][2], d[j][3]); pp.rightDirection = P(d[j][4], d[j][5]); pp.pointType = PointType.SMOOTH; }}
  p.closed = true; p.filled = true; p.fillColor = white; p.stroked = false;
}}
app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
alert("完了：大小あられ " + DOTS.length + " 粒");
}})();
"""
    Path(path).write_text(js, encoding="utf-8-sig")


def write_shapes(path, lab, st, keep, mmpp, k_unused=None, n_pick=160, seed=1):
    """アプリ用の粒形状ライブラリ（直径4mm以上の丸ごと見えている粒から n_pick 個）。"""
    shapes, diams = [], []
    H, W = lab.shape
    for i in keep:
        x, y, bw, bh, a = st[i]
        if x == 0 or y == 0 or x + bw >= W or y + bh >= H: continue
        comp = (lab[y:y + bh, x:x + bw] == i).astype(np.uint8)
        cs, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        c = max(cs, key=cv2.contourArea)[:, 0, :].astype(np.float64) + (x, y)
        mo = cv2.moments(c.astype(np.float32)); A = mo["m00"]
        if A <= 0: continue
        cx, cy = mo["m10"] / A, mo["m01"] / A; r = np.sqrt(A / np.pi)
        d_mm = 2 * r * mmpp / S; diams.append(round(d_mm, 2))
        pts = np.vstack([c, c[:1]]); seg = np.hypot(*np.diff(pts, axis=0).T); cum = np.r_[0, np.cumsum(seg)]
        t = np.linspace(0, cum[-1], 16, endpoint=False)
        q = np.c_[(np.interp(t, cum, pts[:, 0]) - cx) / r, (np.interp(t, cum, pts[:, 1]) - cy) / r]
        if d_mm >= 4.0: shapes.append(np.round(q * 100).astype(int).flatten().tolist())
    rng = np.random.default_rng(seed)
    pick = rng.choice(len(shapes), min(n_pick, len(shapes)), replace=False)
    Path(path).write_text(json.dumps({"unit": "radius=100", "points_per_shape": 16,
                                      "shapes": [shapes[i] for i in pick], "diameters_mm": diams},
                                     ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("image"); ap.add_argument("--width", type=float, default=350); ap.add_argument("--height", type=float, default=900)
    ap.add_argument("--out", default="out"); ap.add_argument("--shapes", action="store_true")
    a = ap.parse_args()
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    W, H = a.width, a.height
    dots, src, lab, st, keep, mmpp, k = trace(a.image, W, H)
    base = out / f"tenugui_arare_{W:g}x{H:g}"
    write_svg(base.with_suffix(".svg"), dots, W, H)
    write_ai(base.with_suffix(".ai"), dots, W, H)
    write_jsx(out / "tenugui_arare_layers.jsx", dots, W, H)
    try:
        import cairosvg
        cairosvg.svg2pdf(url=str(base.with_suffix(".svg")), write_to=str(base.with_suffix(".pdf")))
    except ImportError:
        print("cairosvg がないため PDF は省略")
    if a.shapes:
        write_shapes(out / "arare_shapes.json", lab, st, keep, mmpp)
    print(f"{len(dots)} dots -> {out}")
