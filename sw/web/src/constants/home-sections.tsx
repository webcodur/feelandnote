export interface HomeSectionConfig {
  id: string;
  title: string;
  englishTitle: string;
  description: React.ReactNode;
  svgSrc: string;
  className?: string; // 배경색 등 섹션별 별도 스타일이 필요한 경우
  link?: string; // 섹션 이동 링크
  linkText?: string; // 버튼 텍스트
}

export const HOME_SECTIONS: Record<string, HomeSectionConfig> = {
  EXPLORE: {
    id: "explore-section",
    title: "영감을 나누는 사람들",
    englishTitle: "Explore",
    description: (
      <>
        시대를 초월한 지성을 만나는 여정. <br className="hidden md:block" />
        깊이 있는 <b>기획전</b>으로 몰입하거나, 다양한 <b>카테고리</b>로 폭넓게 탐색해보세요.
      </>
    ),
    svgSrc: "/images/decorations/1.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/explore",
    linkText: "탐색 페이지로 이동",
  },
  FEED: {
    id: "feed-section",
    title: "실시간 피드",
    englishTitle: "Live Feed",
    description: "지금 이 순간, 셀럽들이 남기고 있는 영감의 조각들",
    svgSrc: "/images/decorations/2.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/feed",
    linkText: "피드 페이지로 이동",
  },
  LOUNGE: {
    id: "lounge-section",
    title: "라운지",
    englishTitle: "Lounge",
    description: "비슷한 취향을 가진 사람들과 이야기하고 즐겨보세요.",
    svgSrc: "/images/decorations/3.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/lounge",
    linkText: "라운지 페이지로 이동",
  },
  BOARD: {
    id: "board-section",
    title: "게시판",
    englishTitle: "Board",
    description: "공지사항부터 기능 건의까지",
    svgSrc: "/images/decorations/4.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/board",
    linkText: "게시판 페이지로 이동",
  },
  ARCHIVE: {
    id: "archive-section",
    title: "나의 기록",
    englishTitle: "Records",
    description: "책, 영화, 게임... 당신의 모든 영감을 기록하고 관리하세요.",
    svgSrc: "/images/decorations/5.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/archive",
    linkText: "기록 페이지로 이동",
  },
};

// 섹션 순서 (스크롤 네비게이션용)
export const SECTION_ORDER = [
  "home-banner",
  "explore-section",
  "feed-section",
  "lounge-section",
  "board-section",
  "archive-section",
] as const;
