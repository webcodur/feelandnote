// Invoked only from the Chrome plugin's Node REPL with its supported Tab API.
import fs from 'node:fs/promises';
const root = 'D:/blog-assets/naver-blog/table-ko';
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
export async function capture(f) {
  await f.getByRole('article').first().locator('.se-component.se-image .se-set-rep-image-button.se-is-selected').first().waitFor({state:'attached',timeoutMs:15000});
  const representatives=await f.getByRole('article').first().locator('.se-component.se-image:has(.se-set-rep-image-button.se-is-selected)').evaluateAll(cs=>cs.map(c=>c.id));
  const result=(await f.getByRole('article').first().evaluateAll(as=>as.map(a=>{
    const table=a.querySelector('.se-component.se-table'), cs=[...a.querySelectorAll('.se-component')];
    const ix=cs.findIndex(c=>c.id===table?.id), ps=[...a.querySelectorAll('p')];
    return {
      matrix:[...a.querySelectorAll('.se-table tr')].map(r=>[...r.querySelectorAll('td,th')].map(c=>c.textContent.trim())),
      outside:ps.filter(p=>!p.closest('table')).map(p=>p.textContent).filter(t=>t&&!['AI 활용 설정','사진 설명을 입력하세요.'].includes(t)),
      images:[...a.querySelectorAll('.se-component.se-image')].map(c=>({id:c.id,representative:!!c.querySelector('.se-set-rep-image-button.se-is-selected')})),
      links:[...a.querySelectorAll('a[href]')].filter(x=>!x.closest('table')).map(x=>({text:x.textContent,href:x.getAttribute('href')})),
      heading:cs.slice(0,ix).flatMap(c=>[...c.querySelectorAll('p')].map(p=>p.textContent)).filter(Boolean).at(-1)
    };
  })))[0];
  for(const im of result.images) im.representative=representatives.includes(im.id);
  return result;
}
function assertChange(t, before, after) {
  for (const k of ['outside','images','links']) if(!same(before[k],after[k])) throw Error(`${t.logNo}: changed ${k}`);
  if(!same(after.matrix,[t.columns,...t.rows])) throw Error(`${t.logNo}: changed table differs`);
}
async function checkChange(t, before, f) {
  let after;
  for (let i=0;i<3;i++) {
    after=await capture(f);
    if(same(before.images,after.images)) break;
    for(const im of before.images.filter(x=>x.representative))
      await f.getByRole('article').first().locator('#'+im.id+' .se-set-rep-image-button.se-is-selected').waitFor({state:'attached',timeoutMs:15000});
  }
  assertChange(t,before,after);
}
export function html(t) {
  const esc=x=>x.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return '<table style="width:100%;border-collapse:collapse"><tbody>'+[t.columns,...t.rows].map((r,i)=>'<tr>'+r.map((v,c)=>'<td style="border:1px solid #ccc;padding:8px;width:'+(r.length===3?['22%','54%','24%'][c]:['72%','28%'][c])+';'+(!i?'background-color:#eeeeee;':'')+'">'+(!i?'<strong>':'')+esc(v)+(!i?'</strong>':'')+'</td>').join('')+'</tr>').join('')+'</tbody></table><p></p>';
}
export async function save(t, tab, f) {
  const count=await f.getByRole('button',{name:'발행',exact:true}).count();
  if(count===1) await f.getByRole('button',{name:'발행',exact:true}).click();
  await f.getByRole('button',{name:'발행',exact:true}).nth(1).waitFor({state:'visible',timeoutMs:15000});
  if(t.scheduledAt) {
    const dates=await f.locator('input').evaluateAll(xs=>xs.filter(x=>x.className.includes('input_date')).map(x=>x.value));
    if(dates.length!==1||dates[0].replace(/\D/g,'')!==t.scheduledAt.split(' ').slice(0,3).join('').replace(/\D/g,'')) throw Error(`schedule differs ${t.logNo}: ${dates}`);
    const times=await f.locator('select').evaluateAll(xs=>xs.map(x=>x.value));
    if(times.length!==2||Number(times[0])!==9||Number(times[1])!==0) throw Error(`time differs ${t.logNo}: ${times}`);
  }
  await f.getByRole('button',{name:'발행',exact:true}).nth(1).click();
  await f.getByRole('article').first().waitFor({state:'hidden',timeoutMs:20000});
  await fs.writeFile(`${root}/before-live/${t.logNo}-saved.json`,JSON.stringify({logNo:t.logNo,scheduledAt:t.scheduledAt})+'\n');
  return {saved:t.logNo};
}
export async function apply(t, tab, f) {
  await f.getByRole('article').first().locator('.se-table tr').nth(t.rows.length).waitFor({state:'attached',timeoutMs:15000});
  const before=await capture(f);
  if(!same(before.matrix,t.before)) throw Error(`${t.logNo}: original table differs`);
  await fs.writeFile(`${root}/before-live/${t.logNo}.json`,JSON.stringify(before,null,2));
  await f.locator('.se-component.se-table td').nth(t.columns.length).click();
  await f.getByRole('button',{name:'셀 전체 선택',exact:true}).click();
  await f.getByRole('button',{name:'삭제',exact:true}).click();
  if(await f.locator('.se-component.se-table').count()) throw Error('old table not removed');
  const ps=await f.getByRole('article').first().locator('p').evaluateAll(ps=>ps.map(p=>({id:p.id,text:p.textContent})));
  const i=ps.findIndex(p=>p.text===before.heading),blank=ps.slice(i+1).find(p=>p.id&&!p.text);
  if(i<0||!blank) throw Error('missing insertion anchor');
  await f.locator('#'+blank.id).click();
  await tab.clipboard.write([{entries:[{mimeType:'text/html',text:html(t)}]}]);
  await tab.cua.keypress({keys:['Control','v']});
  await f.getByRole('article').first().locator('.se-table tr').nth(t.rows.length).waitFor({state:'attached',timeoutMs:15000});
  await checkChange(t,before,f);
  return save(t,tab,f);
}
export async function verify(t, f) {
  await f.getByRole('article').first().locator('.se-table tr').nth(t.rows.length).waitFor({state:'attached',timeoutMs:15000});
  const before=JSON.parse(await fs.readFile(`${root}/before-live/${t.logNo}.json`,'utf8'));
  await checkChange(t,before,f);
  const file=`${root}/results.json`, results=JSON.parse(await fs.readFile(file,'utf8'));
  if(!results.some(x=>x.logNo===t.logNo)) results.push({logNo:t.logNo,changedRows:t.changes,verified:true,scheduledAt:t.scheduledAt,originalTitlesRemaining:t.originalTitlesRemaining});
  await fs.writeFile(file,JSON.stringify(results,null,2)+'\n');
  return {verified:t.logNo,total:results.length};
}
