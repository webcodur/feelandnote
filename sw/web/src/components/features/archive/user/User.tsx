/*
  파일명: /components/features/archive/user/User.tsx
  기능: 사용자 프로필 페이지 뷰
  책임: 프로필 헤더, 콘텐츠 그리드, 방명록 섹션 통합 렌더링
*/ // ------------------------------
"use client";

import { useState } from "react";
import { Archive, AlertCircle, Plus, Sparkles, MessageSquare } from "lucide-react";
import { SectionHeader } from "@/components/ui";
import Button from "@/components/ui/Button";
import UserProfileHeader from "./UserProfileHeader";
import ContentLibrary from "@/components/features/archive/contentLibrary/ContentLibrary";
import AddCelebContentModal from "./AddCelebContentModal";
import GuestbookContent from "@/components/features/profile/GuestbookContent";
import type { PublicUserProfile } from "@/actions/user";
import type { GuestbookEntryWithAuthor } from "@/types/database";

interface UserProfileProps {
  profile: PublicUserProfile;
  isOwnProfile?: boolean;
  currentUser?: { id: string; nickname: string | null; avatar_url: string | null } | null;
  guestbook?: {
    entries: GuestbookEntryWithAuthor[];
    total: number;
  };
}

export default function UserProfile({
  profile,
  isOwnProfile = false,
  currentUser,
  guestbook,
}: UserProfileProps) {
  const [showAddContent, setShowAddContent] = useState(false);
  const isCeleb = profile.profile_type === 'CELEB';

  // 차단된 경우
  if (profile.is_blocked) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
          <AlertCircle size={32} className="text-text-tertiary" />
        </div>
        <h2 className="text-lg font-bold text-text-primary mb-2">
          접근할 수 없는 프로필
        </h2>
        <p className="text-sm text-text-secondary">
          이 사용자의 프로필을 볼 수 없습니다.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* 프로필 헤더 */}
      <UserProfileHeader profile={profile} isOwnProfile={isOwnProfile} />

      {/* 기록관 섹션 */}
      <div className="flex items-center justify-between mb-4">
        <SectionHeader
          title={`${profile.nickname}의 기록관`}
          description={isCeleb ? "웹에서 확인된 문화생활 기록" : "공개된 문화생활 기록"}
          icon={<>{isCeleb && <Sparkles size={20} />}{!isCeleb && <Archive size={20} />}</>}
          className="mb-0"
        />
        {isCeleb && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddContent(true)}
          >
            <Plus size={14} />
            기록 추가
          </Button>
        )}
      </div>

      <ContentLibrary
        mode="viewer"
        targetUserId={profile.id}
        emptyMessage="공개된 기록이 없습니다."
      />

      {/* 방명록 섹션 */}
      {guestbook && (
        <div id="guestbook" className="mt-8 scroll-mt-24">
          <SectionHeader
            title="방명록"
            description={`${profile.nickname}님에게 메시지를 남겨보세요`}
            icon={<MessageSquare size={20} />}
          />
          <GuestbookContent
            profileId={profile.id}
            currentUser={currentUser ?? null}
            isOwner={isOwnProfile}
            initialEntries={guestbook.entries}
            initialTotal={guestbook.total}
          />
        </div>
      )}

      {/* 셀럽 콘텐츠 추가 모달 */}
      <AddCelebContentModal
        isOpen={showAddContent}
        celebId={profile.id}
        celebName={profile.nickname}
        onClose={() => setShowAddContent(false)}
      />
    </>
  );
}
