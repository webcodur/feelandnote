/**
 * 저자 이름이 일치하는 창작 관계 후보만 찾는다(읽기 전용).
 * 이름 일치는 동명이인·서문 기고 등을 구분하지 못하므로 DB 반영 근거로 쓰지 않는다.
 * 인물 신원과 실제 집필 근거를 확인한 뒤 관계를 교정한다.
 * 위키데이터 P50·P170·P800 근거의 반영은 wikidata-works-match.mjs가 맡는다.
 *
 * --from <유형> 조회할 관계 유형(기본 related, appearance도 가능). --dump <경로> 후보 목록 JSON, --except <파일> 제외할 content_id 배열.
 * node --env-file=.env --import tsx scripts/figure-books/mark-authored-relations.mjs
 */

import { allRows, argumentValue, dbClient, hasFlag, inChunks } from './lib/figure-work.mjs'
import { readFileSync, writeFileSync } from 'node:fs'

// --from으로 바꿀 관계 유형을 고른다(기본 related). related가 appearance로 통합(26.09.17)된 뒤의 잔여는 --from appearance로 잡는다.
const from = argumentValue('from', 'related')
if (!['related', 'appearance'].includes(from)) throw new Error('--from은 related|appearance만 받는다: ' + from)
const dumpPath = argumentValue('dump')
const exceptPath = argumentValue('except')
const exceptIds = new Set(exceptPath ? JSON.parse(readFileSync(exceptPath, 'utf8')) : [])
const AUTHOR_SUFFIX = /(?:\s+(?:지음|저|저자|글|씀)|\s*\((?:지은이|저자|지음|글|author)\))\s*$/iu
const AUTHOR_SEPARATOR = /[,;/|、]|\s+(?:·|&|and)\s+/iu

const normalizeName = (value) => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[\s.·ㆍ・∙•]/gu, '')
function authorName(value) {
  let name = String(value ?? '').normalize('NFKC').trim()
  for (;;) {
    const stripped = name.replace(AUTHOR_SUFFIX, '').trim()
    if (stripped === name) break
    name = stripped
  }
  return normalizeName(name)
}
function matchesAuthor(creator, figureNames) {
  if (figureNames.has(authorName(creator))) return true
  return String(creator).normalize('NFKC').split(AUTHOR_SEPARATOR).some((name) => figureNames.has(authorName(name)))
}

async function main() {
  if (hasFlag('apply')) throw new Error('이름 일치만으로 창작 관계를 반영할 수 없습니다. 인물 신원과 실제 집필 근거를 확인하세요.')
  const db = dbClient()
  const [relations, celebs] = await Promise.all([
    allRows('figure_book_characters', (f, t) => db.from('figure_book_characters').select('content_id,celeb_id,relation_type').eq('relation_type', from).order('content_id').order('celeb_id').range(f, t)),
    allRows('celebs', (f, t) => db.from('celebs').select('id,slug,nickname,nickname_en').order('id').range(f, t)),
  ])
  const celebById = new Map(celebs.map((row) => [row.id, row]))
  const contentIds = [...new Set(relations.map((row) => row.content_id))]
  const [locales, editions] = await Promise.all([
    inChunks(contentIds, 200, (ids) => db.from('content_locales').select('content_id,creator').in('content_id', ids)),
    inChunks(contentIds, 200, (ids) => db.from('figure_book_editions').select('content_id,creator').in('content_id', ids)),
  ])
  const creatorsByContent = new Map()
  for (const row of [...locales, ...editions]) {
    if (!row.creator) continue
    creatorsByContent.set(row.content_id, [...(creatorsByContent.get(row.content_id) ?? []), row.creator])
  }

  const targets = []
  for (const relation of relations) {
    const celeb = celebById.get(relation.celeb_id)
    if (!celeb) continue
    const figureNames = new Set([celeb.nickname, celeb.nickname_en].filter(Boolean).map(normalizeName).filter(Boolean))
    const creators = creatorsByContent.get(relation.content_id) ?? []
    if (creators.some((creator) => matchesAuthor(creator, figureNames))) targets.push({ ...relation, slug: celeb.slug, creators })
  }
  const included = targets.filter((row) => !exceptIds.has(row.content_id))
  console.log(`${from} 관계 ${relations.length} / 저자 이름 일치 후보 ${targets.length} (제외 ${targets.length - included.length})`)
  for (const row of targets.slice(0, 15)) console.log(`  ${row.slug} ← ${row.creators.join(' | ')}`)
  if (dumpPath) {
    writeFileSync(dumpPath, JSON.stringify(targets, null, 1), 'utf8')
    console.log(`WROTE ${dumpPath}`)
  }
  console.log('이름 일치 후보입니다. 인물 신원과 실제 집필 근거를 확인한 뒤 관계를 교정하세요.')
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
