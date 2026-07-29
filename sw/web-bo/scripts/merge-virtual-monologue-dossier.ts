/**
 * 사람이 조사·작성한 인물별 dossier JSON을 작업 배치에 병합한다.
 *
 * 기계 병합만 하며 DB에는 접근하지 않는다. 기존 후보가 있으면 기본 차단한다.
 */

import { existsSync, readFileSync } from 'fs'
import { basename, resolve as resolvePath } from 'path'
import {
  readBatch,
  requiredArg,
  validateDossier,
  writeBatchAtomic,
  type MonologueDossier,
  type MonologueRoute,
} from './lib/virtual-monologue-workbench'

const FILE = resolvePath(process.cwd(), requiredArg('--file'))
const DOSSIER_FILE = resolvePath(process.cwd(), requiredArg('--dossier'))
const FORCE = process.argv.includes('--force')

type ResearchFile = {
  schemaVersion: number
  slug: string
  nickname: string
  route: Exclude<MonologueRoute, 'unreviewed'>
  routeReason: string
  dossier: MonologueDossier
}

function main() {
  if (!existsSync(DOSSIER_FILE)) throw new Error(`dossier 파일 없음: ${DOSSIER_FILE}`)
  const research = JSON.parse(readFileSync(DOSSIER_FILE, 'utf8')) as ResearchFile
  if (research.schemaVersion !== 1) {
    throw new Error(`지원하지 않는 dossier schemaVersion: ${research.schemaVersion}`)
  }
  if (!['keep', 'improve', 'new', 'hold'].includes(research.route)) {
    throw new Error(`route 오류: ${research.route}`)
  }
  if (!research.routeReason?.trim()) throw new Error('routeReason 없음')

  const batch = readBatch(FILE)
  const person = batch.people.find(item => item.slug === research.slug)
  if (!person) throw new Error(`배치에서 slug를 찾지 못함: ${research.slug}`)
  if (person.nickname !== research.nickname) {
    throw new Error(`동명이인 가드: 배치=${person.nickname}, dossier=${research.nickname}`)
  }
  if (person.profileType !== 'real') throw new Error('fiction은 전용 트랙에서 처리한다.')
  if (person.candidateText && !FORCE) {
    throw new Error('기존 후보가 있어 병합을 차단한다. 조사 변경으로 후보를 무효화하려면 --force를 명시한다.')
  }
  const reviewedTextBeforeMerge = person.route === 'keep'
    ? person.currentText
    : person.candidateText
  const reviewedHashBeforeMerge = person.route === 'keep'
    ? person.currentHash
    : person.candidateHash
  const reviewsBeforeMerge = person.reviews ?? []

  const original = {
    dossier: person.dossier,
    route: person.route,
    routeReason: person.routeReason,
  }
  person.dossier = research.dossier
  person.route = research.route
  person.routeReason = research.routeReason
  const errors = validateDossier(person)
  if (research.route === 'hold') {
    if (!research.dossier.researchLimits.length) errors.push('hold인데 researchLimits 없음')
  } else if (research.route === 'keep') {
    // 유지 판정도 바꾸지 않는 이유를 근거로 대조해야 하므로 동일한 dossier 문턱을 쓴다.
  }
  if (errors.length) {
    person.dossier = original.dossier
    person.route = original.route
    person.routeReason = original.routeReason
    throw new Error(`dossier 검증 실패: ${errors.join(' | ')}`)
  }

  if (FORCE) {
    if (reviewedTextBeforeMerge && reviewedHashBeforeMerge && reviewsBeforeMerge.length) {
      person.reviewHistory = person.reviewHistory ?? []
      person.reviewHistory.push({
        candidateText: reviewedTextBeforeMerge,
        candidateHash: reviewedHashBeforeMerge,
        archivedAt: new Date().toISOString(),
        archiveReason: '근거 조사·route 판정 변경으로 기존 검토를 무효화함',
        reviews: reviewsBeforeMerge,
      })
    }
    person.candidateText = null
    person.candidateHash = null
    person.candidateGeneratedAt = null
    person.candidatePromptVersion = null
    person.reviews = []
    person.review = { blocking: [], major: [], minor: [] }
    person.approval = null
    person.status = research.route === 'hold' ? 'hold' : 'draft'
  } else if (research.route === 'hold') {
    person.status = 'hold'
  } else {
    person.status = 'draft'
  }
  writeBatchAtomic(FILE, batch)
  console.log(`OK\t${research.slug}\t${research.route}\t${basename(DOSSIER_FILE)}`)
  console.log(`배치 저장: ${FILE} · DB 쓰기 0건`)
}

main()
