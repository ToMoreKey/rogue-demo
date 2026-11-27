#!/usr/bin/env python3
"""ルル（広場の案内人）のドット絵を生成する。プレイキャラと同じ 192x192・ドット絵・黒縁取りに合わせる。
   64x64 のグリッドに描いて 3 倍(最近傍)に拡大。 出力: --out 192x192 PNG と --b64 で base64"""
import sys, base64, io
from PIL import Image, ImageDraw
OL=(27,27,58,255)
SK=(250,220,196,255); SKS=(232,184,160,255)
HB=(74,127,216,255); HS=(46,85,168,255); HL=(128,176,255,255)
RB=(255,222,120,255); RBS=(214,168,64,255)
CL=(246,240,224,255); CLS=(214,204,184,255)
CP=(58,86,170,255); CPS=(40,60,130,255)
GD=(236,190,70,255)
SH=(120,72,48,255); SHS=(84,48,32,255)
EY=(48,40,110,255); EYL=(255,255,255,255); EYM=(110,150,255,255)
BL=(255,150,160,255)
def build(expr='normal'):
    S=64; im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
    def e(box,c): d.ellipse(box,fill=c)
    def r(box,c): d.rectangle(box,fill=c)
    def p(pts,c): d.polygon(pts,fill=c)
    # --- 後ろ髪（頭の後ろ、あご〜肩の高さ）
    e((16,11,48,42),HB); r((17,26,47,36),HB)
    # --- 足・靴
    r((25,56,30,59),SH); r((34,56,39,59),SH); r((25,58,30,59),SHS); r((34,58,39,59),SHS)
    # --- 服：白いチュニック＋青いケープ
    p([(23,38),(41,38),(44,57),(20,57)],CL); r((20,54,44,57),CLS)
    p([(21,37),(43,37),(46,47),(42,45),(22,45),(18,47)],CP); r((22,44,42,45),CPS)
    # 腕（袖は白、手は肌）
    e((15,40,23,52),CL); e((41,40,49,52),CL); e((16,49,22,54),SK); e((42,49,48,54),SK)
    # 首・襟・鐘のブローチ
    r((29,36,35,39),SKS); p([(27,38),(37,38),(32,43)],CL); e((30,41,34,46),GD); r((31,46,33,47),GD); d.point((32,43),fill=RBS)
    # --- 顔（幼く丸く、大きめ）
    e((17,14,47,42),SK); r((22,38,42,42),SK)
    e((22,36,42,43),SK)
    # 頬の影
    r((20,37,23,39),SKS)
    # --- 三つ編み（両サイド・肩の前に垂らす）
    for sx in (-1,1):
        cx=32+sx*17
        for i,yy in enumerate((36,41,46,51)):
            w=2
            col=HB if i%2==0 else HS
            e((cx-w,yy-3,cx+w,yy+3),col)
            d.point((cx-1,yy-1),fill=HL)
        e((cx-2,53,cx+2,57),HB); e((cx-3,57,cx+3,61),RB); r((cx-3,56,cx+3,57),RBS)
    # --- 前髪（ぱっつん気味のセンター分け）
    p([(16,30),(15,21),(20,13),(32,10),(44,13),(49,21),(48,30),(44,24),(40,17),(36,22),(32,16),(28,22),(24,17),(20,24)],HB)
    p([(21,14),(28,11),(30,13),(25,18)],HL); p([(36,11),(42,13),(44,17),(38,16)],HL)
    r((15,24,18,36),HS); r((46,24,49,36),HS)
    # ヘアピン（小さな鐘）
    e((38,15,42,19),GD)
    # --- 目（大きく幼く）
    for ex in (26,38):
        if expr=='joy':
            d.arc((ex-3,28,ex+3,35),200,340,fill=EY,width=2)
        elif expr=='surprise':
            e((ex-3,27,ex+3,35),EYL); e((ex-1,29,ex+1,33),EY); d.point((ex-1,29),fill=EYL)
        else:
            e((ex-3,27,ex+3,36),EY)
            r((ex-2,32,ex+2,34),EYM)
            r((ex-2,28,ex-1,30),EYL); d.point((ex+1,33),fill=EYL)
            r((ex-3,26,ex+3,26),OL)
    # 頬・口（小さく）
    e((20,35,24,38),BL); e((40,35,44,38),BL)
    if expr=='joy': r((30,37,34,37),OL); r((31,38,33,39),(190,70,80,255))
    elif expr=='surprise': e((31,37,33,40),(190,70,80,255))
    else: r((30,38,34,38),(190,70,80,255)); d.point((29,37),fill=(190,70,80,255)); d.point((35,37),fill=(190,70,80,255))
    # 影
    s=Image.new('RGBA',(S,S),(0,0,0,0)); sd=ImageDraw.Draw(s); sd.ellipse((18,59,46,63),fill=(0,0,0,70))
    px=im.load(); out=Image.new('RGBA',(S,S),(0,0,0,0)); op=out.load()
    for y in range(S):
        for x in range(S):
            if px[x,y][3]>0: op[x,y]=px[x,y]
    for y in range(S):
        for x in range(S):
            if px[x,y][3]==0:
                for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    xx,yy=x+dx,y+dy
                    if 0<=xx<S and 0<=yy<S and px[xx,yy][3]>0: op[x,y]=OL; break
    base=Image.new('RGBA',(S,S),(0,0,0,0)); base.alpha_composite(s); base.alpha_composite(out)
    return base
if __name__=='__main__':
    ex=sys.argv[1] if len(sys.argv)>1 else 'normal'
    big=build(ex).resize((192,192),Image.NEAREST)
    if '--b64' in sys.argv:
        b=io.BytesIO(); big.save(b,'PNG',optimize=True); print(base64.b64encode(b.getvalue()).decode())
    else: big.save(sys.argv[2] if len(sys.argv)>2 else 'lulu.png')
