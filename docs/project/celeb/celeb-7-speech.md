# Speech 트랙 룰북

셀럽의 발화 관련 데이터를 통합 관리한다: speech_tone → quotes → dialogue.

---

## 의존 관계

```
basic 완료 → speech_tone 배정 → quotes 작성 → dialogue 생성*
                                                *퍼블릭 도메인만 자동
```

- speech_tone: basic만 완료되면 독립 배정 가능 (persona 의존 없음)
- quotes: speech_tone 확정 후 어조 일치 기반 작성
- dialogue: quotes 완료 후, 퍼블릭 도메인 셀럽만 자동 생성

---

## Phase 1: speech_tone 배정

### 위치

`profiles.speech_tone` (text 컬럼)

### 6종 톤

| tone | 한국어 설명 | 영문 뉘앙스 | 인물 예시 |
|------|-----------|------------|----------|
| **bold** | 단언·선언·명령 | assertive, commanding | 나폴레옹, 스티브 잡스 |
| **composed** | 절제·관조 | measured, calm | 마르쿠스 아우렐리우스, 워렌 버핏 |
| **gentle** | 부드러운 구어 | warm, soft-spoken | 아인슈타인, 밥 로스 |
| **free** | 거침없는 구어 | casual, informal | 무하마드 알리, 일론 머스크 |
| **humble** | 겸양 | modest, graceful | 이순신, 간디 |
| **loyal** | 의무·사명 | firm, devoted | 유관순, 윤봉길 |

### 배정 기준

1. **직군(profession)** 기반 초기 후보 선정
   - commander → bold, loyal, humble 중 택
   - leader → humble, loyal 중 택
   - politician → composed, bold 중 택
   - entrepreneur/investor → bold, composed, free 중 택
   - author/humanities_scholar → composed, gentle 중 택
   - actor/musician/influencer → free, gentle 중 택
   - scientist → composed, gentle 중 택
   - athlete → bold, free 중 택
2. **인물 성격·업적** 기반 최종 결정
   - 웹 검색으로 인물의 대표 발언 스타일 확인
   - 해당 인물의 말투가 직군 기본값과 다르면 실제 말투 우선

### 배치 처리

```sql
UPDATE profiles SET speech_tone = CASE id
  WHEN '{id1}' THEN '{tone1}'
  WHEN '{id2}' THEN '{tone2}'
  ...
  ELSE speech_tone
END
WHERE id IN ('{id1}', '{id2}', ...);
```

---

## Phase 2: quotes 작성·검수

**상세 룰북**: `docs/project/celeb/celeb-9-quotes.md`

speech_tone 확정 후 실행. 핵심 원칙만 요약:

- 50자 이내, 한 문장, 한국어
- 출처: 본인 직접 발언만 (캐릭터 대사·가사 불허)
- speech_tone별 어조 일치 필수 (D6 체크)
- quotes/quotes_en 동시 작성
- 실제 발언 없으면 역사 일화 기반 창작 허용 (D 카테고리)

### 고대·근대 인물

기록 부족 인물은 **업적 기반 창작이 기본**. 모범: 광개토대왕 → `celeb-9-quotes.md` 참조.

### 문학가·시인

**본인 작품 구절 사용 허용**. 문학가의 작품은 곧 정체성이다. 모범: 이순신 한산도가 → `celeb-9-quotes.md` 참조.

---

## Phase 3: dialogue 생성

**상세 룰북**: `docs/project/celeb/celeb-8-dialogue.md`

quotes 완료 후 실행. 자동 생성 조건:

| 조건 | dialogue 생성 |
|------|--------------|
| `death_date` ≤ 1920 | **자동 실행** — greeting_only (3개) |
| `death_date` > 1920 또는 생존 | **자동 실행** — greeting_only (3개). full은 별도 요청 시 |

### dialogue_tier

- **full**: 7상황 × 3변형 = 21개
- **greeting_only**: greeting 3개만

---

## 업데이트 가드 (필수)

**반드시 `docs/project/celeb/celeb-common-update-guard.md`를 읽고 따른다.**

핵심: 기존 데이터 참조 없이 백지 재작성. UPDATE 직전 비교하여 동일하면 SKIPPED. 배치 완료 시 카운트 보고 필수.

---

## 기술 요구사항

- **Supabase 프로젝트 ID**: `wouqtpvfctednlffross`
- **파일 경로**: 상대 경로만 사용
