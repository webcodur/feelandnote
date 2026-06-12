# 콘텐츠 데이터 감사

`celeb-content-collector`가 수집한 데이터(user_contents, content_locales)의 품질을 검증하고 보완한다.

---

## 작업 절차

### Phase 1: 데이터 조회

대상 셀럽의 전체 콘텐츠를 한 번에 조회한다:

```sql
SELECT c.id, c.type, c.metadata,
       cl.locale, cl.title, cl.creator, cl.thumbnail_url, cl.isbn,
       uc.review, uc.review_en, uc.source_url, uc.created_at
FROM user_contents uc
JOIN contents c ON c.id = uc.content_id
JOIN content_locales cl ON cl.content_id = c.id
WHERE uc.user_id = '{celeb_id}'
ORDER BY c.id, cl.locale;
```

cultural_journey 본문도 함께 조회:

```sql
SELECT cultural_journey, cultural_journey_en
FROM profiles
WHERE id = '{celeb_id}';
```

### Phase 2: 출처 링크 검증

각 `source_url`을 WebFetch로 접근하여 확인한다:

| 상태 | 판정 | 조치 |
|------|------|------|
| 200 OK | 내용 대조 진행 | — |
| 403 Forbidden | 접근 불가 | 대체 출처 검색 권장으로 보고 |
| 404 Not Found | 링크 깨짐 | **대체 출처 확보 후 교체** |
| 5xx | 서버 오류 | 재시도 1회, 실패 시 보고 |

**병렬 실행**: 독립적인 URL은 최대한 병렬로 WebFetch한다.

### Phase 3: 내용 정합성 검증

출처에 접근 가능한 건에 대해:

1. **review 텍스트**가 출처 내용과 일치하는지 확인. 
   - **[주의]** 단일 출처(`source_url`)가 3자 큐레이션 사이트(예: blinkist, 서평 모음집)인 경우, 해당 사이트 자체의 환각이나 멋대로 유추한 추천일 가능성이 높다. 셀럽의 "직접 추천"이나 핵심 발언은 반드시 `search_web`을 통해 본인의 육성 인터뷰나 공식 발표 등 독립적인 1차 사료로 교차 검증해야 한다.
2. **콘텐츠 매칭**: 연결된 content의 title이 실제로 올바른 작품인지 (metadata.titleOriginal, ISBN 등 교차 확인)
3. **cultural_journey 본문**에서 해당 콘텐츠 관련 서술이 사실에 부합하는지

주의사항:
- `cultural_journey`는 generated column이다. 수정 시 **`consumption_philosophy` / `consumption_philosophy_en`**을 UPDATE한다.
- 부정확한 서술은 최소 수정 원칙으로 해당 문장만 고친다.

### Phase 4: locale 처리 검증

각 콘텐츠의 content_locales에 ko, en 양쪽이 존재하는지 확인한다.

**ko locale 규칙**:
- 한국어 번역본이 있으면: 한국어 제목 + 한국어 저자/역자
- 번역본이 없으면: **원제 그대로** + 한국어 표기 저자 (예: `"The Inability to Mourn"` / `"알렉산더 미체를리히"`)
- 임의 번역명 사용 금지. 통용되지 않는 번역명을 만들어내지 않는다.

**en locale 규칙**:
- 영문 제목 + 영문 저자

### Phase 5: thumbnail 확보

누락된 thumbnail_url을 확보한다:

| 타입 | ko locale 소스 | en locale 소스 |
|------|---------------|---------------|
| BOOK | 네이버 북 (ISBN 검색) | Google Books API 또는 Open Library |
| VIDEO | TMDB (한국어 포스터) | TMDB (영문 포스터) |

**Google Books API** (프로젝트 내장):
- 키: `sw/web-bo/.env`의 `GOOGLE_BOOKS_API_KEY_0` ~ `_4` (0번부터 순서대로 시도, 만료 시 다음 키)
- 엔드포인트: `https://www.googleapis.com/books/v1/volumes?q=isbn:{ISBN}&key={KEY}`
- 커버 URL: 응답의 `items[0].volumeInfo.imageLinks.thumbnail`에서 `zoom=1` → `zoom=2`, `http://` → `https://`로 변환

**Open Library 커버**:
- URL: `https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg`
- 1x1 GIF(GIF89a)가 반환되면 커버 없음 → Google Books로 폴백
- 리다이렉트(302)가 발생하면 커버 있음 → URL 그대로 사용 가능

**번역본 없는 외국 서적**: ko/en 양쪽에 동일한 커버 이미지를 사용한다.

### 에디션 일관성 원칙

ISBN, 표지, 출판사 등은 **하나의 에디션**에서 일관되게 가져온다. 다른 에디션(독일어판 등)의 표지만 빌려와서 영문판 ISBN에 붙이지 않는다. 표지를 교체해야 하면 해당 표지의 에디션 ISBN·메타데이터로 함께 교체한다.

### 동명이서 오매칭 주의

네이버 북 검색 시, 원서와 동일한 한국어 제목의 **해설서·연구서**가 매칭되는 경우가 있다. ko locale의 creator가 원저자가 아닌 한국인 저자이면 오매칭을 의심한다. description을 읽어 "~를 분석하는 데 목적", "~를 대상으로 해설" 등의 표현이 있으면 해설서이다. 이 경우 ko locale을 원제 패턴(원제 + 한국어 표기 저자)으로 교체한다.

---

## 보고 형식

```
## 출처 검증 결과

| # | 콘텐츠 | 링크 상태 | 내용 정합 | 판정 |
|---|--------|----------|----------|------|

## 수정 내역

| # | 대상 | 변경 전 | 변경 후 | 사유 |

## 미해결

(수동 확인이 필요한 항목)
```

---

## 주의사항

- **수정은 사실관계 오류에 한정**한다. 문체나 표현 개선은 범위 밖이다.
- source_url 교체 시, 새 출처가 review 내용을 실제로 뒷받침하는지 확인한 후 교체한다.
- contents 테이블의 user_count 정합성을 유지한다 (콘텐츠 교체 시 구/신 모두 갱신).
- metadata.titleOriginal이 실제 원제와 일치하는지 확인한다.
