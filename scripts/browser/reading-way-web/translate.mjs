// finals/<slug>.json 한국어를 러너의 번역 요청문으로 agy(Gemini Flash)에 번역받아 원문 해시까지 대조한 뒤 finals/<slug>.combined.json으로 쓴다.
// 사용(저장소 루트): node --import tsx <이 파일> slug1,slug2
import { R, W } from './paths.mjs'
import fs from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const m = await import(pathToFileURL(R + '/scripts/browser/reading-way-argon.mjs').href)
const { agyCall } = await import(pathToFileURL(R + '/.agents/skills/agy-antigravity/scripts/agy-call.mjs').href)
process.loadEnvFile(R + '/sw/web-bo/.env')
const url = process.env.NEXT_PUBLIC_DB_API_URL, key = process.env.DB_SECRET_KEY
const queue = process.argv[2].split(',')
await Promise.all(Array.from({ length: 3 }, async () => {
  while (queue.length) {
    const slug = queue.shift()
    const out = `${W}/finals/${slug}.combined.json`
    if (await fs.access(out).then(() => true, () => false)) { console.log('skip', slug); continue }
    try {
      const p = JSON.parse(await fs.readFile(`${W}/finals/${slug}.json`, 'utf8'))
      const [row] = await (await fetch(`${url}/rest/v1/celebs?slug=eq.${slug}&select=nickname_en`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })).json()
      const prompt = m.readingWayTranslationPrompt(p, { name_en: row.nickname_en })
      let raw = (await agyCall(prompt, { model: 'gemini-3.8-flash-high', timeoutMs: 600_000 })).trim()
      raw = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
      const combined = m.combineReadingWayTranslation(p, JSON.parse(raw))
      const kp = p.ko.split(/\n\s*\n/).length, ep = combined.en.split(/\n\s*\n/).length
      await fs.writeFile(out, JSON.stringify(combined, null, 2))
      console.log(slug, kp === ep ? 'OK' : `PARA ${kp}/${ep}`, combined.en.length)
    } catch (e) { console.log('FAIL', slug, String(e).slice(0, 200)) }
  }
}))
