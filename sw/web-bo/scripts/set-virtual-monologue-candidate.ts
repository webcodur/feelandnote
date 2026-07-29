/**
 * 사람이 직접 편집한 후보 텍스트를 배치에 넣는다.
 *
 * 기존 후보와 검토는 reviewHistory에 보존하고 새 후보의 검토·승인은 초기화한다.
 * DB에는 접근하지 않는다.
 */

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import {
  readBatch,
  requiredArg,
  sha256,
  validateCandidateBasics,
  writeBatchAtomic,
} from './lib/virtual-monologue-workbench'

const FILE = resolve(process.cwd(), requiredArg('--file'))
const SLUG = requiredArg('--slug')
const TEXT_FILE = resolve(process.cwd(), requiredArg('--text'))
const NOTE = requiredArg('--note')

function main() {
  if (!existsSync(TEXT_FILE)) throw new Error(`후보 텍스트 파일 없음: ${TEXT_FILE}`)
  const candidateText = readFileSync(TEXT_FILE, 'utf8').trim()
  const batch = readBatch(FILE)
  const person = batch.people.find(item => item.slug === SLUG)
  if (!person) throw new Error(`배치에서 slug를 찾지 못함: ${SLUG}`)
  if (person.profileType !== 'real') throw new Error('fiction은 전용 트랙에서 처리한다.')
  if (person.route !== 'improve' && person.route !== 'new') {
    throw new Error(`수동 후보를 넣을 수 없는 route: ${person.route}`)
  }
  const errors = validateCandidateBasics(person, candidateText)
  if (errors.length) throw new Error(`후보 검증 실패: ${errors.join(' | ')}`)

  if (person.candidateText && person.candidateHash) {
    person.reviewHistory = person.reviewHistory ?? []
    person.reviewHistory.push({
      candidateText: person.candidateText,
      candidateHash: person.candidateHash,
      archivedAt: new Date().toISOString(),
      archiveReason: NOTE,
      reviews: person.reviews ?? [],
    })
  }
  person.candidateText = candidateText
  person.candidateHash = sha256(candidateText)
  person.candidateGeneratedAt = new Date().toISOString()
  person.candidatePromptVersion = 'vm-ko-manual-editor-v1'
  person.reviews = []
  person.review = { blocking: [], major: [], minor: [] }
  person.approval = null
  person.status = 'draft'
  writeBatchAtomic(FILE, batch)
  console.log(`OK\t${person.slug}\t${candidateText.length}자\t검토 초기화`)
  console.log(`배치 저장: ${FILE} · DB 쓰기 0건`)
}

main()
