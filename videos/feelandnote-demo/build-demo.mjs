import fs from 'node:fs';
import path from 'node:path';
const root = import.meta.dirname;
const fonts = fs.readFileSync(path.join(root, 'assets/fonts.css'), 'utf8').replaceAll('fonts/', 'assets/fonts/');
const html = `<template>
<style>
${fonts}
*{box-sizing:border-box}
#root{position:relative;width:100%;height:100%;overflow:hidden;color:#e8e6e1;font-family:'Pretendard Variable',sans-serif;background:#121110}
.f01-ground{position:absolute;inset:0;background:#121110}
.f01-glow{position:absolute;left:890px;top:-240px;width:1300px;height:1300px;background:radial-gradient(ellipse,rgba(212,175,55,.12),transparent 66%)}
.f01-logo{display:inline-flex;align-items:baseline;line-height:.9;white-space:nowrap;color:#f5f0e8}
.f01-logo .word{font-weight:800;letter-spacing:.055em}
.f01-logo .joiner{margin:0 .04em;color:#d4a828;font-size:.82em;font-weight:500;letter-spacing:.06em}
.f01-header{position:absolute;left:110px;top:100px;font-size:35px}
.f01-question{position:absolute;left:110px;top:345px;width:1170px;font-size:94px;font-weight:800;line-height:1.25;letter-spacing:-.045em}
.f01-mask{overflow:hidden;padding-bottom:12px}
.f01-line{display:block}
.f01-gold{color:#d4af37}
.f01-intro-small{position:absolute;left:115px;top:648px;font-size:27px;letter-spacing:-.015em;color:#aaa7a0}
.f01-photo{position:absolute;left:1320px;top:190px;width:430px;height:620px;transform-origin:0 0}
.f01-photo img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 30%}
.f01-photo-name{margin-top:19px;font-size:24px;font-weight:500;letter-spacing:.02em;color:#aaa7a0}
.f01-book{position:absolute;left:565px;top:255px;width:280px;height:419px;transform-origin:0 0}
.f01-book img{width:100%;height:100%;display:block;object-fit:contain;box-shadow:0 24px 60px #0006}
.f01-connection{position:absolute;left:0;top:0;width:1920px;height:1080px;pointer-events:none}
.f01-details{position:absolute;left:1015px;top:300px;width:795px}
.f01-kicker{font-size:29px;font-weight:600;color:#d4af37;letter-spacing:-.02em;margin-bottom:30px}
.f01-title{font-size:79px;font-weight:800;line-height:1.17;letter-spacing:-.045em;margin:0}
.f01-author{font-size:30px;color:#aaa7a0;margin-top:30px;letter-spacing:-.015em}
.f01-outro{position:absolute;left:380px;top:275px;width:1160px;text-align:center}
.f01-outro-logo{font-size:67px;margin-bottom:74px}
.f01-final-copy{font-size:67px;font-weight:800;line-height:1.35;letter-spacing:-.04em}
.f01-outro-small{font-size:26px;letter-spacing:-.015em;color:#aaa7a0;margin-top:57px}
.f01-rule{height:3px;background:#d4af37;width:120px;margin:35px auto 0;transform-origin:center}
</style>
<div id="root" data-composition-id="01-discovery" data-duration="10" data-width="1920" data-height="1080">
 <div class="clip f01-ground" data-start="0" data-duration="10" data-track-index="0"><div class="f01-glow"></div></div>
 <div class="clip" data-start="0" data-duration="10" data-track-index="1">
  <div class="f01-header f01-logo"><span class="word">feel</span><span class="joiner">and</span><span class="word">note</span></div>
 </div>
 <div class="clip" data-start="0" data-duration="3.2" data-track-index="2">
  <div class="f01-question"><div class="f01-mask"><span class="f01-line f01-q1">좋아하는 사람은,</span></div><div class="f01-mask"><span class="f01-line f01-q2 f01-gold">무엇을 좋아할까?</span></div></div>
  <div class="f01-intro-small">그 사람의 취향을 들여다보는 곳</div>
 </div>
 <div class="clip" data-start="0" data-duration="10" data-track-index="3"><div class="f01-photo"><img src="assets/photo-display-480.webp" alt="아이유"/><div class="f01-photo-name">아이유 · IU</div></div></div>
 <div class="clip" data-start="2.65" data-duration="7.35" data-track-index="4"><div class="f01-book"><img src="assets/book.jpg" alt="너무 시끄러운 고독 한국어판 표지"/></div></div>
 <div class="clip" data-start="2.65" data-duration="4.2" data-track-index="5"><svg class="f01-connection" viewBox="0 0 1920 1080"><path class="f01-path" d="M 446 495 C 505 495 495 465 547 465" fill="none" stroke="#d4af37" stroke-width="3" stroke-linecap="round"/><circle class="f01-dot" cx="547" cy="465" r="5" fill="#d4af37"/></svg></div>
 <div class="clip" data-start="3" data-duration="3.85" data-track-index="6"><div class="f01-details"><div class="f01-mask"><div class="f01-kicker">아이유의 추천 도서</div></div><div class="f01-mask"><h1 class="f01-title">너무 시끄러운<br/>고독</h1></div><div class="f01-mask"><div class="f01-author">보후밀 흐라발</div></div></div></div>
 <div class="clip" data-start="6.2" data-duration="3.8" data-track-index="7"><div class="f01-outro"><div class="f01-outro-logo f01-logo"><span class="word">feel</span><span class="joiner">and</span><span class="word">note</span></div><div class="f01-final-copy"><div class="f01-mask"><span class="f01-line f01-end1">그 사람의 취향에서,</span></div><div class="f01-mask"><span class="f01-line f01-end2 f01-gold">나의 다음 작품으로.</span></div></div><div class="f01-rule"></div><div class="f01-outro-small">인물의 감상 아카이브 · feelandnote.com</div></div></div>
</div>
<script>
const tl = gsap.timeline({paused:true});
// Masked line arrivals reuse the installed line-by-line-slide primitive.
tl.fromTo('.f01-q2',{y:120},{y:0,duration:.75,ease:'power3.out'},.32);
tl.fromTo('.f01-intro-small',{opacity:0,y:15},{opacity:1,y:0,duration:.6,ease:'power2.out'},.95);
tl.fromTo('.f01-photo',{x:45},{x:0,duration:.75,ease:'power3.out'},0);
tl.to('.f01-question',{opacity:0,x:-65,duration:.38,ease:'power2.in'},2.52);
tl.to('.f01-intro-small',{opacity:0,duration:.25},2.52);
tl.to('.f01-photo',{x:-1210,y:45,scale:.8,duration:.88,ease:'power3.inOut'},2.65);
tl.fromTo('.f01-book',{opacity:0,y:90,rotation:5},{opacity:1,y:0,rotation:0,duration:.85,ease:'power3.out'},2.9);
// The installed svg-stroke-trace primitive measures its path before drawing.
const stroke=document.querySelector('.f01-path');
const length=stroke.getTotalLength();
stroke.style.strokeDasharray=length;
tl.fromTo(stroke,{strokeDashoffset:length},{strokeDashoffset:0,duration:.62,ease:'power2.inOut'},3.35);
tl.fromTo('.f01-dot',{opacity:0,scale:0,transformOrigin:'center'},{opacity:1,scale:1,duration:.25},3.84);
tl.fromTo('.f01-kicker',{y:75,opacity:0},{y:0,opacity:1,duration:.48,ease:'power3.out'},3.32);
tl.fromTo('.f01-title',{y:220},{y:0,duration:.65,ease:'power3.out'},3.55);
tl.fromTo('.f01-author',{y:70,opacity:0},{y:0,opacity:1,duration:.5,ease:'power3.out'},3.95);
tl.to('.f01-details',{opacity:0,x:45,duration:.35,ease:'power2.in'},6.12);
tl.to('.f01-connection',{opacity:0,duration:.3},6.12);
tl.to('.f01-photo',{x:-1190,y:165,scale:.55,duration:.9,ease:'power3.inOut'},6.2);
tl.to('.f01-book',{x:970,y:100,scale:.78,duration:.9,ease:'power3.inOut'},6.2);
tl.to('.f01-header',{opacity:0,duration:.3},6.25);
tl.fromTo('.f01-outro-logo',{opacity:0,y:25},{opacity:1,y:0,duration:.5,ease:'power3.out'},7.02);
tl.fromTo('.f01-end1',{y:110},{y:0,duration:.55,ease:'power3.out'},7.18);
tl.fromTo('.f01-end2',{y:110},{y:0,duration:.55,ease:'power3.out'},7.5);
tl.fromTo('.f01-rule',{scaleX:0},{scaleX:1,duration:.5,ease:'power3.inOut'},7.8);
tl.fromTo('.f01-outro-small',{opacity:0,y:15},{opacity:1,y:0,duration:.4},8.05);
tl.to('.f01-glow',{x:-650,duration:10,ease:'none'},0);
window.__timelines=window.__timelines||{};
window.__timelines['01-discovery']=tl;
</script>
</template>`;
fs.mkdirSync(path.join(root,'compositions/frames'),{recursive:true});
let clipId=0;
fs.writeFileSync(path.join(root,'compositions/frames/01-discovery.html'),html.replace(/class="clip/g,()=>`id="f01-clip-${clipId++}" class="clip`));
const board=path.join(root,'STORYBOARD.md');
fs.writeFileSync(board,fs.readFileSync(board,'utf8').replace('status: outline','status: animated'));
const backup=path.join(root,'_backup/index-scaffold.html');
if(!fs.existsSync(backup))fs.copyFileSync(path.join(root,'index.html'),backup);
const indexPath=path.join(root,'index.html');
fs.writeFileSync(indexPath,fs.readFileSync(indexPath,'utf8').replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/gsap[^>]+><\/script>/,'<script src="assets/gsap.min.js"></script>').replace('<html lang="en">','<html lang="ko">'));
console.log('Wrote one animated frame with local images, fonts, and GSAP.');
