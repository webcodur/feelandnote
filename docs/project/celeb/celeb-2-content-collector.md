# 2. 콘텐츠 수집

## 핵심 원칙

1. **품질 우선**: 검색을 반복해도 새로운 콘텐츠가 나오지 않을 때까지 수집
2. **효율적 검색**: 통합 키워드로 큐레이션 기사 우선 확보, 중복 검색 지양
3. **한국어 정식 출판명**: 영어 원제가 아닌 한국어 번역본 제목으로 등록

---

## 수집 규칙

### 필수
- [ ] 1작품 = 1항목 (묶지 않음)
- [ ] "N권 추천" 명시 시 수집 개수 대조
- [ ] 구체적 작품명 필수 (포괄적 언급은 대표작으로 대체)
- [ ] 동일 작품 중복 시 가장 상세한 출처 하나만

### source_url 필수 (핵심)

source_url 없이 user_contents에 INSERT하는 것은 금지한다.

- 웹 검색으로 출처 URL을 확보하지 못한 콘텐츠는 등록하지 않는다
- AI 일반 지식만으로 review를 작성하고 source_url을 빈 값으로 등록하는 행위는 금지
- 고대~근대 인물의 경우 아래 디지털 아카이브를 출처로 사용할 수 있다:
  - ctext.org (중국 고전)
  - perseus.tufts.edu (그리스·로마 고전)
  - db.itkc.or.kr (한국고전종합DB)
  - Wikipedia 인물 페이지 (해당 작품 언급이 확인 가능한 경우)
- 단, 해당 페이지에서 인물과 작품의 관계를 확인할 수 있어야 한다

### 종교 경전 포함 (중요)

**종교 경전도 감상 콘텐츠로 등록한다.**

- **성경**: 구간별 등록 가능 (마태오 복음서, 로마서, 시편 등)
- **꾸란**: 전체 또는 수라(장)별
- **불경**: 금강경, 법화경, 화엄경 등
- **도덕경**, **논어**, **맹자** 등 동양 경전
- **타입**: BOOK
- **검색**: Naver API로 한국어 출판본 우선 (예: "마태오 복음서", "꾸란 한국어")
- **ISBN**: 한국어 번역본 ISBN 사용
- **인용 근거**: 서한, 연설, 저술에서 특정 구절 인용 시 해당 경전 등록

### 본인 관련 콘텐츠 제외 (핵심)

**"셀럽이 감상한 콘텐츠"만 수집한다. 아래는 모두 제외:**

| 제외 대상 | 예시 |
|----------|------|
| **본인 창작물** | 작가의 자기 저서, 감독의 자기 영화 |
| **본인 출연작** | 배우의 출연 영화/드라마 |
| **본인이 등장하는 작품** | 잔 다르크를 소재로 한 영화/소설/음악 |
| **본인이 캐릭터로 나오는 작품** | 리처드 1세가 등장하는 게임(에이지 오브 엠파이어), 영화(로빈 후드) |
| **본인에 관한 전기/다큐** | 인물 전기, 다큐멘터리 |

### 증거 수준 기준 (고대~근대 인물 필수)

콘텐츠 등록에는 **1차 사료 기반의 구체적 증거**가 필요하다. 추측·유추로 콘텐츠를 생성하지 않는다.

| 증거 수준 | 정의 | 예시 | 판정 |
|----------|------|------|------|
| **A. 직접 언급** | 사서·서한·저술에서 **특정 작품명**을 읽었다고 명시 | 사기: "한신이 손자병법을 인용하며 답했다" | 등록 |
| **B. 직접 인용** | 연설·조서·시문에서 **특정 작품의 구절**을 인용 (사서에 출처 명시 필요) | 정관정요: "태종이 논어 구절을 인용하며 말했다" | 등록 |
| **C. 제도적 커리큘럼** | 해당 인물이 통과한 시험의 공식 과목 | 무과 합격 → 무경칠서 | **등록 불가** |
| **D. 교육 배경 유추** | "~에게 배웠으니 ~를 읽었을 것" | "그리스인 가정교사가 있었으니 호메로스를 읽었을 것" | **등록 불가** |
| **E. 시대·계층 유추** | "~시대 귀족이니 ~를 접했을 것" | "초나라 귀족이니 도덕경을 읽었을 것" | **등록 불가** |
| **F. 문화권 유추** | "~문화권이니 ~에 노출됐을 것" | "고구려 왕이니 불경을 접했을 것" | **등록 불가** |
| **G. 장르 일반 언급** | 특정 작품이 아닌 장르·분야 일반 언급 | "병법의 대략을 알면 족하다" (어떤 병법서인지 특정 불가) | **등록 불가** |

**원칙: A~B만 허용. C~G는 아무리 개연성이 높아도 등록하지 않는다.**
**핵심: 1차 사료에서 '작품명'이 특정되어야 한다. "병법을 배웠다"는 손자병법이 아니다.**

### 판별 기준

콘텐츠를 추가하기 전에 반드시 자문한다:

> "이 인물이 살아있을 때 이 콘텐츠를 직접 접하고 감상했는가?"

- **YES** → 수집 대상
- **NO** → 제외 (본인 사후 작품, 본인 소재 작품 등)
- **불확실** → 제외

---

## 검색 전략

### 단계별 검색 (중복 최소화)

**1단계: 통합 검색 (필수)**
```
{셀럽명} favorite books movies music games recommendations interview
```
- 목표: 큐레이션 기사(Top 10, Best of 등) 확보
- WebFetch: 목록형 기사 URL 발견 시 적극 실행 (여러 타입 동시 수집)

**2단계: 타입별 보충 (조건부)**

아래 **중단 조건**에 해당하지 않으면 실행:
```
{셀럽명} favorite books
{셀럽명} favorite movies
{셀럽명} favorite music
{셀럽명} favorite video games
```
- 실행 순서: 1단계에서 적게 나온 타입 우선
- 각 타입별 1회만 (같은 타입 재검색 금지)

**3단계: 한국어 보충 (조건부)**

한국 셀럽이거나 1~2단계 수집량이 10개 미만일 때만:
```
{셀럽명} 추천 책 영화 음악
```

### 중단 조건 (하나라도 해당 시 검색 종료)

- [ ] 최근 2회 검색에서 새로운 콘텐츠 0개 발견
- [ ] 여러 검색 결과가 동일한 5~7개 작품만 반복 언급
- [ ] 총 수집량이 20개 이상 (충분)

### WebFetch 활용 전략

| 케이스 | 실행 여부 |
|--------|----------|
| **큐레이션 기사** (Top 10, Best Books 등) | ✅ 적극 실행 (효율 최고) |
| **개별 리뷰/인터뷰** (1~2개 작품 언급) | ❌ 스킵 (검색 스니펫으로 충분) |
| **403/페이월 사이트** (gatesnotes.com 등) | ❌ 스킵 (차단됨) |
| **검색 스니펫에 작품 목록 이미 표시** | ❌ 스킵 (중복 작업) |

### Naver 도서 검색 효과적인 방법

- **한국어 제목으로 검색이 가장 효과적** (영어 제목 검색 성공률 ~3%)
- 한국어 제목을 모르면: 웹 검색으로 한국어 출판명 먼저 파악 → Naver로 검증
- 영어 제목만으로 Naver 검색 시 대부분 실패하므로, 영어로만 검색하지 말 것

**웹 검색으로 한국어 제목 파악**:
- 온라인 서점(YES24, 교보문고, 알라딘 등) 검색 결과 활용
- 검색 스니펫에서 한국어 제목 + 출판사 정보 확인
- 예: "The Odyssey" 검색 → "오디세이아 | 호메로스 | 열린책들" 스니펫 발견

**Naver API 검색 전략**:
1. **1차**: 한국어 제목만으로 검색 (예: "오디세이아")
2. **2차**: 결과 없거나 동명 다른 책 → 한국어 제목 + 저자명 (예: "오디세이아 호메로스")
3. **3차**: 여전히 부정확 → 한국어 제목 + 출판사명 (예: "오디세이아 열린책들")
   - 출판사명은 웹 검색에서 확인된 경우에만 사용
   - 단순 제목보다 정확도 훨씬 높음 (엉뚱한 동명 책 필터링)

**절판 책 및 ISBN 없는 책**:
- 절판된 책도 ISBN이 있으면 Naver API에서 검색 가능 (재고 여부와 무관)
- **ISBN이 없는 책은 등록하지 않는다** (고서적, 1970년대 이전 출판물 등)
- ISBN을 확보할 수 없는 도서는 수집 대상에서 제외. slug ID 생성 금지

---

## 콘텐츠 검색 API

**모든 API 호출은 `jq`로 필요한 필드만 추출한다.**

### BOOK - 네이버 도서 API

```bash
export $(grep -E "^NAVER_" ./sw/web-bo/.env | xargs) && \
curl -s "https://openapi.naver.com/v1/search/book.json?query={검색어}&display=3" \
  -H "X-Naver-Client-Id: $NAVER_CLIENT_ID" \
  -H "X-Naver-Client-Secret: $NAVER_CLIENT_SECRET" \
| jq '[.items[] | {isbn, title, author, image}]'
```

**한국어 출판명 매칭 순서**: `{한국어 제목} {저자}` → `{영문 제목} 번역` → `{영문 제목} {저자}`

**⚠️ 매칭 실패 시 폴백 규칙 (필수):**
- Naver API에서 한국어 판본을 확인하지 못하면 **영어 원제 + 영문 저자를 그대로 유지**한다
- 임의 번역 절대 금지: 영어 제목을 한국어로 번역하여 등록하는 행위는 금지
- 저자명도 동일: 한국어 출판물에 표기된 저자명만 사용, 임의 음차 금지
- 썸네일도 동일: Naver에서 한국어 판본 확인 시 Naver 이미지로 교체, 미확인 시 기존 유지

**⚠️ Naver 검색 false positive 패턴 (반드시 확인):**

| 패턴 | 예시 | 대응 |
|------|------|------|
| 영문 원서의 한국 유통판 | "양장본", "반양장", "영문판" 표기 | 제목 첫 6자가 한국어인지 확인 |
| 키워드 겹치는 다른 책 | "Orca" 검색 → 오르카 모의고사 | 저자명 일치 여부 교차 확인 |
| 동명 다른 책 | Man's Search for Meaning → 내 삶의 의미는 무엇인가(이시형) | 원저자와 Naver 결과 저자 비교 필수 |
| 번역자가 저자로 표시 | 프린키피아 by 송은영(번역자) | creator는 원저자로 등록 |
| 학습서/필사본 | "따라쓰기", "필사", "모의고사" | 제목에 해당 키워드 포함 시 제외 |
| 제목 접두어 오염 | "[그래제본소]", "논술세계대표문학 55" | 대괄호/시리즈명 제거 후 등록 |
| **동명 해설서** | "사회적 행위의 구조"(정창수) vs 파슨스 원서 | creator가 원저자인지 반드시 확인. description에 "~를 분석", "~를 해설" 등이 있으면 해설서 |

**현실적 매칭률**: 영어 도서의 ~20%만 Naver에서 한국어 판본 발견 가능. 나머지는 영어 유지가 정상이다.

### VIDEO - TMDB API

```bash
export $(grep -E "^TMDB_" ./sw/web/.env | xargs) && \
curl -s "https://api.themoviedb.org/3/search/movie?query={검색어}&language=ko-KR" \
  -H "Authorization: Bearer $TMDB_ACCESS_TOKEN" \
| jq '[.results[:3] | .[] | {id, title, poster_path}]'
```

poster_path → `https://image.tmdb.org/t/p/w500` + path

### GAME - IGDB API

```bash
export $(grep -E "^IGDB_" ./sw/web/.env | xargs) && \
curl -s "https://api.igdb.com/v4/games" \
  -H "Client-ID: $IGDB_CLIENT_ID" \
  -H "Authorization: Bearer $IGDB_ACCESS_TOKEN" \
  -d "search \"{검색어}\"; fields name,cover.url; limit 3;" \
| jq '[.[] | {id, name, cover_url: .cover.url}]'
```

### MUSIC - Spotify API

```bash
export $(grep -E "^SPOTIFY_" ./sw/web/.env | xargs) && \
curl -s "https://api.spotify.com/v1/search?q={검색어}&type=track,album&limit=3" \
  -H "Authorization: Bearer {SPOTIFY_ACCESS_TOKEN}" \
| jq '{tracks: [.tracks.items[:3][] | {id, name, artist: .artists[0].name, image: .album.images[0].url}]}'
```

---

## i18n (다국어) 필수 작업

콘텐츠 수집 단계에서 한국어·영문 데이터를 **동시에** 확보한다. 나중에 별도로 번역하지 않는다.

### 에디션 일관성 원칙 (필수)

**하나의 content_locales 행에서 ISBN, 표지(thumbnail_url), 출판사는 반드시 같은 에디션에서 가져온다.**

- 다른 에디션(독일어판 등)의 표지만 빌려와서 영문판 ISBN에 붙이지 않는다
- 표지를 교체해야 하면 해당 표지의 에디션 ISBN·메타데이터로 함께 교체한다
- ko locale과 en locale은 각각 다른 에디션(한국어판, 영문판)이 정상이지만, 한 locale 안에서는 에디션이 섞이면 안 된다

### BOOK 타입 i18n 필드 (content_locales 테이블)

| 테이블.컬럼 | locale | 설명 | 확보 방법 |
|-------------|--------|------|-----------|
| `content_locales.isbn` | ko | 한국어 판본 ISBN | Naver 도서 API |
| `content_locales.isbn` | en | 영어 판본 ISBN | OpenLibrary / Amazon / 출판사 직검색 (아래 분기) |
| `content_locales.title` | ko | 한국어 제목 | Naver 검색 결과 |
| `content_locales.title` | en | 영문 제목 | 원서 정보 (아래 분기) |
| `content_locales.creator` | en | 영문 저자명 | 원서 정보 (아래 분기) |

### 영문판 매칭 분기 (도서 원전 기준)

**Google Books API 사용 금지가 원칙이다.** 키 만료 이슈가 빈발하고 동양 고전·한국 도서에서 부적합한 결과를 반환한다.

**메타데이터(title/creator/ISBN)와 표지(thumbnail)를 별도 출처로 분리한다.** 자가출판본·번역본은 메타데이터 보유 사이트에 표지가 비어있는 경우가 많아 단일 출처 강제는 비효율이다. `sources` JSONB로 출처를 분리 표기한다.

#### 표준 4단계 파이프라인 (`docs/en-book-data-quality.md` 정합)

1. **소넷 에이전트 판단**: ko_title + ko_creator → en_title + en_creator 변환
2. **OpenLibrary**: 실존 확인 + ISBN 확보 — `https://openlibrary.org/search.json?title={en_title}&author={en_creator}` 또는 `/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data`
3. **Goodreads BookCover API**: 표지 1순위 — `https://bookcover.longitood.com/bookcover?book_title={title}&author_name={author}` (author 필수, 요청 간 500ms+ 간격)
4. **Fallback**: OpenLibrary 표지 (`https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg?default=false`) — 응답 < 1KB는 placeholder로 간주하여 폐기. 둘 다 실패 시 `thumbnail_url = null`, `sources.thumbnail = "confirmed_unavailable"`

**sources 표기**: `{"primary": "openlibrary", "thumbnail": "goodreads"}` 형태로 메타데이터·표지 출처 분리.

#### 분기별 특칙

**1) 동아시아 고전 (중국·한국·일본 원전)** — 예: 귀곡자, 음부경, 도덕경, 논어, 정관정요
- 영역본이 검증 가능하면 위 4단계 그대로 적용
- 영역본 미존재 시: `isbn = null`, title은 Wikipedia 영문 표제 (예: "Huangdi Yinfujing"), thumbnail은 Wikipedia 이미지 또는 null, `sources.primary = "wikipedia"`
- 동양 고전은 Google Books에서 한자 음차본·해설서 false positive가 잦다

**2) 한국 현대 도서 (한국 저자 한국어 원작)** — 예: 박경리 토지, 이문열 삼국지, 한강 채식주의자
- 영역본 있을 때만 en locale 등록 (위 4단계 적용)
- 영역본 미존재 시: `isbn = null`, title은 한국어 제목의 영문 음차(MR/RR), `sources.primary = "transliteration"`

**3) 서양 원서** — 영문이 원전
- 위 4단계 그대로 적용
- Naver 검색 결과의 `description`/`pubdate`에서 원서 정보 보충 가능
- Amazon 상품 페이지 스크래핑은 OpenLibrary·Goodreads 모두 실패한 경우의 최후 수단

### VIDEO/GAME/MUSIC i18n

- TMDB: `language=ko-KR`과 `language=en-US` 두 번 조회하여 한/영 제목 확보
- **VIDEO en 썸네일 필수**: TMDB `/images` API로 영문 포스터를 반드시 수집하여 `content_locales` en 행의 `thumbnail_url`에 저장한다
  - API: `GET /{movie|tv}/{id}/images?api_key={key}&include_image_languages=en,null`
  - `posters[]`에서 `iso_639_1 = "en"` 우선 (vote_average 최고), 없으면 `null`(텍스트 없는 포스터)
  - URL: `https://image.tmdb.org/t/p/w500{file_path}`
  - en 포스터 없으면 sources에 `{"thumbnail": "confirmed_unavailable"}` 마킹
- IGDB/Spotify: 기본 영문. 한국어 제목은 웹 검색으로 보충. 썸네일은 로케일 무관(동일 URL)

### review_en (감상평 영문)

`user_contents.review_en`에 영문 감상평을 **수집 시점에 함께 작성**한다.

- review(한국어) 작성 후 즉시 영문 버전 작성
- body 작성 가이드라인과 동일한 구조 유지 (첫 문장 셀럽 풀네임, 간결 서술체)
- 한국어 직접 인용 → 영문 번역 시 동일한 뉘앙스 유지

---

## 배치 DB 등록

**개별 INSERT 금지. 반드시 배치로 한 번에 등록한다.**

### contents 배치 INSERT

```sql
-- 1) contents 메인 테이블 (로케일 데이터 없음 — type, external_id 등만)
INSERT INTO contents (external_id, type, external_source)
VALUES
  ('{외부ID1}', '{TYPE}', '{source}'),
  ...
ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING
RETURNING id, external_id;

-- 2) content_locales (한국어) — 로케일 데이터의 유일한 저장소
INSERT INTO content_locales (content_id, locale, title, creator, thumbnail_url, isbn, sources, verified)
VALUES
  ('{uuid}', 'ko', '{한국어제목}', '{한국어저자}', '{썸네일}', '{isbn_ko}', '{"primary":"naver_book"}', true),
  ...
ON CONFLICT (content_id, locale) DO NOTHING;

-- 3) content_locales (영문)
INSERT INTO content_locales (content_id, locale, title, creator, thumbnail_url, isbn, sources, verified)
VALUES
  ('{uuid}', 'en', '{영문제목}', '{영문저자}', '{영문썸네일}', '{isbn_en}', '{"primary":"openlibrary|amazon|wikipedia|transliteration"}', true),
  ...
ON CONFLICT (content_id, locale) DO NOTHING;
```

**주의**: `contents` 테이블에는 title, creator, thumbnail_url 등 로케일 컬럼이 없다. 모든 로케일 데이터는 `content_locales`에만 저장한다. `contents.id`는 UUID 자동 생성, 외부 API 식별자는 `external_id`에 저장.

### user_contents 배치 INSERT

contents INSERT의 RETURNING 결과에서 UUID `id`를 확보한 뒤 사용한다.

```sql
INSERT INTO user_contents (id, user_id, content_id, status, review, review_en, source_url, visibility)
VALUES
  (gen_random_uuid(), '{셀럽ID}', '{contents.id UUID}', 'FINISHED', '{body_ko}', '{body_en}', '{source1}', 'public'),
  ...;
```

**external_source 값:**
- BOOK: `naver_book` (네이버 도서 API, 한국어판 기본) / `openlibrary` / `amazon` / `wikipedia` (영역본 부재 동양 고전)
- VIDEO: `tmdb`
- GAME: `igdb`
- MUSIC: `spotify`

**금지**: `google_books` 사용 금지 (위 "영문판 매칭 분기" 참조)

**⚠️ contents.external_id 형식 (필수):**

| 타입 | external_id 형식 | 예시 |
|------|---------|------|
| BOOK | ISBN 그대로 | `9788932917245` |
| VIDEO (영화) | **`tmdb-movie-{tmdbId}`** | `tmdb-movie-550` |
| VIDEO (TV) | **`tmdb-tv-{tmdbId}`** | `tmdb-tv-1399` |
| GAME | **`igdb-{igdbId}`** | `igdb-1942` |
| MUSIC | **`spotify-{spotifyId}`** | `spotify-0lOn8nKk4dzzRfnCCCRbwp` |

- 모든 외부 ID는 반드시 **접두사 포함** (tmdb-movie-, tmdb-tv-, igdb-, spotify-)
- 하이픈(`-`)만 사용. 언더스코어(`_`) 사용 금지
- VIDEO는 TMDB API 응답의 media_type에 따라 movie/tv 구분 필수

---

## body 작성 가이드라인

### 필수 규칙

1. **첫 문장 — 셀럽 주어 시작**: 반드시 `{셀럽 풀네임}은/는 ...`으로 시작
   - 부사구·시간 표현·수식구로 시작 금지: ❌ "기원전 335년, 알렉산더는…" / ❌ "비극의 무대 위에 오른 알렉산더는…"
   - 다른 주어로 시작 금지: ❌ "크세노폰이 그린…" / ❌ "공교롭게도 에우리피데스는…"
   - 셀럽 본인이라도 다른 조사 금지: ❌ "알렉산더에게 일리아스는…" → ⭕ "알렉산더는 일리아스를…"
2. **원문 병기 금지**: "나를 바꿨다(changed me)" → "자신을 바꿨다고 말했다"
   - **한문 직접 인용 금지**: 사기·한서 등 한문 사료의 원문 한자를 그대로 따옴표에 박지 않는다. 반드시 한글 풀이로 옮긴다.
   - ❌ `사마천은 "東事師於齊, 而習之於鬼谷先生"이라 적었다`
   - ⭕ `사마천은 "동쪽으로 제나라에 가 스승을 섬기고, 귀곡 선생에게 배웠다"고 적었다` (필요 시 핵심 한자어만 괄호 병기: 췌마(揣摩), 합종(合縱))
   - 영문(`review_en`)도 동일: 한문·중국어 원문 직접 인용 금지, 영문 풀이로 옮긴다
3. **간결 서술체**: 존댓말 금지, "~것이다" 남발 금지 (한 본문에 1회 이내)
4. **번역투 금지**: 피동형/이중피동/대시(-) 대화 금지
5. **출처 본문 통합**: 출처는 본문 안에 자연스럽게 거명한다. `출처: …` 같은 별도 라벨/꼬리표 금지
   - ⭕ "플루타르코스의 《알렉산드로스 전기》에 따르면…"
   - ⭕ "이 일화는 플루타르코스가 《알렉산드로스 전기》에 전한다."
   - ❌ 본문 끝에 `출처: 플루타르코스, 《알렉산드로스 전기》` 한 줄로 분리
   - 영문(`review_en`)도 동일. `Source: …` 라벨 금지. 본문 안에 "as Plutarch records in the *Life of Alexander*" 식으로 흡수
6. **인물명 표기 일관성**: 동일 인물이 시리즈 영상·다른 콘텐츠에서 굳혀 둔 표기가 있으면 그것을 따른다. 예) Remotion 영상에서 "알렉산더"로 통일했다면 DB review도 "알렉산더"로 (그리스어 표기 "알렉산드로스" 혼용 금지)
7. **직접 인용 말투**:
   - 지휘관/지도자(군사·정치·혁명가): 간결체 ("정복하리라")
   - 기타 남성: 정중체 ("제 인생을 바꿨습니다")
   - 여성 전체: 정중체 ("마법같은 이야기였어요")

### 좋은 예시

```
플로렌스 퓨는 2019년 인터뷰에서 이 책이 자신을 바꿨다고 말했다.
"정말 마법같은 이야기였어요. 제 삶에서도 마법이 실현될 수 있다는
믿음을 갖게 해줬습니다"라고 덧붙였다.
```

```
알렉산더는 스승 아리스토텔레스가 교정한 《일리아스》 필사본을
평생 곁에 두고 베개 아래 단검과 함께 잠들었다. 플루타르코스의
《알렉산드로스 전기》에 따르면, 그는 이 책을 "모든 군사적 덕성을
담은 보물"이라 불렀다.
```

### 나쁜 예시

```
2019년 인터뷰에서 "이 책이 나를 바꿨다(The Secret Garden changed me)"고
밝혔다. 마법같다(so magical)고 표현하며 ~했다고 함.
```

```
알렉산더에게 《일리아스》는 한 권의 책이 아니었다. 그에게 이 책은
모든 군사적 덕성을 담은 보물이었다. (...본문...)

출처: 플루타르코스, 《알렉산드로스 전기》
```
↑ 첫 문장이 "알렉산더에게"(조사 위반), 마지막 줄에 별도 출처 라벨(통합 위반).

---

## 환경 변수

프로젝트 `.env` 파일에 설정됨: `sw/web/.env`, `sw/web-bo/.env`

| 변수명 | 용도 | 타입 |
|--------|------|------|
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | 네이버 도서 API | BOOK (한국어판) |
| ~~`GOOGLE_BOOKS_API_KEY`~~ | ~~구글 도서 API~~ | **사용 금지** (위 "영문판 매칭 분기" 참조) |
| `TMDB_ACCESS_TOKEN` | TMDB API | VIDEO |
| `IGDB_CLIENT_ID` / `IGDB_ACCESS_TOKEN` | IGDB API | GAME |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Spotify API | MUSIC |

---

## 주의사항

- **WebFetch 한계**: 403 차단(gatesnotes.com 등), JS 렌더링 실패, 페이지네이션 미지원
- **누락 방지**: "N권 추천" 명시 시 반드시 개수 대조
- **셀럽 ID**: 작업 전 profiles 테이블에서 조회
