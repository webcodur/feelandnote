---
name: nextjs-page
description: "Next.js App Router 페이지/라우트 생성·수정·삭제 시 자동 활성화. 페이지 생성, 라우팅 설정, 새 화면 추가, 메뉴 추가/변경, 네비게이션 구조 변경 요청 시 적용. navigation.tsx 단일원천(Single Source of Truth) 동기화를 보장한다."
---

# Next.js 페이지 생성 SEO 체크리스트

새 페이지(`page.tsx`)를 만들거나 라우트를 추가할 때 반드시 수행한다.

## 필수 (2개)

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

파일: `sw/web/src/app/sitemap.ts` > `id === 0` 블록에 추가:

```tsx
entry('/새-경로', 'weekly', 0.7),
```

## 참고

- Open Graph, Twitter Card → locale layout에서 기본 제공. 페이지별 override 가능.
- JSON-LD → 필요한 경우에만 추가 (셀럽, 콘텐츠 등 엔티티 페이지).
- OG 이미지 → 커스텀 필요 시 `opengraph-image.tsx` 생성.
