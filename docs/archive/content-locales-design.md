# content_locales 상세 설계서

> 이력 문서. 현행 규칙 아님. 작성 시점: 26.03.
> ⚠️ 단, §2.2 `content_locales` DDL, §2.3 sources JSONB 스키마, §2.4 verified 상태 정의는 **현행 스키마를 기술하는 살아있는 규격**이며 현역 문서(`docs/project/db-core.md`)에 아직 반영돼 있지 않다.

> ✅ **마이그레이션 완료 (2026-03-06)** — Phase 1(DDL+이관), Phase 2(앱코드 전환), Phase 3(레거시 DROP) 모두 완료.
> 아래는 설계 당시 문서. 현재 구조는 `content_locales` 테이블이 유일한 로케일 데이터 소스.
> `content_editions` 테이블 DROP 완료. `contents`에서 13개 로케일 컬럼 전부 DROP 완료 (Phase 3a: title_ko, title_en, creator_en, isbn_ko, isbn_en, thumbnail_en, has_en_edition / Phase 3b: title, creator, thumbnail_url, description, publisher, affiliate_url).

---

*아래 원문은 마이그레이션 이전 상태를 기술한 설계 문서.*

> contents 테이블에서 로케일 의존 데이터를 완전 분리하여, 전 콘텐츠 타입(BOOK/VIDEO/GAME/MUSIC/CERTIFICATE)에 통합 적용한다.

## 1. 현황 분석

### 1.1 현재 데이터 규모

| 타입 | 건수 | title_ko | title_en | creator_en | thumb_ko | thumb_en |
|------|------|----------|----------|------------|----------|----------|
| BOOK | 2,777 | (editions) | (editions) | (editions) | (editions) | (editions) |
| VIDEO | 1,340 | 1,280 | 1,340 | 1,309 | 1,338 | 0 |
| MUSIC | 1,473 | 119 | 1,472 | 1,426 | 1,466 | 0 |
| GAME | 101 | 13 | 101 | 98 | 101 | 0 |
| CERT | 2 | 1 | 1 | 0 | 0 | 0 |

- `content_editions` (BOOK 전용): ko 2,338행, en 2,598행
- **비BOOK 타입의 `thumbnail_en`은 전부 0** — 영문 포스터/커버 미수집 상태

### 1.2 현재 구조의 문제

1. **이중 저장**: BOOK은 `contents` + `content_editions` 양쪽에 데이터 분산
2. **타입별 불일치**: BOOK만 에디션 분리, VIDEO/MUSIC/GAME은 `contents` 컬럼에 `_ko/_en` 접미사
3. **확장 불가**: 3번째 언어(ja 등) 추가 시 컬럼 폭발
4. **출처 혼재**: 하나의 행에서 title은 A 출처, thumbnail은 B 출처일 수 있으나 추적 불가
5. **검증 불가**: "찾아봤는데 없음" vs "아직 안 찾아봄" 구분 불가

### 1.3 현재 의존성

#### DB 함수 (contents.title 직접 참조)
| 함수 | 참조 컬럼 | 용도 |
|------|-----------|------|
| `get_scriptures_by_era` | title, creator, thumbnail_url, title_ko, title_en, creator_en, thumbnail_en | 경전 조회 |
| `get_chosen_scriptures` | 동일 | 선택 경전 |
| `handle_new_record_comment` | title | 알림 메시지 |
| `handle_new_record_like` | title | 알림 메시지 |

#### DB 트리거
| 트리거 | 대상 | 동작 |
|--------|------|------|
| `trg_create_book_edition` | contents INSERT | BOOK + thumbnail 존재 시 content_editions 자동 생성 |

#### FK 참조 (contents.id 기준, 변경 불필요)
- `user_contents.content_id`
- `records.content_id`
- `notes.content_id`
- `flow_nodes.content_id`
- `content_editions.content_id`

#### RLS
- contents: SELECT 전체 공개, INSERT/UPDATE 인증 사용자

---

## 2. 목표 구조

### 2.1 contents (로케일 무관 데이터만)

```sql
CREATE TABLE contents (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type          TEXT NOT NULL,          -- BOOK, VIDEO, GAME, MUSIC, CERTIFICATE
  subtype       TEXT,                   -- movie, tv (VIDEO용)
  external_id   TEXT,                   -- 외부 API 식별자
  external_source TEXT,                 -- tmdb, naver_book, igdb, spotify, qnet
  release_date  TEXT,
  metadata      JSONB DEFAULT '{}',
  user_count    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**제거 대상 컬럼** (마이그레이션 완료 후):
- `title` (NOT NULL — 가장 큰 의존성)
- `title_ko`, `title_en`
- `creator`, `creator_en`
- `thumbnail_url`, `thumbnail_en`
- `description`
- `publisher`
- `isbn_ko`, `isbn_en`
- `has_en_edition`
- `affiliate_url` (→ content_locales로 이동)

### 2.2 content_locales (신규 — 전 타입 통합)

```sql
CREATE TABLE content_locales (
  content_id    TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  locale        TEXT NOT NULL,          -- 'ko', 'en', 'ja', ...
  title         TEXT,
  creator       TEXT,
  thumbnail_url TEXT,
  description   TEXT,
  isbn          TEXT,                   -- BOOK 전용, nullable
  publisher     TEXT,                   -- BOOK 전용, nullable
  affiliate_url JSONB,                  -- 제휴 링크 (locale별)
  verified      BOOLEAN,               -- NULL=미검색, true=확인완료, false=검색했으나없음
  sources       JSONB,                  -- 출처 추적
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (content_id, locale)
);
```

#### 인덱스

```sql
CREATE INDEX idx_content_locales_locale ON content_locales (locale);
CREATE INDEX idx_content_locales_isbn ON content_locales (isbn) WHERE isbn IS NOT NULL;
```

#### RLS

```sql
ALTER TABLE content_locales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_locales_select" ON content_locales
  FOR SELECT USING (true);

CREATE POLICY "content_locales_insert" ON content_locales
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "content_locales_update" ON content_locales
  FOR UPDATE USING (true) WITH CHECK (true);
```

### 2.3 sources JSONB 스키마

```jsonc
// 단일 출처 (대부분의 경우)
{ "primary": "naver_book" }

// 혼합 출처 (필드별 다를 때)
{
  "primary": "google_books",
  "thumbnail": "openlibrary",    // primary와 다를 때만 명시
  "creator": "naver_book"        // primary와 다를 때만 명시
}
```

가능한 source 값:
- BOOK: `naver_book`, `google_books`, `openlibrary`
- VIDEO: `tmdb`
- GAME: `igdb`
- MUSIC: `spotify`
- CERTIFICATE: `qnet`

thumbnail 전용 값:
- `goodreads`: BookCover API 경유 Goodreads 표지
- `openlibrary`: Open Library 커버
- `confirmed_unavailable`: 3곳(Google Books, Goodreads, Open Library) 전부 미보유 확정. 재수집 스킵 대상.

### 2.4 verified 상태 정의

| 값 | 의미 | 예시 |
|----|------|------|
| `NULL` | 아직 검색 안 함 | 신규 등록 직후 |
| `true` | 검색 완료, 데이터 확인됨 | Google Books에서 ISBN+썸네일 확인 |
| `false` | 검색했으나 데이터 없음 | Google Books에 해당 ISBN 없음 |

---

## 3. 조회 패턴

### 3.1 기본 조회 (단일 로케일)

```sql
SELECT c.id, c.type, c.release_date,
       cl.title, cl.creator, cl.thumbnail_url
FROM contents c
LEFT JOIN content_locales cl
  ON c.id = cl.content_id AND cl.locale = :locale
WHERE c.id = :id;
```

### 3.2 Fallback 조회 (ko 우선, 없으면 en)

```sql
SELECT c.id, c.type, c.release_date,
       COALESCE(cl_pref.title, cl_fb.title) AS title,
       COALESCE(cl_pref.creator, cl_fb.creator) AS creator,
       COALESCE(cl_pref.thumbnail_url, cl_fb.thumbnail_url) AS thumbnail_url
FROM contents c
LEFT JOIN content_locales cl_pref
  ON c.id = cl_pref.content_id AND cl_pref.locale = :preferred  -- 'ko'
LEFT JOIN content_locales cl_fb
  ON c.id = cl_fb.content_id AND cl_fb.locale = :fallback       -- 'en'
WHERE c.id = :id;
```

### 3.3 양쪽 로케일 조회 (web-bo 관리 화면)

```sql
SELECT c.id, c.type,
       ko.title AS title_ko, ko.creator AS creator_ko, ko.thumbnail_url AS thumb_ko,
       ko.isbn AS isbn_ko, ko.publisher AS pub_ko, ko.verified AS verified_ko,
       en.title AS title_en, en.creator AS creator_en, en.thumbnail_url AS thumb_en,
       en.isbn AS isbn_en, en.publisher AS pub_en, en.verified AS verified_en
FROM contents c
LEFT JOIN content_locales ko ON c.id = ko.content_id AND ko.locale = 'ko'
LEFT JOIN content_locales en ON c.id = en.content_id AND en.locale = 'en'
WHERE c.type = 'BOOK'
ORDER BY c.created_at DESC;
```

### 3.4 Supabase JS 패턴

```typescript
// 단일 로케일
const { data } = await supabase
  .from('contents')
  .select('id, type, release_date, content_locales!inner(title, creator, thumbnail_url)')
  .eq('content_locales.locale', locale)
  .eq('id', contentId)
  .single();

// 양쪽 (관리 화면)
const { data } = await supabase
  .from('contents')
  .select('id, type, content_locales(locale, title, creator, thumbnail_url, isbn, verified)')
  .eq('id', contentId)
  .single();
// → data.content_locales = [{ locale: 'ko', ... }, { locale: 'en', ... }]
```

---

## 4. 마이그레이션 계획

### Phase 1: content_locales 테이블 생성 + 데이터 이관

#### Step 1-1: 테이블 생성
```sql
CREATE TABLE content_locales ( ... );  -- 위 DDL
```

#### Step 1-2: content_editions → content_locales 이관 (BOOK, 4,936행)
```sql
INSERT INTO content_locales (content_id, locale, title, creator, thumbnail_url, isbn, publisher, affiliate_url, sources)
SELECT content_id, locale, title, creator, thumbnail_url, isbn, publisher, affiliate_url,
  CASE
    WHEN locale = 'ko' THEN '{"primary": "naver_book"}'::jsonb
    WHEN thumbnail_url LIKE '%google%' THEN '{"primary": "google_books"}'::jsonb
    WHEN thumbnail_url LIKE '%openlibrary%' THEN '{"primary": "google_books", "thumbnail": "openlibrary"}'::jsonb
    ELSE '{"primary": "google_books"}'::jsonb
  END
FROM content_editions;
```

#### Step 1-3: VIDEO → content_locales (1,340건 × 최대 2행)
```sql
-- KO 행
INSERT INTO content_locales (content_id, locale, title, creator, thumbnail_url, description, sources, verified)
SELECT id, 'ko',
  COALESCE(title_ko, title),
  creator,
  thumbnail_url,
  description,
  '{"primary": "tmdb"}'::jsonb,
  CASE WHEN title_ko IS NOT NULL THEN true ELSE NULL END
FROM contents WHERE type = 'VIDEO';

-- EN 행
INSERT INTO content_locales (content_id, locale, title, creator, thumbnail_url, description, sources, verified)
SELECT id, 'en',
  COALESCE(title_en, title),
  COALESCE(creator_en, creator),
  thumbnail_en,  -- 현재 전부 NULL
  NULL,
  '{"primary": "tmdb"}'::jsonb,
  CASE WHEN title_en IS NOT NULL THEN true ELSE NULL END
FROM contents WHERE type = 'VIDEO' AND title_en IS NOT NULL;
```

#### Step 1-4: MUSIC → content_locales (1,473건)
```sql
-- KO 행
INSERT INTO content_locales (content_id, locale, title, creator, thumbnail_url, description, sources, verified)
SELECT id, 'ko',
  COALESCE(title_ko, title),
  creator,
  thumbnail_url,
  description,
  '{"primary": "spotify"}'::jsonb,
  true
FROM contents WHERE type = 'MUSIC';

-- EN 행
INSERT INTO content_locales (content_id, locale, title, creator, thumbnail_url, sources, verified)
SELECT id, 'en',
  COALESCE(title_en, title),
  COALESCE(creator_en, creator),
  thumbnail_en,
  '{"primary": "spotify"}'::jsonb,
  CASE WHEN title_en IS NOT NULL THEN true ELSE NULL END
FROM contents WHERE type = 'MUSIC' AND title_en IS NOT NULL;
```

#### Step 1-5: GAME (101건), CERTIFICATE (2건) — 동일 패턴

### Phase 2: 앱 코드 전환 (병렬 운용)

`contents`의 로케일 컬럼은 유지한 채, 읽기를 `content_locales` JOIN으로 전환한다.

#### 전환 대상 (앱 코드)

| 영역 | 파일 수 (추정) | 작업 |
|------|---------------|------|
| server actions (select) | ~20 | `content_locales` JOIN 추가 |
| server actions (insert) | ~3 | `content_locales` INSERT 추가 |
| DB 함수 | 4 | JOIN 변경 |
| web-bo 관리 페이지 | ~5 | JOIN 변경 |
| 타입 정의 | ~5 | 인터페이스 정리 |

#### 호환 뷰 (전환 기간용)

```sql
-- 기존 코드가 contents.title 을 쓰는 곳을 위한 임시 뷰
CREATE VIEW contents_v AS
SELECT c.*,
  COALESCE(ko.title, en.title) AS display_title,
  COALESCE(ko.creator, en.creator) AS display_creator,
  COALESCE(ko.thumbnail_url, en.thumbnail_url) AS display_thumbnail
FROM contents c
LEFT JOIN content_locales ko ON c.id = ko.content_id AND ko.locale = 'ko'
LEFT JOIN content_locales en ON c.id = en.content_id AND en.locale = 'en';
```

### Phase 3: 레거시 컬럼 제거

모든 앱 코드가 `content_locales`를 직접 조회하게 된 후:

```sql
ALTER TABLE contents
  DROP COLUMN title,
  DROP COLUMN title_ko,
  DROP COLUMN title_en,
  DROP COLUMN creator,
  DROP COLUMN creator_en,
  DROP COLUMN description,
  DROP COLUMN publisher,
  DROP COLUMN thumbnail_url,
  DROP COLUMN thumbnail_en,
  DROP COLUMN isbn_ko,
  DROP COLUMN isbn_en,
  DROP COLUMN has_en_edition,
  DROP COLUMN affiliate_url;

DROP TABLE content_editions;
```

### Phase 4: 트리거 교체

```sql
-- 기존 트리거 제거
DROP TRIGGER trg_create_book_edition ON contents;
DROP FUNCTION create_book_edition();

-- 신규 트리거: 모든 타입에 대해 content_locales 자동 생성
CREATE OR REPLACE FUNCTION create_content_locale()
RETURNS TRIGGER AS $$
DECLARE
  _locale text;
  _source text;
BEGIN
  -- external_source로 초기 locale 결정
  _source := COALESCE(NEW.external_source, 'unknown');

  CASE _source
    WHEN 'naver_book' THEN _locale := 'ko';
    WHEN 'google_books' THEN _locale := 'en';
    WHEN 'tmdb' THEN _locale := 'ko';       -- ko-KR로 검색하므로
    WHEN 'igdb' THEN _locale := 'en';       -- 영문 기반
    WHEN 'spotify' THEN _locale := 'en';    -- 영문 기반
    WHEN 'qnet' THEN _locale := 'ko';
    ELSE _locale := 'ko';
  END CASE;

  -- Phase 3 전: 아직 contents에 title이 있을 때 사용
  -- Phase 3 후: INSERT 시 content_locales도 함께 생성하는 앱 코드로 대체
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

> Phase 3 이후에는 트리거 대신 앱 코드에서 `contents` INSERT + `content_locales` INSERT를 트랜잭션으로 묶는다.

---

## 5. DB 함수 변경

### handle_new_record_comment / handle_new_record_like

알림 메시지에 `c.title` 사용 중. `content_locales` fallback으로 변경:

```sql
SELECT r.user_id,
  COALESCE(cl_ko.title, cl_en.title, '콘텐츠') INTO record_owner_id, record_content_title
FROM records r
JOIN contents c ON r.content_id = c.id
LEFT JOIN content_locales cl_ko ON c.id = cl_ko.content_id AND cl_ko.locale = 'ko'
LEFT JOIN content_locales cl_en ON c.id = cl_en.content_id AND cl_en.locale = 'en'
WHERE r.id = NEW.record_id;
```

### get_scriptures_by_era / get_chosen_scriptures

현재 `c.title, c.title_ko, c.title_en, c.creator_en, c.thumbnail_en`을 모두 SELECT.
→ `content_locales` ko/en JOIN으로 교체:

```sql
SELECT c.id, c.type, c.release_date,
  ko.title AS title_ko, en.title AS title_en,
  ko.creator AS creator_ko, en.creator AS creator_en,
  ko.thumbnail_url AS thumbnail_ko, en.thumbnail_url AS thumbnail_en,
  ko.isbn AS isbn_ko, en.isbn AS isbn_en
FROM contents c
LEFT JOIN content_locales ko ON c.id = ko.content_id AND ko.locale = 'ko'
LEFT JOIN content_locales en ON c.id = en.content_id AND en.locale = 'en'
...
```

---

## 6. 영문 데이터 보충 계획

### 6.1 VIDEO 영문 썸네일 (1,340건, 현재 0건)

TMDB `/images` API로 영문 포스터 일괄 수집:

```
GET /movie/{id}/images?include_image_languages=en,null
GET /tv/{id}/images?include_image_languages=en,null
```

→ `posters` 배열에서 `iso_639_1 = "en"` 항목의 `file_path` 추출
→ `content_locales` en 행의 `thumbnail_url` 업데이트

### 6.2 MUSIC 영문 썸네일 (1,473건, 현재 0건)

Spotify는 로케일별 커버아트를 제공하지 않음. 앨범 커버는 전세계 동일.
→ **ko/en 동일 URL 사용** (thumbnail_url 복사)

### 6.3 GAME 영문 썸네일 (101건, 현재 0건)

IGDB는 로케일별 커버를 제공하지 않음.
→ **ko/en 동일 URL 사용**

### 6.4 BOOK 영문 데이터

→ **`docs/archive/en-book-data-quality.md`** 참조 (진단, 수정 프로세스, sources 스키마, 썸네일 수집 규칙, API 사양, 이력 전부 포함).

#### ContentCard 영문 로케일 동작

`/en` 접속 시 ContentCard의 `activeEdition`이 자동으로 `"en"` 설정된다 (`ContentCard.tsx:193`). en 에디션에 `thumbnail_en`이 없으면 **빈 카드 표시** (ko 표지로 fallback하지 않음, `ContentCard.tsx:201-203`). 이 설계 때문에 en 썸네일 누락이 사용자에게 직접 노출된다.

---

## 7. 일정 (추정)

| 단계 | 작업 | 순서 |
|------|------|------|
| Phase 1 | DDL + 데이터 이관 | 1일차 |
| Phase 2-a | 앱 코드 읽기 전환 (critical path) | 2~3일차 |
| Phase 2-b | web-bo 관리 화면 전환 | 2~3일차 |
| Phase 2-c | DB 함수 전환 | 2일차 |
| Phase 3 | 레거시 컬럼 DROP | 4일차 (전환 검증 후) |
| Phase 4 | 트리거 교체 / VIDEO 영문 썸네일 수집 | 4일차 |
