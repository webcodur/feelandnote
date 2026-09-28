// 셀럽 프로필 생성 프롬프트

import {
  CELEB_PROFESSIONS,
  type CelebProfession,
} from '@feelandnote/shared/constants/celeb-professions'

export const VALID_PROFESSIONS: readonly CelebProfession[] = CELEB_PROFESSIONS.map(({ value }) => value)

export type Profession = CelebProfession

export const PROFESSION_LABELS = Object.fromEntries(
  CELEB_PROFESSIONS.map(({ value, label }) => [value, label]),
) as Record<Profession, string>

export const PROFILE_OUTPUT_FORMAT = `{
  "fullname": "정확한 풀네임 (예: Elon Reeve Musk, 알베르트 아인슈타인)",
  "bio": "인물 소개글 (2줄 분량, 한국어). 첫 문장은 주어 없이 출신/직업을 짧게 서술하고 마침표로 끊는다. 주요 업적과 현재 활동을 담백히 정리.",
  "profession": "직군 코드",
  "title": "수식어 (2~12자, 대표작명/호칭/업적 중 하나)",
  "nationality": "국가 코드 (ISO 3166-1 alpha-2, 예: US, KR, GB, JP)",
  "birthDate": "출생연일 (YYYY-MM-DD 형식, 기원전은 -YYYY, 예: 1955-02-24, -356)",
  "deathDate": "사망연일 (생존 시 빈 문자열, 예: 2011-10-05, -323)"
}`

export const INFLUENCE_OUTPUT_FORMAT = `{
  "political": { "score": 0, "exp": "설명" },
  "strategic": { "score": 0, "exp": "설명" },
  "tech": { "score": 0, "exp": "설명" },
  "social": { "score": 0, "exp": "설명" },
  "economic": { "score": 0, "exp": "설명" },
  "cultural": { "score": 0, "exp": "설명" },
  "transhistoricity": { "score": 0, "exp": "설명" }
}`

export const PROFILE_WITH_INFLUENCE_OUTPUT_FORMAT = `{
  "fullname": "정확한 풀네임 (예: Elon Reeve Musk, 알베르트 아인슈타인)",
  "bio": "인물 소개글 (2줄 분량, 한국어). 첫 문장은 주어 없이 출신/직업을 짧게 서술하고 마침표로 끊는다. 주요 업적과 현재 활동을 담백히 정리.",
  "profession": "직군 코드",
  "title": "수식어 (2~12자, 대표작명/호칭/업적 중 하나)",
  "nationality": "국가 코드 (ISO 3166-1 alpha-2, 예: US, KR, GB, JP)",
  "birthDate": "출생연일 (YYYY-MM-DD 형식, 기원전은 -YYYY, 예: 1955-02-24, -356)",
  "deathDate": "사망연일 (생존 시 빈 문자열, 예: 2011-10-05, -323)",
  "influence": {
    "political": { "score": 0, "exp": "설명" },
    "strategic": { "score": 0, "exp": "설명" },
    "tech": { "score": 0, "exp": "설명" },
    "social": { "score": 0, "exp": "설명" },
    "economic": { "score": 0, "exp": "설명" },
    "cultural": { "score": 0, "exp": "설명" },
    "transhistoricity": { "score": 0, "exp": "설명" }
  }
}`

export const PROFESSION_CODES = VALID_PROFESSIONS.map(p => `${p}(${PROFESSION_LABELS[p]})`).join(', ')

export const TITLE_GUIDE = `## 수식어(title) 작성 가이드
- **용도**: 인물 이름 앞에 붙는 짧은 수식어 (예: "군주론의 마키아벨리", "철의 여인 마거릿 대처")
- **길이 제한**: 대개 2~12자에서 끝내되 뜻이나 자연스러운 한국어를 훼손하지 않는다
- **우선순위** (위에서부터 적용):
  1. **대표작**: 작품명 하나 (예: '군주론', '자본론', '코스모스')
  2. **실제 호칭/별명**: 역사적 통용 호칭 (예: '철의 여인', '가왕', '독안룡')
  3. **핵심 업적**: 가장 상징적인 것 하나 (예: '테슬라 창립자', '지동설')
- **금지**: 긴 설명형 문장, 나열식 표현, "~의 아버지/어머니" 같은 뻔한 표현`

export const PROFILE_RULES = `1. fullname은 해당 인물의 정확한 풀네임을 입력. 모든 인물은 한국어로 작성 (예: 슬라보예 지젝, 알베르트 아인슈타인)
2. bio는 100자 이내로 작성. 주어 없이 출신/직업을 짧게 서술하고 마침표로 끊은 뒤 주요 업적을 이어간다
3. **title(수식어)**: 대표작명, 역사적 호칭, 핵심 업적 중 하나만 선택 (대개 2~12자)
4. nationality는 ISO 3166-1 alpha-2 국가 코드. 현대인이 아닌 경우 현재 해당 지역의 국가 코드로 재구성 (예: 알렉산더 대왕 → GR, 공자 → CN). 고대 국가로 특정 불가능한 경우 빈 문자열
5. birthDate/deathDate는 정확한 날짜를 알 수 없으면 연도만 작성
6. **출력 제한**: 문자열 내에서 큰따옴표는 작은따옴표로 대체
7. **인증 상태**: is_verified는 기본적으로 false로 설정 (공식 계정 아님)
8. 명언은 프로필 출력에 넣지 않는다. 별도 Speech 조사에서 검증한다`

// #region 백오피스용 프롬프트 (DB 스키마 기반)
export const BO_PROFILE_OUTPUT_FORMAT = `{
  "nickname": "셀럽 이름 (한국어로 작성, 예: 슬라보예 지젝)",
  "nickname_en": "영문 이름",
  "profession": "직군 코드",
  "title": "한국어 수식어",
  "title_en": "English epithet",
  "headline": "한국어 한 줄 정의",
  "headline_en": "English headline",
  "nationality": "국가 코드 (ISO 3166-1 alpha-2, 예: US, KR, GB, JP)",
  "gender": "성별 (남성: true, 여성: false, 불명: null)",
  "birth_date": "출생일 (YYYY-MM-DD 또는 -356 같은 기원전 연도)",
  "death_date": "사망일 (생존시 빈 문자열)",
  "bio": "한국어 소개",
  "bio_en": "English introduction",
  "is_verified": false
}`

export const BO_BASIC_PROFILE_PROMPT = `아래 JSON 형식에 맞춰 셀럽 기본 정보를 작성해주세요:

${BO_PROFILE_OUTPUT_FORMAT}

## 직군 코드
${PROFESSION_CODES}

대표 활동과 가장 가까운 직군을 먼저 선택하세요. 신격은 leader, 왕족은 politician, 실존 무대 마술사는 influencer를 우선 검토하세요. other는 기존 직군이 성립하지 않을 때만 최종값으로 쓰고, 조사 전 기본값이나 편의상 폴백으로 쓰지 마세요.

${TITLE_GUIDE}

위 형식을 정확히 지켜서 JSON만 응답해주세요.`

// #endregion
