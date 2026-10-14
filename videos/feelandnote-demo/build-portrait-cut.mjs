import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=import.meta.dirname,duration=12;
for(const file of ['index.html','frame.md','STORYBOARD.md']){
 const backup=path.join(root,'_backup',file.replace('.','-v5.'));
 if(!fs.existsSync(backup))fs.copyFileSync(path.join(root,file),backup);
}
const source=JSON.parse(fs.readFileSync(path.join(root,'assets/chains/source.json'),'utf8'));
const profiles=Object.fromEntries(source.profiles.map(p=>[p.slug,p]));
const slugs=['homer','alexander-the-great','julius-caesar','napoleon-bonaparte'];
const names=['호메로스','알렉산더','카이사르','나폴레옹'];
const english=['HOMER','ALEXANDER','CAESAR','NAPOLEON'];
const works=['일리아스','알렉산더 전기','갈리아 전기'];
const lines=['전장까지 건너간 이야기.','카이사르의 눈물로 이어진 삶.','다음 정복자의 책이 된 기록.','원정길에도 이어진 영감.'];
const fonts=fs.readFileSync(path.join(root,'assets/fonts.css'),'utf8').replaceAll('fonts/','assets/fonts/');
const logo='<span class="word">feel</span><span class="joiner">and</span><span class="word">note</span>';
const shots=slugs.map((slug,i)=>`<div id="portrait-shot-${i}" class="clip portrait-shot" data-start="${i*2.4}" data-duration="2.4" data-track-index="${i+1}" data-label="${names[i]} — 한 명의 등장">
 <div class="portrait-photo"><div class="portrait-arrival" data-layout-allow-overflow><img src="${profiles[slug].local}" alt="${profiles[slug].nickname}"/></div></div>
 <div class="portrait-english">${english[i]}</div><div class="name-window"><div class="portrait-name" data-layout-allow-overflow>${names[i]}</div></div>
 <div class="portrait-line">${lines[i]}</div>
 ${i<3?`<div class="outgoing-work">《${works[i]}》</div>`:''}
 ${i>0?`<div class="incoming-work">《${works[i-1]}》</div>`:''}
 </div>`).join('');
const motion=slugs.map((_,i)=>{
 const start=i*2.4,end=start+2.4,s='#portrait-shot-'+i;
 return `
 tl.fromTo('${s} .portrait-arrival',{x:180,y:44,scale:1.14},{x:0,y:0,scale:1,duration:.34,ease:'power4.out',immediateRender:false},${start});
 tl.to('${s} .portrait-arrival',{x:-18,scale:1.025,duration:1.65,ease:'none'},${start+.34});
 tl.fromTo('${s} .portrait-name',{y:155},{y:0,duration:.29,ease:'power4.out',immediateRender:false},${start+.04});
 tl.fromTo('${s} .portrait-english',{opacity:0,x:30},{opacity:1,x:0,duration:.22,ease:'power3.out',immediateRender:false},${start+.08});
 tl.fromTo('${s} .portrait-line',{opacity:0,y:18},{opacity:1,y:0,duration:.28,ease:'power3.out',immediateRender:false},${start+.32});
 ${i>0?`tl.set('${s} .incoming-work',{x:0,y:0,scale:1},${start});`:''}
 ${i<3?`tl.fromTo('${s} .outgoing-work',{opacity:0,y:18},{opacity:1,y:0,duration:.26,ease:'power2.out',immediateRender:false},${start+.6});
 tl.to('${s} .portrait-name,${s} .portrait-english,${s} .portrait-line,${s} .incoming-work',{opacity:0,duration:.13,ease:'power2.in'},${end-.63});
 tl.to('${s} .outgoing-work',{x:0,y:-380,scale:.625,duration:.5,ease:'power3.inOut'},${end-.5});`:''}
 tl.to('${s} .portrait-arrival',{x:-82,scale:1.06,duration:.32,ease:'power2.in'},${end-.32});
 `;
}).join('');
const sub=`<template><style>${fonts}
*{box-sizing:border-box}#root{position:relative;width:100%;height:100%;overflow:hidden;background:#121110;color:#e8e6e1;font-family:'Pretendard Variable',sans-serif}
.portrait-atmosphere{position:absolute;inset:0;background:radial-gradient(ellipse at 76% 48%,#30291d 0%,#121110 59%)}
.portrait-shot{position:absolute;inset:0;width:1920px;height:1080px}
.portrait-photo{position:absolute;left:950px;top:80px;width:960px;height:960px}
.portrait-arrival{width:960px;height:960px;transform-origin:50% 46%}
.portrait-arrival img{display:block;width:960px;height:960px;object-fit:contain}
.portrait-english{position:absolute;left:160px;top:350px;font-size:29px;line-height:1.2;letter-spacing:.18em;color:#b4afa3;font-weight:500;opacity:0}
.name-window{position:absolute;left:150px;top:407px;width:760px;height:169px;overflow:hidden}
.portrait-name{font-size:137px;line-height:1.15;font-weight:800;letter-spacing:-.045em;white-space:nowrap}
.portrait-line{position:absolute;left:160px;top:599px;font-size:35px;line-height:1.3;letter-spacing:-.025em;color:#b4afa3;font-weight:400;opacity:0}
.outgoing-work{position:absolute;left:160px;top:675px;font-size:48px;line-height:1.2;letter-spacing:-.025em;color:#d4af37;font-weight:600;white-space:nowrap;transform-origin:0 0;opacity:0}
.incoming-work{position:absolute;left:160px;top:295px;font-size:30px;line-height:1.2;letter-spacing:-.025em;color:#d4af37;font-weight:600;white-space:nowrap;transform-origin:0 0}
.brand{display:inline-flex;align-items:baseline;line-height:.9;white-space:nowrap;color:#f5f0e8}.word{font-weight:800;letter-spacing:.055em}.joiner{margin:0 .04em;color:#d4a828;font-size:.82em;font-weight:500;letter-spacing:.06em}
.portrait-header{position:absolute;left:160px;top:125px;font-size:27px;font-weight:500;line-height:1.2;letter-spacing:.1em;color:#d4af37}
.portrait-brand{position:absolute;left:160px;top:935px;font-size:34px}
.portrait-close{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0}
.portrait-close .brand{font-size:142px}
.portrait-tagline{font-size:45px;line-height:1.2;font-weight:500;letter-spacing:.01em;margin-top:44px}
.portrait-site{font-size:30px;line-height:1.2;letter-spacing:.04em;color:#b4afa3;margin-top:30px}
</style><div id="root" data-composition-id="portrait-relay" data-duration="12" data-width="1920" data-height="1080">
<div id="portrait-base" class="clip" data-start="0" data-duration="12" data-track-index="0"><div class="portrait-atmosphere"></div></div>
${shots}
<div id="portrait-head" class="clip" data-start="0" data-duration="9.6" data-track-index="5"><div class="portrait-header">영감의 연쇄</div><div class="portrait-brand brand">${logo}</div></div>
<div id="portrait-last" class="clip" data-start="9.6" data-duration="2.4" data-track-index="6"><div class="portrait-close"><div class="brand">${logo}</div><div class="portrait-tagline">한 줄의 기록, 천 년의 울림</div><div class="portrait-site">feelandnote.com</div></div></div>
</div><script>
const tl=gsap.timeline({paused:true});
tl.set('.portrait-name',{y:155},0);
${motion}
tl.fromTo('.portrait-close .brand',{scale:1.1,y:18,opacity:0},{scale:1,y:0,opacity:1,duration:.35,ease:'power4.out',immediateRender:false},9.6);
tl.fromTo('.portrait-tagline',{y:22,opacity:0},{y:0,opacity:1,duration:.32,ease:'power3.out',immediateRender:false},9.84);
tl.fromTo('.portrait-site',{opacity:0},{opacity:1,duration:.3,immediateRender:false},10.08);
window.__timelines['portrait-relay']=tl;
</script></template>`;
fs.writeFileSync(path.join(root,'compositions/frames/06-portrait-cut.html'),sub);
const timing=JSON.parse(fs.readFileSync(path.join(root,'assets/impact/timing.json'),'utf8')),cues=[];
function cue(name,at,volume){const m=timing[name];cues.push({src:m.hitPath,start:at-m.peakAt,duration:m.hitDuration,volume,name,at});}
for(const at of [.18,2.58,4.98,7.38,9.78])cue('bass',at,.72);
for(const at of [2.36,4.76,7.16,9.56])cue('whoosh',at,.23);
const mix=new Float32Array(duration*48000*2),cache=new Map();
for(const c of cues){
 if(!cache.has(c.src)){const raw=execFileSync('ffmpeg',['-v','error','-i',path.join(root,c.src),'-ac','2','-ar','48000','-f','f32le','pipe:1']);cache.set(c.src,new Float32Array(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)));}
 const pcm=cache.get(c.src),start=Math.round(c.start*48000)*2;for(let i=0;i<pcm.length&&start+i<mix.length;i++)mix[start+i]+=pcm[i]*c.volume;
}
let peak=0;for(const s of mix)peak=Math.max(peak,Math.abs(s));const gain=Math.min(1,.75/peak),ends=[];
cues.sort((a,b)=>a.start-b.start);
const audio=cues.map((c,i)=>{let lane=ends.findIndex(e=>e<=c.start);if(lane<0)lane=ends.length;ends[lane]=c.start+c.duration;return `<audio id="portrait-sound-${i}" src="${c.src}" data-start="${c.start.toFixed(3)}" data-duration="${c.duration}" data-track-index="${10+lane}" data-volume="${(c.volume*gain).toFixed(5)}" data-label="${c.name} · ${c.at.toFixed(2)}s"></audio>`;}).join('');
fs.writeFileSync(path.join(root,'index.html'),`<!doctype html><html lang="ko"><head><meta charset="UTF-8"/><meta name="viewport" content="width=1920,height=1080"/><script src="assets/gsap.min.js"></script><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:1920px;height:1080px;overflow:hidden;background:#121110}#root{position:relative;width:100%;height:100%;overflow:hidden}.scene{position:absolute;inset:0}</style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="12" data-width="1920" data-height="1080"><div id="portrait-relay" class="clip scene" data-composition-id="portrait-relay" data-composition-src="compositions/frames/06-portrait-cut.html" data-start="0" data-duration="12" data-track-index="1" data-track-kind="graphics" data-label="영감의 연쇄 — 한 명씩 등장"></div>${audio}</div><script>window.__timelines['main']=gsap.timeline({paused:true});</script></body></html>`);
fs.writeFileSync(path.join(root,'frame.md'),`---\nname: Feel&Note — 한 명씩 이어지는 영감\ncolors:\n  background: "#121110"\n  foreground: "#e8e6e1"\n  accent: "#d4af37"\n  logoCream: "#f5f0e8"\n  logoGold: "#d4a828"\ntypography:\n  family: Pretendard Variable\n  headlineWeight: 800\n---\n\n사용자 방향: 한 명씩만 보이면서 튀어나오는 즐거움. 신전의 건축 재현이 아니라 인물의 등장에 집중한다. 큰 초상 한 명과 큰 이름을 보여주고 작품명은 다음 컷으로 이어진다. 호메로스·알렉산더·카이사르·나폴레옹을 각각 2.4초씩 보여준 뒤 서비스 로고로 끝낸다.\n`);
const board=path.join(root,'STORYBOARD.md'),old=fs.readFileSync(board,'utf8').split('\n## 한 명씩 등장 수정')[0];
fs.writeFileSync(board,old+'\n## 한 명씩 등장 수정\n\n사용자: “난 그냥 한명씩만 보이게 하는 방식에서 튀어나오는 즐거움을 주려 했는데”\n\n12초 수정본. 한 화면에 인물 한 명만 등장한다. 0·2.4·4.8·7.2초에 호메로스·알렉산더·카이사르·나폴레옹을 큰 초상과 이름으로 교체한다. 작품명이 위로 이동한 위치를 다음 컷에 그대로 남겨 받은 작품을 나타낸다. 9.6초부터 실제 서비스 로고와 문구를 보여준다. 소스: compositions/frames/06-portrait-cut.html.\n');
console.log('Built a 12-second portrait-led relay: exactly one person per shot, three work-title handoffs, no gallery.');
