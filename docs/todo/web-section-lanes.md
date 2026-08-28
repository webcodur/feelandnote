# 사용자 웹 남은 작업

구획별 대기·렌더 규칙은 `docs/project/platform/code-rules.md`, 검색 노출·캐시 운영은
`docs/project/operations/seo.md`를 따른다. 이 문서에는 아직 실행할 일만 둔다.

## 1. 회원 기록 첫 화면에 목록 주입

- 문제: 서버는 프로필만 읽고 목록은 브라우저가 다시 조회해 대기 표시가 두 번 뜬다.
- 작업: 첫 페이지를 서버에서 조회해 `initialContents`로 넘긴다.
- 재개: `sw/web/src/app/[locale]/(main)/[userId]/reading/page.tsx` → `RecordsContent` → `ContentLibrary`
- 확인: 본인·타인 화면의 공개 범위가 달라지지 않고, 첫 목록 뒤의 검색·정렬·쪽 이동이 계속 동작해야 한다.

## 2. 배포 화면 검수

데스크톱 너비에서 다음을 직접 확인한다.

- 인물 상세 펼쳐보기의 매체 아이콘과 순위 배지 위치
- 링크를 누른 즉시 대기 표식이 나오는지
- 방명록이 늦게 붙을 때 본문이 틀어지거나 현재 위치가 튀지 않는지
- 1340px 이상에서 왼쪽 목차 위의 휠이 본문 스크롤을 막지 않는지

## 3. 인물 상세 스크롤 잔여 현상 분리

다음 후보를 각각 재현해 코드 결함과 브라우저 기본 동작을 구분한다.

- 연표 카드·대사 칸 위에서 휠이 잠깐 묶이는 현상
- 방명록 삽입으로 문서 높이가 변하는 현상
- 넓은 화면의 왼쪽 목차가 휠을 잡는 현상

코드 수정은 재현된 결함에만 적용한다. 재개 지점은
`sw/web/src/app/[locale]/(main)/celeb/[slug]/detail/useCelebSectionNavigation.ts`와 각 내부 스크롤 칸이다.

## 4. 인물 필터와 결과 목록 분리

- 현재 필터 줄과 결과 목록은 `useCelebFilters` 한 상태에 묶여 있다.
- 필터 조작은 유지하면서 결과 조회·대기·실패 상태만 별도 경계로 나눈다.
- 재개: `sw/web/src/app/[locale]/(main)/explore/figures/sections.tsx`,
  `sw/web/src/components/features/home/CelebCarousel.tsx`,
  `sw/web/src/components/features/home/useCelebFilters.ts`
- 확인: 검색어·정렬·쪽·필터 URL 동기화와 모바일 필터가 유지되어야 한다.
