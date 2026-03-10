# 셀럽 창작물 수집 룰북

셀럽이 직접 창작한 작품(저서, 감독 영화, 작곡, 미술 작품 등)을 웹에서 조사하여 `celeb_works` 테이블에 등록하는 가이드.

---

## 핵심 원칙

1. **대표작 우선**: 대표 창작물부터 수집. 모든 작품을 등록할 필요 없다
2. **창작 배경 필수**: 작품명만 나열하지 않는다. 각 작품의 창작 배경/동기를 서술한다
3. **기존 콘텐츠 연결**: DB에 이미 있는 콘텐츠는 새로 등록하지 않고 content_id로 연결한다

---

## 수집 대상

| 대상 | 예시 | work_type |
|------|------|-----------|
| 저서 | 작가의 저서, 학자의 논문집 | BOOK |
| 감독 영화/드라마 | 감독의 연출 작품 | VIDEO |
| 작곡 | 작곡가의 곡, 앨범 | MUSIC |
| 게임 제작 | 개발자의 제작 게임 | GAME |
| 미술 작품 | 회화, 조각, 건축 | ART |

### 수집 제외 대상

| 제외 대상 | 사유 |
|----------|------|
| 본인 출연작 (배우의 출연 영화) | 감상 콘텐츠 수집 에이전트 영역 아님, 창작물도 아님 |
| 본인에 관한 전기/다큐 (타인 제작) | 타인의 창작물 |
| 미완성 작품 | 작품으로 인정 불가 |
| 대필/고스트라이팅 작품 | 역할 불명확 |

---

## role (역할) 값

| role | 한국어 | 적용 대상 |
|------|--------|----------|
| `author` | 저자 | 책 집필 |
| `director` | 감독 | 영화/드라마 연출 |
| `composer` | 작곡 | 음악 작곡 |
| `artist` | 작가 | 회화, 조각, 건축 |
| `editor` | 편저 | 편찬, 엮음 |
| `screenwriter` | 각본 | 영화/드라마 각본 |
| `developer` | 개발 | 게임 개발 |
| `performer` | 연주 | 음악 연주/지휘 |

한 인물이 같은 작품에서 여러 역할을 한 경우(감독+각본), **주된 역할 하나만** 등록한다.

---

## 검색 전략

### 1단계: 대표작 조사 (필수)

```
{셀럽명} 대표작 목록
{셀럽명} bibliography / filmography / discography / artworks
{셀럽명} notable works
```

- 위키피디아 작품 목록 페이지가 가장 효율적
- WebFetch로 위키피디아 페이지 확보

### 2단계: 창작 배경 조사 (필수)

각 작품별로 창작 동기/배경을 조사한다:
```
{작품명} 집필 배경 / 창작 동기
{작품명} behind the scenes / making of / inspiration
```

### 중단 조건

- 대표작 10~20개 확보 시 충분
- 마이너 작품까지 무한 수집 금지

---

## 기존 콘텐츠 연결

DB에 이미 등록된 콘텐츠가 있으면 새로 만들지 않고 연결한다.

```sql
-- 기존 콘텐츠 확인 (제목으로 검색)
SELECT c.id, c.type, c.external_id, cl.title, cl.creator
FROM contents c
JOIN content_locales cl ON cl.content_id = c.id AND cl.locale = 'ko'
WHERE cl.title ILIKE '%{작품명}%'
LIMIT 5;
```

- 매칭되면 `content_id`에 해당 UUID 사용
- 매칭 안 되면 기존 콘텐츠 수집과 동일하게 contents + content_locales INSERT 후 연결
- ART 타입은 contents에 등록하지 않는다 (content_id = NULL)

---

## 콘텐츠 검색 API

기존 콘텐츠 수집 룰북(`celeb-2-content-collector.md`)의 API 호출 방법을 그대로 따른다.

- BOOK: 네이버 도서 API
- VIDEO: TMDB API
- GAME: IGDB API
- MUSIC: Spotify API

---

## 배치 DB 등록

**반드시 배치로 한 번에 등록한다.**

### 1) 새 콘텐츠가 필요한 경우 (contents + content_locales INSERT)

기존 룰북 `celeb-2-content-collector.md`의 배치 INSERT 패턴을 그대로 따른다.

### 2) celeb_works 배치 INSERT

```sql
INSERT INTO celeb_works (celeb_id, content_id, title, title_en, role, description, description_en, work_type, release_year, search_keyword)
VALUES
  ('{셀럽UUID}', '{content_id 또는 NULL}', '{제목}', '{영문제목}', '{role}', '{창작배경}', '{영문배경}', '{타입}', {연도}, '{검색키워드 또는 NULL}'),
  ...
ON CONFLICT DO NOTHING;
```

**필드 설명:**
- `content_id`: DB에 해당 콘텐츠가 있으면 UUID, 없으면(ART 등) NULL
- `title`: 한국어 제목 (content_id가 있어도 필수 — 독립적 표시용)
- `title_en`: 영문 제목
- `role`: 역할 (위 표 참조)
- `description`: 창작 배경 한국어 (필수)
- `description_en`: 창작 배경 영문
- `work_type`: BOOK, VIDEO, MUSIC, GAME, ART
- `release_year`: 발표 연도 (정수, BC는 음수. 예: BC 380 → -380)
- `search_keyword`: 네이버 검색 연동 키워드 (NULL이면 title 사용)

---

## description 작성 가이드라인

### 필수 규칙

1. **창작 배경/동기 중심**: "이런 책이다"가 아니라 "왜/어떻게 만들었는가"
2. **간결 서술체**: 존댓말 금지, 2~4문장
3. **번역투 금지**: 피동형/이중피동 금지
4. **시대적 맥락**: 해당 시대의 사건/환경과 연결

### 좋은 예시

```
아테네 민주정의 타락을 목도한 뒤 이상 국가의 청사진을 철학적 대화 형식으로 풀어냈다. 스승 소크라테스의 사형이 직접적 계기였다.
```

### 나쁜 예시

```
국가는 플라톤이 쓴 정치철학 대화편이다. 정의, 이상 국가, 철인왕 등의 주제를 다루고 있다.
```
→ 작품 설명이지 창작 배경이 아니다.

---

## ART 타입 특수 처리

미술 작품은 contents 테이블에 등록하지 않는다.

- `content_id` = NULL
- `work_type` = 'ART'
- `search_keyword`에 네이버 검색용 키워드 지정 (예: "모나리자 레오나르도 다빈치")
- 카드 클릭 시 네이버 검색 결과 페이지로 이동

---

## 환경 변수

기존 콘텐츠 수집과 동일. `sw/web/.env`, `sw/web-bo/.env` 참조.

---

## 기술 요구사항

- **Supabase 프로젝트 ID**: `wouqtpvfctednlffross`
- **파일 경로**: 상대 경로만 사용
- 작업 전 반드시 `profiles` 테이블에서 셀럽 ID 조회
