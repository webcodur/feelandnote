// 셀럽 AI 생성 및 JSON 입력을 위한 프롬프트 상수
import { buildInfluencePrompt } from '@feelnnote/ai-services/celeb-profile'

export const BASIC_PROFILE_JSON_PROMPT = `아래 JSON 형식에 맞춰 셀럽 기본 정보를 작성해주세요:

{
  "nickname": "셀럽 이름",
  "profession": "직군 (leader, politician, commander, entrepreneur, investor, scholar, artist, author, actor, influencer, athlete, other 중 선택)",
  "title": "수식어 (해당 인물을 상징하는 한 문장 또는 핵심 키워드)",
  "nationality": "국가 코드 (ISO 3166-1 alpha-2, 예: US, KR, GB, JP)",
  "birth_date": "출생일 (YYYY-MM-DD 또는 -356 같은 기원전 연도)",
  "death_date": "사망일 (생존시 빈 문자열)",
  "bio": "셀럽 소개글 (100자 이내, 간결하고 권위 있는 말투)",
  "quotes": "대표 명언 (한 문장)",
  "avatar_url": "썸네일 이미지 URL (선택사항)",
  "portrait_url": "초상화 이미지 URL (선택사항)",
  "is_verified": false
}

## 수식어(title) 작성 가이드
- **실제 호칭 및 별명**: 역사적·사회적으로 널리 통용되는 호칭 (예: '철의 여인', '가왕')
- **주요 업적**: 인물의 혁신적이거나 상징적인 성과 (예: '테슬라 창립자', '상대성 이론의 창시자')
- **직업·직책·직급**: 인물의 전문성이나 사회적 지위 (예: '가톨릭 프란치스코 교황', '애플 전 CEO')
- **작품 및 어록**: 인물을 대표하는 창작물이나 사상 (예: '별 헤는 밤의 시인', '무소유의 법정 스님')
- **결합 및 요약**: 위 항목들을 조합하여 인물의 정체성을 가장 잘 드러내는 한 문장으로 작성

위 형식을 정확히 지켜서 JSON만 응답해주세요.`


// 영향력 프롬프트는 AI 서비스 패키지의 함수를 재사용
export function getInfluenceJSONPrompt(name: string = '[인물명]', description: string = '[인물 설명]'): string {
  return buildInfluencePrompt({ name, description })
}

export const PHILOSOPHY_PROMPT = `[입력된 인물]의 감상 철학을 작성해주세요.

## 주제
인물의 콘텐츠 감상을 위한 자세, 태도, 방향, 인생에 대해 서술한다. 일화나 구체적 사례를 포함해도 된다. 여기서 다루는 콘텐츠는 영화, 게임, 음악, 책 등이며, 해당 인물이 관심을 가진 분야가 있다면 반드시 한 번은 언급한다. 완전히 무관한 분야는 전혀 다룰 필요가 없으며 "컨텐츠"라는 표현은 피한다. 인물이 즐긴 실제 콘텐츠를 한두 가지는 검색해서 알아낸 뒤에 활용하는 것이 권장된다.

그 어떤 콘텐츠에 대한 기록도 없는 인물들은 "알려진 바가 없다" 형태로 저술한다.

## 문법
마크다운 없이 이어진 문단으로 제공하며, 문단은 3~4개 내로 구성한다.

## 어조
확실한 경우가 아니면 무리하게 인사이트를 끌어내지 않고 "~한 인물이라고도 짐작할 수 있다" 형태로 작성해도 된다. 사설 및 논평과 같이 쓰여지는 글이기 때문에 어느 정도 힘 있는 글쓰기가 필요하다. "~해 보인다" 같은 말투는 금지. "있다, 이다, 하다, 했다" 등 권위 있고 간결한 표현을 사용한다.`
