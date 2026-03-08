# 영문 도서 썸네일 수집·교체 작업 보고

> 작업일: 2026-03-07 ~ 03-08

## 배경

`/en/scriptures/profession` (humanities_scholar 등) 페이지에서 영문 도서 이미지가 대량 누락되는 문제 발생.

### 원인 분석

1. **Google Books 플레이스홀더**: `zoom=2` URL이 커버 없는 도서에 "image not available" 텍스트 이미지를 반환. DB에는 URL이 있지만 실제 표지가 아님.
   - `AACAAJ` 접미사 패턴 (no preview 도서): 177건
   - `edge=curl` 파라미터 없는 URL (preview 없음): 총 679건
2. **영문 썸네일 NULL**: `content_locales` en 레코드에 `thumbnail_url`이 비어있는 도서: 222건
3. **en_isbn 오매칭**: 기존 ISBN-en 자동매칭 스크립트가 제목만으로 ISBN을 매칭하면서 동명이본이 섞임. Republic(플라톤) → Star Wars: Republic Commando, Metaphysics(아리스토텔레스) → Heidegger 등. **ISBN 기반 표지 수집 시 잘못된 책 표지가 들어가는 근본 원인**.
4. **ContentCard 동작**: `/en` 로케일 접속 시 `activeEdition`이 자동으로 `"en"` 설정되어 영문 표지만 표시. 영문 표지가 없으면 빈 카드 표시 (한국 표지 fallback 없음).

## 수행 작업

### 1단계: Google Books 가짜 플레이스홀더 제거

```sql
UPDATE content_locales SET thumbnail_url = NULL
WHERE locale = 'en' AND thumbnail_url LIKE '%AACAAJ%'
-- 177건 NULL 처리
```

### 2단계: v1 시도 (폐기)

ISBN 기반으로 BookCover API(Goodreads) 표지를 수집했으나, en_isbn 오매칭 문제로 **잘못된 책 표지가 다수 유입**됨. 전량 롤백.

- `en-thumb-bookcover.mjs` → ISBN 우선 매칭, 오류 발견 후 폐기
- `en-thumb-replace-google.mjs` → Google Books URL 교체, 동일 문제로 폐기

### 3단계: v2 최종 수집 (ISBN 사용 금지)

**2단계 파이프라인으로 저자 검증 후 표지 수집:**

1. **Open Library 검색 API** (`openlibrary.org/search.json`): en_title로 검색 → 올바른 영문 저자 확보
2. **BookCover API** (`bookcover.longitood.com`): en_title + 검증된 저자 → Goodreads 고품질 표지
3. **Open Library 커버 fallback**: BookCover API 실패 시 Open Library cover_i → `-L.jpg` URL 사용

스크립트: `en-thumb-bookcover-v2.mjs`

## 결과

### 수량 변화

| 항목 | 작업 전 | 작업 후 |
|------|---------|---------|
| 총 en BOOK 레코드 | 2,606 | 2,606 |
| 썸네일 보유 | ~1,571 (60.3%) | 2,430 (93.2%) |
| 썸네일 NULL | ~1,035 | 176 |
| Google Books 플레이스홀더 | ~679건 | 0건 |

> 작업 전 수치는 Google Books 플레이스홀더(679건)를 제외한 실질 유효 썸네일 기준

### 소스 분포 (최종)

| 소스 | 건수 | 비고 |
|------|------|------|
| Naver | 715 | 기존 한국 표지 |
| OpenLibrary | 657 | 기존 440 + fallback 217 |
| Goodreads | 650 | 신규 (고품질, Open Library 저자 검증) |
| Google Books (curl) | 377 | 실제 커버 보유 |
| NULL | 176 | 미발견 |
| 기타 | 31 | |

### humanities_scholar 페이지 (문제 발생 직군)

**작업 전**: 상위 12개 중 6개 이미지 없음/플레이스홀더
**작업 후**: 상위 15개 중 1개만 NULL (Iliad — Open Library, Goodreads 모두에서 미발견)

## 교훈: ISBN 기반 매칭의 위험성

1. `isbn_en` 자동매칭 시 **제목만으로 매칭하면 동명이본이 섞인다** (Republic → Star Wars, Metaphysics → Heidegger 등)
2. ISBN 기반 표지 수집은 ISBN 데이터 품질에 완전히 의존 → 오매칭 ISBN이면 표지도 오류
3. **해결책**: Open Library 검색으로 올바른 저자를 먼저 확보한 후, 저자+제목으로 표지 검색

## 잔여 사항

- **176건 미수집**: Goodreads, Open Library 모두에서 영문 표지를 찾을 수 없는 도서. 고대 동양 경전, 한국/일본 고전, 한국어 혼재 제목 등.
- **Naver URL 715건**: en locale에 한국 Naver Shopping 썸네일이 저장된 상태. 데이터 정합성 차원에서 별도 정리 검토 필요.
- **en_isbn/en_creator 오매칭**: 동명이본 매칭으로 잘못된 ISBN/저자가 content_locales en에 남아있는 건 별도 정비 필요.

## 스크립트 참조

| 파일 | 용도 | 상태 |
|------|------|------|
| `scripts/en-thumb-bookcover-v2.mjs` | OL 저자 검증 + BookCover API + OL fallback | **최종 사용** |
| `scripts/en-thumb-bookcover.mjs` | ISBN 기반 수집 (v1) | 폐기 |
| `scripts/en-thumb-replace-google.mjs` | Google Books → Goodreads 교체 (v1) | 폐기 |
| `scripts/en-thumb-google-books.mjs` | (기존) Google Books API 수집 | 기존 |
