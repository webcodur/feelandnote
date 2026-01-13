// 셀럽 프로필 AI 생성 모듈

import { callGemini } from './gemini'

// #region Types
export interface CelebProfileInput {
  name: string
  description: string
}

export interface GeneratedCelebProfile {
  bio: string
  profession: string
  avatarUrl: string
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
// #endregion

// #region Constants
const VALID_PROFESSIONS = [
  'leader',
  'politician',
  'commander',
  'entrepreneur',
  'investor',
  'scholar',
  'artist',
  'author',
  'actor',
  'influencer',
  'athlete',
] as const
// #endregion

// #region Prompt Builder
export function buildCelebProfilePrompt(input: CelebProfileInput): string {
  return `다음 인물의 프로필 정보를 생성해줘.

## 인물 정보
- 이름: ${input.name}
- 설명: ${input.description || '(없음)'}

## 출력 형식 (JSON)
{
  "bio": "인물 소개글 (1-2문장, 한국어, ~입니다 체)",
  "profession": "직군 코드",
  "avatarUrl": "프로필 이미지 URL (찾을 수 있으면)"
}

## 직군 코드 (반드시 아래 중 하나 선택)
- leader: 지도자
- politician: 정치인
- commander: 지휘관
- entrepreneur: 기업가
- investor: 투자자
- scholar: 학자
- artist: 예술인
- author: 작가
- actor: 배우
- influencer: 인플루엔서
- athlete: 스포츠인

## 규칙
1. bio는 한국어로, 존댓말(~입니다) 사용
2. 인물의 주요 업적/특징을 간결하게 요약
3. profession은 위 코드 중 가장 적합한 것 선택
4. avatarUrl은 빈 문자열로 출력 (이미지 URL 생성 금지)
5. 확인되지 않은 정보는 포함하지 않음
6. 알려진 인물 정보를 바탕으로 정확하게 작성

JSON만 출력 (설명 없이):`
}
// #endregion

// #region Response Parser
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
      avatarUrl: typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : '',
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
    maxOutputTokens: 1000,
  })

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
{
  "bio": "인물 소개글 (1-2문장, 한국어, ~입니다 체)",
  "profession": "직군 코드",
  "avatarUrl": "",
  "influence": {
    "political": { "score": 0, "exp": "설명" },
    "strategic": { "score": 0, "exp": "설명" },
    "tech": { "score": 0, "exp": "설명" },
    "social": { "score": 0, "exp": "설명" },
    "economic": { "score": 0, "exp": "설명" },
    "cultural": { "score": 0, "exp": "설명" },
    "transhistoricity": { "score": 0, "exp": "설명" }
  }
}

## 직군 코드
leader(지도자), politician(정치인), commander(지휘관), entrepreneur(기업가), investor(투자자), scholar(학자), artist(예술인), author(작가), actor(배우), influencer(인플루엔서), athlete(스포츠인)

## 영향력 평가 기준
1. political (정치·외교): 0-10점 - 정치/외교 분야 영향력
2. strategic (전략·안보): 0-10점 - 전략/안보 분야 영향력
3. tech (기술·과학): 0-10점 - 기술/과학 분야 영향력
4. social (사회·윤리): 0-10점 - 사회/윤리 분야 영향력
5. economic (산업·경제): 0-10점 - 산업/경제 분야 영향력
6. cultural (문화·예술): 0-10점 - 문화/예술 분야 영향력
7. transhistoricity (통시성): 0-40점 - 시대를 초월한 지속적 영향력

## 규칙
1. bio는 한국어, 존댓말(~입니다) 사용
2. 각 영향력 exp는 1문장으로 간결하게
3. 알려진 정보만 반영, 추측 금지
4. avatarUrl은 빈 문자열

JSON만 출력:`
}

function calculateRank(totalScore: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (totalScore >= 90) return 'S'
  if (totalScore >= 80) return 'A'
  if (totalScore >= 70) return 'B'
  if (totalScore >= 60) return 'C'
  return 'D'
}

function parseProfileWithInfluenceResponse(response: string): GeneratedCelebProfileWithInfluence | null {
  console.log('[parseProfileWithInfluenceResponse] Raw response:', response.slice(0, 1500))

  try {
    let jsonStr = response.trim()
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')

    const startIdx = jsonStr.indexOf('{')
    const endIdx = jsonStr.lastIndexOf('}')
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      jsonStr = jsonStr.slice(startIdx, endIdx + 1)
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
      avatarUrl: typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : '',
      influence: {
        political,
        strategic,
        tech,
        social,
        economic,
        cultural,
        transhistoricity,
        totalScore,
        rank: calculateRank(totalScore),
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
    maxOutputTokens: 2000,
  })

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
