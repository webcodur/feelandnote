// 추천 상태
export type RecommendationStatus = "pending" | "accepted" | "declined";

// 추천 기본 타입
export interface Recommendation {
  id: string;
  sender_id: string;
  receiver_id: string;
  user_content_id: string;
  message: string | null;
  status: RecommendationStatus;
  responded_at: string | null;
  created_at: string;
}

// 발신자 정보
export interface RecommendationSender {
  id: string;
  nickname: string;
  avatar_url: string | null;
}

// 콘텐츠 정보 (추천에 포함)
export interface RecommendationContent {
  id: string;
  title: string;
  thumbnail_url: string | null;
  type: string;
  creator: string | null;
}

// 추천 상세 (받은 추천 목록용)
export interface RecommendationWithDetails extends Recommendation {
  sender: RecommendationSender;
  user_content: {
    id: string;
    content_id: string;
    rating: number | null;
    review: string | null;
    content: RecommendationContent;
  };
}

// 추천 가능한 사용자 (팔로워 또는 친구만)
export interface RecommendableUser {
  id: string;
  nickname: string;
  avatar_url: string | null;
  relation: "follower" | "friend";
}

// 추천 전송 파라미터
export interface SendRecommendationParams {
  receiverId: string;
  userContentId: string;
  message?: string;
}

// 추천 응답 파라미터
export interface RespondRecommendationParams {
  recommendationId: string;
  accept: boolean;
}
