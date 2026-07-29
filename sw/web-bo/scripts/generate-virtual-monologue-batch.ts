/**
 * 조사 완료 배치에서 GPT-5.6 한국어 독백 후보를 만든다.
 *
 * 근거 묶음 검증을 통과한 improve/new 인물만 처리하며 DB는 읽거나 쓰지 않는다.
 * 결과는 배치 JSON의 candidateText/candidateHash에 원자적으로 저장한다.
 *
 * 실행:
 *   pnpm exec tsx scripts/generate-virtual-monologue-batch.ts \
 *     --file ../../docs/celeb-data/virtual-monologue/2026-07-29-VM-P1.json \
 *     --slugs peter-thiel,alex-karp --concurrency 2
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import {
  WORKBENCH_MODEL,
  publicDossier,
  readBatch,
  requiredArg,
  runCodex,
  selectPeople,
  selectedSlugs,
  sha256,
  validateCandidateBasics,
  validateDossier,
  writeBatchAtomic,
  type MonologuePerson,
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
const PROMPT_VERSION = 'vm-ko-dossier-candidate-v3'
const OUTPUT_DIR = resolve(process.cwd(), '.tmp-gpt-mono', 'workbench')

const COMMANDER = new Set(['commander'])
const PLAIN_EXTRA = new Set([
  'friedrich-nietzsche',
  'julius-caesar',
  'kublai-khan',
  'chagatai-khan',
])

function isPlain(person: MonologuePerson): boolean {
  return COMMANDER.has(person.profession ?? '') || PLAIN_EXTRA.has(person.slug)
}

function targetChars(person: MonologuePerson): number {
  if (person.targetChars) return person.targetChars
  const score = person.influenceScore
  if (score !== null && score !== undefined && score >= 65) return 1200
  if (score !== null && score !== undefined && score >= 50) return 1000
  if (score !== null && score !== undefined && score >= 35) return 850
  return 800
}

function buildPrompt(person: MonologuePerson): string {
  const dossier = publicDossier(person.dossier)
  const origin = person.route === 'improve'
    ? `\n[현재 서비스 원고]\n${person.currentText}\n`
    : ''
  const routeInstruction = person.route === 'improve'
    ? `현재 원고에서 근거 묶음과 대조되는 사실·좋은 장면·이미 쉬운 설명만 살리고, ${person.routeReason}을 해결하라. 원고의 문장 순서와 골격은 필요하면 바꿔도 된다.`
    : `현재 원고를 참고하지 말고 근거 묶음에서 새 골격을 세워라. 신규 작성 이유는 다음과 같다: ${person.routeReason}`
  const tone = isPlain(person)
    ? `평어체다. 자기 자신은 '나는'·'내가'로 가리키고 종결은 '~다' 계열로 끝까지 통일한다.`
    : `정중체다. 자기 자신은 '저는'·'제가'로 가리키고 종결은 '~습니다' 계열로 끝까지 통일한다.`

  return `너는 실존 인물 1인칭 가상 독백을 쓰는 한국어 작가다. 도구를 쓰거나 추가 조사하지 말고, 아래 검증된 근거 묶음만 사실 근거로 사용하라. 현재 서비스 원고는 보존할 만한 장면과 표현을 찾는 참고문일 뿐 사실 근거가 아니다. 최종 응답은 독백 본문만 출력한다.

[목적]
이 인물을 처음 보는 독자가 다 읽고 나면 이 사람이 누구인지, 무엇을 했는지, 무엇을 믿었는지, 그 믿음과 삶 사이에 어떤 긴장이 있었는지 쉽게 이해해야 한다. 위인전 요약이나 철학 해설이 아니라, 당사자가 혼자 자기 삶을 되짚는 말이어야 한다.

[작업 경로]
${person.route}
${routeInstruction}
${origin}
[검증된 근거 묶음]
${JSON.stringify(dossier, null, 2)}

[작성 규칙]
1. 첫 문단에서 정체와 핵심 행적을 자연스럽게 잡되 모두를 '저는 누구입니다'로 열지 않는다.
2. 업적 목록보다 선택, 대가, 모순, 완고함이 드러나는 흐름을 만든다. 후회·두려움·깨달음 같은 내면은 dossier에 직접 근거가 있을 때만 쓴다.
3. 인물의 목소리는 dossier.voice를 따른다. 유명인 흉내용 유행어·과장된 카리스마·사극투를 덧칠하지 않는다.
4. 낯선 개념은 독자가 처음 만나는 바로 그 문장에서 괄호로 짧게 푼다. 예: '제로섬(한쪽의 이익이 다른 쪽의 손해가 되는 경쟁)'. 모든 쉬운 말에 괄호를 붙이지 않는다.
5. 인용부호 안의 직접 인용은 dossier에 실제 문구와 근거가 있을 때만 쓴다. 아니면 간접화법으로 쓴다.
6. 논쟁적인 인물은 자기 변호로 세탁하지 않는다. dossier.tensions의 반대 사실과 책임은 검증된 사건·결과로 함께 보여준다. 다만 외부의 비판을 화자의 후회·자기비판·약속·은밀한 자각으로 바꾸지 않는다. 그런 내면을 본인이 실제로 드러냈다는 직접 근거가 없으면 사실의 병치만으로 긴장을 만든다.
7. 혼잣말이므로 독자를 '여러분'·'당신들'이라 부르거나 행동을 권하며 끝내지 않는다. 마지막은 교훈이나 편집자가 붙인 윤리적 균형이 아니라, 근거가 확인된 실제 과업·선택·미해결 문제 중 이 인물에게 가장 고유한 것으로 닫는다.
8. 번역투, 논문투, 억지 역설, 'A가 아니라 B였다'의 반복, 이력서식 나열, 판박이 결말을 피한다.
9. 한자를 쓰지 않는다. em dash(—), URL, 마크다운, 작업 설명을 쓰지 않는다.
10. 분량은 ${targetChars(person)}자 내외다. 근거가 얇으면 되풀이하거나 지어내 늘리지 말고 짧게 맺는다.
11. ${tone}
12. 근거 묶음에 명시되지 않은 이름·사건·연대·직책·저작·인과관계·동기·감정을 상식이나 기억으로 보태지 않는다. 특히 한 항목의 사실을 다른 항목과 임의로 연결해 새로운 인과관계를 만들지 않는다.
13. dossier.researchLimits는 작가가 넘지 말아야 할 경계다. 화자가 '사료가 부족하다', '후대 기록만 남았다', '연구자들은 알 수 없다'처럼 조사 과정과 자료 한계를 직접 설명하게 만들지 않는다. 필요한 불확실성은 근거가 허용하는 범위에서 '전해진다', '기록에는 엇갈림이 있다'처럼 자연스럽게만 처리한다.

독백 본문만 출력하라.`
}

type GenerateResult =
  | { kind: 'skip'; person: MonologuePerson; message: string }
  | { kind: 'fail'; person: MonologuePerson; message: string }
  | { kind: 'ok'; person: MonologuePerson; candidate: string }

async function generateCandidate(
  batchId: string,
  person: MonologuePerson,
): Promise<GenerateResult> {
  if (person.profileType !== 'real') {
    return { kind: 'skip', person, message: 'fiction 전용 트랙' }
  }
  if (person.route !== 'improve' && person.route !== 'new') {
    return { kind: 'skip', person, message: `route=${person.route}` }
  }
  if (person.candidateText && !FORCE) {
    return { kind: 'skip', person, message: '기존 후보 있음' }
  }
  if (!person.routeReason.trim()) {
    return { kind: 'fail', person, message: 'routeReason 없음' }
  }
  const dossierErrors = validateDossier(person)
  if (dossierErrors.length) {
    return { kind: 'fail', person, message: dossierErrors.join(' | ') }
  }

  const outputFile = resolve(OUTPUT_DIR, `${batchId}-${person.slug}-candidate.txt`)
  if (existsSync(outputFile)) writeFileSync(outputFile, '', 'utf8')
  console.log(`START\t${person.slug}`)
  await runCodex(buildPrompt(person), outputFile)
  const candidate = readFileSync(outputFile, 'utf8').trim()
  const candidateErrors = validateCandidateBasics(person, candidate)
  if (candidateErrors.length) {
    return { kind: 'fail', person, message: candidateErrors.join(' | ') }
  }
  return { kind: 'ok', person, candidate }
}

async function main() {
  const batch = readBatch(FILE)
  const targets = selectPeople(batch, SLUGS)
  if (!targets.length) throw new Error('대상이 없다.')
  mkdirSync(OUTPUT_DIR, { recursive: true })

  const settled = await mapSettledWithConcurrency(
    targets,
    CONCURRENCY,
    person => generateCandidate(batch.batchId, person),
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

    const candidate = result.value.candidate
    person.targetChars = targetChars(person)
    person.candidateText = candidate
    person.candidateHash = sha256(candidate)
    person.candidateGeneratedAt = new Date().toISOString()
    person.candidatePromptVersion = PROMPT_VERSION
    person.reviews = []
    person.review = { blocking: [], major: [], minor: [] }
    person.approval = null
    person.status = 'draft'
    okCount += 1
    console.log(`OK\t${person.slug}\t${candidate.length}자`)
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
  console.log(`DB 쓰기: 0건 · 모델: ${WORKBENCH_MODEL}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
