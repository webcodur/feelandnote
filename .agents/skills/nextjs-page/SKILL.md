---
name: nextjs-page
description: "Next.js App Router 페이지/라우트 생성·수정·삭제 시 자동 활성화. 페이지 생성, 라우팅 설정, 새 화면 추가, 메뉴 추가/변경, 네비게이션 구조 변경 요청 시 적용. navigation.tsx 단일원천(Single Source of Truth) 동기화를 보장한다."
---

# Next.js 페이지 체크리스트

새 페이지(`page.tsx`)를 만들거나 라우트를 바꿀 때 반드시 수행한다.

## SEO 필수 (2개)

### 1. `generateMetadata()`에 alternates 포함

```tsx
import { getAlternates } from '@/lib/seo'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: '페이지 제목',
    description: '설명',
    alternates: getAlternates('/새-경로'),
  }
}
```

- `getAlternates()`는 canonical + hreflang(ko, en, x-default)을 자동 생성한다.
- **이것이 빠지면 Google이 ko/en 페이지를 중복으로 판단한다.**

### 2. `sitemap.ts` 정적 라우트 등록

동적 라우트(셀럽 등)는 자동이지만, **정적 페이지는 수동 등록**이 필요하다.

파일: `sw/web/src/lib/sitemap.ts` > `staticPaths` 배열에 추가:

```tsx
['/새-경로', 'weekly', 0.7],
```

## 내비게이션 동기화

`sw/web/src/constants/navigation.tsx`가 메뉴의 단일원천이다. 페이지를 추가·수정·삭제하면 함께 갱신한다.

1. `navigation.tsx`를 읽어 현재 구조를 확인한다.
2. `sw/web/src/app/[locale]/(main)/` 아래에 라우트를 만든다. `page.tsx`는 라우팅과 최소 래핑만 맡고, UI는 `components/features/`로 분리한다.
3. 바뀐 경로에 해당하는 `NAV_ITEMS`, `WORKS_LINKS`, `FOOTER_SECTIONS`, `HOME_SECTIONS`를 갱신한다.
4. 헤더, 하단 내비게이션, 푸터, 홈에 의도대로 반영되는지 확인한다.

## 참고

- Open Graph, Twitter Card → locale layout에서 기본 제공. 페이지별 override 가능.
- JSON-LD → 필요한 경우에만 추가 (셀럽, 콘텐츠 등 엔티티 페이지).
- OG 이미지 → 커스텀 필요 시 `opengraph-image.tsx` 생성.
