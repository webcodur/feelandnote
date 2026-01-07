/*
  파일명: /components/features/explore/Explore.tsx
  기능: 탐색 페이지 메인 뷰
  책임: 친구/팔로잉/셀럽/유사 유저 섹션 통합 렌더링
*/ // ------------------------------
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Sparkles, ChevronRight, Star, Plus, UserCheck, Info } from "lucide-react";
import Button from "@/components/ui/Button";
import { UserCard, SimilarUserCard, EmptyState } from "./components/ExploreCards";
import AddCelebModal from "./modals/AddCelebModal";
import AlgorithmInfoModal from "./modals/AlgorithmInfoModal";

interface CelebInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  content_count: number;
  category?: string | null;
  bio?: string | null;
  is_verified?: boolean;
}

interface SimilarUserInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  content_count: number;
  overlap_count: number;
  similarity: number;
}

interface FollowingInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  content_count: number;
  is_friend: boolean;
}

interface ExploreProps {
  friends: Array<{ id: string; nickname: string; avatar_url: string | null; content_count: number }>;
  following: Array<FollowingInfo>;
  celebs: Array<CelebInfo>;
  similarUsers: Array<SimilarUserInfo>;
  similarUsersAlgorithm: "content_overlap" | "recent_activity";
}

export default function Explore({ friends, following, celebs, similarUsers, similarUsersAlgorithm }: ExploreProps) {
  const router = useRouter();
  const [showAddCeleb, setShowAddCeleb] = useState(false);
  const [showAlgorithmInfo, setShowAlgorithmInfo] = useState(false);

  const handleSelectUser = (userId: string) => router.push(`/archive/user/${userId}`);
  const nonFriendFollowing = following.filter(f => !f.is_friend);

  return (
    <>
      <div className="space-y-4">
        {/* 친구 섹션 */}
        <section className="bg-surface rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Users size={16} className="text-green-500" />
              친구
              {friends.length > 0 && <span className="text-xs text-text-tertiary font-normal">({friends.length})</span>}
            </h2>
            {friends.length > 8 && (
              <Button unstyled className="text-xs text-text-secondary hover:text-accent flex items-center gap-0.5">
                전체보기 <ChevronRight size={14} />
              </Button>
            )}
          </div>
          {friends.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {friends.slice(0, 8).map((friend) => (
                <UserCard key={friend.id} user={friend} onClick={() => handleSelectUser(friend.id)} />
              ))}
            </div>
          ) : (
            <EmptyState icon={<Users size={32} />} title="아직 친구가 없어요" description="서로 팔로우하면 친구가 됩니다" />
          )}
        </section>

        {/* 팔로잉 섹션 */}
        {nonFriendFollowing.length > 0 && (
          <section className="bg-surface rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <UserCheck size={16} className="text-blue-500" />
                팔로잉
                <span className="text-xs text-text-tertiary font-normal">({nonFriendFollowing.length})</span>
              </h2>
              {nonFriendFollowing.length > 8 && (
                <Button unstyled className="text-xs text-text-secondary hover:text-accent flex items-center gap-0.5">
                  전체보기 <ChevronRight size={14} />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {nonFriendFollowing.slice(0, 8).map((user) => (
                <UserCard key={user.id} user={user} onClick={() => handleSelectUser(user.id)} />
              ))}
            </div>
          </section>
        )}

        {/* 셀럽 섹션 */}
        <section className="bg-surface rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Sparkles size={16} className="text-purple-500" />
              셀럽
              {celebs.length > 0 && <span className="text-xs text-text-tertiary font-normal">({celebs.length})</span>}
            </h2>
            <Button unstyled onClick={() => setShowAddCeleb(true)} className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 font-medium">
              <Plus size={14} /> 추가
            </Button>
          </div>
          {celebs.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {celebs.map((celeb) => (
                <UserCard key={celeb.id} user={celeb} onClick={() => handleSelectUser(celeb.id)} showCategory />
              ))}
            </div>
          ) : (
            <EmptyState icon={<Sparkles size={32} />} title="등록된 셀럽이 없어요" description="좋아하는 셀럽을 추가해보세요" />
          )}
        </section>

        {/* 취향 유사 유저 섹션 */}
        <section className="bg-surface rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Star size={16} className="text-yellow-500" />
              취향이 비슷한 유저
              {similarUsers.length > 0 && <span className="text-xs text-text-tertiary font-normal">({similarUsers.length})</span>}
              <Button unstyled onClick={() => setShowAlgorithmInfo(true)} className="text-text-tertiary hover:text-text-secondary">
                <Info size={14} />
              </Button>
            </h2>
            {similarUsersAlgorithm === "content_overlap" && similarUsers.length > 0 && (
              <span className="text-[10px] text-text-tertiary bg-background px-2 py-0.5 rounded-full">공통 콘텐츠 기반</span>
            )}
          </div>
          {similarUsers.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {similarUsers.map((user) => (
                <SimilarUserCard key={user.id} user={user} onClick={() => handleSelectUser(user.id)} />
              ))}
            </div>
          ) : (
            <EmptyState icon={<Star size={32} />} title="아직 유사한 유저가 없어요" description="콘텐츠를 기록하면 취향이 비슷한 유저를 추천해드릴게요" />
          )}
        </section>
      </div>

      <AlgorithmInfoModal isOpen={showAlgorithmInfo} onClose={() => setShowAlgorithmInfo(false)} />
      <AddCelebModal isOpen={showAddCeleb} onClose={() => setShowAddCeleb(false)} />
    </>
  );
}
