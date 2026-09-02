# 교차 격자 (Crossing Grid) 발주서

> **최종 실측 체크: 26.07.31** — 부분 대조: `sw/web/src/actions/game/getPortraitFigures.ts`, `sw/web/src/components/features/game/portrait/`, `sw/web/src/components/shared/GameFullScreen.tsx`, `docs/project/data/db-core.md`, `docs/project/data/db-celeb.md`, `sw/web/messages/{ko,en}/game-grid.json`, `sw/web/src/lib/db/static.ts`, `sw/web/src/lib/cache.ts`. DB 실측 없음(환경값 부재).

## 무엇을 하는 게임인가

3×3 격자가 주어진다. 행 3줄과 열 3줄에 각각 조건이 붙는다 — 예를 들어 행은 "19세기 / 20세기 / 18세기", 열은 "과학자 / 작가 / 음악가". 각 칸에는 **행 조건과 열 조건을 동시에 만족하는 인물의 이름을 직접 입력**한다. 보기를 고르는 게 아니라 기억에서 꺼내는 게임이다.

9칸을 모두 채우면 한 판이 끝나고, 정답 수를 보여준다. 같은 인물을 두 칸에 쓸 수 없다.

## 기존 게임과의 축 차이

| 게임 | 핵심 능력 | 입력 |
|------|-----------|------|
| 시대의 초상 | 얼굴 인식 + 반사 속도 | 4지선다 |
| 미궁 | 소거법 + 힌트 종합 | 다지선다 |
| **교차 격자** | **조건 교차 기억 회상** | **자유 입력 (자동완성)** |

차이점: 보기가 없다. 유저의 인물 지식 넓이를 시험한다.

## 한 판 완주 흐름

1. 로비 — 규칙 설명, 시작 버튼
2. 격자 표시 — 행·열 헤더에 조건 라벨, 9칸 빈 격자
3. 칸 선택 → 하단 자동완성 입력 활성
4. 이름 입력 → 즉시 채점(정답 ✓ / 오답 ✗ 표시)
5. 9칸 다 채우면 → 결과 화면(정답 수, 퍼센트)
6. 다시하기 / 처음으로

## 출제·채점 규칙

- **조건 축**: 국적(nationality), 직군(profession), 세기(century), 세력 태그(tag) 4종 중 2종을 교차.
- **행 축과 열 축은 항상 다른 종류**다 (예: 행=세기, 열=직군).
- **각 칸에 정답이 최소 1명 존재함을 보장**한다 — 그리디 구축으로 검증 통과한 조합만 출제.
- 같은 인물을 두 칸에 쓸 수 없다(used set).
- 오답도 기록 — 한 칸에 한 번만 답할 수 있다.
- **반복 플레이** 가능 (매번 랜덤 생성). 하루 한 판 제한 없음.
  - 이유: DB 연결 없이 체험 모드에서도 여러 번 놀 수 있어야 하고, 날짜 시드는 서버에 상태를 저장해야 의미가 있다.

### 세기 판정

`birth_date` 텍스트를 정수 파싱. 양수면 `ceil(year/100)` (1809 → 19세기), 음수면 `BC + ceil(abs(year)/100)` (-384 → BC4).

## 데이터 원천 표

| 테이블 | 컬럼 | 용도 |
|--------|------|------|
| `celebs` | id, nickname, nickname_en, slug, nationality, profession, birth_date, death_date, publication_status, celeb_tier | 인물 후보 + 자동완성 목록 |
| `celeb_tag_assignments` | celeb_id, tag_id, hidden | 세력 태그 소속 (조건 축 "tag") |
| `celeb_tags` | id, name, name_en, slug, is_featured | 태그 라벨 표시 |

## 조회 설계

1. **`getGridGameData()` 서버 액션** (캐시 7일, CELEBS 태그)
   - celebs: `publication_status=active`, `celeb_tier in (full, light)`, `nationality IS NOT NULL`, `profession IS NOT NULL` → limit 1000 (단일 조회, 정렬 `id asc`)
   - celeb_tag_assignments: `hidden=false` → limit 5000
   - celeb_tags: `is_featured=true` → limit 100
2. 환경값 부재 시 catch → fixture 데이터 반환 + `isFixture: true`
3. 클라이언트에서 전체 celeb 목록을 받아 자동완성 필터링 (서버 왕복 없음)

## 파일 목록

| 경로 | 역할 |
|------|------|
| `sw/web/src/components/features/game/grid/types.ts` | 타입·상수 |
| `sw/web/src/components/features/game/grid/engine.ts` | 규칙 엔진 (조건 판정, 퍼즐 생성, 정답 검증) |
| `sw/web/src/components/features/game/grid/fixture.ts` | 체험 표본 (실제 인물 57명, 사실만) |
| `sw/web/src/components/features/game/grid/GridGame.tsx` | 메인 게임 컴포넌트 |
| `sw/web/src/components/features/game/grid/GridLobby.tsx` | 로비 화면 |
| `sw/web/src/components/features/game/grid/GridBoard.tsx` | 격자 + 자동완성 |
| `sw/web/src/components/features/game/grid/GridResult.tsx` | 결과 화면 |
| `sw/web/src/actions/game/grid.ts` | 서버 조회 + 캐시 |
| `sw/web/src/app/[locale]/lab/games/grid/page.tsx` | 단독 시험 화면 |
| `sw/web/messages/ko/game-grid.json` | 한국어 문구 (27키) |
| `sw/web/messages/en/game-grid.json` | 영어 문구 (27키) |

## 공정성·오류 처리

- **출제 보장**: 그리디 구축으로 9칸 전부 정답 존재 확인. 불가능하면 null → 시작 불가.
- **중복 방지**: used set으로 같은 인물 재사용 차단.
- **조회 실패**: try/catch → fixture 폴백. 화면 상단에 "체험 모드" 배너 상시 표시.
- **조용한 폴백 금지**: 배너가 항상 보인다.
- **입력 검증**: 자동완성 목록에 있는 인물만 선택 가능 — 임의 문자열 제출 불가.

## 모바일·접근성

- 320px 폭에서 완주 가능 — 격자가 `aspect-square` + 반응형 텍스트로 축소.
- 정오답을 **색 + 아이콘(✓/✗)**으로 표시. 색만으로 구분하지 않음.
- 자동완성 입력에 `aria-label` 부여.
- 각 칸에 `aria-label` (행·열 번호).
- 조건 라벨은 축약 없이 전문 표시.

## 문구 키

최상위: `gameGrid` (변경 금지)

| 키 | 설명 |
|----|------|
| `title` | 게임 이름 |
| `intro` | 규칙 소개문 |
| `mobileRuleSummary` | 모바일 한줄 규칙 |
| `startGame` | 시작 버튼 |
| `fixtureMode` | 체험 모드 배너 |
| `playing` | 브레드크럼 "진행 중" |
| `progress` | "N/9 칸 완료" |
| `searchPlaceholder` | 입력 placeholder |
| `noResults` | 검색 결과 없음 |
| `resultTitle` / `resultPerfect` / `resultScore` | 결과 화면 |
| `replay` / `toLobby` / `exit` / `exitEsc` | 버튼들 |
| `rules.*` | 규칙 카드 3종 |
| `cellAriaLabel` / `searchAriaLabel` / `correct` / `wrong` | 접근성 |
| `notEnoughData` | 데이터 부족 |

## 위험과 미해결

1. **체험 표본의 다양성 한계** — 57명으로는 축 조합이 century×profession과 nationality×profession에 집중된다. 실 DB(1,700명+)에서는 문제없을 것.
2. **자동완성 목록 크기** — 실 DB에서 1,000명 목록을 클라이언트에 전송한다 (약 50KB 추정). 7일 캐시이므로 부담은 낮지만, 추후 이름+id만으로 경량화 가능.
3. **9칸 완주 가능 보장** — 각 칸에 정답이 있어도 "같은 인물 금지" 규칙으로 후반 칸에서 막힐 수 있다. 현재는 정답이 매우 많아(인물 풀 크기) 실질 문제 없음. 엄밀한 풀이 보장은 미구현.
4. **날짜 시드 미적용** — 반복 플레이 방식 채택. 하루 한 판이 필요하면 서버 상태 또는 localStorage 날짜 시드 추가 필요.

## 남은 결정 사항

- 쉼터 카드 등록(통합 담당)
- 태그 축 활성화 여부 — 현재 fixture에 tag 조건 없음(실 DB에는 76개 테마)
- 난이도 조절 — 행·열에 같은 축(예: 국적 × 국적) 허용 시 더 어려워짐
- 점수 기록(localStorage best score) 추가 여부

## 검증: 1,000행 교정 후 재시험 (26.07.31)

### 배경

1차 감사에서 `grid.ts`가 `.limit(1000)`으로 조회해 **활성 인물 1,476명 중 476명을 조용히 누락**하던 것을 `selectAllPages`로 교정했다. 교정 후 퍼즐 품질을 측정한다.

### 실측 (실 DB, 200회 생성)

| 지표 | 값 |
|------|-----|
| 인물 수 | 1,476명 (전량) |
| 조건 수 | 103 (국적 30, 직군 15, 세기 20, 태그 38) |
| 생성 실패 | **0/200 (0%)** |
| 정답 1명뿐인 칸 | **507/1,800 (28.2%)** |
| 칸당 정답 수 평균 | 8.7 |
| 칸당 정답 수 중앙값 | 3 |
| p10 | 1 |
| p90 | 19 |
| 최대 | 362 |

### 정답 수 분포

| 범위 | 비율 |
|------|------|
| 1명 (막힌 목) | 28.2% |
| 2명 | 14.2% |
| 3~5명 | 24.9% |
| 6~10명 | 15.7% |
| 11~20명 | 8.4% |
| 21명 이상 | 8.6% |

### 축 조합 빈도

| 조합 | 비율 |
|------|------|
| century × profession | 18.0% |
| century × nationality | 17.0% |
| profession × century | 16.0% |
| nationality × profession | 15.5% |
| profession × nationality | 14.5% |
| nationality × century | 10.0% |
| tag × (기타) | 9.0% |

편향 없음. 6개 주요 조합이 각 10~18%로 분산.

### 교정 내용

1. **조건 최소 기준 인상** (`grid.ts` `buildConditions`):
   - 국적·직군: 3명 → **5명** 이상
   - 세기: 3명 → **10명** 이상 (세기는 범위가 넓어 교차 확률이 낮으므로 기준 상향)
   - 태그: 3명 → **5명** 이상

2. **퍼즐 품질 선택** (`engine.ts` `generatePuzzle`):
   - 최대 300회 시도 중 1명 칸이 4개 이하인 퍼즐을 즉시 채택.
   - 못 찾으면 1명 칸이 가장 적은 후보를 반환 (생성 실패 방지).

### 판단: 28% 단일 정답 칸은 자연적 하한

1,476명을 40개 국적 × 15개 직군 × 20개 세기 × 38개 태그로 나누면, 교차 시 희소 셀이 불가피하다. 이는 원형(Immaculate Grid)에서도 동일한 특성이며, "한 명밖에 모르겠는 칸"이 바로 게임의 도전 요소다.

**28%는 "모든 칸이 막힘"이 아니다**: 9칸 중 평균 2.5칸이 1명뿐이고, 나머지 6.5칸은 여러 정답이 있어 완주 가능성을 보장한다. 전체 칸의 72%가 복수 정답을 가진다.

### 국적·직군 편향 확인

- 국적 상위 5: CN(46), KR(33), IT(31), JP(29), US(25) — 데이터 분포에 비례.
- 직군 상위 5: commander(60), politician(59), humanities_scholar(52), author(45), scientist(34) — 해당 직군의 인원이 많아 교차 빈도가 높은 것은 자연스러움.
- 극단적 편향(한 조건이 50% 이상 차지) 없음.
