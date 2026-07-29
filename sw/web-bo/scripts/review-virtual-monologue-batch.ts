/**
 * 가상 독백 후보를 별도 GPT-5.6 컨텍스트에서 비판 검토한다.
 *
 * evidence: 근거·정체·논쟁·어려운 정보 설명
 * editorial: 초독자 이해·인물 목소리·구조·한국어·결말
 *
 * 두 렌즈를 모두 통과해도 자동 승인하지 않는다. status는 reviewed까지만 바뀐다.
 *
 * 실행:
 *   pnpm exec tsx scripts/review-virtual-monologue-batch.ts \
 *     --file ../../docs/celeb-data/virtual-monologue/2026-07-29-VM-P1.json \
 *     --lens evidence --slugs peter-thiel --concurrency 2
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import {
  WORKBENCH_MODEL,
  aggregateReviews,
  publicDossier,
  readBatch,
  requiredArg,
  runCodex,
  selectPeople,
  selectedSlugs,
  sha256,
  writeBatchAtomic,
  type MonologuePerson,
  type ReviewIssue,
  type ReviewLens,
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
const LENS = (() => {
  const value = requiredArg('--lens')
  if (value !== 'evidence' && value !== 'editorial') {
    throw new Error(`--lens는 evidence 또는 editorial: ${value}`)
  }
  return value
})() as ReviewLens
const FORCE = process.argv.includes('--force')
const PROMPT_VERSION = LENS === 'editorial'
  ? 'vm-ko-review-editorial-v3'
  : 'vm-ko-review-evidence-v2'
const OUTPUT_DIR = resolve(process.cwd(), '.tmp-gpt-mono', 'workbench')
const REVIEW_SCHEMA = resolve(process.cwd(), 'scripts', 'schemas', 'virtual-monologue-review.schema.json')

type ReviewResponse = {
  verdict: 'pass' | 'revise' | 'hold'
  blocking: ReviewIssue[]
  major: ReviewIssue[]
  minor: ReviewIssue[]
  strengths: string[]
}

function evidencePrompt(person: MonologuePerson, text: string): string {
  return `너는 실존 인물 독백의 근거·정체성 감수자다. 도구를 쓰거나 추가 조사하지 말고 제공된 근거 묶음과 후보만 대조하라. 문장을 새로 쓰지 말고 결함을 구조화해 보고하라.

[인물]
${person.nickname} (${person.slug})

[검증된 근거 묶음]
${JSON.stringify(publicDossier(person.dossier), null, 2)}

[후보]
${text}

[판정 기준]
- blocking: 동명이인, 근거 없는 사실·직접 인용·내면 단정, 중대한 시대착오, 인물을 정반대로 묘사, URL·작업 지시 누출
- major: 핵심 행적·철학 누락, 논쟁이나 책임의 세탁, 근거보다 강한 단정, 어려운 개념이 처음 나올 때 괄호 안내 없음, 이해를 막는 전문용어, 현재 인물 자료의 중대한 한계 은폐
- minor: 정확하지만 더 쉬운 표현 가능, 작은 맥락 보강, 괄호가 과하거나 늦음
- 자기변호가 설득력 있다는 이유로 사실 검증을 느슨하게 하지 않는다.
- dossier에 없는 내면·후회·감정은 그럴듯해도 문제로 잡는다.
- 외부 비판을 화자의 후회·자기비판·약속·은밀한 자각으로 바꾼 문장은 직접 근거가 없으면 blocking으로 잡는다.
- 문제가 없으면 억지로 만들지 않는다.

verdict는 blocking이 있거나 자료 부족으로 판단 불가면 hold, blocking은 없지만 major가 있으면 revise, 둘 다 없으면 pass다. JSON만 출력하라.`
}

function editorialPrompt(person: MonologuePerson, text: string): string {
  return `너는 한국어 편집자이자 처음 읽는 독자다. 도구를 쓰거나 추가 조사하지 말라. 후보가 한 인물의 삶과 철학을 쉽고 고유한 목소리로 담았는지 비판하라. 문장을 새로 쓰지 말고 결함을 구조화해 보고하라.

[인물과 경로]
${person.nickname} / ${person.route}
경로 이유: ${person.routeReason}

[문장 검토가 참고할 전체 근거 범위]
${JSON.stringify(publicDossier(person.dossier), null, 2)}

[후보]
${text}

[판정 기준]
- blocking: 1인칭 붕괴, 존대·평어 혼용, 화자 오인, 혐오·선동을 비판 없이 재생산, 작업 지시·URL·마크다운 누출
- major: 누구에게나 붙는 목소리, 위키 요약·이력서식 나열, 삶과 철학의 연결 부재, 감정 없는 설명문, 근거 없이 꾸민 감정극, 초독자가 못 따라가는 개념, 상투 오프닝·교훈형 결말, 억지 역설과 'A가 아니라 B' 남발, 같은 리듬 반복
- minor: 문장 호흡, 어색한 어순, 번역투, 추상어, 중복, 괄호 표현의 길이와 위치
- 사실의 지원 여부와 인용 진위는 evidence 렌즈의 책임이다. editorial 검토에서는 '근거 없음'을 blocking·major·minor 코드로 만들지 않는다.
- 현재 원고보다 달라졌다는 사실 자체를 개선으로 보지 않는다.
- 쉬운 글이라는 이유로 인물 고유의 생각을 평평하게 만들지 않는다.
- 편집자의 비판을 화자의 자기반성으로 이식한 결말, 누구에게나 붙는 윤리적 균형 문장은 major로 잡는다.
- 위 근거 범위에 없는 사건·지배구조·피해·내면을 추가해야만 해결되는 요구는 결함으로 만들지 않는다. 조사 한계에 적힌 내용을 쓰라고 요구하지 않는다.
- 모든 tensions를 한 글에 억지로 넣으라고 요구하지 않는다. 선택한 중심축이 삶·철학·책임을 충분히 보여 주는지를 판단한다.
- major의 fix는 제공된 근거 안에서 삭제·압축·재배치·표현 교정으로 실제 해결할 수 있어야 한다. 새 조사나 새 사실을 요구해야 한다면 major 자격이 없다.
- 논쟁적 인물에게 모범적인 자기비판이나 희생 약속을 시키지 않는다. 외부의 비판과 화자의 실제 입장은 사실의 병치만으로도 긴장이 될 수 있다.
- 낯선 용어가 처음 나오는 문장의 짧은 괄호 안내는 이 서비스의 필수 장치다. 괄호가 있다는 이유만으로 결함을 만들지 말고, 지나치게 길거나 연속·중복돼 실제 호흡을 막을 때만 minor로 잡는다.
- 문제가 없으면 억지로 만들지 않는다.

verdict는 blocking이 있으면 hold, blocking은 없지만 major가 있으면 revise, 둘 다 없으면 pass다. JSON만 출력하라.`
}

function validateResponse(response: ReviewResponse): string[] {
  const errors: string[] = []
  for (const severity of ['blocking', 'major', 'minor'] as const) {
    if (!Array.isArray(response[severity])) {
      errors.push(`${severity} 배열 아님`)
      continue
    }
    for (const [index, issue] of response[severity].entries()) {
      if (!issue.code?.trim() || !issue.evidence?.trim() || !issue.fix?.trim()) {
        errors.push(`${severity} ${index + 1} 구조 불완전`)
      }
    }
  }
  if (!Array.isArray(response.strengths)) errors.push('strengths 배열 아님')
  if (response.blocking.length && response.verdict !== 'hold') {
    errors.push('blocking이 있는데 verdict가 hold 아님')
  }
  if (!response.blocking.length && response.major.length && response.verdict !== 'revise') {
    errors.push('major가 있는데 verdict가 revise 아님')
  }
  if (!response.blocking.length && !response.major.length && response.verdict !== 'pass') {
    errors.push('blocking/major가 없는데 verdict가 pass 아님')
  }
  return errors
}

type ReviewResult =
  | { kind: 'skip'; person: MonologuePerson; message: string }
  | { kind: 'fail'; person: MonologuePerson; message: string }
  | { kind: 'ok'; person: MonologuePerson; response: ReviewResponse }

async function reviewCandidate(
  batchId: string,
  person: MonologuePerson,
): Promise<ReviewResult> {
  const reviewedText = person.route === 'keep'
    ? person.currentText
    : person.candidateText
  const reviewedHash = person.route === 'keep'
    ? person.currentHash
    : person.candidateHash
  if (!reviewedText || !reviewedHash) {
    return { kind: 'skip', person, message: '검토할 본문 없음' }
  }
  if (sha256(reviewedText.trim()) !== reviewedHash) {
    return { kind: 'fail', person, message: '검토 본문 해시 불일치' }
  }
  const existing = person.reviews?.find(review => review.lens === LENS)
  if (existing && !FORCE) {
    return { kind: 'skip', person, message: `${LENS} 검토 이미 있음` }
  }

  const outputFile = resolve(OUTPUT_DIR, `${batchId}-${person.slug}-review-${LENS}.json`)
  if (existsSync(outputFile)) writeFileSync(outputFile, '', 'utf8')
  const prompt = LENS === 'evidence'
    ? evidencePrompt(person, reviewedText)
    : editorialPrompt(person, reviewedText)
  console.log(`START\t${person.slug}\t${LENS}`)
  await runCodex(prompt, outputFile, REVIEW_SCHEMA)
  const response = JSON.parse(readFileSync(outputFile, 'utf8')) as ReviewResponse
  const responseErrors = validateResponse(response)
  if (responseErrors.length) {
    return { kind: 'fail', person, message: responseErrors.join(' | ') }
  }
  return { kind: 'ok', person, response }
}

async function main() {
  if (!existsSync(REVIEW_SCHEMA)) throw new Error(`review schema 없음: ${REVIEW_SCHEMA}`)
  const batch = readBatch(FILE)
  const targets = selectPeople(batch, SLUGS)
  if (!targets.length) throw new Error('대상이 없다.')
  mkdirSync(OUTPUT_DIR, { recursive: true })

  const settled = await mapSettledWithConcurrency(
    targets,
    CONCURRENCY,
    person => reviewCandidate(batch.batchId, person),
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

    const response = result.value.response
    const review: ReviewPass = {
      lens: LENS,
      model: WORKBENCH_MODEL,
      promptVersion: PROMPT_VERSION,
      reviewedAt: new Date().toISOString(),
      verdict: response.verdict,
      blocking: response.blocking,
      major: response.major,
      minor: response.minor,
      strengths: response.strengths,
    }
    person.reviews = (person.reviews ?? []).filter(item => item.lens !== LENS)
    person.reviews.push(review)
    person.review = aggregateReviews(person)
    person.approval = null
    person.status = person.reviews.some(item => item.lens === 'evidence')
      && person.reviews.some(item => item.lens === 'editorial')
      ? 'reviewed'
      : 'draft'
    okCount += 1
    console.log(
      `OK\t${person.slug}\t${LENS}/${response.verdict}`
      + `\tB${response.blocking.length} M${response.major.length} m${response.minor.length}`,
    )
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
  console.log('자동 승인: 0건')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
