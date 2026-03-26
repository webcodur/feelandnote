export interface PageCardInfo {
  url: string;
  pageName: string;
  sections: {
    name: string;
    card: string;
    description: string;
  }[];
}

export interface CardComponentInfo {
  name: string;
  path: string;
  imageRatio: string;
  description: string;
}

export const PAGE_CARD_MAP: PageCardInfo[] = [
  {
    url: "/",
    pageName: "홈",
    sections: [
      {
        name: "기록관 프리뷰",
        card: "ContentCard",
        description: "내 기록 미리보기. 리뷰 모드 사용.",
      },
    ],
  },
  {
    url: "/(standalone)/search",
    pageName: "검색",
    sections: [
      {
        name: "검색 결과 (콘텐츠)",
        card: "ContentCard",
        description: "도서/영상/게임/음악 검색 결과. saved, topRightNode 슬롯 사용.",
      },
    ],
  },
  {
    url: "/[userId]/reading",
    pageName: "기록관",
    sections: [
      {
        name: "일반 콘텐츠 목록",
        card: "ContentCard",
        description: "도서/영상/게임/음악 기록. 리뷰 모드 (PC: 이미지+리뷰, MB: 포스터형).",
      },
      {
        name: "자격증 섹션",
        card: "ContentCard",
        description: "자격증도 ContentCard로 통합. 그라데이션 폴백 + 골드 스탬프.",
      },
    ],
  },
  {
    url: "/[userId]/reading/interests",
    pageName: "관심 목록",
    sections: [
      {
        name: "일반 콘텐츠",
        card: "ContentCard",
        description: "관심(WANT) 등록한 콘텐츠. 포스터 레이아웃 + saved 뱃지.",
      },
      {
        name: "자격증 섹션",
        card: "ContentCard",
        description: "관심 자격증도 ContentCard로 통합.",
      },
    ],
  },
  {
    url: "/[userId]/reading/collections/[id]",
    pageName: "컬렉션 상세",
    sections: [
      {
        name: "콘텐츠 선택 모달",
        card: "ContentCard",
        description: "컬렉션 편집 시 콘텐츠 선택. selectable 슬롯 사용.",
      },
    ],
  },
  {
    url: "/library",
    pageName: "작품 (지혜의 서가)",
    sections: [
      {
        name: "공통 서가",
        card: "ContentCard",
        description: "전체 셀럽의 추천 콘텐츠. index/celebCount/userCount/avgRating 슬롯 사용.",
      },
      {
        name: "길의 갈래 (분야별)",
        card: "ContentCard",
        description: "직업/분야별 콘텐츠 분류. 인라인 래퍼로 모달 연동.",
      },
      {
        name: "오늘의 인물",
        card: "ContentCard",
        description: "데일리 셀럽 추천 콘텐츠.",
      },
      {
        name: "시대의 작품 (시대별)",
        card: "ContentCard",
        description: "시대별 콘텐츠 분류.",
      },
    ],
  },
  {
    url: "/agora/celeb-feed",
    pageName: "셀럽 피드",
    sections: [
      {
        name: "셀럽 리뷰 피드",
        card: "ContentCard",
        description: "셀럽들의 콘텐츠 리뷰. 인라인 래퍼로 프로필 헤더 + 저장 버튼 + 리뷰모드.",
      },
    ],
  },
  {
    url: "/agora/friend-feed",
    pageName: "친구 활동",
    sections: [
      {
        name: "친구 활동 피드",
        card: "ContentCard",
        description: "팔로우한 친구들의 기록. 인라인 래퍼로 프로필 헤더 + 저장 버튼 + 리뷰모드.",
      },
    ],
  },
  {
    url: "/notifications",
    pageName: "알림",
    sections: [
      {
        name: "추천 알림",
        card: "RecommendationCard",
        description: "받은 추천 표시. 수락/거절 버튼 포함.",
      },
    ],
  },
];

export const CARD_COMPONENTS: CardComponentInfo[] = [
  {
    name: "ContentCard",
    path: "components/ui/cards/ContentCard.tsx",
    imageRatio: "2:3 / 3:4 / 가로형(리뷰)",
    description: "통합 카드. 슬롯 기반 + 리뷰 모드로 모든 콘텐츠 카드 대체.",
  },
  {
    name: "RecommendationCard",
    path: "components/features/recommendations/RecommendationCard.tsx",
    imageRatio: "가로형",
    description: "추천 알림용. 수락/거절 버튼.",
  },
];
