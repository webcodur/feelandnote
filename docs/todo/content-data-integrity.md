# 작품·판본 정합성 — 남은 작업

마지막 대조(2026-10-12 09:26 KST)의 서비스 BOOK은 35,204작품이며, 검수 색인에 포함된 작품은 33,876개, 미검수는 1,328개다. 추가 수리가 남은 정확한 색인은 15,728개다. 첫 대조 수는 개선 완료 수가 아니다.

미처리 ID와 사유는 이번 대화 세션에 남아 있다. 15,455개는 개별 사유가 있고, 273개는 기존 배치 설명에 연결돼 있어 개별 사유를 구체화해야 한다. 미검수 1,328개는 기존 고정 대상 1,004개와 고정 대상 밖의 현재 등록분 324개로 구분돼 있다.

2026-10-12 11:58 KST에 재개했다. 남은 수리와 미검수의 합집합 17,055개를 10개 레인으로 배분했으나, 약속한 17:58까지 완료하지 못했다. 21:44의 종료 보고를 작품 ID로 중복 제거한 집계는 실제 검수 2,484개·원래 문제 해결 1,855개·검수 후 잔여 629개다. 진행 중 레인의 아직 끝나지 않은 결과는 이 수에 더하지 않았으며, 소개 질문을 해결한 사실을 전체 선정 승인으로 계산하지 않는다. 공개 책장 연결이 많은 묶음부터 처리한다. 서지는 연구용 API로 대조하고, YES24는 연구 키로 정확한 ISBN의 상품을 찾은 뒤 공개 상세·리뷰 모듈에서 지표와 독자 글을 읽는다. 출처 검색은 웹 검색, 원문 열람은 insane-search로 수집하고 브라우저는 직접 읽히지 않는 공개 미리보기 등에만 사용한다. ISBN·제목 검색·출처는 RAM에서 공유하며 LLM이 출처를 읽고 판단한 변경만 반영한 뒤 보호 데이터와 현재값을 재조회한다.

작품 정체성과 책장 선정을 먼저 판단하고, 남길 원문·번역과 대표 상품을 확정한 뒤 소개·표지를 교정한다. 기계는 수집·대조를 맡고 LLM이 실제 출처를 읽어 판단한다.

| 개념과 남은 작업 | 담당 규칙·파일 |
|---|---|
| 작품 — 같은 저작의 중복과 다른 저작의 오귀속 구별 | [작품 정체성](../project/celeb/celeb-02-05-figure-books.md#작품-정체성), [작품 통합](../../sw/web-bo/scripts/figure-books/lib/reviewed-merge-batch.mjs) |
| 판본 — 같은 원문·번역의 개정·장정·분권 상품 정리 | [작품·판본·상품](../project/celeb/celeb-02-05-figure-books.md#작품판본상품), [동일본문 판본 통합](../../sw/web-bo/scripts/figure-books/lib/reviewed-edition-consolidation.mjs) |
| 대표 상품과 메타 — ISBN·제목·저자·출판사·표지의 실물 일치, 누락 카드·판본 등록 | [책 정보 등록](../project/celeb/celeb-02-02-content-registration.md), [누락 언어 카드](../../sw/web-bo/scripts/figure-books/lib/guarded-locale-inserts.mjs), [검수한 카탈로그·판본 등록](../../sw/web-bo/scripts/figure-books/lib/reviewed-catalog-insert.mjs) |
| 책장 선정 — 본문·독자군과 YES24 평점·리뷰 수·판매지수·독자 반응을 함께 판단 | [인물 도서 선정 규칙](../project/celeb/celeb-02-05-figure-books.md), [공유 판본 정책](../../packages/content-search/src/book-edition-policy.ts) |
| 소개 — 실제 작품 내용·언어·수록 범위에 맞는 본문 보완 | [소개 출처](../project/celeb/celeb-02-06-content-introduction-sources.md), [조사 소개 계약](../../sw/web-bo/scripts/contents/book-research-introduction-contract.ts) |
| 인물 연결 — 실제 집필자·등장 대상·동명이인 구별 | [관계 유형](../project/celeb/celeb-02-05-figure-books.md#관계-유형), 공용 교정 가드의 검수한 인물 관계 교정 |

서지·소개·표지·선정 제외·기존 인물 관계의 반영은 [guarded-catalog-repairs.mjs](../../sw/web-bo/scripts/figure-books/lib/guarded-catalog-repairs.mjs)가 맡는다. 작품 통합·판본 통합·등록 적용기도 18표 현재값 대조와 재조회를 수행한다. 감상경위·가시성·회원 리뷰는 이 작업에 포함하지 않는다.

작업 배분은 [catalog-review-session.mjs](../../sw/web-bo/scripts/figure-books/catalog-review-session.mjs), 소개 원자료 공유는 [catalog-introduction-session.mjs](../../sw/web-bo/scripts/figure-books/catalog-introduction-session.mjs)가 맡는다. 둘은 RAM 작업 도구이며 최종 판단·반영을 대신하지 않는다. 이전 작품 기준 경로의 신규 실행 금지는 [현행 룰북](../project/celeb/celeb-02-05-figure-books.md#작품-기준-폐기260907)을 따른다.

외부 조회와 키 용도는 [외부 서비스](../project/platform/platform-05-external-services.md)·[환경변수](../project/platform/platform-04-env-vars.md)가 쥔다. 정상 데이터는 DB·R2에 두고 원문·캐시·작업용 원장은 폐기한다.

- 조이 도이치 `3630a65e-c8ff-49e1-a19b-3a4ad1a8ba5e`의 멀리사 힐 《Something from Tiffany's》: [직접 독서 근거](https://observer.com/2022/12/zoey-deutch-went-from-making-a-rom-com-to-being-a-full-time-wedding-consultant/)는 확인했지만, OpenLibrary 작품 `OL16565784W`의 중복 저자와 판본 저자 연결이 일치하지 않아 등록하지 않았다. 영문 판본의 작품·저자 연결을 확인한 뒤 감상 기록을 반영한다.
