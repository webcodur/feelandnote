/*
  파일명: /components/shared/bannerStyles.ts
  기능: 허브 배너(인물·작품·광장·쉼터) 제목의 공통 모양
  책임: 배너마다 따로 적던 제목 모양을 한 곳에서 쥔다.
        흰→돌색 그라데이션 글자·font-black·넓은 자간 영문 부제(E X P L O R E)는 쓰지 않는다 —
        Pretendard로 바뀐 뒤 옛 명조 시절의 장식만 남아 무겁고 헐거워 보였다.
*/ // ------------------------------

/** 넓은 화면 배너의 높이 — 서비스의 모든 허브 배너(탐색·작품·광장·쉼터·기록관)가 같은 값을 쓴다.
    배너는 제목과 경로(빵부스러기)를 싣는 자리라 이 높이면 충분하다. 한 곳만 따로 줄이거나 키우지 않는다 */
export const BANNER_COMPACT_HEIGHT_CLASS = "h-[128px] md:h-[140px]";

/** 넓은 화면 배너(캔버스 무늬 위) 제목. 움직이는 무늬 위에서도 읽히도록 옅은 그림자를 깐다 */
export const BANNER_TITLE_CLASS =
  "text-4xl font-bold leading-tight tracking-tight text-text-primary text-center text-balance [text-shadow:0_2px_16px_rgba(0,0,0,0.85)] md:text-[2.75rem]";

/** 휴대폰 배너 제목 — 넓은 화면 배너와 같이 가운데에 선다 */
export const BANNER_MOBILE_TITLE_CLASS =
  "justify-center text-center text-2xl font-bold leading-tight tracking-tight text-text-primary";

/** 경로(빵부스러기) 줄 — 무늬 위에서 읽히도록 반투명 알약 바탕에 싣는다 */
export const BANNER_CRUMB_TRAIL_CLASS =
  "pointer-events-auto inline-flex max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 rounded-full border border-line bg-bg-secondary/75 px-3 py-1 text-[13px] font-medium text-text-secondary backdrop-blur-sm md:text-sm";

/** 경로의 상위 단계 링크. hover는 글자색이 즉시 바뀐다 */
export const BANNER_CRUMB_LINK_CLASS =
  "rounded-sm hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent";

/** 현재 단계 제목(누르면 새로고침) */
// 단추는 전역 기본층에서 굵기 500을 받으므로 제목의 굵기를 그대로 물려받게 되돌린다
export const BANNER_CRUMB_CURRENT_CLASS =
  "pointer-events-auto rounded-sm [font-weight:inherit] hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer";

/** 넓은 화면 배너 틀 — 캔버스 무늬를 둥근 판 하나에 담고, 아래 본문과 간격을 둔다
    (본문 폭 틀 PageContainer는 위아래 여백을 갖지 않는다) */
export const BANNER_DESKTOP_SHELL_CLASS =
  "hidden md:block mx-auto mb-8 max-w-[var(--content-max-default)] overflow-hidden rounded-panel border border-line";

/** 휴대폰 배너 틀 — 바깥 틀 여백(16px)과 본문 윗여백(20px)을 되돌려 화면 끝까지 붙인다 */
export const BANNER_MOBILE_SHELL_CLASS =
  "md:hidden relative -mx-4 -mt-5 mb-5 flex flex-col items-center justify-center gap-1.5 border-b border-line bg-bg-secondary px-4 py-5";
