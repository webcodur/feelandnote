# BOOK 영문 데이터(content_locales en) 재검증

단일원천 문서. BOOK en locale 데이터 품질 관련 모든 정보는 여기에 있다.

최종 갱신: 2026-03-10

**상태: ✅ naver_book 2,364건 전량 검증 완료 (verified=true, 한글/CJK 잔존 0건)**

---

## 1. 현황

| 구분 | 건수 | 상태 |
|------|------|------|
| BOOK 전체 | 2,785 | |
| en locale 보유 | 2,606 | |
| `external_source = 'naver_book'` | 2,364 | ✅ **전량 verified** |
| `external_source = 'google_books'` | 242 | en이 원본, 검증 불필요 |

### 원본 판별

`contents.external_source` 컬럼으로 판별:

| external_source | 건수 | 의미 |
|-----------------|------|------|
| `naver_book` | 2,364 | **ko가 원본**. en은 OL 검증 파이프라인으로 재검증 완료 |
| `google_books` | 242 | **en이 원본**. 건드리지 않음 |

### verified 이력

- 2026-03-10 AM: 전량 `verified = false` 리셋 (이전 스크립트가 검증 없이 true 마킹)
- 2026-03-10 PM: **전량 `verified = true` 재검증 완료** (OL 파이프라인 + 에이전트 수동 검토)

---

## 2. 오류 유형

### 2.1 en_creator가 한글 (미번역) — 82건

한국어 저자명이 en locale에 그대로 복사됨. ISBN 있는 건 52, 없는 건 30.

예: `잭 웰치`, `라이오넬 슈라이버`, `에드워드 L. 데시`

### 2.2 en_title이 한글 (미번역) — 20건

예: `바리바리 전설`, `고요함의 힘`, `읽으면 초능력 2 : 플라톤의 국가`

### 2.3 중복 ISBN (동명이서 오매칭) — 66건 (33쌍)

같은 ISBN이 서로 다른 한국어 책에 할당됨.

- ISBN 9780451073389: `길 위에서`(On the Road) + `로드`(The Road)
- ISBN 9780099450047: `조용한 미국인`(The Quiet American) + `콰이어트`(Quiet)
- ISBN 9780394700755: `베이컨 수상록`(The Essays) + `시지프 신화`(The Myth of Sisyphus)

### 2.4 ISBN 있지만 완전 오매칭 — 추정 50~100건

ISBN 자체가 다른 책 것.

- 설득의 심리학 (로버트 치알디니) → en_creator: Dale Carnegie
- 한낮의 어둠 (아서 쾨슬러) → en_creator: Jill Tattersall
- 오멘 (데이비드 셀처) → en_creator: Terry Goodkind
- 더 걸스 (에마 클라인) → en_creator: Harriet A. Jacobs

### 2.5 ISBN NULL + creator가 번역자/편집자 — 216건 중 다수

고대·고전 텍스트 위주.

- 메논 (플라톤) → en_creator: Brian Tracy
- 법률 (플라톤) → en_creator: United States
- 소피스트 (플라톤) → en_creator: Diana Hamilton
- 관용론 (세네카) → en_creator: Roger L'Estrange

### 2.6 ko_title과 en_title이 완전히 다른 작품 — 미정량

- 소크라테스의 변론 → en_title: Euthyphro (다른 작품)
- 티마이오스 → en_title: Critias (다른 작품)

---

## 3. 오류 근본 원인

이전 스크립트(isbn-en-validator.mjs, isbn-en-rematcher.mjs, creator-en-backfill.mjs)가 **Google Books API 제목 텍스트 매칭**으로 수집:

1. **동명이서**: "Quiet", "Night", "Silence" 같은 짧은 영문 제목 → 다른 책 매칭
2. **번역서 우선**: Google Books가 번역서/해설서 반환 → translator/editor가 creator로 등록
3. **한국어 fallback**: 영문 데이터 못 찾으면 한국어 그대로 복사
4. **저자 미검증**: ISBN으로 찾은 책의 저자가 원래 저자와 동일 인물인지 검증 안 함
5. **verified 오마킹**: 검증 없이 `verified = true` 찍음

**이전 스크립트들은 코드베이스에서 삭제된 상태.**

---

## 4. 수정 프로세스 (확정)

### 대상

- `external_source = 'naver_book'` (2,542건) → **ko를 신뢰**, en 재검증
- `external_source = 'google_books'` (242건) 또는 en_only (439건) → **en이 원본**, 건드리지 않음

### 4단계 파이프라인

**Google Books API 사용 금지.**

**1단계: 소넷 에이전트 — en_title + en_creator 판단**
- 입력: ko_title + ko_creator (신뢰할 수 있는 원본 데이터)
- 출력: 올바른 en_title + en_creator
- "국가론, 플라톤" → "Republic, Plato" 수준의 변환

**2단계: Open Library — 실존 확인 + ISBN 확보**
- API: `openlibrary.org/search.json?title={en_title}&author={en_creator}`
- 결과에서 저자명 일치 확인 + ISBN 확보
- 매칭 실패 시 `verified = false` 유지, ISBN은 NULL

**3단계: Goodreads BookCover — 표지 수집**
- API: `bookcover.longitood.com/bookcover?book_title={title}&author_name={author}`
- `author_name` 파라미터 필수 (없으면 400 에러)
- 레이트리밋: 요청 간 500ms+ 간격 권장
- 실패 시 Open Library 표지 fallback: `covers.openlibrary.org/b/isbn/{isbn}-L.jpg`
  - OL 표지 필터: 응답 < 1KB → 버림 (1x1px placeholder. 43 bytes로 확인됨)
  - 흐린 표지는 감수 (24KB급 실제 이미지라 크기로 구분 불가)
- 둘 다 실패 → `confirmed_unavailable` 마킹

**4단계: DB 업데이트**
- `content_locales` en 행: title, creator, isbn, thumbnail_url, sources 업데이트
- sources 예시: `{"primary": "openlibrary", "thumbnail": "goodreads"}`
- 전 단계 통과한 건만 `verified = true`
- 수정 전/후 값을 로그로 남길 것

---

## 5. sources JSONB 스키마

`content_locales.sources` JSONB로 각 필드의 데이터 출처를 추적한다.

```json
{"primary": "openlibrary", "thumbnail": "goodreads"}
```

| 키 | 의미 |
|----|------|
| `primary` | 레코드의 title, creator, isbn 출처 |
| `thumbnail` | 썸네일만 별도 출처일 때. 없으면 primary와 동일 |

| primary 값 | 대상 |
|-------------|------|
| `naver_book` | ko 도서 |
| `google_books` | en 도서 (이전 스크립트, 신규 금지) |
| `openlibrary` | en 도서 (신규 파이프라인) |

| thumbnail 값 | 비고 |
|---------------|------|
| `goodreads` | BookCover API 경유 Goodreads 표지 |
| `openlibrary` | Open Library 커버 |
| `confirmed_unavailable` | Goodreads + OL 모두 미보유 확정. 재수집 스킵 |

---

## 6. 현재 en 썸네일 분포

| 소스 | 건수 | 비고 |
|------|------|------|
| Goodreads | 1,176 | BookCover API v2 (2026-03-08) |
| OpenLibrary | 788 | 기존 440 + fallback 217 |
| Google Books (curl) | 364 | 실제 커버 보유 |
| NULL | 277 | 미발견 |
| confirmed_unavailable | 1 | |

Naver URL 715건이 en locale에 한국 표지로 저장되어 있었으나, 위 분류에서는 sources 기준으로 재분류됨. 재검증 시 전량 교체 대상.

---

## 7. 이력

| 날짜 | 작업 | 결과 |
|------|------|------|
| 2026-03-02 | isbn-en-validator, rematcher 등 Google Books 자동화 스크립트 | 대량 매칭했으나 오매칭 다수 발생 |
| 2026-03-07~08 | en-thumb-bookcover-v2 썸네일 수집 (OL 저자 검증 + BookCover API) | 썸네일 93.2% 확보. title/creator 오매칭은 미해결 |
| 2026-03-08 | OL URL 786건 일괄 검증 | 유효 709 (90.2%), timeout 77 (9.8%), placeholder 0 |
| 2026-03-08 | 일리아스·손자병법·국가론 수동 수정 | Google Books URL로 개별 교체 |
| 2026-03-10 | 오매칭 전수 진단 | 오류 추정 300~400건, 6개 유형 분류 |
| 2026-03-10 | verified 전량 false 리셋 | BOOK en 2,606건 처리 |
| 2026-03-10 | 수정 프로세스 확정 | 소넷→OL→Goodreads 4단계. Google Books 배제 |
| 2026-03-10 | **en-book-verify.mjs 파이프라인 실행** | naver_book 2,364건 전량 verified. 자동 ~2,100건 + 에이전트 수동 ~260건 |
| 2026-03-10 | 한글/CJK 잔존 정리 | en_title 13건, en_creator 18건 영문 전환 완료 |

### 현재 스크립트

| 스크립트 | 용도 | 상태 |
|----------|------|------|
| `scripts/en-book-verify.mjs` | OL 검증 + ISBN + BookCover 썸네일 + DB 업데이트 | ✅ 사용 가능 |

### 이전 스크립트 참조 (전부 삭제됨)

| 스크립트 | 용도 | 상태 |
|----------|------|------|
| `isbn-en-validator.mjs` | isbn_en → Google Books 역조회 검증 | 삭제됨 |
| `isbn-en-rematcher.mjs` | 제목으로 Google Books ISBN 재매칭 | 삭제됨 |
| `creator-en-backfill.mjs` | isbn_en → Google Books creator 보충 | 삭제됨 |
| `en-thumb-bookcover-v2.mjs` | OL 저자 검증 + BookCover API 표지 | 삭제됨 |
| `en-thumb-bookcover.mjs` | ISBN 기반 BookCover (v1, 폐기) | 삭제됨 |
| `ol-thumb-validator.mjs` | OL URL 일괄 유효성 검증 | 삭제됨 |
