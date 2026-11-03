# 札タオル図案（fuda_towel）

仲羽田青年会の札ロゴを入れたタオル・手ぬぐいの図案集と作成ツール。`index.html` をブラウザで開くと単体で動きます。手ぬぐい工房（`../arare_app.html`）の「② タオル → 🏷️ 札タオル図案」から画面内でも開けます。

| ファイル | 内容 |
|---|---|
| `index.html` | 画面（図案一覧・作成ツール・札の調整）。`?embedded=1&tab=ed&preset=ID` で開くと手ぬぐい工房と連携 |
| `engine.js` / `presets.js` / `towel_data.js` | タオル図案の生成エンジン・23案の設定・採用ロゴ（揺れ線B1）と柄のデータ |
| `fuda.js` / `fuda_data.js` / `fuda_presets.js` / `fuda_ui.js` | 札の調整（レイヤー・ペン・消しゴム・結び目10種・揺れ線） |
| `ui_fold.js` | 設定欄の折りたたみ |
| `vendor/` | clipper-lib 6.4.2・JSZip 3.10.1（オフラインでも動くよう同梱） |
| `svg/` `pdf/` `img/` `thumb/` `share/` `meta.json` | 図案一覧のデータ（実寸・アウトライン済み） |

- プリント方法の選択は `localStorage` の `towel_pm`（手ぬぐい工房と共通）。
- 手ぬぐい工房とのやり取りは `postMessage`：`fudaTowel:fabric`（図案SVG・W・H・地色）、`fudaTowel:logo`（札SVG）、`fudaTowel:pm`。
- 文字コードはすべて UTF-8（BOM なし）。
