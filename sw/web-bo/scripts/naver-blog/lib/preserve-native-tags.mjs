export function appendedTagCount(original,actual){
 const expected=original.join('');let prefix='';if(!expected)return actual.length;
 for(let i=0;i<actual.length;i++){prefix+=actual[i];if(prefix===expected)return actual.length-i-1;}
 throw Error('Existing tags changed rather than appended');
}
// Naver re-adds numbered series markers from book titles at every save, even
// after their chips are removed. Preserve every original tag and accept only
// appended numeric markers that exist verbatim in the approved article.
export function sameSavedPublishSettings(actual,expected,article){
 const {tags:a,...restA}=actual,{tags:e,...restE}=expected;
 if(JSON.stringify(restA)!==JSON.stringify(restE))return false;
 if(JSON.stringify(a)===JSON.stringify(e))return true;
 if(!Array.isArray(a)||!Array.isArray(e))return false;
 const chips=a.join('').split('#').filter(Boolean).map(t=>'#'+t);
 let extra;try{extra=appendedTagCount(e,chips);}catch{return false;}
 const text=article.operations.flatMap(o=>o.kind==='table'?[...o.columns,...o.rows.flat()]:[o.text??'']).join('\n');
 const allowed=new Set([...text.matchAll(/#\d+(?![\p{L}\p{N}_])/gu)].map(m=>m[0]));
 return extra>0&&chips.slice(-extra).every(t=>allowed.has(t));
}
export async function preserveNativeTags(page,editor,original){
 const names=()=>page.$$eval('[id^="tag-item-"]',nodes=>nodes.map(n=>'#'+n.getAttribute('aria-label')));
 let actual=await editor.settings();if(JSON.stringify(actual.tags)===JSON.stringify(original.tags))return actual;
 let tags=await names();if(tags.join('')!==actual.tags.join(''))throw Error('Exact native tag chips required');
 const extra=appendedTagCount(original.tags,tags);
 for(let i=0;i<extra;i++){
  const input=await page.$('input[class*=tag_input]');if(!input||await input.evaluate(n=>n.value!==''))throw Error('Empty native tag input required');
  await input.click();await page.keyboard.press('Backspace');await new Promise(r=>setTimeout(r,200));
  const next=await names();if(JSON.stringify(next)!==JSON.stringify(tags.slice(0,-1)))throw Error('Native tag removal changed unexpected tags');tags=next;
 }
 actual=await editor.settings();if(JSON.stringify(actual.tags)!==JSON.stringify(original.tags))throw Error('Original tags were not restored');return actual;
}
