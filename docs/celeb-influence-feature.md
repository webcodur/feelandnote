# 셀럽 영향력 시스템 기획

> 참고: famebook 프로젝트 영향력 시스템 분석 기반
>
> - famebook DB 스키마 및 평가 체계 (7개 항목, 100점 만점) 그대로 적용
> - AI 프롬프트는 새로 설계 (famebook은 미구현 상태였음)

## 개요

셀럽의 역사적/사회적 영향력을 7개 항목으로 평가하고, AI를 통해 자동 생성하는 기능.

## 평가 체계

### 6개 분야별 점수 (각 0-10점, 총 60점)

| 분야 | 코드 | 설명 |
|------|------|------|
| 정치·외교 | `political` | 정치와 외교 분야에서의 영향력과 업적 |
| 전략·안보 | `strategic` | 전략과 안보 분야에서의 영향력과 업적 |
| 기술·과학 | `tech` | 기술과 과학 분야에서의 영향력과 업적 |
| 사회·윤리 | `social` | 사회와 윤리 분야에서의 영향력과 업적 |
| 산업·경제 | `economic` | 산업과 경제 분야에서의 영향력과 업적 |
| 문화·예술 | `cultural` | 문화와 예술 분야에서의 영향력과 업적 |

### 통시성 (0-40점)

| 항목 | 코드 | 설명 |
|------|------|------|
| 통시성 | `transhistoricity` | 시대를 초월한 지속적 영향력. 역사를 관통하는 정도 |

### 총점 및 등급

- **총점**: 6개 분야 합계(60점) + 통시성(40점) = 100점 만점
- **등급**: S(90+) / A(80-89) / B(70-79) / C(60-69) / D(0-59)

## DB 스키마

```sql
CREATE TABLE celeb_influence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celeb_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- 6개 분야별 점수 및 설명
  political INTEGER DEFAULT 0 CHECK (political >= 0 AND political <= 10),
  political_exp TEXT,
  strategic INTEGER DEFAULT 0 CHECK (strategic >= 0 AND strategic <= 10),
  strategic_exp TEXT,
  tech INTEGER DEFAULT 0 CHECK (tech >= 0 AND tech <= 10),
  tech_exp TEXT,
  social INTEGER DEFAULT 0 CHECK (social >= 0 AND social <= 10),
  social_exp TEXT,
  economic INTEGER DEFAULT 0 CHECK (economic >= 0 AND economic <= 10),
  economic_exp TEXT,
  cultural INTEGER DEFAULT 0 CHECK (cultural >= 0 AND cultural <= 10),
  cultural_exp TEXT,

  -- 통시성
  transhistoricity INTEGER DEFAULT 0 CHECK (transhistoricity >= 0 AND transhistoricity <= 40),
  transhistoricity_exp TEXT,

  -- 총점 및 등급
  total_score INTEGER DEFAULT 0 CHECK (total_score >= 0 AND total_score <= 100),
  rank CHAR(1) DEFAULT 'D' CHECK (rank IN ('S', 'A', 'B', 'C', 'D')),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(celeb_id)
);

-- RLS 정책
ALTER TABLE celeb_influence ENABLE ROW LEVEL SECURITY;

-- 읽기: 모든 사용자
CREATE POLICY "celeb_influence_select" ON celeb_influence
  FOR SELECT USING (true);

-- 쓰기: 관리자만 (web-bo에서 처리)
```

## AI 생성 프로세스

### 플로우

```
1. 셀럽 기본 정보 입력 (닉네임, 직군, 소개)
     ↓
2. "AI 영향력 생성" 버튼 클릭
     ↓
3. Gemini API 호출
   - 인물명 + bio + profession 기반 평가
   - 7개 항목별 점수 + 설명 생성
     ↓
4. 결과 미리보기
   - 레이더 차트 시각화
   - 각 항목 설명 표시
   - 총점/등급 표시
     ↓
5. "적용" 클릭 → DB 저장
```

### AI 프롬프트

```
다음 인물의 영향력을 7개 항목으로 평가해줘.

## 인물 정보
- 이름: {name}
- 소개: {bio}
- 직군: {profession}

## 평가 항목
1. political (정치·외교): 0-10점
2. strategic (전략·안보): 0-10점
3. tech (기술·과학): 0-10점
4. social (사회·윤리): 0-10점
5. economic (산업·경제): 0-10점
6. cultural (문화·예술): 0-10점
7. transhistoricity (통시성): 0-40점

## 규칙
- 각 항목의 점수는 해당 분야에서의 실제 영향력 기반
- 설명은 1-2문장으로 간결하게, 한국어로 작성
- 알려진 인물 정보만 반영, 추측 금지
- 통시성은 시대를 초월한 영향력 평가

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

JSON만 출력:
```

### 응답 파싱

```typescript
interface InfluenceScore {
  score: number
  exp: string
}

interface GeneratedInfluence {
  political: InfluenceScore
  strategic: InfluenceScore
  tech: InfluenceScore
  social: InfluenceScore
  economic: InfluenceScore
  cultural: InfluenceScore
  transhistoricity: InfluenceScore
}

// 총점 계산
function calculateTotalScore(influence: GeneratedInfluence): number {
  return (
    influence.political.score +
    influence.strategic.score +
    influence.tech.score +
    influence.social.score +
    influence.economic.score +
    influence.cultural.score +
    influence.transhistoricity.score
  )
}

// 등급 계산
function calculateRank(totalScore: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (totalScore >= 90) return 'S'
  if (totalScore >= 80) return 'A'
  if (totalScore >= 70) return 'B'
  if (totalScore >= 60) return 'C'
  return 'D'
}
```

## UI 설계

### 백오피스 (web-bo)

#### 셀럽 생성/편집 페이지 구조

```
[기본 정보 카드]
├── 닉네임 입력 *
├── AI 프로필 생성 섹션
├── 직군 선택
├── 소개 입력
├── 프로필 URL
└── 공식 인증 체크박스

[영향력 카드] ← 신규
├── 헤더: "AI 영향력 평가" + 생성 버튼
├── 레이더 차트 (6개 분야)
├── 통시성 바 차트
├── 7개 항목별 점수/설명 리스트
├── 총점 표시 (00/100)
├── 등급 뱃지 (S/A/B/C/D)
└── 적용/취소 버튼 (생성 후)
```

#### 레이더 차트 데이터

```typescript
const radarData = [
  { category: '정치·외교', score: influence.political.score, fullMark: 10 },
  { category: '전략·안보', score: influence.strategic.score, fullMark: 10 },
  { category: '기술·과학', score: influence.tech.score, fullMark: 10 },
  { category: '사회·윤리', score: influence.social.score, fullMark: 10 },
  { category: '산업·경제', score: influence.economic.score, fullMark: 10 },
  { category: '문화·예술', score: influence.cultural.score, fullMark: 10 },
]
```

### 사용자 웹 (web)

- 셀럽 프로필 페이지에 영향력 요약 표시
- 레이더 차트 + 등급 뱃지
- 상세 보기 모달 (7개 항목 설명)

## 구현 순서

| 순서 | 작업 | 파일 위치 |
|------|------|-----------|
| 1 | DB 마이그레이션 | Supabase MCP |
| 2 | 타입 정의 | `sw/web-bo/src/types/` |
| 3 | AI 클라이언트 (Gemini) | `packages/api-clients/src/celeb-influence-generator.ts` |
| 4 | Server Action | `sw/web-bo/src/actions/admin/celebs.ts` |
| 5 | UI - 영향력 섹션 | `sw/web-bo/src/app/(admin)/celebs/components/AIInfluenceSection.tsx` |
| 6 | UI - 레이더 차트 | `sw/web-bo/src/components/charts/RadarChart.tsx` |
| 7 | CelebForm 통합 | `sw/web-bo/src/app/(admin)/celebs/components/CelebForm.tsx` |

## 참고

- famebook 프로젝트: `~/바탕 화면/윤시준/PRJ/famebook`
- 원본 스키마: `famebook/queries/영향력 평가 테이블 생성 쿼리.java`
- 원본 UI: `famebook/app_fe/view/people/scoreModal/`
