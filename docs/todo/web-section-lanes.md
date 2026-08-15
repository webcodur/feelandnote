# 사용자 웹 구획별 독립 레인 — 남은 일

> 본 작업(공용 대기 모듈 · 봇/사람 분기 `Lane` · 탐색·서가·홈·탐색 하위·비색인 화면 레인 전환 · 인물 상세 방명록 지연 로딩 · 링크 대기 표식 · 매시 캐시 데우기)은 2026-08-16에 끝났다. 규칙은 `docs/project/platform/code-rules.md`「구획별 독립 레인」과 `docs/project/operations/seo.md`가 쥔다. 경위는 커밋 이력에서 꺼낸다.

## 남은 일

| 항목 | 내용 | 재개 지점 |
|---|---|---|
| `[userId]/reading` 첫 페이지 서버 주입 | 서버는 프로필만 확인하고 목록은 클라이언트가 다시 조회해 스피너가 두 번 뜬다. 첫 페이지를 서버에서 넣어 `initialContents`로 넘긴다 | `sw/web/src/app/[locale]/(main)/[userId]/reading/page.tsx` → `RecordsContent` → `ContentLibrary` |
| 인물 목록 필터 뷰 레인 분리 | 필터 줄과 목록이 `useCelebFilters` 한 상태로 묶여 있어 레인 1개로 뒀다. 나누려면 필터 위젯 재설계가 필요 | `sw/web/src/app/[locale]/(main)/explore/figures/sections.tsx`, `components/features/user/explore/CelebCarousel.tsx` |
| 인물 상세 스크롤 잔여 후보 | ① 연표 카드·대사 칸 위 휠 latching(브라우저 동작, 코드 결함 아님) ② 방명록이 늦게 붙으며 문서 높이 변동 ③ 1340px 이상에서 좌측 목차 레일이 휠을 삼킴 | `docs/resource/프롬프트_전달.txt` 1번 아래 메모, `useCelebSectionNavigation.ts` |
| `<main>`의 `scrollbar-stable` 죽은 클래스 | 스크롤 컨테이너가 아니라 효과 없음. 실제 동작은 `globals.css` html 선언 | `components/layout/LayoutMain.tsx` |
| 실화면 확인 | 인물 상세 펼쳐보기 목록의 매체 아이콘, 순위 배지 위치, 링크 대기 표식은 코드·curl로만 확인했다. 배포 후 데스크톱 폭에서 눈으로 확인 | — |
