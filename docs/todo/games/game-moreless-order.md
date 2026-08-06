# 어느 쪽 (More or Less) 발주서

> **최종 실측 체크: 26.07.31** — 부분 대조: `celeb_influence` 스키마(`types/supabase.ts` 360–460행), `selectAllPages` 경로(`@feelandnote/shared/lib/paginate`), `CACHE_TAGS`·`LISTING_DEFAULT_TIERS` 정의, `createStaticClient` 구현, `ProximityGame.tsx`·`proximity.ts` 구조 참조, `i18n/request.ts` 네임스페이스 등록 확인, `messages/{ko,en}/game-moreless.json` 자리 확인, `.env` 부재 실측. DB 실측 없음(환경값 부재).

---

## 무엇을 하는 게임인가

두 인물이 나란히 나온다. 누구의 영향력 점수가 더 높은지 고른다. 맞히면 다음 문제가 바로 온다. 틀리면 끝. 연속으로 맞힌 횟수가 점수다.

점수는 선택 전에는 가려져 있고, 고른 뒤에만 양쪽 숫자가 함께 드러난다. 아는 만큼 이기고, 모르면 직감에 기대는 구조다.

---

## 기존 게임과의 축 차이

| 게임 | 재미 축 | 입력 방식 |
|------|---------|-----------|
| 시대의 초상 | 얼굴 인식 + 속도 | 4지선다 |
| 미궁 | 힌트 종합 + 소거 | 다지선다 |
| 교차 격자 | 조건 교차 기억 회상 | 자유 입력 |
| 넷씩 넷 | 분류 추론 + 함정 | 복수 선택 |
| 근접도 | 축별 추론 + 좁히기 | 검색 선택 |
| **어느 쪽** | **상대 비교 직감** | **이진 선택 (탭 한 번)** |

가장 단순한 입력(둘 중 하나), 가장 빠른 리듬. 판단 → 결과 → 다음 문제까지 1.2초.

---

## 한 판 완주 흐름

1. **로비** — 규칙 설명, 최고 기록 표시, 시작 버튼
2. **플레이** — 두 인물 카드가 나란히 표시. 점수는 "?" 로 가림. 한쪽 터치
3. **공개** — 양쪽 점수가 동시에 드러남. 정답이면 초록 테두리 + ✓, 오답이면 빨간 테두리 + ✗
4. 정답이면 1.2초 후 다음 쌍 자동 등장. 오답이면 1.6초 후 결과 화면
5. **결과** — 최종 연속 정답 수, 신기록 여부, 마지막 문제 해설, 다시하기/로비 버튼

---

## 출제·채점 규칙

| 항목 | 수치 |
|------|------|
| 비교 기준 | `celeb_influence.total_score` (0~100, 7축 합산 영향력) |
| 최소 격차 | **5점** — 이보다 작은 쌍은 출제하지 않는다 (찍기 방지) |
| 쿨다운 | 같은 인물이 재등장하려면 최소 **4라운드** 간격 |
| 후보 소진 | 쿨다운 풀 부족 시 쿨다운을 무시하고라도 뽑는다. 50명 풀에서 30라운드 연속 가능 확인 |
| 채점 | 고른 쪽의 점수가 높으면 정답, 낮으면 오답 |
| 판 수 제한 | 없음 (무한 연속). 틀릴 때만 끝남 |

---

## 데이터 원천 표

| 테이블 | 컬럼 | 용도 |
|--------|------|------|
| `celeb_influence` | celeb_id, total_score | 비교 기준값 |
| `profiles` | id, nickname, nickname_en, profession, nationality, birth_date, death_date, avatar_url, status, celeb_tier | 인물 표시 정보 |

---

## 조회 설계

1. **`getMorelessCelebs()` 서버 액션** (캐시 7일, CELEBS 태그)
   - `celeb_influence` → `profiles` inner join
   - `profiles.status = 'active'`, `celeb_tier in ('full', 'light')`
   - `total_score >= 10` (너무 낮으면 비교 의미 없음)
   - `total_score IS NOT NULL`
   - 정렬: `celeb_id asc` (2차 정렬키로 페이지 경계 고정)
   - `selectAllPages` 사용 (1,000행 상한 대응)
2. 환경값 부재 시 catch → fixture 50명 반환 + `isFixtureMode: true`
3. 클라이언트에서 쌍을 뽑으며 서버 왕복 없음

---

## 파일 목록

| 경로 | 역할 |
|------|------|
| `sw/web/src/components/features/game/moreless/types.ts` | 타입·상수 |
| `sw/web/src/components/features/game/moreless/engine.ts` | 규칙 엔진 (쌍 추출, 채점, 쿨다운) |
| `sw/web/src/components/features/game/moreless/fixture.ts` | 체험 표본 (실제 인물 50명) |
| `sw/web/src/components/features/game/moreless/MorelessGame.tsx` | 메인 게임 컴포넌트 |
| `sw/web/src/components/features/game/moreless/MorelessLobby.tsx` | 로비 화면 |
| `sw/web/src/components/features/game/moreless/MorelessBoard.tsx` | 비교 보드 (두 카드 + VS) |
| `sw/web/src/components/features/game/moreless/MorelessResult.tsx` | 결과 화면 |
| `sw/web/src/actions/game/moreless.ts` | 서버 조회 + 캐시 |
| `sw/web/src/app/[locale]/lab/games/moreless/page.tsx` | 단독 시험 화면 |
| `sw/web/messages/ko/game-moreless.json` | 한국어 문구 (26키) |
| `sw/web/messages/en/game-moreless.json` | 영어 문구 (26키) |

---

## 공정성·오류 처리

- **최소 격차 보장**: 5점 미만 차이 쌍은 절대 출제하지 않는다. 50명 표본 전원이 유효 파트너를 가짐(엔진 테스트 실증).
- **쿨다운**: 4라운드 이내 재등장 방지. 풀 소진 시에만 완화.
- **조회 실패**: try/catch → fixture 폴백. 화면 상단에 "체험 모드" 배너 상시 표시.
- **조용한 폴백 금지**: 배너가 항상 보인다.
- **값 은닉**: 선택 전에는 양쪽 점수를 모두 "?" 표시. 선택 후 동시 공개.
- **정답/오답 구분**: 색상(초록/빨강) + 아이콘(✓/✗) 이중 표시. 색만으로 구분하지 않음.

---

## 모바일·접근성

- 320px 폭: 카드가 세로 배치로 전환 (`flex-col` 기본, `sm:flex-row` 데스크톱).
- 터치 영역: 카드 전체가 버튼 (`min-h` 충분히 확보).
- 색 + 아이콘 이중 표시 (색각 이상 대응).
- 각 카드에 `aria-label` 부여 ("OOO 선택").
- 점수 공개 시 fadeInUp 애니메이션 (600ms).
- 즉각 반응: 호버 시 테두리 변화 즉시 (`transition-colors`, `transition-all` 미사용).

---

## 문구 키

최상위: `gameMoreless` (변경 금지)

| 키 | 설명 |
|----|------|
| `title` | 게임 이름 |
| `intro` | 규칙 소개문 |
| `mobileRule` | 모바일 한줄 규칙 |
| `startGame` | 시작 버튼 |
| `fixtureNotice` | 체험 모드 배너 |
| `playing` | 브레드크럼 "진행 중" |
| `resultBreadcrumb` | 브레드크럼 "결과" |
| `streak` | 연속 정답 라벨 |
| `question` | 비교 질문 |
| `hint` | 점수 설명 |
| `influenceScore` | 점수 라벨 |
| `cardAriaLabel` | 카드 접근성 |
| `resultTitle` | 결과 제목 |
| `finalStreak` | 최종 연속 정답 |
| `newRecord` | 신기록 배지 |
| `bestRecord` | 최고 기록 표시 |
| `lastRound` | 마지막 문제 제목 |
| `points` | 점 단위 |
| `replay` | 다시하기 |
| `toLobby` | 처음으로 |
| `rules.compareTitle` / `compareBody` | 규칙 카드 1 |
| `rules.streakTitle` / `streakBody` | 규칙 카드 2 |
| `rules.recordTitle` / `recordBody` | 규칙 카드 3 |

---

## 위험과 미해결

1. **체험 표본의 점수가 추정값** — DB 실측값이 아니라 역사적 상식에 기반해 배정한 값이다. 실 DB에서는 정확한 `total_score`를 사용하므로 문제없음. 체험 모드 배너로 고지.
2. **쌍 무작위성** — 순수 랜덤이라 한 세션 안에서 비슷한 난이도가 반복될 수 있다. 난이도 점진 상승(연속 정답이 쌓이면 격차를 줄이기)은 미구현이나, 풀 크기(1,500+명)에서는 자연스럽게 어려운 쌍이 섞인다.
3. **동점 방지** — MIN_SCORE_GAP=5로 동점 쌍을 원천 차단한다. 실 DB에서 total_score 동점이 많은지는 미확인이나, 정수 0~100 범위에서 1,500명이면 밀도가 높을 수 있다. 격차 조건이 이를 커버한다.
4. **점수 공개 애니메이션** — CSS `@keyframes fadeInUp`을 인라인 style로 참조하는데, 글로벌 CSS에 정의가 없으면 정적 표시된다. TailwindCSS 4.1 `@theme`에서 지원 여부 확인 필요.

---

## 남은 결정 사항

- 쉼터 카드 등록(통합 담당)
- 난이도 점진 상승 로직 — 연속 정답에 비례해 격차를 줄일지 (현재: 항상 격차 5 이상, 균일 랜덤)
- 일일 시드 여부 — 현재 무제한 반복. "오늘의 도전" 모드를 추가할 수 있음
- 최고 기록 서버 저장 (현재 localStorage만)
- 아바타 이미지 표시 — 현재 이름만. avatar_url 활용 시 카드가 더 풍성해짐
