# 사용자 웹 남은 작업

구획별 렌더 규칙은 `docs/project/platform/code-rules.md`, 운영·캐시는
`docs/project/platform/external-services.md`를 따른다.

## 구현


- 회원 기록 첫 화면은 현재 프로필만 서버에서 읽고 목록을 브라우저가 다시 조회한다.
  `sw/web/src/app/[locale]/(main)/[userId]/reading/page.tsx`에서 첫 페이지를 조회해
  `RecordsContent`와 `ContentLibrary`의 `initialContents`로 넘긴다. 본인·타인의 공개 범위와
  검색·정렬·쪽 이동은 그대로 유지한다.

- 인물 필터 줄과 결과 목록의 조회·대기·실패 상태를 분리한다. 검색어·정렬·쪽·필터 URL 동기화와
  모바일 필터 상태는 유지한다. 재개 경로는
  `sw/web/src/app/[locale]/(main)/explore/figures/sections.tsx`,
  `sw/web/src/components/features/home/CelebCarousel.tsx`,
  `sw/web/src/components/features/home/useCelebFilters.ts`다.

- **1,000행 상한 감사에서 남긴 조회(26.09.14).** 여러 행 조회를 `selectAllPages`로 나눠 받는 규칙은
  `docs/project/platform/code-rules.md` 「필수」가 쥔다. 지금 잘리던 곳(세력도감·크론·게임·피드·서재·표지·제휴·신화 원전·
  오늘의 인물 시드)은 고쳤고, 아래는 실측으로 아직 안전하거나 재 보지 못해 남겼다.
  - 검색어 부분일치 4곳 — `getCelebContentExpand`·`getUserContents`·`getMyContents`·`searchRecords`가 `content_locales`를
    `ilike` 무제한으로 읽어 `.in(content_id)`에 넣는다. 짧고 흔한 검색어면 1,000행에서 잘리고 주소 길이로도 실패한다.
  - 영향력 대전 카드 풀 `getCelebCards` — 647명으로 아직 안전하지만, 그 id를 한 번에 `.in()`에 넣어 수백 명이면 주소 길이로 실패한다.
  - 제휴 직군 동료 `getAffiliateBooks` profession-read — `.limit(1000)`에 719행으로 턱밑이다.
  - 미궁 게임 `getTrackerRound` — 후보 함수 `get_tracker_candidates`에 LIMIT가 없고(모수 미측정), 함수 실패 때 도는
    폴백은 200명 묶음마다 1,000행에서 잘린다.

## 서비스 탐색에서 확인한 개선점

2026-09-05 운영 사이트의 데스크톱·비로그인 탐색에서 확인했다. 아래 개선 방향은 비평에서 나온 제안이다.

- [ ] 빌 게이츠의 《21세기 자본》 감상에 “그렇게 해서 기쁘다”, “높은 괴짜 지수” 같은 직역 표현이 남아 있다.
  대표 감상 원고부터 자연스러운 한국어로 검수하고, 요약과 1인칭 번역문을 독자가 구별할 수 있게 한다.
  몇 문장 교정은 작지만, 원문 의미·화자·인용을 지키며 긴 감상과 표시 방식을 정리하는 데 검수가 필요하다.
- [ ] 《21세기 자본》의 여러 인물 감상이 작품 상세의 ‘다른 리뷰’에 모여 있지만,
  인물마다 무엇에 동의하고 반대하는지 비교하는 재미가 잘 드러나지 않는다.
  홈의 기록량 순위·작품 허브의 일반 베스트셀러와 함께, 구체적인 감상 차이를 읽을거리로 소개하는 방식을 검토한다.
  제목 변경만으로 해결되지 않는다. 비교할 감상을 선정하고 실제 논점 차이를 확인해 소개해야 한다.
- [ ] 세력도감은 ‘누가 누구와 함께했는가’를 내세우지만, 확인한 OpenAI 테마는 화보·명단·직함·개인 소개가 중심이다.
  인물들이 함께 한 일과 역할 차이를 설명해 관계를 이해할 수 있게 한다.
  문장을 넣는 작업은 작지만, 협업·역할의 근거를 조사하고 테마 안에서 설명할 자리를 정해야 한다.

## 외부 채널에 서비스 소개

네이버 블로그(책)와 티스토리(영화)는 연결·예약을 마쳤다. 다음 추가 채널은 긱뉴스의 Show GN과
디스콰이엇이며, 둘 다 한국어로 소개한다. 두 초안은 D드라이브에 준비되어 있고 아직 게시하지 않았다.

- [ ] 긱뉴스 Show GN: [한국어 소개 초안](D:/docs/feelandnote/community-intro/show-gn.ko.md)을
  사용자와 최종 검토한 뒤 서비스 소개 글을 게시한다.
- [ ] 디스콰이엇: [제품 소개 초안](D:/docs/feelandnote/community-intro/disquiet.ko.md)을
  사용자와 최종 검토한 뒤 제품을 등록하고, 해당 제품에 연결한 소개 글을 게시한다.

초안을 검토할 때 운영자 자기소개에 [공개 활동명 규칙](../../AGENTS.md#프로젝트-개요)을 반영한다.
[아이콘·화면 캡처](D:/docs/feelandnote/community-intro/assets/)도 준비되어 있으며 캡처 첨부는 선택이다.
음악·플레이리스트 신규 채널은 제외한다. 출판사·서점 접촉은 후순위이며, 브런치는 네이버 블로그와
유사해 이번 추가 대상에서 제외한다.

## 실화면·운영

- 데스크톱 인물 상세 펼쳐보기의 매체 아이콘·순위 배지 위치와 링크를 누른 직후의 대기 표식을 확인한다.

- 스펙트럼 | 영향력 화면을 작은 너비에서 확인하고 넘침·잘림이 있으면 보정한다.

- 공개 GitHub 저장소의 홈페이지 값을 `https://feelandnote.com`으로 바꾼다.

- Oracle public vantage point에서 홈 REST를 10분마다 확인하고
  `MemoryUtilization[5m].mean() > 90` 알람을 기존 이메일 topic에 연결한다.

- 느린 RPC 재작성: `get_celebs_sorted`·`get_persona_extremes`·`get_content_celeb_user_counts`(평균 1.4~3초, 최대 14초).
  「공개 조회 문장 제한·인덱스」의 기존 목록(`get_chosen_scriptures`·`get_celeb_feed_type_counts`)과 함께 처리한다.

- 배치 스크립트의 SSH 세션 재사용: `sw/web-bo/scripts/contents/book-description-sources.ts`(책마다 `spawnSync ssh`),
  `sw/web-bo/scripts/celeb/headline-rewrite/apply.ts`(쿼리마다 ssh), `sw/web-bo/scripts/figure-books/source-book-batch.ts`.
  전량 처리 때 SQL을 묶어 한 세션으로 보내는 공용 실행기를 두고 세 스크립트가 쓰게 한다.

- 작품소개 모달·인물 감상 화면의 클라이언트 요청에 시간 제한과 재시도·소개 없음 상태를 둔다. 서버 쪽 30초 상한은
  `lib/db/restFetch.ts`가 맡으므로 브라우저 쪽 스켈레톤 종료 처리만 남았다.

- Cloudflare API 토큰에 존 Analytics 읽기 권한을 추가한다. 26.09.10 장애의 트래픽 출처(봇·사람)를 확인하려 했으나
  현재 토큰(캐시 퍼지 전용)으로는 `httpRequests1mGroups` 조회가 거부됐다.

- (우선순위 낮음) 인물 상세(`/celeb/[slug]`) 크롬 반응형 모드에서 상단 구획 제목줄(`CelebSectionHeading`,
  `position: sticky` + 근처 `backdrop-blur`)이 간헐적으로 이전 폭 그대로 잘려 보이고 새로고침으로도
  안 풀릴 때가 있다. 실제 창 크기 변경으로는 재현 안 되고 스스로 복구됨 — 서비스 워커·CSS 그리드
  구조 자체는 정상 확인됨. 크롬 DevTools 반응형(에뮬레이션) 렌더링 경로 쪽 버그로 추정, 실사용자
  화면에선 이 경로를 안 타 실서비스 영향 낮음. 재현 시 콘솔 에러와 함께 다시 본다.
