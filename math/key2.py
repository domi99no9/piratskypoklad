import numpy as np
from PIL import Image, ImageFilter
def key(path, kind):
    a=np.asarray(Image.open(path).convert('RGB')).astype(float); r,g,b=a[...,0],a[...,1],a[...,2]
    bd=np.concatenate([a[:6].reshape(-1,3),a[-6:].reshape(-1,3)]); bg=np.median(bd,0)
    if kind=='green':
        m=np.maximum(r,b); dom=g-m; bgdom=bg[1]-max(bg[0],bg[2]); like=(g>m+10)&(g>1.5*m+4)
    else:
        bgratio=bg[2]/(bg[0]+1); ratio=b/(r+1); dom=r-g; bgdom=bg[0]-bg[1]
        like=(r>g+30)&(np.abs(ratio-bgratio)<.22)&(g<.45*r)
    shade=np.clip(1-dom/bgdom,0,1)
    alpha=np.where(like,shade*0.7,1.0); alpha[like&(shade<0.08)]=0
    rgb=a.copy()
    for k in range(3): rgb[...,k]=np.where(like,0,a[...,k])
    A=Image.fromarray(np.where(like,0,255).astype(np.uint8))
    er=np.asarray(A.filter(ImageFilter.MinFilter(5)))>0; edge=(~like)&(~er)
    if kind=='green': rgb[...,1]=np.where(edge&(g>np.maximum(r,b)),np.minimum(g,np.maximum(r,b)*1.05+5),rgb[...,1])
    else:
        mm=g*1.1+10; rgb[...,0]=np.where(edge&(r>mm)&(b>g+20),np.minimum(r,np.maximum(g*1.3,(r+g)/2)),rgb[...,0]); rgb[...,2]=np.where(edge&(b>g+30)&(r>g+30),np.minimum(b,(b+g)/2+10),rgb[...,2])
    return Image.fromarray(np.dstack([rgb,alpha*255]).astype(np.uint8),'RGBA')
def tight(im,th=60): return im.crop(im.getchannel('A').point(lambda v:255 if v>th else 0).getbbox())
def fit(im,size,frac=.94):
    w,h=im.size; s=size*frac/max(w,h); im=im.resize((round(w*s),round(h*s)),Image.LANCZOS)
    c=Image.new('RGBA',(size,size),(0,0,0,0)); c.paste(im,((size-im.width)//2,(size-im.height)//2),im); return c
def segs_of(im):
    A=np.asarray(im.getchannel('A'))>120; col=A.sum(0)>3; s=[];ins=False
    for x,v in enumerate(col):
        if v and not ins: x0=x;ins=True
        if not v and ins: s.append((x0,x));ins=False
    return [q for q in s if q[1]-q[0]>30]
# J Q A
im=key('src/jqa.jpg','magenta'); sg=segs_of(im); print('jqa',sg)
# match letter height to old K glyph: crop tight and fit same as others
Kh=tight(Image.open('img/K.png')).size; print('K',Kh)
for n,(x0,x1) in zip('JQA',sg):
    t=tight(im.crop((x0-6,0,x1+6,im.height)))
    s=Kh[1]/t.size[1]; t=t.resize((round(t.size[0]*s),Kh[1]),Image.LANCZOS)
    if t.size[0]>243: t=t.resize((243,round(t.size[1]*243/t.size[0])),Image.LANCZOS)
    c=Image.new('RGBA',(256,256),(0,0,0,0)); c.paste(t,((256-t.width)//2,(256-t.height)//2),t); c.save('img/%s.png'%n)
# buttons
im=key('src/buttons.jpg','magenta'); sg=segs_of(im); print('btn',sg)
for n,(x0,x1) in zip(['btn_red','btn_green','btn_minus','btn_plus'],sg): tight(im.crop((x0-8,0,x1+8,im.height)),20).save('img/%s.png'%n)
tight(key('src/start.jpg','green'),20).save('img/start.png')
k=tight(key('src/kraken.jpg','green'),150); print('kraken',k.size); k.save('img/kraken.png')
key('src/frame.jpg','green').save('/tmp/frame_keyed.png')
