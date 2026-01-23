// 셀럽 AI 생성 및 JSON 입력을 위한 프롬프트 상수
import { buildInfluencePrompt } from '@feelnnote/ai-services/celeb-profile'

export const BASIC_PROFILE_JSON_PROMPT = `아래 JSON 형식에 맞춰 셀럽 기본 정보를 작성해주세요:

{
  "nickname": "셀럽 이름",
  "profession": "직군 (entrepreneur, politician, philosopher, scientist, artist, musician, athlete, writer, actor, other 중 선택)",
  "title": "수식어 (예: 테슬라 창립자, 철의 여인)",
  "nationality": "국가 코드 (예: US, KR, GB)",
  "birth_date": "출생일 (YYYY-MM-DD 또는 -356 같은 기원전 연도)",
  "death_date": "사망일 (생존시 빈 문자열)",
  "bio": "셀럽 소개글",
  "quotes": "대표 명언",
  "avatar_url": "썸네일 이미지 URL (선택사항)",
  "portrait_url": "초상화 이미지 URL (선택사항)",
  "is_verified": false
}

위 형식을 정확히 지켜서 JSON만 응답해주세요.`

// 영향력 프롬프트는 AI 서비스 패키지의 함수를 재사용
export function getInfluenceJSONPrompt(name: string = '[인물명]', description: string = '[인물 설명]'): string {
  return buildInfluencePrompt({ name, description })
}
