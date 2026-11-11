# 인물 도서 정리

전체 책의 잘못된 인물 연결과 판본을 바로잡는 작업이다. 다음 작업자는 이 문서의 남은 오류를 실제로 수정한다. 책소개는 [작품 소개 보완](content-introductions.md)의 기존 도구로 이어간다.

## 현재 상태와 남은 일

현재 구조 검사에서 표시용 제목 행에 남은 ISBN, 확정 중복 쌍, 미검수 판본 귀속 후보는 각각 0건이다. 표지·출판사가 남은 표시용 행은 53건으로, 실물 서지와 표시용 표식 중 무엇이 잘못됐는지 추가 확인이 필요하다. ISBN 없는 실제 구판과 비영어 원서, 선집·개별 수록작, 시리즈·낱권이 섞여 있으므로 표지를 일괄 삭제하거나 ISBN을 추정해 채우지 않는다.

언어 카드를 복원해도 기존 카탈로그에 해당 언어 판본이 없으면 화면에 나오지 않을 수 있다. 소개와 누락 판본을 함께 반영하는 `catalogReview` 경로는 [작품 소개 보완](content-introductions.md#반복-실행-순서)을 따른다.

`sw/web-bo`에서 `node --env-file=.env --import tsx scripts/figure-books/series-split-audit.mjs --all`을 실행하면 현재 대상이 `displayPublicationRisk`로 출력된다. 후보 수는 확정 오류 수가 아니다. 소개는 `pnpm contents:book-introductions`로 점검한다. 탐지 계약은 [`series-audit.mjs`](../../sw/web-bo/scripts/figure-books/lib/series-audit.mjs)가 쥔다. 이미 판정한 쌍(같은 총서의 별개 작품, 원문과 주석서, 작품별 해설서, 같은 이름의 다른 선집·악보집, 한 선집 ISBN을 함께 쓰는 별개 원전)은 새 근거 없이 다시 조사하거나 합치지 않는다.

감상 문장은 출처가 말하는 주체·범위를 넘지 않는다. 출처가 작가 전반의 독서만 밝히면 작품별 감상으로 나누지 않고 전집 작품 하나에 둔다(비스마르크의 셰익스피어 감상). 다른 사람의 행위(예: 대본가가 원작을 참고했다)는 인물 본인의 감상 근거가 아니므로 지운다(모차르트의 몰리에르 감상). 감상을 옮기려고 새로 만든 작품이 연결을 잃으면 `guardedCatalogExclusions`로 함께 지운다.

`edition-work-dedup.mjs`는 원작 키까지 같은 쌍만 잡는다. 같은 책이 장정·재쇄·번역마다 따로 등록된 중복은 언어 카드의 정규화한 제목·첫 저자가 같은 작품 묶음을 DB에서 뽑아, ISBN별 Google Books 서지(출판사·연도·쪽수·역자)를 대조해 판정한다.

후속권만 판본으로 가진 작품은 같은 간행본 1권을 대표로 세운다. 후속권 판본과 카드에 `edition_kind: 'volume'`·`text_scope: 'volume/N'`을 적은 비노출 판정을 남기고, 1권 ISBN의 `independent_work_review` 근거를 카드에 둔 뒤 `source-edition-batch.ts`로 `volume/1` 판본을 넣고 `reviewedRepresentativeReplacement`로 카드를 바꾼다. 1권 작품이 따로 있으면 후속권 작품을 그 작품에 합친다. 제목 글자만 같은 다른 인물에 붙은 등장 관계(예: 『전지적 관중 시점』과 춘추시대 관중)는 `reviewedFigureRelation`의 `remove_wrong_subject`로 지운다.

같은 간행본 1권의 카카오 응답에 저자가 비어 있으면, 서점 서지와 같은 간행본 다른 권의 카카오 응답으로 저자를 확인한 뒤 `packages/content-search/src/kakao-books.ts`의 `REVIEWED_MISSING_AUTHORS`에 ISBN·다음 책 ID·저자를 출처와 함께 적는다. 저자가 적힌 응답은 이 목록으로 바꾸지 않는다. 등록 검사를 통과시키려고 다른 작품의 제목·저자에 맞추지 않는다. 『샤킬 오닐. 2』 `ff4dd068-3040-5ddf-9196-e0d2a70acd96`는 ISBN별 선정 제외 상태이므로 1권 복원 대상으로 다시 세지 않는다.

ISBN·판본 키 없이 표지·출판사만 남은 행이 다른 저작이라 같은 언어의 새 판본 등록을 막고, 기존 제거 가드(외국어 본문·출판사 없는 자리표시 행)에 맞지 않으면, 상품 이력이 없음을 확인한 뒤 행 전체를 대조하는 단일 트랜잭션으로 그 행만 지운다. 『시편』의 Isaac Watts 운율 의역 행이 이 경우였다.

판본 대응 규칙은 아래와 같다.

- OpenLibrary 판본 응답에 언어가 아예 비어 있는 영어 종이책은 출판사·도서관 서지로 영어판임을 확인한 뒤 `packages/content-search/src/openlibrary.ts`의 `REVIEWED_ENGLISH_EDITIONS`에 ISBN·OpenLibrary 판본 ID를 출처와 함께 적는다. 다른 언어가 적힌 응답은 이 목록으로도 통과하지 않는다.
- OpenLibrary 원전 저자 목록에 낭독자·서문 필자·같은 사람의 중복 항목이 섞여 인쇄판 등록이 막히면, 출판사 서지로 실저자를 확인한 뒤 `packages/content-search/src/book-original-authors.ts`의 `REVIEWED_EXTRA_WORK_AUTHORS`에 원전 키·실저자 키·제외할 키를 출처와 함께 적는다. 판본 저자가 실저자 전원(또는 그 중복 항목)이고 원전에 다른 추가 저자가 없을 때만 통과한다.
- 인물 카탈로그가 없는 읽기 목록 작품의 영어 대표를 바꾸는 순서: 작품 메타에 OpenLibrary 원전 앵커(`figureBook.workTitle`·`workCreator`·`workIdentity`)를 적고, 판본 제목이 원전 제목과 다르면 카드에 새 ISBN의 `independent_work_review`를 둔다. 오디오·비도서 상품 행에는 선정 제외 근거를 먼저 붙인다. 그다음 `figure_book_contents` 부모 행을 넣는다(시드 트리거는 제외되지 않은 카드만 판본으로 복사한다). `source-edition-batch.ts`로 인쇄판을 넣고 `reviewedRepresentativeReplacement`로 카드를 바꾼다. 같은 언어의 제외 판본 행이 남아 있으면 등록 스크립트가 추가 번역으로 보고 막으므로, 상품 이력이 없을 때 `reviewedSelectionExclusion`으로 그 행을 지운다. 정규판이 이미 다른 작품으로 있으면 `merge-works.mjs`로 합친다. 카드의 검수 소개는 판형 문장만 바꿔 새 판본에 `reviewedIntroductionCorrection`으로 옮긴 뒤 대표를 바꾼다.

본문 근거를 찾지 못해 그대로 둔 작품은 다음과 같다. 새 근거 없이 다시 조사하지 않는다.

- 『아시모프 로봇』 4권 `9b13ff8b-9c25-5eda-9c00-a67a241b42fd`은 『The Robots of Dawn』에 연결돼 있으나 수록 장편을 밝힌 목차·서지가 없다. 1권은 YES24 소개가 『강철도시』 한 편임을 밝혀 독립 장편으로 기록했다.
- 『The Complete Works of Swami Vivekananda, Volume 1』 `84a7355c-d9d2-5858-9279-53a32aadba99`와 전집 `1f78da4c-26e6-543c-8c3d-794f77bfb487`: 1권 단독 재간본의 수록 범위 근거가 없다.
- 『Francis of Assisi, Early Documents: Vol. 4, Index』 `1ef4ea86-d744-5103-abe7-3dd09d3c5fe2`: 색인 권을 시작 판본 `bfc3e804-62a6-5a5f-ade4-9374d755fa1f`에 묶을 판본 근거가 없다.

`merge-works.mjs`로 합칠 때 판본 대응 근거 URL은 OpenLibrary가 아닌 독립 HTTPS 출처(Google Books 상세, 출판사, 도서관)여야 한다. 인물 카탈로그가 없는 작품을 합치면 그 작품의 언어 카드가 남는 작품의 판본으로 복사되므로, 대표로 쓰지 않을 카드에는 먼저 ISBN별 선정 제외 근거를 붙인다. 기록이 없는 중복 작품은 합치는 대신 `guardedCatalogExclusions`로 작품 전체를 제외한다.

다른 보류 사항은 [인물 남은 작업](../todo/celeb/README.md#문서-없이-남은-판단)을 본다. 등장 도서가 없는 인물들은 이미 조사한 보류분이므로 새로운 조사 수단 없이 전체를 다시 조사하지 않는다.

판정·등록은 [인물 도서 룰북](../project/celeb/celeb-02-05-figure-books.md), 작품 조사·재선정은 [figure-book-curation](../../.agents/skills/figure-book-curation/SKILL.md)을 따른다. 가격·구매 연결은 [제휴 판매 운영](../project/operations/ops-03-affiliate-commerce.md)을 따른다.
