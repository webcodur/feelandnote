/**
 * 두 독립 검토를 통과한 후보에 명시적 승인 기록을 붙인다.
 *
 * 기본은 dry-run이다. --apply를 붙여야 배치 JSON이 바뀐다. DB에는 쓰지 않는다.
 */

import { resolve } from 'path'
import {
  readBatch,
  requiredArg,
  selectPeople,
  selectedSlugs,
  sha256,
  writeBatchAtomic,
} from './lib/virtual-monologue-workbench'

const FILE = resolve(process.cwd(), requiredArg('--file'))
const SLUGS = selectedSlugs()
if (!SLUGS) throw new Error('--slugs로 승인 대상을 명시해야 한다.')
const APPROVED_BY = requiredArg('--by')
const NOTE = requiredArg('--note')
const APPLY = process.argv.includes('--apply')

async function main() {
  const batch = readBatch(FILE)
  const targets = selectPeople(batch, SLUGS)
  let planned = 0
  let failed = 0

  for (const person of targets) {
    const errors: string[] = []
    if (person.profileType !== 'real') errors.push('fiction 전용 트랙 대상')
    if (!['keep', 'improve', 'new'].includes(person.route)) errors.push(`route=${person.route}`)
    if (person.route === 'keep') {
      if (sha256(person.currentText.trim()) !== person.currentHash) errors.push('유지 원문 해시 불일치')
      if (person.candidateText || person.candidateHash) errors.push('keep 경로에 후보가 있음')
    } else if (!person.candidateText || !person.candidateHash) {
      errors.push('후보 없음')
    } else if (sha256(person.candidateText.trim()) !== person.candidateHash) {
      errors.push('후보 해시 불일치')
    }

    const evidence = person.reviews?.find(review => review.lens === 'evidence')
    const editorial = person.reviews?.find(review => review.lens === 'editorial')
    for (const [label, review] of [
      ['evidence', evidence],
      ['editorial', editorial],
    ] as const) {
      if (!review) errors.push(`${label} 검토 없음`)
      else {
        if (review.verdict !== 'pass') errors.push(`${label} verdict=${review.verdict}`)
        if (review.blocking.length) errors.push(`${label} blocking ${review.blocking.length}건`)
        if (review.major.length) errors.push(`${label} major ${review.major.length}건`)
      }
    }
    if (person.review.blocking.length) errors.push(`집계 blocking ${person.review.blocking.length}건`)
    if (person.review.major.length) errors.push(`집계 major ${person.review.major.length}건`)

    if (errors.length) {
      failed++
      console.log(`FAIL\t${person.slug}\t${errors.join(' | ')}`)
      continue
    }

    planned++
    console.log(`${APPLY ? 'APPROVE' : 'PLAN'}\t${person.slug}\t${NOTE}`)
    if (APPLY) {
      person.approval = {
        approvedAt: new Date().toISOString(),
        approvedBy: APPROVED_BY,
        decisionNote: NOTE,
      }
      person.status = 'approved'
    }
  }

  if (APPLY && planned > 0) writeBatchAtomic(FILE, batch)
  console.log(JSON.stringify({
    mode: APPLY ? 'apply' : 'dry-run',
    planned,
    failed,
    batch: batch.batchId,
    file: FILE,
  }, null, 2))
  if (failed > 0) process.exitCode = 1
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
