import {textPresentation} from './unified-article.mjs';

// Runs in the browser. Empty paragraphs are part of the spacing contract.
export function readParagraphPresentation(selector){
 return [...document.querySelectorAll(selector)].flatMap(p=>{
  const clean=n=>{const copy=n.cloneNode(true);copy.querySelectorAll('.se-placeholder').forEach(e=>e.remove());return copy.textContent.replace(/\u200b/g,'').trim();},text=clean(p);if(!text)return[];
  const walker=document.createTreeWalker(p,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode()){const n=walker.currentNode;if(n.textContent.replace(/\u200b/g,'').trim()&&!n.parentElement.closest('.se-placeholder'))nodes.push(n.parentElement);}if(!nodes.length)nodes.push(p);
  let prior=p.previousElementSibling,blank=0;while(prior&&!clean(prior)){blank++;prior=prior.previousElementSibling;}
  const background=n=>{for(let e=n;e;e=e.parentElement){const c=getComputedStyle(e).backgroundColor;if(!['transparent','rgba(0, 0, 0, 0)'].includes(c))return c;if(e===p)break;}return'transparent';};
  // Naver colors generated hashtag spans after publication; inspect their saved
  // parent color while retaining the rendered override as verification evidence.
  const automaticHashtags=nodes.filter(n=>n.closest('.__se-hash-tag')).map(n=>({text:n.textContent,color:getComputedStyle(n).color}));
  return[{text,align:getComputedStyle(p).textAlign,sizes:nodes.map(n=>parseFloat(getComputedStyle(n).fontSize)),weights:nodes.map(n=>parseInt(getComputedStyle(n).fontWeight)),colors:nodes.map(n=>getComputedStyle(n.closest('.__se-hash-tag')?.parentElement??n).color),backgrounds:nodes.map(background),automaticHashtags,separated:!prior||blank>0}];
 });
}
export function assertParagraphPresentation(article,actual,{font=null,captionFont=null}={}){
 const ops=article.operations.filter(o=>['text','link'].includes(o.kind));if(actual.length!==ops.length)throw Error('Typography paragraph count differs');
 const rgb=hex=>'rgb('+hex.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16)).join(', ')+')';
 for(const [i,p]of actual.entries()){
  const op=ops[i],s=textPresentation(op),size=op.placement==='cover-caption'&&captionFont!==null?captionFont:font?.[op.role]??s.size;
  if(p.text!==op.text||p.align!==s.align||!p.sizes.length||p.sizes.some(n=>n!==size)||p.weights.some(w=>(w>=600)!==s.bold)||op.color&&p.colors.some(c=>c!==rgb(op.color))||s.background&&(!p.backgrounds?.length||p.backgrounds.some(c=>c!==rgb(s.background)))||s.gapBefore&&!p.separated||op.attachPrevious&&p.separated)throw Error('Typography, emphasis, review color, background or spacing differs: '+p.text.slice(0,60)+' / '+JSON.stringify({expected:{...s,size},actual:{align:p.align,sizes:p.sizes,weights:p.weights,separated:p.separated,colors:p.colors}}));
 }
}
