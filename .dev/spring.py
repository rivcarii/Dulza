import math
def spring(zeta, wT, n):
    pts=[]
    for i in range(n+1):
        t=i/n; x=wT*t
        if zeta>=0.999:
            v=1-(1+x)*math.exp(-x)
        else:
            wd=math.sqrt(1-zeta*zeta)
            v=1-math.exp(-zeta*x)*(math.cos(wd*x)+(zeta/wd)*math.sin(wd*x))
        pts.append(v)
    pts[-1]=1
    out=[]
    for p in pts:
        out.append('0' if p==0 else ('1' if p==1 else ('%.3f'%p).rstrip('0').rstrip('.').lstrip('0') or '0'))
    return 'linear('+', '.join(out)+')'
print('SMOOTH', spring(1.0, 9, 22))
print('BOUNCE', spring(0.7, 11, 30))
