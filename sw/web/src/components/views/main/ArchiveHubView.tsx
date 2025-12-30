"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Users, Sparkles, ChevronRight, Star, ArrowLeft, BookOpen } from "lucide-react";
import { SectionHeader } from "@/components/ui";
import ArchiveView from "@/components/views/main/archive/ArchiveView";
import ProfileCard, { CelebProfileCard } from "@/components/features/user/ProfileCard";
import ProfileHeader from "@/components/features/user/ProfileHeader";
import type { UserProfile } from "@/actions/user";

interface ArchiveHubViewProps {
  myProfile: UserProfile;
  friends: Array<{ id: string; nickname: string; avatar_url: string | null; content_count: number }>;
  celebs: Array<{ id: string; nickname: string; avatar_url: string | null; content_count: number }>;
}

type TabType = "my" | "explore";
type SelectedUser = { id: string; nickname: string; avatar_url: string | null; content_count: number; type: "friend" | "celeb" } | null;

export default function ArchiveHubView({
  myProfile,
  friends,
  celebs,
}: ArchiveHubViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("my");
  const [selectedUser, setSelectedUser] = useState<SelectedUser>(null);

  const handleSelectUser = (user: { id: string; nickname: string; avatar_url: string | null; content_count: number; type: "friend" | "celeb" }) => {
    setSelectedUser(user);
  };

  const handleBackToExplore = () => {
    setSelectedUser(null);
  };

  const handleProfileClick = () => {
    router.push("/profile");
  };

  return (
    <div>
      {/* 헤더 + 탭 */}
      <div className="flex items-center justify-between mb-4">
        <SectionHeader
          title="기록관"
          icon={<Archive size={20} />}
          className="mb-0"
        />
        <div className="flex gap-1 bg-surface rounded-lg p-1">
          <button
            onClick={() => {
              setActiveTab("my");
              setSelectedUser(null);
            }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === "my"
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            내 기록관
          </button>
          <button
            onClick={() => setActiveTab("explore")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === "explore"
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            탐색
          </button>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === "my" ? (
        <>
          {/* 내 프로필 헤더 */}
          <ProfileHeader
            id={myProfile.id}
            nickname={myProfile.nickname}
            avatar_url={myProfile.avatar_url}
            bio={myProfile.bio}
            content_count={0}
            follower_count={0}
            following_count={0}
            is_self={true}
            onProfileClick={handleProfileClick}
          />
          <ArchiveView />
        </>
      ) : selectedUser ? (
        <SelectedUserView user={selectedUser} onBack={handleBackToExplore} />
      ) : (
        <ExploreTab friends={friends} celebs={celebs} onSelectUser={handleSelectUser} />
      )}
    </div>
  );
}

// 선택된 유저 프로필 뷰
function SelectedUserView({
  user,
  onBack,
}: {
  user: NonNullable<SelectedUser>;
  onBack: () => void;
}) {
  const [isFollowing, setIsFollowing] = useState(false);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    // TODO: 실제 팔로우 API 호출
  };

  return (
    <div>
      {/* 뒤로가기 버튼 */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-4 transition-colors"
      >
        <ArrowLeft size={16} />
        탐색으로 돌아가기
      </button>

      {/* 선택된 유저 프로필 */}
      <ProfileHeader
        id={user.id}
        nickname={user.nickname}
        avatar_url={user.avatar_url}
        content_count={user.content_count}
        follower_count={0}
        following_count={0}
        is_self={false}
        is_following={isFollowing}
        onFollow={handleFollow}
      />

      {/* 해당 유저의 콘텐츠 (추후 구현) */}
      <div className="bg-surface rounded-xl p-8 text-center">
        <BookOpen size={32} className="mx-auto mb-3 text-text-tertiary" />
        <p className="text-sm text-text-secondary font-medium">{user.nickname}님의 공개 기록</p>
        <p className="text-xs text-text-tertiary mt-1">곧 다른 사람의 기록도 탐색할 수 있어요</p>
      </div>
    </div>
  );
}

// 탐색 탭 컴포넌트
function ExploreTab({
  friends,
  celebs,
  onSelectUser,
}: {
  friends: Array<{ id: string; nickname: string; avatar_url: string | null; content_count: number }>;
  celebs: Array<{ id: string; nickname: string; avatar_url: string | null; content_count: number }>;
  onSelectUser: (user: { id: string; nickname: string; avatar_url: string | null; content_count: number; type: "friend" | "celeb" }) => void;
}) {
  return (
    <div className="space-y-8">
      {/* 친구 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Users size={16} className="text-green-500" />
            친구
            {friends.length > 0 && (
              <span className="text-xs text-text-tertiary font-normal">({friends.length})</span>
            )}
          </h2>
          {friends.length > 6 && (
            <button className="text-xs text-text-secondary hover:text-accent flex items-center gap-0.5">
              더보기 <ChevronRight size={14} />
            </button>
          )}
        </div>
        {friends.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {friends.slice(0, 8).map((user) => (
              <button
                key={user.id}
                onClick={() => onSelectUser({ ...user, type: "friend" })}
                className="flex flex-col items-center p-4 bg-surface rounded-xl hover:bg-surface-hover transition-colors group min-w-[100px]"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.nickname}
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-transparent group-hover:ring-accent transition-all mb-2"
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white ring-2 ring-transparent group-hover:ring-accent transition-all mb-2"
                    style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)" }}
                  >
                    {user.nickname.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors truncate max-w-full">
                  {user.nickname}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-surface rounded-xl p-8 text-center">
            <Users size={32} className="mx-auto mb-3 text-text-tertiary" />
            <p className="text-sm text-text-secondary font-medium">아직 친구가 없습니다</p>
            <p className="text-xs text-text-tertiary mt-1">서로 팔로우하면 친구가 됩니다</p>
          </div>
        )}
      </section>

      {/* 셀럽 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Sparkles size={16} className="text-purple-500" />
            인기 셀럽
          </h2>
          {celebs.length > 6 && (
            <button className="text-xs text-text-secondary hover:text-accent flex items-center gap-0.5">
              더보기 <ChevronRight size={14} />
            </button>
          )}
        </div>
        {celebs.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {celebs.slice(0, 8).map((user) => (
              <button
                key={user.id}
                onClick={() => onSelectUser({ ...user, type: "celeb" })}
                className="flex flex-col items-center p-4 bg-surface rounded-xl hover:bg-surface-hover transition-colors group min-w-[100px]"
              >
                <div className="relative mb-2">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.nickname}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-transparent group-hover:ring-accent transition-all"
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white ring-2 ring-transparent group-hover:ring-accent transition-all"
                      style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)" }}
                    >
                      {user.nickname.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-accent text-white text-[10px] font-bold rounded-full">
                    ✓
                  </span>
                </div>
                <span className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors truncate max-w-full">
                  {user.nickname}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-surface rounded-xl p-8 text-center">
            <Sparkles size={32} className="mx-auto mb-3 text-text-tertiary" />
            <p className="text-sm text-text-secondary font-medium">추천 셀럽이 없습니다</p>
            <p className="text-xs text-text-tertiary mt-1">곧 인기 문화 인플루언서를 소개해드릴게요</p>
          </div>
        )}
      </section>

      {/* 추천 유저 (향후 확장) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Star size={16} className="text-yellow-500" />
            취향이 비슷한 유저
          </h2>
        </div>
        <div className="bg-surface rounded-xl p-8 text-center">
          <Star size={32} className="mx-auto mb-3 text-text-tertiary" />
          <p className="text-sm text-text-secondary font-medium">추천 기능 준비 중</p>
          <p className="text-xs text-text-tertiary mt-1">취향 분석을 통해 비슷한 유저를 추천해드릴게요</p>
        </div>
      </section>
    </div>
  );
}
