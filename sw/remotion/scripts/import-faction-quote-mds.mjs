/**
 * Import person quote research .md files into faction-data.json
 * as person.minedQuotes[{ ref, en, ko }] and fill quoteOrigin when empty.
 *
 * Run from repo root:
 *   node sw/remotion/scripts/import-faction-quote-mds.mjs
 *   node sw/remotion/scripts/import-faction-quote-mds.mjs --delete-md
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FAC = path.resolve(__dirname, '../public/factions')
const DELETE_MD = process.argv.includes('--delete-md')

/** Parse X-Empire style lines:
 * - "en quote..." (source, https://..., 2014)
 *   - 번역: ko
 */
function parseXEmpirePersonMd(text) {
  const items = []
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // bullet with quoted english
    const m = line.match(/^-\s*["""](.+?)["""]\s*(?:\((.+)\))?\s*$/)
    if (!m) continue
    const en = m[1].trim()
    const ref = (m[2] || '').trim()
    let ko = ''
    // look ahead for 번역
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const t = lines[j].match(/^\s*-\s*번역\s*:\s*(.+)\s*$/)
      if (t) {
        ko = t[1].trim()
        break
      }
      // stop if next main bullet
      if (/^-\s*["""]/.test(lines[j])) break
    }
    if (!en) continue
    items.push({ ref: ref || 'source unlisted', en, ko: ko || en })
  }
  return items
}

/** Digital-Resistance / generic block:
 * > English
 * 번역: "ko" or 번역: ko
 * - 출처: ...
 */
function parseBlockQuotes(text) {
  const items = []
  const blocks = text.split(/\n(?=### |\*\*\d+\.|\n## )/)
  // line-based scan
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    let en = ''
    let ko = ''
    let ref = ''
    // > quote
    const bq = lines[i].match(/^>\s*(.+)\s*$/)
    if (bq) {
      en = bq[1].replace(/^["']|["']$/g, '').trim()
      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
        const tr = lines[j].match(/번역\s*[:：]\s*["']?(.+?)["']?\s*$/)
        if (tr) ko = tr[1].trim()
        const src = lines[j].match(/출처\s*[:：]\s*(.+)\s*$/)
        if (src) ref = src[1].trim()
        if (/^>\s/.test(lines[j]) && j > i) break
        if (/^### /.test(lines[j])) break
      }
      if (en) items.push({ ref: ref || 'source unlisted', en, ko: ko || en })
      continue
    }
    // - "en" — ref
    const dash = lines[i].match(/^-\s*["""](.+?)["""]\s*[—–-]\s*(.+)\s*$/)
    if (dash) {
      en = dash[1].trim()
      ref = dash[2].trim()
      items.push({ ref, en, ko: en })
    }
  }
  return items
}

function slugFromFilename(name) {
  // 01-elon-musk.md -> elon-musk
  return name
    .replace(/\.md$/i, '')
    .replace(/^\d+-/, '')
    .toLowerCase()
}

function findPerson(data, slugHint) {
  const people = []
  for (const g of data.groups || []) {
    for (const c of g.clusters || []) {
      for (const p of c.people || []) people.push(p)
    }
  }
  const hint = slugHint.toLowerCase().replace(/_/g, '-')
  let p = people.find((x) => (x.slug || '').toLowerCase() === hint)
  if (p) return p
  // partial: elon-musk vs elon
  p = people.find((x) => {
    const s = (x.slug || '').toLowerCase()
    return s.includes(hint) || hint.includes(s)
  })
  if (p) return p
  // nameEn
  p = people.find((x) => (x.nameEn || '').toLowerCase().replace(/\s+/g, '-') === hint)
  return p || null
}

function applyMined(person, items, { overwrite = true } = {}) {
  if (!items.length) return 0
  if (overwrite || !person.minedQuotes?.length) {
    person.minedQuotes = items
  } else {
    // merge by en text
    const seen = new Set(person.minedQuotes.map((q) => q.en))
    for (const it of items) {
      if (!seen.has(it.en)) person.minedQuotes.push(it)
    }
  }
  // fill quoteOrigin from current quoteEn match or first mined
  if (!person.quoteOrigin) {
    const match = items.find(
      (q) =>
        person.quoteEn &&
        (q.en.includes(person.quoteEn.slice(0, 40)) || person.quoteEn.includes(q.en.slice(0, 40))),
    )
    person.quoteOrigin = match?.en || items[0]?.en || person.quoteEn || ''
  }
  // if quoteOrigin empty but quoteEn exists, use quoteEn as origin fallback
  if (!person.quoteOrigin && person.quoteEn) person.quoteOrigin = person.quoteEn
  return items.length
}

// ─── Jobs ───────────────────────────────────────────────

const jobs = []

// 1) X-Empire per-person md
{
  const dir = path.join(FAC, 'X-Empire/quotes')
  if (fs.existsSync(dir)) {
    jobs.push({
      name: 'X-Empire',
      dataPath: path.join(FAC, 'X-Empire/faction-data.json'),
      files: fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.md') && f !== 'README.md')
        .map((f) => ({
          file: path.join(dir, f),
          slug: slugFromFilename(f),
          parse: parseXEmpirePersonMd,
        })),
      deleteGlobs: DELETE_MD
        ? fs
            .readdirSync(dir)
            .filter((f) => f.endsWith('.md') && f !== 'README.md')
            .map((f) => path.join(dir, f))
        : [],
    })
  }
}

// 2) Digital-Resistance single mining doc — multi person
function parseDigitalResistance(text) {
  // split by ### Person or **Name**
  const sections = text.split(/\n(?=### )/)
  const bySlug = {}
  for (const sec of sections) {
    const hm = sec.match(/^###\s+(.+?)\s*$/m)
    if (!hm) continue
    const title = hm[1].trim()
    // map known names
    const items = parseBlockQuotes(sec)
    // also numbered **1. title** with > quote
    const lines = sec.split(/\r?\n/)
    let en = '',
      ko = '',
      ref = ''
    const flush = () => {
      if (en) {
        items.push({ ref: ref || 'source unlisted', en, ko: ko || en })
        en = ko = ref = ''
      }
    }
    for (const line of lines) {
      const bq = line.match(/^>\s*(.+)\s*$/)
      if (bq) {
        flush()
        en = bq[1].replace(/^["']|["']$/g, '').trim()
        continue
      }
      const tr = line.match(/번역\s*[:：]\s*["']?(.+?)["']?\s*$/)
      if (tr && en) ko = tr[1].trim()
      const src = line.match(/출처\s*[:：]\s*(.+)\s*$/)
      if (src && en) ref = src[1].trim()
      if (/^\*\*\d+\./.test(line)) flush()
    }
    flush()
    bySlug[title] = items
  }
  return bySlug
}

// ─── Run X-Empire first ─────────────────────────────────

function runJob(job) {
  const data = JSON.parse(fs.readFileSync(job.dataPath, 'utf8'))
  let peopleHit = 0
  let quoteCount = 0
  const missed = []

  for (const f of job.files) {
    const text = fs.readFileSync(f.file, 'utf8')
    const items = f.parse(text)
    const person = findPerson(data, f.slug)
    if (!person) {
      missed.push(f.slug)
      continue
    }
    const n = applyMined(person, items)
    if (n) {
      peopleHit++
      quoteCount += n
    }
  }

  fs.writeFileSync(job.dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(
    `OK ${job.name}: people ${peopleHit}, quotes ${quoteCount}${missed.length ? `, missed: ${missed.join(', ')}` : ''}`,
  )

  if (DELETE_MD && job.deleteGlobs?.length) {
    for (const p of job.deleteGlobs) {
      fs.unlinkSync(p)
      console.log('  del', path.relative(FAC, p))
    }
    // rewrite README stub
    if (job.name === 'X-Empire') {
      const readme = path.join(FAC, 'X-Empire/quotes/README.md')
      fs.writeFileSync(
        readme,
        `# X 제국 어록

인물별 채굴 어록은 **\`faction-data.json\` → 각 인물 \`minedQuotes\`** 에 이관 완료 (2026-07-15).

- 필드: \`{ ref, en, ko }\`
- 화면 대사 원문: \`quoteOrigin\` (한국어 의역 아래 원문 표기)
- 영상 채택 대사: \`quote\` / \`quoteChunks\` / \`quoteEn\`

개별 인물 md는 데이터 이관 후 삭제했다. 재채굴 시 이 폴더에 다시 쌓고 임포터를 돌린다.

\`\`\`
node sw/remotion/scripts/import-faction-quote-mds.mjs
node sw/remotion/scripts/import-faction-quote-mds.mjs --delete-md
\`\`\`
`,
        'utf8',
      )
    }
  }

  return { peopleHit, quoteCount, missed }
}

// Special: only X-Empire files job for now via jobs array
const results = []
for (const job of jobs) results.push(runJob(job))

// Digital Resistance mining md
{
  const md = path.join(FAC, 'Digital-Resistance/_quote-mining.md')
  const dataPath = path.join(FAC, 'Digital-Resistance/faction-data.json')
  if (fs.existsSync(md) && fs.existsSync(dataPath)) {
    const text = fs.readFileSync(md, 'utf8')
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    // split by ### 한글이름 or ### English
    const parts = text.split(/\n(?=### )/)
    let hit = 0,
      qn = 0
    const nameMap = {
      '티모시 C. 메이': 'timothy-c-may',
      'timothy c. may': 'timothy-c-may',
      에릭: 'eric-hughes',
      'eric hughes': 'eric-hughes',
    }
    // collect all people for fuzzy match
    const people = []
    for (const g of data.groups || [])
      for (const c of g.clusters || []) for (const p of c.people || []) people.push(p)

    for (const part of parts) {
      const hm = part.match(/^###\s+(.+?)(?:\s*\(|$)/m)
      if (!hm) continue
      const title = hm[1].trim()
      // extract quotes
      const items = []
      const lines = part.split(/\r?\n/)
      let en = '',
        ko = '',
        ref = ''
      const flush = () => {
        if (en) {
          items.push({ ref: ref || 'source unlisted', en, ko: ko || en })
          en = ko = ref = ''
        }
      }
      for (const line of lines) {
        const bq = line.match(/^>\s*(.+)\s*$/)
        if (bq) {
          flush()
          en = bq[1].replace(/^["']|["']$/g, '').trim()
          continue
        }
        const tr = line.match(/번역\s*[:：]\s*["']?(.+?)["']?\s*$/)
        if (tr && en) ko = tr[1].trim()
        const src = line.match(/(?:출처|원천)\s*[:：]\s*(.+)\s*$/)
        if (src && en) ref = src[1].trim()
      }
      flush()
      if (!items.length) continue

      // find person by korean name in title
      let person =
        people.find((p) => title.includes(p.name) || (p.nameEn && title.toLowerCase().includes(p.nameEn.toLowerCase()))) ||
        null
      if (!person) {
        const key = title.toLowerCase()
        for (const [k, slug] of Object.entries(nameMap)) {
          if (key.includes(k)) person = people.find((p) => p.slug === slug)
        }
      }
      if (!person) {
        console.log('  DR miss person', title, items.length)
        continue
      }
      qn += applyMined(person, items)
      hit++
    }
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8')
    console.log(`OK Digital-Resistance: people ${hit}, quotes ${qn}`)
    if (DELETE_MD) {
      fs.writeFileSync(
        md,
        `# 디지털 레지스탕스 어록

채굴 어록은 **faction-data.json 인물 \`minedQuotes\`** 로 이관 완료 (2026-07-15).

재채굴 시 이 파일에 다시 정리 후:
\`node sw/remotion/scripts/import-faction-quote-mds.mjs\`
`,
        'utf8',
      )
      console.log('  stubbed _quote-mining.md')
    }
  }
}

// PayPal quote-mining if present
{
  const md = path.join(FAC, 'PayPal-Mafia/quote-mining.md')
  const dataPath = path.join(FAC, 'PayPal-Mafia/faction-data.json')
  if (fs.existsSync(md) && fs.existsSync(dataPath)) {
    // PayPal already has minedQuotes for many — only fill empty quoteOrigin from quoteEn
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    let filled = 0
    for (const g of data.groups || [])
      for (const c of g.clusters || [])
        for (const p of c.people || []) {
          if (!p.quoteOrigin && p.quoteEn) {
            p.quoteOrigin = p.quoteEn
            filled++
          }
          if (!p.quoteOrigin && p.minedQuotes?.[0]?.en) {
            p.quoteOrigin = p.minedQuotes[0].en
            filled++
          }
        }
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8')
    console.log(`OK PayPal-Mafia: quoteOrigin filled ${filled}`)
  }
}

// Social-Network + Streaming quote-research (looser format)
function importLooseResearch(seriesDir, mdName) {
  const md = path.join(FAC, seriesDir, mdName)
  const dataPath = path.join(FAC, seriesDir, 'faction-data.json')
  if (!fs.existsSync(md) || !fs.existsSync(dataPath)) return
  const text = fs.readFileSync(md, 'utf8')
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  const people = []
  for (const g of data.groups || [])
    for (const c of g.clusters || []) for (const p of c.people || []) people.push(p)

  // sections ## Name or ### Name
  const parts = text.split(/\n(?=#{2,3}\s)/)
  let hit = 0,
    qn = 0
  for (const part of parts) {
    const hm = part.match(/^#{2,3}\s+(.+?)\s*$/m)
    if (!hm) continue
    const title = hm[1].replace(/\(.*?\)/g, '').trim()
    const person =
      people.find(
        (p) =>
          title.includes(p.name) ||
          (p.nameEn && title.toLowerCase().includes(p.nameEn.toLowerCase().split(' ')[0])),
      ) || null
    if (!person) continue
    const items = parseXEmpirePersonMd(part).concat(parseBlockQuotes(part))
    // also - "en" (ref) without 번역
    if (!items.length) {
      const re = /^-\s*["""](.+?)["""]\s*(?:\((.+)\))?/gm
      let m
      while ((m = re.exec(part))) {
        items.push({ ref: (m[2] || 'source').trim(), en: m[1].trim(), ko: m[1].trim() })
      }
    }
    if (!items.length) continue
    qn += applyMined(person, items)
    hit++
  }
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(`OK ${seriesDir}: people ${hit}, quotes ${qn}`)
  if (DELETE_MD && hit > 0) {
    fs.writeFileSync(
      md,
      `# 어록 조사

\`faction-data.json\` 인물 \`minedQuotes\` 로 이관 완료 (2026-07-15).
`,
      'utf8',
    )
  }
}

importLooseResearch('Social-Network', 'quote-research.md')
importLooseResearch('Streaming-Empire', 'quote-research.md')

// Korea football
{
  const md = path.join(FAC, 'korea-football-best11/quotes-research.md')
  const dataPath = path.join(FAC, 'korea-football-best11/faction-data.json')
  if (fs.existsSync(md) && fs.existsSync(dataPath)) {
    importLooseResearch('korea-football-best11', 'quotes-research.md')
  }
}

// Ensure all active factions: if quoteEn && !quoteOrigin → quoteOrigin = quoteEn
{
  const roots = fs.readdirSync(FAC).filter((d) => {
    const p = path.join(FAC, d, 'faction-data.json')
    return fs.existsSync(p) && !d.startsWith('_')
  })
  let n = 0
  for (const d of roots) {
    const p = path.join(FAC, d, 'faction-data.json')
    const data = JSON.parse(fs.readFileSync(p, 'utf8'))
    let changed = false
    for (const g of data.groups || [])
      for (const c of g.clusters || [])
        for (const person of c.people || []) {
          if (!person.quoteOrigin && person.quoteEn) {
            person.quoteOrigin = person.quoteEn
            changed = true
            n++
          }
        }
    if (changed) fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8')
  }
  console.log(`OK global quoteOrigin backfill: ${n}`)
}

console.log('done')
