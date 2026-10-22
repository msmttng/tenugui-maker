# -*- coding: utf-8 -*-
"""
仲羽田（江戸角字）＆ 大小あられ 配置アプリのビルド。
app_template.html の /*__LIB__*/ に arare_shapes.json の粒形状を、
/*__EMBLEM__*/ に emblem_vector.json の丸紋「仲はねだ」ベクター輪郭を埋め込み、2種類のHTMLを作る。

  arare_app.html             … 単体で動く版（ダブルクリックでブラウザが開く。保存は通常のダウンロード）
  arare_app_artifact.html    … アーティファクト公開用

使い方:  python build_app.py
文字コード: すべて UTF-8 で読み書きする
"""
import json
from pathlib import Path

here = Path(__file__).resolve().parent
tpl = (here / "app_template.html").read_text(encoding="utf-8")
shapes = json.loads((here / "arare_shapes.json").read_text(encoding="utf-8"))["shapes"]
lib_js = "const LIB=" + json.dumps(shapes, separators=(",", ":")) + ";"

emblem_path = here / "emblem_vector.json"
if emblem_path.exists():
    emblem_data = json.loads(emblem_path.read_text(encoding="utf-8"))
    emblem_js = "const EMBLEM=" + json.dumps(emblem_data, separators=(",", ":")) + ";"
else:
    emblem_js = "const EMBLEM={loops:[]};"

body = tpl.replace("/*__LIB__*/", lib_js).replace("/*__EMBLEM__*/", emblem_js)

(here / "arare_app_artifact.html").write_text(body, encoding="utf-8")

standalone = (
    '<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
    "<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}"
    "body{margin:0}[hidden]{display:none!important}</style>\n</head>\n<body>\n"
    + body + "\n</body>\n</html>\n"
)
(here / "arare_app.html").write_text(standalone, encoding="utf-8")
print("built: arare_app.html, arare_app_artifact.html")
