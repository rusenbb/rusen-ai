"""Ruşen Birben marka görsellerini üretir: avatar, X/YouTube banner'ları, thumbnail'ler.

Kullanım (repo kökünden):
    python3 personal-branding/render.py            # hepsi
    python3 personal-branding/render.py banner     # adı "banner" içerenler

Gereken: numpy, opencv-python, node + Playwright (repo zaten @playwright/test kullanıyor,
`npx playwright install chromium` bir kez). Fontlar Google Fonts'tan yüklenir (internet gerekir).
Çıktılar personal-branding/out/ altına PNG olarak yazılır (git'e girmez).
"""
import html
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent
SRC, OUT = ROOT / "src", ROOT / "out"

# ---- Palet -------------------------------------------------------------------------------
INK = "#0b0a09"       # koyu zemin (thumbnail, avatar)
CANDLE = "#f3e6c8"    # koyu zemindeki yazı
SEAL = "#d6402b"      # 光 mührü, vurgu kelimesi
SEAL_TEXT = "#fff1dc"  # mühür içindeki yazı
PAPER = "#ece5d6"     # banner kâğıt zemini
PAPER_INK = "#14120f"  # banner yazısı
MUTED_DARK = "#8a7d64"  # koyu zeminde ikincil yazı
MUTED_PAPER = "#6f6553"  # kâğıt zeminde ikincil yazı

HEAD = (
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@500;600;700'
    '&family=Noto+Serif+JP:wght@700&display=block">'
    "<style>*{box-sizing:border-box}body{margin:0;overflow:hidden}"
    "pre{margin:0;font-family:'Geist Mono',monospace;letter-spacing:0}"
    ".m{font-family:'Geist Mono',monospace}</style>"
)


def shot(name, body, w, h, scale=1, bg=INK):
    OUT.mkdir(exist_ok=True)
    page = OUT / f"{name}.html"
    page.write_text(
        f'<html><head><meta charset="utf-8">{HEAD}</head>'
        f'<body style="width:{w}px;height:{h}px;position:relative;background:{bg}">{body}</body></html>'
    )
    subprocess.run(["node", str(ROOT / "shot.mjs"), str(page), str(OUT / f"{name}.png"), str(w), str(h), str(scale)], check=True)
    page.unlink()
    print("ok", name)


# ---- 光: fırça darbesini ASCII ile doldur -----------------------------------------------
_g = cv2.imread(str(SRC / "hikari-brush.png"), 0)
_ink = (_g < 128).astype(np.uint8)
_ys, _xs = np.where(_ink > 0)
_ink = _ink[_ys.min() - 40:_ys.max() + 40, _xs.min() - 40:_xs.max() + 40]
_dist = cv2.distanceTransform(_ink, cv2.DIST_L2, 5)


def hikari(cols, size, color=CANDLE):
    """Kenarlar seyrek (.:-=+), gövde yoğun (*%#@) karakterlerle."""
    h, w = _ink.shape
    rows = int(cols * h / w * 0.6)
    cov = cv2.resize(_ink.astype(float), (cols, rows), interpolation=cv2.INTER_AREA)
    d = cv2.resize(_dist, (cols, rows), interpolation=cv2.INTER_AREA)
    d = d / np.percentile(d[cov > 0.5], 95)
    edge, core = ".:-=+", "*%#@"
    lines = []
    for r in range(rows):
        s = ""
        for c in range(cols):
            v = cov[r, c]
            if v < 0.18:
                s += " "
            elif v < 0.75:
                s += edge[min(4, int(v * 6))]
            else:
                s += html.escape(core[min(3, int(d[r, c] * 3.2))])
        lines.append(s)
    return f'<pre style="font:700 {size}px/{size}px \'Geist Mono\';color:{color}">' + "\n".join(lines) + "</pre>"


def seal(s, f):
    return (f'<div style="width:{s}px;height:{s}px;background:{SEAL};color:{SEAL_TEXT};display:flex;'
            f"align-items:center;justify-content:center;font:700 {f}px 'Noto Serif JP';border-radius:3px\">光</div>")


# ---- Avatar ------------------------------------------------------------------------------
def avatars():
    for name, bg, fg in [("avatar-ink", INK, CANDLE), ("avatar-seal", SEAL, SEAL_TEXT)]:
        a = hikari(62, 7.6, color=fg)
        shot(name, f'<div style="position:absolute;inset:0;display:flex;align-items:center;'
                   f'justify-content:center;padding:0 0 4px 14px">{a}</div>', 400, 400, 2, bg)


# ---- Banner: kâğıt + mürekkep figür + 光 mührü -------------------------------------------
# YouTube 2560x1440; her cihazda görünen güvenli alan 1546x423, ortada (x 507-2053, y 508-931).
FIGURES = {
    #          dosya                 X: yükseklik, x, y     YouTube: yükseklik, x, y
    "hokusai": ("hokusai-archer.webp", (470, 1000, 22), (412, 1640, 514)),
    "cajal": ("cajal-purkinje.webp", (480, 1080, 12), (412, 1660, 514)),
    "leonardo": ("leonardo-head.webp", (490, 1140, 6), (412, 1720, 514)),
}


def _banner(name, w, h, img, fig, tx, ty, ts):
    fh, fx, fy = fig
    shot(name, f'''<img src="{(SRC / img).as_uri()}" style="position:absolute;left:{fx}px;top:{fy}px;height:{fh}px">
<div style="position:absolute;left:{tx}px;top:{ty}px">
 <div style="display:flex;align-items:center;gap:{ts * .4}px;margin-bottom:{ts * .5}px">{seal(int(ts * .9), int(ts * .6))}
  <div class="m" style="font-weight:600;font-size:{ts * .36}px;letter-spacing:{ts * .08}px;color:{MUTED_PAPER}">RUŞEN BİRBEN</div></div>
 <div class="m" style="font-weight:700;font-size:{ts}px;line-height:1.05;letter-spacing:-{ts * .035}px;color:{PAPER_INK}">Hızlanmadan önce<br>anlamak.</div>
 <div class="m" style="margin-top:{ts * .45}px;font-weight:500;font-size:{ts * .3}px;letter-spacing:{ts * .06}px;color:{MUTED_PAPER}">YAPAY ZEKÂ · AÇIKLAMALAR · DÜŞÜNCELER</div></div>''',
         w, h, 1, PAPER)


def banners():
    for key, (img, xfig, yfig) in FIGURES.items():
        _banner(f"x-banner-{key}", 1500, 500, img, xfig, 120, 95, 56)
        _banner(f"youtube-banner-{key}", 2560, 1440, img, yfig, 560, 560, 64)


# ---- Thumbnail: koyu zemin, Geist Mono Bold, vurgu kelimesi mühür kırmızısı ---------------
def _label(text, extra=""):
    return f'<div class="m" style="position:absolute;{extra};font-weight:600;font-size:22px;letter-spacing:6px;color:{MUTED_DARK}">{text}</div>'


def thumbnails():
    mark = hikari(40, 5.2)
    word = ["Çek", "os", "lov", "ak", "yal", "ı", "laş", "tır", "ama", "dık", "ları", "mız", "dan"]
    toks = "".join(
        f'<span style="display:inline-block;padding:5px 9px;margin:3px 2px;border:2px solid {CANDLE if i % 2 == 0 else "#6f6553"};'
        f'color:{CANDLE if i % 2 == 0 else "#b3a688"}">{t}</span>' for i, t in enumerate(word))
    shot("thumb-explainer", f'''{_label("EXPLAINER · 01", "left:80px;top:64px")}
<div class="m" style="position:absolute;left:76px;top:120px;font-weight:700;font-size:104px;line-height:1.02;letter-spacing:-4px;color:{CANDLE}">Türkçe neden<br><span style="color:{SEAL}">pahalı?</span></div>
<div class="m" style="position:absolute;left:72px;top:450px;width:1180px;font-weight:600;font-size:30px">{toks}</div>
{_label("1 KELİME → KAÇ TOKEN?", "left:80px;bottom:56px;letter-spacing:3px")}
<div style="position:absolute;right:56px;bottom:40px">{mark}</div>''', 1280, 720)
    shot("thumb-opinion", f'''
<div class="m" style="position:absolute;left:640px;top:0;width:640px;height:720px;border-left:2px dashed #3a342b;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:#6f6553;font-weight:600;font-size:20px;letter-spacing:3px">
<div>KAMERA KARESİ</div><div style="font-size:15px;letter-spacing:1px">yüz · ışık soldan · koyu arka plan</div></div>
{_label("HIZLANMADAN ÖNCE · 01", "left:80px;top:64px")}
<div class="m" style="position:absolute;left:76px;top:130px;font-weight:700;font-size:118px;line-height:1.0;letter-spacing:-5px;color:{CANDLE}">RSI:<br>neden<br><span style="color:{SEAL}">şimdi?</span></div>
<div style="position:absolute;left:80px;bottom:40px">{mark}</div>''', 1280, 720)


if __name__ == "__main__":
    want = sys.argv[1] if len(sys.argv) > 1 else ""
    for fn in (avatars, banners, thumbnails):
        if want in fn.__name__:
            fn()
