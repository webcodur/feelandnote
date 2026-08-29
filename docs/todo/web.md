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

- 관계망은 개발 화면에서 모바일·데스크톱으로 직접 검수한다. `RELATION_MAP_ENABLED` 운영 차단은 사용자가 공개를 따로 결정할 때까지 유지한다.
- 데스크톱 인물 상세 펼쳐보기의 매체 아이콘·순위 배지 위치와 링크를 누른 직후의 대기 표식을 확인한다.
- 성향 비교 화면을 작은 너비에서 확인하고 넘침·잘림이 있으면 보정한다.
- 공개 GitHub 저장소의 홈페이지 값을 `https://feelandnote.com`으로 바꾼다.
- Oracle public vantage point에서 홈 REST를 10분마다 확인하고
  `MemoryUtilization[5m].mean() > 90` 알람을 기존 이메일 topic에 연결한다.
