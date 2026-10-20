from PIL import Image
import numpy as np
f=Image.open('src/frame.jpg').convert('RGBA'); W,H=f.size
# horizontal stretch of central region
x0,x1,sx=290,990,1.25
mid=f.crop((x0,0,x1,H)).resize((round((x1-x0)*sx),H),Image.BICUBIC)
h=Image.new('RGBA',(W+mid.width-(x1-x0),H)); h.paste(f.crop((0,0,x0,H)),(0,0)); h.paste(mid,(x0,0)); h.paste(f.crop((x1,0,W,H)),(x0+mid.width,0))
# vertical band stretch
a=np.asarray(h); g=a[...,1].astype(int); m=np.maximum(a[...,0],a[...,2]).astype(int); like=g>m+40
ys,xs=np.nonzero(like); wx0,wx1,wy0,wy1=xs.min(),xs.max(),ys.min(),ys.max()
need=round((wx1-wx0+1)*3/5); add=need-(wy1-wy0+1)
y0,y1=300,425; band=h.crop((0,y0,h.width,y1)).resize((h.width,y1-y0+add),Image.BICUBIC)
c=Image.new('RGBA',(h.width,H+add)); c.paste(h.crop((0,0,h.width,y0)),(0,0)); c.paste(band,(0,y0)); c.paste(h.crop((0,y1,h.width,H)),(0,y0+band.height))
c=c.crop((60,0,c.width-60,c.height))
a=np.asarray(c).copy(); r,g,b=[a[...,i].astype(int) for i in range(3)]; like=g>np.maximum(r,b)+40; a[...,3]=np.where(like,0,255)
m=np.maximum(r,b); a[...,1]=np.where((g>m)&~like,np.minimum(g,m+5),g)
Image.fromarray(a).save('img/frame.png'); ys,xs=np.nonzero(like)
print('size',c.size,'window',xs.min(),xs.max(),ys.min(),ys.max())
L=np.asarray(c.convert('L')).astype(int); yy=555+add
for cx in [333,495,640,777,925]:
    X=cx if cx<x0 else (x0+(cx-x0)*sx if cx<x1 else cx+mid.width-(x1-x0)); X=int(X)-60
    y=yy
    while L[y-1,X]<40:y-=1
    y2=yy
    while L[y2+1,X]<40:y2+=1
    l=X
    while L[yy,l-1]<40:l-=1
    rr=X
    while L[yy,rr+1]<40:rr+=1
    print(cx,'x',l,rr,'y',y,y2)
