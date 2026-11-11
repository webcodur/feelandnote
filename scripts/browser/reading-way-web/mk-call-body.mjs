// packets/<slug>.txt를 [머리]+룰북A+[꼬리]로 나눠 크롬 발송 JS를 만든다. 룰북 A가 localStorage의 rwBookA와 같아야 한다. Carbon 높음 선택 확인 후 전송(Ultra 계정 전용).
import { W } from './paths.mjs'
import fs from 'node:fs'
import { PICK, SEND } from './mode.mjs'
const A = JSON.parse(fs.readFileSync(`${W}/scoped/init-A.js`, 'utf8').match(/setItem\('rwBookA',(".*?")\);/)[1])
const instruction = '아래 요청과 룰북, 참조 링크로 직접 조사하고 독서 방식 원고를 완성해주세요. 한국인이 한국어로 쓴 글답게 주의해서 작성해주세요. 지정한 JSON 코드 블록 하나로 주세요.\n\n'
for (const slug of process.argv[2].split(',')) {
  const p = fs.readFileSync(`${W}/packets/${slug}.txt`, 'utf8'), i = p.indexOf(A)
  if (i < 0 || p.indexOf(A, i + 1) >= 0) throw Error('rules not found once ' + slug)
  const js = `await (async()=>{${PICK}if(location.href.includes('google.com/sorry'))return {sent:false,why:'captcha'};const A=localStorage.getItem('rwBookA');if(A?.length!==${A.length})return {sent:false,why:'rwBookA'};const p=await pick();if(!p.ok)return {sent:false,...p};if(document.querySelector('model-response'))return {sent:false,why:'not fresh'};const text=${JSON.stringify(instruction + p.slice(0, i))}+A+${JSON.stringify(p.slice(i + A.length))};const box=document.querySelector('rich-textarea div[contenteditable="true"]');box.focus();document.execCommand('insertText',false,text);await w(2000);const preMode=btn().getAttribute('aria-label');const preAt=new Date().toISOString();const b=document.querySelector(${JSON.stringify(SEND)});if(!b||b.disabled)return {sent:false,why:'no send'};b.click();await w(2500);return {sent:true,slug:${JSON.stringify(slug)},preMode,preAt,len:text.length,url:location.href}})()`
  fs.writeFileSync(`${W}/scoped/call-${slug}.js`, js, 'utf8')
  console.log(slug, js.length)
}
