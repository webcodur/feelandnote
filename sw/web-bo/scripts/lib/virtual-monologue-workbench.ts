import { execFileSync, spawn } from 'child_process'
import { createHash } from 'crypto'
import {
  existsSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'fs'

export type MonologueRoute = 'unreviewed' | 'keep' | 'improve' | 'new' | 'hold'
export type MonologueStatus =
  | 'draft'
  | 'reviewed'
  | 'approved'
  | 'rejected'
  | 'hold'
  | 'published'
export type ReviewLens = 'evidence' | 'editorial'
export type ReviewSeverity = 'blocking' | 'major' | 'minor'

export type DossierSource = {
  url: string
  title: string
  publisher: string
  kind: 'primary' | 'scholarly' | 'institutional' | 'reputable-secondary'
  publishedAt: string | null
  accessedAt: string
  supports: string[]
}

export type SourcedPoint = {
  point: string
  significance?: string
  sourceUrls: string[]
}

export type HardTerm = {
  term: string
  guide: string
  sourceUrls: string[]
}

export type MonologueDossier = {
  identity: {
    name: string
    birth: string | null
    death: string | null
    profession: string | null
    disambiguation: string
    existingBioForDiscoveryOnly?: string
  }
  sources: DossierSource[]
  turningPoints: SourcedPoint[]
  positions: SourcedPoint[]
  tensions: SourcedPoint[]
  voice: {
    sentenceLength: string
    directness: string
    moves: string[]
    avoid: string[]
  }
  hardTerms: HardTerm[]
  researchLimits: string[]
}

export type ReviewIssue = {
  code: string
  evidence: string
  fix: string
}

export type ReviewPass = {
  lens: ReviewLens
  model: string
  promptVersion: string
  reviewedAt: string
  verdict: 'pass' | 'revise' | 'hold'
  blocking: ReviewIssue[]
  major: ReviewIssue[]
  minor: ReviewIssue[]
  strengths: string[]
}

export type ReviewCycle = {
  candidateText: string
  candidateHash: string
  archivedAt: string
  archiveReason: string
  reviews: ReviewPass[]
}

export type MonologuePerson = {
  slug: string
  nickname: string
  profileType: 'real' | 'fiction'
  tier: string | null
  profession: string | null
  influenceScore?: number | null
  targetChars?: number
  route: MonologueRoute
  routeReason: string
  currentText: string
  currentHash: string
  structuralAudit: unknown
  dossier: MonologueDossier
  candidateText: string | null
  candidateHash: string | null
  candidateGeneratedAt?: string | null
  candidatePromptVersion?: string | null
  reviews?: ReviewPass[]
  reviewHistory?: ReviewCycle[]
  review: {
    blocking: string[]
    major: string[]
    minor: string[]
  }
  approval?: {
    approvedAt: string
    approvedBy: string
    decisionNote: string
  } | null
  status: MonologueStatus
  publishedAt: string | null
  liveHtmlVerification?: {
    verifiedAt: string
    method: 'server-rendered-html'
    url: string
    httpStatus: number
    paragraphCount: number
    note: string
  } | null
  liveVerifiedAt: string | null
}

export type MonologueBatch = {
  schemaVersion: number
  batchId: string
  promptVersion: string
  model: string
  createdAt: string
  people: MonologuePerson[]
}

export const WORKBENCH_MODEL = 'gpt-5.6-sol'

export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

export function readBatch(file: string): MonologueBatch {
  if (!existsSync(file)) throw new Error(`배치 파일 없음: ${file}`)
  const batch = JSON.parse(readFileSync(file, 'utf8')) as MonologueBatch
  if (batch.schemaVersion !== 1) {
    throw new Error(`지원하지 않는 schemaVersion: ${batch.schemaVersion}`)
  }
  if (!batch.batchId || !batch.promptVersion || !batch.model || !batch.createdAt) {
    throw new Error('batchId, promptVersion, model, createdAt이 필요하다.')
  }
  if (!Array.isArray(batch.people)) throw new Error('people 배열이 필요하다.')
  const duplicateSlugs = batch.people
    .map(person => person.slug)
    .filter((slug, index, all) => all.indexOf(slug) !== index)
  if (duplicateSlugs.length) {
    throw new Error(`중복 slug: ${[...new Set(duplicateSlugs)].join(', ')}`)
  }
  return batch
}

export function writeBatchAtomic(file: string, batch: MonologueBatch): void {
  const temporary = `${file}.writing`
  writeFileSync(temporary, `${JSON.stringify(batch, null, 2)}\n`, 'utf8')
  renameSync(temporary, file)
}

export function argValue(flag: string): string | null {
  const index = process.argv.indexOf(flag)
  return index >= 0 ? process.argv[index + 1] ?? null : null
}

export function requiredArg(flag: string): string {
  const value = argValue(flag)
  if (!value) throw new Error(`${flag} 값이 필요하다.`)
  return value
}

export function selectedSlugs(): Set<string> | null {
  const raw = argValue('--slugs')
  return raw
    ? new Set(raw.split(',').map(value => value.trim()).filter(Boolean))
    : null
}

export function selectPeople(
  batch: MonologueBatch,
  slugs: Set<string> | null,
): MonologuePerson[] {
  if (!slugs) return batch.people
  const selected = batch.people.filter(person => slugs.has(person.slug))
  const found = new Set(selected.map(person => person.slug))
  const missing = [...slugs].filter(slug => !found.has(slug))
  if (missing.length) throw new Error(`배치에서 못 찾은 slug: ${missing.join(', ')}`)
  return selected
}

export function validateDossier(person: MonologuePerson): string[] {
  const dossier = person.dossier
  const errors: string[] = []
  if (!dossier?.identity?.disambiguation?.trim()) errors.push('동명이인 식별 정보 없음')
  if (!Array.isArray(dossier?.sources) || dossier.sources.length < 2) {
    errors.push('출처 2개 미만')
  }
  const sourceUrls = new Set<string>()
  for (const [index, source] of (dossier?.sources ?? []).entries()) {
    const prefix = `출처 ${index + 1}`
    if (!source.url?.trim()) errors.push(`${prefix} URL 없음`)
    else if (sourceUrls.has(source.url)) errors.push(`${prefix} URL 중복`)
    else sourceUrls.add(source.url)
    if (!source.title?.trim()) errors.push(`${prefix} 제목 없음`)
    if (!source.publisher?.trim()) errors.push(`${prefix} 발행처 없음`)
    if (!source.kind) errors.push(`${prefix} 종류 없음`)
    if (!source.accessedAt?.trim()) errors.push(`${prefix} 확인일 없음`)
    if (!Array.isArray(source.supports) || source.supports.length === 0) {
      errors.push(`${prefix} supports 없음`)
    }
  }
  if (
    dossier?.sources?.length
    && !dossier.sources.some(source => (
      source.kind === 'primary'
      || source.kind === 'institutional'
      || source.kind === 'scholarly'
    ))
  ) {
    errors.push('1차·기관·학술 출처 없음')
  }

  const validatePoints = (
    label: string,
    points: SourcedPoint[] | undefined,
    minimum: number,
  ) => {
    if (!Array.isArray(points) || points.length < minimum) {
      errors.push(`${label} ${minimum}개 미만`)
      return
    }
    for (const [index, point] of points.entries()) {
      if (!point.point?.trim()) errors.push(`${label} ${index + 1} 내용 없음`)
      if (!Array.isArray(point.sourceUrls) || point.sourceUrls.length === 0) {
        errors.push(`${label} ${index + 1} 출처 연결 없음`)
      } else {
        for (const url of point.sourceUrls) {
          if (!sourceUrls.has(url)) errors.push(`${label} ${index + 1} 미등록 출처 URL`)
        }
      }
    }
  }
  validatePoints('전환점', dossier?.turningPoints, 2)
  validatePoints('입장', dossier?.positions, 2)
  validatePoints('긴장', dossier?.tensions, 1)

  if (!dossier?.voice?.sentenceLength?.trim()) errors.push('목소리 문장 길이 없음')
  if (!dossier?.voice?.directness?.trim()) errors.push('목소리 직설성 없음')
  if (!Array.isArray(dossier?.voice?.moves) || dossier.voice.moves.length === 0) {
    errors.push('목소리 화법 없음')
  }
  if (!Array.isArray(dossier?.voice?.avoid) || dossier.voice.avoid.length === 0) {
    errors.push('목소리 금지 패턴 없음')
  }

  for (const [index, term] of (dossier?.hardTerms ?? []).entries()) {
    if (!term.term?.trim() || !term.guide?.trim()) {
      errors.push(`어려운 용어 ${index + 1} 설명 불완전`)
    }
    for (const url of term.sourceUrls ?? []) {
      if (!sourceUrls.has(url)) errors.push(`어려운 용어 ${index + 1} 미등록 출처 URL`)
    }
  }
  if (!Array.isArray(dossier?.researchLimits)) errors.push('researchLimits 배열 없음')
  return errors
}

const HANZI = /[一-鿿]/
const URL = /https?:\/\/|www\./i
const MARKDOWN_LINK = /\[[^\]]+\]\([^)]+\)/
const LEAKED_INSTRUCTION = /(?:독백 본문만|요청하신 독백|다음은 .*독백|초안을 작성|수정한 독백|Here is the monologue)/i
const FIRST_PERSON = /(?:저는|제가|저의|나는|내가|나의|제(?=\s))/

export function validateCandidateBasics(
  person: MonologuePerson,
  candidate: string,
): string[] {
  const errors: string[] = []
  if (!candidate.trim()) errors.push('빈 후보')
  if (HANZI.test(candidate)) errors.push('한자 혼입')
  if (candidate.includes('—')) errors.push('em dash 혼입')
  if (URL.test(candidate)) errors.push('URL 혼입')
  if (MARKDOWN_LINK.test(candidate)) errors.push('Markdown 링크 혼입')
  if (LEAKED_INSTRUCTION.test(candidate)) errors.push('작업 설명 누출')
  if (!FIRST_PERSON.test(candidate)) errors.push('1인칭 자기 지칭 없음')
  if (/(?:여러분|당신들)/.test(candidate)) errors.push('청중 직접 호명')
  if (candidate.trim() === person.currentText.trim()) errors.push('현재 원고와 동일')
  if (person.targetChars && candidate.trim().length > Math.ceil(person.targetChars * 1.35)) {
    errors.push(`분량 상한 초과(${candidate.trim().length}/${Math.ceil(person.targetChars * 1.35)}자)`)
  }
  return errors
}

export function publicDossier(dossier: MonologueDossier): Omit<
  MonologueDossier,
  'identity'
> & {
  identity: Omit<MonologueDossier['identity'], 'existingBioForDiscoveryOnly'>
} {
  const identity = { ...dossier.identity }
  delete identity.existingBioForDiscoveryOnly
  return { ...dossier, identity }
}

let codexExecutable: string | null = null

function findCodexExecutable(): string {
  if (codexExecutable) return codexExecutable
  try {
    const command = process.platform === 'win32' ? 'where.exe' : 'which'
    const output = execFileSync(command, ['codex'], { encoding: 'utf8' })
    const candidates = output.split(/\r?\n/).map(value => value.trim()).filter(Boolean)
    codexExecutable = candidates.find(value => value.toLowerCase().endsWith('.cmd'))
      ?? candidates[0]
      ?? 'codex'
  } catch {
    codexExecutable = process.platform === 'win32' ? 'codex.cmd' : 'codex'
  }
  return codexExecutable
}

export function runCodex(
  prompt: string,
  outputFile: string,
  outputSchema?: string,
): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const executable = findCodexExecutable()
    const command = process.platform === 'win32' && /\s/.test(executable)
      ? `"${executable}"`
      : executable
    const args = [
      'exec',
      '-',
      '--model',
      WORKBENCH_MODEL,
      '--ephemeral',
      '--sandbox',
      'read-only',
      '--config',
      'model_reasoning_effort="high"',
      '--output-last-message',
      outputFile,
      '--color',
      'never',
    ]
    if (outputSchema) args.push('--output-schema', outputSchema)
    const child = spawn(command, args, {
      shell: process.platform === 'win32',
      timeout: 300_000,
    })
    let stderr = ''
    child.stderr.on('data', chunk => {
      stderr += chunk.toString()
    })
    child.on('error', rejectPromise)
    child.on('close', code => {
      if (code === 0) resolvePromise()
      else rejectPromise(new Error(`codex exit ${code}: ${stderr.slice(-1000)}`))
    })
    child.stdin.write(prompt)
    child.stdin.end()
  })
}

export function aggregateReviews(person: MonologuePerson): MonologuePerson['review'] {
  const reviews = person.reviews ?? []
  const format = (lens: ReviewLens, issue: ReviewIssue) => (
    `[${lens}/${issue.code}] ${issue.evidence} → ${issue.fix}`
  )
  return {
    blocking: reviews.flatMap(review => review.blocking.map(issue => format(review.lens, issue))),
    major: reviews.flatMap(review => review.major.map(issue => format(review.lens, issue))),
    minor: reviews.flatMap(review => review.minor.map(issue => format(review.lens, issue))),
  }
}
