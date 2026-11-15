// 인물 식별 정보(이름·영문명·성별·생몰·직업)를 DB에서 읽는다. 웹 발송문·신규 조사 요청이 함께 쓴다.
import { pathToFileURL } from 'node:url'
import { R, W } from './paths.mjs'
process.loadEnvFile(R + '/sw/web-bo/.env')
const { database } = await import(pathToFileURL(R + '/scripts/browser/reading-way-argon.mjs').href)
export async function idents(slugs) {
  const list = slugs.map(s => `'${s.replaceAll("'", "''")}'`).join(',')
  const rows = JSON.parse((await database(`SELECT coalesce(json_agg(json_build_object('slug',slug,'name',nickname,'name_en',nickname_en,'gender',CASE WHEN gender THEN '남성' WHEN gender=false THEN '여성' ELSE '미상' END,'birth_date',birth_date,'death_date',death_date,'profession',profession)),'[]') FROM celebs WHERE slug IN (${list});`, W)).text.trim())
  return Object.fromEntries(rows.map(r => [r.slug, r]))
}
