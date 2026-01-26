// 셀럽 프로필 AI 생성 모듈

import { callGemini } from './gemini'
import { INFLUENCE_RULEBOOK_PROMPT, INFLUENCE_MAX_SCORES, INFLUENCE_FIELDS, calculateInfluenceRank as calcRank } from './prompts/influence-rulebook'
import {
  VALID_PROFESSIONS,
  PROFILE_OUTPUT_FORMAT,
  PROFILE_WITH_INFLUENCE_OUTPUT_FORMAT,
  INFLUENCE_OUTPUT_FORMAT,
  PROFESSION_CODES,
  PROFILE_RULES,
} from './prompts/celeb-profile-prompt'

// #region Types
export interface CelebProfileInput {
  name: string
  description: string
}

export interface GeneratedCelebProfile {
  bio: string
  profession: string
  title?: string
  nationality?: string
  birthDate?: string
  deathDate?: string
  quotes?: string
  fullname?: string
}

export interface GenerateCelebProfileResult {
  success: boolean
  profile?: GeneratedCelebProfile
  error?: string
}

// 영향력 관련 타입
export interface InfluenceScore {
  score: number
  exp: string
}

export interface GeneratedInfluence {
  political: InfluenceScore
  strategic: InfluenceScore
  tech: InfluenceScore
  social: InfluenceScore
  economic: InfluenceScore
  cultural: InfluenceScore
  transhistoricity: InfluenceScore
  totalScore: number
  rank: 'S' | 'A' | 'B' | 'C' | 'D'
}

export interface GeneratedCelebProfileWithInfluence extends GeneratedCelebProfile {
  influence: GeneratedInfluence
}

export interface GenerateCelebProfileWithInfluenceResult {
  success: boolean
  profile?: GeneratedCelebProfileWithInfluence
  error?: string
}

export interface GenerateCelebInfluenceResult {
  success: boolean
  influence?: GeneratedInfluence
  error?: string
}
// #endregion

// VALID_PROFESSIONS는 ./prompts/celeb-profile-prompt.ts에서 import

// #region Prompt Builder
export function buildCelebProfilePrompt(input: CelebProfileInput): string {
  return `다음 인물의 프로필 정보를 생성해줘.

## 인물 정보
- 이름: ${input.name}
- 설명: ${input.description || '(없음)'}

## 출력 형식 (JSON)
${PROFILE_OUTPUT_FORMAT}

## 직군 코드
${PROFESSION_CODES}

## 규칙
${PROFILE_RULES}

JSON만 출력:`;
}
// #endregion

// #region Response Parser

// 불완전한 JSON 복구 시도
function tryRepairJson(jsonStr: string): string {
  let repaired = jsonStr.trim()

  // 열린 따옴표 개수 확인
  const quoteCount = (repaired.match(/"/g) || []).length
  if (quoteCount % 2 !== 0) {
    repaired += '"'
  }

  // 중괄호 균형 맞추기
  const openBraces = (repaired.match(/{/g) || []).length
  const closeBraces = (repaired.match(/}/g) || []).length
  for (let i = 0; i < openBraces - closeBraces; i++) {
    repaired += '}'
  }

  return repaired
}

function parseProfileResponse(response: string): GeneratedCelebProfile | null {
  console.log('[parseProfileResponse] Raw response:', response.slice(0, 1000))

  try {
    let jsonStr = response.trim()

    // 1. 마크다운 코드 블록 제거 (완전/불완전 모두)
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')

    // 2. { 로 시작하는 JSON 객체 찾기
    const startIdx = jsonStr.indexOf('{')
    const endIdx = jsonStr.lastIndexOf('}')
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      jsonStr = jsonStr.slice(startIdx, endIdx + 1)
    } else if (startIdx !== -1) {
      // } 가 없으면 복구 시도
      jsonStr = tryRepairJson(jsonStr.slice(startIdx))
    }

    // 3. 줄바꿈 및 제어 문자 정리
    jsonStr = jsonStr.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ')

    const parsed = JSON.parse(jsonStr)

    // 필드 검증 - bio와 profession이 필수
    if (typeof parsed.bio !== 'string' || !parsed.bio.trim()) {
      console.error('[parseProfileResponse] Missing or empty bio:', parsed)
      return null
    }
    if (typeof parsed.profession !== 'string' || !parsed.profession.trim()) {
      console.error('[parseProfileResponse] Missing or empty profession:', parsed)
      return null
    }

    // profession 값 검증
    const profession = VALID_PROFESSIONS.includes(parsed.profession as typeof VALID_PROFESSIONS[number])
      ? parsed.profession
      : 'influencer'

    return {
      bio: parsed.bio.trim(),
      profession,
      title: typeof parsed.title === 'string' ? parsed.title.trim() : '',
      nationality: typeof parsed.nationality === 'string' ? parsed.nationality.trim() : '',
      birthDate: typeof parsed.birthDate === 'string' ? parsed.birthDate.trim() : '',
      deathDate: typeof parsed.deathDate === 'string' ? parsed.deathDate.trim() : '',
      quotes: typeof parsed.quotes === 'string' ? parsed.quotes.trim() : '',
      fullname: typeof parsed.fullname === 'string' ? parsed.fullname.trim() : '',
    }
  } catch (err) {
    console.error('[parseProfileResponse] Parse error:', err, 'Response:', response.slice(0, 500))
    return null
  }
}
// #endregion

// #region Main Function
export async function generateCelebProfile(
  apiKey: string,
  input: CelebProfileInput
): Promise<GenerateCelebProfileResult> {
  if (!input.name.trim()) {
    return { success: false, error: '인물명을 입력해주세요.' }
  }

  const prompt = buildCelebProfilePrompt(input)

  const response = await callGemini({
    apiKey,
    prompt,
    maxOutputTokens: 1500,
  }, { json: true })

  if (response.error) {
    return { success: false, error: response.error }
  }

  const profile = parseProfileResponse(response.text)

  if (!profile) {
    return { success: false, error: 'AI 응답을 파싱할 수 없습니다.' }
  }

  return { success: true, profile }
}
// #endregion

// #region Profile + Influence 통합 생성
function buildProfileWithInfluencePrompt(input: CelebProfileInput): string {
  return `다음 인물의 프로필과 영향력을 평가해줘.

## 인물 정보
- 이름: ${input.name}
- 설명: ${input.description || '(없음)'}

## 출력 형식 (JSON)
${PROFILE_WITH_INFLUENCE_OUTPUT_FORMAT}

## 직군 코드
${PROFESSION_CODES}

${INFLUENCE_RULEBOOK_PROMPT}

## 프로필 작성 규칙
${PROFILE_RULES}

JSON만 출력:`;
}

// 영향력 랭크 계산 - prompts/influence-rulebook.ts에서 import
export { calculateInfluenceRank } from './prompts/influence-rulebook'

function parseProfileWithInfluenceResponse(response: string): GeneratedCelebProfileWithInfluence | null {
  console.log('[parseProfileWithInfluenceResponse] Raw response:', response.slice(0, 1500))

  try {
    let jsonStr = response.trim()
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')

    const startIdx = jsonStr.indexOf('{')
    const endIdx = jsonStr.lastIndexOf('}')
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      jsonStr = jsonStr.slice(startIdx, endIdx + 1)
    } else if (startIdx !== -1) {
      jsonStr = tryRepairJson(jsonStr.slice(startIdx))
    }

    jsonStr = jsonStr.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ')
    const parsed = JSON.parse(jsonStr)

    // 프로필 검증
    if (typeof parsed.bio !== 'string' || !parsed.bio.trim()) {
      console.error('[parseProfileWithInfluenceResponse] Missing bio')
      return null
    }

    const profession = VALID_PROFESSIONS.includes(parsed.profession) ? parsed.profession : 'influencer'

    // 영향력 검증 및 추출
    const inf = parsed.influence
    if (!inf) {
      console.error('[parseProfileWithInfluenceResponse] Missing influence')
      return null
    }

    const extractScore = (field: { score?: number; exp?: string } | undefined, maxScore: number) => ({
      score: Math.min(Math.max(Number(field?.score) || 0, 0), maxScore),
      exp: String(field?.exp || ''),
    })

    const political = extractScore(inf.political, 10)
    const strategic = extractScore(inf.strategic, 10)
    const tech = extractScore(inf.tech, 10)
    const social = extractScore(inf.social, 10)
    const economic = extractScore(inf.economic, 10)
    const cultural = extractScore(inf.cultural, 10)
    const transhistoricity = extractScore(inf.transhistoricity, 40)

    const totalScore = political.score + strategic.score + tech.score +
                       social.score + economic.score + cultural.score +
                       transhistoricity.score

    return {
      bio: parsed.bio.trim(),
      profession,
      title: typeof parsed.title === 'string' ? parsed.title.trim() : '',
      nationality: typeof parsed.nationality === 'string' ? parsed.nationality.trim() : '',
      birthDate: typeof parsed.birthDate === 'string' ? parsed.birthDate.trim() : '',
      deathDate: typeof parsed.deathDate === 'string' ? parsed.deathDate.trim() : '',
      quotes: typeof parsed.quotes === 'string' ? parsed.quotes.trim() : '',
      fullname: typeof parsed.fullname === 'string' ? parsed.fullname.trim() : '',
      influence: {
        political,
        strategic,
        tech,
        social,
        economic,
        cultural,
        transhistoricity,
        totalScore,
        rank: calcRank(totalScore),
      },
    }
  } catch (err) {
    console.error('[parseProfileWithInfluenceResponse] Parse error:', err, 'Response:', response.slice(0, 500))
    return null
  }
}

export async function generateCelebProfileWithInfluence(
  apiKey: string,
  input: CelebProfileInput
): Promise<GenerateCelebProfileWithInfluenceResult> {
  if (!input.name.trim()) {
    return { success: false, error: '인물명을 입력해주세요.' }
  }

  const prompt = buildProfileWithInfluencePrompt(input)

  const response = await callGemini({
    apiKey,
    prompt,
    maxOutputTokens: 4000,
  }, { json: true })

  if (response.error) {
    return { success: false, error: response.error }
  }

  const profile = parseProfileWithInfluenceResponse(response.text)

  if (!profile) {
    return { success: false, error: 'AI 응답을 파싱할 수 없습니다.' }
  }

  return { success: true, profile }
}
// #endregion

// #region Influence Only
export function buildInfluencePrompt(input: CelebProfileInput): string {
  return `${input.name}의 영향력을 평가해줘.

추가 설명: ${input.description || '(없음)'}

## 출력 형식 (JSON)
${INFLUENCE_OUTPUT_FORMAT}

${INFLUENCE_RULEBOOK_PROMPT}

JSON만 출력:`;
}

function parseInfluenceResponse(response: string): GeneratedInfluence | null {
  const text = response.replace(/[\r\n]+/g, ' ')

  const extract = (field: string) => {
    const scoreMatch = text.match(new RegExp(`"${field}"[^}]*"score"\\s*:\\s*(\\d+)`))
    const maxScore = INFLUENCE_MAX_SCORES[field as keyof typeof INFLUENCE_MAX_SCORES] || 10
    const score = Math.min(scoreMatch ? parseInt(scoreMatch[1], 10) : 0, maxScore)
    const expMatch = text.match(new RegExp(`"${field}"[^}]*"exp"\\s*:\\s*"([^"}]+)`))
    return { score, exp: expMatch?.[1]?.trim() || '' }
  }

  const result = Object.fromEntries(INFLUENCE_FIELDS.map(f => [f, extract(f)])) as Record<typeof INFLUENCE_FIELDS[number], { score: number; exp: string }>
  const totalScore = INFLUENCE_FIELDS.reduce((sum, f) => sum + result[f].score, 0)

  return { ...result, totalScore, rank: calcRank(totalScore) }
}

export async function generateCelebInfluence(
  apiKey: string,
  input: CelebProfileInput
): Promise<GenerateCelebInfluenceResult> {
  if (!input.name.trim()) {
    return { success: false, error: '인물명을 입력해주세요.' }
  }

  const prompt = buildInfluencePrompt(input)

  const response = await callGemini({
    apiKey,
    prompt,
    maxOutputTokens: 3000,
  }, { json: true })

  if (response.error) {
    return { success: false, error: response.error }
  }

  const influence = parseInfluenceResponse(response.text)

  if (!influence) {
    return { success: false, error: 'AI 응답을 파싱할 수 없습니다.' }
  }

  return { success: true, influence }
}
// #endregion
