# 코드 규칙

> **최종 실측 체크: 26.07.16** — 사용자 노출 용어 규칙만 회수(부분 점검. 문서 전체를 실측 대조하지는 않았다)

## 필수
- 파일당 200줄 이하
- if/else보다 삼항식, switch보다 객체 맵핑
- early return 적극 활용
- 컴포넌트 조건부 렌더링은 && (삼항 금지)
- any, Record<string, unknown> 금지
- ENUM은 "ENUM_" 접두사 + 언더바 형식
- 아이콘: lucide-react (범용)
- **여러 행을 읽는 조회는 `selectAllPages`(`@feelandnote/shared/lib/paginate`)로 나눠 받고 고유 키까지 정렬한다.** PostgREST는 한 응답을 1,000행에서 자르고 `.limit(2000)`으로도 뚫리지 않는다 — 잘려도 오류가 나지 않아 화면이 조용히 틀린다(26.09.14 세력도감 테마마다 4명). `.in()`에 id를 수백 개 넣으면 주소 길이로 실패하니 200개씩 나눈다. 세력 명단은 `selectVisibleAtlasMembers`(`@/lib/faction-atlas-members`)를 쓴다.

## 컴포넌트
- left/right 대신 start/end
- **조작용 요소(버튼·카드·칩)의 hover는 즉각 반응** — transition/delay 금지, 위로 뜸·확대 등 이동 지양. 상세는 아래 "상호작용" 참조
- 반복 UI는 상수 배열 + map 렌더링
- 일반 모달의 최대 높이는 `sw/web/src/components/ui/modalLayout.ts`를 따른다. 개별 화면에 뷰포트 높이 상한을 다시 쓰지 않으며, 내부 목록은 모달의 남은 높이에서 스크롤한다. 전체 화면 뷰어만 `Modal.fullScreen` 또는 전용 전체 화면 구현을 사용한다.
- 색 클래스는 `sw/web/src/app/globals.css`의 `@theme` 토큰 이름만 쓴다(`bg-bg-card`·`bg-bg-main`·`bg-bg-stone-light`·`text-text-tertiary`·`border-border`·`text-status-paused`·`accent`). 다른 디자인 체계의 이름(`bg-surface`·`bg-primary`·`bg-background`·`text-muted`)은 CSS가 만들어지지 않아 바탕이 투명해지거나 부모 글자색을 물려받는다. 새 색이 필요하면 `@theme`에 먼저 정의한다
- Tailwind 클래스는 문자열 리터럴이나 상수에 통째로 둔다. 템플릿 문자열에서 `${` 바로 앞에 붙은 토큰(`` `… lg:contain-size${x}` ``)은 스캐너가 뽑지 못해 CSS가 나오지 않는다. 조건부 클래스는 상수를 공백으로 잇는다
- 접힌 본문(「더 보기」·끝 흐림·화면이 허락하는 만큼 채우기)은 `@/hooks/useClippedText`의 조합을 따른다. 줄 수를 미리 박지 않는다

## 구획별 독립 레인 · Suspense + i18n (필수)
- 색인 대상 화면도 `Suspense`·`Lane`으로 준비된 구획부터 스트리밍한다. 이름·소개 등 핵심 본문은 서버에서 생성하고, 최종 HTML에 본문·실제 링크·JSON-LD가 있는지 확인한다. `next.config.ts`의 `htmlLimitedBots`는 Googlebot·Yeti의 메타데이터를 기다리게 하며, 본문은 `lib/render-mode.ts`와 `Lane`이 완성 렌더를 선택한다. UA 판별은 데이터 캐시 밖에서만 하고, 완성 HTML의 정적 ISR을 유지하는 화면에는 적용하지 않는다.
- 인물 상세는 `connection()`으로 첫 요청에도 스트리밍하고 공개 조회는 데이터 캐시를 유지한다. 익명 HTML 앞단 캐시는 외부 서비스 문서가 쥔다. 정적 ISR 페이지는 캐시가 비었을 때 완성 렌더까지 기다리므로 `loading.tsx`만 붙여 첫 방문 지연을 해결했다고 판단하지 않는다.
- 구획은 실패·0건에도 자리를 지킨다. 조회 실패는 구획 async 컴포넌트가 try/catch로 잡아 `RetryBlock`을 그린다(Lane에는 에러 경계가 없다 — 던지면 봇 응답 전체가 죽는다). 대기 자리는 `PendingBlock`(잿빛 맥동 블록·스피너를 새로 만들지 않는다), 첫 화면 밖 + 색인 가치 없음 + 비쌈을 모두 만족하는 구획만 `Deferred`로 뷰포트 근접 시 클라이언트 조회.
- `Lane`은 서버 전용이라 `pending/index.ts` 배럴에 없다. 클라이언트 파일은 배럴(`PendingBlock`·`RetryBlock`·`Deferred`·`LinkPending`)만 쓴다.
- Suspense 내부의 비동기 서버 컴포넌트가 클라이언트 컴포넌트를 렌더링할 때, `AsyncIntlProvider`로 감싼다(Lane은 자동으로 감싼다)
- Next.js 16 스트리밍 SSR에서 `NextIntlClientProvider` 컨텍스트가 Suspense 경계를 넘지 못하는 문제 해결
- 위치: `@/components/shared/AsyncIntlProvider`
```tsx
// 올바른 패턴
async function Content() {
  const data = await fetchData();
  return (
    <AsyncIntlProvider>
      <ClientComponent data={data} />
    </AsyncIntlProvider>
  );
}
export default function Page() {
  return <Suspense fallback={<Skeleton />}><Content /></Suspense>;
}
```

- **개발 서버에서만 나는 간헐 500**: 「Failed to call `useTranslations` … `NextIntlClientProvider` was not found」·「No intl context found」가 같은 화면에서 어쩌다 한 번씩 나면(봇 경로 기준 10~20%) 코드가 아니라 오래 돈 개발 서버(Turbopack)의 모듈 묶음이 꼬인 것이다. 폴더 개명·파일 삭제가 많이 쌓인 뒤에 나타나고 「module factory is not available」 오류가 같이 보인다. 개발 서버를 다시 띄우면 사라진다. 운영 빌드는 webpack이라 넘어가지 않는다.
- 의심되면 운영 방식으로 확인한다: `sw/web`에서 `NEXT_DIST_DIR=.next-verify npx next build --webpack`(개발 서버의 `.next`와 부딪히지 않는다) → `.next-verify/standalone/sw/web/server.js`를 `PORT=3100 HOSTNAME=localhost`·`node --env-file=.env`로 띄워 요청한다. `HOSTNAME`을 `127.0.0.1`로 두면 모든 요청이 자기 자신으로 307을 낸다. 연속 요청은 1초 이상 띄운다 — 개발 서버에 화면을 짧은 간격으로 백 번 넘게 요청했다가 서버가 죽은 일이 있다(26.09.18).
- `.next/types`에 옛 빌드의 생성물이 남으면 없어진 경로를 가리켜 `tsc`와 검증 빌드의 타입 단계가 가짜 오류로 멈춘다. 개발 서버는 `.next/dev/types`를 쓰므로 `.next/types`는 치워도 된다.

## 주석/경로
- 한국어, JSDoc 금지, region/endregion 그룹화
- 대규모 외부: 절대경로(@/), 소규모 내부: 상대경로(./)

# 디자인 시스템

**시각 테마 — 밤의 아카이브.** 인물·작품·감상 기록을 어두운 공간에서 하나씩 발견하고 읽는 경험을 지향한다. 넓은 어두운 면은 콘텐츠가 머무는 자리로 두고, 따뜻한 금빛은 선택·연결·발견의 순간에 집중한다. 이미지의 주조 청동 질감은 이 테마의 한 표현법인 [`FNN-흑동주조`](../production/prod-01-image-generation.md#fnn-흑동주조)를 따른다. 사진·표지·본문은 각각의 내용이 먼저 읽히게 한다.

## 컬러
값은 `globals.css`의 `@theme`만 쥔다. 여기에는 쓰임만 적는다.
- 표면은 선을 긋기보다 명도 한 단씩으로 나눈다: `bg-secondary`(헤더·풋터) < `bg-main`(바탕) < `bg-card`(카드) < `bg-raised`(칩·입력·보조 버튼) < `bg-stone-light`(눌림·빈 표지). `stone-heavy`·`stone-light`는 같은 값을 가리키는 옛 이름이다
- 선은 두 단계뿐이다: `line`(흰색 7% — 기본 구분선·카드 테두리), `line-strong`(흰색 13% — hover·강조). 흰색을 얹는 방식이라 인물 상세의 세계 테마 바탕 위에서도 맞는다
- 금색(`accent`)은 세 자리에만 쓴다 — 화면당 주요 행동 하나의 면(`Button primary`), 선택·현재 위치(밑줄·`bg-accent/10`), 발견·연결(인물명·작품 링크). 상자마다 금 테두리를 두르거나 금빛 번짐을 넣지 않는다. amber 계열로 두 번째 금색을 만들지 않는다
- 텍스트: `text-primary`·`text-secondary`·`text-tertiary`
- 상태: `status-watching`·`status-completed`·`status-paused`(위험 동작에도 쓴다)·`status-wish`

## 정렬
- 허브·홈의 머리(배너 제목, 구획 제목·부제, 목차, 모드 탭, 오늘의 인물 머리)는 **가운데 정렬**이 이 서비스의 기본 문법이다. 한 화면에서 일부 머리만 왼쪽으로 돌리지 않는다 — 가운데와 왼쪽이 섞이면 둘 다 어긋나 보인다
- 여러 줄로 읽는 본문(소개·감상배경·게시글)은 가운데 영역 안에서 왼쪽 정렬한다. 한두 줄짜리 부제·안내만 가운데로 둔다
- 카드 안의 제목·제작자는 가운데, 카드 안 본문은 왼쪽이다

## 구분선
가로 구분선은 위 묶음을 끝맺는 표시다. **선 위는 위 내용 바로 밑에서 짧게 끊고, 선 아래는 새 항목을 넉넉히 띄워 시작한다**(아래 간격이 위 간격보다 크다). 위아래를 똑같이 띄우거나 위를 더 넓게 두면 선이 아래 항목의 머리처럼 보인다.

## 모서리
`rounded-control`(6px, 버튼·입력) · `rounded-card`(12px, 카드) · `rounded-panel`(16px, 모달·큰 판) 세 단계와 칩·아바타의 `rounded-full`만 쓴다. 누르는 것이 카드보다 더 각지면 안 된다.

## 레이아웃·반응형
- 뼈대 전환은 두 곳뿐이다 — `md`(768): 하단 탭 ↔ 헤더 메뉴, `xl`(1280): 옆 레일. 보이기·숨기기는 CSS(`md:hidden`)로 한다. 서버 HTML에 처음부터 들어가야 첫 화면에서 뒤늦게 튀어나오지 않는다
- 자바스크립트가 폭을 물어야 할 때(포털 자리 등록처럼 CSS로 못 가르는 일)만 `@/hooks/useMediaQuery`와 `@/constants/breakpoints`를 쓴다. `window.innerWidth`로 따로 재지 않는다
- 폭의 주인은 둘이다. 좌우 여백과 최대 폭은 `LayoutMain`의 틀이, 화면별 본문 폭은 `PageContainer`의 `width`가 쥔다. 홈·허브는 `default`를 공유하며 상한은 `globals.css`의 `--content-max-default`를 따른다. 인물 상세는 `detail`로 상한을 더 좁게 제한하되 기본 폭의 레일 여유를 지킨다. 페이지가 좌우 `px-*`를 따로 더하지 않는다
- 오른쪽 스와이프 판(`SwipeRail`)은 면 자체가 손잡이라 넓은 폭을 지킨다. 좁은 막대로 줄이지 않는다. 목차와 판이 서는 넓은 화면에서는 `default` 본문 폭이 판 자리(`--rail-reserve`)만큼 물러난다. 좌우 레일은 같은 본문 폭을 기준으로 바깥 여백 가운데에 선다
- 허브 배너(탐색·작품·광장·쉼터·기록관)는 모두 같은 높이(`bannerStyles.ts`의 `BANNER_COMPACT_HEIGHT_CLASS`)를 쓴다. 한 화면만 따로 줄이거나 키우지 않는다. 배너는 제목과 경로를 싣는 자리다 — 하위 화면은 상위 단계를 작은 경로 줄로, 지금 화면을 큰 제목으로 나눠 그린다(`BannerHeading`)
- 휴대폰·PC용으로 같은 내용을 두 벌 그리지 않는다. 한 벌을 두고 격자 칸 수만 바꾼다(`Footer` 참고). 카드처럼 놓이는 자리마다 폭이 다른 부품은 container query를 쓴다
- 화면 높이는 `svh`·`dvh`를 쓴다(`100vh`는 휴대폰 주소창만큼 넘친다). 화면 끝에 붙는 고정 요소는 `env(safe-area-inset-*)`를 받는다(`viewport-fit=cover`는 `[locale]/layout.tsx`가 선언)
- 누르는 칸은 최소 44px(`size-11`·`min-h-11`)이다. 아이콘이 작아도 칸을 줄이지 않는다

## 텍스트 색상 규칙 (필수)

| 용도 | 클래스 | 비고 |
|------|--------|------|
| 본문·제목 | `text-text-primary` | 기본 텍스트. Tailwind gray 계열(`text-gray-*`, `text-neutral-*`, `text-zinc-*`, `text-slate-*`) 사용 금지 |
| 보조·부제목 | `text-text-secondary` | |
| 강조·라벨 | `text-accent` | |
| 힌트·캡션 | `text-text-tertiary` | 메타정보, 타임스탬프 등 부가 정보에만 사용 |

**금지 사항**:
- 임의 hex/rgb 색상 직접 지정 금지. 반드시 `globals.css` @theme 토큰만 사용
- **opacity 남용 금지**: `text-text-secondary/60`, `text-accent/40` 등 불투명도를 낮춰 읽기 어렵게 만드는 패턴 금지. 가독성이 최우선이다
- 글자색에 `text-white/NN`도 쓰지 않는다 — 같은 불투명도 남용이다(`text-white/35`는 기본 바탕 대비 약 3:1로 기준 4.5:1에 못 미친다). 흐리게 할 글자는 `text-text-tertiary`까지만 내린다. 장식(구분선·아이콘·빈 얼굴 자리의 머리글자)과 비활성 상태는 예외다
- **글자 크기 하한은 11px이다.** `text-[9px]`·`text-[10px]`는 메타·캡션·배지에도 쓰지 않는다. 흐린 색과 작은 크기를 겹치면 대비 기준을 통과해도 읽히지 않는다
- 사용자가 읽어야 하는 텍스트(소개글, 명언, 설명문 등)에 `text-xs`(12px) 이하 사용 금지. 최소 `text-sm`(14px) 이상
- "고급스러움 = 작고 흐린 텍스트"가 아니다. 선명하고 읽기 쉬운 것이 좋은 디자인이다

## 타이포그래피
- 공용 `FormattedText`는 짧은 인용·삽입구만 색과 굵기로 강조한다. 소개문이나 긴 인용을 통째로 강조하지 않으며, 따옴표와 원문은 보존한다. 판정 상한은 `formatted-text/emphasis.ts`가 쥐고 낭독 화면도 같은 판정을 쓴다.
- 사용자 웹 런타임 서체는 **Pretendard 하나**다. 한글·영문·숫자와 본문·제목·버튼을 나누지 않는다.
- `font-serif`·`font-cinzel`·`font-cormorant`·`font-maruburi`는 기존 클래스 호환용 이름일 뿐이며 모두 `--font-pretendard`를 가리킨다. 신규 코드에서는 `font-sans` 또는 상속을 쓴다.
- 시대·페이지·콘텐츠 종류를 이유로 별도 명조나 영문 장식 서체를 추가하지 않는다. 위계는 크기·굵기·간격·색으로 만든다.
- 굵기 위계: 페이지 제목 700 · 구획 제목 600 · 버튼·탭·메뉴 500 · 본문·입력값 400. `globals.css` 기본층이 이 값을 깔아 두므로 조작 요소에 `font-bold`를 따로 붙이지 않는다. `font-black`은 쓰지 않는다
- 옛 명조 시절의 넓은 자간(`tracking-widest`·`tracking-[0.3em]`)과 `uppercase` 영문 부제는 새로 쓰지 않는다. 그라데이션 글자(`bg-clip-text`)로 제목을 칠하지 않는다. 단, 로고(`Logo`)와 그 부제(YOUR CULTURAL LEGACY)는 브랜드 표식이라 이 규칙 밖이다 — 모양을 바꾸거나 화면에서 빼려면 사용자 확인을 받는다

## 효과/텍스처
- 공용 판(`ClassicalBox`·기본 `Modal`)은 카드 면 + `line` 테두리 + `rounded-panel` + 얕은 그림자 하나다. 금 이중선·모서리 꺽쇠·비네트는 두지 않는다. 인물 상세의 세계 테마는 `--world-panel-texture`로 판 결만 얹는다
- `bg-texture-*`·`effect-bevel/engraved`·`card-sarcophagus`·`engraved-plate`·`text-3d-*`·`shadow-glow`는 남은 화면 호환용이다. 새 화면에 쓰지 않고, 그 화면을 손대는 김에 걷어낸다

## Z-Index (`@/constants/zIndex.ts`)
```
background(-10) < base(0) < sticky(10) < cardBadge(20) < cardMenu(30) < fab(50)
< nav(100) < floatingPlayer(150) < dropdown(200) < tooltip(250)
< overlay(500) < modal(600) < toast(700) < top(9999)
```

## 상호작용

### 즉각 반응 원칙 (필수)
조작용 요소는 **손을 올린 즉시** 상태가 바뀌어야 한다. 클릭·조작을 유도하는 요소에 hover 지연·전환을 얹으면 반응이 굼떠 보인다.

- **대상**: 버튼, 카드, 칩 등 클릭·조작용 요소의 hover/active 피드백
- **최소 보장(핵심)**: 한 요소의 hover에 **지연 없이 즉시 바뀌는 반응이 최소 하나는 반드시 있어야 한다.** 보통 테두리·글자색·배경의 색 강조가 그 축을 맡는다. 이 축이 있으면 **곁들이는 연출은 애니메이션으로 돌려도 된다**(배경 확대, 장식 페이드인, 밑줄 차오름 등).
- **금지**: 즉각 축을 맡은 속성에 `transition-*`·`duration-*`·`delay-*` 부여 금지. 즉각 축이 **하나도 없는** 카드·버튼도 금지(전부 애니메이션이면 굼뜨다)
- **구현 요령**: 즉각 축과 연출 축을 **서로 다른 엘리먼트에 나눠 건다.** 한 엘리먼트에 `transition-all`을 걸면 즉각 축까지 딸려 느려진다. 연출 축에는 `transition-transform`·`transition-opacity`처럼 **속성을 특정**해 건다
- **허용(오해 주의)**: 애니메이션 자체를 막는 규칙이 아니다. **공간·레이아웃이 실제로 열리고 닫히는 전환**(사이드바 여닫기, 아코디언 펼침, 모달 등장, 페이지 전환)은 애니메이션이 본질이므로 `transition`을 그대로 쓴다
- **판별 기준**: "요소가 자기 상태를 강조하는가(→ 즉각 축)" vs "공간이 이동·개폐하거나 곁들이는 연출인가(→ 애니메이션)"
- **참고 구현**: `src/components/shared/HubCard.tsx` — 즉각 축(테두리·제목 금색) + 연출 축(배경 확대·모서리 장식·하단 금선)

### 값
- 호버: `hover:bg-white/5`, `hover:text-accent`, `hover:brightness-110` 등 **색·밝기 강조**를 transition 없이 즉시 적용
- **이동 지양**: hover 시 `-translate-y`(위로 뜸)·`scale`(확대) 같은 위치·크기 이동은 넣지 않는다. 색·상태 강조로 대신한다
- 활성: `bg-accent/10 text-accent`, 메뉴·탭의 현재 위치는 금색 밑줄 하나
- 비활성: `opacity-50 cursor-not-allowed`
- 반응형: 모바일 우선. 전환점은 위 「레이아웃·반응형」을 따른다

### 포커스 표시
브라우저 기본 포커스 테두리를 끄고 키보드 포커스에만 강조색 표시를 준다. 상세는 `ui-focus` 스킬.

### 가로 목록
손으로 밀어 넘기는 줄은 스크롤바를 숨기고, 터치는 브라우저 기본 스크롤에 맡기고, 칸 맞춤은 터치에만 건다. 상세는 `ui-rail` 스킬.

## 명칭 규칙 — 일상어로 짓는다 (26.08.01 방침 전환)

**사용자 화면이든 코드든 이름은 일상적인 말로 짓는다.**

예스럽고 문학적인 이름(유산·방명석·지혜의 결속 같은)은 초기 아이디어였고, 쌓이면서 **무엇을 누르면 무엇이 나오는지 알 수 없는 화면**이 됐다. 새 화면·기능에 이런 이름을 새로 붙이지 않는다. 기존 것은 손대는 김에 하나씩 일상어로 바꾼다.

- 새 개념에 **조어를 만들지 않는다.** 이미 있는 일상어에서 고른다
- 코드가 이미 부르는 이름이 있으면 **그것과 뜻이 같은 한국어**를 쓴다. 한국어만 따로 지어 붙이면 같은 것이 두 이름을 갖는다
- 이름 후보가 예스럽거나 문학적으로 들리면 그 자체가 신호다 — 일상어로 바꿔 다시 고른다
- 판정 기준: **처음 온 사람이 그 말만 보고 무엇인지 아는가.** 모르면 탈락이다

**기존 용어 정비는 진행 중이다.** 화면 문구를 실측해 40여 개를 찾았고, 서가 화면부터 손봤다(26.08.01).

| 화면·구획 | 옛 이름 | 정본 |
|---|---|---|
| `/explore/works` | 지혜의 서가·서가·서재 | **작품** / Works |
| `/explore/works/academy` | 지혜의 학당 / Academy of Wisdom | **학당** / Academy |
| `/explore/works/museum` | 콘텐츠의 연대기 / Chronicle of Content | **박물관** / Museum |
| `/explore/works/popular?mode=classics` | 불후의 명작 + 길의 갈래 | **불후의 명작** / Timeless Classics (베스트셀러는 26.09.28 작품 첫 화면 `/explore/works`로 옮겼다) |

「불후의 명작」(시대별)과 「길의 갈래」(직업별)는 **같은 자료를 다르게 자른 것**이라 26.08.02에 한 화면으로 합쳤다. 안에서 「시대별로 보기 / 직군으로 보기」로 전환하고, 시대별의 '전체' 탭이 모든 시대를 합친 순위다. 옛 주소 둘은 새 주소로 넘긴다.

화면이 참조하지 않는 죽은 문구 여섯 줄(공통 서가·갈림길·시대의 작품 등)도 함께 지웠다 — 남아 있어 실제 화면 이름인 줄 착각했다.

남은 것 — 지혜의 탐구자, 기록관(감상의·신들의·상세), 광장, 쉼터, 세력도감, 유산, 방명석, 지혜의 결속 등. 한 번에 바꾸면 화면·번역·주소가 한꺼번에 흔들리므로 **그 화면을 손대는 김에 하나씩** 옮긴다. 새로 짓는 이름만 위 규칙을 즉시 지킨다.

**이름이 정해진 것** (26.08.01)

| 무엇 | 이름 |
|------|------|
| 동그란 얼굴 | 아바타 |
| 인물 페이지 맨 위 큰 사진 | **대표 사진** (코드는 `hero-photo`·`portrait_url`) |
| 세력도감 인물 그림 | 개인화보 / 단체화보 |

「초상」은 아바타를 가리키는 자리에 이미 쓰여 대표 사진에는 쓰지 않는다. 자세한 자리 대응은 `docs/project/celeb/celeb-08-00-image-map.md`.

> 26.08.01 — 인물 페이지 맨 위 그림에 「표제화·행적사진·머리그림」 같은 조어를 후보로 냈다가 물렸다. 코드는 이미 `hero-photo`라 부르고 있었고 한국어로는 **대표 사진**이면 됐다. 사용자가 지적했다: "서비스 테마에 맞는 값 만드는 경향이 있다."

## 사용자 노출 용어 (필수)

코드 내부와 사용자 노출 텍스트의 용어를 분리한다. 새 화면·문구 작성 시 매번 적용한다.

**금지**
- 코드 내부 변수명·함수명의 `celeb`은 **절대 변경하지 않는다** (`getCelebCards`, `celeb_tier` 등)
- DB 테이블·컬럼명도 **변경하지 않는다**
- 기존 URL 삭제 금지 — 반드시 리다이렉트로 남긴다

**노출 용어**

| 용도 | 한국어 | English |
|------|--------|---------|
| 모든 사용자 노출 텍스트 | **인물** | **Figures** |
| Full 티어 구분이 필요할 때만 | 탐구자 | Seekers |
| Light 티어 구분이 필요할 때만 | 사색가 | Thinkers |

**대응표** (구용어 → 정본. 구용어를 새로 쓰지 않는다)

| 구 (ko) | 정본 (ko) | 구 (en) | 정본 (en) |
|----------|----------|----------|----------|
| 셀럽 | 인물 목록 | Celebs | Figures |
| 분야별 기록가 | 분야별 랭킹 | Top by Type | Ranking |
| 비범한 기록가 | 스펙트럼 | Extraordinary | Spectrum |
| 셀럽 피드 | 인물 피드 | Celeb Feed | Feed |
| 왕성한 기록가들 | 왕성한 감상가 | Prolific Chroniclers | Prolific Connoisseurs |
| 전체 기록가 | 전체 감상가 | All Chroniclers | All Connoisseurs |
| 전체 사색가 | 사색가 | All Thinkers | Philosophers |
| 비범한 기록가 | 비범한 인물 | Extraordinary Chroniclers | Extraordinary Figures |
| — | 오늘의 인물(유지) | Today's Figure | Today |
| 스포트라이트 | 세력도감 | Spotlight | Faction |

> 유래: 26.03 explore 용어 통폐합.
