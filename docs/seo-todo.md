# SEO TODO

---

## 사용자 수동 작업 (코드로 해결 불가)

### 1. 네이버 서치어드바이저 등록 (최우선)

한국어 사이트인데 네이버 인증이 없으면 네이버 검색 노출 자체가 안 된다.

1. [네이버 서치어드바이저](https://searchadvisor.naver.com/) 접속
2. 사이트 추가: `https://feelandnote.com`
3. 소유 확인 → HTML 메타태그 방식 선택 → 인증 코드 복사
4. `sw/web/src/app/layout.tsx`의 `verification` 블록에 추가:

```ts
verification: {
  google: "Rstp-6NcSTn3BTPnDH06HS5PN2goDih-CVNg",
  other: {
    "naver-site-verification": "여기에_발급받은_코드_입력",
  },
},
```

5. 사이트맵 제출: `https://feelandnote.com/sitemap.xml`

### 2. Google Search Console 인덱싱 확인 (최우선)

현재 구글에서 "feelandnote.com 레이 달리오"로 검색해도 미노출 상태다.

1. [Google Search Console](https://search.google.com/search-console) 접속
2. **사이트맵** → `https://feelandnote.com/sitemap.xml` 제출 (미제출 시)
3. **URL 검사** → `https://feelandnote.com/celeb/ray-dalio` 입력 → "인덱싱 요청"
4. 주요 셀럽 페이지 5~10개 동일하게 인덱싱 요청
5. **실시간 URL 테스트** → 스크린샷에 콘텐츠가 보이는지 확인 (빈 화면이면 CSR 문제)

### 3. 앱 아이콘 이미지 제작

manifest.ts와 apple-touch-icon에 필요한 이미지 파일이다.

| 파일 | 크기 | 위치 |
|------|------|------|
| `icon-192.png` | 192x192 | `sw/web/public/icon-192.png` |
| `icon-512.png` | 512x512 | `sw/web/public/icon-512.png` |
| `apple-icon.png` | 180x180 | `sw/web/src/app/apple-icon.png` |

- manifest.ts는 이미 생성 완료 (아이콘 파일만 추가하면 됨)
- apple-icon.png는 Next.js file convention으로 자동 `<link rel="apple-touch-icon">` 생성

### 4. 백링크 확보 (장기)

신규 사이트라 도메인 권위(DA)가 낮다. 검색 상위 노출의 핵심 요인이다.

- 셀럽 독서 목록 관련 블로그/커뮤니티에 링크 공유
- SNS에 OG 이미지 포함해서 주기적 공유 (셀럽별 동적 OG 이미지 적용 완료)
- 관련 매체에 기고/소개 시도

### 5. 소셜 미디어 계정 연결 (선택)

공식 SNS 계정이 있다면 schema.org sameAs로 연결 가능.

---

## 자동 작업 완료 내역

| 작업 | 파일 | 상태 |
|------|------|------|
| title에 핵심 키워드(직군/콘텐츠 수) 포함 | `celeb/[slug]/page.tsx` | 완료 |
| meta description 120자 이상 확장 | `celeb/[slug]/page.tsx` | 완료 |
| og:title / title / description 통일 | `celeb/[slug]/page.tsx` | 완료 |
| JSON-LD Person + ItemList + Book/Movie 스키마 | `celeb/[slug]/page.tsx` | 완료 |
| 셀럽별 동적 OG 이미지 (1200x630) | `celeb/[slug]/opengraph-image.tsx` | 완료 |
| 콘텐츠 상세 페이지 JSON-LD (Book/Movie 등) | `content/[contentId]/page.tsx` | 완료 |
| 루트 description/keywords 한국어화 | `app/layout.tsx` | 완료 |
| title template `%s \| Feel&Note` 통일 | `app/layout.tsx` | 완료 |
| manifest.ts 생성 (PWA 지원) | `app/manifest.ts` | 완료 |
| robots.ts 비공개 경로 disallow | `app/robots.ts` | 완료 |
| sitemap.ts 정적+동적 라우트 확장 | `app/sitemap.ts` | 완료 |
| 비공개 페이지 noindex 처리 | auth, notifications 등 | 완료 |
| Naver 인증 플레이스홀더 정리 | `app/layout.tsx` | 완료 |

### 추가 개선 가능 (선택)

| 작업 | 설명 |
|------|------|
| `/explore/celebs` OG 이미지 | 셀럽 탐색 전용 동적 OG |
| `/scriptures/era` OG 이미지 | 불후의 명작 전용 OG |
| `/content/[contentId]` OG 이미지 | 콘텐츠 썸네일 기반 동적 OG |
