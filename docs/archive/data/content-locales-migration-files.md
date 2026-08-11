# content_locales 마이그레이션 — 파일별 변경 목록

> ✅ **전체 완료 (2026-03-06)** — Phase 1~3 모두 적용됨. contents 테이블에서 로케일 컬럼 13개 전부 DROP. 아래는 마이그레이션 당시 참조 가이드.

> `docs/archive/data/content-locales-design.md`의 Phase 2 실행용 상세 가이드.
> 각 파일이 `contents` 테이블의 로케일 컬럼을 어떻게 참조하는지, 어떻게 전환하는지 기술한다.

## 전환 원칙

1. `.from('contents').select('..., title, creator, thumbnail_url, ...')` 패턴을
   `.from('contents').select('..., content_locales(title, creator, thumbnail_url)')` 패턴으로 전환
2. Supabase JS에서 `!inner` JOIN은 해당 locale 행이 없으면 결과 누락 → `LEFT JOIN` (기본) 사용
3. `content_locales.locale` 필터는 `.eq('content_locales.locale', locale)` 또는 앱 레벨 필터
4. 프론트엔드 타입은 `content.title` → `content.content_locales[0].title` 또는 flatten 헬퍼

---

## A. sw/web/src/actions/contents/ (핵심 — 14파일)

### A-1. addContent.ts (INSERT)
- **현재**: `contents` INSERT에 title, creator, thumbnail_url, description, publisher 등 직접 삽입
- **전환**:
  1. `contents` INSERT → 로케일 무관 필드만 (type, subtype, external_id, external_source, release_date, metadata)
  2. 직후 `content_locales` INSERT → (content_id, locale, title, creator, thumbnail_url, description, isbn, publisher, sources)
  3. locale 결정: external_source 기반 (naver_book→ko, google_books→en, tmdb→ko, igdb→en, spotify→en)
- **주의**: `contents.title`이 NOT NULL이므로 Phase 2에서는 양쪽 모두 INSERT (중복). Phase 3에서 contents 컬럼 DROP 후 단일화.

### A-2. getContentDetail.ts (SELECT — 가장 복잡)
- **Line 123**: `.select('id, external_id, type, title, creator, thumbnail_url, description, release_date, affiliate_url')`
- **Line 133**: 동일 select (fallback 경로)
- **Line 70~**: user_contents JOIN 쿼리에 `content:contents!inner(...)` 중첩 select
- **전환**: `contents` select에서 title/creator/thumbnail_url/description/affiliate_url 제거, `content_locales(locale, title, creator, thumbnail_url, description, affiliate_url)` 추가
- **프론트엔드 영향**: `ContentDetailData` 타입 변경 필요

### A-3. getMyContents.ts (SELECT)
- **Line 81, 164**: `user_contents` JOIN으로 `contents(*)` 와일드카드 사용
- **전환**: `contents(*, content_locales(locale, title, creator, thumbnail_url))` 로 확장
- **타입**: `UserContentWithContent.content`에 `content_locales` 배열 추가

### A-4. getUserContents.ts (SELECT)
- **Line 75**: `user_contents` JOIN, contents 와일드카드
- **전환**: A-3과 동일 패턴
- **타입**: `UserContentPublic.content`, `ContentData`

### A-5. getContent.ts (SELECT)
- **Line 37, 60**: 명시적 select + 와일드카드
- **전환**: content_locales JOIN 추가

### A-6. getMyMusicList.ts (SELECT)
- **Line 29**: `content:contents!inner(id, external_id, title, creator, thumbnail_url)`
- **전환**: `content:contents!inner(id, external_id, content_locales(title, creator, thumbnail_url))`

### A-7. getRecentContents.ts (SELECT)
- **Line 20**: `.select('id, type, title, creator, thumbnail_url, created_at')`
- **전환**: title/creator/thumbnail_url → content_locales JOIN

### A-8. getContentUserCounts.ts (SELECT)
- **Line 16**: `.select('id, user_count')` — 로케일 컬럼 미참조
- **전환 불필요**

### A-9. getMediaEmbed.ts (SELECT)
- **Line 27**: `.select('external_id')` — 로케일 컬럼 미참조
- **전환 불필요**

### A-10. exportContents.ts (SELECT)
- **Line 46**: 와일드카드 select
- **전환**: content_locales JOIN 추가

### A-11. getReviewFeed.ts (SELECT)
- **Line 33**: 와일드카드 select (user_contents JOIN)
- **전환**: content_locales JOIN 추가

### A-12. updateContentMetadata.ts (UPDATE)
- **Line 17, 41**: contents UPDATE (metadata, thumbnail_url 등)
- **전환**: thumbnail_url UPDATE → content_locales UPDATE로 분리
- **주의**: metadata는 contents에 잔류하므로 부분 전환

### A-13. getContentCounts.ts (SELECT)
- **Line 18+**: `content:contents!inner(type)` — type만 참조
- **전환 불필요**

### A-14. batchRemoveContents.ts, removeContent.ts, togglePin.ts, updateRating.ts, updateStatus.ts, updateReview.ts
- 로케일 컬럼 미참조
- **전환 불필요**

---

## B. sw/web/src/actions/ (기타 — 6파일)

### B-1. home/getCelebFeed.ts
- contents JOIN에 title, creator, thumbnail_url, title_ko, title_en, creator_en 참조
- **전환**: content_locales JOIN

### B-2. home/getCelebReviews.ts
- 동일 패턴
- **전환**: content_locales JOIN

### B-3. home/getFriendActivity.ts
- **Line 74**: `.from('contents')` — select 내용 확인 필요
- **전환**: content_locales JOIN 추가 (title/thumbnail 참조 시)

### B-4. activity/getFeedActivities.ts
- **Line 78, 142**: contents 조회
- **전환**: content_locales JOIN 추가

### B-5. search/searchRecords.ts
- 검색 결과에 content.title 참조
- **전환**: content_locales JOIN

### B-6. celebs/addCelebContent.ts
- **Line 55**: contents 조회/삽입
- **전환**: INSERT 시 content_locales도 생성

### B-7. game/getTrackerRound.ts
- **Line 266**: contents 조회
- **전환**: content_locales JOIN 추가

### B-8. scriptures/index.ts
- DB 함수 `get_scriptures_by_era`, `get_chosen_scriptures` 호출
- **전환**: DB 함수 자체 변경 후 반환 타입 매핑 수정

---

## C. sw/web/src/components/ (프론트엔드 — content.title 직접 참조 35파일)

대부분은 **서버 액션에서 받은 데이터의 타입만 변경**하면 된다.
서버 액션 전환 후 타입 정의를 업데이트하면 TypeScript 컴파일러가 잡아준다.

### 핵심 변경 파일

| 파일 | content.title 참조 방식 | 전환 |
|------|------------------------|------|
| `content/ContentDetailPage.tsx` | `content.title`, `content.creator` | 타입 변경 |
| `content/ContentInfoSection.tsx` | `content.title`, `content.thumbnail` | 타입 변경 |
| `quickRecord/InfoPanel.tsx` | `content.title` | 타입 변경 |
| `quickRecord/QuickRecordEditor.tsx` | `content.title` | 타입 변경 |
| `user/contentLibrary/item/ContentItemRenderer.tsx` | `content.title` | 타입 변경 |
| `user/profile/RecentRecords.tsx` | `content.title` | 타입 변경 |
| `home/CelebFeed.tsx` | `content.title` | 타입 변경 |
| `scriptures/` (3파일) | DB 함수 반환값의 title 필드 | 매핑 변경 |
| `ui/cards/ContentCard/` | 이미 editions 구조 사용 중 | 최소 변경 |
| `lib/utils/editions.ts` | `getBookEditions()` 헬퍼 | content_locales 기반으로 재작성 |

---

## D. sw/web-bo/src/ (관리자 — 5파일)

### D-1. app/(admin)/contents/page.tsx
- **현재**: contents 조회 + content_editions 별도 조회
- **전환**: contents + content_locales JOIN 단일 쿼리

### D-2. actions/admin/contents.ts
- **Line 66, 158, 177, 197, 217, 235**: 다수의 contents 조회/수정
- **전환**: 각 조회에 content_locales JOIN, 수정 시 content_locales UPDATE

### D-3. actions/admin/external-search.ts
- **Line 61, 72, 118**: contents 조회/삽입
- **전환**: INSERT 시 content_locales도 생성

### D-4. actions/admin/celebs.ts
- **Line 728**: contents UPDATE
- **전환**: content_locales UPDATE 분리

### D-5. app/api/contents/search/route.ts
- **Line 15**: contents 조회
- **전환**: content_locales JOIN

### D-6. app/(admin)/page.tsx (대시보드)
- **Line 26, 30**: 집계용 — 타입 카운트
- **전환 불필요** (로케일 컬럼 미참조)

---

## E. 타입 정의 파일

### E-1. sw/web/src/types/database.ts
- `Content` 인터페이스에서 `title`, `creator`, `thumbnail_url` 등 제거
- `content_locales` 배열 또는 flatten된 locale 필드 추가

### E-2. sw/web/src/types/home.ts
- `CelebReview.content` 타입 변경

### E-3. sw/web/src/lib/utils/editions.ts
- `getBookEditions()` → content_locales 배열 기반으로 재작성

### E-4. sw/web/src/components/ui/cards/ContentCard/types.ts
- `BookEditions` 타입 → content_locales 기반으로 변경

---

## F. DB 함수 (4개)

### F-1. get_scriptures_by_era
```sql
-- 변경: c.title, c.title_ko, c.title_en, c.creator_en, c.thumbnail_en 제거
-- 추가: content_locales ko/en JOIN
-- 반환: ko.title AS title_ko, en.title AS title_en, ...
```

### F-2. get_chosen_scriptures
```sql
-- 동일 패턴
```

### F-3. handle_new_record_comment
```sql
-- c.title → COALESCE(cl_ko.title, cl_en.title, '콘텐츠')
-- content_locales ko/en LEFT JOIN 추가
```

### F-4. handle_new_record_like
```sql
-- 동일 패턴
```

---

## G. 스크립트 파일

### G-1. scripts/en-thumb-google-books.mjs
- `content_editions` → `content_locales`로 테이블명 변경
- 나머지 로직 동일

---

## H. 패키지: packages/content-search/src/tmdb.ts

### 현재 문제
- `searchVideo()`: `language: 'ko-KR'` 고정 → 한국어 포스터만 반환
- 영문 포스터 별도 수집 경로 없음

### 필요 변경 (Phase 4)
1. `getVideoById()` 또는 신규 함수에서 `/images` API 호출
2. `include_image_languages=en,null` 파라미터로 영문 포스터 추출
3. `addContent` 시 ko/en 포스터 모두 content_locales에 저장

### TMDB /images API 예시
```
GET https://api.themoviedb.org/3/movie/{id}/images?api_key=XXX&include_image_languages=en,null
```
응답:
```json
{
  "posters": [
    { "iso_639_1": "en", "file_path": "/abc.jpg", "vote_average": 5.3 },
    { "iso_639_1": null, "file_path": "/def.jpg", "vote_average": 0 }
  ]
}
```
→ `iso_639_1 = "en"` 중 `vote_average` 최고 항목 선택
→ URL: `https://image.tmdb.org/t/p/w500{file_path}`

---

## I. 전환 순서 (권장)

### Step 1: DDL + 데이터 이관 (DB만, 앱 코드 변경 없음)
```
content_locales 테이블 생성 → 기존 데이터 INSERT → 검증
```

### Step 2: 헬퍼 함수 작성
```
getContentLocale(contentId, locale) → { title, creator, thumbnail_url, ... }
flattenLocales(content) → content.title_ko, content.title_en, ...
```

### Step 3: Server Actions 전환 (가장 큰 작업)
```
영향도 순: addContent → getContentDetail → getMyContents → getUserContents → 나머지
```

### Step 4: DB 함수 전환
```
handle_new_record_comment/like → get_scriptures_by_era → get_chosen_scriptures
```

### Step 5: 프론트엔드 타입 정리
```
TypeScript 컴파일 → 에러 나는 곳 수정
```

### Step 6: 레거시 DROP
```
contents 컬럼 제거 → content_editions DROP → 트리거 교체
```
