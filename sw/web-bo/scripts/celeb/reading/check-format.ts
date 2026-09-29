/**
 * 인물 안내 원고의 형식을 DB 없이 검사한다. 규칙 SSoT: docs/project/celeb/celeb-05-01-reading.md 「형식」.
 *
 *   pnpm exec tsx scripts/celeb/reading/check-format.ts <원고.json> [<이름표.json>]
 *
 * 원고 파일은 slug·guide·guideEn 배열이다. guide가 없는 항목(본문 보존 판정)은 건너뛴다.
 * 이름 검사를 하려면 원고 항목에 nickname·nicknameEn을 넣거나, 같은 slug의 nickname·nicknameEn을
 * 가진 배열 파일을 두 번째 인자로 준다. 위반이 하나라도 있으면 종료 코드 1이다.
 */
import { readFileSync } from 'node:fs'
import { readingFormatErrors, readingLength, type ReadingIdentity } from './format'

type Row = { slug?: string; guide?: string; guideEn?: string; nickname?: string; nicknameEn?: string | null }

const [draftFile, identityFile] = process.argv.slice(2)
if (!draftFile) throw new Error('원고 JSON 파일 경로가 필요하다.')
// 배열이나 { people: [...] } 묶음 파일 둘 다 받는다.
const read = (file: string): Row[] => {
  const parsed = JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) as Row[] | { people?: Row[] }
  return Array.isArray(parsed) ? parsed : parsed.people ?? []
}
const drafts = read(draftFile)
const identities = new Map<string, ReadingIdentity>()
for (const row of identityFile ? read(identityFile) : drafts) {
  if (row.slug && row.nickname) identities.set(row.slug, { nickname: row.nickname, nickname_en: row.nicknameEn ?? null })
}

let failed = 0
for (const row of drafts) {
  if (!row.slug) { failed += 1; console.log('(slug 없음) | slug가 비어 있다'); continue }
  if (!row.guide?.trim()) continue
  const identity = identities.get(row.slug)
  const errors = [
    ...(identity ? [] : ['이름표 없음 — 이름 검사를 못 했다']),
    ...(row.guideEn?.trim() ? [] : ['영어 안내 누락']),
    ...readingFormatErrors(row.guide, row.guideEn ?? '', identity, { requireParagraphs: true }),
  ]
  const length = readingLength(row.guide)
  if (errors.length) failed += 1
  console.log(`${row.slug} | ${length}자 | ${errors.length ? errors.join('; ') : '통과'}`)
}
if (failed) process.exitCode = 1
