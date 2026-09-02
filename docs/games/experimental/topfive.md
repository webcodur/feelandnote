# 상위 다섯 (Top Five) 발주서

> **최종 실측 체크: 26.07.31** — 부분 대조: `sw/web/src/actions/game/grid.ts`, `sw/web/src/components/features/game/grid/`, `sw/web/src/components/features/game/groups/`, `sw/web/src/components/shared/GameFullScreen.tsx`, `docs/project/data/db-core.md`, `docs/project/celeb/celeb-4-influence.md`, `sw/web/messages/{ko,en}/game-topfive.json`, `sw/web/src/lib/cache.ts`, `docs/games/experimental/README.md`. DB 실측 없음(환경값 부재).

## 무엇을 하는 게임인가

"오늘의 기준"이 주어진다 — 예를 들어 "과학자 영향력 순위" 또는 "기업가 영향력 순위". 12개 후보가 화면에 뜨고, 그중 상위 5개를 골라 1위부터 5위까지 순서를 맞춘다.

보기 없는 자유 입력이 아니라, 주어진 후보 목록에서 고르는 방식이다. 표기 차이로 억울하게 틀릴 일이 없다.

5칸을 다 채우고 제출하면 한 판이 끝나고, 정확도와 점수를 보여준다.

## 기존 게임과의 축 차이

| 게임 | 핵심 능력 | 입력 |
|------|-----------|------|
| 교차 격자 | 조건 교차 기억 회상 | 자유 입력 (자동완성) |
| 넷씩 넷 | 분류·소거 | 4명 선택 |
| 근접도 | 추론·축소 | 자동완성 |
| **상위 다섯** | **순서 감각 + 상대 비교** | **목록에서 선택 + 순서 배치** |

차이점: 맞히는 것뿐 아니라 "순서"가 핵심이다. 1위와 5위를 뒤바꾸면 절반만 인정된다.

## 한 판 완주 흐름

1. 로비 — 규칙 설명, 시작 버튼
2. 카테고리 제시 ("오늘의 기준: 과학자 영향력 순위")
3. 후보 12개 표시 + 1~5위 빈 슬롯 5개
4. 후보를 눌러 현재 활성 슬롯에 배치
5. 화살표로 순서 조정, 이름 터치로 슬롯에서 제거
6. 5칸 모두 채우면 제출 버튼 활성
7. 제출 → 결과 화면 (각 슬롯별 판정 + 실제 순위 공개)
8. 다시하기 / 처음으로

## 출제·채점 규칙

### 출제
- **카테고리**: 직군별 영향력 순위 (`celeb_influence.total_score` 기준, 직군별 상위)
- **후보 수**: 12개 (정답 5개 + 오답 7개). 모두 해당 직군 소속.
- **결정론적 선택**: 날짜 시드(`YYYY-MM-DD` → mulberry32)로 퍼즐·후보 셔플 모두 결정.
- **하루 한 판**: 같은 날 같은 유저가 다시 시작하면 같은 문제가 나온다.

### 채점

| 판정 | 점수 |
|------|------|
| 상위 5에 포함 + 정확한 순위 | **20점** |
| 상위 5에 포함 + 순위 틀림 | **10점** |
| 상위 5에 미포함 | **0점** |

- **만점**: 100점 (5 × 20)
- 부분 점수가 있어서, 상위 5를 맞히기만 해도 50점은 받을 수 있다.

### 왜 후보 목록 선택인가 (표기 문제 해소)

자유 입력은 표기 차이(부제, 번역 제목, 띄어쓰기)로 정답을 놓친다. 이 서비스의 인물 이름은 `nickname`/`nickname_en` 두 개뿐이라 정규화가 간단하지만, 유저가 "아인쉬타인"으로 치면 "아인슈타인"을 못 찾는 경험이 생긴다. **후보 목록에서 고르면 표기 문제가 원천 봉쇄된다.** 대신 후보 수를 12개로 제한해 "고를 만한 감"이 필요하게 만든다.

## 데이터 원천 표

| 테이블 | 컬럼 | 용도 |
|--------|------|------|
| `celeb_influence` | celeb_id, total_score | 영향력 순위 결정 |
| `celebs` | id, nickname, nickname_en, profession | 인물 이름·직군 |

## 조회 설계

1. **`getTopFiveData()` 서버 액션** (캐시 7일, CELEBS 태그)
   - `celeb_influence` JOIN `celebs`: `total_score DESC`, limit 2000
   - 직군별로 분류 → 12명 이상인 직군만 퍼즐로 사용
   - 각 직군의 상위 12명을 후보로 (상위 5 = 정답, 6~12 = 오답)
2. 환경값 부재 시 → fixture 데이터 반환 + `isFixture: true`
3. **스냅샷 보장**: `unstable_cache` + 7일 revalidate. 한 판 중간에 순위가 바뀌지 않는다.

### 체험 모드

- 현행 코드의 `process.env.NEXT_PUBLIC_DB_API_URL` 부재 시 fixture로 폴백
- 화면 상단에 "⚠ 체험 모드 — 표본 데이터로 동작 중" 배너 고정
- 조용한 폴백 없음 (배너를 안 보이게 감추지 않음)

## 파일 목록

| 경로 | 역할 |
|------|------|
| `sw/web/src/components/features/game/topfive/types.ts` | 타입·상수 (배점, 슬롯 수, 후보 수) |
| `sw/web/src/components/features/game/topfive/engine.ts` | 규칙 엔진 (퍼즐 선택, 셔플, 채점, 유효성 검증) |
| `sw/web/src/components/features/game/topfive/fixture.ts` | 체험 표본 (6종 퍼즐, 한·영, 실존 인물) |
| `sw/web/src/components/features/game/topfive/TopFiveGame.tsx` | 메인 게임 컴포넌트 |
| `sw/web/src/components/features/game/topfive/TopFiveLobby.tsx` | 로비 화면 |
| `sw/web/src/components/features/game/topfive/TopFiveBoard.tsx` | 배치 보드 (후보 선택 + 슬롯 배치) |
| `sw/web/src/components/features/game/topfive/TopFiveResult.tsx` | 결과 화면 (판정 + 실제 순위 공개) |
| `sw/web/src/actions/game/topfive.ts` | 서버 조회 + 캐시 |
| `sw/web/src/app/[locale]/lab/games/topfive/page.tsx` | 단독 시험 화면 |
| `sw/web/messages/ko/game-topfive.json` | 한국어 문구 (38키) |
| `sw/web/messages/en/game-topfive.json` | 영어 문구 (38키) |

## 공정성·오류 처리

- **출제 보장**: 풀에 퍼즐이 없으면 시작 불가 (버튼 비활성 + 안내 문구).
- **유효성 검증**: `validatePuzzle`이 정답 5명·순위 1~5·중복 ID 없음을 사전 확인.
- **결정론적**: 같은 날 = 같은 퍼즐 = 같은 셔플 순서. 새로고침해도 동일.
- **실패 노출**: 조회 에러 시 throw → catch → fixture 폴백 + 화면 배너. `?? []`로 빈 화면 위장 안 함.

## 모바일·접근성

- 320px 폭 완주 가능: 후보 목록 2열 그리드, 슬롯은 세로 스택
- 정오답을 색만으로 구분하지 않음: ✓(정확) / →(순위 다름) / ✗(미포함) 아이콘+텍스트 병기
- 모든 조작 요소에 `aria-label` 제공
- 슬롯 선택·후보 배치·순서 변경 모두 터치 한 번으로 가능 (드래그 불필요)
- hover 시 즉각 반응 (border·bg 변경, `transition-all` 미사용)

## 문구 키

최상위 키: `gameTopfive` (계약서 규정, 변경 금지)

총 38개 리프 키, 한·영 동수. 주요 키:
- `title`, `intro`, `mobileRuleSummary`, `startGame`, `fixtureMode`
- `categoryPrompt`, `instruction`, `slotAriaLabel`, `candidatesLabel`
- `submit`, `fillAllSlots`, `resultPerfect`, `resultSummary`
- `exact`, `inTop5`, `notInTop5`, `correctAnswer`
- `scoreLegendExact`, `scoreLegendPartial`, `scoreLegendWrong`
- `rules.rankTitle`, `rules.rankBody`, `rules.pickTitle`, `rules.pickBody`, `rules.scoreTitle`, `rules.scoreBody`

## 위험과 미해결

| 위험 | 심각도 | 대책 |
|------|--------|------|
| DB 순위가 갱신되면 정답이 바뀜 | 중 | 7일 캐시로 한 판 중 순위 변동 방지. 날짜 시드로 같은 날 같은 문제 보장 |
| 직군별 인물 12명 미만이면 퍼즐 생성 불가 | 하 | 해당 직군을 풀에서 제외. 전체 풀이 0이면 시작 불가 |
| 체험 표본의 순위가 실제 DB와 다를 수 있음 | 하 | 표본은 데모 목적이며 배너로 명시. 사실(인물 이름·직군)은 정확 |
| 5개 중 5개를 맞히되 순서를 모두 틀리면 50점 — 너무 관대한가 | 하 | Factle 원형과 동일한 배점 구조. "상위 5를 아는 것" 자체가 가치 |

## 남은 결정 사항

1. **세력 태그 기반 퍼즐** 추가 여부: "르네상스 마에스트로 중 영향력 높은 5명" 등. 현재는 직군별만 구현. 태그별은 DB 연결 후 추가 가능 (fixture에 추가하면 됨).
2. **하루 한 판 강제 여부**: 현재 "다시 하기"를 누르면 같은 퍼즐이 또 나온다 (날짜 시드). localStorage에 완료 표시를 저장해 재도전 자체를 막을지는 미정.
3. **리더보드/공유**: 결과를 이모지 그리드로 복사하는 기능 (Wordle 스타일). 현재 미구현.

## 검증: 7일 재등장 해결 (26.07.31)

### 문제

1차 스트레스 시험에서 7일 내 같은 퍼즐 재등장률이 **50.4%**(풀 11, BEFORE)였다. 원인: `Math.floor(random() * pool.length)`로 퍼즐을 뽑아 비둘기집 원리상 충돌이 빈번했다.

### 교정

1. **퍼즐 선택 알고리즘 교체** (`engine.ts`의 `buildPuzzleForToday`):
   - `random * length` → **순환 인덱스 + 사이클 셔플 + 경계 회피**.
   - epoch day를 풀 크기 N으로 나눈 나머지가 사이클 내 위치.
   - 각 사이클은 고유 순열을 갖되, 인접 사이클 경계에서 이전 마지막 7개를 다음 처음 7개에서 배제.
   - **N ≥ 14이면 7일 내 재등장 수학적 0%** (N-7 ≥ 7이므로 경계 회피 항상 성공).

2. **태그 기반 퍼즐 추가** (`topfive.ts`의 `fetchTopFivePool`):
   - `celeb_tags` + `celeb_tag_assignments`에서 영향력 보유 5명 이상인 태그를 퍼즐로 생성.
   - 후보 수: 해당 태그의 영향력 보유 인원 (5~12명). 정답 5명 + 나머지 오답.
   - `categoryType: "faction_influence"` 타입 사용.

3. **`validatePuzzle` 완화**: 후보 수 최소 기준을 12 → 5로 (태그 퍼즐은 후보가 5~11명일 수 있음).

### 실측 결과 (실 DB, 26.07.31)

| 지표 | BEFORE | AFTER |
|------|--------|-------|
| 풀 크기 | 11 (직군만) | **48** (직군 11 + 태그 37) |
| 7일 내 재등장 (400일) | 198/393 (**50.4%**) | **0/393 (0.0%)** |
| 결정례 | ✓ (같은 날 = 같은 퍼즐) | ✓ |
| 분포 균등성 | — | min=8, max=9 (이상 8.3) |
| 사용된 퍼즐 | — | 48/48 (100%) |

### 조건

- 같은 날짜 = 같은 퍼즐 (결정례 유지) ✓
- 매주 같은 요일에 같은 기준이 안 나옴 (사이클 셔플로 해소) ✓
- 날짜 키: `@/lib/game/date-seed.ts` KST 기준 그대로 사용 ✓
- 태그 자격: 영향력 점수 보유 5명 이상만 (정답 산정 흔들림 없음) ✓

### 남은 리스크

- 태그 멤버가 줄어 5명 미만이 되면 해당 퍼즐이 풀에서 자연 탈락 (풀 크기 감소). 14 미만으로 떨어지면 재등장 가능. 현재 48이라 여유 충분.
- 태그 퍼즐 중 후보가 5명인 경우: 오답이 0명이므로 5명 전부가 정답. 순서만 맞히면 된다 (난이도 하향). 실측 37개 태그 중 5명짜리는 소수.
