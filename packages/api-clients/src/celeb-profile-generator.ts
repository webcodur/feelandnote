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
  try {
    // JSON 블록 추출 (```json ... ``` 또는 순수 JSON)
    let jsonStr = response.trim()

    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    // { 로 시작하는 부분 찾기
    const startIdx = jsonStr.indexOf('{')
    const endIdx = jsonStr.lastIndexOf('}')
    if (startIdx !== -1 && endIdx !== -1) {
      jsonStr = jsonStr.slice(startIdx, endIdx + 1)
    }

    const parsed = JSON.parse(jsonStr)

    // 필드 검증
    if (typeof parsed.bio !== 'string') return null
    if (typeof parsed.profession !== 'string') return null

    // profession 값 검증
    const profession = VALID_PROFESSIONS.includes(parsed.profession as typeof VALID_PROFESSIONS[number])
      ? parsed.profession
      : 'influencer' // 기본값

    return {
      bio: parsed.bio,
      profession,
      avatarUrl: typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : '',
    }
  } catch {
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
    maxOutputTokens: 500,
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
