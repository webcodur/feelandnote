# Explore 용어·라우트 통폐합 — 실행 지시서

> 이 문서는 AI 에이전트가 순서대로 실행할 작업 목록이다.
> 각 STEP을 순서대로 수행하라. STEP 내의 작업은 병렬 가능하다.

---

## 목표

`/explore` 하위의 용어와 라우트를 통일한다.
- 사용자 노출 텍스트에서 "셀럽", "기록가" 등 혼재 용어를 "인물"로 통일
- 라우트 URL을 직관적 영문으로 변경
- 기존 URL은 리다이렉트로 보존

## 금지 사항

- 코드 내부 변수명/함수명의 `celeb`은 **절대 변경하지 않는다** (getCelebCards, celeb_tier 등)
- DB 테이블/컬럼명도 **변경하지 않는다**
- 기존 URL 삭제 금지 — 반드시 리다이렉트 페이지로 남긴다

## 용어 규칙

| 용도 | 한국어 | English |
|------|--------|---------|
| 모든 사용자 노출 텍스트 | **인물** | **Figures** |
| Full tier 구분이 필요할 때만 | 탐구자 | Seekers |
| Light tier 구분이 필요할 때만 | 사색가 | Thinkers |

---

## STEP 1: 라우트 파일 이동

아래 4개 디렉토리를 새로 만들고, 기존 페이지의 **내용을 그대로 복사**한다.

| 복사 원본 | 복사 대상 (신규 생성) |
|----------|---------------------|
| `sw/web/src/app/[locale]/(main)/explore/celebs/page.tsx` | `sw/web/src/app/[locale]/(main)/explore/figures/page.tsx` |
| `sw/web/src/app/[locale]/(main)/explore/top-by-type/page.tsx` | `sw/web/src/app/[locale]/(main)/explore/ranking/page.tsx` |
| `sw/web/src/app/[locale]/(main)/explore/figure/page.tsx` | `sw/web/src/app/[locale]/(main)/explore/today/page.tsx` |
| `sw/web/src/app/[locale]/(main)/explore/celeb-feed/page.tsx` | `sw/web/src/app/[locale]/(main)/explore/feed/page.tsx` |

복사 시 파일 상단 주석의 경로도 새 경로로 수정한다.

## STEP 2: 기존 라우트를 리다이렉트로 전환

복사 원본 4개 파일의 내용을 **전부 삭제**하고 아래 리다이렉트 코드로 교체한다.

**`explore/celebs/page.tsx`** → redirect to `/explore/figures`:
```tsx
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function CelebsRedirectPage() {
  const locale = await getLocale();
  redirect({ href: "/explore/figures", locale });
}
```

**`explore/top-by-type/page.tsx`** → redirect to `/explore/ranking`:
```tsx
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function TopByTypeRedirectPage() {
  const locale = await getLocale();
  redirect({ href: "/explore/ranking", locale });
}
```

**`explore/figure/page.tsx`** → redirect to `/explore/today`:
```tsx
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function FigureRedirectPage() {
  const locale = await getLocale();
  redirect({ href: "/explore/today", locale });
}
```

**`explore/celeb-feed/page.tsx`** → redirect to `/explore/feed`:
```tsx
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function CelebFeedRedirectPage() {
  const locale = await getLocale();
  redirect({ href: "/explore/feed", locale });
}
```

또한 기존 리다이렉트도 갱신한다:

**`scriptures/figure/page.tsx`** — 목적지를 `/explore/today`로 변경:
```tsx
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function FigureRedirectPage() {
  const locale = await getLocale();
  redirect({ href: "/explore/today", locale });
}
```

## STEP 3: navigation.tsx 수정

파일: `sw/web/src/constants/navigation.tsx`

explore의 subLinks를 아래로 교체한다:

```tsx
subLinks: [
  { key: "figures", href: "/explore/figures", label: "인물 목록" },
  { key: "ranking", href: "/explore/ranking", label: "분야별 랭킹" },
  { key: "persona", href: "/explore/persona", label: "인물 분석" },
  { key: "today", href: "/explore/today", label: "오늘의 인물" },
  { key: "spotlight", href: "/explore/spotlight", label: "스포트라이트" },
  { key: "feed", href: "/explore/feed", label: "인물 피드" },
],
```

## STEP 4: sitemap.ts 수정

파일: `sw/web/src/app/sitemap.ts`

아래 URL을 찾아서 교체한다:

| 찾기 | 바꾸기 |
|------|--------|
| `'/explore/celebs'` | `'/explore/figures'` |
| `'/explore/figure'` | `'/explore/today'` |
| `'/agora/celeb-feed'` | `'/explore/feed'` |

## STEP 5: i18n 메시지 — nav.json

### `sw/web/messages/ko/nav.json`

`nav.sub` 객체에서 아래 키의 **값**을 변경한다. 기존 키는 그대로 두고, 새 키를 추가하고 기존 키를 삭제한다:

```jsonc
// 삭제할 키
"celebs": "셀럽"
"celebFeed": "셀럽 피드"
"figure": "오늘의 인물"
"topByType": "분야별 기록가"

// 추가할 키
"figures": "인물 목록"
"ranking": "분야별 랭킹"
"today": "오늘의 인물"
"feed": "인물 피드"

// 값만 변경
"persona": "비범한 기록가"  →  "persona": "인물 분석"
```

### `sw/web/messages/en/nav.json`

동일 구조로:

```jsonc
// 삭제
"celebs": "Celebs"
"celebFeed": "Celeb Feed"
"figure": "Today's Figure"
"topByType": "Top by Type"

// 추가
"figures": "Figures"
"ranking": "Ranking"
"today": "Today"
"feed": "Feed"

// 값만 변경
"persona": "Extraordinary"  →  "persona": "Persona"
```

## STEP 6: i18n 메시지 — explore.json

### `sw/web/messages/ko/explore.json`

#### 메타 데이터 섹션

```jsonc
// 변경 전
"celebs": {
  "metaTitle": "셀럽 | 탐색",
  "metaDescription": "역사 속 위인부터 현대 문화 아이콘까지, 셀럽들의 감상 기록과 추천 작품을 탐색하세요."
}

// 변경 후
"celebs": {
  "metaTitle": "인물 목록 | 인물",
  "metaDescription": "역사 속 위인부터 현대 문화 아이콘까지, 인물들의 감상 기록과 추천 작품을 탐색하세요."
}
```

```jsonc
// 변경 전
"celebFeed": {
  "metaTitle": "셀럽 피드 | 인물",
  "metaDescription": "셀럽들의 최신 감상 기록과 리뷰를 실시간으로 확인하세요."
}

// 변경 후
"celebFeed": {
  "metaTitle": "인물 피드 | 인물",
  "metaDescription": "인물들의 최신 감상 기록과 리뷰를 실시간으로 확인하세요."
}
```

#### 탭 섹션 (`explore.ui.tabs`)

```jsonc
// 변경
"celebs": "셀럽"         →  "celebs": "인물 목록"
"celebFeed": "셀럽 피드"  →  "celebFeed": "인물 피드"
```

#### 허브 섹션 (`explore.hub`)

```jsonc
// 변경 전 → 변경 후
"deepReaders": "왕성한 기록가들"       → "왕성한 감상가"
"deepReadersSub": (그대로 유지)
"topByType": "분야별 최다 기록가"      → "분야별 랭킹"
"personaExtremes": "비범한 기록가"     → "비범한 인물"
"allCelebs": "전체 기록가"             → "전체 감상가"
"lightCelebs": "전체 사색가"           → "사색가"
"navCelebs": "전체 인물"               → "인물 목록"
"navTopByType": "분야별 기록가"        → "분야별 랭킹"
"navPersona": "비범한 기록가"          → "인물 분석"
"navFeed": "셀럽 피드"                 → "인물 피드"
```

### `sw/web/messages/en/explore.json`

#### 메타 데이터

```jsonc
"celebs": {
  "metaTitle": "Celebs | Explore"  →  "Figures | Explore"
  "metaDescription": (셀럽→인물 대응: "notable figures"로 교체)
}

"celebFeed": {
  "metaTitle": "Celeb Feed | Explore"  →  "Feed | Explore"
  "metaDescription": (celebs→figures 교체)
}
```

#### 탭

```jsonc
"celebs": "Celebs"        →  "celebs": "Figures"
"celebFeed": "Celeb Feed"  →  "celebFeed": "Feed"
```

#### 허브

```jsonc
"deepReaders": "Prolific Chroniclers"          → "Prolific Connoisseurs"
"topByType": "Top by Category"                 → (유지)
"personaExtremes": "Extraordinary Chroniclers"  → "Extraordinary Figures"
"allCelebs": "All Chroniclers"                  → "All Connoisseurs"
"lightCelebs": "All Thinkers"                   → "Philosophers"
"navCelebs": "All Figures"                      → "Figures"
"navTopByType": "Top by Category"               → "Ranking"
"navPersona": "Extraordinary"                   → "Persona"
"navFeed": "Celeb Feed"                         → "Feed"
```

## STEP 7: 내부 링크 참조 수정

아래 문자열을 프로젝트 전체(`sw/web/src/` 범위)에서 검색하여 교체한다.
**단, import 경로나 변수명은 건드리지 않는다. href, moreHref, Link 등 URL 문자열만 교체한다.**

| 검색 | 교체 |
|------|------|
| `"/explore/celebs"` | `"/explore/figures"` |
| `'/explore/celebs'` | `'/explore/figures'` |
| `"/explore/top-by-type"` | `"/explore/ranking"` |
| `'/explore/top-by-type'` | `'/explore/ranking'` |
| `"/explore/figure"` | `"/explore/today"` |
| `'/explore/figure'` | `'/explore/today'` |
| `"/explore/celeb-feed"` | `"/explore/feed"` |
| `'/explore/celeb-feed'` | `'/explore/feed'` |

**주의**: `/explore/figures`로 이미 바뀐 것을 다시 바꾸지 않도록 한다.

## STEP 8: 검증

1. `npx tsc --noEmit` — 타입 에러 없어야 함
2. 아래 URL이 정상 작동하는지 확인:
   - `/explore/figures` — 인물 목록 페이지
   - `/explore/ranking` — 분야별 랭킹 페이지
   - `/explore/today` — 오늘의 인물 페이지
   - `/explore/feed` — 인물 피드 페이지
3. 아래 URL이 리다이렉트되는지 확인:
   - `/explore/celebs` → `/explore/figures`
   - `/explore/top-by-type` → `/explore/ranking`
   - `/explore/figure` → `/explore/today`
   - `/explore/celeb-feed` → `/explore/feed`
   - `/scriptures/figure` → `/explore/today`

---

## 부록: 전체 용어 대응표

| 현재 (ko) | 신규 (ko) | 현재 (en) | 신규 (en) |
|----------|----------|----------|----------|
| 셀럽 | 인물 목록 | Celebs | Figures |
| 분야별 기록가 | 분야별 랭킹 | Top by Type | Ranking |
| 비범한 기록가 | 인물 분석 | Extraordinary | Persona |
| 오늘의 인물 | 오늘의 인물 (유지) | Today's Figure | Today |
| 스포트라이트 | 스포트라이트 (유지) | Spotlight | Spotlight (유지) |
| 셀럽 피드 | 인물 피드 | Celeb Feed | Feed |
| 왕성한 기록가들 | 왕성한 감상가 | Prolific Chroniclers | Prolific Connoisseurs |
| 전체 기록가 | 전체 감상가 | All Chroniclers | All Connoisseurs |
| 전체 사색가 | 사색가 | All Thinkers | Philosophers |
| 비범한 기록가 | 비범한 인물 | Extraordinary Chroniclers | Extraordinary Figures |
