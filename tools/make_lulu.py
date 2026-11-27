#!/usr/bin/env python3
"""案内人ルルのドット絵を、プレイキャラ（銀髪エルフの立ち絵）をベースに加工して作る。
   プレイキャラと同じ 192x192・同じ描き込み・同じ黒縁に揃えるため、ゼロから描かずに既存スプライトを改変する。
   加工: 髪を青く / 花飾りとエルフ耳を除去 / 両サイドを三つ編みに描き直し / 服の紫を水色に。
   使い方: python3 tools/make_lulu.py OUT.png"""
import re, base64, io, sys, colorsys, os
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_INDEX = 16   # char_skins.js 内の PNG の並び: 銀髪エルフ立ち絵（通常）
def load_base():
    s = open(os.path.join(ROOT, 'src/assets/char_skins.js'), encoding='utf-8').read()
    imgs = re.findall(r'data:image/png;base64,([A-Za-z0-9+/=]+)', s)
    return Image.open(io.BytesIO(base64.b64decode(imgs[BASE_INDEX]))).convert('RGBA')
OL = (32, 26, 56, 255)
def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
DARK, MID, LIGHT = (38, 66, 150), (88, 134, 222), (150, 190, 250)
def blue_ramp(y):   # 明るさ(0..1)→青
    t = max(0, min(1, (y - 0.45) / 0.5))
    return lerp(DARK, MID, t * 2) if t < .5 else lerp(MID, LIGHT, (t - .5) * 2)
def is_hairlike(px):
    r, g, b, a = px
    if a < 200: return False
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    return s < 0.35 and l > 0.45 and not (r > 245 and g > 245 and b > 245 and False)
def build():
    im = load_base(); px = im.load(); W, H = im.size
    # 1) 頭頂を左右対称にして花飾りを消す（右半分を左へ鏡写し）
    for y in range(6, 52):
        for x in range(44, 96):
            im.putpixel((x, y), px[191 - x, y])
    # 2) エルフ耳を消す（顔の外側へ突き出た肌色）
    for (x0, x1) in ((30, 57), (136, 162)):
        for y in range(60, 86):
            for x in range(x0, x1):
                if px[x, y][3]: im.putpixel((x, y), (0, 0, 0, 0))
    # 3) 両サイドの長い髪を消して三つ編みを描き直すため、サイドの下部を切り取る
    for y in range(96, 160):
        for x in list(range(30, 70)) + list(range(122, 164)):
            if px[x, y][3] and not (62 <= x <= 84 and y >= 128) and not (110 <= x <= 130 and y >= 128):
                r, g, b, a = px[x, y]
                h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
                if s < 0.35 or (r < 70 and g < 70 and b < 100):   # 髪とその縁
                    im.putpixel((x, y), (0, 0, 0, 0))
    # 4) 髪を青に（頭の領域・衣装の白は除く）
    for y in range(6, 108):
        for x in range(W):
            p = px[x, y]
            if p[3] and is_hairlike(p) and not (y > 100 and 70 < x < 122):
                r, g, b, a = p; Y = (0.3 * r + 0.59 * g + 0.11 * b) / 255
                c = blue_ramp(Y) if Y < 0.9 else MID   # 白に近いハイライト点は青に馴染ませる
                im.putpixel((x, y), c + (a,))
    # 4a) 前髪まわりの白いハイライト点（ほぼ白）を青に馴染ませる。目の白(y>=62)は触らない
    for y in range(6, 62):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a > 200 and min(r, g, b) > 215: im.putpixel((x, y), (140, 182, 244, a))
    # 4b) 首元に残った旧い髪（灰紫）を青に
    for y in range(100, 135):
        for x in list(range(58, 86)) + list(range(106, 134)):
            r, g, b, a = px[x, y]
            if a and 150 < r < 215 and abs(r - g) < 18 and b > g and (b - g) < 40 and r < 215:
                im.putpixel((x, y), blue_ramp((0.3 * r + 0.59 * g + 0.11 * b) / 255) + (a,))
    # 5) 服の紫を水色へ
    for y in range(108, 175):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a and b > r + 10 and r > 120 and g < b - 15 and (r - g) > 5:   # 薄紫
                h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
                nr, ng, nb = colorsys.hls_to_rgb(0.56, l, s)
                im.putpixel((x, y), (int(nr * 255), int(ng * 255), int(nb * 255), a))
    # 6) 三つ編みを描く（左右対称）
    d = ImageDraw.Draw(im)
    def braid(cx, top, n=5, seg=15):
        y = top
        for i in range(n):
            w = 8 - (1 if i >= n - 2 else 0)
            col = MID if i % 2 == 0 else DARK
            d.ellipse((cx - w - 1, y - 1, cx + w + 1, y + seg + 1), fill=OL)
            d.ellipse((cx - w, y, cx + w, y + seg), fill=col)
            d.line((cx - w + 3, y + 3, cx - 1, y + seg - 3), fill=LIGHT, width=1)   # ハイライト
            d.line((cx + 2, y + 2, cx + w - 2, y + seg - 4), fill=DARK if i % 2 == 0 else MID, width=1)
            y += seg - 3
        # リボン
        d.rectangle((cx - 7, y - 1, cx + 7, y + 9), fill=OL); d.rectangle((cx - 6, y, cx + 6, y + 8), fill=(255, 216, 110, 255))
        d.line((cx - 5, y + 6, cx + 5, y + 6), fill=(214, 160, 60, 255))
        return y
    braid(58, 94); braid(134, 94)
    return im
def drop_specks(im, minpx=60):
    # 加工で切り離された小さな残りカス（孤立したピクセル群）を消す
    px = im.load(); W, H = im.size; seen = set()
    for y in range(H):
        for x in range(W):
            if px[x, y][3] and (x, y) not in seen:
                st = [(x, y)]; comp = []; seen.add((x, y))
                while st:
                    cx, cy = st.pop(); comp.append((cx, cy))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in seen and px[nx, ny][3]:
                                seen.add((nx, ny)); st.append((nx, ny))
                if len(comp) < minpx:
                    for c in comp: im.putpixel(c, (0, 0, 0, 0))
    return im
def outline(im):
    px = im.load(); W, H = im.size; out = im.copy(); op = out.load()
    for y in range(H):
        for x in range(W):
            if px[x, y][3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < W and 0 <= yy < H and px[xx, yy][3] > 200: op[x, y] = OL; break
    return out
if __name__ == '__main__':
    im = outline(drop_specks(build()))
    im.save(sys.argv[1] if len(sys.argv) > 1 else 'lulu.png')
