/*
  파일명: /components/features/archive/explore/Explore.tsx
  기능: 탐색 페이지 메인 뷰
  책임: 친구/팔로잉/팔로워/셀럽/유사 유저를 탭으로 구분하여 렌더링
*/
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Sparkles, Star, Plus, UserCheck, UserPlus, Info } from "lucide-react";
import Button from "@/components/ui/Button";
import { Tab, Tabs } from "@/components/ui";
import { UserCard, SimilarUserCard, EmptyState } from "./ExploreCards";
import AddCelebModal from "./modals/AddCelebModal";
import AlgorithmInfoModal from "./modals/AlgorithmInfoModal";

// #region Types
interface FriendInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  content_count: number;
}

interface FollowingInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  content_count: number;
  is_friend: boolean;
}

interface FollowerInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  bio: string | null;
  is_following: boolean;
}

interface CelebInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  content_count: number;
  profession?: string | null;
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

interface ExploreProps {
  friends: FriendInfo[];
  following: FollowingInfo[];
  followers: FollowerInfo[];
  celebs: CelebInfo[];
  similarUsers: SimilarUserInfo[];
  similarUsersAlgorithm: "content_overlap" | "recent_activity";
}

type TabType = "friends" | "following" | "followers" | "celebs" | "similar";
// #endregion

export default function Explore({
  friends,
  following,
  followers,
  celebs,
  similarUsers,
  similarUsersAlgorithm,
}: ExploreProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("friends");
  const [showAddCeleb, setShowAddCeleb] = useState(false);
  const [showAlgorithmInfo, setShowAlgorithmInfo] = useState(false);

  const handleSelectUser = (userId: string) => router.push(`/archive/user/${userId}`);

  const nonFriendFollowing = following.filter((f) => !f.is_friend);
  const nonMutualFollowers = followers.filter((f) => !f.is_following);

  const tabs = [
    { key: "friends" as const, label: "친구", icon: <Users size={14} />, count: friends.length },
    { key: "following" as const, label: "팔로잉", icon: <UserCheck size={14} />, count: nonFriendFollowing.length },
    { key: "followers" as const, label: "팔로워", icon: <UserPlus size={14} />, count: nonMutualFollowers.length },
    { key: "celebs" as const, label: "셀럽", icon: <Sparkles size={14} />, count: celebs.length },
    { key: "similar" as const, label: "취향 유사", icon: <Star size={14} />, count: similarUsers.length },
  ];

  return (
    <>
      {/* 탭 네비게이션 */}
      <Tabs className="mb-6">
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            label={
              <span className="flex items-center gap-1.5">
                {tab.icon}
                {tab.label}
                <span className="text-xs text-text-tertiary font-normal">({tab.count})</span>
              </span>
            }
          />
        ))}
      </Tabs>

      {/* 탭 컨텐츠 */}
      <div className="bg-surface rounded-2xl p-5">
        {/* 친구 탭 */}
        {activeTab === "friends" && (
          <>
            {friends.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {friends.map((friend) => (
                  <UserCard key={friend.id} user={friend} onClick={() => handleSelectUser(friend.id)} />
                ))}
              </div>
            ) : (
              <EmptyState icon={<Users size={32} />} title="아직 친구가 없어요" description="서로 팔로우하면 친구가 됩니다" />
            )}
          </>
        )}

        {/* 팔로잉 탭 */}
        {activeTab === "following" && (
          <>
            {nonFriendFollowing.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {nonFriendFollowing.map((user) => (
                  <UserCard key={user.id} user={user} onClick={() => handleSelectUser(user.id)} />
                ))}
              </div>
            ) : (
              <EmptyState icon={<UserCheck size={32} />} title="팔로잉이 없어요" description="관심 있는 사람을 팔로우해보세요" />
            )}
          </>
        )}

        {/* 팔로워 탭 */}
        {activeTab === "followers" && (
          <>
            {nonMutualFollowers.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {nonMutualFollowers.map((user) => (
                  <UserCard key={user.id} user={{ ...user, content_count: 0 }} onClick={() => handleSelectUser(user.id)} />
                ))}
              </div>
            ) : (
              <EmptyState icon={<UserPlus size={32} />} title="팔로워가 없어요" description="활동하면 팔로워가 생길 거예요" />
            )}
          </>
        )}

        {/* 셀럽 탭 */}
        {activeTab === "celebs" && (
          <>
            <div className="flex justify-end mb-4">
              <Button
                unstyled
                onClick={() => setShowAddCeleb(true)}
                className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 font-medium"
              >
                <Plus size={14} /> 셀럽 추가
              </Button>
            </div>
            {celebs.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {celebs.map((celeb) => (
                  <UserCard key={celeb.id} user={celeb} onClick={() => handleSelectUser(celeb.id)} showProfession />
                ))}
              </div>
            ) : (
              <EmptyState icon={<Sparkles size={32} />} title="등록된 셀럽이 없어요" description="좋아하는 셀럽을 추가해보세요" />
            )}
          </>
        )}

        {/* 취향 유사 유저 탭 */}
        {activeTab === "similar" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <Button unstyled onClick={() => setShowAlgorithmInfo(true)} className="text-xs text-text-tertiary hover:text-text-secondary flex items-center gap-1">
                <Info size={14} /> 추천 알고리즘
              </Button>
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
              <EmptyState
                icon={<Star size={32} />}
                title="아직 유사한 유저가 없어요"
                description="콘텐츠를 기록하면 취향이 비슷한 유저를 추천해드릴게요"
              />
            )}
          </>
        )}
      </div>

      <AlgorithmInfoModal isOpen={showAlgorithmInfo} onClose={() => setShowAlgorithmInfo(false)} />
      <AddCelebModal isOpen={showAddCeleb} onClose={() => setShowAddCeleb(false)} />
    </>
  );
}
