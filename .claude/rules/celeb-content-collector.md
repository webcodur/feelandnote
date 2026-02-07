# 셀럽 콘텐츠 수집 룰북

셀럽이 언급/추천/감상한 콘텐츠(도서, 영상, 게임, 음악)를 웹에서 수집하여 DB에 등록하는 가이드.

---

## 핵심 원칙

1. **품질 우선**: 검색 횟수·토큰 절약보다 정확한 판별이 우선
2. **교차 검증**: 하나의 출처만으로 판단하지 않음
3. **한국어 정식 출판명**: 영어 원제가 아닌 한국어 번역본 제목으로 등록

---

## 수집 규칙

### 필수
- [ ] 1작품 = 1항목 (묶지 않음)
- [ ] "N권 추천" 명시 시 수집 개수 대조
- [ ] 구체적 작품명 필수 (포괄적 언급은 대표작으로 대체)
- [ ] 동일 작품 중복 시 가장 상세한 출처 하나만

### 본인 관련 콘텐츠 제외 (핵심)

**"셀럽이 감상한 콘텐츠"만 수집한다. 아래는 모두 제외:**

| 제외 대상 | 예시 |
|----------|------|
| **본인 창작물** | 작가의 자기 저서, 감독의 자기 영화 |
| **본인 출연작** | 배우의 출연 영화/드라마 |
| **본인이 등장하는 작품** | 잔 다르크를 소재로 한 영화/소설/음악 |
| **본인이 캐릭터로 나오는 작품** | 리처드 1세가 등장하는 게임(에이지 오브 엠파이어), 영화(로빈 후드) |
| **본인에 관한 전기/다큐** | 인물 전기, 다큐멘터리 |

### 판별 기준

콘텐츠를 추가하기 전에 반드시 자문한다:

> "이 인물이 살아있을 때 이 콘텐츠를 직접 접하고 감상했는가?"

- **YES** → 수집 대상
- **NO** → 제외 (본인 사후 작품, 본인 소재 작품 등)
- **불확실** → 제외

---

## 검색 전략

### 타입별 개별 검색

```
# 영어 검색
{셀럽명} favorite books recommendations interview
{셀럽명} favorite movies TV shows recommendations
{셀럽명} favorite music songs playlist
{셀럽명} favorite video games

# 한국어 검색 병행
{셀럽명} 추천 책 인터뷰
{셀럽명} 좋아하는 영화 드라마
```

### WebFetch 활용

- 종합 큐레이션 기사 적극 활용 (예: "빌 게이츠가 추천한 10권")
- 검색 스니펫만으로 불충분하면 원문 확인
- 출처 교차 검증에도 활용

### Naver 도서 검색 효과적인 방법

- **한국어 제목으로 검색이 가장 효과적** (영어 제목 검색 성공률 ~3%)
- 한국어 제목을 모르면: 웹 검색으로 한국어 출판명 먼저 파악 → Naver로 검증
- 영어 제목만으로 Naver 검색 시 대부분 실패하므로, 영어로만 검색하지 말 것

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

## 배치 DB 등록

**개별 INSERT 금지. 반드시 배치로 한 번에 등록한다.**

### contents 배치 INSERT

```sql
INSERT INTO contents (id, type, title, creator, thumbnail_url, external_source)
VALUES
  ('{외부ID1}', '{TYPE}', '{제목1}', '{창작자1}', '{이미지URL1}', '{source}'),
  ('{외부ID2}', '{TYPE}', '{제목2}', '{창작자2}', '{이미지URL2}', '{source}'),
  ...
ON CONFLICT (id) DO NOTHING;
```

### user_contents 배치 INSERT

```sql
INSERT INTO user_contents (id, user_id, content_id, status, review, source_url, visibility)
VALUES
  (gen_random_uuid(), '{셀럽ID}', '{외부ID1}', 'FINISHED', '{body1}', '{source1}', 'public'),
  (gen_random_uuid(), '{셀럽ID}', '{외부ID2}', 'FINISHED', '{body2}', '{source2}', 'public'),
  ...;
```

**external_source 값:** BOOK=`naver_book`, VIDEO=`tmdb`, GAME=`igdb`, MUSIC=`spotify`

**⚠️ contents.id 형식 (필수):**

| 타입 | ID 형식 | 예시 |
|------|---------|------|
| BOOK | ISBN 그대로 | `9788932917245` |
| VIDEO | tmdb ID 그대로 | `550` |
| GAME | igdb ID 그대로 | `1942` |
| MUSIC | **`spotify-{spotifyId}`** (하이픈) | `spotify-0lOn8nKk4dzzRfnCCCRbwp` |

- MUSIC ID는 반드시 **하이픈(`-`)** 사용. 언더스코어(`_`) 사용 금지

---

## body 작성 가이드라인

### 필수 규칙

1. **첫 문장**: 반드시 `{셀럽 풀네임}은/는 ...`으로 시작. "그/그녀/이 책이" 시작 금지
2. **원문 병기 금지**: "나를 바꿨다(changed me)" → "자신을 바꿨다고 말했다"
3. **간결 서술체**: 존댓말 금지, "~것이다" 남발 금지
4. **번역투 금지**: 피동형/이중피동/대시(-) 대화 금지
5. **직접 인용 말투**:
   - 지휘관/지도자(군사·정치·혁명가): 간결체 ("정복하리라")
   - 기타 남성: 정중체 ("제 인생을 바꿨습니다")
   - 여성 전체: 정중체 ("마법같은 이야기였어요")

### 좋은 예시

```
플로렌스 퓨는 2019년 인터뷰에서 이 책이 자신을 바꿨다고 말했다.
"정말 마법같은 이야기였어요. 제 삶에서도 마법이 실현될 수 있다는
믿음을 갖게 해줬습니다"라고 덧붙였다.
```

### 나쁜 예시

```
2019년 인터뷰에서 "이 책이 나를 바꿨다(The Secret Garden changed me)"고
밝혔다. 마법같다(so magical)고 표현하며 ~했다고 함.
```

---

## 환경 변수

프로젝트 `.env` 파일에 설정됨: `sw/web/.env`, `sw/web-bo/.env`

| 변수명 | 용도 | 타입 |
|--------|------|------|
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | 네이버 도서 API | BOOK |
| `GOOGLE_BOOKS_API_KEY` | 구글 도서 API | BOOK |
| `TMDB_ACCESS_TOKEN` | TMDB API | VIDEO |
| `IGDB_CLIENT_ID` / `IGDB_ACCESS_TOKEN` | IGDB API | GAME |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Spotify API | MUSIC |

---

## 주의사항

- **WebFetch 한계**: 403 차단(gatesnotes.com 등), JS 렌더링 실패, 페이지네이션 미지원
- **누락 방지**: "N권 추천" 명시 시 반드시 개수 대조
- **셀럽 ID**: 작업 전 profiles 테이블에서 조회

---

## 기술 요구사항

- **Supabase 프로젝트 ID**: `wouqtpvfctednlffross`
- **파일 경로**: 상대 경로만 사용
