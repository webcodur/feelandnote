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

## 실화면·운영

- Amazon.com Associates를 한국 거주자 명의로 신청한다. 신청 전에 지급 설정에서 한국 은행 계좌로
  현금 수령할 수 있는지 실측하고, 가입 후 180일 안에 본인 구매가 아닌 유효 구매 3건을 확보해
  심사를 통과한다. 승인된 제휴 링크는 실제 영문판이 확인된 `en` 판본에만 연결하며 세부 원칙은
  [`monetization.md`](../project/operations/monetization.md)를 따른다.

- 데스크톱 인물 상세 펼쳐보기의 매체 아이콘·순위 배지 위치와 링크를 누른 직후의 대기 표식을 확인한다.

- 스펙트럼 | 영향력 화면을 작은 너비에서 확인하고 넘침·잘림이 있으면 보정한다.

- 공개 GitHub 저장소의 홈페이지 값을 `https://feelandnote.com`으로 바꾼다.

- Oracle public vantage point에서 홈 REST를 10분마다 확인하고
  `MemoryUtilization[5m].mean() > 90` 알람을 기존 이메일 topic에 연결한다.

- (우선순위 낮음) 인물 상세(`/celeb/[slug]`) 크롬 반응형 모드에서 상단 구획 제목줄(`CelebSectionHeading`,
  `position: sticky` + 근처 `backdrop-blur`)이 간헐적으로 이전 폭 그대로 잘려 보이고 새로고침으로도
  안 풀릴 때가 있다. 실제 창 크기 변경으로는 재현 안 되고 스스로 복구됨 — 서비스 워커·CSS 그리드
  구조 자체는 정상 확인됨. 크롬 DevTools 반응형(에뮬레이션) 렌더링 경로 쪽 버그로 추정, 실사용자
  화면에선 이 경로를 안 타 실서비스 영향 낮음. 재현 시 콘솔 에러와 함께 다시 본다.
