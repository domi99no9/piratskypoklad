import numpy as np
from PIL import Image, ImageFilter
def key(path,protect=None):
    from PIL import ImageDraw
    a=np.asarray(Image.open(path).convert('RGB')).astype(float)
    bg=np.median(np.concatenate([a[:8].reshape(-1,3),a[-8:].reshape(-1,3),a[:,:8].reshape(-1,3),a[:,-8:].reshape(-1,3)]),0)
    r,g,b=a[...,0],a[...,1],a[...,2]; m=np.maximum(r,b)
    gd=(g>m+10)&(g>1.5*m+4)
    M=Image.fromarray(((g>m+3)*255).astype(np.uint8)).copy(); H,W=gd.shape
    for pt in [(x,0) for x in range(0,W,16)]+[(x,H-1) for x in range(0,W,16)]+[(0,y) for y in range(0,H,16)]+[(W-1,y) for y in range(0,H,16)]:
        if M.getpixel(pt)==255: ImageDraw.floodfill(M,pt,128)
    ff=np.asarray(M)==128
    region=gd.copy()
    if protect:
        x0,x1=protect; R=ff.copy()
        for _ in range(16):
            D=np.asarray(Image.fromarray((R*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)))>0
            R=R|(D&gd)
        region[:,x0:x1]=R[:,x0:x1]; holes=np.zeros_like(gd); holes[:,:x0]=True; holes[:,x1:]=True
    else: holes=np.ones_like(gd)
    d=np.sqrt(((a-bg)**2).sum(2)); region|= gd&(d<90)&holes   # enclosed bright-green holes (A, Q, 0)
    # inside background region: green->transparent, darker green = shadow (black, partial alpha)
    shade=np.clip(1-(g-m)/(bg[1]-max(bg[0],bg[2])),0,1)
    alpha=np.where(region,shade*0.75,1.0)
    rgb=a.copy()
    for k in range(3): rgb[...,k]=np.where(region,0,a[...,k])
    A=Image.fromarray((np.where(region,0,255)).astype(np.uint8))
    er=np.asarray(A.filter(ImageFilter.MinFilter(5)))>0
    edge=(~region)&(~er)
    rgb[...,1]=np.where(edge&(g>m),np.minimum(g,m*1.05+5),rgb[...,1])
    out=np.dstack([rgb,alpha*255]).astype(np.uint8)
    return Image.fromarray(out,'RGBA'),bg
def crop_save(im,name,size=256):
    bb=im.getchannel('A').point(lambda v:255 if v>60 else 0).getbbox(); im=im.crop(bb)
    w,h=im.size; s=size*0.94/max(w,h); im=im.resize((max(1,round(w*s)),max(1,round(h*s))),Image.LANCZOS)
    c=Image.new('RGBA',(size,size),(0,0,0,0)); c.paste(im,((size-im.width)//2,(size-im.height)//2),im); c.save('img/%s.png'%name)
for n in ['kotva','papousek','kompas','truhla','kapitan','wild','mapa']:
    im,bg=key('src/%s.jpg'%n); print(n,bg); crop_save(im,n)
im,bg=key('src/cards.jpg',(322,513)); A=np.asarray(im.getchannel('A'))>40
col=A.sum(0)>2; segs=[];inside=False
for x,v in enumerate(col):
    if v and not inside: s=x;inside=True
    if not v and inside: segs.append([s,x]);inside=False
segs=[q for q in segs if q[1]-q[0]>15]; print('segs',segs)
while len(segs)>5:  # merge closest gap
    gi=min(range(len(segs)-1),key=lambda i:segs[i+1][0]-segs[i][1]); segs[gi]=[segs[gi][0],segs[gi+1][1]]; del segs[gi+1]
for n,(x0,x1) in zip(['10','J','Q','K','A'],segs): crop_save(im.crop((max(0,x0-4),0,x1+4,im.height)),n)
