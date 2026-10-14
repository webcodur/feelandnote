import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=import.meta.dirname;
const duration=20;
const source=JSON.parse(fs.readFileSync(path.join(root,'assets/chains/source.json'),'utf8'));
const profiles=Object.fromEntries(source.profiles.map(p=>[p.slug,p]));
const rows=source.chains.map(chain=>[chain[0].author,...chain.map(s=>s.reader)]);
const works=[['일리아스','알렉산더 전기','갈리아 전기'],['신곡','데카메론','셰익스피어 희곡']];
const names=['호메로스','알렉산더','카이사르','나폴레옹','단테','보카치오','셰익스피어','링컨'];
const arrivals=[[.32,2.3,4.4,6.5],[8.8,10.7,12.8,14.9]];
const fonts=fs.readFileSync(path.join(root,'assets/fonts.css'),'utf8').replaceAll('fonts/','assets/fonts/');
for(const file of ['index.html','frame.md','STORYBOARD.md']){
 const backup=path.join(root,'_backup',file.replace('.','-v3.'));
 if(!fs.existsSync(backup))fs.copyFileSync(path.join(root,file),backup);
}
const logo='<span class="word">feel</span><span class="joiner">and</span><span class="word">note</span>';
// The architecture belongs to each chain, so moving a completed chain moves
// its colonnade with it instead of turning people into floating UI cards.
const architecture=`<svg class="temple" viewBox="0 0 1920 1080" aria-hidden="true"><defs><linearGradient id="stone" x1="0" x2="1"><stop stop-color="#181715"/><stop offset=".38" stop-color="#373329"/><stop offset=".6" stop-color="#23211c"/><stop offset="1" stop-color="#151411"/></linearGradient><linearGradient id="vault" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#353024"/><stop offset="1" stop-color="#151410"/></linearGradient></defs>
 <path d="M 65 175 H 1855 V 212 H 65 Z" fill="url(#stone)"/><path d="M 65 180 H 1855 M 85 201 H 1835" stroke="#766344" stroke-width="2" opacity=".7"/>
 ${[310,750,1190,1630].map(x=>`<path d="M ${x-165} 762 V 418 A 165 165 0 0 1 ${x+165} 418 V 762" fill="url(#vault)" stroke="#564b38" stroke-width="12"/><path d="M ${x-147} 745 V 418 A 147 147 0 0 1 ${x+147} 418 V 745" fill="#151411" stroke="#3c3529" stroke-width="3"/><path d="M ${x-140} 385 A 144 144 0 0 1 ${x+140} 385" fill="none" stroke="#b0955d" stroke-width="1.5" opacity=".6"/>`).join('')}
 ${[85,530,970,1410,1855].map(x=>`<path d="M ${x-33} 244 H ${x+33} L ${x+28} 767 H ${x-28} Z" fill="url(#stone)" stroke="#40382a" stroke-width="2"/><path d="M ${x-17} 263 V 750 M ${x} 263 V 750 M ${x+17} 263 V 750" stroke="#534936" stroke-width="2" opacity=".55"/><path d="M ${x-45} 220 H ${x+45} V 242 H ${x-45} Z M ${x-38} 243 H ${x+38} V 254 H ${x-38} Z M ${x-42} 767 H ${x+42} V 791 H ${x-42} Z" fill="url(#stone)" stroke="#534936" stroke-width="2"/>`).join('')}
 <path d="M 65 791 H 1855 L 1895 813 H 25 Z M 25 824 H 1895 L 1920 843 H 0 Z" fill="#28251e" stroke="#5b4d34" stroke-width="1.5"/>
 </svg>`;
const rowMarkup=rows.map((row,r)=>`<div class="relay-row row-${r}">
 ${architecture.replaceAll('id="stone"',`id="stone-${r}"`).replaceAll('id="vault"',`id="vault-${r}"`).replaceAll('url(#stone)',`url(#stone-${r})`).replaceAll('url(#vault)',`url(#vault-${r})`)}
 <svg class="relay-paths" viewBox="0 0 1920 1080" aria-hidden="true">
 ${[0,1,2].map(i=>`<path class="unlit" d="M ${310+i*440} 835 H ${750+i*440}"/><path id="route-${r}-${i}" class="lit" d="M ${310+i*440} 835 H ${750+i*440}"/><path id="tip-${r}-${i}" class="tip" d="M ${737+i*440} 826 L ${750+i*440} 835 L ${737+i*440} 844"/>`).join('')}
 </svg>
 ${row.map((slug,i)=>`<div class="person" id="person-${r}-${i}" style="left:${135+i*440}px"><div class="person-light"><div class="light-shaft"></div></div><div class="plinth"></div><div class="portrait-wrap"><img class="face" src="${profiles[slug].local}" alt="${profiles[slug].nickname}"/></div><div class="person-name">${names[r*4+i]}</div><div class="focus-rule"></div></div>`).join('')}
 ${works[r].map((work,i)=>`<div id="baton-${r}-${i}" class="baton" style="left:${145+i*440}px"><span class="baton-book">${work}</span><span class="baton-trail"></span></div><div id="work-${r}-${i}" class="work" style="left:${360+i*440}px">${work}</div>`).join('')}
 </div>`).join('');
const sub=`<template><style>
${fonts}
*{box-sizing:border-box}
#root{position:relative;width:100%;height:100%;overflow:hidden;background:#121110;color:#e8e6e1;font-family:'Pretendard Variable',sans-serif}
.ground{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%,#29251d 0%,#121110 70%)}
.ceiling-light{position:absolute;left:0;top:0;width:1920px;height:1080px;pointer-events:none;background:radial-gradient(ellipse at 50% 0%,rgba(212,175,55,.12),transparent 65%)}
.floor{position:absolute;left:0;top:940px;width:1920px;height:140px;fill:none;stroke:#524632;stroke-width:1;opacity:.6}
.temple{position:absolute;inset:0;width:1920px;height:1080px}
.brand{display:inline-flex;align-items:baseline;line-height:.9;white-space:nowrap;color:#f5f0e8}
.brand .word{font-weight:800;letter-spacing:.055em}
.brand .joiner{margin:0 .04em;color:#d4a828;font-size:.82em;font-weight:500;letter-spacing:.06em}
.small-brand{position:absolute;right:135px;top:53px;font-size:35px}
.eyebrow{position:absolute;left:140px;top:48px;color:#d4af37;font-size:29px;font-weight:600;letter-spacing:.1em}
.heading{position:absolute;left:140px;top:102px;width:1640px;text-align:center;font-size:61px;line-height:1.18;letter-spacing:.035em;font-weight:700}
.heading strong{color:#d4af37;font-weight:800}
.relay-stage{position:absolute;inset:0}
.relay-row{position:absolute;inset:0;width:1920px;height:1080px;transform-origin:960px 540px}
.row-1{opacity:0}
.person{position:absolute;top:340px;width:350px;height:430px;text-align:center;transform-origin:175px 205px}
.portrait-wrap{position:relative;width:350px;height:350px}
.face{display:block;width:350px;height:350px;object-fit:contain}
.person-light{position:absolute;left:-70px;top:-60px;width:490px;height:475px;background:radial-gradient(ellipse,rgba(212,175,55,.24),transparent 65%);opacity:0}
.light-shaft{position:absolute;left:80px;top:-130px;width:330px;height:560px;clip-path:polygon(47% 0,53% 0,100% 100%,0 100%);background:linear-gradient(180deg,rgba(232,214,169,.32),rgba(212,175,55,.02))}
.plinth{position:absolute;left:24px;top:350px;width:302px;height:102px;background:linear-gradient(100deg,#1e1c18,#433b2c 48%,#201e19);border-top:3px solid #8f7750;border-bottom:8px solid #3c3427}
.person-name{position:relative;font-size:37px;font-weight:700;line-height:1.2;margin-top:21px;letter-spacing:-.025em;white-space:nowrap}
.focus-rule{position:absolute;left:147px;top:415px;width:56px;height:3px;background:#d4af37;opacity:0}
.relay-paths{position:absolute;inset:0;width:1920px;height:1080px;fill:none}
.unlit{stroke:#5b5138;stroke-width:2;opacity:.5}
.lit,.tip{stroke:#d4af37;stroke-width:3}
.tip{opacity:0}
.baton{position:absolute;top:798px;width:330px;height:74px;display:flex;align-items:center;justify-content:center;opacity:0}
.baton-book{position:relative;z-index:1;font-size:30px;font-weight:600;letter-spacing:.02em;line-height:1.2;color:#f5f0e8;padding:16px 30px;background:#121110;white-space:nowrap;text-shadow:0 0 30px rgba(212,175,55,.6)}
.baton-trail{position:absolute;left:-85px;right:165px;top:36px;height:3px;background:linear-gradient(90deg,transparent,#d4af37);opacity:.85}
.work{position:absolute;top:867px;width:340px;text-align:center;font-size:27px;line-height:1.3;color:#d4af37;font-weight:500;letter-spacing:-.025em;opacity:0}
.second-heading{position:absolute;left:180px;top:370px;width:1560px;text-align:center;font-size:49px;line-height:1.2;font-weight:700;letter-spacing:-.035em;opacity:0}
.second-heading strong{color:#d4af37;font-weight:700}
.ending{position:absolute;left:420px;top:445px;width:1080px;text-align:center;display:flex;flex-direction:column;align-items:center;opacity:0}
.ending .brand{font-size:90px}
.tagline{font-size:29px;letter-spacing:-.02em;margin-top:18px;line-height:1.2}
.site{font-size:24px;letter-spacing:.02em;color:#aaa7a0;margin-top:8px;line-height:1.2}
</style>
<div id="root" data-composition-id="chain-relay" data-duration="${duration}" data-width="1920" data-height="1080">
 <div id="relay-ground" class="clip ground" data-start="0" data-duration="${duration}" data-track-index="0"><div class="ceiling-light"></div><svg class="floor" viewBox="0 0 1920 140"><path d="M 0 0 H 1920 M 0 40 H 1920 M 0 100 H 1920 M 181 0 L 0 140 M 522 0 L 420 140 M 1398 0 L 1500 140 M 1739 0 L 1920 140"/></svg></div>
 <div id="relay-people" class="clip" data-start="0" data-duration="${duration}" data-track-index="1"><div class="relay-stage">${rowMarkup}</div></div>
 <div id="relay-head" class="clip" data-start="0" data-duration="${duration}" data-track-index="2"><div class="eyebrow">영감의 연쇄</div><div class="small-brand brand">${logo}</div><div class="heading">한 줄의 기록, <strong>천 년의 울림</strong></div><div class="second-heading">창작물은 또 다른 누군가의 <strong>인생을 바꾼다.</strong></div></div>
 <div id="relay-close" class="clip" data-start="16.3" data-duration="3.7" data-track-index="3"><div class="ending"><div class="brand">${logo}</div><div class="tagline">한 줄의 기록, 천 년의 울림</div><div class="site">feelandnote.com</div></div></div>
</div><script>
const tl=gsap.timeline({paused:true});
const arrivals=${JSON.stringify(arrivals)};
// Every chain has four visible people. A receiving person comes forward only
// when the travelling work reaches them; no spring, rotation or cartoon flash.
tl.set('.person',{opacity:.56,scale:.83,y:14},0);
tl.fromTo('.ceiling-light',{opacity:.6},{opacity:1,duration:20,ease:'none'},0);
tl.fromTo('.heading',{opacity:0,y:24},{opacity:1,y:0,duration:.5,ease:'power3.out'},0);
function receive(row,index,at){
 const person='#person-'+row+'-'+index;
 if(index>0){
  const previous='#person-'+row+'-'+(index-1);
  tl.to(previous,{scale:.86,y:12,opacity:.7,duration:.36,ease:'power3.inOut'},at-.14);
  tl.to(previous+' .person-light',{opacity:.18,duration:.3},at-.14);
  tl.to(previous+' .focus-rule',{opacity:0,duration:.2},at-.14);
 }
 tl.to(person,{scale:1.4,y:-24,opacity:1,duration:.28,ease:'expo.out'},at-.1);
 tl.fromTo(person+' .face',{scale:1.18,y:28},{scale:1,y:0,duration:.62,ease:'power4.out',immediateRender:false},at-.1);
 tl.to(person+' .person-light',{opacity:1,duration:.26,ease:'power3.out'},at-.1);
 tl.to(person+' .focus-rule',{opacity:1,duration:.12},at+.05);
}
for(let row=0;row<2;row++){
 receive(row,0,arrivals[row][0]);
 for(let i=0;i<3;i++){
  const at=arrivals[row][i+1],start=at-.82;
  const baton='#baton-'+row+'-'+i,route=document.querySelector('#route-'+row+'-'+i);
  const length=route.getTotalLength();route.style.strokeDasharray=length;route.style.strokeDashoffset=length;
  tl.fromTo(baton,{x:0,y:0,opacity:0},{x:0,y:0,opacity:1,duration:.12,immediateRender:false},start);
  tl.to(baton,{x:440,duration:.7,ease:'power2.inOut'},start+.12);
  tl.to(route,{strokeDashoffset:0,duration:.7,ease:'power2.inOut'},start+.12);
  tl.to('#tip-'+row+'-'+i,{opacity:1,duration:.08},at);
  receive(row,i+1,at);
  tl.to(baton,{opacity:0,duration:.16},at+.1);
  tl.to('#work-'+row+'-'+i,{opacity:1,duration:.26},at+.16);
 }
}
// The first completed chain stays overhead as the second baton relay begins.
tl.to('.heading',{opacity:0,y:-20,duration:.35,ease:'power2.in'},7.65);
tl.to('.row-0 .person',{scale:1,y:0,opacity:1,duration:.35,ease:'power2.inOut'},7.75);
tl.to('.row-0 .person-light,.row-0 .focus-rule',{opacity:0,duration:.3},7.75);
tl.to('.row-0 .work',{opacity:0,duration:.25},7.75);
tl.to('.row-0',{scale:.48,y:-300,duration:.75,ease:'power3.inOut'},7.8);
tl.fromTo('.row-1',{scale:.83,y:190,opacity:0},{scale:.83,y:160,opacity:1,duration:.48,ease:'power3.out',immediateRender:false},8.15);
tl.to('.second-heading',{opacity:1,duration:.4},8.55);
// All eight remain around the service wordmark at the end.
tl.to('.second-heading',{opacity:0,y:-14,duration:.3},16.05);
tl.to('.row-1 .work',{opacity:0,duration:.3},16.05);
tl.to('.row-1 .person',{scale:1,y:0,opacity:1,duration:.4,ease:'power2.inOut'},16.1);
tl.to('.row-1 .person-light,.row-1 .focus-rule',{opacity:0,duration:.3},16.1);
tl.to('.row-0',{scale:.69,y:-265,duration:.75,ease:'power3.inOut'},16.15);
tl.to('.row-1',{scale:.69,y:290,duration:.75,ease:'power3.inOut'},16.15);
tl.to('.small-brand',{opacity:0,duration:.25},16.15);
tl.fromTo('.ending',{opacity:0,y:20},{opacity:1,y:0,duration:.65,ease:'power3.out',immediateRender:false},16.65);
window.__timelines['chain-relay']=tl;
</script></template>`;
fs.writeFileSync(path.join(root,'compositions/frames/04-relay.html'),sub);
const timing=JSON.parse(fs.readFileSync(path.join(root,'assets/impact/timing.json'),'utf8'));
const cues=[];
function cue(name,peak,volume){const m=timing[name];cues.push({name,start:Math.max(0,peak-m.peakAt),duration:m.hitDuration,volume,src:m.hitPath,peak});}
for(const row of arrivals){
 for(let i=0;i<row.length;i++){
  cue('bass',row[i],i===0?.43:.48);
  if(i>0)cue('whoosh',row[i]-.35,.17);
 }
}
const mix=new Float32Array(duration*48000*2),cache=new Map();
for(const c of cues){
 if(!cache.has(c.src)){
  const raw=execFileSync('ffmpeg',['-v','error','-i',path.join(root,c.src),'-ac','2','-ar','48000','-f','f32le','pipe:1'],{maxBuffer:5*1024*1024});
  cache.set(c.src,new Float32Array(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)));
 }
 const pcm=cache.get(c.src),start=Math.round(c.start*48000)*2;
 for(let i=0;i<pcm.length&&start+i<mix.length;i++)mix[start+i]+=pcm[i]*c.volume;
}
let peak=0;for(const s of mix)peak=Math.max(peak,Math.abs(s));
const gain=Math.min(1,.8/peak),ends=[];
cues.sort((a,b)=>a.start-b.start);
const audio=cues.map((c,i)=>{
 c.volume=Number((c.volume*gain).toFixed(5));
 let lane=ends.findIndex(end=>end<=c.start);if(lane<0)lane=ends.length;
 ends[lane]=c.start+c.duration;
 return `<audio id="relay-sfx-${i}" src="${c.src}" data-start="${c.start.toFixed(3)}" data-duration="${c.duration}" data-track-index="${10+lane}" data-volume="${c.volume}" data-label="${c.name} · ${c.peak.toFixed(2)}s"></audio>`;
}).join('');
fs.writeFileSync(path.join(root,'.hyperframes/audio-relay-headroom.json'),JSON.stringify({peak,gain,predictedPeakDb:20*Math.log10(peak*gain)},null,2));
fs.writeFileSync(path.join(root,'index.html'),`<!doctype html><html lang="ko"><head><meta charset="UTF-8"/><meta name="viewport" content="width=1920,height=1080"/><script src="assets/gsap.min.js"></script><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:1920px;height:1080px;overflow:hidden;background:#121110}#root{position:relative;width:100%;height:100%;overflow:hidden}.scene{position:absolute;inset:0}</style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="${duration}" data-width="1920" data-height="1080"><div id="chain-relay" class="clip scene" data-composition-id="chain-relay" data-composition-src="compositions/frames/04-relay.html" data-start="0" data-duration="${duration}" data-track-index="1" data-track-kind="graphics" data-label="영감의 연쇄 — 인물별 바통 전달"></div>${audio}</div><script>window.__timelines['main']=gsap.timeline({paused:true});</script></body></html>`);
fs.writeFileSync(path.join(root,'frame.md'),`---\nname: Feel&Note — 영감의 신전\ncolors:\n  background: "#121110"\n  foreground: "#e8e6e1"\n  accent: "#d4af37"\n  logoCream: "#f5f0e8"\n  logoGold: "#d4a828"\ntypography:\n  family: Pretendard Variable\n  headlineWeight: 700\n  nameWeight: 700\n---\n\n사용자 방향: “신전을 만들길 바람”. 한 명 한 명 임팩트 있게 등장했다가 바통을 넘긴다. 먹빛 석조 열주·아치·받침대·위에서 내려오는 빛으로 인물을 세운다. 웹에 있는 두 영감의 연쇄와 등록 아바타를 그대로 쓴다. 네 명이 함께 보이는 가운데 작품명이 다음 인물에게 이동하고, 도착과 동시에 받는 인물이 앞으로 등장한다. 선행 인물은 물러나며 금색 연결은 남는다. 반동·회전·팝 효과 없이 무게 있는 확대와 낮은 타격음을 사용한다. 마지막에는 여덟 인물이 실제 서비스 로고를 둘러싼다.\n`);
const board=path.join(root,'STORYBOARD.md');
const olderBoard=fs.readFileSync(board,'utf8').split('\n## 바통 전달 수정')[0];
fs.writeFileSync(board,olderBoard+'\n## 바통 전달 수정\n\n사용자: “장난치듯이 하라는 게 아니라 한명 한명이 임팩트있게 등장했다가 바통 넘기는걸 말한”, “신전을 만들길 바람”\n\n20초 수정본. 먹빛 열주와 아치 안에서 첫 사슬은 0.32·2.30·4.40·6.50초, 두 번째 사슬은 8.80·10.70·12.80·14.90초에 주목받는 인물이 바뀐다. 각 작품명은 도착 전 0.82초 동안 앞 인물에서 다음 인물로 이동한다. 전달받은 인물이 크게 등장하고 앞 인물은 물러난다. 첫 사슬은 위에 남으며 두 번째 사슬을 보여주고, 16.65초부터 여덟 인물 사이에 실제 서비스 로고를 보여준다. 소스: compositions/frames/04-relay.html. 팝 효과음 없이 낮은 타격음과 짧은 이동음만 쓴다.\n');
console.log('Built 20-second cinematic baton relay, eight individual receives and six actual work handoffs.');
