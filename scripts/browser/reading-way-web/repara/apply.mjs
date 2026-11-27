// out/bNN.json(하이쿠 답: {slug:{"P3":{"ko":[4],"en":[5]}}} = 그 문단의 N번 문장 뒤에서 끊음)을 검사하고 저장한다.
// 글자는 바꾸지 않고 끊는 자리의 공백만 빈 줄로 바꾼다. 검사: 한영 끊는 수 같음, 번호 범위, 한국어 조각 450자 이하,
// 한영 조각 길이 비율 차 0.2 미만, 조각별 연도 일치. 저장은 DB 값이 src와 같을 때만(md5 조건) 하고 재조회·캐시 갱신한다.
// 사용: node apply.mjs [--apply]  → fail.txt(다시 보낼 slug와 사유)
import fs from 'node:fs'
import crypto from 'node:crypto'
import { seps, cut } from './seg.mjs'
import { pathToFileURL } from 'node:url'
import { R, W } from '../paths.mjs'
const D = W + '/paragraph/'
const APPLY = process.argv.includes('--apply')
const m = await import(pathToFileURL(R + '/scripts/browser/reading-way-argon.mjs').href)
process.loadEnvFile(R + '/sw/web-bo/.env')
const u = process.env.NEXT_PUBLIC_DB_API_URL, k = process.env.DB_SECRET_KEY, H = { apikey: k, Authorization: 'Bearer ' + k }
const paras = (s) => s.split(/\n\s*\n/)
const yrs = (s) => [...new Set(s.match(/(?<!\d)(1[0-9]|20)\d\d(?!\d)/g) || [])].sort().join(',')
const done = new Set(fs.existsSync(D + 'done.txt') ? fs.readFileSync(D + 'done.txt', 'utf8').split('\n') : [])
const fail = [], plan = []
for (const f of fs.readdirSync(D + 'in')) {
  const want = [...fs.readFileSync(D + 'in/' + f, 'utf8').matchAll(/^## (.+)$/gm)].map((x) => x[1])
  let ans = {}
  try { ans = JSON.parse(fs.readFileSync(D + 'out/' + f.replace('.txt', '.json'), 'utf8')) } catch { for (const s of want) if (!done.has(s)) fail.push(s + ' no-output'); continue }
  for (const slug of want) {
    if (done.has(slug)) continue
    const src = JSON.parse(fs.readFileSync(D + `src/${slug.replace(/[^\w.-]/g, '_')}.json`, 'utf8'))
    const pk = paras(src.reading_way), pe = paras(src.reading_way_en), a = ans[slug]
    if (!a) { fail.push(slug + ' missing'); continue }
    let why = ''
    for (let i = 0; i < pk.length && !why; i++) {
      const x = a['P' + (i + 1)]
      if ([...pk[i]].length <= 400) { if (x && (x.ko?.length || x.en?.length)) why = `P${i + 1} not-long`; continue }
      if (!x || !Array.isArray(x.ko) || !Array.isArray(x.en) || !x.ko.length) { why = `P${i + 1} no-break`; break }
      if (x.ko.length !== x.en.length) { why = `P${i + 1} count ${x.ko.length}/${x.en.length}`; break }
      const bk = seps(pk[i], 'ko').length, be = seps(pe[i], 'en').length
      const okIdx = (v, n) => v.every((t, j) => Number.isInteger(t) && t >= 1 && t <= n && (j === 0 || t > v[j - 1]))
      if (!okIdx(x.ko, bk) || !okIdx(x.en, be)) { why = `P${i + 1} index`; break }
      const ck = paras(cut(pk[i], x.ko, 'ko')), ce = paras(cut(pe[i], x.en, 'en'))
      const big = ck.find((p) => [...p].length > 450); if (big) { why = `P${i + 1} piece ${[...big].length}`; break }
      let ak = 0, ae = 0
      for (let j = 0; j < ck.length; j++) {
        ak += [...ck[j]].length / [...pk[i]].length; ae += ce[j].length / pe[i].length
        if (j < ck.length - 1 && Math.abs(ak - ae) >= 0.2) { why = `P${i + 1} ratio`; break }
        const both = new Set(yrs(pk[i]).split(',').filter((y) => yrs(pe[i]).split(',').includes(y))), yb = (s) => yrs(s).split(',').filter((y) => both.has(y)).join(',')
        if (yb(ck[j]) !== yb(ce[j])) { why = `P${i + 1} years ${yb(ck[j])}|${yb(ce[j])}`; break }
      }
      pk[i] = cut(pk[i], x.ko, 'ko'); pe[i] = cut(pe[i], x.en, 'en')
    }
    if (why) { fail.push(slug + ' ' + why); continue }
    const ko = pk.join('\n\n'), en = pe.join('\n\n')
    const norm = (s) => s.replace(/\s+/g, ' ')
    if (norm(ko) !== norm(src.reading_way) || norm(en) !== norm(src.reading_way_en)) { fail.push(slug + ' text-changed'); continue }
    plan.push({ slug, ko, en, src })
  }
}
fs.writeFileSync(D + 'fail.txt', fail.join('\n'))
console.log('pass', plan.length, 'fail', fail.length)
if (!APPLY) process.exit()
const md5 = (s) => crypto.createHash('md5').update(s, 'utf8').digest('hex'), q = (s) => "'" + s.replaceAll("'", "''") + "'"
let ok = 0, stale = 0
for (const p of plan) {
  const r = await m.database(`UPDATE public.celebs SET reading_way=${q(p.ko)}, reading_way_en=${q(p.en)} WHERE slug=${q(p.slug)} AND md5(reading_way)=${q(md5(p.src.reading_way))} AND md5(reading_way_en)=${q(md5(p.src.reading_way_en))} RETURNING id;`, D)
  await fs.promises.unlink(r.local).catch(() => {})
  const id = (r.text.match(/[0-9a-f-]{36}/) || [])[0]
  if (!id) { stale++; fs.appendFileSync(D + 'fail.txt', `\n${p.slug} stale`); continue }
  const [after] = await (await fetch(`${u}/rest/v1/celebs?id=eq.${id}&select=reading_way,reading_way_en`, { headers: H })).json()
  if (after.reading_way !== p.ko || after.reading_way_en !== p.en) { fs.appendFileSync(D + 'fail.txt', `\n${p.slug} readback`); continue }
  await m.revalidate({ id, slug: p.slug }).catch(() => {})
  fs.appendFileSync(D + 'done.txt', p.slug + '\n'); ok++
}
console.log('saved', ok, 'stale', stale)
