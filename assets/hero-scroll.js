/* hero-scroll.js — scroll-scrubbed hero (Zygurat Collective, reusable module)
 * Markup: <section class="hero-scroll" data-mode="frames|blueprint" ...> with .hero-stage > canvas
 *  frames mode:    data-frames="assets/hero/frames/f_{i}.webp" data-count="150" [data-frames-mobile="..."]
 *  blueprint mode: data-built="assets/hero/built.webp" data-lines="assets/hero/lines.webp"
 * If frames mode is set but frames fail to load, it falls back to blueprint mode automatically.
 * Beats: .beat[data-from][data-to] inside the section get .on while progress is inside the range.
 */
(function(){
'use strict';
const sec=document.querySelector('.hero-scroll');
if(!sec)return;
const canvas=sec.querySelector('canvas');
const ctx=canvas.getContext('2d');
const beats=[...sec.querySelectorAll('.beat')];
const fill=sec.querySelector('.hero-rail .fill');
const readout=sec.querySelector('.scan-readout');
const gridEl=sec.querySelector('.hero-grid');
const REDUCE=matchMedia('(prefers-reduced-motion: reduce)').matches;
const focal={x:+(sec.dataset.fx||.5),y:+(sec.dataset.fy||.45)};
let W=0,H=0,DPR=Math.min(devicePixelRatio||1,2);
let target=0,cur=0,raf=0,mode=sec.dataset.mode||'blueprint',intro=REDUCE?1:0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const seg=(p,a,b)=>clamp((p-a)/(b-a),0,1);

function resize(){
  const r=canvas.getBoundingClientRect();W=r.width;H=r.height;
  canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);draw(cur,true);
}
function cover(img,scale){
  const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
  const s=Math.max(W/iw,H/ih)*scale;const dw=iw*s,dh=ih*s;
  return {x:(W-dw)*focal.x,y:(H-dh)*focal.y,w:dw,h:dh};
}

/* ---------- blueprint mode: line drawing → building rises floor by floor ---------- */
const built=new Image(),lines=new Image();let bpReady=0;
function loadBlueprint(){
  built.decoding=lines.decoding='async';
  built.onload=lines.onload=()=>{if(++bpReady===2){draw(cur,true);playIntro()}};
  built.src=sec.dataset.built;lines.src=sec.dataset.lines;
}
function drawBlueprint(p){
  if(bpReady<2)return;
  ctx.fillStyle='#0B1F3A';ctx.fillRect(0,0,W,H);
  const zoom=1.14-0.14*ease(seg(p,0,.8))+0.05*seg(p,.82,1);
  const b=cover(built,zoom);
  const drawT=Math.max(ease(seg(p,.02,.26)),ease(intro)*.62); // line drawing sweeps in (auto-plays partway on load)
  const riseT=ease(seg(p,.26,.74));        // building rises
  const linesOut=seg(p,.74,.9);
  const scanY=b.y+b.h-(b.h+40)*riseT;      // scan line moves bottom → top
  // built photo, revealed below the scan line
  if(riseT>0){
    ctx.save();ctx.beginPath();ctx.rect(0,scanY,W,H-scanY+2);ctx.clip();
    ctx.drawImage(built,b.x,b.y,b.w,b.h);ctx.restore();
  }
  // blueprint lines above the scan line (and fading after)
  if(linesOut<1){
    ctx.save();ctx.globalAlpha=1-linesOut;
    ctx.beginPath();ctx.rect(0,0,b.x+b.w*drawT,riseT>0?scanY:H);ctx.clip();
    ctx.drawImage(lines,b.x,b.y,b.w,b.h);ctx.restore();
    // drawing head
    if(drawT>0&&drawT<1){const hx=b.x+b.w*drawT;ctx.fillStyle='rgba(255,138,87,.9)';ctx.fillRect(hx-1,0,2,H)}
  }
  // scan line glow
  if(riseT>0&&riseT<1){
    const g=ctx.createLinearGradient(0,scanY-60,0,scanY+4);
    g.addColorStop(0,'rgba(232,98,44,0)');g.addColorStop(1,'rgba(232,98,44,.35)');
    ctx.fillStyle=g;ctx.fillRect(0,scanY-60,W,64);
    ctx.fillStyle='#FF8A57';ctx.fillRect(0,scanY-1,W,2);
  }
  if(readout){
    const on=riseT>0&&riseT<1;readout.style.opacity=on?1:0;
    if(on){readout.style.top=scanY+'px';const lvl=Math.round(riseT*12);readout.textContent='LEVEL '+String(lvl).padStart(2,'0')+'  ·  +'+(lvl*3.6).toFixed(1)+' M';}
  }
  if(gridEl)gridEl.style.setProperty('--grid',String(1-seg(p,.6,.9)*.8));
}

function playIntro(){if(REDUCE)return;const t0=performance.now();(function f(t){intro=clamp((t-t0)/2200,0,1);draw(cur,true);if(intro<1)requestAnimationFrame(f)})(t0)}

/* ---------- frames mode: pre-rendered image sequence from the hero video ---------- */
let frames=[],fCount=0,fLoaded=0,fFailed=0,lastIdx=-1;
function loadFrames(){
  const small=innerWidth<760&&sec.dataset.framesMobile;
  const pat=small?sec.dataset.framesMobile:sec.dataset.frames;
  fCount=+(small?(sec.dataset.countMobile||sec.dataset.count):sec.dataset.count)||0;
  if(!pat||!fCount){mode='blueprint';loadBlueprint();return}
  const order=[];for(let s=16;s>=1;s=s>>1)for(let i=0;i<fCount;i+=s)if(!order.includes(i))order.push(i); // coarse → fine
  order.forEach((i,k)=>{const im=new Image();im.decoding='async';
    im.onload=()=>{fLoaded++;if(k<2)draw(cur,true)};
    im.onerror=()=>{if(++fFailed>fCount*.2&&mode==='frames'){mode='blueprint';loadBlueprint()}};
    setTimeout(()=>{im.src=pat.replace('{i}',String(i+1).padStart(3,'0'))},k<8?0:k*6);
    frames[i]=im});
}
function nearestLoaded(i){for(let d=0;d<fCount;d++){const a=frames[i-d],b=frames[i+d];if(a&&a.complete&&a.naturalWidth)return a;if(b&&b.complete&&b.naturalWidth)return b}return null}
function drawFrames(p,force){
  const idx=Math.round(clamp(p/.9,0,1)*(fCount-1));
  if(idx===lastIdx&&!force)return;lastIdx=idx;
  const im=nearestLoaded(idx);if(!im)return;
  const r=cover(im,1+0.04*seg(p,.9,1));ctx.drawImage(im,r.x,r.y,r.w,r.h);
  if(readout)readout.style.opacity=0;
}

function draw(p,force){ if(mode==='frames')drawFrames(p,force);else drawBlueprint(p) }

function progress(){
  const r=sec.getBoundingClientRect();const total=r.height-innerHeight;
  return clamp(total>0?-r.top/total:0,0,1);
}
function setBeats(p){
  beats.forEach(b=>{const on=p>=+b.dataset.from&&p<(+b.dataset.to||1.01);b.classList.toggle('on',on);b.setAttribute('aria-hidden',on?'false':'true')});
  if(fill)fill.style.transform='scaleX('+p+')';
}
function tick(){
  raf=0;cur+=(target-cur)*.14;if(Math.abs(target-cur)<.0005)cur=target;
  draw(cur);setBeats(cur);
  if(cur!==target)raf=requestAnimationFrame(tick);
}
function onScroll(){target=progress();if(!raf)raf=requestAnimationFrame(tick)}

if(REDUCE){ // static final frame, no scrubbing
  mode==='frames'?(loadFrames()):loadBlueprint();cur=target=1;
  addEventListener('resize',resize);resize();setBeats(1);return;
}
mode==='frames'?loadFrames():loadBlueprint();
addEventListener('scroll',onScroll,{passive:true});
addEventListener('resize',()=>{resize();onScroll()});
resize();target=cur=progress();setBeats(cur);draw(cur,true);
})();
