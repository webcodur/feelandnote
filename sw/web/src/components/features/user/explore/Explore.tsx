/*
  파일명: /components/features/user/explore/Explore.tsx
  기능: 탐색 페이지 메인 뷰
  책임: 친구/팔로잉/팔로워/셀럽/유사 유저를 탭으로 구분하여 렌더링
*/
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Users, Sparkles, Star, UserCheck, UserPlus, Info, BarChart3 } from "lucide-react";
import Button from "@/components/ui/Button";
import { Tab, Tabs } from "@/components/ui";
import { UserCard, SimilarUserCard, EmptyState, MobileUserListItem } from "./ExploreCards";
import { useTranslations } from "next-intl";

import PersonNameplate from "./PersonNameplate";
import AlgorithmInfoModal from "./AlgorithmInfoModal";
import InfluenceDistributionModal from "./InfluenceDistributionModal";
import CelebCarousel from "@/components/features/home/CelebCarousel";



import type { CelebProfile } from "@/types/home";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts, GenderCounts } from "@/actions/home";

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
  genderCounts: GenderCounts;
}

type TabType = "friends" | "following" | "followers" | "celebs" | "similar";
const VALID_TABS: TabType[] = ["celebs", "friends", "following", "followers", "similar"];
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
  genderCounts,
}: ExploreProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const t = useTranslations("explore.ui");

  // URL에서 탭 초기값 읽기
  const getInitialTab = (): TabType => {
    const urlTab = searchParams.get("tab") as TabType | null;
    return urlTab && VALID_TABS.includes(urlTab) ? urlTab : "celebs";
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);
  const [showAlgorithmInfo, setShowAlgorithmInfo] = useState(false);
  const [showInfluenceDistribution, setShowInfluenceDistribution] = useState(false);

  // URL 파라미터 업데이트 함수
  const updateTabParam = useCallback((tab: TabType) => {
    const params = new URLSearchParams(searchParams.toString());
    // celebs 탭이 아닐 때만 필터 파라미터 제거 (탭 전환 시)
    if (tab !== "celebs") {
      params.delete("profession");
      params.delete("nationality");
      params.delete("contentType");
      params.delete("sortBy");
      params.delete("search");
      params.delete("page");
    }
    // celebs가 기본값이므로 URL에서 제거
    if (tab === "celebs") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [searchParams, pathname, router]);

  // 탭 변경 핸들러
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    updateTabParam(tab);
  }, [updateTabParam]);

  const handleSelectUser = (userId: string) => router.push(`/${userId}`);

  const nonFriendFollowing = following.filter((f) => !f.is_friend);
  const nonMutualFollowers = followers.filter((f) => !f.is_following);

  const tabs = [
    { key: "celebs" as const, label: t("tabs.celebs"), icon: <Sparkles size={16} />, count: initialTotal },
    { key: "friends" as const, label: t("tabs.friends"), icon: <Users size={16} />, count: friends.length },
    { key: "following" as const, label: t("tabs.following"), icon: <UserCheck size={16} />, count: nonFriendFollowing.length },
    { key: "followers" as const, label: t("tabs.followers"), icon: <UserPlus size={16} />, count: nonMutualFollowers.length },
    { key: "similar" as const, label: t("tabs.similar"), icon: <Star size={16} />, count: similarUsers.length },
  ];



  return (
    <>
      {/* 탭 네비게이션 - 모바일 가로 스크롤 대응 및 페이드 효과 */}
      <div className="relative w-full mb-8">
        {/* Shadow Overlay Faders */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-bg-main to-transparent z-10 pointer-events-none md:hidden" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-bg-main to-transparent z-10 pointer-events-none md:hidden" />

        <div className="overflow-x-auto overflow-y-hidden scrollbar-hidden px-2 sm:px-4 flex justify-center">
          <Tabs className="min-w-max border-b border-accent-dim/10">
            {tabs.map((tab) => (
              <Tab
                key={tab.key}
                active={activeTab === tab.key}
                onClick={() => handleTabChange(tab.key)}
                className="group whitespace-nowrap px-1.5 sm:px-4"
                label={
                  <span className="flex items-center gap-1 sm:gap-2 py-0.5 sm:py-1">
                    <span className={`transition-transform duration-300 ${activeTab === tab.key ? 'scale-105 text-accent' : 'text-text-secondary opacity-70'}`}>
                      <span className="scale-75 sm:scale-100">{tab.icon}</span>
                    </span>
                    <span className={`font-serif tracking-normal sm:tracking-widest text-[11px] sm:text-base ${activeTab === tab.key ? 'font-black text-accent' : 'font-medium text-text-secondary'}`}>
                       {tab.label}
                    </span>
                    <span className={`text-[9px] sm:text-sm font-medium ${activeTab === tab.key ? 'text-accent/80' : 'text-text-tertiary'}`}>
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
          {/* 영향력 분포 버튼 */}
          <div className="flex justify-center mb-6">
            <button
              type="button"
              onClick={() => setShowInfluenceDistribution(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-border/50 text-text-secondary hover:border-accent/50 hover:text-text-primary bg-bg-card/50"
            >
              <BarChart3 size={14} />
              <span>{t("influenceDistribution")}</span>
            </button>
          </div>
          <CelebCarousel
            initialCelebs={initialCelebs}
            initialTotal={initialTotal}
            initialTotalPages={initialTotalPages}
            professionCounts={professionCounts}
            nationalityCounts={nationalityCounts}
            contentTypeCounts={contentTypeCounts}
            genderCounts={genderCounts}
            mode="grid"
            hideHeader={false}
            syncToUrl
          />
        </div>
      )}

      {/* 다른 탭들 - 기존 컨테이너 스타일 적용 */}
      <div className={`bg-transparent md:bg-surface md:rounded-2xl py-4 md:p-8 min-h-[400px] border-0 md:border md:border-accent-dim/10 md:shadow-inner md:shadow-black/20 ${activeTab === "celebs" ? "hidden" : ""}`}>

        {/* 친구 탭 - 명판 카드 스타일 */}
        {activeTab === "friends" && (
          <>
            {friends.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {friends.map((friend) => (
                  <PersonNameplate
                    key={friend.id}
                    person={friend}
                    onClick={() => handleSelectUser(friend.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={<Users size={32} />} title={t("empty.noFriends")} description={t("empty.noFriendsDesc")} />
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
                      subtext={t("recordCount", { count: user.content_count || 0 })}
                    />
                  ))}
                </div>
              </>
            ) : (
              <EmptyState icon={<UserCheck size={32} />} title={t("empty.noFollowing")} description={t("empty.noFollowingDesc")} />
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
                      subtext={user.bio || t("newFollower")}
                    />
                  ))}
                </div>
              </>
            ) : (
              <EmptyState icon={<UserPlus size={32} />} title={t("empty.noFollowers")} description={t("empty.noFollowersDesc")} />
            )}
          </>
        )}

        {/* 취향 유사 유저 탭 */}
        {activeTab === "similar" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <Button unstyled onClick={() => setShowAlgorithmInfo(true)} className="text-xs text-text-tertiary hover:text-text-secondary flex items-center gap-1">
                <Info size={14} /> {t("algorithm")}
              </Button>
              {similarUsersAlgorithm === "content_overlap" && similarUsers.length > 0 && (
                <span className="text-[10px] text-text-tertiary bg-background px-2 py-0.5 rounded-full">{t("contentOverlapBased")}</span>
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
                      subtext={t("bondsMatch", { bonds: user.overlap_count, percent: (user.similarity * 100).toFixed(0) })}
                    />
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                icon={<Star size={32} />}
                title={t("empty.noSimilar")}
                description={t("empty.noSimilarDesc")}
              />
            )}
          </>
        )}
      </div>

      <AlgorithmInfoModal isOpen={showAlgorithmInfo} onClose={() => setShowAlgorithmInfo(false)} />
      <InfluenceDistributionModal isOpen={showInfluenceDistribution} onClose={() => setShowInfluenceDistribution(false)} />
    </>
  );
}
