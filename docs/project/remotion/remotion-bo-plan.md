# 영상 제작 관리 통합 이력 (구 remotion-bo)

> **폐기 완료: 26.07.29.** `sw/remotion-bo`의 마지막 시리즈였던 서재 탐방까지 web-bo로 이관했고 앱 디렉터리·workspace 항목·실행 명령을 삭제했다. 현행 제작 창구는 web-bo `/book-recommend`, `/factions`, `/discourses`다. 아래 긴 본문은 옛 앱의 설계와 단계별 이관 이력을 보존한 기록이며 현행 아키텍처로 읽지 않는다.
> 옛 본문의 `profiles`·`content_celebs` 같은 이름도 당시 기록으로만 보존한다. 현재 물리 원천은 `celebs`·`celeb_contents`다.
>
> **최종 이관 실측: 26.07.29** — 서재 탐방 제작 화면 8종, 동적 제작 API 42라우트, 73개 에피소드 로드, 신 레이아웃 metadata/style/timing/wav 쓰기 왕복, 상태 변경의 그룹 폴더 보존, web-bo 빌드·타입·린트 대조.
>
> **과거 실측: 26.07.16** — `sw/remotion-bo/src/` 전체(라우트·API·컴포넌트·lib), `sw/remotion/scripts/`(voice·render·youtube), `sw/remotion/src/Root.tsx`·`compositions/BookRecommend/`, `sw/remotion/public/episodes|factions|discourses/` 실파일 대조
> **부분 재실측: 26.07.25** — 세력도감(팩션) 구역 폐기 반영(삭제 92파일·공용 코드 12곳 분기 제거·유지 3건·이동 1건·신설 1건). 세력도감 외 서술은 26.07.16 판 그대로다.

구 영상 제작 관리 대시보드의 기획과 폐기 이력이다.

> **NOTE (26.03.23):** R2 음성 동기화 시스템 폐기. 이 문서의 R2 관련 기획(R2 현황 페이지, R2 동기화 UI, R2 상태 표시)은 더 이상 유효하지 않다. 영상 음성 파일은 로컬 전용으로 관리한다. 26.07.16 실측 기준 `src/` 안에 R2 코드는 남아 있지 않다(가이드 페이지 설명문과 대시보드의 `synced` 지표만 잔재 — 항상 0으로 표시된다). 아래 본문의 R2 서술은 폐기된 기획으로 읽어야 한다.
>
> **대체 기획 — 음성 저장소(voice-archive)**: R2 대신 로컬 보관소로 대체 구현됐다(26.04.01, `84f06090`). `sw/remotion/voice-archive/`로 에피소드 음성을 통째 옮겼다 되돌리는 방식이며, 시리즈 홈의 "저장소" 탭에서 다룬다. 상세는 아래 "음성 저장소" 절.
>
> **NOTE (26.07.25): 세력도감(팩션) 구역 전량 폐기.** 팩션 편집·렌더·유튜브·카드·출간이 web-bo로 옮겨 갔고 remotion-bo에는 팩션 코드가 남지 않았다. 아래 본문의 세력도감 서술은 **폐기된 과거 상태**로 읽는다. 상세는 다음 절 "세력도감 폐기".
>
> **NOTE (26.07.26): 가상 담화 구역 전량 폐기.** 담화 편집기·창구·목록이 web-bo `/discourses`로 옮겨 갔고 remotion-bo에는 담화 코드가 남지 않았다. 아래 본문의 담화 서술도 **폐기된 과거 상태**로 읽는다. 상세는 아래 절 "가상 담화 폐기".
>
> **26.07.29:** 남은 서재 탐방도 이관되어 앱 자체가 소멸했다.

## 정체성

- **web-bo** = 서비스 운영 + 세력도감·가상 담화·서재 탐방의 제작 관리
- **remotion** = 영상·카드 렌더 엔진과 로컬 에피소드 자산
- **remotion-bo** = 폐기

---

## 가상 담화 폐기 (26.07.26, 통합 Phase 5)

가상 담화는 세력도감와 같은 이유·같은 방식으로 remotion-bo에서 **전량 폐기**됐다. 새 자리는 web-bo `/discourses`(포트 3001, 사이드바 「가상 담화」)이고, 텍스트·구성의 단일 원천은 Supabase `discourse_*` 3테이블이다. 렌더 엔진 `sw/remotion`은 무수정으로 세 파일(`discourse-data.json`·`cast.json`·`turns.json`)을 계속 읽는다.

착수 근거가 세력도감와 달랐다. 담화는 **음성 파이프라인이 아직 없었다** — wav 0개, 발화 시각 파일 0개, 렌더·SRT·유튜브 CLI 전무. 팩션 통합에서 가장 비쌌던 위험(이미 만든 음원 443개와 위치 기반 파일명의 결박)이 담화에는 **아직 생기지 않은 상태**였고, 음성에 손대기 전에 끝내면 그 위험 자체가 발생하지 않는다. 그래서 시리즈가 미완성인 채로 먼저 옮겼다.

- 새 화면·창구·저장 규칙: [web-bo.md](../apps/web-bo.md) 「가상 담화」 절
- 시리즈 SSoT: [discourse.md](./discourse.md) · 통합 설계: [discourse-unification.md](./discourse-unification.md)

### 삭제 실적 (실측 36파일)

| 덩어리 | 파일 | 비고 |
| --- | --- | --- |
| 편집기 부품 | 21 | `components/discourse/**` — web-bo `components/discourses/`로 이식 |
| 데이터층 | 3 | `lib/discourse-{types,utils,voice}` |
| 음성 창구 | 2 | `api/[series]/discourse-voice/**` |
| 사이드바 목록 | 1 | `components/Sidebar/sections/DiscourseList.tsx` |
| 언어·탭 화면 트리 | 2 | `app/[series]/[name]/[lang]/**` — **유일 사용자가 담화였다** |
| 딸림 소멸 | 3 | `lib/faction-edit-route`(참조 전멸) · `lib/useCelebExists` + `api/celebs/exists`(참조 1곳뿐이었다) |
| 죽은 사진 창구 | 4 | `api/[series]/media/**` 3 + `lib/media-root.ts` — 아래 참조 |

**죽은 사진 창구**: `mediaRootOf(series)`가 담화에만 폴더를 내주고 있었다. 담화가 빠지자 모든 시리즈에 `undefined`를 돌려주게 돼 **어떤 요청이 와도 404를 뱉는 창구**가 됐다(호출처도 0곳). 쓰이지 않는 정도가 아니라 동작하지 않는 코드라 함께 걷어냈다. 같은 구조를 쓰는 시리즈가 다시 생기면 git에서 되살린다.

**남겨 둔 것**: `api/[series]/music`(목록·폴더 열기)은 호출처가 담화 편집기뿐이었으나 **동작 자체는 멀쩡하다**(시리즈 공용 `public/music/`을 읽는다). 고장 난 것이 아니라 부르는 사람이 없어진 것이라 그대로 뒀다.

### 등록표 정리 (9곳)

`series-registry.ts`의 `SeriesDataModel` 유니온에서 `'discourse'`를 빼자 타입 검사기가 나머지를 전부 지목했다 — 세력도감 폐기 때 쓴 방법 그대로다.

`SERIES_EPISODE_IO`(server-utils) · `FILE_SERIES`(api/episodes) · `STATUS_WRITERS`(api/status) · `SERIES_HOMES`(app/[series]) · `EPISODE_LISTS`(Sidebar) · `EDITORS`(삭제된 [lang]/[tab] 화면과 함께 소멸) · `usesLangTabEditor`(정의 자체 소멸 — 쓰는 시리즈가 없어졌다) · `mediaRootOf` · youtube/upload 가드(`=== 'discourse'` → `!== 'book'`, 다른 라우트와 형태 통일).

**표 다섯 개가 통째로 비었다.** 정의를 지우지 않고 빈 표로 남긴 것은, 같은 구조를 쓰는 시리즈가 생기면 한 줄만 얹으면 되게 하기 위해서다. 다만 그 전에 아래 절을 먼저 읽는 편이 낫다.

## 단일 시리즈가 된 뒤 (26.07.26 관찰)

이 앱의 뼈대는 **여러 시리즈를 한 껍데기로 다루는 구조**다. 주소 첫 토막이 시리즈이고(`/[series]/…`), 창구도 시리즈별로 갈리고(`/api/[series]/…`), 데이터 계열별 등록표가 다섯 개 있다.

그 구조가 지금은 **멤버가 하나뿐인 의례**가 됐다.

- `SERIES` 배열 항목 1개(서재 탐방)
- `SeriesDataModel` 유니온 값 1개(`'book'`)
- 계열별 등록표 5개 중 **5개가 빈 표**(book은 전부 "표에 없는 계열" 폴백 경로를 탄다)
- `/[series]/` 라우트 세그먼트가 언제나 `book-recommend` 한 값

즉 추상화가 값을 만들어 내지 못하고 읽는 사람의 품만 늘렸다. 당시 선택지는 둘이었다.

1. **껍데기를 걷어낸다** — `[series]` 세그먼트와 등록표를 없애고 서재 탐방 전용 앱으로 되돌린다. 이 앱을 계속 쓸 거라면 이쪽.
2. **서재 탐방도 web-bo로 옮기고 이 앱을 소멸시킨다** — 세력도감·담화가 간 길을 마저 간다. 그러면 영상 제작 화면이 한 앱에 모이고 remotion-bo는 사라진다.

**26.07.29에 2번을 채택해 완료했다.** web-bo 내부에는 기존 URL 호환을 위해 `[series]` 세그먼트가 남지만 등록 가능한 값은 `book-recommend` 하나이며 42개 API 전부가 이를 검증한다. 새 시리즈를 이 트리에 얹는 확장점으로 취급하지 않는다.

### 북리커맨드 최종 이관 (26.07.29)

먼저 본 서비스와 영상 제작이 중복 관리하던 콘텐츠 ID·판본 표지를 단일원천화했고,
이어 제작 작업대 전체를 web-bo로 옮겼다.

- `/book-recommend`: 제작 현황과 리소스 감사 탭
- `/book-recommend/search`, `/book-recommend/guide`: 새 에피소드 탐색과 운영 가이드
- `/book-recommend/<인물>/{scenario,voice,render,youtube,cards}`: 제작 전 과정
- `/book-recommend/youtube`: 전체 편성 현황
- `/api/book-recommend/**`: 에피소드·필드·미디어·음성·렌더·유튜브·카드 창구 42종
- `/api/tasks`, `/api/open-folder`: 장기 작업과 로컬 폴더 조작
- `REMOTION_LOCAL=1` 또는 옛 별칭 `FACTION_LOCAL=1`: 로컬 제작 API 가동 조건

활성 30편 188건 중 177건에 안정 ID를 연결했고, 282개 locale 표지 참조를 DB 원본 기반
캐시 248개로 전환했다. DB 표지 원본이 있는 참조의 외부 URL·구경로는 0건이다. 남은 관계 11건과 DB 표지 누락
7개 판본은 잘못된 자동 연결이나 삭제 대신 운영 큐로 남겼다. 설계·운영·잔여 목록은
[서재 탐방 1차 통합](./book-recommend/unification-phase1.md)이 단일원천이다.

화면을 복사하는 데서 끝내지 않고, 신 레이아웃의 분산 파일 쓰기(`meta`·`book`·`shorts`),
voice metadata/style/timing rename, 상태 파일 기반 이동, YouTube lineup까지 현행 데이터에
맞게 교정했다. Remotion 데이터와 렌더 엔진은 옮기지 않았다. 원천은 계속
`sw/remotion/public/episodes`와 `sw/remotion`이며 web-bo가 이를 관리한다.

**이번 이관과 별개인 후속 제품 기획**: 감상배경을 본 서비스의 `Deep 감상배경`으로 노출하는
방식, 롱폼·SOLO·쇼츠·카드 산출물의 서비스 투영, 롱폼 폐지 시점, SOLO–쇼츠 데이터 모델.
제품 형식이 정해지기 전에는 이 영역의 DB 스키마를 확정하지 않는다.

## 세력도감 폐기 (26.07.25, 통합 Phase 5)

세력도감(팩션)는 플랫폼 소거를 목적으로 remotion-bo에서 **전량 폐기**됐다. 절충안("출고만 remotion-bo 잔류")은 기각됐다. 새 자리는 web-bo `/factions`(포트 3001, 사이드바 「세력도감」)이고, 텍스트·구성의 단일 원천은 Supabase 5테이블이다. 렌더 엔진 `sw/remotion`은 무수정으로 `faction-data.json`을 계속 읽는다.

- 새 화면·창구·출간 규칙: [web-bo.md](../apps/web-bo.md) 「세력도감」 절
- 시리즈 SSoT: [faction.md](./faction.md) · 통합 설계: [faction-unification.md](./faction-unification.md)

### 삭제 실적 (실측 92파일)

| 대상 | 수 |
|---|---|
| `components/faction/**` | 55 |
| `api/[series]/faction-*` | 16 라우트 |
| `api/faction/db-sync/{status,publish}` | 2 |
| `api/elevenlabs/{voice-history,voice-notes}` | 2 |
| lib 5종 — `faction-types`·`faction-utils`·`faction-voice`·`faction-voice-casting-history`·`ele-voice-notes` | 5 |
| `lib/faction-sync/` | 7 |
| `[series]/[name]/[lang]/[tab]/card/**` | 3 |
| `Sidebar/sections/FactionList.tsx` | 1 |
| `src/middleware.ts` (팩션 카드 주소 rewrite 전용이었다) | 1 |

**폐기 스위치**: `series-registry.ts`의 `id:'faction'` 정의와 `SeriesDataModel` 유니온의 `'faction'`을 제거했다. 이 한 곳을 빼면 시리즈 가드가 전부 404를 낸다.

**공용 코드 12곳에서 팩션 분기를 도려냈다** — `api/[series]/{episodes,status,render,youtube/status,youtube/sync,youtube/upload}` · `lib/{server-utils,media-root,series-registry}` · `app/[series]/page.tsx` · `app/[series]/[name]/[lang]/[tab]/page.tsx` · `components/Sidebar/Sidebar.tsx`.

### 이름만 팩션인 채 남은 것 (지우면 안 된다)

| 남긴 것 | 이유 |
|---|---|
| `lib/faction-edit-route.ts` | 가상 담화가 쓴다. 이름만 유산인 언어·탭 공용 상수다 |
| `api/[series]/cards/[name]` | 서재 탐방 카드뉴스. 디스크 파일명이 `faction-cards.json`이라 개명하면 데이터가 끊긴다 |
| `api/elevenlabs/voices` | 서재 탐방 보이스 매핑 |

**이동 1건**: `components/faction/shared/holdMotion.ts` → `components/discourse/shared/holdMotion.ts`(담화 2곳이 쓴다).

**신설 1건**: `api/[series]/music/route.ts`. 담화가 부르던 배경음악 목록 창구가 팩션 전용이라 **원래도 404였다**(목록이 항상 비어 있었다). 시리즈 공용으로 다시 세우고 담화에서 목록이 실제로 내려오는 것을 확인했다.

**404 처리**: `/[series]`·`/[series]/youtube`에 `notFound()`를 넣었다. 그 전에는 미등록 시리즈가 200으로 빈 화면을 냈다.

### 무손상 실측

담화 목록·편집(ko/info·ko/shorts)·유튜브, 서재 탐방 목록·scenario·voice·유튜브, 창구 `api/discourse/{episodes,music}`·`api/book-recommend/{episodes,status}`·`api/elevenlabs/voices` 전부 200. 팩션 주소·창구 전부 404. tsc 4종(web-bo·remotion-bo·remotion·web) 0 에러.

⚠ **remotion-bo에는 eslint 설정이 없다**(`eslint.config.*` 부재, package.json에 의존성·스크립트 없음). 검사 통과를 주장할 수 없다.

### 다음

remotion-bo **최종 소멸이 후속 단계**다. 서재 탐방·가상 담화도 세력도감가 밟은 길(공용 부품 shared 승격 → web-bo 이식 → 폐기)을 따라 옮기고, 그 뒤 이 앱을 없앤다.

---

## 규모 전제

- 인물 풀: 624명 (DB 등록 기준)
- 에피소드: 시리즈별 수백 개 (서재 탐방만 624개 가능)
- 시리즈: 3개 시작 → 향후 5~10개
- 음성 파일: 에피소드당 ~30 WAV → 전체 ~18,000개, ~8.5GB
- 렌더 결과: 에피소드당 롱폼+쇼츠 2개 → 수백 영상

---

## IA (Information Architecture)

> **실측 (26.07.16)**: 헤더의 R2 표시기와 1단 사이드바의 "인프라 > R2 현황·렌더 큐"는 구현되지 않았다(R2 폐기). 현재 헤더는 `Remotion BO · 인물 검색 · 가이드` 3개 링크뿐이고, 인프라 라우트(`/infra/*`)는 존재하지 않는다. 아래는 원 기획 그대로 남긴다.

```
┌─ 헤더 ──────────────────────────────────────────┐
│  Remotion BO    [인물 검색...]           [R2 ●]  │
├─ 1단 사이드바 ──┬───────────────────────────────┤
│                 │                               │
│ 📺 서재 탐방     │   (메인 콘텐츠 영역)          │
│ 🎭 라이벌 대담   │                               │
│ 📢 서비스 소개   │                               │
│ ···(향후 시리즈) │                               │
│                 │                               │
│ ─────────────  │                               │
│ ⚙ 인프라        │                               │
│  ├ R2 현황      │                               │
│  └ 렌더 큐      │                               │
│                 │                               │
├─ 2단 사이드바 ──┤   (시리즈 선택 시 펼침)        │
│ [검색/필터]     │                               │
│ ★ 최근 작업     │                               │
│ ─────────      │                               │
│ 편성표          │                               │
│ + 새 에피소드   │                               │
│ ─────────      │                               │
│ 알렉산더 대왕 ● │                               │
│ 다빈치       ◐ │                               │
│ 나폴레옹     ○ │                               │
│ ... (가상스크롤) │                               │
└─────────────────┴───────────────────────────────┘

● = 렌더 완료   ◐ = 음성 완료   ○ = JSON만
```

### 1단 사이드바: 시리즈 + 인프라

시리즈를 클릭하면 2단이 펼쳐진다. 인프라는 시리즈 독립.

### 2단 사이드바: 시리즈 내 에피소드

- **상단**: 검색/필터 (시대, 직군, 제작 상태)
- **최근 작업**: 최근 편집한 에피소드 3~5개 핀
- **편성표**: 해당 시리즈의 편성표 링크
- **에피소드 목록**: 가상 스크롤 (수백 개 대응). 상태 아이콘(●/◐/○) 표시 — 상태 아이콘은 구현(`components/Sidebar/StatusIcon.tsx`), 가상 스크롤은 미구현(전량 렌더)

### 시리즈 레지스트리

시리즈마다 구조가 다르므로, 각 시리즈는 레지스트리에 등록한다.

**구현됨 (`sw/remotion-bo/src/lib/series-registry.ts`, 실측 26.07.16 / 26.07.25 세력도감 제거)** — 아래가 실제 형태다. 기획안의 `jsonSchema`·`scenarioView`·`ttsJobBuilder` 필드는 채택되지 않았고, 대신 **`dataModel` 축**(book | discourse)이 그 역할을 대신한다. 에피소드 저장 형식·IO·편집 화면이 이 값 하나로 갈린다.

```typescript
type SeriesDataModel = 'book' | 'discourse'   // 'faction' 은 26.07.25 제거(폐기 스위치)

interface SeriesDefinition {
  id: string
  label: string
  icon: string
  composition: string      // remotion Composition 이름
  episodeDir: string       // 에피소드 디렉토리명
  dataModel: SeriesDataModel
  episodeHome: string      // /[series]/[name] 아래 진입 기본 경로
  langTabEditor: boolean   // /[lang]/[tab] 세부 경로를 쓰는가
  render: { codec: string; proresProfile?: string; shortsSuffix?: string }
}
```

**등록된 시리즈 2종** (26.07.25 — 세력도감 제거 후):

| id | label | dataModel | episodeDir | episodeHome | langTabEditor |
|----|-------|-----------|------------|-------------|---------------|
| `book-recommend` | 서재 탐방 📚 | book | `book-recommend` | `scenario` | false |
| `discourse` | 가상 담화 🗣️ | discourse | `discourses` | `both/shorts` | true |
| ~~`faction`~~ | ~~세력도감 🏛️~~ | — | — | — | **폐기(26.07.25)** — 정의 제거. web-bo `/factions`로 이관 |

기획 시점의 "라이벌 대담"·"서비스 소개"는 등록되지 않았다. 실제로 늘어난 시리즈는 세력도감·가상 담화였고, 그중 세력도감는 web-bo로 떠났다.

새 시리즈 추가 = 레지스트리에 정의 1개 추가. UI/라우팅은 자동 생성. `id === 'faction'` 같은 하드코딩 분기는 두지 않는다 — **덕분에 정의 1개를 지우는 것으로 시리즈 폐기가 성립했다**(가드 전부 404).

---

## 공용 부품 (26.07.20 통합)

> **최종 실측 체크: 26.07.20** — 통합 대상 파일 전수 대조·삭제 확인, 타입체크·8개 화면 응답 실측

시리즈가 늘 때마다 **앞 시리즈의 부품을 복제해 새 시리즈에 붙이는 일이 반복됐다**(서재 탐방 → 세력도감 → 가상 담화). 복제본은 곧 갈라진다 — 실제로 정렬 성공 판정, 감정 어휘, 폴더 표시 방식이 서로 다르게 동작하고 있었고, 복제 과정에서 스크롤 잠금·드래그 오닫힘 방지 같은 처리가 누락된 채 넘어간 사례도 나왔다.

**그래서 공용 부품은 아래뿐이다. 시리즈별 복제본을 새로 만들지 않는다.**

**26.07.25 — 공용 부품은 `packages/shared/src/bo/` 로 올라갔다**(팩션 통합 Phase 3). 관리 화면이 web-bo 로 이사할 때 복사가 아니라 같은 파일을 쓰기 위함이다. remotion-bo 에 껍데기 재export 는 두지 않았다 — 부르는 쪽이 직접 `@feelandnote/shared/bo/…` 를 가져온다.

| 자리 (`@feelandnote/shared/bo/…`) | 담는 것 |
|------|---------|
| `media` | 사진 목록(풀)·고르기 창·보일 자리 맞춤·다가갈 지점·썸네일·끌어다 놓기·크게 보기·사진 칸 |
| `media-src` | 사진·영상 표시 주소 규칙(`imageSrc`) |
| `voice` | 음성 편집 창 껍데기·저장된 음원 파형/트림·감정 표식 고르기·엔진 토글·음성 생성/트림/저장 절차(`useVoiceGeneration`) |
| `voice-utils` | wav 인코딩·음량·엔진 판정·구간 규칙·ElevenLabs 보이스 목록·합성 설정 값 타입(`EleSettings`·`GenEngine`·`TempPreview`) |
| `audio-wave-player` | 파형 재생기(+시간 눈금 `time-ruler`, 음량 환산 `gain`) |
| `editor` | 편집 언어(`EditLang`·전환 UI)·`formatMmss`·경로 치환(`makePathRemapper`)·전체 저장+Ctrl+S+저장 단추(`useEpisodeEditor`)·진행 상태 점·에피소드 생성 폼 |
| `icons` | 인라인 SVG 아이콘 (세 시리즈 공용) |
| `episode-store` | 서버 IO — 에피소드 폴더 스캔·사진 트리/업로드/삭제/폴더 정리·wav 목록·wav Range 스트리밍·진행 상태·노출 목록(`_episodes.json`) |
| `task-queue` | 백그라운드 작업 실행기 — 즉시(`runTask`)·순차(`runTaskSequence`)·대기줄(`queueTask`)·중단(`cancelTask`) |
| `remotion-root` | 렌더 저장소 위치 한 곳 — `REMOTION_ROOT` 환경변수로 옮길 수 있다 |

「시리즈 이름 → 뿌리 폴더」 대응표(`mediaRootOf`)만 앱에 남는다(`src/lib/media-root.ts`) — 공용 부품은 시리즈 이름을 모르고 뿌리 폴더만 인자로 받는다.

**규칙**

1. **시리즈 차이는 값으로 흡수한다.** 서버는 뿌리 디렉토리 인자, 클라이언트는 props(창구 주소·드래그 데이터 종류·기능 유무 콜백). `if (series === 'faction')` 류 분기를 새로 만들지 않는다.
2. **한 자리에 모은다.** 부품마다 파일을 쪼개 흩지 않는다. 위 파일들이 1,000줄을 넘는 것은 의도된 것이다.
3. **기능은 합집합으로.** 한쪽에만 있던 기능을 통합하며 버리지 않는다.
4. **드래그 데이터 종류(MIME)만은 시리즈별로 유지한다** — 세력도감 목록에서 끌어 담화 칸에 놓이는 사고를 막는다.

**창구도 하나다** — 사진은 `/api/[series]/media`(목록·업로드·삭제) + `/api/[series]/media/folder`(만들기·이름변경·삭제·이동·탐색기 열기) + `/api/[series]/media/[episode]/[...path]`(파일 서빙). 표시 주소는 `src/lib/media-src.ts`의 `imageSrc(series, ep, path)` 하나로 만든다(클라이언트에서 쓰므로 서버 전용 코드와 같은 파일에 두지 않는다).

**통합 대상이 아닌 것** — 서재 탐방의 `components/scenario/ImagePool`·`ImageThumb`(책 단위 그룹핑·다중 선택 등 구조가 다름), `useVoiceSpec`↔`useFactionVoiceSpec`(이름만 닮고 하는 일이 다름), 화자 배정 패널들, 유튜브 업로드 패널(메타 편집 모델이 다름).

---

## 라우팅

**실측 (26.07.16)** — 실제 라우트는 다음과 같다:

```
/                                    → 대시보드 (시리즈 현황 카드)
/search                              → 인물 검색 (Supabase 셀럽)
/guide                               → 사용 가이드

── 시리즈 공통 패턴 (/[series]/...) ──
/[series]                            → 시리즈 홈 (에피소드 목록 + 후보 풀 + 저장소 탭)
/[series]/youtube                    → 유튜브 업로드 현황판 (시리즈 전체)
/[series]/[name]                     → 에피소드 진입 (episodeHome 으로 리다이렉트)
/[series]/[name]/scenario            → 시나리오 (책 기반 시리즈)
/[series]/[name]/voice               → 음성
/[series]/[name]/render              → 렌더
/[series]/[name]/youtube             → 유튜브 (에피소드 단위)
/[series]/[name]/cards               → 카드뉴스
/[series]/[name]/[lang]/[tab]        → 언어·탭 편집 (langTabEditor 시리즈: 담화. 세력도감는 폐기)
/[series]/[name]/[lang]/[tab]/card/… → 카드 상세 편집 — 폐기(26.07.25, 세력도감 전용이었다)
```

기획 대비 차이:
- `/[series]/lineup`(편성표), `/[series]/new`(스캐폴딩 전용 페이지), `/infra/r2`, `/infra/render-queue` — **모두 미구현**. 스캐폴딩은 페이지 없이 `POST /api/[series]/episodes`와 시리즈 홈 UI로 처리한다. 인프라 라우트는 R2 폐기·렌더 큐 인메모리 유지로 불필요해졌다.
- 에피소드 관리는 "단일 페이지 섹션 스크롤"이 아니라 **탭 분리**(scenario/voice/render/youtube/cards)로 갔다.
- `[lang]/[tab]` 축이 추가됐다 — 언어별 편집 화면을 쓰는 시리즈만 탄다(세력도감·담화 둘이었고, 지금은 담화만).

`[series]`가 동적 세그먼트. 레지스트리에 등록된 시리즈만 유효. 시리즈별 별도 라우트 파일이 불필요하다.

---

## 에피소드 디렉토리 구조

### 실측 (26.07.16)

기획의 `episodes/{series}/` 단일 트리는 채택되지 않았다. 실제로는 **시리즈마다 자기 최상위 디렉토리를 갖는다**. `episodeDir` 필드가 그 이름을 담지만, 책 기반 시리즈는 `public/episodes/`를 직접 쓴다(`episodeDir: 'book-recommend'` 값은 현재 참조되지 않는 잔재).

```
sw/remotion/public/
  episodes/                        ← 서재 탐방 (dataModel: book)
    <인물>/
      _status.json                 ← 진척도 SSoT (todo | live | done)
      meta.ko.json / meta.en.json
      meta.ko.timing.json / meta.en.timing.json
      books/    <책>.{locale}.json
      shorts/   {locale}-{N}.json
      voice/{locale}/  images/  music/  ref/
  factions/                        ← 세력도감 — remotion-bo에서 다루지 않는다(26.07.25 폐기)
    <에피소드>/faction-data.json     ← DB에서 내보낸 렌더용 산출물. 편집은 web-bo /factions
  discourses/                      ← 가상 담화 (dataModel: discourse)
    <에피소드>/discourse-data.json
```

- **인물 폴더 위치는 자유**다. `episodes/three-kingdoms/` 처럼 그룹 축으로 묶어도 되고, 진척도는 폴더 위치가 아니라 `_status.json`이 정한다. 옛 구조 `episodes/{status}/{person}/` 도 호환 인식한다.
- **로케일 축은 파일명**이다: `meta.{locale}.json`. 에피소드 ID는 `{person}` (ko) / `{person}-en` (en) 접미사 규칙으로 표현한다.
- **작업 완료 보관소**: `D:/remotion_done` (`REMOTION_ARCHIVED_EPISODES_DIR`). 폴백 스캔된다. 26.07.16까지 기본값이 `D:/done_people`이었으나 **그 폴더는 존재하지 않아** 보관 인물 3명(alex-karp·dario-amodei·marcus-aurelius)이 현황판에서 통째로 누락됐다. 교정 완료.
  - 내용물이 두 종류로 섞여 있다 — **인물 데이터**(소문자 slug: `alex-karp`는 신구조, `dario-amodei`·`marcus-aurelius`는 옛 통짜 `ko.json`)와 **렌더 산출물**(PascalCase: `AlexKarp/{KO,EN}/*.mp4`). 스캔은 인물 JSON이 있는 폴더만 잡으므로 산출물 폴더는 자연히 빠진다.
- **음성 보관소**: `sw/remotion/voice-archive/` — 아래 "음성 저장소" 절.

기획의 마이그레이션 계획(`--series` 플래그, `voice-r2.ts` 시리즈 프리픽스, Composition 시리즈 프리픽스)은 실행되지 않았다. 시리즈 구분이 경로 프리픽스가 아니라 `dataModel` 축으로 해결됐고, R2는 폐기됐기 때문이다.

---

## 페이지별 상세

### 대시보드 (`/`)

```
┌─────────────────────────────────────────────┐
│ 시리즈 현황                                  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│ │서재 탐방  │ │라이벌 대담│ │서비스 소개│     │
│ │ 4/624    │ │ 0/40+    │ │ 1/1 완료 │     │
│ │ ●2 ◐1 ○1│ │          │ │          │     │
│ └──────────┘ └──────────┘ └──────────┘     │
│                                             │
│ (R2 현황 — 폐기)  최근 작업                  │
│                 voice alexander  2분 전 done │
│                 render napoleon  진행 중...  │
└─────────────────────────────────────────────┘
```

**실측 (26.07.16)**: 시리즈 현황 카드와 작업 패널(`TaskPanel`)은 구현됐다. 카드의 `● synced` 지표는 R2 동기화 수를 세던 것이라 폐기 후 **항상 0**으로 나온다(죽은 표시). R2 요약 블록은 만들어지지 않았다.

### 인물 검색 (`/search`)

DB에서 셀럽을 검색하여 영상 제작에 활용.

- Supabase `profiles` 테이블 검색 (nickname, nickname_en)
- 검색 결과 컬럼: 닉네임, 시대, 직군, 책 수, 음성 보유, 감상여정 보유, **기존 에피소드 여부**
- 결과에서 "에피소드 스캐폴딩" 버튼 → 시리즈 선택 → JSON 뼈대 생성
- 필터: 시대, 직군, 책 수 범위, 음성 보유 여부
- **기존 에피소드가 있으면** 해당 에피소드로 바로 이동

### 에피소드 스캐폴딩 (`/[series]/new`)

DB 데이터 → JSON 뼈대 생성 → AI 초안 → 수동 검수.

**자동 매핑 (DB → JSON)**:
| JSON 필드 | DB 소스 | 자동 |
|-----------|---------|------|
| `host.nickname` | `profiles.nickname` | ✓ |
| `host.avatar_url` | `profiles.avatar_url` | ✓ |
| `host.bio` | `profiles.bio` | ✓ |
| `host.speech_tone` | `profiles.speech_tone` | ✓ |
| `host.elevenlabsVoiceId` | `celeb_voice.elevenlabs_id` | ✓ |
| `books[].title/creator` | `content_celebs + contents` | ✓ |
| `books[].thumbnail_url` | `contents.thumbnail_url` | ✓ |
| `books[].stats` | 집계 쿼리 | ✓ |

**AI 초안 (ai-services → JSON)**:
| JSON 필드 | 생성 방식 |
|-----------|-----------|
| `host.philosophy` | DB consumption_philosophy + speech_tone → 1인칭 재작성 |
| `books[].summary` | DB review → 책 자체 설명 추출 |
| `books[].contextMain` | DB review → 감상 배경 추출 (3인칭) |
| `narrator.celebIntro` | DB bio → 위키백과 서술체 재작성 |
| `narrator.outro` | 템플릿 + 인물명/책 수 자동 삽입 |

**수동 검수 필수**:
| JSON 필드 | 이유 |
|-----------|------|
| `books[].quotePairs` | 인용문+후속맥락 배열. 검증된 인용문만 허용. AI 창작 금지 |
| `shorts.segments` | 훅/CTA 등 크리에이티브 |
| `narrator.serviceIntro` | 에피소드별 커스텀 |

### 편성표 (`/[series]/lineup`) — 미구현

**실측 (26.07.16)**: 아래 기획(Phase/라이벌 묶음/정치 균형 슬롯)은 착수되지 않았다. 라우트 `/[series]/lineup`도 없다.

**이름 충돌 주의**: 실재하는 `scripts/youtube/youtube-lineup.json`·`faction-lineup.json`은 **편성표가 아니라 유튜브 업로드 기록**이다. 구조가 전혀 다르다 — 에피소드명을 키로 `hook`(제목 훅 ko/en)·`shortsRelation`·`uploads`(`ko-longform`·`ko-shorts-1` 등 variant별 `videoId`·`uploadedAt`)를 담아 중복 업로드를 막는다. 아래의 `phases`·`rivalGroups`·`politicalBalance`와는 무관하다.

편성 대신 실제로 구현된 화면은 **`/[series]/youtube` 업로드 현황판**이다: 에피소드별 variant(ko/en × longform/shorts N편) 행에 영상·자막·썸네일 보유 여부와 업로드·동기화 상태(`synced`/`drift`/`deleted`/`not_uploaded`)를 표시한다.

#### 데이터 소스: lineup.json (기획 — 미착수)

`lineup.md` → `lineup.json` 구조화. 시리즈별 1개 파일.

```typescript
// episodes/book-recommend/lineup.json
interface Lineup {
  phases: Phase[]
  rivalGroups: RivalGroup[]
  politicalBalance: PoliticalSlot[]
}

interface Phase {
  id: string            // 'phase-1'
  label: string         // 'Phase 1: 음성 보유'
  slots: LineupSlot[]
}

interface LineupSlot {
  order: number
  celebSlug: string     // DB 참조
  nickname: string
  era: string
  profession: string
  bookCount: number
  status: 'pending' | 'json' | 'voice' | 'rendered'
  episodeName?: string  // episodes/ 내 파일명
}

interface RivalGroup {
  id: string
  label: string         // '삼국지'
  slots: [LineupSlot, LineupSlot]  // 반드시 2명
  notes?: string
}
```

#### 편성표 UI (기획 — 미착수)

- Phase별 진행률 바
- 라이벌 묶음: 양쪽 인물 카드 쌍. 한쪽만 완료면 경고
- 상태별 필터 (pending/json/voice/rendered)
- 드래그로 순서 조정 → lineup.json 저장

### 에피소드 관리 (`/[series]/[name]`)

기획: 단일 페이지, 섹션 스크롤. 시나리오만 별도 페이지.

**실측 (26.07.16)**: 단일 스크롤이 아니라 **탭 분리**로 구현됐다 — Scenario / Voice / Render / YouTube / Cards. `R2 STORAGE` 섹션은 만들어지지 않았다(R2 폐기). 아래 스케치는 원 기획이다.

```
┌─────────────────────────────────────────┐
│ 알렉산더 대왕            [시나리오 보기] │
│ book-recommend · 8권 · Shorts ✓  ● 완료│
├─────────────────────────────────────────┤
│ ▼ VOICE                                │
│   [엔진▼] [역할▼] [only___] [생성] [+R2]│
│   ▶ book-0-title.wav    4.09s   192KB  │
│   ▶ book-0-summary.wav  28.77s  1349KB │
│   ...                                  │
├─────────────────────────────────────────┤
│ ▼ R2 STORAGE                           │
│   [업로드] [다운로드] [전체 재업로드]     │
├─────────────────────────────────────────┤
│ ▼ RENDER                               │
│   [전체] [롱폼만] [쇼츠만]              │
├─────────────────────────────────────────┤
│ ▼ TASKS                                │
│   (진행 중/완료 작업 로그)               │
├─────────────────────────────────────────┤
│ ▼ JSON EDITOR                          │
│   (textarea + 저장/새로고침)             │
└─────────────────────────────────────────┘
```

### ~~R2 현황 (`/infra/r2`)~~ — 폐기 (26.03.23)

R2 음성 동기화를 접으면서 이 페이지 기획 전체가 무효가 됐다. 라우트·API·코드 모두 존재하지 않는다. 아래 항목은 실행되지 않은 채 폐기됐다: 에피소드별 unsynced 집계, 일괄 동기화 버튼, 시리즈별 용량 집계, 월별 용량 추이, `r2-manifest.json` 해시 캐싱, 무료 한도(10GB) 초과 알림.

용량 문제는 R2 대신 아래 **음성 저장소**로 해결했다.

### 음성 저장소 (시리즈 홈 "저장소" 탭) — 구현 완료 (26.04.01, `84f06090`)

로컬 디스크 압박을 R2 업로드가 아니라 **로컬 보관소 이동**으로 푼다. 에피소드 음성 폴더를 `sw/remotion/voice-archive/<에피소드>/`로 통째 옮겼다가(Archive) 필요할 때 되돌린다(Load).

- **구현 위치**: `src/lib/server-utils.ts`의 `VOICE_ARCHIVE` 상수 · `getVoiceStorageStatus()` · `loadVoiceFiles()` · `unloadVoiceFiles()`, `src/app/api/[series]/voice/storage/route.ts`(GET 현황 / POST 이동), `src/components/VoiceStorage.tsx`, `src/app/[series]/page.tsx`의 저장소 탭
- **에피소드 상태 4종**: `loaded`(전량 로컬) / `unloaded`(보관소로 이동) / `partial`(섞임) / `none`(음성 없음)
- **집계**: 로컬 총량 / 보관소 총량 (파일 수 + 용량)
- **선택 이동**: 목록에서 다중 선택 → 일괄 Archive/Load. 필터 `all | loaded | unloaded`

### 렌더 큐 — 인메모리 유지 (전용 페이지 없음)

**실측 (26.07.16)**: 작업 큐는 `server-utils.ts`의 `globalThis.__tasks: Map<string, Task>` 인메모리이며, `GET /api/tasks`·`/api/tasks/[id]`로 폴링해 `TaskPanel`이 표시한다. `/infra/render-queue` 전용 페이지는 없다.

#### 현재: 인메모리
- 진행 중/완료/실패 작업 목록
- stdout 로그 실시간 표시

#### 대규모 전환 기준: 큐 파일 영속화 — 미착수
- 전환 시점: 배치 렌더링(10개+) 도입 시
- `remotion/render-queue.json`에 상태 저장
- 서버 재시작 후 미완료 작업 재개
- 동시 렌더 수 제한 (CPU/메모리 보호)

---

## 헤더

**실측 (26.07.16)** — 실제 헤더:

```
[Remotion BO]  [인물 검색]                              [가이드]
```

- **인물 검색**: `/search`로 가는 링크. 헤더 내 입력창이 아니라 전용 페이지다
- **R2 아이콘**: 미구현 (R2 폐기)
- 시리즈 전환은 사이드바 1단에서만 (헤더와 중복 제거) — 유지됨

---

## API

**실측 (26.07.16)** — 시리즈는 쿼리 파라미터가 아니라 **경로 세그먼트** `/api/[series]/…`로 갔다. 주요 라우트:

```
── 에피소드 ──
GET     /api/[series]/episodes             목록 (dataModel별 분기)
POST    /api/[series]/episodes             생성 — 책 기반은 DB 스캐폴딩, 담화는 폴더 생성 (세력도감 분기 제거)
GET/PUT /api/[series]/episodes/[name]      에피소드 CRUD
        …/[name]/meta · /book/[slug] · /field · /segment · /material · /solo/[index]
GET     /api/[series]/candidates           후보 풀
GET     /api/[series]/status               진척도

── 음성 ──
GET  /api/[series]/voice/files/[episode]   음성 파일 목록
GET  /api/[series]/voice/play/[...path]    음성 재생
POST /api/[series]/voice/generate          TTS 생성
GET  /api/[series]/voice/storage           음성 저장소 현황  ← R2 대체
POST /api/[series]/voice/storage           보관/복원 이동
     …/voice/analyze · /rename · /save · /style · /meta · /pipeline-status · /voice-select
     …/voice/{gemini,gemini-v3,elevenlabs}/preview
     /api/[series]/discourse-voice/…      (faction-voice/… 는 26.07.25 폐기)

── 렌더 · 작업 ──
POST /api/[series]/render                  렌더링 트리거
GET  /api/tasks · /api/tasks/[id]          작업 큐 (인메모리)

── 인물 (Supabase 읽기 전용) ──
GET  /api/celebs/search  ·  /api/celebs/[slug]  ·  /api/celebs/exists  ·  /api/celebs/[slug]/voice

── 유튜브 ──
GET/PUT /api/[series]/youtube/lineup       업로드 기록(youtube-lineup.json)
        …/youtube/{meta,status,status-all,sync,db-sync,upload,thumb}

── 세력도감 전용 ── **전량 폐기(26.07.25)**
~~/api/[series]/faction-{episode,cards,image,image-folder,avatar,music,sfx,comment,card-export,open-folder}~~  → web-bo `api/faction/**`
~~/api/faction/db-sync/{status,publish}~~                                                  → web-bo 서버 액션 `actions/admin/factions/publish.ts`
/api/[series]/cards/[name]        ← 유지. 서재 탐방 카드뉴스다(디스크 파일명만 faction-cards.json)
/api/[series]/music               ← 신설. 담화가 부르던 곡 목록 창구가 세력도감 전용이라 원래도 404였다

── 미디어 ──
/api/[series]/{images,videos,music,soundeffect,folders}/[...path]  ·  /api/rm-asset/[...path]  ·  /api/open-folder
/api/elevenlabs/voices            ← 유지(서재 탐방 보이스 매핑). voice-history·voice-notes 는 26.07.25 폐기
```

**폐기·미구현**:
- `POST /api/voice/upload` · `POST /api/voice/pull` · `GET /api/voice/status` · `GET /api/infra/r2/summary` — R2 폐기로 전부 무효
- `GET/PUT /api/lineup/:series`(편성 데이터) — 미구현. 같은 이름의 `/api/[series]/youtube/lineup`은 **편성이 아니라 유튜브 업로드 기록**이다. 아래 편성표 절 참조

---

## 다국어 영상

### 채널 전략

| 채널 | 언어 | 용도 |
|------|------|------|
| Feel & Note | 한국어 | 기존 채널 |
| Feel & Note EN | 영어 | 신설. 동일 구글 계정에서 채널 추가 |

한 채널에 한국어/영어를 섞으면 알고리즘 성과가 떨어진다. 언어별 채널 분리가 표준이다(Kurzgesagt, TED 등).

영상 내부에 텍스트(자막, 라벨, 책 제목, CTA)가 직접 렌더링되므로, 유튜브 CC 자막으로 대체 불가. **영문 에피소드를 별도 렌더**해야 한다.

### 파일 구조

**실측 (26.07.16)** — 로케일별 별도 파일 원칙은 채택됐으나, 파일명이 `{name}.en.json`이 아니라 **인물 폴더 안의 `{종류}.{locale}.json`**이다:

```
public/episodes/alexander-the-great/
  meta.ko.json / meta.ko.timing.json      ← 한국어 (기본)
  meta.en.json / meta.en.timing.json      ← 영어
  books/<책>.ko.json / <책>.en.json
  shorts/ko-1.json / en-1.json
  voice/ko/ · voice/en/
```

에피소드 ID는 `alexander-the-great`(ko) / `alexander-the-great-en`(en)으로 표현하고, `parseEpisodeId()`가 person·locale로 분해한다. 옛 구조 `{person}/ko.json`·`{person}/en.json`도 호환 인식한다. 영문 메타는 26.07.16 기준 12개 인물에 실재한다.

로케일별 별도 파일. 한 파일에 통합하지 않는다:
- 한국어/영어의 문장 수, 길이, TTS duration이 전혀 다르다
- 영어 에피소드는 번역이 아니라 재작성이다 (문화적 맥락, 어투)
- 기존 스크립트에 `--locale en` 플래그만 추가하면 된다

### 영문 에피소드에서 달라지는 것

| 항목 | 한국어 | 영어 |
|------|--------|------|
| 나레이터 TTS | Kore (ko-KR) | Gemini Journey / Cloud en-US |
| 요약맨 TTS | Charon (ko-KR) | Gemini Puck / Cloud en-US |
| 셀럽 TTS | ElevenLabs | ElevenLabs (동일 보이스 가능) |
| 화면 라벨 | "핵심 요약" / "감상 배경" | "Key Summary" / "Why They Read It" |
| 브랜드 | FEEL & NOTE | 동일 |
| CTA | "Feel & Note 앱에서 만나보세요" | "Discover more at feelandnote.com" |
| quotePairs[].quote | 한국어 번역본 | **영문 원전에서 인용** (번역 금지) |

### 영문 에피소드 생성 파이프라인

```
1. 한국어 에피소드 완성 (기존 흐름)
      ↓
2. AI 번역 + 재작성 → .en.json 생성
   - celebIntro: 영문 위키백과 톤
   - philosophy: 1인칭 영문 재작성
   - summary/contextMain: 영어 자연어순
   - quotePairs[].quote: 영문 원전 조회 (번역 아님!)
      ↓
3. 수동 검수 (특히 quotePairs[].quote 원전 확인)
      ↓
4. 영문 TTS 생성 (--locale en)
      ↓
5. 영문 렌더 (동일 Composition, locale prop)
```

### Remotion 코드 변경

최소한의 변경. 에피소드 JSON이 이미 모든 텍스트를 담고 있으므로 — **실측 (26.07.16): 아래 4건 모두 구현됨** (형태는 일부 다름):

- ✅ 라벨/CTA 분기 — `compositions/BookRecommend/i18n.ts`에 UI 문자열 사전(`labelSummary`·`labelContext`·`brandSubtitle`·섹션 명칭 등)을 두고 로케일로 고른다. `BookRecommend.tsx`의 `locale` prop이 아니라 스크립트의 로케일을 따르는 방식
- ✅ `Root.tsx`: 로케일별 Composition 자동 등록 — `{Label}En`이 아니라 **`{label}-{KO|EN}-…-VID`** 명명. 에피소드 키의 `-en` 접미사로 `lang`을 뽑아 KO/EN을 함께 등록한다. **단, 세력도감(Faction) EN 컴포지션은 주석 처리된 미사용 상태**다(한국어만 렌더)
- ✅ TTS 영문 분기 — `--locale en` 플래그가 아니라 **`--episode {name}-en`** 으로 받는다. `2-synthesize/cli.ts`가 `EP_LOCALE`을 뽑아 `voice/{locale}/`·`common/voice/{locale}/`로 가르고, `jobs.ts`가 `EP_LOCALE === 'en'`으로 인트로·아웃트로·보이스를 분기한다
- ✅ `render-all.ts`: 로케일별 출력 분리 — `meta.{locale}.json` 로드 + 로케일별 출력 파일

### remotion-bo 반영

**실측 (26.07.16)**:

- ✅ 로케일 배지 — 시리즈 홈 에피소드 행에 `EN` 배지. 영문판이 있으면 링크(초록), 없으면 흐리게. 사이드바는 ko/en을 한 인물로 묶되 배지는 두지 않는다(🇰🇷/🇺🇸 국기 대신 `EN` 텍스트)
- ⏸ "영문 버전 생성" 버튼 — 미구현. 영문판 생성은 스킬(`remo-i18n-episode`)로 처리한다
- ⏸ 편성표 로케일 진행 상태 — 편성표 자체가 미착수. 다만 `/[series]/youtube` 현황판이 ko/en variant별 상태를 보여줘 실질을 대신한다
- ❌ R2 경로 — 폐기

---

## 기술 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| DB 접근 | Supabase 직접 연결 (anon key, 읽기 전용) | web-bo와 동일 URL/키. 환경변수 공유, 타입은 독립 정의 |
| 상태 관리 | React state + fetch | 로컬 도구. 복잡한 상태관리 불필요 |
| 에피소드 저장 | 파일 기반 — 실제: `public/episodes/{person}/meta.{locale}.json` (책 기반) · `public/discourses/{ep}/discourse-data.json` | Remotion이 파일을 직접 import. DB화하면 빌드 파이프라인 복잡해짐 |
| 세력도감 저장 | **Supabase 5테이블(단일 원천) + `faction-data.json` 내보내기**(26.07.25) | 렌더가 빌드타임에 파일을 동기 스캔하므로 DB 직접 fetch는 기각. 파일은 산출물로 강등하고 편집은 web-bo에서 한다 |
| 편성 데이터 | ⏸ 미착수 (`lineup.json` 구조화 안 됨) | 편성표 자체가 미착수. 실재하는 `youtube-lineup.json`은 업로드 기록이라 별개 |
| 렌더 큐 | 인메모리 유지 (`globalThis.__tasks`) — 파일 영속화 미착수 | 초기는 간단하게, 규모 커지면 전환 |
| 시리즈 확장 | 레지스트리 패턴 + `dataModel` 축 | 새 시리즈 = 정의 1개 추가. UI/라우팅/IO 자동. 하드코딩 id 분기 금지 |
| AI 초안 | ⏸ BO 내 연동 미착수 — 실제는 Claude 스킬(`remo-write-*`·`remo-i18n-episode`)이 담당 | 수백 에피소드를 수동 작성하는 건 비현실적 |
| 다국어 | 로케일별 별도 파일 — 실제 명명은 `meta.{locale}.json`, 에피소드 ID는 `{person}-en` | 번역이 아니라 재작성. duration/문장 구조가 달라 통합 불가 |
| 음성 보관 | 로컬 보관소 `voice-archive/` 이동·복원 (R2 폐기 대체) | 클라우드 동기화 대신 디스크 압박만 해소 |
| 유튜브 채널 | 언어별 분리 (KR + EN) | 알고리즘 최적화. 영상 내 텍스트가 렌더링되므로 CC 자막 대체 불가 |

---

## 구현 현황

> **26.07.16 전면 재실측.** 이전 판정은 Phase 4·5를 "미착수"로 적어 두고 있었으나 실제로는 대부분 완료였다. 아래는 코드 대조 결과다.
>
> 범례: ✅ 완료 · 🔀 다른 형태로 완료(기획안과 구현 형태가 다름) · ⏸ 미착수 · ❌ 폐기

### Phase 1: 구조 잡기 ✅ 완료

1. ✅ 헤더 + 2단 사이드바 (1단: 시리즈 아이콘, 2단: 에피소드 목록) — 헤더의 R2 표시기만 ❌ 폐기
2. ✅ 시리즈 레지스트리 (`lib/series-registry.ts`)
3. ✅ 라우팅 재구성 (`/[series]/[name]` 패턴)
4. 🔀 에피소드 디렉토리 — `episodes/book-recommend/` 하위 이동은 **하지 않았다**. 실제는 `public/episodes/<인물>/meta.{locale}.json` + `_status.json` 진척도, 세력도감·담화는 `public/factions/`·`public/discourses/` 각자 최상위. 시리즈 구분은 경로 프리픽스가 아니라 `dataModel` 축이 맡는다
5. ✅ 대시보드 시리즈 현황 카드 — ◐(음성)은 동작. ●(R2 동기화 수)는 폐기 후 항상 0인 죽은 표시

### Phase 2: 인물 연동 ✅ 완료 (AI 초안 미착수)

6. ✅ Supabase 연결 (anon key 읽기 전용)
7. ✅ 셀럽 검색 API (`/api/celebs/search`, `/api/celebs/[slug]`, `/api/celebs/exists`, `/api/celebs/[slug]/voice`)
8. ✅ 인물 검색 페이지 (`/search` — 직군·음성 필터, 에피소드 존재 여부 표시)
9. ✅ 에피소드 스캐폴딩 (`POST /api/[series]/episodes` — DB→JSON 뼈대 생성). 전용 페이지 `/[series]/new`는 두지 않고 시리즈 홈에서 호출
10. ⏸ AI 초안 (philosophy, summary, contextMain, celebIntro) — 스캐폴딩이 해당 필드를 빈 문자열로 두는 상태 그대로. 실제 초안은 Claude 스킬(`remo-write-*`)이 맡고 있어 BO 내 LLM 연동은 여전히 미착수

### Phase 3: 편성 관리 — 대부분 미착수

11. ⏸ lineup.json 구조화 (phases / rivalGroups / politicalBalance) — 미착수. 동명의 `youtube-lineup.json`은 **유튜브 업로드 기록**이라 이 항목과 무관
12. 🔀 편성표 UI — 기획된 편성표(`/[series]/lineup`)는 미착수. 대신 `/[series]/youtube` 업로드 현황판이 구현돼 ko/en × 롱폼/쇼츠 variant별 영상·자막·썸네일 보유와 업로드·동기화 상태를 보여준다
13. ✅ 에피소드 상태 추적 (사이드바 ●/◐/○) — 구현 완료 (`components/Sidebar/StatusIcon.tsx`)

### Phase 4: 시리즈 확장 ✅ 대부분 완료

**판정 정정 (26.07.16)**: 종전 "미착수" 표기는 오류였다. 26.06.04 "시리즈 다중화·Faction·Solo 백오피스 개편"으로 레지스트리가 `dataModel` 축까지 갖춰 다중 시리즈를 굴리고 있다.

14. 🔀 시리즈 레지스트리 확장 — **서비스 소개는 등록되지 않았고**, 대신 **세력도감(`faction`)·가상 담화(`discourse`)** 2종이 등록돼 운영됐다. 각 정의가 `dataModel`·`episodeHome`·`langTabEditor`·`render.codec`을 갖고, 시리즈별 편집기(`FactionEditor`·`DiscourseEditor`)·전용 API·전용 IO가 붙어 있었다. 기획의 "새 시리즈 = 정의 1개 추가" 원칙은 실제로 성립했고, **정의 1개를 지우는 것으로 세력도감 폐기도 성립했다**(26.07.25 — 지금 등록 시리즈는 서재 탐방·담화 2종)
16. ⏸ 사이드바 2단 에피소드 목록 가상 스크롤 — 미착수. 윈도잉 없이 전량 렌더한다

### Phase 5: 다국어 ✅ 대부분 완료

**판정 정정 (26.07.16)**: 종전 "미착수" 표기는 오류였다. 영문 에피소드(`meta.en.json`)가 12개 인물에 실재하고, 로케일 축이 파일·스크립트·Composition·BO 전반에 관통해 있다.

17. 🔀 에피소드 JSON 로케일 체계 — 완료. 단 파일명은 `{name}.en.json`이 아니라 `meta.{locale}.json` / `books/<책>.{locale}.json` / `shorts/{locale}-{N}.json`. 에피소드 ID는 `-en` 접미사
18. 🔀 라벨/CTA 분기 — 완료. `compositions/BookRecommend/i18n.ts` 문자열 사전. `locale` prop이 아니라 스크립트 로케일 기반. `Root.tsx`가 `{label}-{KO|EN}-…-VID`로 KO/EN Composition을 자동 등록. **세력도감 EN Composition은 주석 처리된 미사용 상태**
19. 🔀 영문 TTS — 완료. `--locale` 플래그가 아니라 `--episode {name}-en`으로 받아 `cli.ts`의 `EP_LOCALE`이 `voice/{locale}/`·`common/voice/{locale}/`를 가르고, `jobs.ts`가 영문 인트로·아웃트로·보이스를 분기
20. 🔀 영문 재작성 파이프라인 — BO 기능이 아니라 Claude 스킬 `remo-i18n-episode`(+`remo-write-7-translation`)로 구현. quotePairs 원전 조회 원칙 포함
21. 🔀 로케일 배지 ✅ / "영문 버전 생성" 버튼 ⏸ — 시리즈 홈 행에 `EN` 배지(있으면 링크·없으면 흐리게). 버튼은 없고 스킬로 생성

### Phase 6: 인프라 고도화 — 미착수·폐기

22. ❌ R2 시리즈별 집계 + 용량 추이 + 한도 알림 — 폐기(26.03.23). **대체 구현**: 음성 저장소(`voice-archive`) — 로컬/보관소 집계, 상태 4종, 선택 일괄 이동. 26.04.01 `84f06090` 완료
23. ⏸ 렌더 큐 파일 영속화 + 배치 렌더링 — 미착수. 작업 큐는 `globalThis.__tasks` 인메모리 Map 유지
24. ❌ 해시 캐싱 (대규모 R2 동기화 성능) — 폐기(R2 종속)

### 기획서에 없던 구현 (26.07.16 실측)

문서가 따라잡지 못한 실제 기능들:

- **음성 저장소** — `voice-archive` 보관/복원 (Phase 6-22 대체)
- **유튜브 파이프라인** — 업로드·메타 갱신·동기화 검사(drift 탐지)·DB 동기화·썸네일 (`/[series]/youtube`, `/[series]/[name]/youtube`)
- **카드뉴스** — `/[series]/[name]/cards`(서재 탐방). 세력도감 카드 편집·내보내기는 web-bo로 이관(26.07.25)
- **음성 정밀 편집** — 발화 시각 편집기(`VoiceTimingEditor`), 파형 재생기, 호흡 편집, Gemini/ElevenLabs 미리보기. ElevenLabs 보이스 이력·메모 창구는 세력도감 전용이라 26.07.25 폐기
- **담화 전용 편집기** — 담화는 **원고 중심**(26.07.21 개편 — 원고 위에서 경계 마킹으로 발언·덩어리 파생, 상세는 `docs/project/remotion/discourse.md` §9). 세력도감 편집기(인물 명단·그룹·이미지 풀·음성 패널)는 web-bo로 이관 후 삭제됐다
- **작업 완료 인물 보관소** — `D:/remotion_done` 폴백 스캔 (26.07.16 교정. 옛 기본값 `D:/done_people`는 실재하지 않는 폴더였다)
- **가이드 페이지** — `/guide` (내용에 R2 설명이 남아 있어 실제와 어긋난다)

---

## 코드 구조

### 디렉토리 (실측 26.07.16 — 골자만)

```
sw/remotion-bo/src/
├── app/
│   ├── layout.tsx                    ← 루트 레이아웃 (헤더 + 사이드바 + main)
│   ├── page.tsx                      ← 대시보드 (시리즈 현황 카드)
│   ├── search/page.tsx               ← 인물 검색 (Supabase 셀럽)
│   ├── guide/page.tsx                ← 사용 가이드 (R2 설명 잔존 — 실제와 어긋남)
│   ├── [series]/
│   │   ├── page.tsx                  ← 시리즈 홈 (에피소드 목록 · 후보 풀 · 저장소 탭)
│   │   ├── youtube/page.tsx          ← 유튜브 업로드 현황판
│   │   └── [name]/
│   │       ├── layout.tsx            ← EpisodeProvider + TabNav (책 기반)
│   │       ├── page.tsx              ← episodeHome 리다이렉트
│   │       ├── scenario|voice|render|youtube|cards/page.tsx
│   │       └── [lang]/[tab]/…        ← 담화 편집 (세력도감·card/ 하위는 26.07.25 삭제)
│   └── api/
│       ├── [series]/                 ← episodes · voice(+storage) · render · youtube
│       │                                discourse-voice · cards · music · 미디어
│       ├── celebs/                   ← search · [slug] · exists · [slug]/voice
│       ├── elevenlabs/               ← voices (voice-history · voice-notes 는 폐기)
│       └── tasks/                    ← GET 작업 큐
├── components/
│   ├── Header.tsx · Sidebar/ · TabNav.tsx · TaskPanel.tsx
│   ├── VoiceStorage.tsx              ← 음성 저장소 (R2 대체)
│   ├── ScenarioView/ · scenario/ · scenario-voice/ · EpisodeEditor/
│   ├── VoiceTimingEditor/ · YouTubePanel/
│   └── discourse/                    ← 가상 담화 편집기 (faction/ 은 26.07.25 삭제,
│                                        shared/holdMotion.ts 만 discourse/ 아래로 옮겼다)
└── lib/
    ├── series-registry.ts            ← 시리즈 정의 + dataModel 축 (faction 제거 = 폐기 스위치)
    ├── server-utils.ts               ← 파일 I/O · VOICE_ARCHIVE (작업 큐는 shared/bo/task-queue)
    ├── media-root.ts                 ← 시리즈 이름 → 에피소드 폴더 뿌리
    ├── discourse-*.ts                ← 시리즈별 타입·IO·음성 (faction-*.ts 5종 삭제)
    ├── faction-edit-route.ts         ← 이름만 유산. 담화가 쓰는 언어·탭 공용 상수다
    ├── episode-context.tsx · episode-data.ts
    └── supabase.ts                   ← Supabase anon 클라이언트
```

### 핵심 설계

- **시리즈 확장**: `series-registry.ts`에 정의 1개 추가 → UI/라우팅/API 자동 대응. 시리즈별 차이는 코드 분기가 아니라 정의 필드(`dataModel`·`episodeHome`·`langTabEditor`)로 표현한다
- **에피소드 파일 기반**: `public/episodes/{person}/meta.{locale}.json` 외 (DB 아닌 파일). 진척도는 폴더 위치가 아니라 `_status.json`
- **Supabase 읽기 전용**: 셀럽 프로필·도서만 조회. 쓰기는 JSON 파일로
- **스캐폴딩**: DB → JSON 뼈대 자동 생성. AI 초안 필드는 빈 문자열 (Claude 스킬이 채운다)
- **음성은 로컬 전용**: 클라우드 동기화 없음. 용량은 `voice-archive` 보관으로 관리
