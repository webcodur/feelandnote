#!/usr/bin/env node

import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { appendFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import {
  AGY_TEXT_MODEL,
  agyCall,
  looksQuotaLimited,
} from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '../../../..')
const DEFAULT_OUT_DIR = resolve(REPO_ROOT, 'data/celeb/virtual-monologue/candidates')
const LAST_RUN_FILE = 'last-run.json'
const WRITER_VERSION = 'vm-writer-minimal-v3'
const GEMINI_REVIEW_VERSION = 'vm-review-independent-v5'
const OPUS_REVIEW_VERSION = 'vm-review-claude-cli-opus-v2'
const CLAUDE_OPUS_MODEL = 'opus'
const CLAUDE_OPUS_TRANSPORT = 'claude-cli'
const CALL_TIMEOUT_MS = 1_500_000
const MAX_TARGETS_PER_RUN = 100
const LIGHT_TIMEOUT_MS = 600_000
const DEVIN_MODEL = 'swe-2-max'
const DEVIN_TIMEOUT_MS = 3_600_000
const DEVIN_MAX_ATTEMPTS = 8
const DEVIN_RATE_LIMIT = /rate limit|Reached overall message/i

// 안내 문구의 단위가 초·분으로 바뀐다. 둘 다 읽고 최소 90초는 쉰다.
function rateLimitWaitMs(message) {
  const minutes = message.match(/reset in (\d+)\s*minute/i)
  const seconds = message.match(/reset in (\d+)\s*second/i)
  if (minutes) return Math.max(90_000, (Number(minutes[1]) + 1) * 60_000)
  if (seconds) return Math.max(90_000, (Number(seconds[1]) + 30) * 1_000)
  return 10 * 60_000
}
const LIGHT_REVIEW_BEFORE_YEAR = 1900
const TARGET_COLUMNS = 'id,slug,nickname,nickname_en,bio,birth_date,death_date,profession,nationality,celeb_tier,publication_status,virtual_monologue,virtual_monologue_locked_at'

const HIGH_RISK_TEXT = /(고대|중세|철학|종교|신학|신화|전설|독재|학살|전쟁|군사|무기|독가스|자살|암살|처형|노예|식민|반란|혁명|테러|홀로코스트|고문|범죄|논란)/
const SOURCE_TIERS = new Set(['primary', 'official', 'scholarly', 'reference'])
const CLAIM_KINDS = new Set(['voice', 'event', 'work', 'motive', 'responsibility', 'collaboration', 'context'])
const DISCOVERY_ONLY_HOST = /(^|\.)(wikipedia\.org|wikidata\.org|namu\.wiki|google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.naver\.com)$/i

function argValue(flag) {
  const index = process.argv.indexOf(flag)
  return index >= 0 ? process.argv[index + 1] : null
}

function hasFlag(flag) {
  return process.argv.includes(flag)
}

function parseSlugs() {
  const value = argValue('--slugs')
  if (!value) return []
  return [...new Set(value.split(',').map((slug) => slug.trim()).filter(Boolean))]
}

function parseLimit() {
  const value = argValue('--limit')
  if (!value) return null
  const limit = Number.parseInt(value, 10)
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_TARGETS_PER_RUN) {
    throw new Error(`--limit은 1~${MAX_TARGETS_PER_RUN} 정수여야 한다.`)
  }
  return limit
}

function parseYear(value) {
  const match = String(value ?? '').trim().match(/^-?\d{1,4}/)
  return match ? Number.parseInt(match[0], 10) : null
}

function baselineRisk(row) {
  const reasons = []
  const birthYear = parseYear(row.birth_date)
  const identityText = `${row.nickname ?? ''} ${row.bio ?? ''}`

  if (row.celeb_reality === 'FICTION') reasons.push('허구 인물')
  if (birthYear === null) reasons.push('생몰 식별 정보 부족')
  else if (birthYear < 1700) reasons.push('근세 이전 인물')
  if (!String(row.bio ?? '').trim()) reasons.push('소개 정보 없음')
  if (HIGH_RISK_TEXT.test(identityText)) reasons.push('오해·창작 위험 소재')

  return {
    level: reasons.length > 0 ? 'high' : 'standard',
    reasons,
  }
}

function buildWriterPrompt(row) {
  const name = row.nickname_en
    ? `${row.nickname}(${row.nickname_en})`
    : row.nickname
  return `${name}. 자신만의 말투로 자신의 삶과 철학을 독백한다. 분량은 A4 반 페이지.`
}

function buildReviewPrompt(row, draft, initialRisk) {
  const identity = {
    slug: row.slug,
    name: row.nickname,
    name_en: row.nickname_en,
    birth_date: row.birth_date,
    death_date: row.death_date,
    profession: row.profession,
    celeb_tier: row.celeb_tier,
    bio_for_identification_only: row.bio,
  }

  return `당신은 작가와 별개의 가상독백 사실 검수자다. 아래 초안을 이어 쓰지 말고 먼저 웹에서 인물의 신원, 생애, 직접 발화와 저술, 중심 사건을 독립적으로 확인하라. 인물 소개는 동명이인 구분용이며 사실 근거가 아니다.

최종 글은 확인된 행동·입장·저술·발화만 1인칭으로 재구성한다. 기록에 없는 장면, 내면 감정, 동기, 후회, 예언, 직접 대사와 화자의 사후 사건은 제거한다. 논쟁 중인 해석은 확정하지 않는다. 결과로 알려진 영향과 당시 문서로 확인되는 동기를 구분한다. 공동 연구·산업화·조력자가 있었던 업적을 화자 혼자의 성취로 바꾸지 않는다. 전기 목록과 현대인의 반성문 대신 그 사람에게 고유한 사고방식이 자연스러운 현대 한국어로 이어지게 한다. 무대 지시, 임종 장면, 마크다운, 한자, URL은 최종본문에 쓰지 않는다. 초안의 좋은 문장은 사실과 시점이 안전할 때 보존한다. final은 A4 반 페이지 분량으로 쓴다.

위험도는 다음처럼 판정한다.
- standard: 직접 발화와 공개 기록이 풍부하고 중심 서사가 명확하다.
- high: 원전이 희박하거나 해석이 논쟁적이며 폭력·전쟁·자살·종교·철학·전설처럼 동기와 책임을 꾸미기 쉽다.
초기 판정이 high이면 standard로 내리지 않는다. 근거가 부족해 안전한 독백을 만들 수 없으면 hold다.

verdict는 초안을 그대로 쓸 수 있으면 pass, 직접 고쳤으면 rewrite, 완성할 근거가 없으면 hold다. pass와 rewrite의 final에는 검수를 끝낸 독백만 넣는다.

출처 규칙:
- 실제로 원문 페이지를 열어 확인한 HTTPS URL만 쓴다. 검색 결과·검색 스니펫·위키백과·위키데이터·나무위키는 발견용일 뿐 sources에 넣지 않는다.
- tier는 primary(당사자 저술·연설·편지·인터뷰·원전), official(공공기관·공식 아카이브·공식 재단), scholarly(논문·학술 출판·연구기관 연구물), reference(편집 책임이 분명한 일반 참고자료) 중 하나다.
- standard의 pass/rewrite는 서로 다른 발행처 2곳 이상을 쓴다.
- high의 pass/rewrite는 서로 다른 발행처 3곳 이상을 쓰고, primary 또는 official이 최소 1곳, scholarly가 최소 1곳 있어야 한다.
- claimChecks에는 최종본문의 중심 주장과 그것을 직접 지지하는 sources URL을 연결한다. 말투·세계관은 voice, 생애의 중심 사실은 event 또는 work로 반드시 점검한다. 동기·책임·공동 업적을 본문에 쓰면 motive·responsibility·collaboration도 각각 점검한다. 출처가 직접 지지하지 않는 주장은 삭제하거나 범위를 줄인다.
- 실제 강연·편지·인터뷰라고 부르려면 그 원문이나 신뢰할 수 있는 판본을 sources에 포함한다. issues에서 근거로 언급한 자료도 sources에 포함한다.

JSON 객체 하나만 출력하라.
{
  "risk":"standard|high",
  "riskReasons":["짧은 근거"],
  "verdict":"pass|rewrite|hold",
  "issues":["초안에서 발견해 바로잡은 핵심 문제"],
  "sources":[{"tier":"primary|official|scholarly|reference","url":"https://...","supports":"이 URL이 지지하는 사실"}],
  "claimChecks":[{"kind":"voice|event|work|motive|responsibility|collaboration|context","claim":"최종본문의 중심 주장","sourceUrls":["https://..."]}],
  "final":"검수 완료 독백 또는 hold이면 빈 문자열"
}

[초기 위험도]
${JSON.stringify(initialRisk)}

[인물 식별]
${JSON.stringify(identity)}

[작가 초안]
${draft}`
}

function buildOpusReviewPrompt(row, draft, geminiReview, initialRisk) {
  const identity = {
    slug: row.slug,
    name: row.nickname,
    name_en: row.nickname_en,
    birth_date: row.birth_date,
    death_date: row.death_date,
    profession: row.profession,
    celeb_tier: row.celeb_tier,
    bio_for_identification_only: row.bio,
  }
  const minimumRisk = initialRisk.level === 'high' || geminiReview.risk === 'high'
    ? 'high'
    : 'standard'

  return `당신은 가상독백 파이프라인의 세 번째이자 마지막 책임 편집자다. 앞의 두 결과는 Gemini가 만든 초안과 검수안이다. 둘 다 참고자료일 뿐 사실로 신뢰하지 말고, 웹에서 인물의 신원·생애·직접 발화·저술·중심 사건을 독립적으로 다시 확인하라. 이전 sources도 각 원문 페이지를 직접 열어 내용이 실제 주장과 맞는지 확인하고, 맞지 않으면 버린다.

목표는 그 인물의 고유한 사고방식이 드러나는 자연스러운 한국어 1인칭 독백이다. 확인된 행동·입장·저술·발화만 재구성한다. 기록에 없는 장면, 감정, 동기, 후회, 예언, 직접 대사와 화자의 사후 사건은 만들지 않는다. 결과로 알려진 영향과 당시 기록으로 확인되는 동기를 구분한다. 공동 연구·산업화·조력자가 있었던 업적은 화자 혼자의 성취로 바꾸지 않는다. 논쟁 중인 해석은 확정하지 않는다. final은 A4 반 페이지 분량으로 쓴다.

전기 목록, 현대인의 반성문, 임종 무대, 판박이 역사극 말투, 교훈을 못박는 결말을 피한다. 멋을 위한 문예 어휘와 장식용 은유를 쓰지 말고 평범한 현대 한국어로 쓴다. 무대 지시, 마크다운, 한자, URL, 작업 설명은 final에 넣지 않는다. 첫 Gemini 초안이나 둘째 Gemini 최종안의 좋은 문장은 사실과 시점이 안전할 때만 보존한다.

최소 위험도는 ${minimumRisk}다. high를 standard로 내리지 않는다. 근거가 부족해 안전한 독백을 만들 수 없으면 억지로 완성하지 말고 hold로 끝낸다.

verdict는 둘째 Gemini의 final을 그대로 쓸 수 있으면 pass, 직접 고쳤거나 첫 초안에서 다시 구성했으면 rewrite, 완성할 근거가 없으면 hold다. pass와 rewrite의 final에는 최종 독백만 넣는다.

출처 규칙:
- 실제로 원문 페이지를 열어 확인한 HTTPS URL만 쓴다. 검색 결과·검색 스니펫·위키백과·위키데이터·나무위키는 발견용일 뿐 sources에 넣지 않는다.
- tier는 primary(당사자 저술·연설·편지·인터뷰·원전), official(공공기관·공식 아카이브·공식 재단), scholarly(논문·학술 출판·연구기관 연구물), reference(편집 책임이 분명한 일반 참고자료) 중 하나다.
- standard의 pass/rewrite는 서로 다른 발행처 2곳 이상을 쓴다.
- high의 pass/rewrite는 서로 다른 발행처 3곳 이상을 쓰고, primary 또는 official이 최소 1곳, scholarly가 최소 1곳 있어야 한다.
- claimChecks에는 final의 중심 주장과 그것을 직접 지지하는 sources URL을 연결한다. 말투·세계관은 voice, 생애의 중심 사실은 event 또는 work로 반드시 점검한다. 동기·책임·공동 업적을 final에 쓰면 motive·responsibility·collaboration도 각각 점검한다. 출처가 직접 지지하지 않는 주장은 삭제하거나 범위를 줄인다.
- 실제 강연·편지·인터뷰라고 부르려면 그 원문이나 신뢰할 수 있는 판본을 sources에 포함한다. issues에서 근거로 언급한 자료도 sources에 포함한다.

JSON 객체 하나만 출력하라.
{
  "risk":"standard|high",
  "riskReasons":["짧은 근거"],
  "verdict":"pass|rewrite|hold",
  "issues":["두 Gemini 결과에서 발견해 바로잡은 핵심 문제"],
  "sources":[{"tier":"primary|official|scholarly|reference","url":"https://...","supports":"이 URL이 지지하는 사실"}],
  "claimChecks":[{"kind":"voice|event|work|motive|responsibility|collaboration|context","claim":"final의 중심 주장","sourceUrls":["https://..."]}],
  "final":"최종 독백 또는 hold이면 빈 문자열"
}

[인물 식별]
${JSON.stringify(identity)}

[첫 Gemini 초안]
${draft}

[둘째 Gemini 검수안]
${JSON.stringify(geminiReview)}`
}

function claudeCall(prompt, { timeoutMs = CALL_TIMEOUT_MS } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('claude', [
      '-p',
      '--model', CLAUDE_OPUS_MODEL,
      '--effort', 'high',
      '--output-format', 'text',
      '--no-session-persistence',
      '--safe-mode',
      '--strict-mcp-config',
      '--permission-mode', 'dontAsk',
      '--tools', 'WebSearch,WebFetch',
    ], {
      cwd: REPO_ROOT,
      shell: process.platform === 'win32',
      timeout: timeoutMs,
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (data) => { stdout += data })
    child.stderr.on('data', (data) => { stderr += data })
    child.on('error', reject)
    child.on('close', (code, signal) => {
      const output = stdout.trim()
      if (code === 0 && output) resolvePromise(output)
      else if (signal) reject(new Error(`claude ${signal}: ${stderr.trim().slice(-1000)}`))
      else if (code === 0) reject(new Error('claude 응답이 비어 있다.'))
      else reject(new Error(`claude exit ${code}: ${stderr.trim().slice(-1000)}`))
    })
    child.stdin.end(prompt, 'utf8')
  })
}

function sourcePublisher(url) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' || DISCOVERY_ONLY_HOST.test(parsed.hostname)) return null
    return parsed.hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

function parseReview(raw, minimumRisk = 'standard') {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('검수 응답에서 JSON 객체를 찾지 못했다.')
  const value = JSON.parse(raw.slice(start, end + 1))
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('검수 응답이 JSON 객체가 아니다.')
  }

  const risk = String(value.risk ?? '').trim()
  const verdict = String(value.verdict ?? '').trim()
  const final = String(value.final ?? '').trim()
  const riskReasons = Array.isArray(value.riskReasons)
    ? value.riskReasons.map((item) => String(item).trim()).filter(Boolean)
    : []
  const issues = Array.isArray(value.issues)
    ? value.issues.map((item) => String(item).trim()).filter(Boolean)
    : []
  const sources = Array.isArray(value.sources)
    ? value.sources.map((item) => ({
      tier: String(item?.tier ?? '').trim(),
      url: String(item?.url ?? '').trim(),
      supports: String(item?.supports ?? '').trim(),
    })).filter((item) => SOURCE_TIERS.has(item.tier) && sourcePublisher(item.url) && item.supports)
    : []
  const claimChecks = Array.isArray(value.claimChecks)
    ? value.claimChecks.map((item) => ({
      kind: String(item?.kind ?? '').trim(),
      claim: String(item?.claim ?? '').trim(),
      sourceUrls: Array.isArray(item?.sourceUrls)
        ? [...new Set(item.sourceUrls.map((url) => String(url).trim()).filter(Boolean))]
        : [],
    })).filter((item) => CLAIM_KINDS.has(item.kind) && item.claim && item.sourceUrls.length > 0)
    : []

  if (!['standard', 'high'].includes(risk)) throw new Error(`검수 risk가 잘못됐다: ${risk}`)
  if (!['pass', 'rewrite', 'hold'].includes(verdict)) throw new Error(`검수 verdict가 잘못됐다: ${verdict}`)
  if (verdict !== 'hold' && !final) throw new Error('pass/rewrite 검수의 final이 비어 있다.')
  if (verdict !== 'hold') {
    const effectiveRisk = minimumRisk === 'high' || risk === 'high' ? 'high' : 'standard'
    const minimumSources = effectiveRisk === 'high' ? 3 : 2
    const publishers = new Set(sources.map((source) => sourcePublisher(source.url)))
    const sourceUrls = new Set(sources.map((source) => source.url))
    if (sources.length < minimumSources || publishers.size < minimumSources) {
      throw new Error(`${effectiveRisk} 검수의 독립 출처가 ${minimumSources}개보다 적다.`)
    }
    if (effectiveRisk === 'high') {
      if (!sources.some((source) => source.tier === 'primary' || source.tier === 'official')) {
        throw new Error('high 검수에 primary 또는 official 출처가 없다.')
      }
      if (!sources.some((source) => source.tier === 'scholarly')) {
        throw new Error('high 검수에 scholarly 출처가 없다.')
      }
    }
    const minimumClaims = effectiveRisk === 'high' ? 3 : 2
    if (claimChecks.length < minimumClaims) {
      throw new Error(`${effectiveRisk} 검수의 중심 주장 점검이 ${minimumClaims}개보다 적다.`)
    }
    if (!claimChecks.some((check) => check.kind === 'voice')) {
      throw new Error('검수에 voice 중심 주장 점검이 없다.')
    }
    if (!claimChecks.some((check) => check.kind === 'event' || check.kind === 'work')) {
      throw new Error('검수에 event 또는 work 중심 주장 점검이 없다.')
    }
    if (claimChecks.some((check) => check.sourceUrls.some((url) => !sourceUrls.has(url)))) {
      throw new Error('중심 주장 점검이 sources에 없는 URL을 참조한다.')
    }
  }

  return { risk, riskReasons, verdict, issues, sources, claimChecks, final }
}

function parseGeminiReviewForHandoff(raw, minimumRisk) {
  try {
    return { contractValid: true, ...parseReview(raw, minimumRisk) }
  } catch (error) {
    return {
      contractValid: false,
      parseError: error instanceof Error ? error.message : String(error),
      risk: 'high',
      riskReasons: ['둘째 Gemini 검수 응답이 구조·근거 계약을 통과하지 못함'],
      verdict: 'hold',
      issues: ['둘째 Gemini 응답은 최종 판정 자료로만 넘기고 신뢰하지 않음'],
      sources: [],
      claimChecks: [],
      final: '',
      rawResponse: String(raw).trim(),
    }
  }
}

function nonWhitespaceLength(value) {
  return [...String(value ?? '').replace(/\s/gu, '')].length
}

function mechanicalIssues(text) {
  const issues = []
  if (!/(나는|저는|내가|제가|나의|저의|난 |내 |제 |나를|저를|짐은|과인은|소인은)/.test(text)) issues.push('1인칭 화자가 드러나지 않음')
  if (/^\s*(?:\*+\s*)?[（(]/.test(text)) issues.push('무대 지시로 시작함')
  if (/(^|\n)#{1,6}\s|\*\*|```/.test(text)) issues.push('마크다운 혼입')
  if (/https?:\/\//i.test(text)) issues.push('최종본문 URL 혼입')
  if (/[一-鿿]/.test(text)) issues.push('한자 혼입')
  if (/—/.test(text)) issues.push('em dash 혼입')
  if (/<<<|MATERIALS|VOICE|FINAL|검수 결과|작성하겠습니다/.test(text)) issues.push('작업 문구 혼입')
  // 자료가 얇은 인물에서 연표를 한 덩어리로 늘어놓는 실패가 나온다.
  if (text.split(/\n\s*\n/).filter((part) => part.trim()).length < 2) issues.push('문단 없는 한 덩어리')
  if (/^\s*\d{4}년/.test(text)) issues.push('연도로 시작하는 이력서형')
  return issues
}

function styleFlags(text) {
  const flags = []
  if (/(칠흑 같은 밤|등불의 심지|마지막 숨|바람이 차다|돌아보면.{0,20}한평생|어둠.{0,20}빛)/s.test(text)) {
    flags.push('판박이 역사극·임종 표현')
  }
  return flags
}

function candidateStatus(verdict, hardIssues, flags, finalRisk) {
  if (verdict === 'hold' || hardIssues.length > 0 || flags.length > 0) return 'hold'
  return finalRisk === 'high' ? 'review-required' : 'ready'
}

function evaluateReview(initialRisk, review) {
  const hardIssues = review.verdict === 'hold' ? [] : mechanicalIssues(review.final)
  const flags = review.verdict === 'hold' ? [] : styleFlags(review.final)
  const finalRisk = initialRisk.level === 'high' || review.risk === 'high' || flags.length > 0
    ? 'high'
    : 'standard'
  return {
    hardIssues,
    flags,
    finalRisk,
    status: candidateStatus(review.verdict, hardIssues, flags, finalRisk),
  }
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function candidateInput(row) {
  return {
    id: row.id,
    nickname: row.nickname,
    nickname_en: row.nickname_en,
    birth_date: row.birth_date,
    death_date: row.death_date,
    profession: row.profession,
    celeb_tier: row.celeb_tier,
    bio: row.bio,
  }
}

function inputHash(row) {
  return sha256(JSON.stringify({
    models: {
      writer: AGY_TEXT_MODEL,
      geminiReview: AGY_TEXT_MODEL,
      opusReview: CLAUDE_OPUS_MODEL,
    },
    transports: {
      writer: 'agy',
      geminiReview: 'agy',
      opusReview: CLAUDE_OPUS_TRANSPORT,
    },
    writerVersion: WRITER_VERSION,
    geminiReviewVersion: GEMINI_REVIEW_VERSION,
    opusReviewVersion: OPUS_REVIEW_VERSION,
    slug: row.slug,
    ...candidateInput(row),
    virtual_monologue: row.virtual_monologue,
    virtual_monologue_locked_at: row.virtual_monologue_locked_at,
  }))
}

function createDb() {
  const url = process.env.NEXT_PUBLIC_DB_API_URL
  const key = process.env.DB_SECRET_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_DB_API_URL 또는 DB_SECRET_KEY가 없다.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function loadTargets(db, slugs, limit) {
  let query = db.from('celebs').select(TARGET_COLUMNS).order('slug')
  if (slugs.length > 0) query = query.in('slug', slugs)
  else query = query.eq('publication_status', 'active').is('virtual_monologue', null).limit(limit)
  const { data, error } = await query
  if (error) throw error

  if (slugs.length > 0) {
    const found = new Set((data ?? []).map((row) => row.slug))
    const missing = slugs.filter((slug) => !found.has(slug))
    if (missing.length) throw new Error(`DB에 없는 slug: ${missing.join(', ')}`)
    const order = new Map(slugs.map((slug, index) => [slug, index]))
    return [...data].sort((a, b) => order.get(a.slug) - order.get(b.slug))
  }
  return data ?? []
}

function candidatePath(outDir, slug) {
  const safe = slug.replace(/[^a-z0-9.-]/gi, '_')
  return resolve(outDir, `${safe}.json`)
}

async function readJsonIfExists(path) {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return null
  }
}

function resumableStages(previous, row, force) {
  const earlierStagesMatch = previous?.models?.writer === AGY_TEXT_MODEL
    && previous?.models?.geminiReview === AGY_TEXT_MODEL
    && previous?.writerVersion === WRITER_VERSION
    && previous?.geminiReviewVersion === GEMINI_REVIEW_VERSION
    && JSON.stringify(previous?.input) === JSON.stringify(candidateInput(row))
  if (force || previous?.status !== 'error' || !earlierStagesMatch) {
    return { draft: '', geminiReview: null, names: [] }
  }
  const draft = String(previous.writer?.draft ?? '').trim()
  const geminiReview = draft && previous.geminiReview ? previous.geminiReview : null
  return {
    draft,
    geminiReview,
    names: [draft && 'writer', geminiReview && 'gemini-review'].filter(Boolean),
  }
}

function compactResult(candidate, path, reused = false) {
  return {
    slug: candidate.slug,
    status: candidate.status,
    risk: candidate.risk?.final ?? null,
    verdict: candidate.review?.verdict ?? null,
    sourceCount: candidate.review?.sources?.length ?? 0,
    claimCheckCount: candidate.review?.claimChecks?.length ?? 0,
    nonWhitespaceChars: nonWhitespaceLength(candidate.final),
    resumedStages: candidate.resumedStages ?? [],
    errorStage: candidate.errorStage ?? null,
    error: candidate.error ? excerpt(candidate.error, 160) : null,
    issueCount: [
      ...(candidate.review?.issues ?? []),
      ...(candidate.mechanicalIssues ?? []),
      ...(candidate.styleFlags ?? []),
    ].length,
    path: relative(REPO_ROOT, path).replaceAll('\\', '/'),
    reused,
  }
}

function excerpt(value, length = 160) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text.length <= length ? text : `${text.slice(0, length - 1)}…`
}

function inspectionResult(candidate, path) {
  const final = String(candidate.final ?? '').trim()
  return {
    ...compactResult(candidate, path),
    issues: (candidate.review?.issues ?? []).slice(0, 2).map((issue) => excerpt(issue, 120)),
    opening: excerpt(final, 160),
    ending: final.length > 160 ? excerpt(final.slice(-160), 160) : '',
  }
}

async function generateOne(row, outDir, force) {
  const path = candidatePath(outDir, row.slug)
  const hash = inputHash(row)
  const previous = await readJsonIfExists(path)
  if (!force && String(row.virtual_monologue ?? '').trim()) {
    return { slug: row.slug, status: 'skipped-existing', risk: null, path: null, reused: false }
  }
  if (row.virtual_monologue_locked_at) {
    return { slug: row.slug, status: 'skipped-locked', risk: null, path: null, reused: false }
  }
  if (!force && previous?.inputHash === hash && ['ready', 'review-required', 'hold'].includes(previous.status)) {
    return compactResult(previous, path, true)
  }

  const initialRisk = baselineRisk(row)
  const resume = resumableStages(previous, row, force)
  const base = {
    schemaVersion: 2,
    slug: row.slug,
    name: row.nickname,
    models: {
      writer: AGY_TEXT_MODEL,
      geminiReview: AGY_TEXT_MODEL,
      opusReview: CLAUDE_OPUS_MODEL,
    },
    transports: {
      writer: 'agy',
      geminiReview: 'agy',
      opusReview: CLAUDE_OPUS_TRANSPORT,
    },
    writerVersion: WRITER_VERSION,
    geminiReviewVersion: GEMINI_REVIEW_VERSION,
    opusReviewVersion: OPUS_REVIEW_VERSION,
    generatedAt: new Date().toISOString(),
    inputHash: hash,
    resumedStages: resume.names,
    input: candidateInput(row),
  }

  const writerPrompt = buildWriterPrompt(row)
  let draft = resume.draft
  let geminiReview = resume.geminiReview
  let rawOpusReview = ''
  let errorStage = draft ? (geminiReview ? 'opus-review' : 'gemini-review') : 'writer'
  try {
    if (!draft) {
      draft = await agyCall(writerPrompt, {
        model: AGY_TEXT_MODEL,
        timeoutMs: CALL_TIMEOUT_MS,
      })
    }
    if (!geminiReview) {
      errorStage = 'gemini-review'
      const rawGeminiReview = await agyCall(
        buildReviewPrompt(row, draft, initialRisk),
        { model: AGY_TEXT_MODEL, timeoutMs: CALL_TIMEOUT_MS },
      )
      geminiReview = parseGeminiReviewForHandoff(rawGeminiReview, initialRisk.level)
    }

    const minimumFinalRisk = {
      level: initialRisk.level === 'high' || geminiReview.risk === 'high'
        ? 'high'
        : 'standard',
      reasons: [...new Set([...initialRisk.reasons, ...geminiReview.riskReasons])],
    }
    errorStage = 'opus-review'
    rawOpusReview = await claudeCall(
      buildOpusReviewPrompt(row, draft, geminiReview, initialRisk),
      { timeoutMs: CALL_TIMEOUT_MS },
    )
    const review = parseReview(rawOpusReview, minimumFinalRisk.level)
    const evaluation = evaluateReview(minimumFinalRisk, review)
    const candidate = {
      ...base,
      status: evaluation.status,
      risk: {
        baseline: initialRisk.level,
        final: evaluation.finalRisk,
        reasons: [...new Set([
          ...initialRisk.reasons,
          ...geminiReview.riskReasons,
          ...review.riskReasons,
          ...evaluation.flags,
        ])],
      },
      writer: { prompt: writerPrompt, draft },
      geminiReview,
      review,
      mechanicalIssues: evaluation.hardIssues,
      styleFlags: evaluation.flags,
      final: review.final,
      appliedAt: null,
    }
    await writeFile(path, `${JSON.stringify(candidate, null, 2)}\n`, 'utf8')
    return compactResult(candidate, path)
  } catch (error) {
    const candidate = {
      ...base,
      status: 'error',
      risk: { baseline: initialRisk.level, final: initialRisk.level, reasons: initialRisk.reasons },
      writer: draft ? { prompt: writerPrompt, draft } : null,
      geminiReview,
      rawOpusReview: rawOpusReview || null,
      errorStage,
      error: error instanceof Error ? error.message : String(error),
      appliedAt: null,
    }
    await writeFile(path, `${JSON.stringify(candidate, null, 2)}\n`, 'utf8')
    return compactResult(candidate, path)
  }
}

function summarize(results) {
  const counts = {}
  const risks = { standard: 0, high: 0 }
  for (const result of results) {
    counts[result.status] = (counts[result.status] ?? 0) + 1
    if (result.risk in risks) risks[result.risk] += 1
  }
  return { total: results.length, counts, risks }
}

async function generateCommand() {
  const slugs = parseSlugs()
  const limit = parseLimit()
  if (slugs.length === 0 && limit === null) {
    throw new Error('안전 중단: --slugs 또는 --limit을 지정해야 한다.')
  }
  if (slugs.length > MAX_TARGETS_PER_RUN) {
    throw new Error(`한 번에 ${MAX_TARGETS_PER_RUN}명을 넘길 수 없다.`)
  }

  const outDir = resolve(REPO_ROOT, argValue('--out-dir') ?? DEFAULT_OUT_DIR)
  await mkdir(outDir, { recursive: true })
  const db = createDb()
  const targets = await loadTargets(db, slugs, limit)
  const results = []
  for (const row of targets) {
    results.push(await generateOne(row, outDir, hasFlag('--force')))
  }

  const summaryPath = resolve(outDir, LAST_RUN_FILE)
  const report = {
    generatedAt: new Date().toISOString(),
    models: {
      writer: AGY_TEXT_MODEL,
      geminiReview: AGY_TEXT_MODEL,
      opusReview: CLAUDE_OPUS_MODEL,
    },
    transports: {
      writer: 'agy',
      geminiReview: 'agy',
      opusReview: CLAUDE_OPUS_TRANSPORT,
    },
    ...summarize(results),
    candidates: results,
  }
  await writeFile(summaryPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({
    command: 'generate',
    models: report.models,
    transports: report.transports,
    ...summarize(results),
    summaryPath: relative(REPO_ROOT, summaryPath).replaceAll('\\', '/'),
  }))
}

async function statusCommand() {
  const outDir = resolve(REPO_ROOT, argValue('--out-dir') ?? DEFAULT_OUT_DIR)
  if (!existsSync(outDir)) {
    console.log(JSON.stringify({ command: 'status', total: 0, outDir: relative(REPO_ROOT, outDir) }))
    return
  }
  const files = (await readdir(outDir)).filter((name) => name.endsWith('.json') && name !== LAST_RUN_FILE)
  const results = []
  for (const file of files) {
    const path = resolve(outDir, file)
    const candidate = await readJsonIfExists(path)
    if (candidate) results.push(compactResult(candidate, path))
  }
  console.log(JSON.stringify({
    command: 'status',
    ...summarize(results),
    outDir: relative(REPO_ROOT, outDir).replaceAll('\\', '/'),
  }))
}

async function inspectCommand() {
  const slugs = parseSlugs()
  if (slugs.length === 0) throw new Error('개략 검토에는 --slugs가 필요하다.')
  const outDir = resolve(REPO_ROOT, argValue('--out-dir') ?? DEFAULT_OUT_DIR)
  const candidates = []
  for (const slug of slugs) {
    const path = candidatePath(outDir, slug)
    const candidate = await readJsonIfExists(path)
    if (!candidate) throw new Error(`후보 파일이 없다: ${slug}`)
    candidates.push(inspectionResult(candidate, path))
  }
  console.log(JSON.stringify({ command: 'inspect', candidates }))
}

async function applyCommand() {
  if (!hasFlag('--apply')) throw new Error('DB 반영에는 --apply가 필요하다.')
  const slugs = parseSlugs()
  if (slugs.length === 0) throw new Error('DB 반영에는 --slugs가 필요하다.')
  const outDir = resolve(REPO_ROOT, argValue('--out-dir') ?? DEFAULT_OUT_DIR)
  const db = createDb()
  let applied = 0

  for (const slug of slugs) {
    const path = candidatePath(outDir, slug)
    const candidate = await readJsonIfExists(path)
    if (!candidate) throw new Error(`후보 파일이 없다: ${slug}`)
    const highRisk = candidate.risk?.final === 'high'
    if (highRisk && !hasFlag('--approve-high')) {
      throw new Error(`high 후보에는 --approve-high가 필요하다: ${slug}`)
    }
    const applicableStatus = candidate.status === 'ready'
      || (highRisk && candidate.status === 'review-required')
    if (!applicableStatus || !String(candidate.final ?? '').trim()) {
      throw new Error(`반영 가능한 검토 완료 후보가 아니다: ${slug}`)
    }

    const current = await db.from('celebs')
      .select('id,virtual_monologue,virtual_monologue_locked_at')
      .eq('slug', slug)
      .maybeSingle()
    if (current.error) throw current.error
    if (!current.data) throw new Error(`DB에 없는 slug: ${slug}`)
    if (current.data.virtual_monologue !== null || current.data.virtual_monologue_locked_at !== null) {
      throw new Error(`현재 독백이 비어 있지 않거나 잠겨 있다: ${slug}`)
    }

    if (!(await writeMonologue(db, current.data.id, candidate.final))) {
      throw new Error(`DB 재조회 값이 후보와 다르다: ${slug}`)
    }

    candidate.appliedAt = new Date().toISOString()
    await writeFile(path, `${JSON.stringify(candidate, null, 2)}\n`, 'utf8')
    applied += 1
  }

  console.log(JSON.stringify({ command: 'apply', applied }))
}

function selfTestCommand() {
  const modern = baselineRisk({
    nickname: '일론 머스크', bio: '기업가이자 투자자', birth_date: '1971-06-28', celeb_tier: 'full',
  })
  const ancient = baselineRisk({
    nickname: '히파티아', bio: '고대 철학자', birth_date: '350', celeb_tier: 'full',
  })
  const contested = baselineRisk({
    nickname: '프리츠 하버', bio: '화학무기 개발로 논란', birth_date: '1868-12-09', celeb_tier: 'full',
  })
  assert.equal(modern.level, 'standard')
  assert.equal(ancient.level, 'high')
  assert.equal(contested.level, 'high')

  const review = parseReview(JSON.stringify({
    risk: 'standard', riskReasons: [], verdict: 'rewrite', issues: ['사후 지식 제거'],
    sources: [
      { tier: 'primary', url: 'https://example.com/a', supports: '말투 A' },
      { tier: 'official', url: 'https://example.org/b', supports: '사건 B' },
    ],
    claimChecks: [
      { kind: 'voice', claim: '말투 A', sourceUrls: ['https://example.com/a'] },
      { kind: 'event', claim: '사건 B', sourceUrls: ['https://example.org/b'] },
    ],
    final: '나는 확인된 사실만 말한다. 내 삶에서 실제로 선택한 일을 구체적으로 설명하며, 그 선택이 내 생각과 어떻게 이어졌는지를 차분히 돌아본다. 기록이 남은 범위 안에서 책임과 한계를 함께 말하고, 알 수 없는 마음은 꾸며내지 않는다. 이것이 내가 남길 수 있는 독백이다.',
  }))
  assert.equal(review.verdict, 'rewrite')
  const brokenGeminiReview = parseGeminiReviewForHandoff('형식이 깨진 검수 응답', 'standard')
  assert.equal(brokenGeminiReview.contractValid, false)
  assert.equal(brokenGeminiReview.risk, 'high')
  assert.equal(brokenGeminiReview.verdict, 'hold')
  assert.equal(candidateStatus('rewrite', [], [], 'standard'), 'ready')
  assert.equal(candidateStatus('rewrite', [], [], 'high'), 'review-required')
  assert.equal(candidateStatus('rewrite', [], ['판박이 표현'], 'high'), 'hold')
  const hypatiaRow = {
    slug: 'hypatia', nickname: '히파티아', nickname_en: 'Hypatia',
    birth_date: '350', death_date: '415', profession: '철학자', celeb_tier: 'full',
    bio: '고대 철학자',
  }
  const resumable = {
    status: 'error',
    models: { writer: AGY_TEXT_MODEL, geminiReview: AGY_TEXT_MODEL, opusReview: 'old-agy-opus' },
    writerVersion: WRITER_VERSION,
    geminiReviewVersion: GEMINI_REVIEW_VERSION,
    input: candidateInput(hypatiaRow),
    writer: { draft: '완료된 초안' },
    geminiReview: review,
  }
  const resumed = resumableStages(resumable, hypatiaRow, false)
  assert.equal(resumed.draft, '완료된 초안')
  assert.equal(resumed.geminiReview, review)
  assert.deepEqual(resumed.names, ['writer', 'gemini-review'])
  assert.deepEqual(resumableStages(resumable, hypatiaRow, true).names, [])
  assert.equal(buildWriterPrompt(hypatiaRow), '히파티아(Hypatia). 자신만의 말투로 자신의 삶과 철학을 독백한다. 분량은 A4 반 페이지.')
  const geminiPrompt = buildReviewPrompt(hypatiaRow, '첫 초안', ancient)
  const opusPrompt = buildOpusReviewPrompt(hypatiaRow, '첫 초안', review, ancient)
  assert.match(geminiPrompt, /final은 A4 반 페이지 분량으로 쓴다/)
  assert.doesNotMatch(geminiPrompt, /540|600|660/)
  assert.match(opusPrompt, /세 번째이자 마지막 책임 편집자/)
  assert.match(opusPrompt, /최소 위험도는 high/)
  assert.match(opusPrompt, /final은 A4 반 페이지 분량으로 쓴다/)
  assert.doesNotMatch(opusPrompt, /540|600|660/)
  assert.deepEqual(
    [AGY_TEXT_MODEL, AGY_TEXT_MODEL, CLAUDE_OPUS_MODEL],
    ['gemini-3.8-flash-high', 'gemini-3.8-flash-high', 'opus'],
  )
  assert.throws(() => parseReview(JSON.stringify({
    risk: 'standard', verdict: 'pass',
    sources: [
      { tier: 'reference', url: 'https://ko.wikipedia.org/wiki/test', supports: '발견용 자료' },
      { tier: 'official', url: 'https://example.org/b', supports: '사건 B' },
    ],
    claimChecks: [
      { kind: 'voice', claim: '말투 A', sourceUrls: ['https://ko.wikipedia.org/wiki/test'] },
      { kind: 'event', claim: '사건 B', sourceUrls: ['https://example.org/b'] },
    ],
    final: review.final,
  })), /독립 출처/)
  assert.equal(nonWhitespaceLength('가 나\n다'), 3)
  const shortIssues = mechanicalIssues('*(밤, 독백한다)* 나는 말한다.')
  assert.deepEqual(shortIssues, ['무대 지시로 시작함', '문단 없는 한 덩어리'])
  assert.deepEqual(mechanicalIssues('1976년에 태어났다.\n\n나는 살았다.'), ['연도로 시작하는 이력서형'])
  assert.deepEqual(mechanicalIssues('나는 걸었다.\n\n그리고 멈췄다.'), [])
  console.log(JSON.stringify({
    command: 'self-test',
    ok: true,
    models: [AGY_TEXT_MODEL, AGY_TEXT_MODEL, CLAUDE_OPUS_MODEL],
  }))
}

// 비어 있고 잠기지 않은 경우에만 쓰고, 재조회 값이 같은지 돌려준다.
async function writeMonologue(db, id, text) {
  const updated = await db.from('celebs')
    .update({ virtual_monologue: text })
    .eq('id', id)
    .is('virtual_monologue', null)
    .is('virtual_monologue_locked_at', null)
    .select('virtual_monologue')
    .maybeSingle()
  if (updated.error) throw updated.error
  return updated.data?.virtual_monologue === text
}

// 가벼운 방식: Gemini 초안 1회. 입장이 뒤집히기 쉬운 한국 전근대 인물만 Gemini 검수 1회를 더한다.
function needsLightReview(row) {
  const year = parseYear(row.birth_date)
  return row.nationality === 'KR' && (year === null || year < LIGHT_REVIEW_BEFORE_YEAR)
}

function looseReviewFinal(raw) {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return ''
  try {
    const value = JSON.parse(raw.slice(start, end + 1))
    return ['pass', 'rewrite'].includes(value?.verdict) ? String(value.final ?? '').trim() : ''
  } catch {
    return ''
  }
}

// 배치 호출의 쿼터 소진은 오류 대신 시간 초과로 올 수 있어 agy 로그로 가른다.
function agyQuotaExhausted() {
  try {
    const dir = resolve(homedir(), '.gemini/antigravity-cli/log')
    const latest = readdirSync(dir).filter((name) => name.endsWith('.log'))
      .map((name) => ({ name, time: statSync(resolve(dir, name)).mtimeMs }))
      .sort((a, b) => b.time - a.time)[0]
    return !!latest && /Individual quota reached|RESOURCE_EXHAUSTED/.test(readFileSync(resolve(dir, latest.name), 'utf8').slice(-20000))
  } catch {
    return false
  }
}

async function agyAlive() {
  try {
    return /OK/.test(await agyCall('Reply with exactly: OK', { timeoutMs: 60_000 }))
  } catch {
    return false
  }
}

const REFUSAL_TEXT = /(작성할 수 없|생성할 수 없|쓸 수 없습니다|방침에 따라|죄송하지만|죄송합니다|I can(?:'|no)t)/

// 첫머리 무대 지시·제목 줄·강조 기호·괄호 속 한자·긴 줄표만 걷어 낸다. 내용은 고치지 않는다.
function sanitizeLight(text) {
  return text
    .replace(/\*+/g, '')
    .replace(/^#{1,6}\s.*$\n*/gm, '')
    .replace(/^\s*[^\n.?!]{0,80}독백[^\n.?!]{0,80}\n+/, '')
    .replace(/^\s*[（(][^)）\n]{0,200}[)）]\s*$\n*/gm, '')
    .replace(/^\s*[（(][^)）\n]{0,200}[)）]\s*/, '')
    .replace(/^\s*-{3,}\s*$\n*/gm, '')
    // 음성화 때 그대로 읽히므로 한자·로마자만 든 괄호는 통째로 걷어낸다.
    .replace(/\s*[（(][^)）\n]*[一-鿿A-Za-z][^)）\n]*[)）]/g, (match) => (/[가-힣]/.test(match) ? match : ''))
    .replace(/\s*—\s*/g, ', ')
    .trim()
}

// 검수는 뒤집힌 사실만 고친다. 문장과 결은 건드리지 않는다.
function buildLightReviewPrompt(row, draft) {
  const name = row.nickname_en ? `${row.nickname}(${row.nickname_en})` : row.nickname
  return `${name}의 1인칭 독백이다. 웹에서 이 인물을 확인하고, 사실이 아니거나 입장이 뒤바뀐 부분만 고쳐라. 확인되지 않는 일화는 지워라. 그 밖의 문장은 그대로 둔다. 다시 쓰지 말고 고친 독백 본문만 출력한다.

${draft}`
}

async function lightOne(row) {
  const call = (prompt) => agyCall(prompt, { model: AGY_TEXT_MODEL, timeoutMs: LIGHT_TIMEOUT_MS })
  let final = (await call(buildWriterPrompt(row))).trim()
  const reviewed = needsLightReview(row)
  if (reviewed) {
    final = (await call(buildLightReviewPrompt(row, final))).trim()
    if (!final) return { status: 'hold', reason: '검수 응답 없음', reviewed, final }
  }
  return lightCheck(final, reviewed)
}

function lightCheck(text, reviewed) {
  const final = sanitizeLight(text)
  if (REFUSAL_TEXT.test(final)) return { status: 'hold', reason: '거절 응답', reviewed, final }
  const issues = [...mechanicalIssues(final), ...styleFlags(final)]
  return { status: issues.length ? 'hold' : 'ready', reason: issues.join(', '), reviewed, final }
}

// 앞선 실행의 --out 결과에서 원문을 다시 읽어 호출 없이 재검사한다.
async function loadReusedFinals(path) {
  const map = new Map()
  for (const line of (await readFile(path, 'utf8')).split('\n')) {
    if (!line.trim()) continue
    const row = JSON.parse(line)
    if (String(row.final ?? '').trim()) map.set(row.slug, { final: row.final, reviewed: !!row.reviewed })
  }
  return map
}

async function loadEmptyTargets(db) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('celebs').select(TARGET_COLUMNS)
      .eq('publication_status', 'active')
      .is('virtual_monologue', null)
      .is('virtual_monologue_locked_at', null)
      .order('slug')
      .range(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) break
  }
  return rows
}

async function lightCommand() {
  const slugs = parseSlugs()
  const limit = Number.parseInt(argValue('--limit') ?? '', 10)
  const out = argValue('--out')
  const apply = hasFlag('--apply')
  const reused = argValue('--reuse') ? await loadReusedFinals(argValue('--reuse')) : null
  const db = createDb()
  const all = slugs.length > 0 ? await loadTargets(db, slugs, null) : await loadEmptyTargets(db)
  const targets = limit > 0 ? all.slice(0, limit) : all
  const counts = { ready: 0, hold: 0, error: 0, applied: 0 }
  let stopped = null

  for (const row of targets) {
    if (row.virtual_monologue !== null || row.virtual_monologue_locked_at !== null) continue
    if (reused && !reused.has(row.slug)) continue
    let result
    try {
      result = reused
        ? lightCheck(reused.get(row.slug).final, reused.get(row.slug).reviewed)
        : await lightOne(row)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const timedOut = /시간 초과/.test(message)
      if (/Authentication required|로그인/.test(message)) stopped = 'agy 로그인 필요'
      else if (looksQuotaLimited(message) || (timedOut && agyQuotaExhausted())) stopped = 'agy 쿼터 소진'
      else if (timedOut && !(await agyAlive())) stopped = 'agy 무응답'
      if (stopped) break
      result = { status: 'error', reason: excerpt(message, 200), final: '' }
    }
    counts[result.status] += 1
    const applied = apply && result.status === 'ready' && await writeMonologue(db, row.id, result.final)
    if (applied) counts.applied += 1
    if (out) await appendFile(out, `${JSON.stringify({ slug: row.slug, name: row.nickname, ...result, applied })}\n`, 'utf8')
    console.log(`${row.slug} ${result.status}${result.reviewed ? ' reviewed' : ''} ${nonWhitespaceLength(result.final)}자${applied ? ' applied' : ''}${result.reason ? ` ${result.reason}` : ''}`)
  }
  console.log(JSON.stringify({ command: 'light', targets: targets.length, ...counts, stopped }))
  if (stopped) process.exitCode = 3
}

function buildDevinBrief(rows) {
  const table = rows
    .map((row) => `| \`output/${row.slug}.txt\` | ${row.nickname} | ${row.nickname_en ?? '-'} | ${row.bio ?? '-'} |`)
    .join('\n')
  return `# 가상독백 집필 지시서

인물이 자기 목소리로 자기 삶과 생각을 말하는 한국어 독백을 쓴다. 아래 인물 각각에 대해 하나씩 쓴다.

## 하지 않는 일

- 이 폴더의 \`output/\` 밖에 파일을 만들거나 고치지 않는다.
- 데이터베이스, 저장소, 설정을 건드리지 않는다.
- 다른 에이전트나 CLI를 부르지 않는다.

## 대상

| 파일 이름 | 인물 | 원어 표기 | 식별용 소개 |
|---|---|---|---|
${table}

소개는 동명이인을 가리기 위한 것이며 사실 근거가 아니다.

## 조사

쓰기 전에 웹에서 인물의 신원, 생애, 저술, 실제로 한 말과 한 일을 확인한다. 동명이인을 구별한다. 확인되지 않은 장면, 속마음, 동기, 후회, 직접 인용은 만들지 않는다. 전설과 사실이 갈리는 대목은 사실로 단정하지 않는다. 화자가 죽은 뒤의 일은 말하지 않는다. 허구 인물이면 원작에 나온 것만 쓴다.

## 분량과 형식

- 공백 제외 550자에서 900자 사이로 쓴다. A4 반 페이지 분량이다.
- 파일에는 독백 본문만 넣는다. 제목, 설명, 머리말, 꼬리말을 넣지 않는다.
- 마크다운 기호, 한자, URL, 괄호 속 무대 지시, 긴 줄표를 쓰지 않는다.
- 1인칭으로 쓴다. 인물에 어울리는 말투를 고른다. 존댓말과 반말 중 하나를 골라 끝까지 지킨다.

## 마치기 전에

파일을 모두 쓴 뒤 각 파일의 공백 제외 글자 수를 보고한다.
`
}

async function devinChunk(rows, workRoot, call) {
  const dir = resolve(workRoot, rows[0].slug)
  const outDir = resolve(dir, 'output')
  await mkdir(outDir, { recursive: true })
  await mkdir(resolve(dir, 'logs'), { recursive: true })
  const missing = rows.filter((row) => !existsSync(resolve(outDir, `${row.slug}.txt`)))
  if (missing.length > 0) {
    const briefPath = resolve(dir, 'BRIEF.md')
    await writeFile(briefPath, buildDevinBrief(missing), 'utf8')
    await call(`${briefPath.replaceAll('\\', '/')} 파일을 읽고 그대로 수행한다. 지시서 밖의 파일을 만들거나 고치지 않는다.`, {
      cwd: dir,
      model: DEVIN_MODEL,
      timeoutMs: DEVIN_TIMEOUT_MS,
      exportPath: resolve(dir, 'logs/conversation.md'),
      logPath: resolve(dir, 'logs/live.log'),
    })
  }
  const results = []
  for (const row of rows) {
    const path = resolve(outDir, `${row.slug}.txt`)
    if (!existsSync(path)) {
      results.push({ row, result: { status: 'error', reason: '산출물 없음', reviewed: false, final: '' } })
      continue
    }
    results.push({ row, result: lightCheck(await readFile(path, 'utf8'), false) })
  }
  return results
}

async function devinCommand() {
  const slugs = parseSlugs()
  const limit = Number.parseInt(argValue('--limit') ?? '', 10)
  const batch = Math.max(1, Number.parseInt(argValue('--batch') ?? '5', 10))
  const sessions = Math.max(1, Number.parseInt(argValue('--sessions') ?? '2', 10))
  const workRoot = resolve(argValue('--work') ?? resolve(REPO_ROOT, '../_vm-devin'))
  const out = argValue('--out')
  const apply = hasFlag('--apply')
  const { devinCall } = await import(pathToFileURL(resolve(REPO_ROOT, '.agents/skills/devin-swe/scripts/devin-call.mjs')).href)

  const db = createDb()
  const loaded = slugs.length > 0 ? await loadTargets(db, slugs, null) : await loadEmptyTargets(db)
  // agy 배치와 같은 인물을 잡지 않도록 뒤에서부터 거슬러 처리할 수 있게 한다.
  const all = hasFlag('--reverse') ? [...loaded].reverse() : loaded
  const targets = limit > 0 ? all.slice(0, limit) : all
  const chunks = []
  for (let index = 0; index < targets.length; index += batch) chunks.push(targets.slice(index, index + batch))
  const counts = { ready: 0, hold: 0, error: 0, applied: 0 }

  let next = 0
  const worker = async () => {
    while (next < chunks.length) {
      const chunk = chunks[next++]
      let results = null
      for (let attempt = 1; attempt <= DEVIN_MAX_ATTEMPTS && !results; attempt += 1) {
        try {
          results = await devinChunk(chunk, workRoot, devinCall)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          if (DEVIN_RATE_LIMIT.test(message) && attempt < DEVIN_MAX_ATTEMPTS) {
            const waitMs = rateLimitWaitMs(message)
            console.log(`${chunk[0].slug} 대기 ${Math.round(waitMs / 60_000)}분 (메시지 한도)`)
            await new Promise((wake) => { setTimeout(wake, waitMs) })
            continue
          }
          results = chunk.map((row) => ({ row, result: { status: 'error', reason: excerpt(message, 160), reviewed: false, final: '' } }))
        }
      }
      for (const { row, result } of results) {
        counts[result.status] += 1
        const applied = apply && result.status === 'ready' && await writeMonologue(db, row.id, result.final)
        if (applied) counts.applied += 1
        if (out) await appendFile(out, `${JSON.stringify({ slug: row.slug, name: row.nickname, ...result, applied })}\n`, 'utf8')
        console.log(`${row.slug} ${result.status} ${nonWhitespaceLength(result.final)}자${applied ? ' applied' : ''}${result.reason ? ` ${result.reason}` : ''}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(sessions, chunks.length) }, worker))
  console.log(JSON.stringify({ command: 'devin', targets: targets.length, chunks: chunks.length, ...counts }))
}

// ── 국소 수정 ────────────────────────────────────────────────────────
// 오류로 합의한 셋만 고친다. 고치는 자리 밖의 문장은 그대로 둔다.

const REPAIRS = {
  opening: {
    label: '평판으로 시작',
    match: (text) => /^\s*(세상\s*)?(사람들|이들|세인)/.test(text),
    order: (name) => `아래는 ${name}의 1인칭 독백이다. 첫 문장이 "사람들은 나를…"처럼 남들이 자기를 어떻게 부르는지로 시작한다. 그 도입부만 다른 방식으로 바꿔라. 나머지 문장과 문단은 그대로 둔다. 고친 전문만 출력한다.`,
  },
  stage: {
    label: '무대 지시',
    match: (text) => /[（(][^)）\n]*(며|다가|듯|웃음|하하|한숨)[^)）\n]*[)）]/.test(text),
    order: (name) => `아래는 ${name}의 1인칭 독백이다. 괄호로 묶인 무대 지시와 웃음 표시를 지워라. 문장이 어색해지면 그 자리만 다듬는다. 그 밖의 문장은 그대로 둔다. 고친 전문만 출력한다.`,
  },
  year: {
    label: '연도 이력서',
    match: (text) => /^\s*\d{4}년/.test(text),
    order: (name) => `아래는 ${name}의 1인칭 독백이다. 첫 문장이 연도로 시작해 이력서처럼 읽힌다. 그 도입부만 다른 방식으로 바꿔라. 나머지는 그대로 둔다. 고친 전문만 출력한다.`,
  },
}

function repairKind(text) {
  for (const [kind, rule] of Object.entries(REPAIRS)) {
    if (rule.match(text)) return kind
  }
  return null
}

async function repairOne(row, kind) {
  const rule = REPAIRS[kind]
  const raw = await agyCall(`${rule.order(row.nickname)}\n\n${row.virtual_monologue}`, {
    model: AGY_TEXT_MODEL,
    timeoutMs: LIGHT_TIMEOUT_MS,
  })
  const fixed = sanitizeLight(raw.trim())
  const before = nonWhitespaceLength(row.virtual_monologue)
  const after = nonWhitespaceLength(fixed)
  if (!fixed || fixed === row.virtual_monologue) return { status: 'hold', reason: '그대로 돌아옴', final: fixed }
  if (after < before * 0.7 || after > before * 1.3) return { status: 'hold', reason: `분량이 ${before}→${after}자로 흔들림`, final: fixed }
  if (rule.match(fixed)) return { status: 'hold', reason: '같은 결함이 남음', final: fixed }
  const issues = mechanicalIssues(fixed)
  return issues.length
    ? { status: 'hold', reason: issues.join(', '), final: fixed }
    : { status: 'ready', reason: '', final: fixed }
}

async function repairCommand() {
  const apply = hasFlag('--apply')
  const limit = Number.parseInt(argValue('--limit') ?? '', 10)
  const only = argValue('--kind')
  const out = argValue('--out')
  const db = createDb()
  const rows = await loadFilledRows(db)

  const targets = []
  for (const row of rows) {
    const kind = repairKind(row.virtual_monologue)
    if (kind && (!only || only === kind)) targets.push({ row, kind })
  }
  const picked = limit > 0 ? targets.slice(0, limit) : targets
  const counts = { ready: 0, hold: 0, error: 0, applied: 0 }
  let stopped = null

  for (const { row, kind } of picked) {
    let result
    try {
      result = await repairOne(row, kind)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const timedOut = /시간 초과/.test(message)
      if (/Authentication required|로그인/.test(message)) stopped = 'agy 로그인 필요'
      else if (looksQuotaLimited(message) || (timedOut && agyQuotaExhausted())) stopped = 'agy 쿼터 소진'
      else if (timedOut && !(await agyAlive())) stopped = 'agy 무응답'
      if (stopped) break
      result = { status: 'error', reason: excerpt(message, 160), final: '' }
    }
    counts[result.status] += 1
    const applied = apply && result.status === 'ready' && await updateMonologue(db, row.id, row.virtual_monologue, result.final)
    if (applied) counts.applied += 1
    if (out) await appendFile(out, `${JSON.stringify({ slug: row.slug, kind, before: row.virtual_monologue, ...result, applied })}\n`, 'utf8')
    console.log(`${row.slug} ${REPAIRS[kind].label} ${result.status}${applied ? ' applied' : ''}${result.reason ? ` ${result.reason}` : ''}`)
  }
  console.log(JSON.stringify({ command: 'repair', targets: picked.length, ...counts, stopped }))
  if (stopped) process.exitCode = 3
}

// ── 표기 정리(음성화 준비) ────────────────────────────────────────────
// 1) 한글이 없는 괄호는 기계로 뗀다. 2) 괄호 밖 로마자는 그대로 둔다.
// 3) 한글 뜻풀이 괄호와 4) 로마자가 섞인 자리, 5) 본문에 섞인 제목 줄은 모델이 고친다.

function stripForeignParen(text) {
  return text.replace(/\s*[（(][^)）\n]*[)）]/g, (match) => (/[가-힣]/.test(match.slice(1, -1)) ? match : ''))
}

function stripTitleLine(text) {
  const [first, ...rest] = text.split('\n')
  const looksTitle = /(독백|모놀로그)\s*[:：]/.test(first) || /^\s*[《〈].+[》〉]\s*$/.test(first)
  return looksTitle && rest.length > 0 ? rest.join('\n').trim() : text
}

function needsModelNotation(text) {
  return /[（(][^)）\n]*[가-힣][^)）\n]*[)）]/.test(text)
}

function buildNotationBrief(rows) {
  const table = rows.map((row) => `| \`output/${row.slug}.txt\` | ${row.nickname} |`).join('\n')
  return `# 독백 표기 정리 지시서

아래 독백들은 나중에 음성으로 읽힌다. 괄호에 든 뜻풀이를 문장으로 풀어 쓴다. 그 밖의 문장은 손대지 않는다.

## 하지 않는 일

- 내용을 바꾸거나 문장을 다시 쓰지 않는다. 괄호가 있는 자리만 고친다.
- 이 폴더의 \`output/\` 밖에 파일을 만들거나 고치지 않는다.
- 데이터베이스나 저장소를 건드리지 않는다.

## 고치는 법

괄호 안팎의 두 낱말 중 무엇을 남길지 고른다. **자리가 아니라 독자가 아는 말이 기준이다.** 널리 쓰이는 쪽을 남긴다.

1. **둘 다 남긴다.** 용어를 알아 두면 좋고 문장이 자연스러울 때.
   "휘브리스(오만)는 파멸을 부른다" → "휘브리스, 오만은 파멸을 부른다"
2. **한쪽만 남긴다.** 한쪽이 널리 알려졌고 다른 쪽은 낯설 때. 남기는 쪽은 안팎을 가리지 않는다.
   "일리온(트로이)의 밤" → "트로이의 밤" (트로이가 알려진 이름이다)
   "아우슈비츠(오시비엥침)에서" → "아우슈비츠에서" (바깥말이 알려진 이름이다)
3. **뜻만 남긴다.** 원어나 전문 용어를 알아 봐야 득이 없을 때.
   "용기로 travel(이동)했는가" → "용기로 이동했는가"

로마자가 남으면 안 된다. 로마자를 살려야 할 때는 한글 소리로 적는다.

본문 첫 줄에 제목이 들어 있으면 그 줄을 지운다.

## 대상

| 파일 이름 | 인물 |
|---|---|
${table}

각 인물의 원문은 \`input/<파일이름>\`에 있다. 읽고 고친 전문을 \`output/\`의 같은 이름으로 쓴다. 설명이나 머리말 없이 독백 본문만 넣는다.
`
}

async function notationChunk(rows, workRoot, call) {
  const dir = resolve(workRoot, rows[0].slug)
  const outDir = resolve(dir, 'output')
  const inDir = resolve(dir, 'input')
  await mkdir(outDir, { recursive: true })
  await mkdir(inDir, { recursive: true })
  await mkdir(resolve(dir, 'logs'), { recursive: true })
  const missing = rows.filter((row) => !existsSync(resolve(outDir, `${row.slug}.txt`)))
  if (missing.length > 0) {
    for (const row of missing) await writeFile(resolve(inDir, `${row.slug}.txt`), row.text, 'utf8')
    const briefPath = resolve(dir, 'BRIEF.md')
    await writeFile(briefPath, buildNotationBrief(missing), 'utf8')
    await call(`${briefPath.replaceAll('\\', '/')} 파일을 읽고 그대로 수행한다.`, {
      cwd: dir,
      model: DEVIN_MODEL,
      timeoutMs: DEVIN_TIMEOUT_MS,
      exportPath: resolve(dir, 'logs/conversation.md'),
      logPath: resolve(dir, 'logs/live.log'),
    })
  }
  const results = []
  for (const row of rows) {
    const path = resolve(outDir, `${row.slug}.txt`)
    if (!existsSync(path)) {
      results.push({ row, text: null, reason: '산출물 없음' })
      continue
    }
    const fixed = stripTitleLine(stripForeignParen((await readFile(path, 'utf8')).trim()))
    const issues = mechanicalIssues(fixed)
    results.push({ row, text: issues.length ? null : fixed, reason: issues.join(', ') })
  }
  return results
}

async function updateMonologue(db, id, before, after) {
  const updated = await db.from('celebs')
    .update({ virtual_monologue: after })
    .eq('id', id)
    .eq('virtual_monologue', before)
    .is('virtual_monologue_locked_at', null)
    .select('virtual_monologue')
    .maybeSingle()
  if (updated.error) throw updated.error
  return updated.data?.virtual_monologue === after
}

async function loadFilledRows(db) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('celebs').select('id,slug,nickname,virtual_monologue')
      .not('virtual_monologue', 'is', null)
      .is('virtual_monologue_locked_at', null)
      .order('slug')
      .range(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) break
  }
  return rows
}

async function notationCommand() {
  const apply = hasFlag('--apply')
  const limit = Number.parseInt(argValue('--limit') ?? '', 10)
  const batch = Math.max(1, Number.parseInt(argValue('--batch') ?? '8', 10))
  const sessions = Math.max(1, Number.parseInt(argValue('--sessions') ?? '2', 10))
  const workRoot = resolve(argValue('--work') ?? resolve(REPO_ROOT, '../_vm-notation'))
  const db = createDb()
  const rows = await loadFilledRows(db)

  const mechanical = []
  const modelRows = []
  for (const row of rows) {
    const cleaned = stripTitleLine(stripForeignParen(row.virtual_monologue))
    if (needsModelNotation(cleaned)) {
      modelRows.push({ id: row.id, slug: row.slug, nickname: row.nickname, before: row.virtual_monologue, text: cleaned })
    } else if (cleaned !== row.virtual_monologue) {
      mechanical.push({ id: row.id, slug: row.slug, before: row.virtual_monologue, after: cleaned })
    }
  }

  let mechanicalApplied = 0
  if (apply) {
    for (const row of mechanical) {
      if (await updateMonologue(db, row.id, row.before, row.after)) mechanicalApplied += 1
    }
  }
  console.log(JSON.stringify({
    command: 'notation', filled: rows.length, mechanical: mechanical.length, mechanicalApplied, model: modelRows.length,
  }))
  if (!hasFlag('--model')) return

  const targets = limit > 0 ? modelRows.slice(0, limit) : modelRows
  const { devinCall } = await import(pathToFileURL(resolve(REPO_ROOT, '.agents/skills/devin-swe/scripts/devin-call.mjs')).href)
  const chunks = []
  for (let index = 0; index < targets.length; index += batch) chunks.push(targets.slice(index, index + batch))
  const counts = { fixed: 0, skipped: 0, applied: 0 }

  let next = 0
  const worker = async () => {
    while (next < chunks.length) {
      const chunk = chunks[next++]
      let results = null
      for (let attempt = 1; attempt <= DEVIN_MAX_ATTEMPTS && !results; attempt += 1) {
        try {
          results = await notationChunk(chunk, workRoot, devinCall)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          if (DEVIN_RATE_LIMIT.test(message) && attempt < DEVIN_MAX_ATTEMPTS) {
            await new Promise((wake) => { setTimeout(wake, rateLimitWaitMs(message)) })
            continue
          }
          results = chunk.map((row) => ({ row, text: null, reason: excerpt(message, 120) }))
        }
      }
      for (const { row, text, reason } of results) {
        if (!text || needsModelNotation(text)) {
          counts.skipped += 1
          console.log(`${row.slug} skip ${reason || '괄호가 남음'}`)
          continue
        }
        counts.fixed += 1
        const applied = apply && await updateMonologue(db, row.id, row.before, text)
        if (applied) counts.applied += 1
        console.log(`${row.slug} fixed${applied ? ' applied' : ''}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(sessions, chunks.length) }, worker))
  console.log(JSON.stringify({ command: 'notation-model', targets: targets.length, ...counts }))
}

function printHelp() {
  console.log(`가상독백 Gemini 2회 → Claude Opus 1회 파이프라인

light --slugs a,b | [--limit N] [--apply] [--out PATH] [--reuse JSONL]  Gemini 1회(한국 전근대만 Gemini 검수 1회 추가)
devin --slugs a,b | [--limit N] [--batch 5] [--sessions 2] [--apply] [--out PATH] [--work DIR]
notation [--apply] [--model] [--limit N] [--batch 8] [--sessions 2] [--work DIR]   음성화용 표기 정리
repair [--apply] [--kind opening|stage|year] [--limit N] [--out PATH]   오류 국소 수정
generate --slugs a,b | --limit N [--force] [--out-dir PATH]
status [--out-dir PATH]
inspect --slugs a,b [--out-dir PATH]
apply --slugs a,b --apply [--approve-high] [--out-dir PATH]
self-test`)
}

async function main() {
  const command = process.argv[2] ?? 'help'
  if (command === 'light') await lightCommand()
  else if (command === 'devin') await devinCommand()
  else if (command === 'notation') await notationCommand()
  else if (command === 'repair') await repairCommand()
  else if (command === 'generate') await generateCommand()
  else if (command === 'status') await statusCommand()
  else if (command === 'inspect') await inspectCommand()
  else if (command === 'apply') await applyCommand()
  else if (command === 'self-test') selfTestCommand()
  else printHelp()
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
