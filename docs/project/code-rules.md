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

## 컴포넌트
- left/right 대신 start/end
- **조작용 요소(버튼·카드·칩)의 hover는 즉각 반응** — transition/delay 금지, 위로 뜸·확대 등 이동 지양. 상세는 아래 "상호작용" 참조
- 반복 UI는 상수 배열 + map 렌더링

## Suspense + i18n (필수)
- Suspense 내부의 비동기 서버 컴포넌트가 클라이언트 컴포넌트를 렌더링할 때, `AsyncIntlProvider`로 감싼다
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

## 주석/경로
- 한국어, JSDoc 금지, region/endregion 그룹화
- 대규모 외부: 절대경로(@/), 소규모 내부: 상대경로(./)

# 디자인 시스템

**컨셉**: 고대 신전의 권위 + 현대적 선명함. 다크 스톤 테마.

## 컬러
- 배경: `bg-main`(#121212), `bg-secondary`(#0a0a0a), `bg-card`(#1a1a1a), `stone-heavy/light`
- 액센트: `accent`(#d4af37 골드), `accent-hover`(#f9d76e), `accent-dim`(#8a732a)
- 텍스트: `text-primary`(#e0e0e0), `text-secondary`(#a0a0a0)
- 상태: watching(#3fb950), completed(#9e7aff), paused(#db4d4d), wish(#d4af37)

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
- 사용자가 읽어야 하는 텍스트(소개글, 명언, 설명문 등)에 `text-xs`(12px) 이하 사용 금지. 최소 `text-sm`(14px) 이상
- "고급스러움 = 작고 흐린 텍스트"가 아니다. 선명하고 읽기 쉬운 것이 좋은 디자인이다

## 타이포그래피
- 본문: Noto Sans KR (sans) / 제목·버튼: Noto Serif KR (serif)
- 영문 장식: Cinzel (권위), Cormorant Garamond (로고)

## 효과/텍스처
- `bg-texture-noise/marble`, `effect-bevel/engraved`, `card-sarcophagus`
- `shadow-glow`, `text-3d-gold/marble`, `engraved-plate`

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
- 활성: `bg-accent/10 text-accent`
- 비활성: `opacity-50 cursor-not-allowed`
- 반응형: 모바일 우선, `md:`(768px) 데스크톱

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
| `/library` | 지혜의 서가 | **서가** |
| `/library/academy` | 지혜의 학당 / Academy of Wisdom | **학당** / Academy |
| `/library/museum` | 콘텐츠의 연대기 / Chronicle of Content | **박물관** / Museum |
| `/library/popular` (신설) | 불후의 명작 + 길의 갈래 | **인기 작품** / Popular Works |

「불후의 명작」(시대별)과 「길의 갈래」(직업별)는 **같은 자료를 다르게 자른 것**이라 26.08.02에 한 화면으로 합쳤다. 안에서 「시대별로 보기 / 직군으로 보기」로 전환하고, 시대별의 '전체' 탭이 모든 시대를 합친 순위다. 옛 주소 둘은 새 주소로 넘긴다.

화면이 참조하지 않는 죽은 문구 여섯 줄(공통 서가·갈림길·시대의 작품 등)도 함께 지웠다 — 남아 있어 실제 화면 이름인 줄 착각했다.

남은 것 — 지혜의 탐구자, 기록관(감상의·신들의·상세), 광장, 쉼터, 세력도감, 유산, 방명석, 지혜의 결속, 감상 여정 등. 한 번에 바꾸면 화면·번역·주소가 한꺼번에 흔들리므로 **그 화면을 손대는 김에 하나씩** 옮긴다. 새로 짓는 이름만 위 규칙을 즉시 지킨다.

**이름이 정해진 것** (26.08.01)

| 무엇 | 이름 |
|------|------|
| 동그란 얼굴 | 아바타 |
| 인물 페이지 맨 위 큰 사진 | **대표 사진** (코드는 `hero-photo`·`portrait_url`) |
| 세력도감 인물 그림 | 개인화보 / 단체화보 |

「초상」은 아바타를 가리키는 자리에 이미 쓰여 대표 사진에는 쓰지 않는다. 자세한 자리 대응은 `docs/project/person-image-map.md`.

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

> 유래: 26.03 explore 용어 통폐합. 실행 이력은 `docs/archive/explore-restructure.md`.
