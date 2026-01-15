/*
  파일명: /constants/breadcrumb.ts
  기능: Breadcrumb 라벨 상수
  책임: 경로별 breadcrumb 라벨을 정의한다.
*/ // ------------------------------

// 정적 경로 라벨
export const BREADCRUMB_LABELS: Record<string, string> = {
  "/": "홈",
  "/archive": "기록관",
  "/archive/explore": "탐색",
  "/archive/feed": "피드",
  "/archive/lounge": "휴게실",
  "/archive/lounge/tier-list": "티어 리스트",
  "/archive/lounge/blind-game": "블라인드 게임",
  "/archive/playlists": "플레이리스트",
  "/profile": "프로필",
  "/profile/stats": "통계",
  "/profile/achievements": "칭호",
  "/profile/guestbook": "방명록",
  "/profile/settings": "설정",
  "/board/free": "자유게시판",
  "/board/notice": "공지사항",
};

// 동적 세그먼트 기본 라벨 (ID가 매핑되지 않을 때 사용)
export const DYNAMIC_SEGMENT_LABELS: Record<string, string> = {
  user: "사용자",
  tiers: "티어",
};

// breadcrumb을 숨길 경로 패턴
export const HIDDEN_BREADCRUMB_PATHS = ["/", "/login", "/signup", "/reset-password", "/terms", "/privacy", "/about"];
