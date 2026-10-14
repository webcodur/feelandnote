import fs from 'node:fs';
import path from 'node:path';
const root=import.meta.dirname;
const duration=14;
const source=JSON.parse(fs.readFileSync(path.join(root,'assets/chains/source.json'),'utf8'));
const profiles=Object.fromEntries(source.profiles.map(p=>[p.slug,p]));
const rows=source.chains.map(chain=>[chain[0].author,...chain.map(s=>s.reader)]);
const works=[['일리아스','알렉산더 전기','갈리아 전기'],['신곡','데카메론','셰익스피어 희곡']];
const shortNames={'homer':'호메로스','alexander-the-great':'알렉산더','julius-caesar':'카이사르','napoleon-bonaparte':'나폴레옹','dante-alighieri':'단테','giovanni-boccaccio':'보카치오','william-shakespeare':'셰익스피어','abraham-lincoln':'링컨'};
const fonts=fs.readFileSync(path.join(root,'assets/fonts.css'),'utf8').replaceAll('fonts/','assets/fonts/');
fs.mkdirSync(path.join(root,'_backup'),{recursive:true});
for(const file of ['index.html','frame.md']){
 const backup=path.join(root,'_backup',file.replace('.','-v1.'));
 if(!fs.existsSync(backup))fs.copyFileSync(path.join(root,file),backup);
}
const logo='<span class="word">feel</span><span class="joiner">and</span><span class="word">note</span>';
const rowMarkup=rows.map((row,r)=>`<div id="chain-row-${r}" class="chain-row row-${r}">
<svg class="chain-links" viewBox="0 0 1920 1080" aria-hidden="true">${[0,1,2].map(i=>{
 const left=485+i*440,right=575+i*440;
 return `<path id="chain-line-${r}-${i}" class="chain-line" d="M ${left} 525 C ${left+15} 295 ${right-15} 295 ${right} 525" fill="none" stroke="#d4af37" stroke-width="3"/><path id="chain-tip-${r}-${i}" class="chain-tip" d="M ${right-9} 510 L ${right} 525 L ${right+8} 510" fill="none" stroke="#d4af37" stroke-width="3"/>`;
}).join('')}</svg>
${works[r].map((w,i)=>`<div id="chain-work-${r}-${i}" class="chain-work work-${r}" style="left:${350+i*440}px">${w}</div>`).join('')}
${row.map((slug,i)=>`<div id="chain-person-${r}-${i}" class="chain-person" style="left:${135+i*440}px"><div class="portrait-bed"></div><img class="chain-face" src="${profiles[slug].local}" alt="${profiles[slug].nickname}"/><div class="chain-name">${shortNames[slug]}</div></div>`).join('')}
</div>`).join('');
const sub=`<template><style>
${fonts}
*{box-sizing:border-box}
#root{position:relative;width:100%;height:100%;overflow:hidden;background:#121110;color:#e8e6e1;font-family:'Pretendard Variable',sans-serif}
.chain-ground{position:absolute;inset:0;background:#121110}
.chain-atmosphere{position:absolute;inset:-150px;background:radial-gradient(ellipse at 50% 48%,rgba(212,175,55,.19),transparent 62%)}
.chain-echo{position:absolute;left:80px;top:20px;right:80px;bottom:20px;opacity:.2;pointer-events:none}
.chain-echo ellipse{fill:none;stroke:#d4af37;stroke-width:1}
.chain-logo{display:inline-flex;align-items:baseline;line-height:.9;white-space:nowrap;color:#f5f0e8}
.chain-logo .word{font-weight:800;letter-spacing:.055em}
.chain-logo .joiner{margin:0 .04em;color:#d4a828;font-size:.82em;font-weight:500;letter-spacing:.06em}
.chain-small-logo{position:absolute;right:125px;top:106px;font-size:35px}
.chain-opening{position:absolute;left:130px;top:91px;font-size:94px;font-weight:800;letter-spacing:-.045em;line-height:1.15}
.chain-opening strong{font-weight:800;color:#d4af37}
.chain-world{position:absolute;inset:0}
.chain-row{position:absolute;inset:0;width:1920px;height:1080px;transform-origin:960px 345px}
.chain-person{position:absolute;top:345px;width:350px;height:420px;text-align:center}
.chain-face{display:block;width:350px;height:350px;object-fit:contain;position:relative}
.portrait-bed{position:absolute;left:-30px;right:-30px;top:-30px;height:405px;border-radius:50%;background:radial-gradient(ellipse,rgba(212,175,55,.14),transparent 68%)}
.chain-name{font-size:37px;font-weight:700;line-height:1.2;margin-top:21px;letter-spacing:-.025em;white-space:nowrap}
.chain-links{position:absolute;inset:0;width:1920px;height:1080px}
.chain-work{position:absolute;top:261px;width:360px;text-align:center;font-size:30px;line-height:1.3;font-weight:500;letter-spacing:-.025em;color:#d4af37}
.chain-mid{position:absolute;left:210px;top:455px;width:1500px;text-align:center;font-size:71px;font-weight:800;letter-spacing:-.04em;line-height:1.2}
.chain-mid strong{color:#d4af37;font-weight:800}
.chain-ending{position:absolute;left:420px;top:445px;width:1080px;text-align:center;display:flex;flex-direction:column;align-items:center}
.chain-ending .chain-logo{font-size:90px}
.chain-tagline{font-size:29px;letter-spacing:-.02em;color:#e8e6e1;margin-top:18px;line-height:1.2}
.chain-site{font-size:24px;letter-spacing:.02em;color:#aaa7a0;margin-top:8px;line-height:1.2}
</style>
<div id="root" data-composition-id="02-chain" data-duration="${duration}" data-width="1920" data-height="1080">
<div id="chain-ground-clip" class="clip chain-ground" data-start="0" data-duration="${duration}" data-track-index="0"><div class="chain-atmosphere"></div><svg class="chain-echo" viewBox="0 0 1760 1040"><ellipse cx="880" cy="520" rx="845" ry="485"/><ellipse cx="880" cy="520" rx="745" ry="395"/></svg></div>
<div id="chain-world-clip" class="clip" data-start="0" data-duration="${duration}" data-track-index="1"><div class="chain-world">${rowMarkup}</div></div>
<div id="chain-heading-clip" class="clip" data-start="0" data-duration="5.2" data-track-index="2"><div class="chain-opening">영감은 <strong>이어진다.</strong></div><div class="chain-small-logo chain-logo">${logo}</div></div>
<div id="chain-mid-clip" class="clip" data-start="4.5" data-duration="5.2" data-track-index="3"><div class="chain-mid">천 년을 건너 <strong>이어지는 영감.</strong></div></div>
<div id="chain-ending-clip" class="clip" data-start="9.1" data-duration="4.9" data-track-index="4"><div class="chain-ending"><div class="chain-logo">${logo}</div><div class="chain-tagline">한 줄의 기록, 천 년의 울림</div><div class="chain-site">feelandnote.com</div></div></div>
</div><script>
const tl=gsap.timeline({paused:true});
// Four people are fully visible from the first frame. No one-person intro.
tl.fromTo('.chain-world',{scale:1.08},{scale:1,duration:4.3,ease:'none'},0);
tl.fromTo('.chain-atmosphere',{scale:1,x:-90},{scale:1.1,x:80,duration:${duration},ease:'none'},0);
tl.fromTo('.chain-echo',{rotation:-5},{rotation:5,duration:${duration},ease:'none'},0);
const paths=[...document.querySelectorAll('.chain-line')];
paths.forEach((p,k)=>{
 const length=p.getTotalLength();p.style.strokeDasharray=length;
 const start=k<3?.3+k*.68:4.9+(k-3)*.66;
 tl.fromTo(p,{strokeDashoffset:length},{strokeDashoffset:0,duration:.8,ease:'power2.inOut'},start);
 tl.fromTo('#chain-tip-'+Math.floor(k/3)+'-'+(k%3),{opacity:0},{opacity:1,duration:.2},start+.6);
 tl.fromTo('#chain-work-'+Math.floor(k/3)+'-'+(k%3),{opacity:0,y:18},{opacity:1,y:0,duration:.5,ease:'power3.out'},start+.35);
});
tl.to('.chain-opening',{opacity:0,y:-30,duration:.4,ease:'power2.in'},4.1);
tl.to('.chain-small-logo',{opacity:0,duration:.3},4.1);
tl.to('.work-0',{opacity:0,y:-20,duration:.3},4.1);
tl.to('.row-0',{scale:.78,y:-255,duration:1,ease:'power3.inOut'},4.25);
tl.fromTo('.row-1',{opacity:0,scale:.69,y:430},{opacity:1,scale:.78,y:280,duration:1,ease:'power3.out'},4.65);
tl.fromTo('.chain-mid',{opacity:0,y:35},{opacity:1,y:0,duration:.65,ease:'power3.out'},5.35);
tl.to('.chain-mid',{opacity:0,y:-20,duration:.4,ease:'power2.in'},9.05);
tl.to('.work-1',{opacity:0,duration:.35},9.05);
tl.fromTo('.chain-ending .chain-logo',{opacity:0,y:25,scale:.94},{opacity:1,y:0,scale:1,duration:.65,ease:'power3.out'},9.35);
tl.fromTo('.chain-tagline',{opacity:0,y:18},{opacity:1,y:0,duration:.5},9.8);
tl.fromTo('.chain-site',{opacity:0},{opacity:1,duration:.5},10.15);
window.__timelines['02-chain']=tl;
</script></template>`;
fs.writeFileSync(path.join(root,'compositions/frames/02-chain.html'),sub.replaceAll('id="02-chain"','id="chain-scene"').replaceAll("['02-chain']","['chain-scene']"));
const index=`<!doctype html><html lang="ko"><head><meta charset="UTF-8"/><meta name="viewport" content="width=1920,height=1080"/><script src="assets/gsap.min.js"></script><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:1920px;height:1080px;overflow:hidden;background:#121110}#root{position:relative;width:100%;height:100%;overflow:hidden}.scene{position:absolute;inset:0}</style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="${duration}" data-width="1920" data-height="1080"><div id="02-chain" class="clip scene" data-composition-id="02-chain" data-composition-src="compositions/frames/02-chain.html" data-start="0" data-duration="${duration}" data-track-index="1" data-track-kind="graphics" data-label="영감의 연쇄 — 8인"></div></div><script>window.__timelines['main']=gsap.timeline({paused:true});</script></body></html>`;
fs.writeFileSync(path.join(root,'index.html'),index.replaceAll('id="02-chain"','id="chain-scene"'));
fs.writeFileSync(path.join(root,'frame.md'),`---\nname: Feel&Note — 영감의 연쇄\ncolors:\n  background: "#121110"\n  foreground: "#e8e6e1"\n  accent: "#d4af37"\n  logoCream: "#f5f0e8"\n  logoGold: "#d4a828"\ntypography:\n  family: Pretendard Variable\n  headlineWeight: 800\n  nameWeight: 700\n---\n\n웹의 실제 영감의 연쇄 두 사슬과 등록 아바타를 사용한다. 첫 프레임부터 4명이 함께 보인다. 장면이 확장되면 8명이 동시에 보이며 마지막 로고에서도 8명을 유지한다. 먹색·금색, 큰 초상, 연결선, 연속적인 축소와 공간 확장으로 규모를 드러낸다. 인물이나 관계를 새로 발명하지 않는다.\n`);
const board=path.join(root,'STORYBOARD.md');
if(!fs.readFileSync(board,'utf8').includes('## Changes from v1'))fs.appendFileSync(board,`\n## Changes from v1\n\n사용자: “연쇄 어딨는데 / 인물 3인 이상 한번에 나와야지 / 이미 있잖아 웹페이지에”\n\n14초 수정본. 실제 웹의 영감의 연쇄를 사용한다. 0–4.5초 호메로스·알렉산더·카이사르·나폴레옹 4인이 동시에 보이며 세 작품 연결을 그린다. 4.5–9.1초 첫 사슬이 위로 이동하고 단테·보카치오·셰익스피어·링컨이 아래에 등장해 8인을 함께 보여준다. 9.1–14초 여덟 인물을 유지하며 중앙에 실제 Feel&Note 로고와 “한 줄의 기록, 천 년의 울림”을 보여준다. 소스: compositions/frames/02-chain.html. 무음.\n`);
const brief=path.join(root,'BRIEF.md');
if(!fs.readFileSync(brief,'utf8').includes('## 연쇄 수정'))fs.appendFileSync(brief,'\n## 연쇄 수정\n\n웹페이지에 이미 있는 영감의 연쇄 두 사슬을 사용하고 한 화면에 최소 3인을 보여달라는 사용자 지시에 따라, 첫 화면 4인·확장 후 8인의 14초 무음 데모로 수정한다.\n');
console.log('Built the real website chains: 4 people at opening, 8 at expansion and ending; '+duration+' seconds.');
