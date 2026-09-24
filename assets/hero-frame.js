/* hero-frame.js — L&S Consulting scroll hero.
 * A structural frame (grid, columns, beams, slabs, glazing) is engineered live in 3D
 * as you scroll: gridlines set out, columns rise, beams span, slabs pour, the crane climbs,
 * the façade closes, the lights come on floor by floor and the city appears around it.
 * Pure canvas 2D, no libraries.
 * Markup: <section class="hero-scroll"> .hero-stage > canvas, .beat[data-from][data-to], .hero-rail .fill, .scan-readout
 */
(function(){
'use strict';
const sec=document.querySelector('.hero-scroll');if(!sec)return;
const cv=sec.querySelector('canvas'),ctx=cv.getContext('2d');
const beats=[...sec.querySelectorAll('.beat')],fill=sec.querySelector('.hero-rail .fill');
const readout=sec.querySelector('.scan-readout'),lvlEl=sec.querySelector('[data-level]'),htEl=sec.querySelector('[data-height]');
const REDUCE=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,seg=(p,a,b)=>clamp((p-a)/(b-a),0,1);
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,eo=t=>1-Math.pow(1-t,3);
const hash=n=>{n=Math.sin(n*127.1+311.7)*43758.5453;return n-Math.floor(n)};
const SMALL=matchMedia('(max-width:700px)').matches;
let W=0,H=0,DPR=Math.min(devicePixelRatio||1,SMALL?1.25:1.6),T=0;

/* ---------------- model (metres) ---------------- */
const B=8,FH=4;
const floors=[];
for(let f=0;f<15;f++){
  let x0,x1,z0,z1;
  if(f<3){x0=0;x1=64;z0=0;z1=40}              // podium 8x5 bays
  else{x0=8;x1=48;z0=8;z1=32}                 // tower 5x3 bays, top floor flush
  floors.push({x0,x1,z0,z1,y:f*FH});
}
const NF=floors.length,TOP=NF*FH;
const ROOFS={2:1,14:1};                  // slabs that stay exposed once the skin closes
const NRM=[[0,0,-1],[1,0,0],[0,0,1],[-1,0,0]];
const LIGHT=[.55,0,-.83];                     // key light for façade shading (from camera-right)
const cols=[],beams=[],slabs=[],faces=[];
floors.forEach((F,f)=>{
  const y0=F.y,y1=F.y+FH;
  for(let x=F.x0;x<=F.x1;x+=B)for(let z=F.z0;z<=F.z1;z+=B)cols.push({f,a:[x,y0,z],b:[x,y1,z]});
  for(let z=F.z0;z<=F.z1;z+=B)for(let x=F.x0;x<F.x1;x+=B)beams.push({f,a:[x,y1,z],b:[x+B,y1,z]});
  for(let x=F.x0;x<=F.x1;x+=B)for(let z=F.z0;z<F.z1;z+=B)beams.push({f,a:[x,y1,z],b:[x,y1,z+B]});
  slabs.push({f,roof:!!ROOFS[f],p:[[F.x0-.6,y1,F.z0-.6],[F.x1+.6,y1,F.z0-.6],[F.x1+.6,y1,F.z1+.6],[F.x0-.6,y1,F.z1+.6]]});
  const sides=[[[F.x0,F.z0],[F.x1,F.z0]],[[F.x1,F.z0],[F.x1,F.z1]],[[F.x1,F.z1],[F.x0,F.z1]],[[F.x0,F.z1],[F.x0,F.z0]]];
  sides.forEach(([s,e],k)=>{
    const len=Math.hypot(e[0]-s[0],e[1]-s[1]),n=Math.round(len/2);
    const lit=[];for(let i=0;i<n;i++)lit.push(hash(f*131+k*17+i*3.7)<.38?hash(i*9.1+f):-1);
    const shade=.5+.5*(NRM[k][0]*LIGHT[0]+NRM[k][2]*LIGHT[2]);
    faces.push({f,k,n,lit,shade,c:[(s[0]+e[0])/2,(y0+y1)/2,(s[1]+e[1])/2],
      p:[[s[0],y0,s[1]],[e[0],y0,e[1]],[e[0],y1,e[1]],[s[0],y1,s[1]]]});
  });
});
// setting-out grid (drawing gridlines with bubbles)
const GX=[],GZ=[];for(let x=0;x<=64;x+=B)GX.push(x);for(let z=0;z<=40;z+=B)GZ.push(z);
const LET='ABCDEFGHI';
// city context: x,z,w,d,h — kept clear of the camera's final line of sight
const city=[[-40,-30,18,14,28],[-44,10,16,18,44],[-30,58,20,16,20],[82,-24,16,18,22],[92,10,18,16,34],[78,52,18,18,24],
  [22,70,24,14,32],[-8,-44,18,12,12],[110,30,16,16,18],[-70,34,14,14,30],[-62,74,20,20,70],[12,104,22,18,52],[62,92,18,18,82],
  [-92,-12,18,18,40],[130,96,20,20,40],[132,-6,16,16,30],[-20,120,24,16,38]].map(([x,z,w,d,h],i)=>{
  const c=[[x,z],[x+w,z],[x+w,z+d],[x,z+d]],fs=[];
  for(let k=0;k<4;k++){const a=c[k],b=c[(k+1)%4];fs.push({k,a,b})}
  return {x,z,w,d,h,fs,seed:i};
});

/* ---------------- camera ---------------- */
let cam={},f=1,cx=0,cy=0;
const K=1.35;                                  // longer lens: less wide-angle distortion
function setCam(p){
  const t=ease(p);
  const amb=.07*Math.sin(T*.00022)*seg(p,.9,1);
  const az=-2.35+1.25*t+amb;
  const el=.62-.36*t;
  const dist=((W<700?128:112)+70*t*(W<700?.4:1))*K;
  const tx=32,tz=20,ty=6+Math.min(TOP,TOP*seg(p,.06,.8))*.46;
  const px=tx+Math.cos(az)*Math.cos(el)*dist,py=ty+Math.sin(el)*dist,pz=tz+Math.sin(az)*Math.cos(el)*dist;
  let fw=[tx-px,ty-py,tz-pz];const fl=Math.hypot(...fw);fw=fw.map(v=>v/fl);
  let rt=[-fw[2],0,fw[0]];const rl=Math.hypot(...rt);rt=rt.map(v=>v/rl);
  const up=[rt[1]*fw[2]-rt[2]*fw[1],rt[2]*fw[0]-rt[0]*fw[2],rt[0]*fw[1]-rt[1]*fw[0]];
  cam={p:[px,py,pz],fw,rt,up};f=Math.min(W,H)*(W<700?1.3:1.2)*K;cx=W*(W<700?.5:.66+.06*seg(p,.75,1));cy=H*(W<700?.42:.6);
}
function proj(q){
  const v=[q[0]-cam.p[0],q[1]-cam.p[1],q[2]-cam.p[2]];
  const z=v[0]*cam.fw[0]+v[1]*cam.fw[1]+v[2]*cam.fw[2];if(z<2)return null;
  return [cx+(v[0]*cam.rt[0]+v[1]*cam.rt[1]+v[2]*cam.rt[2])*f/z, cy-(v[0]*cam.up[0]+v[1]*cam.up[1]+v[2]*cam.up[2])*f/z, z];
}
const lerp3=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
function line(path,a,b){const A=proj(a),B2=proj(b);if(!A||!B2)return;path.moveTo(A[0],A[1]);path.lineTo(B2[0],B2[1])}
function poly(pts){const P=pts.map(proj);if(P.some(q=>!q))return null;return P}
function fillPoly(P,c){ctx.beginPath();P.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.fillStyle=c;ctx.fill()}
const facing=(n,pt)=>n[0]*(cam.p[0]-pt[0])+n[1]*(cam.p[1]-pt[1])+n[2]*(cam.p[2]-pt[2])>0;

/* ---------------- draw ---------------- */
function draw(p){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#071528');g.addColorStop(.6,'#0B1F3A');g.addColorStop(1,'#10294B');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  setCam(p);
  const setout=eo(seg(p,0,.1));
  const build=seg(p,.06,.8)*NF;
  const skin=seg(p,.18,.9)*NF;
  const close=eo(seg(p,.8,.93));                      // façade turns from translucent to solid
  const lights=seg(p,.83,.98),ghost=eo(seg(p,.8,1)),craneOut=seg(p,.86,.95);

  // warm ground glow under the building once it's done
  const G=proj([32,0,20]);
  if(G){const r=Math.min(W,H)*.75,gg=ctx.createRadialGradient(G[0],G[1],0,G[0],G[1],r);
    gg.addColorStop(0,'rgba(232,98,44,'+(.05+.1*lights)+')');gg.addColorStop(1,'rgba(232,98,44,0)');ctx.fillStyle=gg;ctx.fillRect(0,0,W,H)}

  // ground grid (fine)
  ctx.lineWidth=1;ctx.strokeStyle='rgba(143,179,217,.07)';ctx.beginPath();
  const GS=SMALL?16:8;for(let x=-96;x<=160;x+=GS)line(ctx,[x,0,-80],[x,0,140]);for(let z=-80;z<=140;z+=GS)line(ctx,[-96,0,z],[160,0,z]);ctx.stroke();
  // setting-out gridlines + bubbles
  const soA=1-seg(p,.7,.9)*.75;
  ctx.strokeStyle='rgba(255,138,87,'+(.55*soA)+')';ctx.setLineDash([6,5]);ctx.beginPath();
  GX.forEach(x=>line(ctx,[x,0,-10],[x,0,-10+60*setout]));GZ.forEach(z=>line(ctx,[-10,0,z],[-10+84*setout,0,z]));ctx.stroke();ctx.setLineDash([]);
  if(setout>.2){ctx.font='500 11px "IBM Plex Mono",monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    const bub=(pt,t)=>{const P=proj(pt);if(!P)return;const r=Math.max(7,Math.min(13,700/P[2]*1.2));ctx.globalAlpha=setout*soA;
      ctx.fillStyle='#0B1F3A';ctx.strokeStyle='#FF8A57';ctx.beginPath();ctx.arc(P[0],P[1],r,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#FFD9C7';ctx.fillText(t,P[0],P[1]+.5);ctx.globalAlpha=1};
    GX.forEach((x,i)=>bub([x,0,-14],LET[i]));GZ.forEach((z,i)=>bub([-14,0,z],String(i+1)));}

  // structure lines (behind the glazing; hidden once the façade is solid)
  const done=new Path2D(),act=new Path2D();
  cols.forEach(c=>{const t=seg(build-c.f,0,.35);if(t<=0)return;line(t<1?act:done,c.a,lerp3(c.a,c.b,eo(t)))});
  beams.forEach(bm=>{const t=seg(build-bm.f,.3,.65);if(t<=0)return;line(t<1?act:done,bm.a,lerp3(bm.a,bm.b,eo(t)))});
  ctx.lineCap='round';
  ctx.strokeStyle='rgba(214,232,245,'+(.78*(1-close*.85))+')';ctx.lineWidth=1.3;ctx.stroke(done);

  // painter-sorted surfaces: slabs, façade faces (front-facing only), city blocks
  const S=[];
  slabs.forEach(s=>{const t=seg(build-s.f,.55,1);if(t<=0)return;const vis=s.roof?1:1-close;if(vis<=0)return;
    const P=poly(s.p);if(!P)return;
    S.push({d:P.reduce((a,q)=>a+q[2],0)/4,fn(){fillPoly(P,s.roof&&close>0?'rgba('+(24+14*close|0)+','+(52+10*close|0)+','+(92+8*close|0)+','+((.14+.8*close)*t*vis)+')':'rgba(196,206,220,'+((.10+.08*t)*t*vis)+')');
      ctx.strokeStyle='rgba(214,232,245,'+(.35*t*(s.roof?1:vis))+')';ctx.lineWidth=1;ctx.stroke()}})});
  faces.forEach(q=>{const t=seg(skin-q.f,0,1);if(t<=0)return;if(!facing(NRM[q.k],q.c))return;
    const P=poly(q.p);if(!P)return;S.push({d:P.reduce((s,v)=>s+v[2],0)/4,fn(){drawFace(q,P,t,close,lights)}})});
  if(ghost>0)city.forEach(b=>{const hh=b.h*ghost;
    b.fs.forEach(fc=>{const n=NRM[fc.k],mid=[(fc.a[0]+fc.b[0])/2,hh/2,(fc.a[1]+fc.b[1])/2];if(!facing(n,mid))return;
      const P=poly([[fc.a[0],0,fc.a[1]],[fc.b[0],0,fc.b[1]],[fc.b[0],hh,fc.b[1]],[fc.a[0],hh,fc.a[1]]]);if(!P)return;
      S.push({d:P.reduce((s,v)=>s+v[2],0)/4,fn(){drawCity(b,fc,P,hh,ghost,lights)}})});
    const R=poly([[b.x,hh,b.z],[b.x+b.w,hh,b.z],[b.x+b.w,hh,b.z+b.d],[b.x,hh,b.z+b.d]]);
    if(R&&cam.p[1]>hh)S.push({d:R.reduce((s,v)=>s+v[2],0)/4+.01,fn(){fillPoly(R,'rgba(16,34,60,'+.9*ghost+')');ctx.strokeStyle='rgba(143,179,217,'+.14*ghost+')';ctx.lineWidth=1;ctx.stroke()}})});
  S.sort((a,b)=>b.d-a.d).forEach(s=>s.fn());

  // active (orange) members stay on top so the build reads clearly
  ctx.strokeStyle='#FF8A57';ctx.lineWidth=2;if(!SMALL){ctx.shadowColor='rgba(255,120,60,.8)';ctx.shadowBlur=8}ctx.stroke(act);ctx.shadowBlur=0;

  // tower crane climbs with the frame
  if(craneOut<1){
    const topB=Math.min(NF,Math.ceil(build))*FH,mast=topB+14,x=-4,z=20,ang=p*9;
    ctx.globalAlpha=1-craneOut;const cr=new Path2D();
    [[0,0],[2,0],[2,2],[0,2]].forEach(([dx,dz],i,a)=>{const n=a[(i+1)%4];line(cr,[x+dx,0,z+dz],[x+dx,mast,z+dz]);
      for(let y=0;y<mast;y+=3)line(cr,[x+dx,y,z+dz],[x+n[0],y+3,z+n[1]])});
    const jx=Math.cos(ang),jz=Math.sin(ang),J=48,C=14;
    line(cr,[x+1-jx*C,mast,z+1-jz*C],[x+1+jx*J,mast,z+1+jz*J]);line(cr,[x+1,mast+6,z+1],[x+1+jx*J,mast,z+1+jz*J]);line(cr,[x+1,mast+6,z+1],[x+1-jx*C,mast,z+1-jz*C]);
    const hk=[x+1+jx*J*.7,mast,z+1+jz*J*.7];line(cr,hk,[hk[0],mast-10-6*Math.sin(p*20),hk[2]]);
    ctx.strokeStyle='rgba(232,98,44,.75)';ctx.lineWidth=1;ctx.stroke(cr);ctx.globalAlpha=1;
  }

  // aircraft warning beacons on the crown once complete
  if(lights>.6){const on=.5+.5*Math.sin(T*.004);const a=seg(lights,.6,1)*(.35+.65*on);
    [[8,TOP+.5,8],[48,TOP+.5,32],[48,TOP+.5,8]].forEach(pt=>{const P=proj(pt);if(!P)return;
      const r=10*a;const rg=ctx.createRadialGradient(P[0],P[1],0,P[0],P[1],r+6);rg.addColorStop(0,'rgba(255,90,60,'+a+')');rg.addColorStop(1,'rgba(255,90,60,0)');
      ctx.fillStyle=rg;ctx.beginPath();ctx.arc(P[0],P[1],r+6,0,7);ctx.fill();ctx.fillStyle='rgba(255,200,180,'+a+')';ctx.beginPath();ctx.arc(P[0],P[1],1.6,0,7);ctx.fill()})}

  // level readout (drawing annotation beside the rising frame)
  const lvl=Math.min(NF,Math.floor(build)),ht=Math.min(TOP,build*FH);
  if(lvlEl)lvlEl.textContent=String(lvl).padStart(2,'0');if(htEl)htEl.textContent='+'+ht.toFixed(1)+' m';
  if(readout){const on=build>.2&&build<NF;readout.style.opacity=on?1:0;
    if(on){const P=proj([floors[Math.min(NF-1,lvl)].x1+4,Math.min(TOP,(lvl+1)*FH),floors[Math.min(NF-1,lvl)].z0]);
      if(P){readout.style.left=P[0]+'px';readout.style.top=P[1]+'px';readout.textContent='LEVEL '+String(lvl).padStart(2,'0')+'  ·  +'+ht.toFixed(1)+' M'}}}
}

/* one storey of curtain wall on one side */
function drawFace(q,P,t,close,lights){
  const sh=q.shade;
  // glass: translucent while building, solid tinted glazing once closed
  const a=(.14+.8*close)*t;
  let gr;
  if(SMALL)gr='rgba('+(23+31*sh|0)+','+(50+40*sh|0)+','+(87+50*sh|0)+','+a+')';
  else{gr=ctx.createLinearGradient(P[3][0],P[3][1],P[0][0],P[0][1]);
    gr.addColorStop(0,'rgba('+(30+40*sh|0)+','+(62+50*sh|0)+','+(104+60*sh|0)+','+a+')');
    gr.addColorStop(1,'rgba('+(16+22*sh|0)+','+(38+30*sh|0)+','+(70+40*sh|0)+','+a+')')}
  fillPoly(P,gr);
  const n=q.n,A=q.p;
  // lit panes, floor by floor from the bottom up
  const fl=seg(lights*NF*1.15-q.f,0,1);
  if(fl>0){for(let i=0;i<n;i++){const L=q.lit[i];if(L<0)continue;const on=seg(fl,L*.7,L*.7+.3);if(on<=0)continue;
      const t0=(i+.12)/n,t1=(i+.88)/n,y0=.18,y1=.82;
      const bl=lerp3(A[0],A[1],t0),br=lerp3(A[0],A[1],t1),tl=lerp3(A[3],A[2],t0),tr=lerp3(A[3],A[2],t1);
      const Q=poly([lerp3(bl,tl,y0),lerp3(br,tr,y0),lerp3(br,tr,y1),lerp3(bl,tl,y1)]);if(!Q)continue;
      const warm=L>.25;fillPoly(Q,warm?'rgba(255,'+(186+30*L|0)+','+(120+40*L|0)+','+(.78*on)+')':'rgba(190,220,255,'+(.5*on)+')')}}
  // mullions + spandrel edge
  const m=new Path2D();for(let i=1;i<n;i++){const s=i/n;line(m,lerp3(A[0],A[1],s),lerp3(A[3],A[2],s))}
  ctx.strokeStyle='rgba(143,179,217,'+(.22+.18*close)*t+')';ctx.lineWidth=.8;ctx.stroke(m);
  ctx.beginPath();ctx.moveTo(P[0][0],P[0][1]);ctx.lineTo(P[1][0],P[1][1]);ctx.moveTo(P[3][0],P[3][1]);ctx.lineTo(P[2][0],P[2][1]);
  ctx.strokeStyle='rgba(214,232,245,'+(.3+.35*close)*t+')';ctx.lineWidth=1;ctx.stroke();
  ctx.beginPath();ctx.moveTo(P[0][0],P[0][1]);ctx.lineTo(P[3][0],P[3][1]);ctx.moveTo(P[1][0],P[1][1]);ctx.lineTo(P[2][0],P[2][1]);
  ctx.strokeStyle='rgba(214,232,245,'+(.18+.3*close)*t+')';ctx.stroke();
}

/* a context building face with a few lit windows */
function drawCity(b,fc,P,hh,ghost,lights){
  const sh=.5+.5*(NRM[fc.k][0]*LIGHT[0]+NRM[fc.k][2]*LIGHT[2]);
  const fog=1-.45*seg(P[0][2],120,420);
  fillPoly(P,'rgba('+(9+10*sh|0)+','+(24+14*sh|0)+','+(46+20*sh|0)+','+.9*ghost*fog+')');
  ctx.strokeStyle='rgba(143,179,217,'+.13*ghost*fog+')';ctx.lineWidth=1;ctx.stroke();
  if(lights<=0)return;
  const len=Math.hypot(fc.b[0]-fc.a[0],fc.b[1]-fc.a[1]),cols=Math.max(2,Math.round(len/3)),rows=Math.max(1,Math.floor(hh/4));
  ctx.fillStyle='rgba(255,200,140,'+(.32*lights*ghost*fog)+')';
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){if(hash(b.seed*97+fc.k*13+r*7.3+c*1.9)>(SMALL?.09:.16))continue;
    const s0=(c+.25)/cols,s1=(c+.75)/cols,y0=r*4+1.2,y1=r*4+2.8;
    const a0=[fc.a[0]+(fc.b[0]-fc.a[0])*s0,0,fc.a[1]+(fc.b[1]-fc.a[1])*s0],a1=[fc.a[0]+(fc.b[0]-fc.a[0])*s1,0,fc.a[1]+(fc.b[1]-fc.a[1])*s1];
    const Q=poly([[a0[0],y0,a0[2]],[a1[0],y0,a1[2]],[a1[0],y1,a1[2]],[a0[0],y1,a0[2]]]);if(!Q)continue;
    ctx.beginPath();Q.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.fill()}
}

/* ---------------- scroll plumbing ---------------- */
let target=0,cur=0,raf=0,amb=0;
function resize(){const r=cv.getBoundingClientRect();W=r.width;H=r.height;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);draw(cur)}
function progress(){const r=sec.getBoundingClientRect(),t=r.height-innerHeight;return clamp(t>0?-r.top/t:0,0,1)}
function beatsAt(p){beats.forEach(b=>{const on=p>=+b.dataset.from&&p<(+b.dataset.to||1.01);b.classList.toggle('on',on);b.setAttribute('aria-hidden',on?'false':'true')});if(fill)fill.style.transform='scaleX('+p+')'}
function tick(t){raf=0;if(!vis){cur=target;return}T=t||performance.now();cur+=(target-cur)*.12;if(Math.abs(target-cur)<.0004)cur=target;draw(cur);beatsAt(cur);if(cur!==target)raf=requestAnimationFrame(tick);else ambient()}
function onScroll(){target=progress();if(!raf)raf=requestAnimationFrame(tick)}
// once the tower is complete it keeps breathing: slow camera drift + beacons
function ambient(){if(amb||REDUCE||!vis||cur<.88)return;let lt=0;amb=requestAnimationFrame(function loop(t){amb=0;if(raf||!vis||cur<.88||document.hidden)return;if(t-lt>(SMALL?50:33)){lt=t;T=t;draw(cur)}amb=requestAnimationFrame(loop)})}
let vis=true;if('IntersectionObserver'in window)new IntersectionObserver(e=>{vis=e[e.length-1].isIntersecting;if(vis){onScroll();ambient()}}).observe(sec);
if(REDUCE){cur=target=1;addEventListener('resize',resize);resize();beatsAt(1);return}
addEventListener('scroll',()=>{if(vis)onScroll()},{passive:true});
addEventListener('resize',()=>{resize();onScroll()});
resize();target=cur=progress();beatsAt(cur);ambient();
// idle intro: the setting-out draws itself before the first scroll
if(cur<.02){const t0=performance.now();(function intro(t){const k=clamp((t-t0)/1800,0,1);if(target<.02){draw(.075*eo(k))}if(k<1&&target<.02)requestAnimationFrame(intro)})(t0)}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)ambient()});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>draw(cur));
})();
