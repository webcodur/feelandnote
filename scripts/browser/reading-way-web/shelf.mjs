// 인물 책장의 BOOK 목록(content_id·ko/en 제목)을 보여 준다.
import { R, W } from './paths.mjs'
import { pathToFileURL } from 'node:url'
process.loadEnvFile(R + '/sw/web-bo/.env')
const { database } = await import(pathToFileURL(R + '/scripts/browser/reading-way-argon.mjs').href)
const slug = process.argv[2].replaceAll("'", "''")
const r = await database(`SELECT COALESCE(json_agg(json_build_object('id',b.id,'t',(SELECT string_agg(l.locale||':'||l.title,' / ') FROM public.content_locales l WHERE l.content_id=b.id))),'[]') FROM public.celeb_contents cc JOIN public.celebs c ON c.id=cc.celeb_id JOIN public.contents b ON b.id=cc.content_id WHERE c.slug='${slug}' AND b.type='BOOK';`, W)
for (const x of JSON.parse(r.text.trim())) console.log(x.id.slice(0, 8), x.t)
