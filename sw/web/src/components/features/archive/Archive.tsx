/*
  파일명: /components/features/archive/Archive.tsx
  기능: 기록관 허브 페이지 최상위 컴포넌트
  책임: 프로필 헤더, 콘텐츠 라이브러리, 액션 버튼을 조합하여 기록관 메인을 구성한다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import ContentLibrary from "@/components/features/archive/contentLibrary/ContentLibrary";
import AddContentModal from "@/components/features/archive/modals/AddContentModal";
import ArchiveActionButtons from "@/components/features/archive/ArchiveActionButtons";
import FollowListModal from "@/components/features/user/FollowListModal";
import Button from "@/components/ui/Button";
import type { UserProfile } from "@/actions/user";
import { Z_INDEX } from "@/constants/zIndex";

interface MyStats {
  contentCount: number;
  followerCount: number;
  followingCount: number;
  friendCount: number;
}

interface ArchiveProps {
  myProfile: UserProfile;
  stats: MyStats;
}

export default function Archive({ myProfile, stats }: ArchiveProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [followModalTab, setFollowModalTab] = useState<"followers" | "following" | null>(null);

  const handleSuccess = () => setRefreshKey((prev) => prev + 1);

  return (
    <>
      <div className="bg-background pb-8">
        {/* Compact Profile Header */}
        <div className="pt-8 pb-2">
          <div className="flex items-center gap-5">
            <Link href="/profile/stats" className="flex-shrink-0 group relative">
              <Avatar url={myProfile.avatar_url} name={myProfile.nickname} size="lg" className="group-hover:ring-accent/40 ring-4 ring-transparent" />
            </Link>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-3">
                <Link href="/profile/stats" className="group inline-block">
                  <h1 className="text-xl font-bold text-text-primary group-hover:text-accent truncate">{myProfile.nickname}</h1>
                </Link>
              </div>

              {/* Compact Meta Row */}
              <div className="flex items-center gap-4 mt-1 text-sm text-text-secondary flex-wrap">
                <div className="flex items-center gap-1.5 hover:text-text-primary cursor-default">
                  <span className="font-bold text-text-primary">{stats.contentCount}</span>
                  <span>기록</span>
                </div>
                <Button
                  unstyled
                  onClick={() => setFollowModalTab("followers")}
                  className="flex items-center gap-1.5 hover:text-accent"
                >
                  <span className="font-bold text-text-primary">{stats.followerCount}</span>
                  <span>팔로워</span>
                </Button>
                <Button
                  unstyled
                  onClick={() => setFollowModalTab("following")}
                  className="flex items-center gap-1.5 hover:text-accent"
                >
                  <span className="font-bold text-text-primary">{stats.followingCount}</span>
                  <span>팔로잉</span>
                </Button>
                <Link
                  href="/archive/explore"
                  className="flex items-center gap-1.5 hover:text-accent"
                >
                  <span className="font-bold text-text-primary">{stats.friendCount}</span>
                  <span>친구</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Content Library */}
        <ContentLibrary
          key={refreshKey}
          showTabs
          showFilters
          showViewToggle
          emptyMessage="아직 기록한 콘텐츠가 없습니다. 위 버튼을 눌러 첫 번째 콘텐츠를 추가해보세요!"
          headerActions={({ toggleBatchMode, isBatchMode, togglePinMode, isPinMode }) => (
            <ArchiveActionButtons
              onAddContent={() => setIsAddModalOpen(true)}
              onBatchMode={toggleBatchMode}
              isBatchMode={isBatchMode}
              togglePinMode={togglePinMode}
              isPinMode={isPinMode}
            />
          )}
        />
      </div>

      <Button
        unstyled
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-accent flex items-center justify-center shadow-lg hover:scale-110 hover:bg-accent-hover sm:hidden"
        style={{ zIndex: Z_INDEX.fab }}
      >
        <Plus color="white" size={24} />
      </Button>

      <AddContentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={handleSuccess} />

      <FollowListModal
        isOpen={followModalTab !== null}
        onClose={() => setFollowModalTab(null)}
        userId={myProfile.id}
        initialTab={followModalTab || "followers"}
        followerCount={stats.followerCount}
        followingCount={stats.followingCount}
      />
    </>
  );
}

// region Avatar 컴포넌트
function Avatar({ url, name, size = "md", className = "" }: { url: string | null; name: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const sizeClasses = { sm: "w-10 h-10 text-sm", md: "w-12 h-12 text-lg", lg: "w-14 h-14 text-xl", xl: "w-16 h-16 text-2xl" };

  return (
    <div className="relative">
      {url ? (
        <img src={url} alt={name} className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-accent/20 ${className}`} />
      ) : (
        <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white ring-2 ring-accent/20 ${className}`} style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)" }}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
// endregion
