import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=import.meta.dirname,duration=20;
for(const file of ['index.html','frame.md','STORYBOARD.md']){
 const backup=path.join(root,'_backup',file.replace('.','-v4.'));
 if(!fs.existsSync(backup))fs.copyFileSync(path.join(root,file),backup);
}
const source=JSON.parse(fs.readFileSync(path.join(root,'assets/chains/source.json'),'utf8'));
const profiles=Object.fromEntries(source.profiles.map(p=>[p.slug,p]));
const rows=source.chains.map(c=>[c[0].author,...c.map(s=>s.reader)]);
const names=['호메로스','알렉산더','카이사르','나폴레옹','단테','보카치오','셰익스피어','링컨'];
const works=[['일리아스','알렉산더 전기','갈리아 전기'],['신곡','데카메론','셰익스피어 희곡']];
const fonts=fs.readFileSync(path.join(root,'assets/fonts.css'),'utf8').replaceAll('fonts/','assets/fonts/');
const logo='<span class="word">feel</span><span class="joiner">and</span><span class="word">note</span>';
const portraits=JSON.stringify(rows.flat().map(slug=>profiles[slug].local));
const relations=works.flatMap((w,r)=>w.map((work,i)=>`<div class="relation"><span class="relation-author">${names[r*4+i]}</span><span class="relation-work">《${work}》</span><span class="relation-arrow">→</span><span class="relation-reader">${names[r*4+i+1]}</span></div>`)).join('');
const sub=`<template><style>${fonts}
*{box-sizing:border-box}#root{position:relative;width:100%;height:100%;overflow:hidden;background:#121110;color:#e8e6e1;font-family:'Pretendard Variable',sans-serif}
#gallery-canvas{display:block;position:absolute;inset:0;width:100%;height:100%}
.brand{display:inline-flex;align-items:baseline;line-height:.9;white-space:nowrap;color:#f5f0e8}.word{font-weight:800;letter-spacing:.055em}.joiner{margin:0 .04em;color:#d4a828;font-size:.82em;font-weight:500;letter-spacing:.06em}
.corner-brand{position:absolute;right:150px;top:110px;font-size:32px}.eyebrow{position:absolute;left:150px;top:108px;color:#d4af37;font-size:25px;line-height:1.2;letter-spacing:.12em}
.opening-copy{position:absolute;left:190px;top:175px;font-size:54px;font-weight:600;line-height:1.2;letter-spacing:.025em}.opening-copy strong{color:#d4af37;font-weight:600}
.gallery-name{position:absolute;width:290px;margin-left:-145px;line-height:1.2;font-weight:600;letter-spacing:.025em;text-align:center;font-size:35px;color:#f5f0e8;white-space:nowrap;text-shadow:0 2px 10px #121110}
.relation{position:absolute;left:240px;top:936px;width:1440px;display:flex;justify-content:center;align-items:baseline;gap:34px;font-size:36px;line-height:1.2;letter-spacing:.015em;opacity:0;color:#f5f0e8;font-weight:500}
.relation-work,.relation-arrow{color:#d4af37}.relation-author{font-weight:500}.relation-reader{font-weight:700}
.closing{position:absolute;left:420px;top:466px;width:1080px;display:flex;flex-direction:column;align-items:center;text-align:center;opacity:0}.closing .brand{font-size:96px}.tagline{font-size:31px;line-height:1.2;letter-spacing:.035em;margin-top:22px}.site{font-size:25px;line-height:1.2;color:#aaa7a0;margin-top:14px}
</style><div id="root" data-composition-id="cinema-gallery" data-duration="${duration}" data-width="1920" data-height="1080">
<div id="cinema-world" class="clip" data-start="0" data-duration="20" data-track-index="0"><canvas id="gallery-canvas" data-portraits='${portraits}'></canvas></div>
<div id="cinema-identities" class="clip" data-start="0" data-duration="20" data-track-index="1">${names.map(name=>`<div class="gallery-name">${name}</div>`).join('')}</div>
<div id="cinema-copy" class="clip" data-start="0" data-duration="20" data-track-index="2"><div class="eyebrow">영감의 연쇄</div><div class="corner-brand brand">${logo}</div><div class="opening-copy">한 줄의 기록,<br/><strong>천 년의 울림.</strong></div>${relations}</div>
<div id="cinema-logo" class="clip" data-start="16.8" data-duration="3.2" data-track-index="3"><div class="closing"><div class="brand">${logo}</div><div class="tagline">한 줄의 기록, 천 년의 울림</div><div class="site">feelandnote.com</div></div></div>
</div><script type="module" src="assets/cinema-scene.mjs"></script></template>`;
fs.writeFileSync(path.join(root,'compositions/frames/05-cinema.html'),sub);
const receives=[[.6,2.5,4.4,6.3],[9.3,11.2,13.1,15]];
const timing=JSON.parse(fs.readFileSync(path.join(root,'assets/impact/timing.json'),'utf8')),cues=[];
function cue(name,at,volume){const m=timing[name];cues.push({src:m.hitPath,start:at-m.peakAt,duration:m.hitDuration,volume,name,at});}
for(const row of receives)for(let i=0;i<4;i++){cue('bass',row[i],.7);if(i>0)cue('whoosh',row[i]-.38,.17);}
const mix=new Float32Array(duration*48000*2),cache=new Map();
for(const c of cues){
 if(!cache.has(c.src)){const raw=execFileSync('ffmpeg',['-v','error','-i',path.join(root,c.src),'-ac','2','-ar','48000','-f','f32le','pipe:1']);cache.set(c.src,new Float32Array(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)));}
 const pcm=cache.get(c.src),start=Math.round(c.start*48000)*2;for(let i=0;i<pcm.length&&start+i<mix.length;i++)mix[start+i]+=pcm[i]*c.volume;
}
let peak=0;for(const s of mix)peak=Math.max(peak,Math.abs(s));const gain=Math.min(1,.75/peak),ends=[];
cues.sort((a,b)=>a.start-b.start);
const audio=cues.map((c,i)=>{let lane=ends.findIndex(e=>e<=c.start);if(lane<0)lane=ends.length;ends[lane]=c.start+c.duration;return `<audio id="cinema-sound-${i}" src="${c.src}" data-start="${c.start.toFixed(3)}" data-duration="${c.duration}" data-track-index="${10+lane}" data-volume="${(c.volume*gain).toFixed(5)}" data-label="${c.name} · ${c.at.toFixed(2)}s"></audio>`;}).join('');
fs.writeFileSync(path.join(root,'index.html'),`<!doctype html><html lang="ko"><head><meta charset="UTF-8"/><meta name="viewport" content="width=1920,height=1080"/><script src="assets/gsap.min.js"></script><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:1920px;height:1080px;overflow:hidden;background:#121110}#root{position:relative;width:100%;height:100%;overflow:hidden}.scene{position:absolute;inset:0}</style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="20" data-width="1920" data-height="1080"><div id="cinema-gallery" class="clip scene" data-composition-id="cinema-gallery" data-composition-src="compositions/frames/05-cinema.html" data-start="0" data-duration="20" data-track-index="1" data-track-kind="graphics" data-label="영감의 연쇄 — 입체 공간과 카메라"></div>${audio}</div><script>window.__timelines['main']=gsap.timeline({paused:true});</script></body></html>`);
fs.writeFileSync(path.join(root,'frame.md'),`---\nname: Feel&Note — 영감의 계보\ncolors:\n  background: "#121110"\n  foreground: "#e8e6e1"\n  accent: "#d4af37"\n  logoCream: "#f5f0e8"\n  logoGold: "#d4a828"\ntypography:\n  family: Pretendard Variable\n  headlineWeight: 600\n  nameWeight: 600\n---\n\n사용자 방향: 한 명씩 무게 있게 등장하고 영감의 바통을 넘긴다. 신전의 위엄을 원하며 플래시 애니메이션 같은 느낌을 피한다. 공간의 실제 원근·석재 질감·그림자·카메라 이동으로 무게를 만든다. 등록 초상은 공간 안에 고정하며 개별 확대·반동·회전을 하지 않는다. 두 연쇄의 작품과 사람은 웹 데이터 그대로 쓴다. 첫 연쇄 4명, 다음 연쇄 4명, 마지막 8명을 보여준다.\n`);
const board=path.join(root,'STORYBOARD.md'),old=fs.readFileSync(board,'utf8').split('\n## 입체 공간 수정')[0];
fs.writeFileSync(board,old+'\n## 입체 공간 수정\n\n사용자: “플래시 애니메이션 느낌 안나게 잘해야될거야”\n\n20초 수정본. 벡터 아치와 삼각 조명, 인물 개별 확대를 없애고 실제 원근을 가진 석재 공간에서 카메라와 조명으로 시선을 옮긴다. 작품 전달은 금빛 경로의 이동으로 나타내며 작품과 양쪽 인물 이름을 아래에 함께 보여준다. 7.8–9.15초 카메라가 다음 층의 연쇄로 올라가고, 16.3–17.9초 물러나 여덟 명과 서비스 로고를 보여준다. 소스: compositions/frames/05-cinema.html.\n');
console.log('Built a 20-second dimensional gallery: fixed portraits, camera tracking and crane, physical stone lights and shadows.');
