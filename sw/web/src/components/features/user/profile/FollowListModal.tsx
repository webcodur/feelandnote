/*
  파일명: /components/features/user/FollowListModal.tsx
  기능: 팔로워/팔로잉 목록 모달
  책임: 팔로워/팔로잉 탭 전환과 유저 목록 조회 및 팔로우 토글
*/ // ------------------------------
"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Users, UserCheck, UserPlus, Loader2 } from "lucide-react";
import Modal, { ModalBody } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { TitleBadge } from "@/components/ui";
import { getFollowers, getFollowing, toggleFollow, type FollowerInfo, type FollowingInfo } from "@/actions/user";

type TabType = "followers" | "following";

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialTab?: TabType;
  followerCount: number;
  followingCount: number;
}

export default function FollowListModal({
  isOpen,
  onClose,
  userId,
  initialTab = "followers",
  followerCount,
  followingCount,
}: FollowListModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [followers, setFollowers] = useState<FollowerInfo[]>([]);
  const [following, setFollowing] = useState<FollowingInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async (tab: TabType) => {
    setIsLoading(true);
    if (tab === "followers") {
      const result = await getFollowers(userId);
      if (result.success) setFollowers(result.data);
    } else {
      const result = await getFollowing(userId);
      if (result.success) setFollowing(result.data);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      loadData(initialTab);
    }
  }, [isOpen, initialTab, loadData]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const hasData = tab === "followers" ? followers.length > 0 : following.length > 0;
    if (!hasData) loadData(tab);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="md">
      {/* 탭 헤더 */}
      <div className="flex border-b border-border">
        <Button
          unstyled
          onClick={() => handleTabChange("followers")}
          className={`flex-1 py-4 text-sm font-medium text-center ${
            activeTab === "followers"
              ? "text-accent border-b-2 border-accent"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          팔로워 {followerCount}
        </Button>
        <Button
          unstyled
          onClick={() => handleTabChange("following")}
          className={`flex-1 py-4 text-sm font-medium text-center ${
            activeTab === "following"
              ? "text-accent border-b-2 border-accent"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          팔로잉 {followingCount}
        </Button>
      </div>

      <ModalBody className="p-0 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : activeTab === "followers" ? (
          <FollowerList users={followers} onClose={onClose} />
        ) : (
          <FollowingList users={following} onClose={onClose} />
        )}
      </ModalBody>
    </Modal>
  );
}

function FollowerList({ users, onClose }: { users: FollowerInfo[]; onClose: () => void }) {
  const router = useRouter();

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
        <Users size={32} className="mb-2 opacity-50" />
        <p className="text-sm">아직 팔로워가 없어요</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {users.map((user) => (
        <UserListItem
          key={user.id}
          user={user}
          onNavigate={() => {
            onClose();
            router.push(`/${user.id}`);
          }}
        />
      ))}
    </div>
  );
}

function FollowingList({ users, onClose }: { users: FollowingInfo[]; onClose: () => void }) {
  const router = useRouter();

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
        <Users size={32} className="mb-2 opacity-50" />
        <p className="text-sm">아직 팔로잉이 없어요</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {users.map((user) => (
        <UserListItem
          key={user.id}
          user={user}
          onNavigate={() => {
            onClose();
            router.push(`/${user.id}`);
          }}
        />
      ))}
    </div>
  );
}

function UserListItem({
  user,
  onNavigate,
}: {
  user: FollowerInfo | FollowingInfo;
  onNavigate: () => void;
}) {
  const [isFollowing, setIsFollowing] = useState(user.is_following);
  const [isPending, startTransition] = useTransition();

  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      const result = await toggleFollow(user.id);
      if (result.success) {
        setIsFollowing(result.data.isFollowing);
      }
    });
  };

  return (
    <div
      className="flex items-center gap-3 p-4 hover:bg-white/5 cursor-pointer"
      onClick={onNavigate}
    >
      {/* 아바타 */}
      {user.avatar_url ? (
        <div className="relative w-10 h-10 rounded-full overflow-hidden">
          <Image
            src={user.avatar_url}
            alt={user.nickname}
            fill
            unoptimized
            className="object-cover"
          />
        </div>
      ) : (
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)" }}
        >
          {user.nickname.charAt(0).toUpperCase()}
        </div>
      )}

      {/* 유저 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-text-primary truncate">{user.nickname}</p>
          <TitleBadge title={user.selected_title} size="sm" />
        </div>
        {user.bio && (
          <p className="text-xs text-text-secondary truncate">{user.bio}</p>
        )}
      </div>

      {/* 팔로우 버튼 */}
      <Button
        unstyled
        disabled={isPending}
        onClick={handleFollowClick}
        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg ${
          isFollowing
            ? "bg-white/10 text-text-primary hover:bg-white/15"
            : "bg-accent text-white hover:bg-accent/90"
        } ${isPending ? "opacity-50" : ""}`}
      >
        {isFollowing ? (
          <>
            <UserCheck size={12} />
            팔로잉
          </>
        ) : (
          <>
            <UserPlus size={12} />
            팔로우
          </>
        )}
      </Button>
    </div>
  );
}
