// 편집기 안의 표 하나를 같은 자리의 새 표로 바꾼다. 표 바로 앞 문단 끝에서 Delete로 표를 지우고 HTML 표를 붙인다.
import {leaveFullListTable} from '../apply-institution-revisions.mjs';

const wait=ms=>new Promise(r=>setTimeout(r,ms));

export async function replaceTableAfter(page,{tableId,previousText,html}){
 // 앞 문단의 마지막 글자 끝을 눌러 커서를 둔다. 같은 글자의 문단이 여럿이면 마지막(목차가 아닌 본문 쪽)을 쓴다.
 const caretAtEnd=async()=>{
  const point=await page.evaluate(h=>{const p=[...document.querySelectorAll('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph')].filter(p=>p.textContent.replace(/​/g,'').trim()===h).at(-1);p.scrollIntoView({block:'center',behavior:'instant'});const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);let n=null;while(w.nextNode())if(w.currentNode.textContent.replace(/​/g,'').trim())n=w.currentNode;const r=document.createRange();r.setStart(n,n.length-1);r.setEnd(n,n.length);const b=r.getBoundingClientRect();return{x:b.right-1,y:b.top+b.height/2};},previousText);
  await page.mouse.click(point.x,point.y);await wait(120);await page.keyboard.press('End');await wait(120);
 };
 const count=await page.$$eval('.se-component.se-table',ts=>ts.length);
 // 문단 끝에서 Delete를 누르면 뒤의 표가 먼저 골라지고 다음 Delete에 지워진다.
 await caretAtEnd();for(let k=0;k<3&&await page.$('#'+tableId);k++){await page.keyboard.press('Delete');await wait(500);}
 if(await page.$('#'+tableId))throw Error('Table was not removed');
 // 지운 뒤 편집기가 다음 구분선을 골라 둔다. 제목을 눌러 선택을 푼 뒤 앞 문단 끝으로 돌아간다.
 const title=await page.$eval('.se-documentTitle .se-text-paragraph',p=>{p.scrollIntoView({block:'center',behavior:'instant'});const r=p.getBoundingClientRect();return{x:r.right-2,y:r.top+r.height/2};});
 await page.mouse.click(title.x,title.y);await wait(200);await page.keyboard.press('End');await wait(100);
 await caretAtEnd();
 await page.evaluate(async html=>{const text=new DOMParser().parseFromString(html,'text/html').body.textContent;await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);},html);
 await page.keyboard.down('Control');await page.keyboard.press('KeyV');await page.keyboard.up('Control');
 await page.waitForFunction(n=>document.querySelectorAll('.se-component.se-table').length===n,{timeout:15000},count);await wait(400);await leaveFullListTable(page);
}
