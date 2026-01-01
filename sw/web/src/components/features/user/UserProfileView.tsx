"use client";

import { useState } from "react";
import { Archive, Lock, AlertCircle, Plus, Sparkles } from "lucide-react";
import { SectionHeader } from "@/components/ui";
import Button from "@/components/ui/Button";
import UserProfileHeader from "./UserProfileHeader";
import UserContentGrid from "./UserContentGrid";
import AddCelebContentModal from "./AddCelebContentModal";
import type { PublicUserProfile } from "@/actions/user";

interface UserProfileViewProps {
  profile: PublicUserProfile;
  isOwnProfile?: boolean;
}

export default function UserProfileView({ profile, isOwnProfile = false }: UserProfileViewProps) {
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

  // 공개 기록이 없는 경우
  const isEmpty = profile.stats.content_count === 0;

  return (
    <>
      {/* 프로필 헤더 */}
      <UserProfileHeader profile={profile} isOwnProfile={isOwnProfile} />

      {/* 기록관 섹션 */}
      <div className="flex items-center justify-between mb-4">
        <SectionHeader
          title={`${profile.nickname}의 기록관`}
          description={isCeleb ? "팬들이 기여한 문화생활 기록" : "공개된 문화생활 기록"}
          icon={isCeleb ? <Sparkles size={20} /> : <Archive size={20} />}
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

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-surface rounded-xl">
          <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center mb-4">
            <Lock size={32} className="text-text-tertiary" />
          </div>
          <h3 className="text-base font-medium text-text-primary mb-2">
            공개된 기록이 없습니다
          </h3>
          <p className="text-sm text-text-secondary">
            이 사용자는 아직 기록을 공개하지 않았습니다.
          </p>
        </div>
      ) : (
        <UserContentGrid userId={profile.id} />
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
