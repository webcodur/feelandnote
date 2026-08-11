# 근접도 (Proximity) — 발주서

> **최종 실측 체크: 26.07.31** — 부분 대조: `getTrackerRound.ts`(TrackerPersona 16축), `getSimilarByCelebId.ts`(calcDistance·distanceToMatchPercent), `lib/persona/constants.ts`(STAT_KEYS·TENDENCY_KEYS), `lib/persona/types.ts`(PersonaStats·PersonaProfile), `lib/persona/utils.ts`(calcDistance 시그니처), `getPortraitFigures.ts`(서버 조회 패턴), `portrait/` 전체(게임 구조 패턴), `i18n/request.ts`(네임스페이스 등록 확인), `messages/ko/core.json`(shared.game 키 확인). DB 실측 없음.

---

## 무엇을 하는 게임인가

오늘의 숨은 인물이 있다. 아무 인물이나 추측하면, 정답과 얼마나 가까운지를 **온도**(0~100)로 돌려준다. 온도가 높을수록 뜨겁고, 100이면 정답이다.

온도만으로는 막막하기 때문에, 매 추측마다 **4개 축**(시대·지역·직군·성향)이 각각 가까운지 먼지를 색깔 배지로 보여준다. "같은 시대, 다른 지역, 같은 직군" 같은 조합을 읽으며 범위를 좁혀가는 추론 게임이다. 지식 시험이 아니다.

---

## 기존 게임과의 축 차이

| 게임 | 핵심 축 | 차이 |
|------|---------|------|
| 미궁(tracker) | 콘텐츠 감상·퀴즈 | 콘텐츠 단서를 하나씩 주고 4지선다 |
| 시대의 초상(portrait) | 얼굴 인식·속도 | 사진을 보고 누구인지 고름 |
| **근접도** | **벡터 거리·축별 비교** | 추측 → 거리 피드백 → 좁혀감. 단서를 유저가 스스로 해석 |

다른 게임은 출제자가 단서를 주는데, 근접도는 유저의 추측이 곧 단서 생성기다.

---

## 한 판 완주 흐름

1. **로비** — 규칙 안내, 시작 버튼.
2. **플레이** — 자동완성 검색창에 인물 이름 입력 → 선택 → 온도+축 힌트 카드 표시. 이력이 아래로 쌓인다.
3. **종료 조건** — 정답(온도 100), 최대 15회 소진, 또는 포기 버튼.
4. **결과** — 정답 인물 공개, 추측 횟수, 성공/포기 표시, 다시하기/로비 버튼.

---

## 출제·채점 규칙

| 항목 | 값 |
|------|-----|
| 최대 추측 횟수 | 15 |
| 정답 선정 | 날짜 기반 시드(UTC, `getDailySeed`) → `celebs[seed % length]` |
| 온도 범위 | 0~100 (정수) |
| 온도 계산 (배포) | `calcDistance`(유클리드 16차원) → `distanceToMatchPercent`(최대 거리 400 기준 반전) |
| 온도 계산 (체험) | 직군 일치 +30, 나라 일치 +30 / 문화권 +15, 시대 차이에 따라 0~+40 |
| 축 힌트 | era(30년 이내 close / 100년 medium / 그 이상 far), region(같은 나라 close / 같은 문화권 medium / 아님 far), profession(같으면 close / 아님 far), persona(온도 75+ close / 45+ medium / 아래 far) |
| 포기 | 언제든 가능. 결과 화면에 "포기"로 표시 |
| 최고 기록 | localStorage에 최소 추측 수 저장 |

---

## 데이터 원천 표

| 테이블 | 컬럼 | 용도 |
|--------|------|------|
| `celeb_persona` | `celeb_id`, 16개 flat smallint 컬럼(`command`, `martial`, `intellect`, `charm`, `temperance`, `diligence`, `reflection`, `courage`, `loyalty`, `benevolence`, `fairness`, `humility`, `pessimism_optimism`, `conservative_progressive`, `individual_social`, `cautious_bold`) | 성향 벡터 |
| `celebs` (inner join) | `id`, `nickname`, `nickname_en`, `profession`, `nationality`, `birth_date`, `death_date`, `avatar_url`, `publication_status`, `celeb_tier` | 인물 메타 |

---

## 조회 설계

- **엔드포인트**: `actions/game/proximity.ts` — `getProximityCelebs()` (full stats), `getProximityCelebList()` (자동완성용)
- **페이징**: `selectAllPages` + `celeb_id` 정렬 (PostgREST 1,000행 상한 대응)
- **캐시**: `unstable_cache` + `CACHE_TAGS.PERSONA` + `STATIC_REVALIDATE`(7일)
- **필터**: `publication_status = 'active'`, `celeb_tier in ('full', 'light')`
- **거리 재사용**: `lib/persona/utils.ts`의 `calcDistance` + `distanceToMatchPercent` — 새로 짜지 않음

---

## 파일 목록

| 경로 | 역할 |
|------|------|
| `sw/web/src/actions/game/proximity.ts` | 서버 조회 |
| `sw/web/src/components/features/game/proximity/types.ts` | 타입 정의 |
| `sw/web/src/components/features/game/proximity/engine.ts` | 거리 계산·힌트 생성·시드 로직 |
| `sw/web/src/components/features/game/proximity/fixture.ts` | 체험 표본 50명 + 대체 거리 계산 |
| `sw/web/src/components/features/game/proximity/ProximityGame.tsx` | 메인 게임 오케스트레이터 |
| `sw/web/src/components/features/game/proximity/ProximityLobby.tsx` | 로비 화면 |
| `sw/web/src/components/features/game/proximity/ProximityGuessInput.tsx` | 자동완성 입력 |
| `sw/web/src/components/features/game/proximity/ProximityGuessList.tsx` | 추측 이력 + 온도 바 + 축 배지 |
| `sw/web/src/components/features/game/proximity/ProximityResult.tsx` | 결과 화면 |
| `sw/web/src/app/[locale]/lab/games/proximity/page.tsx` | 단독 시험 화면 |
| `sw/web/messages/ko/game-proximity.json` | 한국어 문구 (30키) |
| `sw/web/messages/en/game-proximity.json` | 영어 문구 (30키) |
| `docs/games/experimental/proximity.md` | 이 규격 문서 |

---

## 공정성·오류 처리

- **일일 정답 고정**: UTC 날짜 기반 시드로 하루 동안 같은 정답. 새로고침해도 바뀌지 않음.
- **중복 추측 방지**: 이미 추측한 인물은 `guessedIds`로 걸러 재선택 불가.
- **DB 실패 시**: 에러를 던지고 fixture 모드로 전환. 화면 상단에 노란 배너로 "체험 모드" 명시. **조용한 폴백 금지**.
- **체험 모드 거리 차이**: 성향 점수를 지어내지 않으므로, 체험 모드에서는 시대·지역·직군 3축만으로 온도를 매긴다. 이 사실을 화면과 여기에 밝힌다.
- **온도 0 문제**: 체험 모드에서 세 축이 모두 다르면 온도 0이 나올 수 있다. 이는 정상 — "전혀 안 맞는다"는 정보 자체가 유용하다.

---

## 모바일·접근성

- 320px 폭에서 완주 가능. 온도 바+축 배지가 2행으로 줄바꿈.
- 자동완성 목록: 8항목 제한, 오버플로 스크롤.
- 정오답 구분: 초록(정답 행 전체 테두리+배경) + ✓ 아이콘 + "정답!" 텍스트. 색만으로 구분하지 않음.
- 축 힌트: 초록/노랑/빨강 색 + 아이콘(시계·지도핀·서류가방·불꽃) + 텍스트. 3중 구분.
- 입력: `role="combobox"`, `aria-expanded`, `aria-autocomplete="list"`, `aria-selected`.
- 키보드: 화살표로 후보 탐색, Enter로 선택, Esc로 닫기.

---

## 문구 키

최상위 키: `gameProximity` (변경 금지)

| 키 | 한국어 | 영어 |
|-----|--------|------|
| `title` | 근접도 | Proximity |
| `intro` | 오늘의 인물이 숨어 있습니다… | A hidden figure awaits… |
| `mobileRule` | 인물을 검색해 추측하세요… | Search and guess… |
| `startGame` | 시작하기 | Start Game |
| `playing` | 추측 중 | Guessing |
| `searchPlaceholder` | 인물 이름을 입력하세요 | Type a name to guess |
| `guessCounter` | {current} / {max}회 | {current} / {max} guesses |
| `giveUp` | 포기하기 | Give Up |
| `correct` | 정답 | Correct |
| `fixtureNotice` | 체험 모드: 표본 데이터로… | Demo mode: Running on sample data… |
| `bestRecord` | 최고 기록: {count}회만에 정답 | Best: solved in {count} guesses |
| `axis.*` (4) | 시대/지역/직군/성향 | Era/Region/Profession/Persona |
| `rules.*` (6) | 규칙 카드 3종(제목+본문) | Rule cards |
| `result.*` (8) | 결과 화면 문구 | Result screen |

합계: 30키 × 2언어 = 60건 (일치 확인 완료)

---

## 위험과 미해결

| 항목 | 상태 | 비고 |
|------|------|------|
| 체험 모드 온도가 배포와 다름 | **설계상 의도** | 16축 vs 3축. 배포 때는 더 세밀한 온도가 나온다 |
| 일일 정답이 celebs 배열 순서에 의존 | **수용** | DB 조회가 `celeb_id` 정렬이므로 안정적. fixture는 고정 배열 |
| 자동완성 전체 목록을 클라이언트에 실음 | **수용** | 1,577명 × ~100B ≈ 150KB. 단일 키 캐시 |
| DB 실패 감지가 try/catch 단일 지점 | **수용** | 서버 컴포넌트에서 catch하고 fixture 전환 |
| 체험 모드에서 avatar_url이 null | **수용** | 이니셜 원형으로 대체 표시 |

---

## 남은 결정 사항

1. **쉼터 등록**: 통합 담당이 `RestGameGrid`에 카드를 추가해야 실서비스에 노출된다. 이 게임은 단독 시험 화면(`/ko/lab/games/proximity`)으로만 접근 가능.
2. **일일 시드 공유 여부**: 현재는 브라우저별 독립. 서버에서 정답을 고정하려면 추가 로직이 필요하지만, 이번 범위에서는 클라이언트 시드로 충분하다.
3. **난이도 조절**: 현재 15회 고정. 추후 쉬움(20회)/보통(15회)/어려움(10회) 분기 가능.
