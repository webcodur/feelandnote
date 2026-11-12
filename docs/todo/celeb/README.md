# 인물 남은 작업

현재 규격은 [`docs/project/celeb/`](../../project/celeb/README.md), 전체 남은 작업은
[`docs/todo/README.md`](../README.md)를 본다.

| 문서 | 다음 작업 |
|---|---|
| [`db-blog-review-handoff.md`](db-blog-review-handoff.md) | 블로그 모든 글·항목과 연결된 DB 감상 재편 — 판정 기준·진행 상태·남은 일 |
| [`viewing-review-verbatim.md`](viewing-review-verbatim.md) | 감상배경 소스 원문 재구축 소급 — 오프라·빌 게이츠·머스크 등 발췌형 기록에 쿠셔닝+구분선 구조 적용 |
| [`influence-spectrum.md`](influence-spectrum.md) | 영향력·스펙트럼 잔여 검토 — 다른 15축 근거 적정성, 영향력 검사기, 사실성, 검사기 구멍. |
| [`youtube-creator-candidates.md`](youtube-creator-candidates.md) | 신규 유튜브 크리에이터 등록 후보군 — 50만+ 개인, 독서 감상경위 특화 16인 + 확장 22인 |

미등록 후보의 조사 자료를 별도로 보관하지 않는다. [데이터 원칙](../../project/data/README.md)을 따르며, 인물 1명 등록 절차는 [`celeb-00-04-new-figure-checklist.md`](../../project/celeb/celeb-00-04-new-figure-checklist.md)가 쥔다. 등록용 원고는 반영·재조회 검증 뒤 폐기한다.

## 문서 없이 남은 판단

- **오브리 플라자의 가스 브룩스 감상곡** — `contents` `b8555e2b-8f42-45c5-b0c1-b0eb7673af63`, 《Ain't Going Down ('Til the Sun Comes Up)》. [당사자 감상 근거](https://www.nme.com/features/tv-interviews/soundtrack-of-my-life-aubrey-plaza-4642)는 확인했고, 다른 가수 Jim Finnegan의 iTunes ID와 표지는 제거했다. 감상 기록은 보존했으며, 가스 브룩스 원곡의 iTunes 메타·미리듣기 확인이 남았다.

- **각성모드 사용자 웹 도입** — 각성 이미지(저장 규격은 [`celeb-08-00-image-map.md`](../../project/celeb/celeb-08-00-image-map.md))를 사용자 웹에서 호버·탭·스크롤 중 무엇으로 바꿔 보일지(모바일 포함), 이집트 21인만인지 `celeb_reality=FICTION` 전체인지 사용자가 정한다. 비교 화면은 대표 사진과 각성 이미지를 인물 단위로 붙여 보인다.
- **서점 추천사 감상배경 재작성(26.11.11 착수)** — 알라딘 추천사를 출처로 둔 감상 6,404행 중 1,720행을 [감상 검수](../../project/celeb/celeb-02-03-content-review.md) 2.5절 규칙으로 다시 써 반영했다. 수집·생성·검수 상태는 착수한 컴퓨터의 임시 폴더에만 있어 다른 컴퓨터에서는 쓰지 않는다. 다른 컴퓨터는 DB에서 출처가 알라딘이고 감상배경이 2.5절 형식이 아닌 행을 다시 골라 시작한다. 알라딘은 요청 제한이 걸리므로 수집 간격을 10초 이상 둔다. 같은 판본 제목의 판본 불일치 455건은 그대로 둔다. 26.11.12 같은 판본의 ISBN-10·ISBN-13이 별도 작품으로 갈라진 353쌍 중 339쌍을 `merge-works.mjs`로 합쳤다(병합 SQL이 ISBN-10과 13을 같은 판본으로 보도록 고침). 남은 14쌍은 같은 셀럽의 서로 다른 감상 충돌 4쌍(당신이 남긴 증오, 설득의 심리학 1 20주년판, 플랫랜드, 베르가모의 페스트 외), 영어 판본 가드 9쌍, 집계 불일치 1쌍이다. 「인생은 왜 50부터 반등하는가」로 잘못 붙은 아서 C. 브룩스 행은 한국어판 『인생의 오후를 즐기는 최소한의 지혜』 작품에 합쳤다. 최적의 건강을 위한 8주 두 행은 케빈 로즈가 출처가 다른 감상을 양쪽에 달아 병합 도구가 거부하므로 감상을 하나로 합칠지부터 정한다. 제르미날 1의 여러 행은 번역이 다른 판본이라 번역자 근거를 확인한 뒤 판본으로 묶는다.
- **감상 도서 절판 잔여 170건** — 같은 작품의 판매 판본이 없음을 확인한 상태다. 신판이 나오면 다시 잡는다. 처리 규칙은 [콘텐츠 등록](../../project/celeb/celeb-02-02-content-registration.md) 「절판」 절이 쥔다.
