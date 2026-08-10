# 2. 콘텐츠 수집

> **최종 실측 체크: 26.08.10** — 8/9 회원·셀럽 물리 분리 뒤의 `celebs` ·
> `celeb_contents` · 조사 완료 RPC를 live DB와 현행 코드로 대조했다.
>
> 🔄 **26.08.01 BOOK 한국어 메타 출처가 네이버 → 카카오로 바뀌었다.** 네이버 도서 검색 API가 26.07.31 종료됐고([공지 32564](https://developers.naver.com/notice/article/32564)) 관련 코드는 전량 제거했다. 신규 BOOK의 한국어 메타·커버는 **카카오(`kakao_book`)**, 영문 원서는 **OpenLibrary(`openlibrary`)**만 쓴다. 전환 내역은 `docs/project/external-services.md`의 「외부 콘텐츠 검색 API」 절이 SSoT다.
>
> **직접 DB worker 은퇴(26.08.10):** 실험용 `content-research:worker`와 전용 OpenLibrary 래퍼는
> 운영 진입점으로 채택하지 않고 제거했다. 적용된 DB 조사 원장과 migration은 이력 보존용이며,
> 신규 수집은 이 문서의 콘텐츠 타입별 확정 절차를 따른다.

## 핵심 원칙

1. **품질 우선**: 검색을 반복해도 새로운 콘텐츠가 나오지 않을 때까지 수집
2. **효율적 검색**: 통합 키워드로 큐레이션 기사 우선 확보, 중복 검색 지양
3. **한국어 정식 출판명**: 영어 원제가 아닌 한국어 번역본 제목으로 등록

### 조사 상태와 0건 처리

**표시값 규약과 조사 대상 범위의 SSoT는 코드다** —
`packages/shared/src/constants/celeb-content-research.ts`(배경 설명은
`celeb-pipeline.md`「콘텐츠 수 표시」). 여기서 다시 서술하지 않는다.
이 문서는 조사를 *어떻게* 하는지만 다룬다.

이 문서가 쥐는 것은 하나다 — **`confirmed_empty`를 확정할 자격.**

- BOOK·VIDEO·GAME·MUSIC **네 유형 전부**의 출처와 후보 판정을 조사 장부에 남겨야 한다.
- 유효한 콘텐츠가 0건일 때만 완료 함수가 `confirmed_empty`를 확정한다.
- 빠른 선별이나 검색 1회 실패만으로 확정하지 않는다.
- 장부 없이 상태만 바꾸는 경로는 DB 가드가 거부한다.

> 26.07.29~30에 장부 없이 상태만 박은 302명이 있었고 26.08.07에 전원 `open`으로
> 되돌렸다. **장부가 뒷받침하지 않는 `confirmed_empty`는 만들지 마라.**

감상여정은 **후보를 찾는 캐시**이지 등록 증거가 아니다. 작품명은 반드시 이
문서의 source_url·증거 수준 규칙으로 다시 검증한다.

### 조사 장부 쓰는 법

장부는 네 테이블이다 — `celeb_content_research_runs`(실행) ·
`_scopes`(유형별 진행) · `_findings`(후보 판정) · `_sources`(확인한 출처).
화면(web-bo `/celebs/content-research/<celebId>`)으로도, SQL로도 쓸 수 있다.
현행 스키마·가드·완료 함수는
`sw/web/supabase/migrations/20260809183609_complete_profile_domain_triggers.sql`을 따른다.

**인물 1명당 순서**

1. **실행 개설** — `celeb_content_research_runs` 에 INSERT.
   `celeb_id` · `batch_key`(회차 식별자) · `researcher_label`(작업조) ·
   `name_variants`(실제 검색에 쓴 표기 배열, 비면 거부) · `homonym_notes`.
   INSERT하면 BOOK·VIDEO·GAME·MUSIC 네 범위가 트리거로 자동 생성된다.
   인물당 진행 중 실행은 하나만 허용된다.
2. **출처 기록** — `_sources`. `finding_id`가 NULL이면 "그 유형 전체를 이것으로 훑었다"는 뜻이며,
   **유형마다 이런 줄이 최소 하나** 있어야 완료된다.
   `source_tier`는 `primary`(본인 발언·서한·1차 사료)/`secondary`,
   `source_kind`는 `direct_statement` `interview` `official_profile` `social_post`
   `transcript` `archive` `article` `other`,
   `access_status`는 `accessible` `bot_blocked` `archived` `unavailable`.
   같은 실행 안에서 (url, finding_id) 조합은 중복 불가.
3. **후보 판정** — `_findings`. `candidate`로 남기면 완료가 거부된다.
   `accepted`는 `content_id`(등록을 먼저 끝내고 그 값)와 근거 요약이,
   `rejected`는 근거 요약과 기각 사유가 필수다.
   **판정마다 `finding_id`를 채운 출처를 한 줄 더 넣고, 채택 건은 그중 하나가 `primary`여야 한다.**
4. **유형별 완료** — `_scopes`를 `status='completed'`, `completed_at=now()`로. 네 유형 모두.
5. **실행 완료** — `SELECT * FROM complete_celeb_content_research_run('{run_id}')`.
   네 유형 완료·유형별 출처·미판정 후보 없음·채택 건의 1차 출처·채택 건의 `celeb_contents` 연결·
   유형 일치를 이 함수가 전부 검사한다. 통과하면 해당 셀럽의 실제 `celeb_contents`를 세어
   0건은 `confirmed_empty`, 1건 이상은 `open`으로 `celebs.content_research_status`를 확정한다.

⛔ **`celebs.content_research_status`를 `confirmed_empty`로 직접 UPDATE하지 마라.** 완료 함수만이
확정 자격을 가진다.

## 수집 규칙

### 필수
- [ ] 1작품 = 1항목 (묶지 않음)
- [ ] "N권 추천" 명시 시 수집 개수 대조
- [ ] 구체적 작품명 필수 (포괄적 언급은 대표작으로 대체)
- [ ] 동일 작품 중복 시 가장 상세한 출처 하나만
- [ ] **MUSIC도 조사한 작업에서 iTunes 확인과 최종 등록까지 마친다** (아래)

### 유형별 등록 경로

| 유형 | 조사 중에 할 일 |
|------|------------------|
| BOOK · VIDEO · GAME | 평소대로 `contents` + `content_locales` + `celeb_contents` 등록 |
| **MUSIC** | iTunes 정확 트랙과 `previewUrl`을 확인한 뒤 `contents` + KO/EN `content_locales` + `celeb_contents` 등록 |

`celeb_music_candidates`는 26.08.01 일괄 작업에서 쓰던 레거시 재개 장부다. 신규
조사 결과를 `pending`으로 넣고 다음 작업으로 넘기지 않는다. 레거시 행을 다룰 때도
`/celeb-music-collect`로 그 실행 안에서 `registered` 또는 `rejected`까지 마감하고,
해당 인물의 `pending=0`을 종료 조건으로 삼는다.

증거 기준(A·B급, source_url 필수)은 MUSIC도 똑같이 적용한다. 근거가 약한 것을
일단 적치하지 말고 조사한 자리에서 기각한다.

### source_url 필수 (핵심)

source_url 없이 `celeb_contents`에 INSERT하는 것은 금지한다.

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
- **검색**: 카카오 도서 API로 한국어 출판본 우선 (예: "마태오 복음서", "꾸란 한국어")
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

**커버·연습곡 판정 (26.08.01 기준 확정)**: 가수가 남의 곡을 부른 사실만으로는 등록하지 않는다(그 곡을 "수행"한 것이지 감상한 증거가 아니다). **그 곡을 알게 된 경위나 애착이 함께 진술될 때만 원곡을 등록한다.**
- ⭕ "연습생 때 일본어를 공부하다 알게 됐고, 옛 기억이 되살아나 직접 불렀다" → 원곡 등록 (김채원 / 우타다 히카루 〈First Love〉)
- ❌ 팬 정리글에 커버 목록만 있고 본인 언급이 없음 → 기각 (배이 커버곡 3건)
- 등록 대상은 언제나 **원곡**이지 본인이 부른 커버 영상이 아니다.

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

**검색 종료와 `confirmed_empty` 확정은 같은 말이 아니다.** 확정 자격은 이 문서
「조사 상태와 0건 처리」 절이 정한다 — 네 유형 전부의 장부가 있어야 한다.

### WebFetch 활용 전략

| 케이스 | 실행 여부 |
|--------|----------|
| **큐레이션 기사** (Top 10, Best Books 등) | ✅ 적극 실행 (효율 최고) |
| **개별 리뷰/인터뷰** (1~2개 작품 언급) | ❌ 스킵 (검색 스니펫으로 충분) |
| **403/페이월 사이트** (gatesnotes.com 등) | ❌ 스킵 (차단됨) |
| **검색 스니펫에 작품 목록 이미 표시** | ❌ 스킵 (중복 작업) |

### 카카오 도서 검색 효과적인 방법

- **한국어 제목으로 검색이 가장 효과적**. 한국어 제목을 모르면 웹 검색으로 한국어 출판명을 먼저 파악한 뒤 카카오로 검증한다.
- 카카오는 원서(영문) 판본도 함께 잡히므로 영어 제목 검색도 네이버 시절보다 쓸 만하다. 다만 한국어판이 있으면 한국어판을 우선한다.
- 카카오는 `target`으로 항목을 지정할 수 있다: `title`·`isbn`·`publisher`·`person`. 래퍼(`kakao-books.ts`)는 검색어가 ISBN 하나뿐이면 자동으로 `target=isbn`으로 전환한다.

**웹 검색으로 한국어 제목 파악**:
- 온라인 서점(YES24, 교보문고, 알라딘 등) 검색 결과 활용
- 검색 스니펫에서 한국어 제목 + 출판사 정보 확인
- 예: "The Odyssey" 검색 → "오디세이아 | 호메로스 | 열린책들" 스니펫 발견

**판본 실재 게이트 (필수)**:
- BOOK은 ISBN만 있다고 등록하지 않는다. **그 판본이 실제로 유통되는 물건임을 확인해야 한다.**
- **카카오 응답의 `status`(→ `metadata.salesStatus`)가 1차 판정 수단이다.** `정상판매`면 통과다. 카카오 검색으로 해당 ISBN이 잡히고 제목·저자가 일치하면 별도 서점 페이지를 열 필요가 없다.
- `품절`·`절판`은 자동 실패가 아니다. 판본이 식별되면 등록할 수 있다. 다만 이때는 YES24·교보문고·알라딘 중 한 곳에서 그 ISBN의 상품 상세 페이지가 실제로 열리는지 한 번 더 확인한다.
- `status`가 빈 문자열이거나 카카오에서 해당 ISBN이 안 잡히면 서점 상품 상세 페이지 확인으로 대체한다. 검색엔진 스니펫, 출판사 소개, 도서관 소장 정보, OpenLibrary 레코드만으로는 통과하지 못한다.
- 제목·저자·ISBN을 대조한다. 동명 해설서·일부 권·다른 번역판이면 실패다.
- 어느 경로로도 판본이 확인되지 않으면 증거가 강해도 `contents`와 `celeb_contents`를 만들지 않고 해당 BOOK 후보를 기각한다. 그 인물의 `full` 승격과 Remotion 스캐폴딩에도 사용하지 않는다.

**카카오 검색 전략**:
1. **1차**: 한국어 제목만으로 검색 (예: "오디세이아")
2. **2차**: 결과가 없거나 동명 다른 책 → 제목 + 저자명 (예: "오디세이아 호메로스")
3. **3차**: 여전히 부정확 → 제목 + 출판사명 (예: "오디세이아 열린책들")
   - 출판사명은 웹 검색에서 확인된 경우에만 사용
4. ISBN을 이미 아는 경우 ISBN만으로 조회하면 단건이 정확히 잡힌다

**응답 처리 주의 (네이버와 다른 점)**:
- `isbn` 필드에 **10자리와 13자리가 한 칸에 붙어 온다**(`"8954655971 9788954655972"`). 13자리를 쓴다.
- `thumbnail`은 가로 120px로 작고 크기를 키워 요청하면 403이다. `fname` 파라미터에 담긴 원본 주소(`t1.daumcdn.net`)를 꺼내 https로 승격해 쓴다. 래퍼가 이미 처리한다.
- `authors`가 비고 `translators`만 있는 항목이 있다. 래퍼는 이때 `홍길동 (역)` 형태로 채운다.

**절판 책 및 ISBN 없는 책**:
- 절판된 책도 ISBN과 위의 **판본 실재 게이트**를 통과하면 등록할 수 있다.
- **ISBN이 없는 책은 등록하지 않는다** (고서적, 1970년대 이전 출판물 등)
- ISBN을 확보할 수 없는 도서는 수집 대상에서 제외. slug ID 생성 금지

---

## 콘텐츠 검색 API

### 이 환경(Windows + Git Bash)의 함정 — 착수 전 반드시 읽는다

26.08.01 배치에서 8개 작업자가 전원 같은 곳에 걸렸다. 모르고 시작하면 "결과 0건"을 진짜 0건으로 오인한다.

| 함정 | 증상 | 대응 |
|------|------|------|
| **curl이 한글 쿼리를 깨뜨린다** | `curl -G --data-urlencode "query=여행의 이유"` → **에러 없이 0건**. 시스템 코드페이지(949)로 인코딩돼 나간다 | Python `urllib.parse.quote`로 미리 퍼센트 인코딩한 URL을 박거나, Python에서 직접 호출한다. **0건이 나오면 먼저 이걸 의심한다** |
| `jq`가 없다 | `jq: command not found` | `node -e`로 JSON 파싱 |
| `python3`가 Windows Store 스텁 | 인자를 무시하고 exit 49 | `python`을 쓰거나 `/c/Users/webco/AppData/Local/Programs/Python/Python312/python.exe` |
| 한글 출력이 깨진다 | `UnicodeEncodeError: 'cp949'` | 모든 python 호출에 `PYTHONIOENCODING=utf-8` |
| Windows python이 `/tmp`를 못 읽는다 | 파일 없음 오류 | 스크래치패드 절대경로(`C:/Users/...`) 사용 |
| **스크래치패드를 다른 세션과 공유한다** | 같은 파일명이 덮어써진다 | 파일명에 작업자 접두어를 붙인다 |
| **WebSearch 세션 한도 200회** | 배치 도중(때로는 시작 전부터) 소진 | `html.duckduckgo.com/html/?q=` 또는 `lite.duckduckgo.com`을 WebFetch로 열기, Bing 병행. 차단 URL은 `r.jina.ai/{URL}` 프록시나 `insane-search` 스킬 |
| 유튜브 인터뷰 | 본문이 영상 안에만 있음 | `yt-dlp`로 자막 추출 — 실제로 여러 건이 이 경로로만 확인됐다 |

**후보 탐색 캐시(등록 근거로는 쓰지 않는다)**: `favorbook.co.kr/share/{이름}.html`, `polarbooks.kr/bookshelf/{이름}` — 셀럽 독서 기록을 원본 링크와 함께 모아둔 곳이라 후보를 빠르게 훑기 좋다. **반드시 원본 인터뷰를 열어 재확인한 뒤 등록한다.**

### BOOK - 카카오 도서 API

```bash
export $(grep -E "^KAKAO_REST_API_KEY" ./sw/web-bo/.env | xargs) && \
curl -s -G "https://dapi.kakao.com/v3/search/book" \
  --data-urlencode "query={검색어}" --data-urlencode "size=3" \
  -H "Authorization: KakaoAK $KAKAO_REST_API_KEY" \
| jq '[.documents[] | {isbn, title, authors, publisher, status, thumbnail}]'
```

- ISBN 지정 조회: `--data-urlencode "target=isbn"` 추가
- 코드에서는 `packages/content-search/src/kakao-books.ts`의 `searchBooks`·`getBookByIsbn`을 쓴다(ISBN 선택·표지 원본 추출·판매 상태 매핑이 들어 있다).

**한국어 출판명 매칭 순서**: `{한국어 제목} {저자}` → `{영문 제목} 번역` → `{영문 제목} {저자}`

**⚠️ 매칭 실패 시 폴백 규칙 (필수):**
- 카카오에서 한국어 판본을 확인하지 못하면 **영어 원제 + 영문 저자를 그대로 유지**한다
- 임의 번역 절대 금지: 영어 제목을 한국어로 번역하여 등록하는 행위는 금지
- 저자명도 동일: 한국어 출판물에 표기된 저자명만 사용, 임의 음차 금지
- 썸네일도 동일: 한국어 판본 확인 시 그 표지로 교체, 미확인 시 기존 유지

**⚠️ 도서 검색 false positive 패턴 (반드시 확인):**

| 패턴 | 예시 | 대응 |
|------|------|------|
| 영문 원서의 한국 유통판 | "양장본", "반양장", "영문판" 표기 | 제목 첫 6자가 한국어인지 확인 |
| 키워드 겹치는 다른 책 | "Orca" 검색 → 오르카 모의고사 | 저자명 일치 여부 교차 확인 |
| 동명 다른 책 | Man's Search for Meaning → 내 삶의 의미는 무엇인가(이시형) | 원저자와 검색 결과 저자 비교 필수 |
| 번역자가 저자로 표시 | 프린키피아 by 송은영(번역자) | creator는 원저자로 등록. 카카오는 `authors`/`translators`가 분리돼 있어 판별이 쉽다 |
| 학습서/필사본 | "따라쓰기", "필사", "모의고사" | 제목에 해당 키워드 포함 시 제외 |
| 제목 접두어 오염 | "[그래제본소]", "논술세계대표문학 55" | 대괄호/시리즈명 제거 후 등록 |
| **동명 해설서** | "사회적 행위의 구조"(정창수) vs 파슨스 원서 | creator가 원저자인지 반드시 확인. 소개문에 "~를 분석", "~를 해설" 등이 있으면 해설서 |

### VIDEO - TMDB API

⚠️ **`.env`에 있는 변수는 `TMDB_API_KEY`(v3 키) 하나뿐이다.** 예전 룰북이 적어 둔 `TMDB_ACCESS_TOKEN`(Bearer 방식)은 이 프로젝트에 없어서 401이 난다. 쿼리 파라미터 방식을 쓴다.

```bash
export $(grep -E "^TMDB_API_KEY" ./sw/web/.env | xargs) && \
curl -s "https://api.themoviedb.org/3/search/movie?api_key=$TMDB_API_KEY&query={검색어}&language=ko-KR" \
| node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.stringify(JSON.parse(s).results.slice(0,3).map(({id,title,poster_path})=>({id,title,poster_path})),null,1)))"
```

poster_path → `https://image.tmdb.org/t/p/w500` + path

### GAME - IGDB API

⚠️ **자격증명 이름이 `IGDB_*`가 아니라 `TWITCH_*`다.** IGDB는 트위치 계정으로 인증하기 때문이다.
`.env`에서 `IGDB_`로 찾으면 안 나온다(26.08.01 작업조가 실제로 여기서 막혔다).
**토큰은 저장돼 있지 않다 — 매번 트위치에서 발급받아 쓴다.**

```bash
export $(grep -E "^TWITCH_CLIENT_(ID|SECRET)=" ./sw/web/.env | xargs) && \
TOKEN=$(curl -s -X POST "https://id.twitch.tv/oauth2/token?client_id=$TWITCH_CLIENT_ID&client_secret=$TWITCH_CLIENT_SECRET&grant_type=client_credentials" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).access_token))") && \
curl -s "https://api.igdb.com/v4/games" \
  -H "Client-ID: $TWITCH_CLIENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -d "search \"{검색어}\"; fields name,cover.url; limit 3;" \
| node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(s))"
```

코드에서는 `packages/content-search/src/igdb.ts`가 토큰 발급·갱신을 알아서 한다. **26.08.01 실측 정상.**

### MUSIC - 아이튠즈 〔조사한 작업에서 즉시 등록〕

Spotify는 26.02 개발자 모드 정책 변경으로 앱 소유자의 유료 구독을 요구하게 됐고 26.08.01 우리 앱에 적용돼 조회가 전부 403이다. 아이튠즈가 그 자리를 대신한다(래퍼: `packages/content-search/src/itunes-music.ts`).

> **음악 후보를 찾았으면 같은 작업에서 iTunes 트랙을 확인하고 최종 연결한다.**
> 제목·아티스트가 맞고 `previewUrl`이 있는 트랙만 `contents`·KO/EN
> `content_locales`·`celeb_contents`에 등록한다. 기존 iTunes 콘텐츠가 있으면 재사용한다.
> `celeb_music_candidates.pending`에 남기는 것은 완료가 아니다.
> `celeb_contents.review`와 `review_en`도 최종 연결과 함께 작성한다.

레거시 후보를 처리할 때만 아래 명령을 쓴다.

```bash
cd sw/web-bo
node scripts/itunes-music-migrate.mjs --candidates-only \
  --candidate-id <candidate-uuid> \
  --review-en "<English review>"
node scripts/itunes-music-migrate.mjs --candidates-only --all-pending
node scripts/itunes-music-migrate.mjs --candidates-only --limit 10 --dry-run
```

- 신규 조사는 인물당 몇 건 수준이므로 즉시 처리한다.
- 한국어 `evidence` 후보는 `--candidate-id`와 `--review-en`이 함께 있어야 한다. 없으면
  provider 조회와 DB 쓰기 전에 중단한다. `review_en` 후속 백필을 전제로 한 일괄 등록은 금지한다.
- 외부 호출은 순차로 최소 2초 간격을 두며, 403/429를 기각으로 기록하지 않는다.
- **미리듣기 음원(`previewUrl`)이 없는 곡은 옮기지 않는다.** 옮기는 순간 재생이 끊긴다(실제로 80곡을 그렇게 죽였다가 백업에서 되돌렸다).
- 재생은 우리 플레이어가 미리듣기 음원을 직접 재생한다. `metadata.previewUrl`이 그 주소다.
- `contents.external_source`는 `itunes`, `external_id`는 `itunes-{trackId}`.
- 작업 종료 시 해당 인물의 `pending` 후보가 0인지 재조회한다.

### MUSIC - Spotify API 〔🔴 26.08.01 차단 — 참고용 호출 규격〕

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
| `content_locales.isbn` | ko | 한국어 판본 ISBN | 카카오 도서 API |
| `content_locales.isbn` | en | 영어 판본 ISBN | OpenLibrary (아래 분기) |
| `content_locales.title` | ko | 한국어 제목 | 카카오 검색 결과 |
| `content_locales.title` | en | 영문 제목 | 원서 정보 (아래 분기) |
| `content_locales.creator` | en | 영문 저자명 | 원서 정보 (아래 분기) |

### 영문판 매칭 분기 (도서 원전 기준)

**Google Books API 사용 금지가 원칙이다.** 키 만료 이슈가 빈발하고 동양 고전·한국 도서에서 부적합한 결과를 반환한다.

**메타데이터(title/creator/ISBN)와 표지(thumbnail)를 별도 출처로 분리한다.** 자가출판본·번역본은 메타데이터 보유 사이트에 표지가 비어있는 경우가 많아 단일 출처 강제는 비효율이다. `sources` JSONB로 출처를 분리 표기한다.

#### 표준 파이프라인 (26.08.01 개정)

1. **영문 검색어 준비**: ko_title + ko_creator에서 en_title + en_creator를 확인한다. 이 변환값 자체를 메타 출처로 기록하지 않는다.
2. **카카오 도서**: 한국어판의 메타·ISBN·표지를 확인한다. ko locale의 신규 출처는 `kakao_book`이다.
3. **OpenLibrary**: 영문 원서의 메타·ISBN을 확인한다 — `https://openlibrary.org/search.json?title={en_title}&author={en_creator}` 또는 `/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data`. en locale의 신규 출처는 `openlibrary`다.
4. **OpenLibrary 표지**: `https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg?default=false` — 응답 < 1KB는 placeholder로 간주해 폐기
5. **모두 실패**: `thumbnail_url = null`, `sources.thumbnail = "confirmed_unavailable"`. 표지 없이 등록한다

> ⛔ **~~Goodreads BookCover API~~는 폐기 경로다. 호출하지 마라.**
> `bookcover.longitood.com`은 Goodreads 공식 API가 아니라 개인이 운영하던 중개 서비스이고,
> **26.08.01 실측에서 522(원 서버 응답 없음)로 죽어 있다.** 유명 도서로 물어도 응답이 없다.
> Goodreads는 2020년에 공개 API를 닫았으므로 대체 통로도 없다.
> 다만 **이미 확보한 `i.gr-assets.com` 표지 1,794장은 정상이다** — 이미지 서버는 살아 있으니 교체할 필요 없다.

**카카오·OpenLibrary 모두 없는 책**: 한국 유통 이력이 없는 희귀 리프린트·자가출판·비영어권 원서다. 허용된 메타 원천에서 판본을 확인할 수 없으므로 신규 BOOK으로 등록하지 않는다.

**sources 표기**: `{"primary": "kakao_book", "thumbnail": "kakao_book"}` 형태로 메타데이터·표지 출처 분리. 표지를 못 구하면 `"thumbnail": "confirmed_unavailable"`.

#### 분기별 특칙

**1) 동아시아 고전 (중국·한국·일본 원전)** — 예: 귀곡자, 음부경, 도덕경, 논어, 정관정요
- 영역본이 검증 가능하면 위 4단계 그대로 적용
- **영역본 미존재 시: 영문 줄 등록 폐기**. ISBN 없는 책을 외부에 노출할 길이 없다(독자가 그 책으로 도달할 수단이 없음). en locale 행 자체를 INSERT하지 않는다. 한국어판이 있으면 ko 줄만 등록 가능.
- 동양 고전은 Google Books에서 한자 음차본·해설서 false positive가 잦다

**2) 한국 현대 도서 (한국 저자 한국어 원작)** — 예: 박경리 토지, 이문열 삼국지, 한강 채식주의자
- 영역본 있을 때만 en locale 등록 (위 4단계 적용)
- 영역본 미존재 시: en locale을 등록하지 않는다. 영문 메타를 음차로 만들어내지 않는다

**3) 서양 원서** — 영문이 원전
- 위 4단계 그대로 적용
- 카카오 검색 결과의 `contents`(소개문)/`datetime`은 한국어판 정보에만 사용한다
- OpenLibrary에서 영문 원서를 확인하지 못하면 영문 줄 등록을 폐기한다 (아마존 스크래핑 금지 — 공식 API 부재·접근권 제한·실사용 0건)

### VIDEO/GAME/MUSIC i18n

- TMDB: `language=ko-KR`과 `language=en-US` 두 번 조회하여 한/영 제목 확보
- **VIDEO en 썸네일 필수**: TMDB `/images` API로 영문 포스터를 반드시 수집하여 `content_locales` en 행의 `thumbnail_url`에 저장한다
  - API: `GET /{movie|tv}/{id}/images?api_key={key}&include_image_languages=en,null`
  - `posters[]`에서 `iso_639_1 = "en"` 우선 (vote_average 최고), 없으면 `null`(텍스트 없는 포스터)
  - URL: `https://image.tmdb.org/t/p/w500{file_path}`
  - en 포스터 없으면 sources에 `{"thumbnail": "confirmed_unavailable"}` 마킹
- IGDB/iTunes: 기본 영문. 한국어 제목은 웹 검색으로 보충. 썸네일은 로케일 무관(동일 URL)

### review_en (감상평 영문)

`celeb_contents.review_en`에 영문 감상평을 **수집 시점에 함께 작성**한다.

- review(한국어) 작성 후 즉시 영문 버전 작성
- body 작성 가이드라인과 동일한 구조 유지 (첫 문장 셀럽 풀네임, 간결 서술체)
- 한국어 직접 인용 → 영문 번역 시 동일한 뉘앙스 유지

---

## 배치 DB 등록

**한 후보의 `contents`·locale·인물 연결을 중간 상태로 남기지 않는다.** 여러 후보를
한 인물에서 찾았다면 그 인물 작업 안에서 전부 등록·재조회한다. MUSIC도 예외가 아니다.

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
  ('{uuid}', 'ko', '{한국어제목}', '{한국어저자}', '{썸네일}', '{isbn_ko}', '{"primary":"kakao_book"}', true),
  ...
ON CONFLICT (content_id, locale) DO NOTHING;

-- 3) content_locales (영문)
INSERT INTO content_locales (content_id, locale, title, creator, thumbnail_url, isbn, sources, verified)
VALUES
  ('{uuid}', 'en', '{영문제목}', '{영문저자}', '{영문썸네일}', '{isbn_en}', '{"primary":"openlibrary"}', true),
  ...
ON CONFLICT (content_id, locale) DO NOTHING;
```

**주의**: `contents` 테이블에는 title, creator, thumbnail_url 등 로케일 컬럼이 없다. 모든 로케일 데이터는 `content_locales`에만 저장한다. `contents.id`는 UUID 자동 생성, 외부 API 식별자는 `external_id`에 저장.

### celeb_contents 배치 INSERT

contents INSERT의 RETURNING 결과에서 UUID `id`를 확보한 뒤 사용한다.

```sql
INSERT INTO celeb_contents (id, celeb_id, content_id, status, review, review_en, source_url, visibility)
VALUES
  (gen_random_uuid(), '{셀럽ID}', '{contents.id UUID}', 'FINISHED', '{body_ko}', '{body_en}', '{source1}', 'public'),
  ...;
```

**external_source 값** (contents 테이블 — 책 1권의 1차 메타 출처. 그 책의 ISBN·표지를 어디서 잡았는가):
- BOOK: `kakao_book` (한국어판) / `openlibrary` (영문 원서)
  - 서점 상품 페이지는 판본 실재 검증에만 쓴다. `aladin`을 신규 BOOK 메타·커버 출처로 기록하지 않는다
  - `naver_book`은 26.07.31 API 종료 뒤 신규 사용 금지이며, 2026-08-10 live CHECK에도 없다
- VIDEO: `tmdb`
- GAME: `igdb`
- MUSIC: `itunes` (현행 등록 경로). `spotify`는 기존 데이터 호환 값이다

**금지**:
- `google_books` 사용 금지 — **일일 호출 한도 1,000건이라 대량 수집에 못 쓴다.** `sw/web-bo/.env`에 키가 `GOOGLE_BOOKS_API_KEY_0`~`_4`로 5개 있는 것이 한도를 늘리려 키를 돌려쓴 흔적이고, 그렇게 해도 부족해 폐기했다. 무료라고 되살리지 마라 — 한도가 문제지 비용이 문제가 아니다. 시스템 제약상 기존 데이터 보존을 위해 enum과 잔존 데이터(`external_source='google_books'` 249건)는 남아 있으나 신규 등록 사용 금지. (위 "영문판 매칭 분기" 참조)
- `amazon` 사용 금지 (공식 API 부재·접근권 제한·실사용 0건).
- `wikipedia` 사용 금지 (ISBN 없는 책을 외부에 연결할 길이 없음 — 영역본 미존재 시 영문 줄 등록 폐기).

**⚠️ contents.external_id 형식 (필수):**

| 타입 | external_id 형식 | 예시 |
|------|---------|------|
| BOOK | ISBN 그대로 | `9788932917245` |
| VIDEO (영화) | **`tmdb-movie-{tmdbId}`** | `tmdb-movie-550` |
| VIDEO (TV) | **`tmdb-tv-{tmdbId}`** | `tmdb-tv-1399` |
| GAME | **`igdb-{igdbId}`** | `igdb-1942` |
| MUSIC | **`itunes-{trackId}`** | `itunes-1440857781` |

- 모든 외부 ID는 반드시 **접두사 포함** (tmdb-movie-, tmdb-tv-, igdb-, itunes-)
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

> ⚠️ **이 표는 `packages/content-search/src/*.ts`가 실제로 읽는 이름을 적는다.** 서비스 이름과 변수 이름이
> 다른 경우가 있어(IGDB는 트위치 계정으로 인증한다) 짐작으로 찾으면 "자격증명이 없다"는 오진이 난다.
> 26.08.01에 TMDB·IGDB 두 건이 실제로 그렇게 어긋나 있었다. **표를 고칠 때는 코드를 열어 확인한다.**

| 변수명 | 용도 | 타입 | 26.08.01 실측 |
|--------|------|------|---------------|
| `KAKAO_REST_API_KEY` | 카카오 도서 API | BOOK | 정상. 앱 `feelandnote`(ID 1366184)의 REST API 키 |
| `TMDB_API_KEY` | TMDB API | VIDEO | 정상. **`TMDB_ACCESS_TOKEN`이 아니다** — Bearer 방식은 401이 난다. `api_key` 쿼리 파라미터로 쓴다 |
| `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` | IGDB API | GAME | 정상. **`IGDB_*`가 아니다** — IGDB는 트위치 계정으로 인증한다. 토큰은 저장돼 있지 않고 매번 발급받는다 |
| (없음) | 아이튠즈 | MUSIC | 인증·키가 없는 공개 창구. 대신 IP 속도 제한이 있다 |
| ~~`SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`~~ | ~~Spotify API~~ | ~~MUSIC~~ | **26.08.01 차단.** 토큰 발급은 되지만 모든 조회가 403 |
| ~~`GOOGLE_BOOKS_API_KEY`~~ | ~~구글 도서 API~~ | — | **사용 금지** (위 "영문판 매칭 분기" 참조) |
| ~~`NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET`~~ | ~~네이버 도서~~ | — | **26.07.31 종료.** 같은 키의 뉴스·블로그·이미지 검색은 계속 유효하다 |

---

## 주의사항

- **WebFetch 한계**: 403 차단(gatesnotes.com 등), JS 렌더링 실패, 페이지네이션 미지원
- **누락 방지**: "N권 추천" 명시 시 반드시 개수 대조
- **셀럽 ID**: 작업 전 `celebs` 테이블에서 조회
