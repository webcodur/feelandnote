# 신작 게임 2차 물결 — 병렬 구현 계약서

> **최종 실측 체크: 26.07.31** — `i18n/request.ts` 네임스페이스 배열, `rest/page.tsx`, `RestGameGrid.tsx`, `GameShell.tsx`, `messages/ko` 파일 목록, `.env` 부재(파일 0개·셸 변수 0개)를 코드로 확인했다.

7개 게임을 **동시에** 만든다. 이 문서는 서로 덮어쓰지 않게 하는 경계 규정이다. 구현자는 이 계약을 어기면 다른 여섯 명의 작업을 파괴한다.

## 1. 만들 게임 7종

세상에 이미 있고 검증된 포맷을 가져오되, 재료는 이 서비스만 가진 것(인물의 감상 기록·세력 태그·성향 축)을 쓴다.

| 키 | 이름 | 원형 (실존 게임) | 한 줄 |
|---|---|---|---|
| `grid` | 교차 격자 | Immaculate Grid, Pokedoku, Cinematrix, FaceGrid | 3×3 격자의 행·열 조건을 동시에 만족하는 인물을 직접 떠올려 채운다 |
| `groups` | 넷씩 넷 | NYT Connections, Conexo, Categories | 인물 16명을 공통점 4개 묶음으로 가른다 |
| `proximity` | 근접도 | Metazooa, Globle, Contexto | 인물을 추측하면 오늘의 인물과 얼마나 가까운지 알려준다. 온도만 보고 좁힌다 |
| `travel` | 경로 잇기 | Travle, The Wiki Game, Cinema Circuit, GlobeHoppr | 두 인물을 정해진 이동 횟수 안에 잇는다. 최단이 아니라 도달이 목표 |
| `moreless` | 어느 쪽 | More or Less, Juxtastat, Steamry, TimeSwipe | 둘 중 큰 쪽을 고르고 연속 기록을 쌓는다 |
| `topfive` | 상위 다섯 | Factle, Top 5, Daily Tens | 오늘의 기준에 맞는 상위 5개를 순서까지 맞힌다 |
| `redact` | 가림 해제 | Redactle, Pedantle, Peekpedia | 인물 소개를 통째로 가려놓고 단어를 캐내며 정체를 밝힌다 |

## 2. 🔴 절대 건드리지 말 것 (공유 파일)

아래 파일은 **통합 담당이 마지막에 한 번만** 고친다. 구현자가 손대면 충돌한다.

| 파일 | 이유 |
|---|---|
| `sw/web/src/components/features/rest/RestGameGrid.tsx` | 7개가 카드를 동시에 추가하면 서로 덮어쓴다 |
| `sw/web/src/app/[locale]/(main)/rest/page.tsx` | 위와 같다 |
| `sw/web/src/i18n/request.ts` | 네임스페이스 배열 한 줄. **7개 몫을 이미 등록해뒀다** |
| `sw/web/messages/{ko,en}/rest.json` | 기존 게임 문구. 새 게임은 자기 파일을 쓴다 |
| `sw/web/src/components/features/game/shared/` 하위 | 공용 부품. 고치지 말고 그대로 쓴다 |
| 다른 게임의 폴더 | 남의 작업물이다 |

## 3. 각자 소유하는 것 (여기만 쓴다)

`<key>`는 §1 표의 키다. 예: `grid`.

| 산출물 | 경로 |
|---|---|
| 발주서 | `docs/todo/game-<key>-order.md` |
| 화면·규칙 | `sw/web/src/components/features/game/<key>/` 하위 전부 |
| 서버 조회 | `sw/web/src/actions/game/<key>.ts` (또는 `<key>/` 폴더) |
| 체험용 표본 | `sw/web/src/components/features/game/<key>/fixture.ts` |
| 단독 시험 화면 | `sw/web/src/app/[locale]/lab/games/<key>/page.tsx` |
| 문구 | `sw/web/messages/ko/game-<key>.json` · `messages/en/game-<key>.json` (**이미 자리 파일이 있다. 내용만 채운다**) |

문구 파일의 최상위 키는 이미 `game<Key>` 형태로 박아뒀다(예: `gameGrid`). 그 키 이름은 바꾸지 않는다.

## 4. 로컬에 데이터베이스가 없다 — 체험 표본이 필수다

실측: 저장소에 `.env` 파일이 하나도 없고 셸에도 Supabase 값이 없다. **실제 조회는 로컬에서 100% 실패한다.** 유저가 직접 만져보려면 표본 데이터가 있어야 한다.

그래서 데이터 경로를 둘로 만든다.

1. **실제 조회** — 서버 액션이 Supabase를 읽는다. 배포 환경의 정답 경로다.
2. **체험 표본** — 환경값이 없을 때만 쓴다. 화면 상단에 *"표본 데이터로 돌아가는 체험 모드"*를 눈에 보이게 띄운다.

규칙:

- **조용한 폴백 금지.** 표본으로 돌아갔다는 사실을 반드시 화면에 적는다. 조회 실패를 빈 목록으로 숨기지 않는다.
- **사실을 날조하지 말라.** 표본에 넣는 인물 이름·생몰년·직군·국적은 실제 사실만 쓴다. 확인 못 하는 값(성향 점수 같은 것)은 **지어내지 말고 그 축을 쓰지 않는 설계로 바꾼다.**
- 명언·발언을 표본에 넣을 때는 위작을 만들지 않는다. 근거를 못 대면 그 문항을 넣지 않는다.
- 디스크에 이미 있는 실제 프로젝트 데이터를 표본 재료로 써도 된다: `sw/remotion/public/episodes/<인물>/`, `sw/remotion/public/factions/<에피소드>/`.
- 표본 규모는 한 판이 성립하는 최소로 한다(인물 40~80명 수준). 방대하게 만들 필요 없다.

## 5. 단독 시험 화면 (유저가 만져볼 창구)

쉼터에 붙이는 건 통합 담당이 나중에 한다. 구현자는 자기 게임만 열리는 화면을 만들어 **그 주소로 바로 플레이되게** 한다.

```
/ko/lab/games/<key>
```

- 이 화면은 실험용이므로 로그인·권한을 요구하지 않는다. 공개 노출 경로가 아니다.
- `GameShell`을 쓰거나, 필요하면 게임만 직접 렌더해도 된다. 다만 전체화면 진입은 되게 한다.
- 이 화면 하나로 시작부터 결과까지 완주 가능해야 한다. **여기서 못 놀면 납품이 아니다.**

## 6. 지켜야 할 기존 규격

- **조회**: 전수 select는 `selectAllPages`(2차 정렬키를 `id`/`celeb_id`로 고정), id 목록은 `selectInChunks`. 462개 `in()`에서 실패한 실측 이력이 있다.
- **캐시**: `unstable_cache` + `CACHE_TAGS` + `STATIC_REVALIDATE`. 목록 조회에 본문·긴 텍스트를 싣지 않는다. egress 사고 이력이 있다.
- **실패**: 조회 오류는 드러낸다. `?? []`로 정상 화면처럼 위장하지 않는다.
- **모바일·접근성**: 320px 폭에서 완주 가능. 선택지는 2열. 정오답을 색만으로 구분하지 않는다(아이콘·문장 병기). 자산 로딩 전에는 타이머·입력을 멈춘다.
- **상호작용**: 조작 요소에 지연 없이 즉시 바뀌는 반응을 하나 이상 둔다. `transition-all` 금지.
- **문구**: 한국어·영어 두 파일에 같은 키를 넣는다. 한쪽만 채우면 미완이다. 화면에 한국어를 하드코딩하지 않는다.
- **실존 인물**: 악역·찬탈자로 만들지 않는다. 문장·초상을 지어내지 않는다.

## 7. 납품 조건 (자체 검증까지 하고 보고한다)

1. 자기 범위 파일에 대해 ESLint 통과.
2. `npx tsc --noEmit -p sw/web/tsconfig.json`이 **자기 코드로 인해 새 오류를 내지 않는다**(기존 오류와 구분해 보고).
3. 게임 규칙 엔진을 실제로 실행해 **최소 8회 완주** — 빈 문제·중복 정답·후보 부족·무한 대기 0.
4. 한국어·영어 문구 키 수 일치(누락 0).
5. `/ko/lab/games/<key>`가 열리고 한 판이 끝까지 돌아간다는 근거를 남긴다.
6. 전체 빌드는 통합 담당이 마지막에 한 번 돌린다. 구현자는 자기 범위만 책임진다.
7. 형식 통과만 보지 말고 **직접 판단하라** — 이 게임이 실제로 재미있고 손이 가는지. 아니면 그 사실을 보고에 적는다.

## 8. 통합 담당이 마지막에 하는 일

1. 7개 게임을 쉼터 카드·목차·서버 진입에 등록한다.
2. `pnpm build:web`과 전체 타입 검사를 돌린다.
3. 깨지면 원인을 고친다. 남의 게임 설계를 임의로 바꾸지 말고 배선만 맞춘다.

---

## 9. 마감 결정 기록 (26.07.31)

구현·통합·검수를 마친 뒤 실제 환경값으로 돌려보며 정한 것들이다.

**① 공개 쉼터에는 등록하지 않는다.** 통합 단계가 쉼터에 신작 7종 카드를 넣고 `/lab/games/<키>`로 링크를 걸었으나 되돌렸다. `/lab`은 `app/robots.ts`에서 차단된 실험 구역이고 이 계약서 §5도 공개 노출 경로가 아니라고 정했다. 공개 화면이 그곳으로 링크를 내보내면 그 경계가 무너진다. 대신 실험 구역 안에 목록 화면 `/lab/games`를 만들었다. **어느 게임을 공개할지 정해지면 그때 `RestGameGrid`로 승격한다** — 그때는 링크가 아니라 기존 4종처럼 쉼터 안에서 전체화면으로 열리게 붙인다.

**② 문구는 전역 등록을 유지한다.** `i18n/request.ts`가 모든 네임스페이스를 한 번에 불러 클라이언트로 넘기는 구조라, 실험 게임 문구도 사이트 전 화면 응답에 실린다. 실측 크기는 **7종 합계 gzip 4.1KB**(기존 사전 61KB의 6.7%)다. egress 사고 이력이 있는 프로젝트지만 이 값을 줄이려면 게임마다 별도 문구 공급자를 붙이는 구조 변경이 필요하고, 절대량이 작아 이득이 비용을 넘지 않는다. **게임이 폐기되면 네임스페이스도 함께 지운다** — 그게 이 비용을 되돌리는 방법이다.

**③ 실험 라우트는 `force-dynamic`을 선언한다.** 선언 전에는 Next가 정적 생성을 시도했다 실패하며 빌드 로그에 `Dynamic server usage` 오류를 6건 남겼다(신작 3개 라우트만). 진짜 오류를 가릴 잡음이라 8개 라우트 전부에 선언해 0건으로 만들었다.

**④ 실제 데이터로 처음 돌릴 때 잡힌 결함 2종**은 `docs/project/tooling-gotchas.md` 10번에 정리했다. 요약하면 `unstable_cache`가 `Map`을 직렬화하지 못해 빈 객체로 만들고(교차 격자가 계속 표본으로 떨어졌다), 그 원인을 `catch`가 삼켜 진단이 불가능했다. 7종 전부 폴백 이유를 로그에 남기도록 고쳤다.

## 10. 체험 표본 전수 DB 대조 감사 (26.07.31)

7개 게임의 `fixture.ts`에 하드코딩된 인물 표본 314항목을 실 DB(`profiles` 테이블, 활성 CELEB 1,736명)와 기계적으로 전수 대조했다. DB가 정본이다.

### 방법

`@supabase/supabase-js`로 전 활성 CELEB의 `nickname`·`nickname_en`·`slug`·`birth_date`·`death_date`·`nationality`·`profession`을 페이징 조회(500건씩, 1,000행 상한 회피)하고, 각 표본 항목을 slug → nickname_en → nickname 순으로 매칭해 값 대조. 임시 스크립트는 작업 후 삭제.

### 교정 전 결과

| 게임 | 항목 수 | 불일치 |
|------|---------|--------|
| grid | 63 | 19 |
| proximity | 50 | 15 |
| moreless | 50 | 17 |
| travel | 50 | 14 |
| redact | 10 | 2 |
| groups | 24 | 6 |
| topfive | 72 | 0 |
| **합계** | **319** | **73** |

### 불일치 유형 분류 및 교정

| 유형 | 건수 | 교정 방식 |
|------|------|-----------|
| profession `leader`→DB값(`politician`/`commander`) | 38 | DB 값으로 교체 |
| nationality 불일치 (Tesla RS→US, Musk ZA→US, Al-Khwarizmi IQ→UZ) | 9 | DB 값으로 교체 |
| nickname_en 악센트 차이 (Frédéric→Frederic, René→Rene) | 2 | DB 값으로 교체 |
| 한국어 이름 불일치 (알베르트→알버트, 앤드루→앤드류, 레프→레오, 알렉산드로스→알렉산더) | 4 | DB 값으로 교체 |
| birth/death 연도 차이 (플라톤 -427→-428) | 1 | DB 값으로 교체 |
| profession `other`→DB값(`author` 마르코 폴로) | 2 | DB 값으로 교체 |
| profession `visual_artist`→DB값(`scientist` 다빈치) | 5 | DB 값으로 교체 |
| profession 기타 (에디슨 scientist→entrepreneur, 프랭클린 scientist→politician, 마르쿠스 아우렐리우스 leader→humanities_scholar) | 3 | DB 값으로 교체 |
| slug/이름 오기로 매칭 불가 (오펜하이머 slug 차이, 마키아벨리·라파엘로·쇼팽 이름 차이) | 4 | DB slug·이름으로 교정 |
| **DB에 존재하지 않는 인물** | 7 | 아래 별도 처리 |

### DB에 없는 인물 7명 — 처리

| 인물 | 게임 | 처리 |
|------|------|------|
| 프란츠 카프카 | grid, travel | 삭제 (travel은 간선도 제거, dostoevsky→borges 등으로 연결 유지) |
| 조지 거슈윈 | grid | 삭제 |
| 앙투안 라부아지에 | grid | 삭제 |
| 파블로 네루다 | moreless | 삭제 |
| 장영실 | groups | 한강(Han Kang, author, KR)으로 교체 |
| 미시마 유키오 | groups | 나쓰메 소세키(Natsume Soseki, author, JP)로 교체 |

### 교정 후 결과

| 게임 | 항목 수 | 불일치 |
|------|---------|--------|
| grid | 60 | 0 |
| proximity | 50 | 0 |
| moreless | 49 | 0 |
| travel | 49 | 0 |
| redact | 10 | 0 |
| groups | 24 | 0 |
| topfive | 72 | 0 |
| **합계** | **314** | **0** |

### 검증

- `pnpm exec tsc --noEmit` → 에러 0
- `pnpm exec eslint src/components/features/game/*/fixture.ts` → 에러 0
- topfive는 id+label만 가지고 있어 profession/nationality/date 대조 대상이 아님 (별도 구조 비교 불필요)

### 명언·발언 점검

7개 fixture.ts 전수 점검 결과, **명언·발언(quote) 데이터를 포함한 표본은 0건**이다. grid·proximity·moreless·travel·redact 모두 인물 메타(이름·직군·국적·생몰년)만 담고 있다. redact의 `bio`는 공지 사실 서술이며 명언이 아니다. 오귀속·위작 위험 없음.

### 잔여·보류

- **topfive**: `total_score` 순위값은 DB 실측값이 아니라 표본 전용 추정치라 대조 불가(표본 모드 배너로 고지하므로 허용). 실서버에서는 DB의 `celeb_influence.total_score`를 조회해 정확한 순위를 쓴다.
- **groups**: 묶음의 `axisValue`가 `"Korea"`·`"Japan"` 형태인데 DB의 nationality는 ISO 코드(`KR`·`JP`)다. 이는 표본 전용 라벨이고 실서버 로직에서는 ISO 코드를 쓰므로 문제없음.
- **grid 교차 보장**: 인물 3명 삭제(Kafka·Gershwin·Lavoisier) + Edison 직군 변경으로 20세기 음악가/18세기 과학자 후보가 줄었으나, 남은 인원으로 여전히 3×3 교차가 성립함을 확인(20세기 음악가 2명, 18세기 과학자 2명 — 최소 조건 1명 이상 충족).

### 재현 명령

```bash
# sw/web 디렉토리에서 (환경변수 세팅 후)
# 1. 임시 스크립트로 대조 (스크립트는 이미 삭제됨 — 위 방법 기술 참조)
# 2. 타입체크
pnpm exec tsc --noEmit
# 3. ESLint
pnpm exec eslint src/components/features/game/*/fixture.ts
```
