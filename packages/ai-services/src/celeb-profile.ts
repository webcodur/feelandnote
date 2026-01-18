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
  "fullname": "정확한 풀네임 (예: Elon Reeve Musk, 알베르트 아인슈타인)",
  "bio": "인물 소개글 (2줄 분량, 한국어)",
  "profession": "직군 코드",
  "nationality": "국가 코드 (ISO 3166-1 alpha-2, 예: US, KR, GB, JP)",
  "birthDate": "출생연일 (YYYY-MM-DD 형식, 기원전은 -YYYY, 예: 1955-02-24, -356)",
  "deathDate": "사망연일 (생존 시 빈 문자열, 예: 2011-10-05, -323)",
  "quotes": "대표 명언 또는 발언 (한국어로, 1문장)"
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
1. fullname은 해당 인물의 정확한 풀네임을 입력. 한국인은 한글로, 외국인은 원어 또는 영문으로 작성
2. bio는 100자 이내로 작성. 주어 없이 출신/직업을 짧게 서술하고 마침표로 끊은 뒤 주요 업적을 이어간다. 간결하고 권위적인 말투 사용
3. profession은 위 코드 중 가장 적합한 것 선택
4. nationality는 ISO 3166-1 alpha-2 국가 코드 사용 (예: US, KR, GB, JP, FR, DE). 고대 국가나 현존하지 않는 국가는 빈 문자열
5. birthDate/deathDate는 정확한 날짜를 알 수 없으면 연도만 작성 (예: -356, 1955)
6. quotes는 50자 이내로 작성, 알려진 것이 없으면 빈 문자열
7. **출력 제한**: 문자열 내에서 큰따옴표는 작은따옴표로 대체. 인용문 작성 시 JSON 형식이 깨지지 않도록 주의

JSON만 출력:`
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
{
  "fullname": "정확한 풀네임 (예: Elon Reeve Musk, 알베르트 아인슈타인)",
  "bio": "인물 소개글 (2줄 분량, 한국어)",
  "profession": "직군 코드",
  "nationality": "국가 코드 (ISO 3166-1 alpha-2, 예: US, KR, GB, JP)",
  "birthDate": "출생연일 (YYYY-MM-DD 형식, 기원전은 -YYYY, 예: 1955-02-24, -356)",
  "deathDate": "사망연일 (생존 시 빈 문자열, 예: 2011-10-05, -323)",
  "quotes": "대표 명언 또는 발언 (한국어로, 1문장)",
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

## 영향력 평가 기준 (엄격하게 적용)

### 6개 영역 (각 0-10점)
**핵심 원칙: 근본적 기여도 평가, 추상적 연결 금지**

평가 기준은 "직접 vs 간접"이 아니라 **"해당 분야에서 얼마나 근본적인 영향을 미쳤는가?"**이다.

**영향력 범위(스케일) 고려:**
- 글로벌 영향만 인정하는 것이 아니라, 국가/지역/분야 단위의 실질적 영향력도 평가한다
- 단, 영향 범위가 좁을수록 같은 수준의 영향이라도 점수는 낮아진다
- 예: 국가 전체 정치 장악(7-8점) vs 글로벌 정치 질서 재편(9-10점)

**점수 등급:**
- 9-10점: 글로벌 스케일에서 해당 분야의 근본 토대를 제공하거나 패러다임을 전환
- 7-8점: 글로벌 또는 주요 국가/지역에서 해당 분야의 핵심 시스템을 직접 구축하거나 장악
- 5-6점: 국가/지역/업계 단위에서 해당 분야에 실질적이고 측정 가능한 영향
- 3-4점: 해당 분야에 부분적으로 기여하거나 일부 변화를 이끔
- 1-2점: 해당 분야에 미미한 영향
- 0점: 관련 없음

**점수 부여 불가 (추상적 연결):**
- "~의 사고방식에 영향을 미쳤다"
- "~의 위상을 높였다"
- "~에도 영향을 미쳤다고 볼 수 있다"

**영역별 평가 질문:**
1. political (정치·외교): 정치 체제/정책/외교 질서를 변화시켰는가?
2. strategic (전략·안보): 군사 전략/무기 체계/안보 패러다임을 변화시켰는가?
3. tech (기술·과학): 기술/과학 발전에 기여했는가?
4. social (사회·윤리): 사회 규범/윤리 담론/제도를 변화시켰는가?
5. economic (산업·경제): 산업 구조/경제 시스템을 변화시켰는가?
6. cultural (문화·예술): 문화/예술 트렌드/장르를 변화시켰는가?

**평가 예시:**
- 아인슈타인: tech 10, strategic 9 (핵무기·미사일 유도·GPS 없이 현대전 불가능), economic 8 (원자력·반도체·GPS 산업의 필수 토대)
- 스티브 잡스: economic 9 (스마트폰 산업 창출), tech 7, cultural 5
- 김정은: political 7 (북한 정권 장악, 한반도 정치 좌우), strategic 7 (핵무장으로 동북아 안보 구도 변화), social 5 (북한 사회 통제), cultural 4 (북한 문화/선전 체계)
- BTS: cultural 8, economic 5 (K-pop 산업 확장), 나머지 0~1
- 넬슨 만델라: political 9, social 9

### 통시성 (transhistoricity, 0-40점)
"과거부터 미래까지, 인류사 전체에 걸쳐 영향을 미치는가?"를 평가한다.

**평가 기준:**
1. **역사적 영향**: 장기간에 걸쳐 인류에게 영향을 미쳤는가?
2. **미래 지속성**: 인류 문명의 구조적 토대로서 앞으로도 영향이 지속될 것인가?

**미래 영향 인정 기준 (중요):**
- ✅ 인정: 이미 인류 지식/문명의 근본 구조에 통합되어 대체 불가능한 경우
  - 예: 상대성이론(물리학 토대), 민주주의(정치 체제), 시장경제(경제 체제)
- ❌ 불인정: 아직 검증되지 않은 미래 가능성에 대한 추측
  - 예: "AI로 인류를 바꿀 것이다", "미래에 재평가될 것이다"

**점수 기준:**
- 35-40점: 인류 문명의 근본 토대 (사상/종교/과학 원리). 과거-현재-미래 전체에 영향
  - 예: 예수, 붓다, 공자, 무함마드, 아리스토텔레스
- 28-34점: 문명 패러다임을 전환하고 구조적 토대로 정착
  - 예: 뉴턴, 다윈, 아인슈타인 (과학적 토대로 영구 지속)
- 20-27점: 특정 분야의 근본 토대로 장기 지속 예상
  - 예: 칸트, 마르크스, 프로이트
- 10-19점: 근현대에 큰 영향, 일부 구조적 기여
- 5-9점: 현대에 영향력 있으나 장기 지속성 불확실
- 0-4점: 동시대에만 영향력 (현대 연예인, 스포츠인 대부분)

**주의사항:**
- 생존 인물도 이미 구조적 토대를 확립했다면 높은 점수 가능
- 단, "앞으로 ~할 것이다"는 희망적 추측은 금지

## 규칙
1. fullname은 해당 인물의 정확한 풀네임을 입력. 한국인은 한글로, 외국인은 원어 또는 영문으로 작성
2. bio는 100자 이내로 작성. 주어 없이 출신/직업을 짧게 서술하고 마침표로 끊은 뒤 주요 업적을 이어간다
3. 각 영향력 exp는 30자 이내 1문장으로 간결하게
4. 알려진 정보만 반영, 추측 금지
5. 전문 분야 외 영역은 반드시 낮은 점수 부여
6. nationality는 ISO 3166-1 alpha-2 국가 코드
7. birthDate/deathDate는 정확한 날짜를 알 수 없으면 연도만 작성
8. quotes는 50자 이내로 작성, 알려진 것이 없으면 빈 문자열
9. **출력 제한**: 문자열 내에서 큰따옴표는 작은따옴표로 대체. 인용문 작성 시 JSON 형식이 깨지지 않도록 주의

JSON만 출력:`
}

// 영향력 랭크 계산 (단일 원천)
export function calculateInfluenceRank(totalScore: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (totalScore >= 80) return 'S'
  if (totalScore >= 60) return 'A'
  if (totalScore >= 50) return 'B'
  if (totalScore >= 40) return 'C'
  return 'D'
}

// 내부 사용용 alias
const calculateRank = calculateInfluenceRank

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
function buildInfluencePrompt(input: CelebProfileInput): string {
  return `다음 인물의 영향력을 평가해줘.

## 인물 정보
- 이름: ${input.name}
- 설명: ${input.description || '(없음)'}

## 출력 형식 (JSON)
{
  "political": { "score": 0, "exp": "설명" },
  "strategic": { "score": 0, "exp": "설명" },
  "tech": { "score": 0, "exp": "설명" },
  "social": { "score": 0, "exp": "설명" },
  "economic": { "score": 0, "exp": "설명" },
  "cultural": { "score": 0, "exp": "설명" },
  "transhistoricity": { "score": 0, "exp": "설명" }
}

## 영향력 평가 기준 (엄격하게 적용)

### 6개 영역 (각 0-10점)
**핵심 원칙: 근본적 기여도 평가, 추상적 연결 금지**

평가 기준은 "직접 vs 간접"이 아니라 **"해당 분야에서 얼마나 근본적인 영향을 미쳤는가?"**이다.

**영향력 범위(스케일) 고려:**
- 글로벌 영향만 인정하는 것이 아니라, 국가/지역/분야 단위의 실질적 영향력도 평가한다
- 단, 영향 범위가 좁을수록 같은 수준의 영향이라도 점수는 낮아진다
- 예: 국가 전체 정치 장악(7-8점) vs 글로벌 정치 질서 재편(9-10점)

**점수 등급:**
- 9-10점: 글로벌 스케일에서 해당 분야의 근본 토대를 제공하거나 패러다임을 전환
- 7-8점: 글로벌 또는 주요 국가/지역에서 해당 분야의 핵심 시스템을 직접 구축하거나 장악
- 5-6점: 국가/지역/업계 단위에서 해당 분야에 실질적이고 측정 가능한 영향
- 3-4점: 해당 분야에 부분적으로 기여하거나 일부 변화를 이끔
- 1-2점: 해당 분야에 미미한 영향
- 0점: 관련 없음

**점수 부여 불가 (추상적 연결):**
- "~의 사고방식에 영향을 미쳤다"
- "~의 위상을 높였다"
- "~에도 영향을 미쳤다고 볼 수 있다"

**영역별 평가 질문:**
1. political (정치·외교): 정치 체제/정책/외교 질서를 변화시켰는가?
2. strategic (전략·안보): 군사 전략/무기 체계/안보 패러다임을 변화시켰는가?
3. tech (기술·과학): 기술/과학 발전에 기여했는가?
4. social (사회·윤리): 사회 규범/윤리 담론/제도를 변화시켰는가?
5. economic (산업·경제): 산업 구조/경제 시스템을 변화시켰는가?
6. cultural (문화·예술): 문화/예술 트렌드/장르를 변화시켰는가?

**평가 예시:**
- 아인슈타인: tech 10, strategic 9 (핵무기·미사일 유도·GPS 없이 현대전 불가능), economic 8 (원자력·반도체·GPS 산업의 필수 토대)
- 스티브 잡스: economic 9 (스마트폰 산업 창출), tech 7, cultural 5
- 김정은: political 7 (북한 정권 장악, 한반도 정치 좌우), strategic 7 (핵무장으로 동북아 안보 구도 변화), social 5 (북한 사회 통제), cultural 4 (북한 문화/선전 체계)
- BTS: cultural 8, economic 5 (K-pop 산업 확장), 나머지 0~1
- 넬슨 만델라: political 9, social 9

### 통시성 (transhistoricity, 0-40점)
"과거부터 미래까지, 인류사 전체에 걸쳐 영향을 미치는가?"를 평가한다.

**평가 기준:**
1. **역사적 영향**: 장기간에 걸쳐 인류에게 영향을 미쳤는가?
2. **미래 지속성**: 인류 문명의 구조적 토대로서 앞으로도 영향이 지속될 것인가?

**미래 영향 인정 기준 (중요):**
- ✅ 인정: 이미 인류 지식/문명의 근본 구조에 통합되어 대체 불가능한 경우
  - 예: 상대성이론(물리학 토대), 민주주의(정치 체제), 시장경제(경제 체제)
- ❌ 불인정: 아직 검증되지 않은 미래 가능성에 대한 추측
  - 예: "AI로 인류를 바꿀 것이다", "미래에 재평가될 것이다"

**점수 기준:**
- 35-40점: 인류 문명의 근본 토대 (사상/종교/과학 원리). 과거-현재-미래 전체에 영향
  - 예: 예수, 붓다, 공자, 무함마드, 아리스토텔레스
- 28-34점: 문명 패러다임을 전환하고 구조적 토대로 정착
  - 예: 뉴턴, 다윈, 아인슈타인 (과학적 토대로 영구 지속)
- 20-27점: 특정 분야의 근본 토대로 장기 지속 예상
  - 예: 칸트, 마르크스, 프로이트
- 10-19점: 근현대에 큰 영향, 일부 구조적 기여
- 5-9점: 현대에 영향력 있으나 장기 지속성 불확실
- 0-4점: 동시대에만 영향력 (현대 연예인, 스포츠인 대부분)

**주의사항:**
- 생존 인물도 이미 구조적 토대를 확립했다면 높은 점수 가능
- 단, "앞으로 ~할 것이다"는 희망적 추측은 금지

## 규칙
1. 각 영향력 exp는 30자 이내 1문장으로 간결하게
2. 알려진 정보만 반영, 추측 금지
3. 전문 분야 외 영역은 반드시 낮은 점수 부여
4. **출력 제한**: 문자열 내에서 큰따옴표는 작은따옴표로 대체

JSON만 출력:`
}

function parseInfluenceResponse(response: string): GeneratedInfluence | null {
  const text = response.replace(/[\r\n]+/g, ' ')
  const fields = ['political', 'strategic', 'tech', 'social', 'economic', 'cultural', 'transhistoricity'] as const
  const maxScores: Record<string, number> = {
    political: 10, strategic: 10, tech: 10, social: 10, economic: 10, cultural: 10, transhistoricity: 40,
  }

  const extract = (field: string) => {
    const scoreMatch = text.match(new RegExp(`"${field}"[^}]*"score"\\s*:\\s*(\\d+)`))
    const score = Math.min(scoreMatch ? parseInt(scoreMatch[1], 10) : 0, maxScores[field])
    // exp: "필드명" 블록 내에서 "exp": " 다음부터 " } 또는 ", 전까지
    const expMatch = text.match(new RegExp(`"${field}"[^}]*"exp"\\s*:\\s*"([^"}]+)`))
    return { score, exp: expMatch?.[1]?.trim() || '' }
  }

  const result = Object.fromEntries(fields.map(f => [f, extract(f)])) as Record<typeof fields[number], { score: number; exp: string }>
  const totalScore = fields.reduce((sum, f) => sum + result[f].score, 0)

  return { ...result, totalScore, rank: calculateRank(totalScore) }
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
