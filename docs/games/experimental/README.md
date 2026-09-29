# 실험 게임 공통 규격

쉼터 공개 전 실험 구역(`/lab/games`)에 있는 게임 7종의 공통 경계와 규칙이다. 개별 게임의 규칙·데이터 원천·조회 설계는 게임별 문서가 쥔다. 공개 상태는 폴더 위치가 아니라 이 문서의 「공개 경계」로 판단한다.

## 1. 게임 목록

세상에 이미 있고 검증된 포맷을 가져오되, 재료는 이 서비스만 가진 것(인물의 감상 기록·세력·성향 축)을 쓴다.

| 키 | 이름 | 원형 (실존 게임) | 한 줄 |
|---|---|---|---|
| [`grid`](grid.md) | 교차 격자 | Immaculate Grid, Pokedoku, Cinematrix, FaceGrid | 3×3 격자의 행·열 조건을 동시에 만족하는 인물을 떠올려 채운다 |
| [`groups`](groups.md) | 넷씩 넷 | NYT Connections, Conexo, Categories | 인물 16명을 공통점 4개 묶음으로 가른다 |
| [`proximity`](proximity.md) | 근접도 | Metazooa, Globle, Contexto | 인물을 추측하면 오늘의 인물과 얼마나 가까운지 알려 준다 |
| [`travel`](travel.md) | 경로 잇기 | Travle, The Wiki Game, Cinema Circuit, GlobeHoppr | 두 인물을 정해진 이동 횟수 안에 잇는다 |
| [`moreless`](moreless.md) | 어느 쪽 | More or Less, Juxtastat, Steamry, TimeSwipe | 둘 중 큰 쪽을 고르고 연속 기록을 쌓는다 |
| [`topfive`](topfive.md) | 상위 다섯 | Factle, Top 5, Daily Tens | 오늘의 기준에 맞는 상위 5개를 순서까지 맞힌다 |
| [`redact`](redact.md) | 가림 해제 | Redactle, Pedantle, Peekpedia | 가려진 인물 소개에서 단어를 캐내며 정체를 밝힌다 |

## 2. 파일 배치

`<key>`는 위 표의 키다.

| 산출물 | 경로 |
|---|---|
| 개별 규격 | `docs/games/experimental/<key>.md` |
| 화면·규칙 | `sw/web/src/components/features/game/<key>/` |
| 서버 조회 | `sw/web/src/actions/game/<key>.ts` (또는 `<key>/` 폴더) |
| 체험용 표본 | `sw/web/src/components/features/game/<key>/fixture.ts` |
| 단독 시험 화면 | `sw/web/src/app/[locale]/lab/games/<key>/page.tsx`, 목록은 `/lab/games` |
| 문구 | `sw/web/messages/{ko,en}/game-<key>.json`, 최상위 키 `game<Key>`(예: `gameGrid`) |

공용 부품 `components/features/game/shared/`는 고치지 않고 그대로 쓴다.

## 3. 공개 경계

- **공개 쉼터에는 등록하지 않는다.** `/lab`은 `app/robots.ts`에서 차단된 실험 구역이다. 공개 화면이 그곳으로 링크를 내보내면 경계가 무너진다. 어느 게임을 공개할지 정해지면 `RestGameGrid`로 승격하며, 그때는 링크가 아니라 기존 쉼터 게임처럼 쉼터 안에서 전체화면으로 열리게 붙인다.
- 단독 시험 화면(`/ko/lab/games/<key>`)은 로그인·권한 없이 열리고, 그 화면 하나로 시작부터 결과까지 완주할 수 있어야 한다. 전체화면 진입은 되게 한다.
- 실험 라우트는 `force-dynamic`을 선언한다. 선언하지 않으면 Next가 정적 생성을 시도했다 실패하며 빌드 로그에 `Dynamic server usage` 잡음을 남긴다.
- 문구 네임스페이스는 `i18n/request.ts`에 전역 등록돼 전 화면 응답에 실린다(7종 합계 gzip 약 4KB). **게임을 폐기하면 네임스페이스도 함께 지운다.**

## 4. 데이터 — 실제 조회와 체험 표본

1. **실제 조회** — 서버 액션이 운영 DB를 읽는다.
2. **체험 표본** — DB 연결 환경값이 없을 때만 쓴다. 화면 상단에 *표본 데이터로 돌아가는 체험 모드*를 눈에 보이게 띄운다.

- **조용한 폴백 금지.** 표본으로 돌아간 사실과 폴백 이유를 화면과 로그에 남긴다. 조회 실패를 빈 목록으로 숨기지 않는다.
- **사실을 날조하지 않는다.** 표본의 인물 이름·생몰년·직군·국적은 DB 값과 일치해야 한다(표본 전수를 DB와 대조해 맞춘 적이 있다). 확인 못 하는 값(성향 점수 등)은 지어내지 말고 그 축을 쓰지 않는 설계로 바꾼다. 명언·발언은 근거가 없으면 넣지 않는다. 표본 전용 추정치(topfive의 순위값 등)는 체험 모드 배너로 고지한다.
- 표본 규모는 한 판이 성립하는 최소(인물 40~80명)로 한다. 재료로 `sw/remotion/public/episodes/<인물>/`의 실제 데이터를 써도 된다.
- `unstable_cache` 경계에는 plain object만 넘긴다. `Map`은 빈 객체로 직렬화된다.

## 5. 따라야 할 기존 규격

- **조회**: 전수 select는 `selectAllPages`(2차 정렬키를 `id`·`celeb_id`로 고정), id 목록은 `selectInChunks`.
- **캐시**: `unstable_cache` + `CACHE_TAGS` + `STATIC_REVALIDATE`. 목록 조회에 본문·긴 텍스트를 싣지 않는다.
- **실패**: 조회 오류는 드러낸다. `?? []`로 정상 화면처럼 위장하지 않는다.
- **모바일·접근성**: 320px 폭에서 완주 가능, 선택지는 2열, 정오답을 색만으로 구분하지 않는다(아이콘·문장 병기), 자산 로딩 전에는 타이머·입력을 멈춘다.
- **상호작용**: 조작 요소에 지연 없는 즉각 반응을 하나 이상 둔다. `transition-all` 금지([`platform-02-code-rules.md`](../../project/platform/platform-02-code-rules.md)).
- **문구**: 한국어·영어 두 파일에 같은 키를 넣는다. 화면에 한국어를 하드코딩하지 않는다.
- **실존 인물**: 악역·찬탈자로 만들지 않는다. 문장·초상을 지어내지 않는다.

## 6. 게임을 고쳤을 때 확인할 것

1. 바꾼 범위의 ESLint와 `npx tsc --noEmit -p sw/web/tsconfig.json`에서 새 오류가 없다(기존 오류와 구분해 보고한다).
2. 규칙 엔진을 실제로 여러 판 돌려 빈 문제·중복 정답·후보 부족·무한 대기가 없다.
3. 한국어·영어 문구 키 수가 같다.
4. `/ko/lab/games/<key>`에서 한 판이 끝까지 돈다.
5. 형식 통과만 보지 말고 실제로 재미있고 손이 가는지 판단해 보고한다.
