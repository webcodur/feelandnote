/*
  파일명: /components/features/user/UserProfileHeader.tsx
  기능: 공개 프로필 헤더 컴포넌트
  책임: 타 유저 프로필 페이지 상단의 아바타, 정보, 팔로우 버튼 렌더링
*/ // ------------------------------
"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck, Users, BookOpen, CheckCircle, Sparkles, MessageSquare, Quote, Calendar, Info } from "lucide-react";
import Button from "@/components/ui/Button";
import { toggleFollow, type PublicUserProfile } from "@/actions/user";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import NationalityText from "@/components/ui/NationalityText";
import CelebInfoModal from "./CelebInfoModal";

// 생몰년 포맷팅 헬퍼
function formatLifespan(birthDate: string | null, deathDate: string | null): string | null {
  if (!birthDate && !deathDate) return null

  const formatYear = (date: string): string => {
    if (date.startsWith('-')) {
      return `BC ${date.slice(1)}`
    }
    const year = date.split('-')[0]
    return year
  }

  const birth = birthDate ? formatYear(birthDate) : '?'
  const death = deathDate ? formatYear(deathDate) : (birthDate ? '현재' : '?')

  return `${birth} ~ ${death}`
}

interface UserProfileHeaderProps {
  profile: PublicUserProfile;
  isOwnProfile?: boolean;
  currentUser?: { id: string } | null;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function UserProfileHeader({
  profile,
  isOwnProfile = false,
  currentUser,
  onFollowChange,
}: UserProfileHeaderProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(profile.is_following);
  const [isPending, startTransition] = useTransition();
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const isFriend = isFollowing && profile.is_follower;
  const isCeleb = profile.profile_type === 'CELEB';
  const hasPortrait = isCeleb && !!profile.portrait_url;
  const isLoggedIn = !!currentUser;

  // 원형 아바타는 항상 avatar_url 사용 (중형 초상화는 모달에서 표시)
  const profileImageUrl = profile.avatar_url;

  const handleFollowClick = () => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    startTransition(async () => {
      const result = await toggleFollow(profile.id);
      if (result.success) {
        setIsFollowing(result.data.isFollowing);
        onFollowChange?.(result.data.isFollowing);
      }
    });
  };

  return (
    <div className="border border-border rounded-xl p-4 md:p-6 mb-4 bg-surface/10">
      {/* 모바일: 세로 배치, 데스크톱: 가로 배치 */}
      <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-4">
        {/* 프로필 이미지 + 기본 정보 (모바일에서 가로 배치) */}
        <div className="flex items-start gap-3 md:contents">
          {/* 아바타 */}
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={hasPortrait ? () => setIsInfoModalOpen(true) : undefined}
              className={`relative group ${hasPortrait ? 'cursor-pointer' : 'cursor-default'}`}
              disabled={!hasPortrait}
            >
              {profileImageUrl ? (
                <div className={`relative rounded-full overflow-hidden ${isCeleb ? 'w-[72px] h-[72px] md:w-[120px] md:h-[120px]' : 'w-14 h-14 md:w-20 md:h-20'}`}>
                  <Image
                    src={profileImageUrl}
                    alt={profile.nickname}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  {hasPortrait && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full">
                      <Info size={24} className="text-white" />
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`rounded-full flex items-center justify-center font-bold text-white ${isCeleb ? 'w-[72px] h-[72px] md:w-[120px] md:h-[120px] text-2xl md:text-4xl' : 'w-14 h-14 md:w-20 md:h-20 text-xl md:text-2xl'}`}
                  style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)" }}
                >
                  {profile.nickname.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          </div>

          {/* 닉네임 + 메타 정보 (모바일에서 아바타 옆에 배치) */}
          <div className="flex-1 min-w-0 md:hidden">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-lg font-bold text-text-primary truncate">
                {profile.nickname}
              </h1>
              {profile.is_verified && (
                <CheckCircle size={16} className="text-accent flex-shrink-0" />
              )}
              {isCeleb && (
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-500 text-xs rounded-full flex items-center gap-1">
                  <Sparkles size={10} />
                  셀럽
                </span>
              )}
              {isFriend && !isCeleb && (
                <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full">
                  친구
                </span>
              )}
            </div>
            {isCeleb && (profile.profession || profile.nationality || profile.birth_date || profile.death_date) && (
              <div className="flex items-center gap-2 text-xs text-text-tertiary flex-wrap">
                {(profile.profession || profile.nationality) && (
                  <span>
                    {profile.profession && getCelebProfessionLabel(profile.profession)}
                    {profile.profession && profile.nationality && ' · '}
                    {profile.nationality && <NationalityText code={profile.nationality} />}
                  </span>
                )}
                {(profile.birth_date || profile.death_date) && (
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {formatLifespan(profile.birth_date, profile.death_date)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 프로필 정보 (데스크톱) */}
        <div className="flex-1 min-w-0">
          {/* 닉네임 + 메타 (데스크톱 전용) */}
          <div className="hidden md:block">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-text-primary truncate">
                {profile.nickname}
              </h1>
              {profile.is_verified && (
                <CheckCircle size={18} className="text-accent flex-shrink-0" />
              )}
              {isCeleb && (
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-500 text-xs rounded-full flex items-center gap-1">
                  <Sparkles size={10} />
                  셀럽
                </span>
              )}
              {isFriend && !isCeleb && (
                <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full">
                  친구
                </span>
              )}
            </div>
            {isCeleb && (profile.profession || profile.nationality || profile.birth_date || profile.death_date) && (
              <div className="flex items-center gap-2 text-xs text-text-tertiary mb-1 flex-wrap">
                {(profile.profession || profile.nationality) && (
                  <span>
                    {profile.profession && getCelebProfessionLabel(profile.profession)}
                    {profile.profession && profile.nationality && ' · '}
                    {profile.nationality && <NationalityText code={profile.nationality} />}
                  </span>
                )}
                {(profile.birth_date || profile.death_date) && (
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {formatLifespan(profile.birth_date, profile.death_date)}
                  </span>
                )}
              </div>
            )}
          </div>

          {profile.bio && (
            <p className="text-sm text-text-secondary mb-2 line-clamp-2">
              {profile.bio}
            </p>
          )}

          {/* 셀럽 명언 */}
          {isCeleb && profile.quotes && (
            <div className="flex items-start gap-2 mb-3 p-2 bg-accent/5 rounded-lg border border-accent/10">
              <Quote size={14} className="text-accent flex-shrink-0 mt-0.5" />
              <p className="text-sm text-text-secondary italic line-clamp-2">
                "{profile.quotes}"
              </p>
            </div>
          )}

          {/* 통계 - 모바일: 그리드, 데스크톱: 인라인 */}
          <div className="grid grid-cols-5 gap-2 md:flex md:items-center md:gap-4 text-sm">
            <div className="flex flex-col items-center md:flex-row md:gap-1.5 text-text-secondary">
              <BookOpen size={14} className="mb-0.5 md:mb-0" />
              <span className="font-medium text-text-primary">{profile.stats.content_count}</span>
              <span className="text-xs md:text-sm">기록</span>
            </div>
            <div className="flex flex-col items-center md:flex-row md:gap-1.5 text-text-secondary">
              <Users size={14} className="mb-0.5 md:mb-0" />
              <span className="font-medium text-text-primary">{profile.stats.follower_count}</span>
              <span className="text-xs md:text-sm">팔로워</span>
            </div>
            <div className="flex flex-col items-center md:flex-row md:gap-1.5 text-text-secondary">
              <span className="font-medium text-text-primary">{profile.stats.following_count}</span>
              <span className="text-xs md:text-sm">팔로잉</span>
            </div>
            <div className="flex flex-col items-center md:flex-row md:gap-1.5 text-text-secondary">
              <span className="font-medium text-text-primary">{profile.stats.friend_count}</span>
              <span className="text-xs md:text-sm">친구</span>
            </div>
            <Link
              href="#guestbook"
              className="flex flex-col items-center md:flex-row md:gap-1.5 text-text-secondary hover:text-accent"
            >
              <MessageSquare size={14} className="mb-0.5 md:mb-0" />
              <span className="font-medium text-text-primary">{profile.stats.guestbook_count}</span>
              <span className="text-xs md:text-sm">방명록</span>
            </Link>
          </div>
        </div>

        {/* 팔로우 버튼 - 모바일: 전체 너비, 데스크톱: 우측 */}
        {!isOwnProfile && (
          <div className="flex-shrink-0 w-full md:w-auto mt-2 md:mt-0">
            <Button
              variant={isFollowing ? "secondary" : "primary"}
              size="sm"
              onClick={handleFollowClick}
              disabled={isPending}
              className="w-full md:w-auto md:min-w-[90px]"
            >
              {isFollowing ? (
                <>
                  <UserCheck size={14} />
                  {isFriend ? "친구" : "팔로잉"}
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  팔로우
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* 셀럽 정보 모달 */}
      {isCeleb && (
        <CelebInfoModal
          isOpen={isInfoModalOpen}
          onClose={() => setIsInfoModalOpen(false)}
          profile={profile}
        />
      )}
    </div>
  );
}
