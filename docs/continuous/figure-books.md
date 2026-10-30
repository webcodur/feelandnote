# 인물 도서 정리

전체 책의 잘못된 인물 연결과 판본을 바로잡는 작업이다. 다음 작업자는 이 문서의 남은 오류를 실제로 수정한다. 책소개는 [작품 소개 보완](content-introductions.md)의 기존 도구로 이어간다. 2026-10-30 재검수에서 출력되는 소개 없음은 한국어 0건·영어 104건이며, 영어 104건은 모두 판본 없이 영어 카드로 대체 노출되는 작품이다.

## 마무리 작업지시

아래 『시편』·『돈 후안』·『세계 추리소설 필독서 50』의 오귀속과 후속권 판정을 먼저 마무리하고, 영어 소개 104건을 보완한다. 수정 뒤 운영 DB와 공용 책장의 실제 선택 결과·운영 상세 페이지를 대조한다. 재검수 명령은 `sw/web-bo`에서 `series-split-audit.mjs --all`·`edition-catalog-audit.mjs`·`edition-work-dedup.mjs`(`scripts/figure-books/`), 소개는 `pnpm contents:book-introductions`다. 같은 원전 키의 중복 후보와 구조 검사 오류는 이번 재검수에서 각각 0건이었다. 이미 판정한 쌍(같은 총서의 별개 작품, 원문과 주석서, 작품별 해설서, 같은 이름의 다른 선집·악보집, 한 선집 ISBN을 함께 쓰는 별개 원전)은 새 근거 없이 다시 조사하거나 합치지 않는다.

`series-split-audit.mjs`의 판본 귀속 위험(`editionAttributionRisks`)은 2026-10-30 재검수에서도 5건이다. 『안자춘추』 `333abef8-c040-5773-bdb9-f21914e4d420`는 한국어 카드의 저자 안영과 판본 저자 임동석이 다르다. 아래 『소설 공자. 2』·『Monster Vol. 12』·『만화 토지 제3부 13』과 『Eleanor Roosevelt: Volume 2』 `8d5fb581-1879-4311-8148-0d37b2c59e0d`(9780140178944)는 번호가 있는 판본이 `full`·`complete`로 남아 있다. 역자·편자 표기인지, 독립 저작인지, 작품의 분권인지 본문·서지로 구별한 뒤 귀속과 범위를 고친다. 정상 판본은 그 판정을 ISBN에 맞는 근거로 남긴다. 탐지 계약은 [`series-audit.mjs`](../../sw/web-bo/scripts/figure-books/lib/series-audit.mjs)가 쥔다.

`edition-work-dedup.mjs`는 원작 키까지 같은 쌍만 잡는다. 같은 책이 장정·재쇄·번역마다 따로 등록된 중복은 언어 카드의 정규화한 제목·첫 저자가 같은 작품 묶음을 DB에서 뽑아, ISBN별 Google Books 서지(출판사·연도·쪽수·역자)를 대조해 판정한다.

후속권만 판본으로 가진 작품은 같은 간행본 1권을 대표로 세운다. 후속권 판본과 카드에 `edition_kind: 'volume'`·`text_scope: 'volume/N'`을 적은 비노출 판정을 남기고, 1권 ISBN의 `independent_work_review` 근거를 카드에 둔 뒤 `source-edition-batch.ts`로 `volume/1` 판본을 넣고 `reviewedRepresentativeReplacement`로 카드를 바꾼다. 1권 작품이 따로 있으면 후속권 작품을 그 작품에 합친다. 제목 글자만 같은 다른 인물에 붙은 등장 관계(예: 『전지적 관중 시점』과 춘추시대 관중)는 `reviewedFigureRelation`의 `remove_wrong_subject`로 지운다.

남은 판정은 아래와 같다.

- 1권을 공식 메타로 넣지 못한 3건: 『소설 공자. 2』 `14f4824e-5564-5fb6-b850-9043169e94cf`(카카오 1권 응답에 저자 없음), 『Naoki Urasawa's Monster Vol. 12』 `d8438c84-d001-5e36-aae9-dc7ca4fc253a`(OpenLibrary 1권의 원전 제목이 작품 기록과 달라 등록 도구가 거절), 『만화 토지 제3부 13』 `453ef728-46c7-5005-b807-d142478ea142`(같은 특별보급판 1권의 카카오 저자 없음). 실제 원작·간행본을 확인해 정식 대표를 세운다. 등록 검사를 통과시키려고 다른 작품의 제목·저자에 맞추지 않는다. 예전 보류 목록의 『샤킬 오닐. 2』 `ff4dd068-3040-5ddf-9196-e0d2a70acd96`는 현재 ISBN별 선정 제외 상태이므로 1권 복원 대상으로 다시 세지 않는다.
- 『시편』 `55631be8-6683-4ef7-8277-e94660dcd93e`: 한국어 대표는 대한성서공회 『시편(새번역)』으로 바로잡았다. 영어 카드는 본회퍼 『Psalms: The Prayer Book of the Bible』(9780806614397)이고, ISBN 없는 Isaac Watts 판본에는 이광호 해설서 목차가 소개로 붙어 있다. 영어 시편 본문 판본을 OpenLibrary 원전 제목이 맞는 ISBN으로 찾아 세워야 한다. 다른 시편 작품 `4f2c9266-69e5-4cac-a987-7c9859953ddc`의 한국어 카드는 필사 다이어리북이다.
- `d1055b92-19c7-41aa-8975-d2ca145f1570`(티르소 『돈 후안』): 비스마르크(바이런 『Don Juan』)·모차르트(몰리에르 『Dom Juan』) 감상 2건이 남아 있다. 두 원작 BOOK을 등록해야 옮길 수 있다.
- 『세계 추리소설 필독서 50』 `4bf5d7f5-9fd2-508c-a42f-632c4baab268`에는 히가시노 게이고 `7a0f028e-361b-4649-8df2-e33c8fe6b9d7`의 `authored` 관계가 실제 DB에도 남아 있다. 등록된 저자는 무경·박상민·박소해·이지유·조동신이다. 목차·본문에서 히가시노를 실제로 다루는지 확인해 `appearance`로 바꾸거나 이 관계를 지운다.
- OpenLibrary 판본 응답에 언어가 아예 비어 있는 영어 종이책은 출판사·도서관 서지로 영어판임을 확인한 뒤 `packages/content-search/src/openlibrary.ts`의 `REVIEWED_ENGLISH_EDITIONS`에 ISBN·OpenLibrary 판본 ID를 출처와 함께 적는다. 다른 언어가 적힌 응답은 이 목록으로도 통과하지 않는다.
- OpenLibrary 원전 저자 목록에 낭독자·서문 필자·같은 사람의 중복 항목이 섞여 인쇄판 등록이 막히면, 출판사 서지로 실저자를 확인한 뒤 `packages/content-search/src/book-original-authors.ts`의 `REVIEWED_EXTRA_WORK_AUTHORS`에 원전 키·실저자 키·제외할 키를 출처와 함께 적는다. 판본 저자가 실저자 전원(또는 그 중복 항목)이고 원전에 다른 추가 저자가 없을 때만 통과한다.
- 인물 카탈로그가 없는 읽기 목록 작품의 영어 대표를 바꾸는 순서: 작품 메타에 OpenLibrary 원전 앵커(`figureBook.workTitle`·`workCreator`·`workIdentity`)를 적고, 판본 제목이 원전 제목과 다르면 카드에 새 ISBN의 `independent_work_review`를 둔다. 오디오·비도서 상품 행에는 선정 제외 근거를 먼저 붙인다. 그다음 `figure_book_contents` 부모 행을 넣는다(시드 트리거는 제외되지 않은 카드만 판본으로 복사한다). `source-edition-batch.ts`로 인쇄판을 넣고 `reviewedRepresentativeReplacement`로 카드를 바꾼다. 같은 언어의 제외 판본 행이 남아 있으면 등록 스크립트가 추가 번역으로 보고 막으므로, 상품 이력이 없을 때 `reviewedSelectionExclusion`으로 그 행을 지운다. 정규판이 이미 다른 작품으로 있으면 `merge-works.mjs`로 합친다. 카드의 검수 소개는 판형 문장만 바꿔 새 판본에 `reviewedIntroductionCorrection`으로 옮긴 뒤 대표를 바꾼다.

본문 근거를 찾지 못해 그대로 둔 작품은 다음과 같다. 새 근거 없이 다시 조사하지 않는다.

- 『아시모프 로봇』 4권 `9b13ff8b-9c25-5eda-9c00-a67a241b42fd`은 『The Robots of Dawn』에 연결돼 있으나 수록 장편을 밝힌 목차·서지가 없다. 1권은 YES24 소개가 『강철도시』 한 편임을 밝혀 독립 장편으로 기록했다.
- 『The Complete Works of Swami Vivekananda, Volume 1』 `84a7355c-d9d2-5858-9279-53a32aadba99`와 전집 `1f78da4c-26e6-543c-8c3d-794f77bfb487`: 1권 단독 재간본의 수록 범위 근거가 없다.
- 『Francis of Assisi, Early Documents: Vol. 4, Index』 `1ef4ea86-d744-5103-abe7-3dd09d3c5fe2`: 색인 권을 시작 판본 `bfc3e804-62a6-5a5f-ade4-9374d755fa1f`에 묶을 판본 근거가 없다.

`merge-works.mjs`로 합칠 때 판본 대응 근거 URL은 OpenLibrary가 아닌 독립 HTTPS 출처(Google Books 상세, 출판사, 도서관)여야 한다. 기록이 없는 중복 작품은 합치는 대신 `guardedCatalogExclusions`로 작품 전체를 제외한다.

다른 보류 사항은 [인물 남은 작업](../todo/celeb/README.md#문서-없이-남은-판단)을 본다. 등장 도서가 없는 인물들은 이미 조사한 보류분이므로 새로운 조사 수단 없이 전체를 다시 조사하지 않는다.

판정·등록은 [인물 도서 룰북](../project/celeb/celeb-02-05-figure-books.md), 작품 조사·재선정은 [figure-book-curation](../../.agents/skills/figure-book-curation/SKILL.md)을 따른다. 가격·구매 연결은 [제휴 판매 운영](../project/operations/ops-03-affiliate-commerce.md)을 따른다.
