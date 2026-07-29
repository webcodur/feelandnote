/**
 * 작업대 임시 파일에서 수정 전 후보와 검토 2종을 reviewHistory로 복구한다.
 *
 * 정상 흐름에서는 revise-virtual-monologue-batch.ts가 자동 보존한다.
 * 비정상 종료나 구버전 수정기로 이력이 빠졌을 때만 사용하며 DB에는 접근하지 않는다.
 */

import { existsSync, readFileSync, statSync } from 'fs'
import { resolve } from 'path'
import {
  WORKBENCH_MODEL,
  readBatch,
  requiredArg,
  selectPeople,
  selectedSlugs,
  sha256,
  writeBatchAtomic,
  type ReviewIssue,
  type ReviewLens,
  type ReviewPass,
} from './lib/virtual-monologue-workbench'

const FILE = resolve(process.cwd(), requiredArg('--file'))
const SLUGS = selectedSlugs()
if (!SLUGS) throw new Error('--slugs로 복구 대상을 명시해야 한다.')
const OUTPUT_DIR = resolve(process.cwd(), '.tmp-gpt-mono', 'workbench')

type RawReview = {
  verdict: 'pass' | 'revise' | 'hold'
  blocking: ReviewIssue[]
  major: ReviewIssue[]
  minor: ReviewIssue[]
  strengths: string[]
}

function reviewFromFile(batchId: string, slug: string, lens: ReviewLens): ReviewPass {
  const file = resolve(OUTPUT_DIR, `${batchId}-${slug}-review-${lens}.json`)
  if (!existsSync(file)) throw new Error(`${slug} ${lens} 임시 검토 파일 없음`)
  const raw = JSON.parse(readFileSync(file, 'utf8')) as RawReview
  const promptVersion = lens === 'editorial'
    ? 'vm-ko-review-editorial-v3'
    : 'vm-ko-review-evidence-v2'
  return {
    lens,
    model: WORKBENCH_MODEL,
    promptVersion,
    reviewedAt: statSync(file).mtime.toISOString(),
    verdict: raw.verdict,
    blocking: raw.blocking,
    major: raw.major,
    minor: raw.minor,
    strengths: raw.strengths,
  }
}

function main() {
  const batch = readBatch(FILE)
  const targets = selectPeople(batch, SLUGS)
  for (const person of targets) {
    const candidateFile = resolve(OUTPUT_DIR, `${batch.batchId}-${person.slug}-candidate.txt`)
    if (!existsSync(candidateFile)) throw new Error(`${person.slug} 최초 후보 임시 파일 없음`)
    const candidateText = readFileSync(candidateFile, 'utf8').trim()
    const candidateHash = sha256(candidateText)
    person.reviewHistory = person.reviewHistory ?? []
    if (person.reviewHistory.some(cycle => cycle.candidateHash === candidateHash)) {
      console.log(`SKIP\t${person.slug}\t동일 후보 이력 있음`)
      continue
    }
    const reviews = [
      reviewFromFile(batch.batchId, person.slug, 'evidence'),
      reviewFromFile(batch.batchId, person.slug, 'editorial'),
    ]
    person.reviewHistory.push({
      candidateText,
      candidateHash,
      archivedAt: new Date().toISOString(),
      archiveReason: '구버전 수정기에서 누락된 최초 검토 사이클 복구',
      reviews,
    })
    console.log(`RECOVER\t${person.slug}\t${reviews.map(review => `${review.lens}/${review.verdict}`).join(',')}`)
  }
  writeBatchAtomic(FILE, batch)
  console.log(`배치 저장: ${FILE} · DB 쓰기 0건`)
}

main()
