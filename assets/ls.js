(function(){
'use strict';
const d=document,REDUCE=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=(s,c=d)=>c.querySelector(s),$$=(s,c=d)=>[...c.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const head=$('.site-head');let lastY=scrollY;
function headState(){
const y=scrollY,hero=$('.hero-scroll'),ph=$('.page-head');
const limit=hero?hero.offsetHeight-innerHeight*1.02:(ph?ph.offsetHeight-90:10);
head.classList.toggle('solid',y>limit);
head.classList.toggle('hide',y>lastY&&y>200&&!d.body.classList.contains('menu-open')&&!(hero&&y<limit));
lastY=y;
}
addEventListener('scroll',headState,{passive:true});headState();
const mb=$('.menu-btn');
if(mb)mb.addEventListener('click',()=>{const o=d.body.classList.toggle('menu-open');mb.setAttribute('aria-expanded',o)});
$$('.mobile-menu a').forEach(a=>a.addEventListener('click',()=>d.body.classList.remove('menu-open')));
addEventListener('keydown',e=>{if(e.key==='Escape')d.body.classList.remove('menu-open')});
if('IntersectionObserver' in window){
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});
$$('.rv,.line-draw').forEach(el=>io.observe(el));
}else $$('.rv,.line-draw').forEach(el=>el.classList.add('in'));
$$('[data-count-to]').forEach(el=>{
const to=+el.dataset.countTo,fmt=v=>String(Math.round(v));
if(REDUCE){el.textContent=el.dataset.final||fmt(to);return}
const io=new IntersectionObserver(es=>{if(!es[0].isIntersecting)return;io.disconnect();
const from=+(el.dataset.from||0),t0=performance.now(),dur=1600;
(function step(t){const k=clamp((t-t0)/dur,0,1),e=1-Math.pow(1-k,4);el.textContent=fmt(from+(to-from)*e);if(k<1)requestAnimationFrame(step);else if(el.dataset.final)el.textContent=el.dataset.final})(t0)},{threshold:.6});
io.observe(el);
});
const words=[];
$$('.wfill').forEach(p=>{const hot=(p.dataset.hot||'').split('|').filter(Boolean);
const parts=p.textContent.split(/(\s+)/);p.textContent='';
parts.forEach(t=>{if(!t.trim()){p.appendChild(d.createTextNode(t));return}
const s=d.createElement('span');s.className='w';s.textContent=t;
if(hot.some(h=>t.toLowerCase().includes(h)))s.classList.add('hot');p.appendChild(s);words.push(s)})});
const wbox=$('.wfill-box');if(REDUCE)words.forEach(w=>w.classList.add('lit'));
const hs=$('.hscroll'),track=hs&&$('.hs-track',hs),bar=hs&&$('.hs-progress i',hs);
function hsSize(){if(!hs)return;if(innerWidth<760||REDUCE){hs.style.height='';track.style.transform='';hs.classList.add('flat');return}
hs.classList.remove('flat');const extra=track.scrollWidth-innerWidth;hs.style.height=(innerHeight+Math.max(0,extra))+'px'}
const peek=$('.sector-peek');
if(peek&&matchMedia('(hover:hover)').matches){
let px=0,py=0,tx=0,ty=0,run=false;
function mv(){px+=(tx-px)*.18;py+=(ty-py)*.18;peek.style.left=px+'px';peek.style.top=py+'px';if(run)requestAnimationFrame(mv)}
$$('.sector').forEach(s=>{
s.addEventListener('mouseenter',()=>{peek.style.backgroundImage='url("'+s.dataset.img+'")';peek.classList.add('on');if(!run){run=true;mv()}});
s.addEventListener('mouseleave',()=>{peek.classList.remove('on');run=false});
s.addEventListener('mousemove',e=>{tx=e.clientX+190;ty=e.clientY});
});
}
const phbg=$('.page-head .bg');
let raf=0;
function frame(){raf=0;const vh=innerHeight;
if(wbox&&words.length&&!REDUCE){const r=wbox.getBoundingClientRect();if(r.top<vh&&r.bottom>0){
const p=clamp((vh*.82-r.top)/(r.height*.8),0,1),n=Math.floor(p*words.length*1.04);words.forEach((w,i)=>w.classList.toggle('lit',i<n))}}
if(hs&&!hs.classList.contains('flat')){const r=hs.getBoundingClientRect(),tot=r.height-vh,p=clamp(tot>0?-r.top/tot:0,0,1);
track.style.transform='translate3d('+(-p*(track.scrollWidth-innerWidth))+'px,0,0)';if(bar)bar.style.transform='scaleX('+p+')'}
if(phbg&&!REDUCE){const y=scrollY;if(y<vh)phbg.style.transform='translate3d(0,'+(y*.25)+'px,0)'}
}
function kick(){if(!raf)raf=requestAnimationFrame(frame)}
addEventListener('scroll',kick,{passive:true});
addEventListener('resize',()=>{hsSize();kick()});
addEventListener('load',()=>{hsSize();kick()});hsSize();kick();
const toc=$$('.toc a');
if(toc.length){const map=new Map(toc.map(a=>[a.getAttribute('href').slice(1),a]));
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){toc.forEach(a=>a.classList.remove('on'));const a=map.get(e.target.id);if(a)a.classList.add('on')}}),{rootMargin:'-30% 0px -60% 0px'});
map.forEach((a,id)=>{const el=d.getElementById(id);if(el)io.observe(el)})}
const grid=$('.proj-grid'),q=$('#q'),cnt=$('.count b'),empty=$('.empty');
if(grid&&q){const cards=$$('.proj',grid);
function filter(){const v=q.value.trim().toLowerCase();let n=0;
cards.forEach(c=>{const hit=!v||c.dataset.search.includes(v);c.classList.toggle('hidden',!hit);if(hit)n++});
if(cnt)cnt.textContent=n;if(empty)empty.style.display=n?'none':'block'}
q.addEventListener('input',filter);
$$('.toggle button').forEach(b=>b.addEventListener('click',()=>{$$('.toggle button').forEach(x=>x.setAttribute('aria-pressed',x===b));grid.classList.toggle('list',b.dataset.view==='list')}));
}
if(location.hash){const t=d.getElementById(location.hash.slice(1));if(t&&t.classList.contains('proj')){t.style.outline='2px solid var(--signal)';t.style.outlineOffset='10px';setTimeout(()=>{t.style.outline=''},2600)}}
const lb=$('.lb');
if(lb){const img=$('.lb-stage img',lb),title=$('.lb-top b',lb),pos=$('.lb-pos',lb),th=$('.lb-thumbs',lb);let list=[],i=0,opener=null;
function show(k){i=(k+list.length)%list.length;img.src=list[i];img.alt=title.textContent+' — photo '+(i+1);pos.textContent=(i+1)+' / '+list.length;
$$('img',th).forEach((t,j)=>t.classList.toggle('on',j===i));const on=$('img.on',th);if(on)on.scrollIntoView({block:'nearest',inline:'center'});
const nx=new Image();nx.src=list[(i+1)%list.length]}
function open(btn){opener=btn;list=JSON.parse(btn.dataset.photos);title.textContent=btn.dataset.title;th.innerHTML='';
list.forEach((s,j)=>{const t=d.createElement('img');t.src=s.replace(/-ls-consulting\.webp$/,'-thumb-ls-consulting.webp');t.onerror=()=>{t.onerror=null;t.src=s};t.alt='';t.addEventListener('click',()=>show(j));th.appendChild(t)});
lb.classList.add('open');d.body.style.overflow='hidden';show(0);$('.close',lb).focus()}
function close(){lb.classList.remove('open');d.body.style.overflow='';if(opener)opener.focus()}
$$('[data-photos]').forEach(b=>b.addEventListener('click',()=>open(b)));
$('.close',lb).addEventListener('click',close);$('.prev',lb).addEventListener('click',()=>show(i-1));$('.next',lb).addEventListener('click',()=>show(i+1));
addEventListener('keydown',e=>{if(!lb.classList.contains('open'))return;if(e.key==='Escape')close();if(e.key==='ArrowLeft')show(i-1);if(e.key==='ArrowRight')show(i+1)});
let sx=0;lb.addEventListener('touchstart',e=>{sx=e.touches[0].clientX},{passive:true});
lb.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>50)show(i+(dx<0?1:-1))});
}
const form=$('#contact-form');
if(form){const st=$('.form-status',form);
form.addEventListener('submit',async e=>{e.preventDefault();st.className='form-status';st.textContent='Sending…';
const data=Object.fromEntries(new FormData(form).entries());
try{const r=await fetch(form.action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const j=await r.json();
if(j.success){st.classList.add('ok');st.textContent='Thank you, your message has been sent. We will be in touch shortly.';form.reset()}
else{st.classList.add('err');st.textContent=j.error||'Something went wrong. Please email mail@lsgauteng.co.za.'}}
catch(err){st.classList.add('err');st.textContent='Could not send right now. Please email mail@lsgauteng.co.za or call +27 11 463 4020.'}});
}
d.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
})();
(function(){
'use strict';
const d=document,html=d.documentElement,REDUCE=matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE=matchMedia('(hover:hover) and (pointer:fine)').matches;
const $=(s,c=d)=>c.querySelector(s),$$=(s,c=d)=>[...c.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const IO=(cb,opt)=>'IntersectionObserver' in window?new IntersectionObserver(cb,opt):null;
if(!REDUCE){
d.addEventListener('click',e=>{
const a=e.target.closest('a');if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
const href=a.getAttribute('href');if(!href||a.target==='_blank'||a.hasAttribute('download')||href.startsWith('#')||href.startsWith('mailto:')||href.startsWith('tel:'))return;
const u=new URL(a.href,location.href);if(u.origin!==location.origin||/\.(pdf|zip|jpe?g|png|webp)$/i.test(u.pathname))return;
if(u.pathname===location.pathname&&u.hash)return;
e.preventDefault();html.classList.add('leaving');setTimeout(()=>{location.href=a.href},480);
});
addEventListener('pageshow',e=>{if(e.persisted)html.classList.remove('leaving')});
}
function splitEl(el){
let i=0;
(function walk(n){[...n.childNodes].forEach(c=>{
if(c.nodeType===3){const frag=d.createDocumentFragment();
c.textContent.split(/(\s+)/).forEach(t=>{if(!t)return;if(!t.trim()){frag.appendChild(d.createTextNode(t));return}
const w=d.createElement('span');w.className='wd';const s=d.createElement('span');s.textContent=t;s.style.setProperty('--i',i++);w.appendChild(s);frag.appendChild(w)});
c.replaceWith(frag)}
else if(c.nodeType===1&&c.tagName!=='BR')walk(c)})})(el);
el.classList.remove('rv');el.classList.add('split');
}
const splits=$$('.page-head h1,.sec-head h2,.cta-band h2,.prose h2,.director h2,.contact-grid h2,.foot-big');
if(!REDUCE)splits.forEach(splitEl);
const clips=$$('.split-img img,.two-col>div>img,.director figure,.cat-card,.proj .ph,.award-hero img,.person figure,.rw-mimg');
clips.forEach(el=>el.classList.add('clip'));
$$('.timeline>div').forEach((el,k)=>el.style.setProperty('--k',k));
$$('.chips').forEach(ul=>$$('li',ul).forEach((li,k)=>li.style.setProperty('--i',Math.min(k,24))));
const obs=IO(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');obs.unobserve(e.target)}}),{rootMargin:'0px 0px -10% 0px'});
const toWatch=[...splits,...clips,...$$('.sec-head,.timeline,.director>div')];
if(obs&&!REDUCE)toWatch.forEach(el=>{if(el.closest('.page-head')){requestAnimationFrame(()=>setTimeout(()=>el.classList.add('in'),350))}else obs.observe(el)});
else toWatch.forEach(el=>el.classList.add('in'));
const hp=$('.hprog');
function prog(){if(hp){const m=d.documentElement.scrollHeight-innerHeight;hp.style.setProperty('--p',m>0?scrollY/m:0)}}
const xh=$('.xhair');
if(xh&&FINE&&!REDUCE){
html.classList.add('has-xhair');const lab=$('span',xh);let x=-100,y=-100,tx=-100,ty=-100,run=0;
function mv(){x+=(tx-x)*.35;y+=(ty-y)*.35;xh.style.setProperty('--x',x+'px');xh.style.setProperty('--y',y+'px');
lab.textContent='X '+String(Math.round(tx)).padStart(4,'0')+'  Y '+String(Math.round(ty+scrollY)).padStart(5,'0');
run=(Math.abs(tx-x)+Math.abs(ty-y)>.3)?requestAnimationFrame(mv):0}
addEventListener('mousemove',e=>{tx=e.clientX;ty=e.clientY;xh.classList.add('on');
const t=e.target;xh.classList.toggle('hot',!!(t.closest&&t.closest('a,button,input,textarea,label,.stamp')));if(!run)run=requestAnimationFrame(mv)},{passive:true});
d.addEventListener('mouseleave',()=>xh.classList.remove('on'));
$$('iframe,.lb').forEach(f=>{f.addEventListener('mouseenter',()=>xh.classList.remove('on'))});
}
if(FINE&&!REDUCE)$$('.spot').forEach(s=>{
s.addEventListener('mousemove',e=>{const r=s.getBoundingClientRect();s.style.setProperty('--mx',(e.clientX-r.left)+'px');s.style.setProperty('--my',(e.clientY-r.top)+'px');s.classList.add('lit')},{passive:true});
s.addEventListener('mouseleave',()=>s.classList.remove('lit'));
});
if(FINE&&!REDUCE)$$('.btn,.nav-cta,.sector .go,.socials a').forEach(b=>{b.classList.add('mag');
b.addEventListener('mousemove',e=>{const r=b.getBoundingClientRect();b.style.transform='translate('+((e.clientX-r.left-r.width/2)*.22)+'px,'+((e.clientY-r.top-r.height/2)*.3)+'px)'});
b.addEventListener('mouseleave',()=>{b.style.transform=''})});
if(FINE&&!REDUCE)$$('.cat-card,.rw-frame,.fcard.f-bee .stamp').forEach(c=>{c.classList.add('tilt');
c.addEventListener('mousemove',e=>{const r=c.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;
c.classList.add('tilting');c.style.setProperty('--ry',(px*6)+'deg');c.style.setProperty('--rx',(-py*6)+'deg')});
c.addEventListener('mouseleave',()=>{c.classList.remove('tilting');c.style.setProperty('--ry','0deg');c.style.setProperty('--rx','0deg')})});
const svc=$$('.svc-list li');
if(svc.length&&!REDUCE){const so=IO(es=>es.forEach(e=>e.target.classList.toggle('on',e.isIntersecting)),{rootMargin:'-42% 0px -42% 0px'});if(so)svc.forEach(li=>so.observe(li));else svc.forEach(li=>li.classList.add('on'))}
else svc.forEach(li=>li.classList.add('on'));
const rw=$('.rw');
if(rw){const imgs=$$('.rw-img',rw),items=$$('.rw-item',rw),n=$('.rw-n',rw),bar=$('.rw-bar',rw);let cur=0;
function set(i){if(i===cur&&items[i].classList.contains('on'))return;
imgs.forEach((im,k)=>{im.classList.toggle('was',k===cur&&k!==i);im.classList.toggle('on',k===i);if(k!==i&&k!==cur)im.classList.remove('was')});
items.forEach((it,k)=>it.classList.toggle('on',k===i));cur=i;if(n)n.textContent=String(i+1).padStart(2,'0');if(bar)bar.style.setProperty('--p',(i+1)/items.length)}
items[0].classList.add('on');
const pre=IO(es=>{if(es[0].isIntersecting){imgs.forEach(im=>{im.loading='eager'});pre.disconnect()}},{rootMargin:'800px 0px'});if(pre)pre.observe(rw);
const ro=IO(es=>es.forEach(e=>{if(e.isIntersecting)set(+e.target.dataset.i)}),{rootMargin:'-45% 0px -45% 0px'});
if(ro)items.forEach(it=>ro.observe(it));
items.forEach(it=>it.addEventListener('mouseenter',()=>set(+it.dataset.i)));
}
const par=$$('.split-img img');
const mq=$('.mq-track');let mx=0,dir=1,vel=0,lastY=scrollY,mqRun=0,mqVis=false;
if(mq&&!REDUCE){const mo=IO(es=>{mqVis=es[0].isIntersecting;if(mqVis&&!mqRun)mqRun=requestAnimationFrame(mqTick)});if(mo)mo.observe(mq)}
function mqTick(){mqRun=0;if(!mqVis)return;const w=mq.scrollWidth/2;mx-=(0.6+Math.min(vel,40)*.25)*dir;vel*=.92;if(mx<-w)mx+=w;if(mx>0)mx-=w;mq.style.transform='translate3d('+mx+'px,0,0)';mqRun=requestAnimationFrame(mqTick)}
let raf=0;
function frame(){raf=0;prog();const y=scrollY,dy=y-lastY;lastY=y;if(dy){dir=dy>0?1:-1;vel=Math.abs(dy)}
if(par.length&&!REDUCE)par.forEach((im,k)=>{const r=im.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;im.style.transform='translate3d(0,'+(((r.top+r.height/2)-innerHeight/2)*(k===1?-.08:.05))+'px,0)'});
}
addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(frame)},{passive:true});frame();
const cnt=$('.count b'),q=$('#q');
if(cnt&&q)q.addEventListener('input',()=>{cnt.classList.remove('bump');void cnt.offsetWidth;cnt.classList.add('bump');setTimeout(()=>cnt.classList.remove('bump'),300)});
})();