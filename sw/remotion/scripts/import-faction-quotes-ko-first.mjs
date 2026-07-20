import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const FAC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/factions')

function applyMined(person, items) {
  if (!items.length) return 0
  person.minedQuotes = items
  if (!person.quoteOrigin) {
    const match = items.find(
      (q) =>
        person.quoteEn &&
        (q.en.includes(person.quoteEn.slice(0, 40)) || person.quoteEn.includes(q.en.slice(0, 40))),
    )
    person.quoteOrigin = match?.en || items[0]?.en || person.quoteEn || ''
  }
  return items.length
}

/** Streaming / Social: numbered KO first, then 원문 EN */
function parseKoFirst(text) {
  const people = {}
  const parts = text.split(/\n(?=### )/)
  for (const part of parts) {
    const hm = part.match(/^###\s+(.+?)\s*(?:\(|$)/m)
    if (!hm) continue
    const title = hm[1].replace(/\(.*?\)/g, '').trim()
    const items = []
    const lines = part.split(/\r?\n/)
    let en = ''
    let ko = ''
    let ref = ''
    const flush = () => {
      if (en || ko) {
        items.push({ ref: ref || 'source', en: en || ko, ko: ko || en })
        en = ''
        ko = ''
        ref = ''
      }
    }
    for (const line of lines) {
      const kq = line.match(/^\d+\.\s*★?\s*[""「](.+?)[""」]\s*$/)
      if (kq) {
        flush()
        ko = kq[1].trim()
        continue
      }
      // 1. ★ without perfect quotes - take after star
      const kq2 = line.match(/^\d+\.\s*★\s*(.+)$/)
      if (kq2 && !line.includes('원문') && !line.includes('출처')) {
        flush()
        ko = kq2[1].replace(/^[""]|[""]$/g, '').trim()
        continue
      }
      const orig = line.match(/원문\s*[:：]\s*[""](.+?)[""]/)
      if (orig) {
        en = orig[1].trim()
        continue
      }
      const orig2 = line.match(/원문\s*[:：]\s*(.+)$/)
      if (orig2 && !en) {
        en = orig2[1]
          .replace(/^[""]|[""].*$/g, '')
          .replace(/\s*[—–-].*$/, '')
          .trim()
        continue
      }
      const src = line.match(/출처\s*[:：]\s*(.+)$/)
      if (src) {
        ref = src[1].trim()
        flush()
        continue
      }
    }
    flush()
    if (items.length) people[title] = items
  }
  return people
}

function importSeries(series, mdFile) {
  const md = path.join(FAC, series, mdFile)
  const dataPath = path.join(FAC, series, 'faction-data.json')
  if (!fs.existsSync(md) || !fs.existsSync(dataPath)) return
  const text = fs.readFileSync(md, 'utf8')
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  const all = []
  for (const g of data.groups || []) for (const c of g.clusters || []) for (const p of c.people || []) all.push(p)
  const byTitle = parseKoFirst(text)
  let hit = 0
  let qn = 0
  for (const [title, items] of Object.entries(byTitle)) {
    const person = all.find(
      (p) =>
        title.includes(p.name) ||
        (p.nameEn && title.includes(p.nameEn.split(/\s+/)[0])) ||
        (p.nameEn && title.toLowerCase().includes(p.nameEn.toLowerCase())),
    )
    if (!person) {
      console.log('  miss', series, title, items.length)
      continue
    }
    qn += applyMined(person, items)
    hit++
  }
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(series, 'people', hit, 'quotes', qn)
  // stub md
  fs.writeFileSync(
    md,
    `# 어록 조사

인물 어록은 **faction-data.json → minedQuotes** 로 이관 완료 (2026-07-15).

재채굴 시 이 파일에 정리 후 임포터 실행.
`,
    'utf8',
  )
}

importSeries('Streaming-Empire', 'quote-research.md')
importSeries('Social-Network', 'quote-research.md')
importSeries('korea-football-best11', 'quotes-research.md')
console.log('done')
