// 기존 독서방식이 있는 인물의 재작성본을 저장한다. 처음 읽은 기존 본문(앞부분·길이)과 현재 DB가 같을 때만, 그 값의 md5를 조건으로 덮어쓴다.
// 사용(저장소 루트): node --import tsx <이 파일> <slug> <기존 앞부분> <기존 길이> [--apply]
import { R, W } from './paths.mjs'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
const m=await import(pathToFileURL(R+'/scripts/browser/reading-way-argon.mjs').href)
process.loadEnvFile(R+'/sw/web-bo/.env')
const [slug,prefix,len]=process.argv.slice(2), APPLY=process.argv.includes('--apply')
const strip=x=>x.replace(/\*{1,2}([^*\n]+?)\*{1,2}/g,'$1')
const c=JSON.parse(await fs.readFile(`${W}/finals/${slug}.combined.json`,'utf8'))
if(c.slug!==slug||!c.ko||!c.en)throw Error('bad combined');c.ko=strip(c.ko);c.en=strip(c.en)
const url=process.env.NEXT_PUBLIC_DB_API_URL,key=process.env.DB_SECRET_KEY,H={apikey:key,Authorization:`Bearer ${key}`}
const [row]=await (await fetch(`${url}/rest/v1/celebs?slug=eq.${slug}&select=id,slug,reading_way,reading_way_en`,{headers:H})).json()
if(!row.reading_way.startsWith(prefix)||[...row.reading_way].length!==Number(len))throw Error('current value differs from the one read at start')
const md5=s=>crypto.createHash('md5').update(s,'utf8').digest('hex')
if(!APPLY){console.log('PLAN',slug,[...c.ko].length,c.en.length);process.exit()}
const q=s=>"'"+s.replaceAll("'","''")+"'"
const r=await m.database(`UPDATE public.celebs SET reading_way=${q(c.ko)}, reading_way_en=${q(c.en)} WHERE id=${q(row.id)}::uuid AND md5(reading_way)=${q(md5(row.reading_way))} AND md5(COALESCE(reading_way_en,''))=${q(md5(row.reading_way_en??''))} RETURNING id;`,W)
await fs.unlink(r.local).catch(()=>{})
const [after]=await (await fetch(`${url}/rest/v1/celebs?slug=eq.${slug}&select=reading_way,reading_way_en`,{headers:H})).json()
const ok=after.reading_way===c.ko&&after.reading_way_en===c.en
console.log(slug,ok?'READBACK OK':'READBACK MISMATCH',r.text.trim().slice(0,80))
if(ok)await m.revalidate({id:row.id,slug})
