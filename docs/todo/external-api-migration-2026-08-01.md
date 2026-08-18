# 레거시 도서 EN locale 보완

인물과 연결된 레거시 BOOK 가운데 EN `content_locales`가 없는 137개를 조사한다.
현재 콘텐츠 수집 규칙은 `docs/project/celeb/celeb-2-content-collector.md`, 외부 도서 검색 계약은
`docs/project/platform/external-services.md`를 따른다.

## 작업

1. 인물과 연결된 BOOK 중 EN locale 결손 대상을 live DB에서 다시 산출한다.
2. 독립 대상 반복 조사는 `RESEARCH_RELAY_ALGORITHM.md`를 따라 중복 작업을 막는다.
3. OpenLibrary에서 같은 작품의 실제 영문판이 확인된 경우만 EN locale을 등록한다.
4. 인물-작품 연결, 언어, 판본, 제목·표지 정합성을 재조회한다.

## 금지

- 영문판이 확인되지 않은 작품의 제목을 임의로 번역하거나 음차하지 않는다.
- 카카오는 한국어판, OpenLibrary는 영문 원서 외의 용도로 쓰지 않는다.
- 진행률·후보·확정 대기를 위한 새 DB 테이블이나 컬럼을 만들지 않는다.

## 종료 조건

- 현재 결손 대상을 전수 조사했다.
- 실제 영문판이 확인된 작품은 EN locale이 등록되었다.
- 영문판이 확인되지 않은 작품에는 임의 locale이 추가되지 않았다.
- live DB 재조회와 locale 정합성 검사가 통과했다.
