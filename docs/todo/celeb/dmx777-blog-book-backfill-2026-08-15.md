# dmx777 블로그 기반 인물·도서 백필

착수 2026-08-15. 유저 본인 블로그(`blog.naver.com/dmx777`, 「Book Booth」)를 순회해 인물별 추천 도서와 감상배경을 서비스에 채운다.

## 조회 수단

블로그·국내 매체는 `WebFetch`가 거부한다. `insane-search`로 바로 연다(`docs/project/agent-rules.md` 29번).

```bash
cd "C:/Users/webco/.claude/plugins/cache/gptaku-plugins/insane-search/0.9.1/skills/insane-search"
PYTHONIOENCODING=utf-8 python -m engine "<URL>" > out.txt
```

`python3`는 이 환경에서 동작하지 않는다. `python`을 쓰고 `PYTHONIOENCODING=utf-8`을 반드시 건다 — 없으면 cp949 인코딩 오류로 본문이 날아간다.

### 2026-08-15 읽기 전용 실측

- 네이버 모바일 글 목록은 화면 HTML이 비동기 빈 목록이라 `PostList.naver`만 파싱하면 0건으로 오인한다.
- 카테고리 목록: `https://m.blog.naver.com/api/blogs/dmx777/category-list`
- 카테고리별 글 목록: `https://m.blog.naver.com/api/blogs/dmx777/category/{categoryNo}/post?itemCount=100`
- 두 URL 모두 위 `insane-search` 엔진으로 바로 열리며 JSON을 반환한다. 별도 브라우저나 로그인은 필요 없다.
- 「거물의 책추천」 하위 9개 카테고리의 게시물 수는 API 결과와 화면 집계가 일치한다.

| categoryNo | 카테고리 | 글 수 |
|---:|---|---:|
| 57 | 기업가 | 47 |
| 69 | 투자자 | 6 |
| 48 | 정치인 | 20 |
| 58 | 학자 | 14 |
| 56 | 배우 | 34 |
| 55 | 작가 | 8 |
| 62 | 아티스트 | 11 |
| 63 | 스포츠인 | 6 |
| 72 | 인플루엔서 | 2 |
| **합계** |  | **148** |

---

## 1. 이재용 조사 결과 반영

출처 확보 완료. 재조사하지 말고 아래를 그대로 쓴다.

원본 글: <https://m.blog.naver.com/dmx777/222106773970> (2020-10-04, 링크 모음)

| 책 | 저자 | 근거 기사 |
|---|---|---|
| 스님은 사춘기 | 명진 스님 | 불교닷컴 2011-10-07 「이재용 사장, 잡스에 선물하고 싶었던 책은」 <https://www.bulkyo21.com/news/articleView.html?idxno=16298> |
| IBM, 창업자와 후계자 (*Father, Son & Co.*) | 토머스 왓슨 주니어 | 동아일보 2016-03-10 「이재용 부회장 'IBM 2세 경영' 열공」 (김지현 기자). [동아일보 원문](https://www.donga.com/news/Economy/article/all/20160310/76912379/1), [채널A 미러](https://ichannela.com/news/detail/76912379-3.do) |

확정된 근거 문장:

- IBM편 — "최근 이재용 삼성전자 부회장이 '요즘 읽고 있는 책'이라며 추천하는 책이 있다." 기사는 평소 삼성 수뇌부에 "IBM 같은 회사가 되자"고 강조해온 점, 아버지의 후광 속에 경영권을 물려받은 2세의 도전이라는 책의 축, 왓슨이 의전문화를 없앤 것과 이 부회장이 수행원 없이 이코노미석으로 출장 다니는 모습을 직접 대조한다.
- 스님은 사춘기편 — 불교닷컴 원문에서 인용문을 복원했다. 이재용은 "스님이 보내 준 책이어서 마지못해 제목만 보려고 했는데 내용이 재미있고 배울 점들이 많아 두 번이나 읽었다"고 말했다. 이어 선 수행을 하는 스티브 잡스에게 전해주면 좋아할 것이라며 명진 스님에게 영역을 권했다.

### DB·판본 실측 — 아직 미반영

- 이재용: `ba9eb339-0921-4760-a5d3-affb60ee0a0d`, `full` · `active`.
- 현행 `celeb_contents`는 《이재명 자서전》 1건뿐이다. 아래 두 ISBN과 제목은 `contents`·`content_locales`·이재용 연결 어디에도 없다.
- 이번 세션은 INSERT 직전에 중단했다. **DB 변경 0건**이며 다음 작업자는 아래 메타로 신규 등록하면 된다.

| 책 | 한국어판 카카오 메타 | 판본 실재 확인 | 영문판 |
|---|---|---|---|
| 스님은 사춘기 | ISBN `9788996135531`, 명진, 이솔, 2011-04-20, [카카오 표지](https://t1.daumcdn.net/lbook/image/1463484?timestamp=20220714035131) | [YES24](https://www.yes24.com/product/goods/5026053), [알라딘](https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=11456860). 카카오 `salesStatus`는 공백이지만 두 상품 페이지에서 같은 제목·저자·ISBN 확인 | 검증 가능한 영역본을 찾지 못했다. en `content_locales`는 만들지 않되 `review_en`은 작성한다 |
| IBM, 창업자와 후계자 | ISBN `9788932460000`, 을유문화사, [카카오 표지](https://t1.daumcdn.net/lbook/image/501066?timestamp=20220505203342) | [YES24](https://www.yes24.com/product/goods/116389), [알라딘](https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=179788). 카카오 `salesStatus`는 공백이지만 두 상품 페이지에서 같은 제목·ISBN 확인 | OpenLibrary ISBN `9780553380835`, *Father, Son & Co.: My Life at IBM and Beyond*, Thomas J. Watson Jr.·Peter Petre, Bantam, 2000, [OpenLibrary 표지](https://covers.openlibrary.org/b/id/369938-L.jpg) |

표지 URL은 2026-08-15에 직접 GET해 모두 `200 image/jpeg`로 확인했다. 크기는 순서대로 159,223바이트, 9,518바이트, 29,828바이트다.

작업 순서:

1. 이재용의 현행 `celeb_contents`를 열어 두 권의 존재 여부와 감상배경 공백을 확인한다
2. 없는 책은 등록한다. 한국어판 메타는 카카오만 쓴다(`AGENTS.md` 「데이터·외부 서비스」)
3. 감상배경은 `celeb-2-content-collector.md`를 따른다. 기존 텍스트를 고치지 말고 백지에서 새로 쓴다(파이프라인 「업데이트 가드」)
4. 블로그는 3자 큐레이션이라 그것만으로 반영하지 않는다. 근거 기사 원문으로 교차 확인한 뒤 넣는다

## 2. 블로그 순회 — 미등록 인물 등록

블로그를 순차로 돌며 다루는 인물을 추린다. 서비스에 없는 인물은 **이름과 소개만** 만들어 등록하고, 이어서 감상배경 작업을 한다.

- 등록 창구는 web-bo `/celebs/new`의 `createCeleb`뿐이다. SQL 직접 INSERT나 가짜 계정 생성 금지
- 신규는 항상 `light` · `inactive`로 들어간다. 아바타 없이는 공개로 바꿀 수 없다
- 신규 인물 채택은 「신규 실존 인물 선정 게이트」를 통과해야 한다. 독립 서술 근거가 빈약한 후보는 등록하지 않는다
- 인물당 처리 후 다음으로 넘어간다. 한 번에 몰아서 등록하지 않는다

블로그 글 목록을 먼저 뽑아 인물 명단을 만들고, 이미 서비스에 있는 인물과 대조해 신규분을 확정한 뒤 착수한다.

### 2026-08-15 명단 대조 결과

- 게시물 148건에서 중복 인물 2건(빌 게이츠 2편, 스티븐 핑커 2편)을 합치면 고유 인물은 **146명**이다.
- 라이브 `celebs` 2,968명을 `nickname`·`nickname_en` 정규화 값으로 대조한 결과 **146명 전원이 이미 등록돼 있다.** 신규 인물은 0명이며 `/celebs/new` 작업도 없다.
- 따라서 다음 착수점은 신규 프로필 생성이 아니라 **인물별 기존 `celeb_contents`와 블로그 도서 목록 대조 → 블로그 밖 원문 근거 교차 확인 → 빠진 도서·감상배경만 등록**이다.
- 블로그 글 자체와 `alux.com`, Radical Reads 같은 재큐레이션 링크는 후보 탐색용일 뿐 `source_url` 단독 근거로 쓰지 않는다. 인물의 인터뷰·기고·공식 목록 등 독립 근거를 책별로 확보하지 못하면 기각한다.

## 룰북

- 파이프라인 전체: `docs/project/celeb/celeb-pipeline.md`
- 콘텐츠 수집: `docs/project/celeb/celeb-2-content-collector.md`
- 기본 정보: `docs/project/celeb/celeb-1-basic-profile.md`
