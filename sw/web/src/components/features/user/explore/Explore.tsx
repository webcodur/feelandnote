/*
  파일명: /components/features/user/explore/Explore.tsx
  기능: 탐색 페이지 메인 뷰
  책임: 친구/팔로잉/팔로워/셀럽/유사 유저를 탭으로 구분하여 렌더링
*/
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Sparkles, Star, UserCheck, UserPlus, Info } from "lucide-react";
import Button from "@/components/ui/Button";
import { Tab, Tabs } from "@/components/ui";
import SectionHeader from "@/components/ui/SectionHeader";
import { UserCard, SimilarUserCard, EmptyState, MobileUserListItem } from "./ExploreCards";
import AlgorithmInfoModal from "./AlgorithmInfoModal";
import CelebCarousel from "@/components/features/home/CelebCarousel";

import type { CelebProfile } from "@/types/home";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts } from "@/actions/home";

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
  similarUsers: SimilarUserInfo[];
  similarUsersAlgorithm: "content_overlap" | "recent_activity";
  // Celeb Data
  initialCelebs: CelebProfile[];
  initialTotal: number;
  initialTotalPages: number;
  professionCounts: ProfessionCounts;
  nationalityCounts: NationalityCounts;
  contentTypeCounts: ContentTypeCounts;
}

type TabType = "friends" | "following" | "followers" | "celebs" | "similar";
// #endregion

export default function Explore({
  friends,
  following,
  followers,
  similarUsers,
  similarUsersAlgorithm,
  initialCelebs,
  initialTotal,
  initialTotalPages,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
}: ExploreProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("celebs"); // Default to celebs as it's the main feature now
  const [showAlgorithmInfo, setShowAlgorithmInfo] = useState(false);

  const handleSelectUser = (userId: string) => router.push(`/${userId}`);

  const nonFriendFollowing = following.filter((f) => !f.is_friend);
  const nonMutualFollowers = followers.filter((f) => !f.is_following);

  const tabs = [
    { key: "celebs" as const, label: "셀럽", icon: <Sparkles size={16} />, count: initialTotal },
    { key: "friends" as const, label: "친구", icon: <Users size={16} />, count: friends.length },
    { key: "following" as const, label: "팔로잉", icon: <UserCheck size={16} />, count: nonFriendFollowing.length },
    { key: "followers" as const, label: "팔로워", icon: <UserPlus size={16} />, count: nonMutualFollowers.length },
    { key: "similar" as const, label: "취향 유사", icon: <Star size={16} />, count: similarUsers.length },
  ];



  return (
    <>
      <SectionHeader
        variant="hero"
        englishTitle="Inspiring People"
        title="영감을 나누는 사람들"
        description="다양한 콘텐츠 기록을 탐색하세요"
      />



      {/* 탭 네비게이션 - 모바일 가로 스크롤 대응 및 페이드 효과 */}
      <div className="relative w-full mb-8">
        {/* Shadow Overlay Faders */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-bg-main to-transparent z-10 pointer-events-none md:hidden" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-bg-main to-transparent z-10 pointer-events-none md:hidden" />
        
        <div className="overflow-x-auto scrollbar-hide px-4">
          <Tabs className="min-w-max border-b border-accent-dim/10">
            {tabs.map((tab) => (
              <Tab
                key={tab.key}
                active={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="group whitespace-nowrap px-4"
                label={
                  <span className="flex items-center gap-2 py-2">
                    <span className={`transition-transform duration-300 ${activeTab === tab.key ? 'scale-110 text-accent' : 'text-text-secondary opacity-70'}`}>
                      {tab.icon}
                    </span>
                    <span className={`font-serif tracking-widest text-sm sm:text-base ${activeTab === tab.key ? 'font-black text-accent' : 'font-medium text-text-secondary'}`}>
                       {tab.label}
                    </span>
                    <span className={`text-xs sm:text-sm font-medium ${activeTab === tab.key ? 'text-accent/80' : 'text-text-tertiary'}`}>
                      {tab.count}
                    </span>
                  </span>
                }
              />
            ))}
          </Tabs>
        </div>
      </div>

      {/* 탭 컨텐츠 */}
      {/* 셀럽 탭 - CelebCarousel이 자체 배경/텍스처를 가지므로 별도 처리 */}
      {activeTab === "celebs" && (
        <div className="min-h-[400px]">
          <CelebCarousel
            initialCelebs={initialCelebs}
            initialTotal={initialTotal}
            initialTotalPages={initialTotalPages}
            professionCounts={professionCounts}
            nationalityCounts={nationalityCounts}
            contentTypeCounts={contentTypeCounts}
            mode="grid"
            hideHeader={false}
          />
        </div>
      )}

      {/* 다른 탭들 - 기존 컨테이너 스타일 적용 */}
      <div className={`bg-surface rounded-2xl p-4 md:p-8 min-h-[400px] border border-accent-dim/10 shadow-inner shadow-black/20 ${activeTab === "celebs" ? "hidden" : ""}`}>

        {/* 친구 탭 */}
        {activeTab === "friends" && (
          <>
            {friends.length > 0 ? (
              <>
                {/* PC Grid */}
                <div className="hidden sm:grid grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {friends.map((friend) => (
                    <UserCard key={friend.id} user={friend} onClick={() => handleSelectUser(friend.id)} />
                  ))}
                </div>
                {/* Mobile Compact List */}
                <div className="sm:hidden flex flex-col gap-2">
                  {friends.map((friend) => (
                    <MobileUserListItem 
                      key={friend.id} 
                      user={friend} 
                      onClick={() => handleSelectUser(friend.id)}
                      subtext={`${friend.content_count || 0} Records`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <EmptyState icon={<Users size={32} />} title="아직 친구가 없어요" description="서로 팔로우하면 친구가 됩니다" />
            )}
          </>
        )}

        {/* 팔로잉 탭 */}
        {activeTab === "following" && (
          <>
            {nonFriendFollowing.length > 0 ? (
              <>
                {/* PC Grid */}
                <div className="hidden sm:grid grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {nonFriendFollowing.map((user) => (
                    <UserCard key={user.id} user={user} onClick={() => handleSelectUser(user.id)} />
                  ))}
                </div>
                {/* Mobile Compact List */}
                <div className="sm:hidden flex flex-col gap-2">
                  {nonFriendFollowing.map((user) => (
                    <MobileUserListItem 
                      key={user.id} 
                      user={user} 
                      onClick={() => handleSelectUser(user.id)}
                      subtext={`${user.content_count || 0} Records`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <EmptyState icon={<UserCheck size={32} />} title="팔로잉이 없어요" description="관심 있는 사람을 팔로우해보세요" />
            )}
          </>
        )}

        {/* 팔로워 탭 */}
        {activeTab === "followers" && (
          <>
            {nonMutualFollowers.length > 0 ? (
              <>
                {/* PC Grid */}
                <div className="hidden sm:grid grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {nonMutualFollowers.map((user) => (
                    <UserCard key={user.id} user={{ ...user, content_count: 0 }} onClick={() => handleSelectUser(user.id)} />
                  ))}
                </div>
                {/* Mobile Compact List */}
                <div className="sm:hidden flex flex-col gap-2">
                  {nonMutualFollowers.map((user) => (
                    <MobileUserListItem 
                      key={user.id} 
                      user={{ ...user, content_count: 0 }} 
                      onClick={() => handleSelectUser(user.id)}
                      subtext={user.bio || "새로운 팔로워"}
                    />
                  ))}
                </div>
              </>
            ) : (
              <EmptyState icon={<UserPlus size={32} />} title="팔로워가 없어요" description="활동하면 팔로워가 생길 거예요" />
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
              <>
                {/* PC Grid */}
                <div className="hidden sm:grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6">
                  {similarUsers.map((user) => (
                    <SimilarUserCard key={user.id} user={user} onClick={() => handleSelectUser(user.id)} />
                  ))}
                </div>
                {/* Mobile Compact List */}
                <div className="sm:hidden flex flex-col gap-2">
                  {similarUsers.map((user) => (
                    <MobileUserListItem 
                      key={user.id} 
                      user={user} 
                      onClick={() => handleSelectUser(user.id)}
                      subtext={`${user.overlap_count} Bonds · ${(user.similarity * 100).toFixed(0)}% Match`}
                    />
                  ))}
                </div>
              </>
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
    </>
  );
}
