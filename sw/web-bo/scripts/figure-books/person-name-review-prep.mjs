/**
 * 인물 이름 카카오 수집분을 검수 버킷으로 가른다.
 * 한국 ISBN(978-89·979-11)만 남기고 수입 원서는 버린 뒤, 저자 표기·제목·소개문에 인물 이름이
 * 어디에 붙었는지로 후보를 네 버킷으로 나눈다. 판정은 내리지 않는다 — 검수자가 읽는 재료다.
 *
 * authoredCands : 저자 표기가 인물과 일치 — 동명이인 검수가 필요한 창작 후보
 * appearanceCands: 제목이 인물을 부르고 저자는 남 — 등장 후보(전기·평전·인물서)
 * ambiguous     : 소개문에만 이름 — 범위를 읽고 판정해야 하는 후보
 * noise         : 한국어판인데 이름이 어디에도 없음 — 검색 느슨매칭 잡음
 *
 * node scripts/figure-books/person-name-review-prep.mjs --in ../../data/celeb/figure-books/person-name-2026-09-18.jsonl
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

function argumentValue(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`))
  return inline ? inline.slice(name.length + 3) : fallback
}

const squash = (value) => String(value ?? '').normalize('NFKC').toLowerCase()
  .replace(/[\s·:;,()[\]{}"'`~!?.「」『』<>-]/g, '')
const isKoreanIsbn = (value) => /^(97889|97911)/.test(String(value ?? ''))

const AUTHOR_SUFFIX = /(?:\s+(?:지음|저|저자|글|씀|옮김|엮음|편저|편역|역주|감수|서문|추천)|\s*\((?:지은이|저자|지음|글|옮긴이|author)\))\s*$/iu
const AUTHOR_SEPARATOR = /[,;/|、]|\s+(?:·|&|and)\s+/iu

function authorName(value) {
  let name = String(value ?? '').normalize('NFKC').trim()
  for (;;) {
    const stripped = name.replace(AUTHOR_SUFFIX, '').trim()
    if (stripped === name) break
    name = stripped
  }
  return name
}

// 인물 이름 변형: 한글 표기·영문 표기, 영문은 성만 따로도 본다(한국어판 저자 표기가 성만 쓰는 경우가 있다 — 단, 성이 흔하면 오탐이라 검수가 판정한다)
function personNames(person) {
  const names = new Set()
  for (const raw of [person.nickname, person.nickname_en]) {
    const flat = squash(raw)
    if (flat.length >= 2) names.add(flat)
  }
  return names
}

function authorMatches(authors, names) {
  for (const author of authors ?? []) {
    for (const part of String(author).split(AUTHOR_SEPARATOR)) {
      const flat = squash(authorName(part))
      if (flat.length >= 2 && names.has(flat)) return author
    }
  }
  return null
}

function titleMatches(title, person, names) {
  const flat = squash(title)
  for (const name of names) if (flat.includes(name)) return name
  // 성+명 전체가 아니라 마지막 토큰(성)만 붙는 제목도 잡되, 성이 3글자 미만이면 오탐이 많아 넘긴다
  const lastToken = String(person.nickname_en ?? '').trim().split(/\s+/).pop()
  const flatLast = squash(lastToken)
  if (flatLast.length >= 4 && flat.includes(flatLast)) return `surname:${lastToken}`
  const koLast = String(person.nickname ?? '').trim().split(/\s+/).pop()
  const flatKo = squash(koLast)
  if (flatKo.length >= 2 && flat.includes(flatKo)) return `surname:${koLast}`
  return null
}

function contentsMatches(contents, names) {
  const flat = squash(contents)
  if (!flat) return null
  for (const name of names) if (flat.includes(name)) return name
  return null
}

function slim(hit) {
  return {
    title: hit.title, authors: hit.authors, translators: hit.translators,
    publisher: hit.publisher, isbn: hit.isbn, datetime: hit.datetime,
    status: hit.status, url: hit.url, via: hit.via,
    contents: (hit.contents ?? '').slice(0, 300),
  }
}

async function main() {
  const inPath = resolve(process.cwd(), argumentValue('in', '../../data/celeb/figure-books/person-name-2026-09-18.jsonl'))
  const outPath = resolve(process.cwd(), argumentValue('out', inPath.replace(/\.jsonl$/, '-buckets.json')))

  const rows = readFileSync(inPath, 'utf8').split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line))
  const buckets = { authoredCands: [], appearanceCands: [], ambiguous: [], noiseOnly: [], noKoHits: [], noHits: [] }
  const totals = { people: 0, koHits: 0, importedOnlyHits: 0 }

  for (const row of rows) {
    const person = row.person
    const names = personNames(person)
    totals.people += 1
    const hits = row.hits ?? []
    const ko = hits.filter((hit) => isKoreanIsbn(hit.isbn))
    totals.koHits += ko.length
    totals.importedOnlyHits += hits.length - ko.length

    const authored = []
    const appearance = []
    const ambiguous = []
    const noise = []
    for (const hit of ko) {
      const authorHit = authorMatches(hit.authors, names)
      const titleHit = titleMatches(hit.title, person, names)
      const contentsHit = contentsMatches(hit.contents, names)
      if (authorHit) authored.push({ ...slim(hit), matchedAuthor: authorHit })
      else if (titleHit) appearance.push({ ...slim(hit), matchedTitle: titleHit })
      else if (contentsHit) ambiguous.push({ ...slim(hit), matchedContents: contentsHit })
      else noise.push({ ...slim(hit) })
    }

    const entry = { person }
    if (authored.length) { entry.authored = authored; buckets.authoredCands.push(entry) }
    else if (appearance.length) { entry.appearance = appearance; buckets.appearanceCands.push(entry) }
    else if (ambiguous.length) { entry.ambiguous = ambiguous; buckets.ambiguous.push(entry) }
    else if (noise.length) { entry.noise = noise; buckets.noiseOnly.push(entry) }
    else if (hits.length) buckets.noKoHits.push(entry)
    else buckets.noHits.push(entry)
  }

  const report = {
    generatedAt: new Date().toISOString(),
    source: inPath,
    totals,
    buckets: {
      authoredCands: buckets.authoredCands.length,
      appearanceCands: buckets.appearanceCands.length,
      ambiguous: buckets.ambiguous.length,
      noiseOnly: buckets.noiseOnly.length,
      noKoHits: buckets.noKoHits.length,
      noHits: buckets.noHits.length,
    },
    ...buckets,
  }
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8')
  console.log(JSON.stringify({ totals, buckets: report.buckets }, null, 2))
  console.log(`WROTE ${outPath}`)
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
