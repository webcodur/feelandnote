/**
 * 독립 검토에서 나온 결함을 반영해 후보를 다시 쓴다.
 *
 * 수정 뒤 이전 검토와 승인은 전부 무효화한다. evidence/editorial 검토를 다시 실행해야 한다.
 * DB는 읽거나 쓰지 않는다.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import {
  publicDossier,
  readBatch,
  requiredArg,
  runCodex,
  selectPeople,
  selectedSlugs,
  sha256,
  validateCandidateBasics,
  writeBatchAtomic,
  type MonologuePerson,
  type ReviewPass,
} from './lib/virtual-monologue-workbench'
import {
  errorMessage,
  mapSettledWithConcurrency,
  parseConcurrency,
} from './lib/virtual-monologue-batch-concurrency'

const FILE = resolve(process.cwd(), requiredArg('--file'))
const SLUGS = selectedSlugs()
const CONCURRENCY = parseConcurrency()
const FORCE = process.argv.includes('--force')
const PROMPT_VERSION = 'vm-ko-dossier-revision-v3'
const OUTPUT_DIR = resolve(process.cwd(), '.tmp-gpt-mono', 'workbench')

function buildPrompt(person: MonologuePerson): string {
  return `너는 실존 인물 1인칭 가상 독백을 다시 쓰는 한국어 편집자다. 도구를 쓰거나 추가 조사하지 말고 제공된 근거, 현재 후보, 검토 결과만 사용하라. 최종 응답은 수정된 독백 본문만 출력한다.

[인물과 경로]
${person.nickname} / ${person.route}
경로 이유: ${person.routeReason}

[검증된 근거 묶음]
${JSON.stringify(publicDossier(person.dossier), null, 2)}

[현재 후보]
${person.candidateText}

[독립 검토 결과]
${JSON.stringify(person.reviews ?? [], null, 2)}

[수정 원칙]
- blocking과 major는 전부 해결한다. minor는 고치다가 목소리나 사실을 해치지 않는 범위에서 반영한다.
- 지적받지 않은 강한 장면과 쉬운 설명은 보존한다.
- 새 사실, 새 직접 인용, 근거 없는 내면을 보태 해결한 척하지 않는다.
- 현재 후보에 남아 있더라도 근거 묶음에 명시되지 않은 이름·사건·연대·직책·저작·인과관계·동기·감정은 삭제하거나 근거가 허용하는 표현으로 좁힌다.
- 외부의 비판·논쟁·위험을 화자의 후회·자기비판·약속·은밀한 자각으로 이식하지 않는다. 직접 근거가 없으면 검증된 사건과 결과를 병치해 긴장을 보여준다.
- 결말에 편집자의 윤리적 교훈을 덧붙이지 않는다. 근거가 확인된 실제 과업·선택·미해결 문제로 닫는다.
- dossier.researchLimits는 편집 경계일 뿐 화자의 대사가 아니다. '사료가 부족하다', '연구자들은 알 수 없다' 같은 조사 설명을 화자에게 시키지 않는다.
- 낯선 개념은 처음 등장하는 문장에서만 괄호로 짧게 푼다.
- 누구에게나 붙는 교훈, 이력서식 나열, 억지 역설, 같은 리듬 반복을 피한다.
- 한자, em dash(—), URL, 마크다운, 작업 설명을 쓰지 않는다.
- 혼잣말의 1인칭과 기존 존대·평어 체계를 끝까지 유지한다.
- 목표는 ${person.targetChars ?? 800}자 내외이며 최대 ${Math.ceil((person.targetChars ?? 800) * 1.35)}자를 넘지 않는다. 핵심을 지키고 이력·책임론 반복을 압축한다.

수정된 독백 본문만 출력하라.`
}

type ReviseResult =
  | { kind: 'skip'; person: MonologuePerson; message: string }
  | { kind: 'fail'; person: MonologuePerson; message: string }
  | {
    kind: 'ok'
    person: MonologuePerson
    candidate: string
    reviewedCandidate: string
    reviewedCandidateHash: string
    reviews: ReviewPass[]
  }

async function reviseCandidate(
  batchId: string,
  person: MonologuePerson,
): Promise<ReviseResult> {
  if (!person.candidateText || !person.candidateHash) {
    return { kind: 'skip', person, message: '후보 없음' }
  }
  if (sha256(person.candidateText.trim()) !== person.candidateHash) {
    return { kind: 'fail', person, message: '후보 해시 불일치' }
  }
  const reviews = person.reviews ?? []
  const actionable = reviews.some(review => (
    review.verdict !== 'pass'
    || review.blocking.length > 0
    || review.major.length > 0
  ))
  if (!actionable && !FORCE) {
    return { kind: 'skip', person, message: 'blocking/major 없음' }
  }
  if (!reviews.length && !FORCE) {
    return { kind: 'skip', person, message: '검토 결과 없음' }
  }
  const reviewedCandidate = person.candidateText
  const reviewedCandidateHash = person.candidateHash

  const outputFile = resolve(OUTPUT_DIR, `${batchId}-${person.slug}-revision.txt`)
  if (existsSync(outputFile)) writeFileSync(outputFile, '', 'utf8')
  console.log(`START\t${person.slug}`)
  await runCodex(buildPrompt(person), outputFile)
  const candidate = readFileSync(outputFile, 'utf8').trim()
  const errors = validateCandidateBasics(person, candidate)
  if (errors.length) {
    return { kind: 'fail', person, message: errors.join(' | ') }
  }
  return {
    kind: 'ok',
    person,
    candidate,
    reviewedCandidate,
    reviewedCandidateHash,
    reviews,
  }
}

async function main() {
  const batch = readBatch(FILE)
  const targets = selectPeople(batch, SLUGS)
  if (!targets.length) throw new Error('대상이 없다.')
  mkdirSync(OUTPUT_DIR, { recursive: true })

  const settled = await mapSettledWithConcurrency(
    targets,
    CONCURRENCY,
    person => reviseCandidate(batch.batchId, person),
  )
  const failedSlugs: string[] = []
  let okCount = 0
  let skipCount = 0

  for (const [index, result] of settled.entries()) {
    const person = targets[index]
    if (result.status === 'rejected') {
      failedSlugs.push(person.slug)
      console.log(`FAIL\t${person.slug}\t${errorMessage(result.reason)}`)
      continue
    }
    if (result.value.kind === 'skip') {
      skipCount += 1
      console.log(`SKIP\t${person.slug}\t${result.value.message}`)
      continue
    }
    if (result.value.kind === 'fail') {
      failedSlugs.push(person.slug)
      console.log(`FAIL\t${person.slug}\t${result.value.message}`)
      continue
    }

    const {
      candidate,
      reviewedCandidate,
      reviewedCandidateHash,
      reviews,
    } = result.value
    person.candidateText = candidate
    person.candidateHash = sha256(candidate)
    person.candidateGeneratedAt = new Date().toISOString()
    person.candidatePromptVersion = PROMPT_VERSION
    person.reviewHistory = person.reviewHistory ?? []
    person.reviewHistory.push({
      candidateText: reviewedCandidate,
      candidateHash: reviewedCandidateHash,
      archivedAt: new Date().toISOString(),
      archiveReason: '독립 검토 결함을 반영해 후보를 수정함',
      reviews,
    })
    person.reviews = []
    person.review = { blocking: [], major: [], minor: [] }
    person.approval = null
    person.status = 'draft'
    okCount += 1
    console.log(`OK\t${person.slug}\t${candidate.length}자 · 이전 검토 무효화`)
  }

  if (okCount > 0) {
    writeBatchAtomic(FILE, batch)
    console.log(`배치 저장: ${FILE} · 성공 ${okCount}건 단일 원자 반영`)
  } else {
    console.log('배치 변경 없음')
  }
  console.log(
    `완료: OK ${okCount} · SKIP ${skipCount} · FAIL ${failedSlugs.length}`
    + ` · concurrency ${CONCURRENCY}`,
  )
  if (failedSlugs.length) {
    console.error(`재실행 대상: --slugs ${failedSlugs.join(',')}`)
    process.exitCode = 1
  }
  console.log('다음 단계: evidence와 editorial 검토를 모두 다시 실행')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
