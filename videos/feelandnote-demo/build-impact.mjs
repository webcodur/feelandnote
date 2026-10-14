import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=import.meta.dirname;
const duration=12;
const timing=JSON.parse(fs.readFileSync(path.join(root,'assets/impact/timing.json'),'utf8'));
for(const file of ['index.html','frame.md']){
 const backup=path.join(root,'_backup',file.replace('.','-v2.'));
 if(!fs.existsSync(backup))fs.copyFileSync(path.join(root,file),backup);
}
let sub=fs.readFileSync(path.join(root,'compositions/frames/02-chain.html'),'utf8');
const motion=`<script>
const tl=gsap.timeline({paused:true});
// Pop entrance: explicit initial poses keep all four faces visible at t=0.
// Slam / three-frame shake and ring mechanics derive from headline-slam and logo-sting.
function shake(at,force=1){
 const target='.chain-shake';
 tl.to(target,{x:9*force,y:5*force,rotation:.35*force,duration:1/30,ease:'none'},at);
 tl.to(target,{x:-6*force,y:-3*force,rotation:-.2*force,duration:1/30,ease:'none'},at+1/30);
 tl.to(target,{x:3*force,y:1*force,rotation:.1*force,duration:1/30,ease:'none'},at+2/30);
 tl.to(target,{x:0,y:0,rotation:0,duration:2/30,ease:'power2.out'},at+3/30);
}
tl.fromTo('.chain-world',{scale:1.045},{scale:1,duration:1.6,ease:'power2.out'},0);
tl.fromTo('.chain-atmosphere',{scale:1,x:-90},{scale:1.12,x:80,duration:${duration},ease:'none'},0);
tl.fromTo('.chain-echo',{rotation:-7},{rotation:7,duration:${duration},ease:'none'},0);
tl.fromTo('.chain-opening',{scale:1.16,rotation:-3},{scale:1,rotation:0,duration:.18,ease:'expo.out'},0);
for(let i=0;i<4;i++){
 const target='#chain-person-0-'+i;
 const at=.08+i*.28;
 tl.fromTo(target,{scale:.64,y:95,rotation:i%2?16:-16},{scale:1,y:0,rotation:0,duration:.34,ease:'back.out(1.65)'},at);
 shake(at+.17,.72);
}
const paths=[...document.querySelectorAll('.chain-line')];
paths.forEach((p,k)=>{
 const row=Math.floor(k/3),i=k%3;
 const length=p.getTotalLength();p.style.strokeDasharray=length;
 const at=row===0?1.58+i*.58:5.46+i*.58;
 tl.fromTo(p,{strokeDashoffset:length},{strokeDashoffset:0,duration:.18,ease:'expo.out'},at);
 tl.fromTo('#chain-tip-'+row+'-'+i,{opacity:0},{opacity:1,duration:.04},at+.14);
 tl.fromTo('#chain-work-'+row+'-'+i,{opacity:0,y:-28,scale:1.17,rotation:i%2?5:-5},{opacity:1,y:0,scale:1,rotation:0,duration:.22,ease:'expo.out'},at+.08);
 shake(at+.16,.5);
 const person='#chain-person-'+row+'-'+(i+1);
 tl.to(person,{scale:.96,rotation:-2,duration:.04,ease:'none'},at+.16);
 tl.to(person,{scale:1,rotation:0,duration:.16,ease:'back.out(1.5)'},at+.20);
});
tl.to('.chain-opening',{y:-110,rotation:-7,opacity:0,duration:.16,ease:'power3.in'},3.98);
tl.to('.chain-small-logo',{opacity:0,duration:.1},3.98);
tl.to('.work-0',{opacity:0,duration:.12},4.08);
// Anticipation, a real 360-degree tumble, then a hard upper-row landing.
tl.to('.row-0',{rotation:-5,scale:1.025,y:15,duration:.12,ease:'power2.in'},4.03);
tl.to('.row-0',{rotationX:-360,rotation:2,scale:.78,y:-255,duration:.62,ease:'power3.inOut'},4.15);
tl.to('.row-0',{rotation:0,duration:.16,ease:'back.out(1.5)'},4.78);
tl.fromTo('.row-1',{opacity:0,x:160,y:330,scale:.68,rotation:7},{opacity:1,x:0,y:280,scale:.78,rotation:0,duration:.4,ease:'back.out(1.15)'},4.34);
for(let i=0;i<4;i++){
 const at=4.38+i*.17;
 tl.fromTo('#chain-person-1-'+i,{rotationY:i%2?35:-35,rotation:i%2?12:-12,scale:.72,y:40},{rotationY:0,rotation:0,scale:1,y:0,duration:.28,ease:'back.out(1.6)'},at);
 shake(at+.14,.6);
}
tl.fromTo('.chain-mid',{opacity:0,scale:1.13,rotation:-2,y:12},{opacity:1,scale:1,rotation:0,y:0,duration:.22,ease:'expo.out'},5.22);
shake(5.36,1);
tl.fromTo('.impact-flash',{opacity:.18},{opacity:0,duration:1/30,ease:'none',immediateRender:false},4.77);
tl.to('.chain-mid',{opacity:0,y:65,rotation:4,duration:.16,ease:'power3.in'},8.58);
tl.to('.work-1',{opacity:0,duration:.1},8.6);
tl.fromTo('.chain-ending .chain-logo',{opacity:0,scale:1.1,rotation:-2,y:14},{opacity:1,scale:1,rotation:0,y:0,duration:.20,ease:'expo.out'},8.86);
tl.fromTo('.impact-ring',{scale:.55,opacity:.5},{scale:1.6,opacity:0,duration:.43,ease:'power3.out',immediateRender:false},9.06);
tl.fromTo('.impact-flash',{opacity:.15},{opacity:0,duration:1/30,ease:'none',immediateRender:false},9.06);
shake(9.06,1.25);
tl.fromTo('.chain-tagline',{opacity:0,y:20},{opacity:1,y:0,duration:.2,ease:'power4.out'},9.2);
tl.fromTo('.chain-site',{opacity:0},{opacity:1,duration:.2},9.5);
window.__timelines['chain-impact']=tl;
</script>`;
sub=sub.replace(/<script>[\s\S]*<\/script>/,motion)
 .replaceAll('data-composition-id="chain-scene"','data-composition-id="chain-impact"')
 .replaceAll('data-duration="14"','data-duration="12"')
 .replace('data-duration="5.2" data-track-index="2"','data-duration="4.3" data-track-index="2"')
 .replace('data-start="4.5" data-duration="5.2"','data-start="4.3" data-duration="4.6"')
 .replace('data-start="9.1" data-duration="4.9"','data-start="8.7" data-duration="3.3"')
 .replaceAll('stroke-width="3"','stroke-width="5"')
 .replace('.chain-world{position:absolute;inset:0}', '.chain-world{position:absolute;inset:0;perspective:1600px;transform-style:preserve-3d}.chain-shake{position:absolute;inset:0;transform-style:preserve-3d}.chain-row{transform-style:preserve-3d}.chain-person{transform-origin:50% 50%}.chain-opening{transform-origin:0% 50%}.chain-work{transform-origin:50% 50%}.impact-flash{position:absolute;inset:0;background:#d4af37;pointer-events:none;opacity:0}.impact-ring{position:absolute;left:635px;top:195px;width:650px;height:650px;border:4px solid #d4af37;border-radius:50%;pointer-events:none;opacity:0}')
 .replace('<div class="chain-world">','<div class="chain-world"><div class="chain-shake">')
 .replace('</div></div>\n<div id="chain-heading-clip"','</div></div></div>\n<div id="chain-heading-clip"')
 .replace('<div class="chain-ending">','<div class="impact-ring"></div><div class="chain-ending">')
 .replace('</div><script>','<div id="impact-overlay-clip" class="clip" data-start="0" data-duration="12" data-track-index="5"><div class="impact-flash"></div></div></div><script>');
fs.writeFileSync(path.join(root,'compositions/frames/03-impact.html'),sub);
const cues=[];
function cue(name,peak,volume){const media=timing[name];cues.push({name,start:Math.max(0,peak-media.peakAt),duration:media.hitDuration,volume,src:media.hitPath,peak});}
for(let i=0;i<4;i++){const t=.25+i*.28;cue('pop',t,.65);cue('bass',t,.24);}
for(let i=0;i<3;i++)cue('pop',1.74+i*.58,.42);
cue('whoosh',4.42,.5);cue('bass',4.77,.54);
for(let i=0;i<4;i++)cue('pop',4.52+i*.17,.55);
cue('bass',5.36,.35);
for(let i=0;i<3;i++)cue('pop',5.62+i*.58,.42);
cue('whoosh',8.85,.4);cue('bass',9.06,.62);
// Measure the actual overlapping stereo waveforms before choosing final gain.
const pcmCache=new Map();
const mix=new Float32Array(duration*48000*2);
for(const c of cues){
 if(!pcmCache.has(c.src)){
  const raw=execFileSync('ffmpeg',['-v','error','-i',path.join(root,c.src),'-ac','2','-ar','48000','-f','f32le','pipe:1'],{maxBuffer:5*1024*1024});
  pcmCache.set(c.src,new Float32Array(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)));
 }
 const pcm=pcmCache.get(c.src),start=Math.round(c.start*48000)*2;
 for(let i=0;i<pcm.length&&start+i<mix.length;i++)mix[start+i]+=pcm[i]*c.volume;
}
let rawPeak=0;for(const sample of mix)rawPeak=Math.max(rawPeak,Math.abs(sample));
const masterGain=Math.min(1,.8/rawPeak);
for(const c of cues)c.volume=Number((c.volume*masterGain).toFixed(5));
fs.writeFileSync(path.join(root,'.hyperframes/audio-impact-headroom.json'),JSON.stringify({rawPeak,masterGain,predictedPeakDb:20*Math.log10(rawPeak*masterGain)},null,2));
const laneEnds=[];
cues.sort((a,b)=>a.start-b.start);
const audio=cues.map((c,i)=>{
 let lane=laneEnds.findIndex(end=>end<=c.start);if(lane<0)lane=laneEnds.length;
 laneEnds[lane]=c.start+c.duration;c.track=10+lane;
 return `<audio id="impact-sfx-${i}" src="${c.src}" data-start="${c.start.toFixed(3)}" data-duration="${c.duration}" data-track-index="${c.track}" data-volume="${c.volume}" data-label="${c.name} · ${c.peak.toFixed(2)}s"></audio>`;
}).join('');
let index=fs.readFileSync(path.join(root,'_backup/index-v2.html'),'utf8')
 .replaceAll('chain-scene','chain-impact').replaceAll('02-chain.html','03-impact.html')
 .replaceAll('data-duration="14"','data-duration="12"')
 .replace('영감의 연쇄 — 8인','영감의 연쇄 — 타격감 8인')
 .replace('</div><script>window.__timelines',audio+'</div><script>window.__timelines');
fs.writeFileSync(path.join(root,'index.html'),index);
fs.writeFileSync(path.join(root,'assets/impact/cues.json'),JSON.stringify(cues,null,2));
const board=path.join(root,'STORYBOARD.md');
if(!fs.readFileSync(board,'utf8').includes('## Changes from v2'))fs.appendFileSync(board,'\n## Changes from v2\n\n사용자: “팡팡팡 튀고 엎어지면서 역동적으로 해야지 타격감있게”\n\n12초 타격감 수정본. 4인 동시 노출을 유지한 채 0.25·0.53·0.81·1.09초에 인물이 차례로 튀어 착지한다. 연결선과 작품명은 0.58초 간격으로 짧게 찍힌다. 4.15초 첫 사슬이 입체로 한 바퀴 뒤집혀 위에 착지하고, 두 번째 4인이 튀어 들어와 8인을 유지한다. 9.06초 로고 착지에 링·짧은 플래시·화면 흔들림을 동기화한다. 무료 제공 효과음의 측정된 타격점을 착지 시간에 맞춘다. 소스: compositions/frames/03-impact.html.\n');
const frame=path.join(root,'frame.md');
if(!fs.readFileSync(frame,'utf8').includes('타격감 수정'))fs.appendFileSync(frame,'\n타격감 수정: 빠른 팝, 짧은 오버슈트, 입체 뒤집기, 착지의 3프레임 흔들림을 사용한다. 기존 8인의 신원·연결·색은 유지한다.\n');
console.log('Built 12-second impact version with 4 → 8 people, tumble, slam, and '+cues.length+' synchronized SFX cues.');
