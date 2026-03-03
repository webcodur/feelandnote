# 셀럽 큐 관리 룰북

신규 셀럽 후보를 발굴·등록·추적하는 가이드.

---

## 큐 파일

- **경로**: `docs/celeb-candidates/` 디렉토리
  - `ancient.md` — 고대 (~5세기)
  - `medieval.md` — 중세 (5~15세기)
  - `early-modern.md` — 근세·근대 (15~19세기)
- **형식**: 마크다운 테이블
- **운영 가이드**: `docs/celeb-candidates/README.md`

---

## 큐 파일 형식

```markdown
| 이름 | 시대 | 직군 | 티어 | 우선순위 | 상태 | 단계 | 비고 |
|------|------|------|------|---------|------|------|------|
| 소동파 | 중세 | author | full | 1 | pending | - | 시문에 독서 기록 풍부 |
| 여포 | 고대 | commander | light | 1 | pending | - | 감상 기록 없음 |
```

### 상태(status)

| 값 | 의미 |
|-----|------|
| `pending` | 대기 중 |
| `in_progress` | 작업 중 |
| `done` | 전체 완료 |
| `skip` | 자료 부족 등으로 건너뜀 |

### 단계(step)

파이프라인 진행 단계를 기록한다.

| 값 | 의미 |
|-----|------|
| `-` | 미시작 |
| `basic` | 기본정보 완료 |
| `content` | 콘텐츠 수집 완료 (full만) |
| `philosophy` | 감상 철학 완료 |
| `influence` | 영향력 완료 |
| `persona` | 페르소나 완료 (= 전체 완료) |

### 우선순위

| 값 | 기준 |
|-----|------|
| **1** | 누구나 아는 인물 (교과서급 인지도) |
| **2** | 역사에 관심 있으면 아는 인물 |
| **3** | 해당 분야 전공자가 아는 인물 |

---

## 파이프라인 실행 순서

### full 파이프라인 (celeb_tier = 'full')

```
1. basic      → celeb-basic-profile 에이전트
2. content    → celeb-content-collector 에이전트
3. philosophy → celeb-philosophy 에이전트 (DB 콘텐츠 + 웹 리서치)
4. influence  → celeb-influence 에이전트
5. persona    → celeb-persona 에이전트
```

### light 파이프라인 (celeb_tier = 'light')

```
1. basic      → celeb-basic-profile 에이전트
2. philosophy → celeb-philosophy 에이전트 (웹 리서치 기반)
3. influence  → celeb-influence 에이전트
4. persona    → celeb-persona 에이전트
```

- light 파이프라인에는 콘텐츠 수집 단계가 없다
- skip 게이트 없음: light 인물도 philosophy까지 반드시 완료

### 병렬 실행 규칙

- **1단계** (basic): 배치 내 전원 병렬 실행 가능
- **2단계** (content/philosophy): 1단계 완료 후 배치 내 병렬 실행 가능
- **3~4단계** (influence + persona): 2단계 완료 후 병렬 실행 가능

### 배치 처리

한 번에 3~5명씩 처리한다. 큐에서 `pending` 상태를 우선순위순으로 꺼낸다.

```
1. 큐에서 pending 3~5명 선택, 상태를 in_progress로 변경
2. 1단계: basic 병렬 실행 (celeb_tier 판정)
3. full → content 수집 / light → 스킵
4. philosophy 실행 (full: DB+웹 / light: 웹 리서치)
5. influence + persona 병렬 실행
6. 상태를 done으로 변경
```

---

## 후보 선정 기준

### 1순위: 인지도 (가장 중요)

유저가 "이 사람도 있네?"라고 반응할 인물을 우선한다. 감상 기록이 빈약해도 인지도가 높으면 구실을 찾아서 등록한다.

### 2순위: 직군 밸런스

특정 직군(학자·문인)에 편중되지 않도록 한다. 특히 **commander(지휘관)·leader(지도자)** 비중을 의식적으로 확보한다.

### 티어 판정 기준

| 조건 | 티어 |
|------|------|
| 인터뷰·SNS 등 감상 기록 풍부 (현대인) | **full** |
| 사서·서한에서 특정 작품 직접 언급/인용 | **full** |
| 문화 활동을 즐긴 기록은 있으나 엄격한 1차 사료 인용 없음 | **light** |

### 등록 최소 조건 (핵심)

인물이 최소한 하나의 문화적 감상 활동(시문학, 음악, 독서, 관극, 예술 향유 등)을 **긍정적으로** 즐긴 기록이 있어야 한다.

| 등록 가능 | 등록 불가 |
|----------|----------|
| 시를 지었다, 음악을 즐겼다, 경전을 읊었다 | "글은 이름만 쓰면 족하다" (감상 거부) |
| 화랑도·유학·불교 수학 | 문화 기록 전무, 순수 무력만 |
| 그리스 교양 교육, 연극 후원 | "병법에 구애될 필요 없다" (학문 경시) |

### full 후보의 감상 기록 유형

| 유형 | 논리 | 예시 |
|------|------|------|
| **직접 인용** | 연설·서한·조서에서 인용한 구절 | 당태종 → 정관정요에서 경전 인용 |
| **사관 기록** | "왕이 ~를 읽었다"는 사서 기록 | 정조 → 일성록 독서 기록 |
| **수집·편찬 지시** | 직접 읽지 않아도 수집·편찬 주도 | 건륭제 → 사고전서 |

### 검색 키워드

```
"famous historical figures" reading habits books
역사 인물 독서 목록 추천 도서
{인물명} 독서 기록 경전 인용
{인물명} favorite books reading
```

### 중복 확인

후보 추가 전 반드시 기존 DB 확인:

```sql
SELECT nickname FROM profiles
WHERE profile_type = 'CELEB'
  AND nickname LIKE '%{검색어}%';
```

---

## 주의사항

- light 셀럽도 감상 철학 작성은 필수. 철학조차 쓸 수 없는 인물만 `skip` 처리
- 현대인(1900년 이후 출생)은 이 큐에서 제외
- 큐 파일 수정 시 반드시 상태·단계·티어를 정확히 업데이트

---

## 기술 요구사항

- **Supabase 프로젝트 ID**: `wouqtpvfctednlffross`
- **파일 경로**: 상대 경로만 사용
