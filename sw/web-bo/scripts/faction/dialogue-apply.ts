/**
 * 조사·검수된 팩션 인물 대사 배치를 DB SSoT에 조건부 반영한다.
 *
 * 원칙:
 * - 기본은 dry-run이다. `--apply`에서만 DB를 쓴다.
 * - expected의 본문·출처 5필드와 근거 필드 하나가 현재 값과 정확히
 *   일치할 때만 next로 바꾼다.
 * - 이미 next와 일치하면 SKIP한다.
 * - 유튜브 업로드 기록이 있는 편은 대사 본문·청크를 바꿀 수 없다.
 *   기존 본문을 그대로 둔 quoteOrigin/minedQuotes/minedNote 보강만 허용한다.
 * - 에피소드 전체를 불러와 필요한 필드만 바꾼 뒤, updated_at 낙관적 잠금이
 *   걸린 `faction_replace_episode` RPC로 에피소드 단위 원자 저장한다.
 * - 렌더 산출물 export와 왕복 검증은 자동 실행하지 않는다. 적용 뒤 실행할
 *   명령을 출력한다.
 *
 * 실행:
 *   pnpm exec tsx scripts/faction/dialogue-apply.ts <batch.json>
 *   pnpm exec tsx scripts/faction/dialogue-apply.ts <batch.json> --apply
 *
 * 검수 문서 5개를 그대로 묶을 때는 manifest에 `targets` 대신
 * `reviewDocs`를 둘 수 있다. 각 Markdown의 마지막 ```json 코드블록을
 * target 계약으로 읽으며, 경로는 manifest 기준 상대경로다.
 *
 * 입력 예:
 * {
 *   "batch": "2026-07-29-faction-dialogue-01",
 *   "targets": [{
 *     "folder": "X-Empire",
 *     "identity": {
 *       "name": "일론 머스크",
 *       "slug": "elon-musk",
 *       "tagSlug": "x-empire",
 *       "clusterLabel": "창업자"
 *     },
 *     "expected": {
 *       "quote": "현재 한국어 대사",
 *       "quoteEn": "Current English quote.",
 *       "quoteChunks": ["현재 한국어 대사"],
 *       "quoteEnChunks": ["Current English quote."],
 *       "quoteOrigin": null,
 *       "minedQuotes": null
 *     },
 *     "next": {
 *       "quote": "새 한국어 대사",
 *       "quoteEn": "New English quote.",
 *       "quoteChunks": ["새 한국어 대사"],
 *       "quoteEnChunks": ["New English quote."],
 *       "quoteOrigin": "https://example.com — 실제 발언 원문",
 *       "minedQuotes": [{
 *         "ref": "https://example.com",
 *         "en": "Verbatim source quote.",
 *         "ko": "원문에 충실한 한국어 번역."
 *       }]
 *     }
 *   }]
 * }
 *
 * 긴 기존 값 보존 잠금:
 * - `quoteOrigin`, `minedQuotes`, `minedNote`를 그대로 둘 때 전체 값을 복사하지 않고
 *   `{ "preserveSha256": "<canonical JSON의 SHA-256>" }`를 expected와 next에
 *   똑같이 지정할 수 있다.
 * - 현재 DB 값의 해시가 다르면 적용을 중단하고, 적용 시에는 현재 값을 문자 단위로 보존한다.
 */

import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { config } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  assembleFactionEpisode,
  type FactionRowSource,
} from '@feelandnote/shared/lib/faction-assemble'
import {
  canonicalJson,
  diffPointers,
  stripGenerated,
} from '@feelandnote/shared/lib/faction-schema'
import {
  factionEpisodePaths,
  inheritCelebVoices,
  inspectFactionDataFile,
  type CelebVoiceLookup,
  type CelebVoicePair,
} from '@feelandnote/shared/bo/faction-export'
import { replaceFactionEpisode } from '../../src/lib/faction-save'
import { BO_ROOT, REPO_ROOT } from '../lib/paths'

const WEB_BO_DIR = BO_ROOT
const PROJECT_ROOT = REPO_ROOT
const FACTIONS_DIR = path.join(PROJECT_ROOT, 'sw', 'remotion', 'public', 'factions')
const LINEUP_PATH = path.join(
  PROJECT_ROOT,
  'sw',
  'remotion',
  'scripts',
  'youtube',
  'faction-lineup.json',
)

const STATE_KEYS = [
  'quote',
  'quoteEn',
  'quoteChunks',
  'quoteEnChunks',
  'quoteOrigin',
  'minedQuotes',
  'minedNote',
] as const
const REQUIRED_STATE_KEYS = [
  'quote',
  'quoteEn',
  'quoteChunks',
  'quoteEnChunks',
  'quoteOrigin',
] as const
const BODY_KEYS = ['quote', 'quoteEn', 'quoteChunks', 'quoteEnChunks'] as const
const KNOWN_MINED_KEYS = new Set(['minedQuotes', 'minedNote'])

type Row = Record<string, unknown>
type NullableString = string | null
type NullableChunks = string[] | null

type MinedQuote = {
  ref: string
  en: string
  ko: string
}

type PreservedValue = {
  preserveSha256: string
}

type DialogueState = {
  quote: NullableString
  quoteEn: NullableString
  quoteChunks: NullableChunks
  quoteEnChunks: NullableChunks
  quoteOrigin: NullableString
  minedQuotes: MinedQuote[] | null
  minedNote: NullableString
}

type DialogueSpec = Omit<DialogueState, 'quoteOrigin' | 'minedQuotes' | 'minedNote'> & {
  quoteOrigin: NullableString | PreservedValue
  minedQuotes?: MinedQuote[] | null | PreservedValue
  minedNote?: NullableString | PreservedValue
}

type TargetIdentity = {
  /** faction_people.name과 정확히 일치 */
  name: string
  /** 지정하면 faction_people.slug와 정확히 일치 */
  slug?: string
  /** 지정하면 그룹 name과 정확히 일치 */
  groupName?: string
  /** 지정하면 그룹 tagSlug와 정확히 일치 */
  tagSlug?: string
  /** 지정하면 묶음 label과 정확히 일치 */
  clusterLabel?: string
  /** 모두 1-based. 이름이 겹칠 때 위치까지 잠근다. */
  groupPosition?: number
  clusterPosition?: number
  personPosition?: number
}

type BatchTarget = {
  folder: string
  identity: TargetIdentity
  expected: DialogueSpec
  next: DialogueSpec
}

type BatchFile = {
  batch: string
  targets: BatchTarget[]
}

type PersonMatch = {
  gi: number
  ci: number
  pi: number
  path: string
  group: Row
  cluster: Row
  person: Row
}

type BeatMatch = {
  bi: number
  path: string
  beat: Row
}

type CapturedRows = Map<string, Row[]>

type TargetPlan = {
  target: BatchTarget
  match: PersonMatch
  action: 'update' | 'skip'
  bodyChanged: boolean
  nextState: DialogueState
  beatMatch?: BeatMatch
  changedBeatKeys: Array<'text' | 'textEn'>
}

type EpisodePlan = {
  folder: string
  updatedAt: string
  fileState: ReturnType<typeof inspectFactionDataFile>
  before: Row
  next: Row
  targets: TargetPlan[]
}

function usage(): string {
  return [
    '사용:',
    '  pnpm exec tsx scripts/faction/dialogue-apply.ts <batch.json>',
    '  pnpm exec tsx scripts/faction/dialogue-apply.ts <batch.json> --apply',
    '',
    '기본은 dry-run입니다. --apply 전 해당 편의 faction-data.json이',
    'DB와 동일한 generated 상태여야 합니다.',
  ].join('\n')
}

function fail(message: string): never {
  throw new Error(message)
}

function isRecord(value: unknown): value is Row {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function own(obj: Row, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

function assertOnlyKeys(value: Row, allowed: readonly string[], label: string): void {
  const allowedSet = new Set(allowed)
  const unknown = Object.keys(value).filter(key => !allowedSet.has(key))
  if (unknown.length) fail(`${label}: 알 수 없는 필드 ${unknown.join(', ')}`)
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) fail(`${label}: 비어 있지 않은 문자열이어야 합니다`)
}

function assertPosition(value: unknown, label: string): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 1) {
    fail(`${label}: 1 이상의 정수여야 합니다`)
  }
}

function assertNullableString(value: unknown, label: string): asserts value is NullableString {
  if (value !== null && (typeof value !== 'string' || !value.trim())) {
    fail(`${label}: null 또는 비어 있지 않은 문자열이어야 합니다`)
  }
}

function assertNullableChunks(
  value: unknown,
  label: string,
  allowExistingEmpty = false,
): asserts value is NullableChunks {
  if (value === null) return
  if (!Array.isArray(value)) fail(`${label}: null 또는 문자열 배열이어야 합니다`)
  if (!value.length) {
    if (allowExistingEmpty) return
    fail(`${label}: null 또는 비어 있지 않은 문자열 배열이어야 합니다`)
  }
  value.forEach((chunk, index) => {
    if (allowExistingEmpty) {
      if (typeof chunk !== 'string') fail(`${label}[${index}]: 문자열이어야 합니다`)
      return
    }
    assertNonEmptyString(chunk, `${label}[${index}]`)
  })
}

function assertMinedQuotes(value: unknown, label: string): asserts value is MinedQuote[] | null {
  if (value === null) return
  if (!Array.isArray(value) || !value.length) fail(`${label}: null 또는 비어 있지 않은 배열이어야 합니다`)
  value.forEach((item, index) => {
    if (!isRecord(item)) fail(`${label}[${index}]: 객체여야 합니다`)
    assertOnlyKeys(item, ['ref', 'en', 'ko'], `${label}[${index}]`)
    assertNonEmptyString(item.ref, `${label}[${index}].ref`)
    assertNonEmptyString(item.en, `${label}[${index}].en`)
    assertNonEmptyString(item.ko, `${label}[${index}].ko`)
  })
}

function isPreservedValue(value: unknown): value is PreservedValue {
  return isRecord(value) && typeof value.preserveSha256 === 'string'
}

function assertPreservedValue(value: Row, label: string): void {
  assertOnlyKeys(value, ['preserveSha256'], label)
  if (!/^[a-f0-9]{64}$/.test(String(value.preserveSha256))) {
    fail(`${label}.preserveSha256: 소문자 SHA-256 64자리여야 합니다`)
  }
}

function assertNullableStringSpec(
  value: unknown,
  label: string,
): asserts value is NullableString | PreservedValue {
  if (!isRecord(value)) {
    assertNullableString(value, label)
    return
  }
  assertPreservedValue(value, label)
}

function assertMinedQuoteSpec(
  value: unknown,
  label: string,
): asserts value is MinedQuote[] | null | PreservedValue {
  if (!isRecord(value)) {
    assertMinedQuotes(value, label)
    return
  }
  assertPreservedValue(value, label)
}

function compact(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function assertQuoteChunks(
  quote: NullableString,
  chunks: NullableChunks,
  label: string,
): void {
  if (quote === null || chunks === null) {
    if (quote !== null || chunks !== null) fail(`${label}: quote와 chunks는 함께 null이어야 합니다`)
    return
  }
  const joined = chunks.join(' ')
  if (compact(quote) !== compact(joined)) {
    fail(`${label}: quote와 chunks.join(' ')이 일치하지 않습니다`)
  }
}

function validateState(value: unknown, label: string, requireJoined: boolean): asserts value is DialogueSpec {
  if (!isRecord(value)) fail(`${label}: 객체여야 합니다`)
  assertOnlyKeys(value, STATE_KEYS, label)
  for (const key of REQUIRED_STATE_KEYS) {
    if (!own(value, key)) fail(`${label}.${key}: expected/next의 필수 필드입니다`)
  }
  const hasMinedQuotes = own(value, 'minedQuotes')
  const hasMinedNote = own(value, 'minedNote')
  if (hasMinedQuotes === hasMinedNote) {
    fail(`${label}: minedQuotes와 minedNote 중 하나만 명시해야 합니다`)
  }
  assertNullableString(value.quote, `${label}.quote`)
  // 레거시 팩션에는 영문 미작성 상태가 null/null뿐 아니라 ''/[]로도 남아 있다.
  // 한국어 대사만 고칠 때 그 값을 억지로 정규화하지 않고 문자 그대로 보존할 수 있게 한다.
  if (value.quoteEn !== '') assertNullableString(value.quoteEn, `${label}.quoteEn`)
  assertNullableChunks(value.quoteChunks, `${label}.quoteChunks`, !requireJoined)
  assertNullableChunks(
    value.quoteEnChunks,
    `${label}.quoteEnChunks`,
    !requireJoined || value.quoteEn === '',
  )
  assertNullableStringSpec(value.quoteOrigin, `${label}.quoteOrigin`)
  if (hasMinedQuotes) assertMinedQuoteSpec(value.minedQuotes, `${label}.minedQuotes`)
  if (hasMinedNote) assertNullableStringSpec(value.minedNote, `${label}.minedNote`)
  if (requireJoined) {
    assertQuoteChunks(value.quote, value.quoteChunks, `${label} KO`)
    assertQuoteChunks(value.quoteEn, value.quoteEnChunks, `${label} EN`)
  }
}

function validateIdentity(value: unknown, label: string): asserts value is TargetIdentity {
  if (!isRecord(value)) fail(`${label}: 객체여야 합니다`)
  assertOnlyKeys(value, [
    'name',
    'slug',
    'groupName',
    'tagSlug',
    'clusterLabel',
    'groupPosition',
    'clusterPosition',
    'personPosition',
  ], label)
  assertNonEmptyString(value.name, `${label}.name`)
  for (const key of ['slug', 'groupName', 'tagSlug', 'clusterLabel'] as const) {
    if (own(value, key)) assertNonEmptyString(value[key], `${label}.${key}`)
  }
  for (const key of ['groupPosition', 'clusterPosition', 'personPosition'] as const) {
    if (own(value, key)) assertPosition(value[key], `${label}.${key}`)
  }
}

function validateBatch(value: unknown): asserts value is BatchFile {
  if (!isRecord(value)) fail('배치 파일 루트는 객체여야 합니다')
  assertOnlyKeys(value, ['batch', 'targets'], 'batch')
  assertNonEmptyString(value.batch, 'batch.batch')
  if (!Array.isArray(value.targets) || !value.targets.length) {
    fail('batch.targets: 대상이 1명 이상이어야 합니다')
  }
  value.targets.forEach((target, index) => {
    const label = `batch.targets[${index}]`
    if (!isRecord(target)) fail(`${label}: 객체여야 합니다`)
    assertOnlyKeys(target, ['folder', 'identity', 'expected', 'next'], label)
    assertNonEmptyString(target.folder, `${label}.folder`)
    validateIdentity(target.identity, `${label}.identity`)
    // 기존 결함을 고치는 배치도 만들 수 있어 expected에는 join 일치를 강제하지 않는다.
    // next는 렌더·음성 파이프라인이 읽을 최종값이므로 반드시 일치해야 한다.
    validateState(target.expected, `${label}.expected`, false)
    validateState(target.next, `${label}.next`, true)
  })
}

async function loadBatchFile(file: string): Promise<BatchFile> {
  const raw = JSON.parse(await readFile(file, 'utf8')) as unknown
  if (!isRecord(raw) || !('reviewDocs' in raw)) {
    validateBatch(raw)
    return raw
  }

  assertOnlyKeys(raw, ['batch', 'reviewDocs'], 'batch')
  assertNonEmptyString(raw.batch, 'batch.batch')
  if (!Array.isArray(raw.reviewDocs) || !raw.reviewDocs.length) {
    fail('batch.reviewDocs: 문서 경로가 1개 이상이어야 합니다')
  }

  const manifestDir = path.dirname(file)
  const targets: BatchTarget[] = []
  for (const [index, doc] of raw.reviewDocs.entries()) {
    assertNonEmptyString(doc, `batch.reviewDocs[${index}]`)
    const docPath = path.resolve(manifestDir, doc)
    const markdown = await readFile(docPath, 'utf8')
    const blocks = [...markdown.matchAll(/```json\s*([\s\S]*?)```/g)]
    if (!blocks.length) {
      fail(`${docPath}: json 코드블록이 없습니다`)
    }
    let target: unknown
    try {
      target = JSON.parse(blocks.at(-1)![1])
    } catch (error) {
      fail(`${docPath}: 마지막 json 코드블록 파싱 실패 — ${String(error)}`)
    }
    if (isRecord(target) && !('folder' in target) && !('identity' in target)) {
      const slug = markdown.match(/^- slug:\s*`([^`]+)`/m)?.[1]
      const name = markdown.match(/^#\s+(.+?)\s+대사(?:\s|$)/m)?.[1]
      if (!slug || !name) {
        fail(`${docPath}: 축약 계약의 제목 또는 slug를 읽을 수 없습니다`)
      }
      target = {
        ...target,
        folder: path.basename(path.dirname(path.dirname(path.dirname(docPath)))),
        identity: { name, slug },
      }
    }
    if (isRecord(target) && isRecord(target.identity)) {
      const identity = { ...target.identity }
      delete identity.nameEn
      for (const key of [
        'groupName',
        'tagSlug',
        'clusterLabel',
        'groupPosition',
        'clusterPosition',
        'personPosition',
      ]) {
        if (identity[key] === null || identity[key] === undefined) delete identity[key]
      }
      target = { ...target, identity }
    }
    targets.push(target as BatchTarget)
  }

  const expanded: unknown = { batch: raw.batch, targets }
  validateBatch(expanded)
  return expanded
}

function nullableString(value: unknown, label: string): NullableString {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') fail(`${label}: DB 값이 문자열/null이 아닙니다`)
  return value
}

function nullableChunks(value: unknown, label: string): NullableChunks {
  if (value === undefined || value === null) return null
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    fail(`${label}: DB 값이 문자열 배열/null이 아닙니다`)
  }
  return [...value] as string[]
}

function minedQuotes(value: unknown, label: string): MinedQuote[] | null {
  if (value === undefined || value === null) return null
  assertMinedQuotes(value, label)
  return structuredClone(value)
}

function stateOf(person: Row, label: string): DialogueState {
  return {
    quote: nullableString(person.quote, `${label}.quote`),
    quoteEn: nullableString(person.quoteEn, `${label}.quoteEn`),
    quoteChunks: nullableChunks(person.quoteChunks, `${label}.quoteChunks`),
    quoteEnChunks: nullableChunks(person.quoteEnChunks, `${label}.quoteEnChunks`),
    quoteOrigin: nullableString(person.quoteOrigin, `${label}.quoteOrigin`),
    minedQuotes: minedQuotes(person.minedQuotes, `${label}.minedQuotes`),
    minedNote: nullableString(person.minedNote, `${label}.minedNote`),
  }
}

function sameValue(a: unknown, b: unknown): boolean {
  return canonicalJson(a) === canonicalJson(b)
}

function sameState(a: DialogueState, b: DialogueState): boolean {
  return sameValue(a, b)
}

function valueSha256(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex')
}

function sameSpecState(actual: DialogueState, spec: DialogueSpec): boolean {
  for (const key of BODY_KEYS) {
    if (!sameValue(actual[key], spec[key])) return false
  }
  if (isPreservedValue(spec.quoteOrigin)) {
    if (valueSha256(actual.quoteOrigin) !== spec.quoteOrigin.preserveSha256) return false
  } else if (!sameValue(actual.quoteOrigin, spec.quoteOrigin)) {
    return false
  }
  if (own(spec, 'minedQuotes')) {
    if (isPreservedValue(spec.minedQuotes)) {
      return valueSha256(actual.minedQuotes) === spec.minedQuotes.preserveSha256
    }
    return sameValue(actual.minedQuotes, spec.minedQuotes)
  }
  if (isPreservedValue(spec.minedNote)) {
    return valueSha256(actual.minedNote) === spec.minedNote.preserveSha256
  }
  return sameValue(actual.minedNote, spec.minedNote)
}

function resolveState(actual: DialogueState, spec: DialogueSpec): DialogueState {
  return {
    quote: spec.quote,
    quoteEn: spec.quoteEn,
    quoteChunks: spec.quoteChunks,
    quoteEnChunks: spec.quoteEnChunks,
    quoteOrigin: isPreservedValue(spec.quoteOrigin)
      ? actual.quoteOrigin
      : spec.quoteOrigin,
    minedQuotes: isPreservedValue(spec.minedQuotes)
      ? structuredClone(actual.minedQuotes)
      : own(spec, 'minedQuotes')
        ? structuredClone(spec.minedQuotes ?? null)
        : structuredClone(actual.minedQuotes),
    minedNote: isPreservedValue(spec.minedNote)
      ? actual.minedNote
      : own(spec, 'minedNote')
        ? spec.minedNote ?? null
        : actual.minedNote,
  }
}

function bodyChanged(expected: DialogueSpec, next: DialogueSpec): boolean {
  return BODY_KEYS.some(key => !sameValue(expected[key], next[key]))
}

function setNullable(person: Row, key: keyof DialogueState, value: unknown): void {
  if (value === null) delete person[key]
  else person[key] = structuredClone(value)
}

function applyState(person: Row, next: DialogueState): void {
  for (const key of STATE_KEYS) setNullable(person, key, next[key])
}

function matchesIdentity(
  identity: TargetIdentity,
  group: Row,
  cluster: Row,
  person: Row,
  gi: number,
  ci: number,
  pi: number,
): boolean {
  if (person.isPerson === false) return false
  if (person.name !== identity.name) return false
  if (identity.slug !== undefined && person.slug !== identity.slug) return false
  if (identity.groupName !== undefined && group.name !== identity.groupName) return false
  if (identity.tagSlug !== undefined && group.tagSlug !== identity.tagSlug) return false
  if (identity.clusterLabel !== undefined && cluster.label !== identity.clusterLabel) return false
  if (identity.groupPosition !== undefined && gi + 1 !== identity.groupPosition) return false
  if (identity.clusterPosition !== undefined && ci + 1 !== identity.clusterPosition) return false
  if (identity.personPosition !== undefined && pi + 1 !== identity.personPosition) return false
  return true
}

function findPerson(script: Row, target: BatchTarget): PersonMatch {
  const matches: PersonMatch[] = []
  const groups = Array.isArray(script.groups) ? script.groups : []
  groups.forEach((groupValue, gi) => {
    if (!isRecord(groupValue)) fail(`${target.folder}: groups[${gi}]가 객체가 아닙니다`)
    const clusters = Array.isArray(groupValue.clusters) ? groupValue.clusters : []
    clusters.forEach((clusterValue, ci) => {
      if (!isRecord(clusterValue)) fail(`${target.folder}: groups[${gi}].clusters[${ci}]가 객체가 아닙니다`)
      const people = Array.isArray(clusterValue.people) ? clusterValue.people : []
      people.forEach((personValue, pi) => {
        if (!isRecord(personValue)) {
          fail(`${target.folder}: groups[${gi}].clusters[${ci}].people[${pi}]가 객체가 아닙니다`)
        }
        if (matchesIdentity(target.identity, groupValue, clusterValue, personValue, gi, ci, pi)) {
          matches.push({
            gi,
            ci,
            pi,
            path: `/groups/${gi}/clusters/${ci}/people/${pi}`,
            group: groupValue,
            cluster: clusterValue,
            person: personValue,
          })
        }
      })
    })
  })
  if (matches.length !== 1) {
    fail(
      `${target.folder}/${target.identity.name}: 대상 ${matches.length}건`
      + ' — identity에 slug/tagSlug/clusterLabel/position을 더 지정하세요',
    )
  }
  return matches[0]
}

function personAt(script: Row, match: PersonMatch): Row {
  const groups = script.groups as Row[]
  const group = groups?.[match.gi]
  const cluster = (group?.clusters as Row[])?.[match.ci]
  const person = (cluster?.people as Row[])?.[match.pi]
  if (!isRecord(person)) fail(`${match.path}: 저장 후 같은 위치에서 인물을 찾지 못했습니다`)
  return person
}

function representativeBeat(script: Row, match: PersonMatch, target: BatchTarget): BeatMatch {
  const group = (script.groups as Row[])?.[match.gi]
  const cluster = (group?.clusters as Row[])?.[match.ci]
  const beats = Array.isArray(cluster?.beats) ? cluster.beats as Row[] : []
  const person = personAt(script, match)
  const assigned = beats.flatMap((beat, bi) => {
    const sameSpeaker = typeof person.celebId === 'string' && person.celebId
      ? beat.speakerCelebId === person.celebId
      : typeof person.name === 'string' && beat.speaker === person.name
    return sameSpeaker ? [{ bi, path: `${match.path}/../../beats/${bi}`, beat }] : []
  })
  const primary = assigned.filter(item => item.beat.primaryQuote === true)
  const candidates = primary.length ? primary : assigned
  if (candidates.length !== 1) {
    fail(
      `${target.folder}/${target.identity.name}: 대표 화자 beat ${candidates.length}건`
      + ' — 장면 단일원천을 안전하게 고칠 수 있도록 BO에서 대표 대사를 하나 지정하세요',
    )
  }
  return candidates[0]
}

function beatAt(script: Row, match: PersonMatch, bi: number): Row {
  const group = (script.groups as Row[])?.[match.gi]
  const cluster = (group?.clusters as Row[])?.[match.ci]
  const beat = (cluster?.beats as Row[])?.[bi]
  if (!isRecord(beat)) fail(`${match.path}/../../beats/${bi}: 저장 후 같은 위치에서 beat를 찾지 못했습니다`)
  return beat
}

function changedBeatKeys(expected: DialogueSpec, next: DialogueSpec): Array<'text' | 'textEn'> {
  const keys: Array<'text' | 'textEn'> = []
  if (!sameValue(expected.quote, next.quote) || !sameValue(expected.quoteChunks, next.quoteChunks)) {
    keys.push('text')
  }
  if (!sameValue(expected.quoteEn, next.quoteEn)
    || !sameValue(expected.quoteEnChunks, next.quoteEnChunks)) {
    keys.push('textEn')
  }
  return keys
}

function applyBeatText(beat: Row, next: DialogueSpec, keys: Array<'text' | 'textEn'>): void {
  if (keys.includes('text')) beat.text = next.quoteChunks?.join('\n') ?? ''
  if (keys.includes('textEn')) {
    if (next.quoteEnChunks === null) delete beat.textEn
    else beat.textEn = next.quoteEnChunks.join('\n')
  }
}

function maskTargetFields(script: Row, plans: TargetPlan[]): Row {
  const clone = structuredClone(script)
  for (const plan of plans) {
    const person = personAt(clone, plan.match)
    for (const key of STATE_KEYS) delete person[key]
    if (plan.beatMatch) {
      const beat = beatAt(clone, plan.match, plan.beatMatch.bi)
      for (const key of plan.changedBeatKeys) delete beat[key]
    }
  }
  return clone
}

function assertOnlyDialogueFieldsChanged(before: Row, next: Row, plans: TargetPlan[], folder: string): void {
  const a = maskTargetFields(before, plans)
  const b = maskTargetFields(next, plans)
  if (!sameValue(a, b)) {
    const diffs = diffPointers(a, b).slice(0, 20)
    fail(`${folder}: 지정 대사 필드 밖 변경 감지\n${diffs.map(item => `  - ${item}`).join('\n')}`)
  }
}

function assertKnownMinedShape(captured: CapturedRows, folder: string): void {
  for (const row of captured.get('faction_people') ?? []) {
    if (row.mined === null || row.mined === undefined) continue
    if (!isRecord(row.mined)) fail(`${folder}/${String(row.name)}: mined가 객체/null이 아닙니다`)
    const unknown = Object.keys(row.mined).filter(key => !KNOWN_MINED_KEYS.has(key))
    if (unknown.length) {
      fail(
        `${folder}/${String(row.name)}: 알 수 없는 mined 키 ${unknown.join(', ')}`
        + ' — 전체 저장에서 조용히 소실될 수 있어 중단합니다',
      )
    }
  }
}

function capturingSource(db: SupabaseClient): { source: FactionRowSource; captured: CapturedRows } {
  const captured: CapturedRows = new Map()
  const source: FactionRowSource = async (table, col, values) => {
    const { data, error } = await db.from(table).select('*').in(col, values)
    if (error) throw new Error(`${table} 조회 실패(${col}): ${error.message}`)
    const rows = (data ?? []) as Row[]
    captured.set(table, rows)
    return rows
  }
  return { source, captured }
}

function createDb(): SupabaseClient {
  config({ path: path.join(WEB_BO_DIR, '.env'), quiet: true })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) fail('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function celebVoiceLookup(db: SupabaseClient): CelebVoiceLookup {
  return async (celebIds) => {
    const out = new Map<string, CelebVoicePair>()
    for (let i = 0; i < celebIds.length; i += 200) {
      const { data, error } = await db
        .from('celebs').select('id,voice_id_ko,voice_id_en').in('id', celebIds.slice(i, i + 200))
      if (error) throw new Error(`CELEB 목소리 조회 실패: ${error.message}`)
      for (const row of data ?? []) {
        const ko = (row.voice_id_ko as string | null)?.trim()
        const en = (row.voice_id_en as string | null)?.trim()
        if (ko || en) out.set(row.id as string, { ...(ko ? { ko } : {}), ...(en ? { en } : {}) })
      }
    }
    return out
  }
}

async function loadLineup(): Promise<Record<string, { uploads?: Record<string, unknown> }>> {
  const raw = JSON.parse(await readFile(LINEUP_PATH, 'utf8')) as unknown
  if (!isRecord(raw)) fail(`업로드 기록 파일 형식 오류: ${LINEUP_PATH}`)
  return raw as Record<string, { uploads?: Record<string, unknown> }>
}

function hasUploads(
  lineup: Record<string, { uploads?: Record<string, unknown> }>,
  folder: string,
): boolean {
  const uploads = lineup[folder]?.uploads
  return Boolean(uploads && Object.keys(uploads).length)
}

function localFileState(folder: string): ReturnType<typeof inspectFactionDataFile> {
  const { dataPath } = factionEpisodePaths(FACTIONS_DIR, folder)
  return inspectFactionDataFile(dataPath)
}

function assertFileApplyReady(plan: EpisodePlan): void {
  const state = plan.fileState
  if (state.kind === 'generated') return
  if (state.kind === 'hand-edited') {
    fail(
      `${plan.folder}: faction-data.json 손편집 감지`
      + ' — 파일과 DB 중 어느 쪽이 정본인지 먼저 판단하세요. --force는 자동 사용하지 않습니다',
    )
  }
  fail(
    `${plan.folder}: faction-data.json이 ${state.kind === 'pristine' ? '첫 export 미발효' : '없음'} 상태입니다`
    + '\nDB 적용 전에 아래 기준선 export를 먼저 실행하고 dry-run을 다시 돌리세요:'
    + `\n  pnpm.cmd --dir sw/remotion faction:export -- --episode '${plan.folder}'`
    + `\n  pnpm.cmd --dir sw/remotion faction:verify -- --episode '${plan.folder}' --drift`,
  )
}

function assertFileMatchesDb(
  state: ReturnType<typeof inspectFactionDataFile>,
  script: Row,
  folder: string,
): void {
  if (state.kind === 'absent') return
  const fileDoc = stripGenerated(state.doc)
  const diffs = diffPointers(fileDoc, script)
  if (diffs.length) {
    fail(
      `${folder}: faction-data.json과 DB가 ${diffs.length}곳 다릅니다`
      + '\nDB 적용 전에 drift를 해소하세요:'
      + `\n  pnpm.cmd --dir sw/remotion faction:verify -- --episode '${folder}' --drift`
      + `\n${diffs.slice(0, 20).map(item => `  - ${item}`).join('\n')}`,
    )
  }
}

async function buildEpisodePlan(
  db: SupabaseClient,
  folder: string,
  targets: BatchTarget[],
  lineup: Record<string, { uploads?: Record<string, unknown> }>,
): Promise<EpisodePlan> {
  const fileState = localFileState(folder)
  const original = fileState.kind === 'absent' ? undefined : fileState.doc
  const { source, captured } = capturingSource(db)
  const assembled = await assembleFactionEpisode(source, folder, original)
  const before = assembled.script as Row
  const updatedAt = assembled.row.updated_at
  if (typeof updatedAt !== 'string' || !updatedAt) fail(`${folder}: updated_at 없음`)

  assertKnownMinedShape(captured, folder)
  const fileComparable = structuredClone(before)
  await inheritCelebVoices(fileComparable, celebVoiceLookup(db))
  assertFileMatchesDb(fileState, fileComparable, folder)

  const next = structuredClone(before)
  const plans: TargetPlan[] = []
  const usedPaths = new Set<string>()
  const uploaded = hasUploads(lineup, folder)

  for (const target of targets) {
    const beforeMatch = findPerson(before, target)
    if (usedPaths.has(beforeMatch.path)) {
      fail(`${folder}${beforeMatch.path}: 한 배치에서 같은 인물을 두 번 지정했습니다`)
    }
    usedPaths.add(beforeMatch.path)

    const current = stateOf(beforeMatch.person, `${folder}${beforeMatch.path}`)
    const changesBody = bodyChanged(target.expected, target.next)
    const beatKeys = changedBeatKeys(target.expected, target.next)
    const resolvedNext = resolveState(current, target.next)

    if (sameSpecState(current, target.next)) {
      plans.push({
        target,
        match: beforeMatch,
        action: 'skip',
        bodyChanged: changesBody,
        nextState: resolvedNext,
        changedBeatKeys: [],
      })
      continue
    }
    if (!sameSpecState(current, target.expected)) {
      fail(
        `${folder}/${target.identity.name}: 현재 값이 expected도 next도 아닙니다`
        + `\n  current : ${canonicalJson(current)}`
        + `\n  expected: ${canonicalJson(target.expected)}`
        + `\n  next    : ${canonicalJson(target.next)}`,
      )
    }
    if (uploaded && changesBody) {
      fail(
        `${folder}/${target.identity.name}: 유튜브 업로드 기록이 있는 편의`
        + ' quote/quoteEn/quoteChunks/quoteEnChunks 변경은 금지됩니다.'
        + ' 기존 본문을 그대로 둔 quoteOrigin/minedQuotes 보강만 허용합니다',
      )
    }

    let beatMatch: BeatMatch | undefined
    if (beatKeys.length) {
      beatMatch = representativeBeat(before, beforeMatch, target)
      if (beatMatch.beat.voiceFile || beatMatch.beat.voiceDuration) {
        fail(
          `${folder}/${target.identity.name}: 기존 음성이 연결된 장면 대사입니다`
          + ' — 본문과 음성을 함께 교체하라는 사용자 지시 없이 변경하지 않습니다',
        )
      }
      applyBeatText(beatAt(next, beforeMatch, beatMatch.bi), target.next, beatKeys)
    }
    const nextPerson = personAt(next, beforeMatch)
    applyState(nextPerson, resolvedNext)
    plans.push({
      target,
      match: beforeMatch,
      action: 'update',
      bodyChanged: changesBody,
      nextState: resolvedNext,
      beatMatch,
      changedBeatKeys: beatKeys,
    })
  }

  assertOnlyDialogueFieldsChanged(before, next, plans, folder)
  return { folder, updatedAt, fileState, before, next, targets: plans }
}

function printPlan(batchName: string, plans: EpisodePlan[], apply: boolean): void {
  let updates = 0
  let skips = 0
  console.log(`배치 ${batchName} · ${apply ? 'APPLY' : 'DRY-RUN'}`)
  for (const plan of plans) {
    console.log(`\n[${plan.folder}] updated_at=${plan.updatedAt}`)
    console.log(`  파일 상태: ${plan.fileState.kind}`)
    for (const item of plan.targets) {
      if (item.action === 'skip') {
        skips++
        console.log(`  SKIP ${item.target.identity.name} — 이미 next와 일치`)
      } else {
        updates++
        const scope = item.bodyChanged ? '본문+근거' : '근거만'
        console.log(`  PLAN ${item.target.identity.name} — ${scope}`)
      }
    }
  }
  console.log(`\n합계: 변경 예정 ${updates}명 · SKIP ${skips}명`)
}

function printCommands(folders: string[], phase: 'before' | 'after'): void {
  if (!folders.length) return
  if (phase === 'before') {
    console.log('\n--apply 전 파일 기준선 확인:')
    for (const folder of folders) {
      console.log(`  pnpm.cmd --dir sw/remotion faction:verify -- --episode '${folder}' --drift`)
      console.log(`  # 미발효이면 먼저: pnpm.cmd --dir sw/remotion faction:export -- --episode '${folder}'`)
    }
    return
  }
  console.log('\n적용 후 렌더 산출물·왕복 검증 명령:')
  for (const folder of folders) {
    console.log(`  pnpm.cmd --dir sw/remotion faction:export -- --episode '${folder}'`)
    console.log(`  pnpm.cmd --dir sw/remotion faction:verify -- --episode '${folder}'`)
    console.log(`  pnpm.cmd --dir sw/remotion faction:verify -- --episode '${folder}' --drift`)
    console.log(`  pnpm.cmd --dir sw/remotion voice:faction -- --episode '${folder}' --list`)
  }
  console.log('  ※ 새 음성 전에는 --update-json / faction:durations-pull을 실행하지 마세요.')
}

async function applyEpisode(db: SupabaseClient, plan: EpisodePlan): Promise<void> {
  const updates = plan.targets.filter(item => item.action === 'update')
  if (!updates.length) return
  assertFileApplyReady(plan)

  const saved = await replaceFactionEpisode(db, plan.folder, plan.next, plan.updatedAt)
  const { source } = capturingSource(db)
  const reloaded = await assembleFactionEpisode(source, plan.folder)
  const actual = reloaded.script as Row

  if (!sameValue(plan.next, actual)) {
    const diffs = diffPointers(plan.next, actual).slice(0, 30)
    fail(
      `${plan.folder}: 저장 후 전체 대본 검증 실패`
      + `\n${diffs.map(item => `  - ${item}`).join('\n')}`,
    )
  }
  for (const item of updates) {
    const current = stateOf(personAt(actual, item.match), `${plan.folder}${item.match.path}`)
    if (!sameState(current, item.nextState)) {
      fail(`${plan.folder}/${item.target.identity.name}: 저장 후 next 불일치`)
    }
  }

  console.log(
    `APPLIED ${plan.folder}: ${updates.length}명`
    + ` · groups ${saved.counts.groups}`
    + ` · clusters ${saved.counts.clusters}`
    + ` · people ${saved.counts.people}`,
  )
}

function parseCli(): { apply: boolean; file: string } {
  const args = process.argv.slice(2).filter(arg => arg !== '--')
  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage())
    process.exit(0)
  }
  const unknownFlags = args.filter(arg => arg.startsWith('-') && arg !== '--apply')
  if (unknownFlags.length) fail(`알 수 없는 옵션: ${unknownFlags.join(', ')}\n${usage()}`)
  const files = args.filter(arg => !arg.startsWith('-'))
  if (files.length !== 1) fail(`batch.json 경로를 정확히 하나 지정하세요\n${usage()}`)
  return { apply: args.includes('--apply'), file: path.resolve(process.cwd(), files[0]) }
}

async function main(): Promise<void> {
  const cli = parseCli()
  const raw = await loadBatchFile(cli.file)

  const db = createDb()
  const lineup = await loadLineup()
  const byFolder = new Map<string, BatchTarget[]>()
  for (const target of raw.targets) {
    const list = byFolder.get(target.folder) ?? []
    list.push(target)
    byFolder.set(target.folder, list)
  }

  // 한 편이라도 expected 충돌·보호 위반이면 DB를 쓰기 전에 전부 중단한다.
  const plans: EpisodePlan[] = []
  for (const [folder, targets] of [...byFolder.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    plans.push(await buildEpisodePlan(db, folder, targets, lineup))
  }

  printPlan(raw.batch, plans, cli.apply)
  const changedFolders = plans
    .filter(plan => plan.targets.some(item => item.action === 'update'))
    .map(plan => plan.folder)

  if (!cli.apply) {
    printCommands(changedFolders, 'before')
    console.log('\nDRY-RUN 완료 · DB 쓰기 0건')
    return
  }

  // 적용 시작 전 모든 변경 편의 파일 기준선 상태를 먼저 확인한다.
  // 중간 편까지 저장한 뒤 다음 편의 미발효 상태를 발견하는 부분 적용을 막는다.
  for (const plan of plans) {
    if (plan.targets.some(item => item.action === 'update')) assertFileApplyReady(plan)
  }
  for (const plan of plans) await applyEpisode(db, plan)

  printCommands(changedFolders, 'after')
  console.log(`\nAPPLY 완료 · 에피소드 ${changedFolders.length}편`)
}

main().catch(error => {
  console.error(error instanceof Error ? `ERROR: ${error.message}` : error)
  process.exit(1)
})
