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
import FollowListModal from "./FollowListModal";

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
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<"followers" | "following">("followers");

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
    <div className="w-full max-w-5xl mx-auto p-6 sm:p-8 md:p-10 mb-8 md:mb-12 border border-accent-dim/20 bg-gradient-to-br from-bg-card/80 via-bg-card/60 to-bg-card/40 backdrop-blur-md rounded-xl shadow-2xl relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("https://res.cloudinary.com/dchkzn79d/image/upload/v1737077656/noise_w9lq5j.png")` }} />
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
      
      {/* 모바일: 세로 배치, 데스크톱: 가로 배치 */}
      <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-4">
        {/* 프로필 이미지 + 기본 정보 (모바일에서 가로 배치) */}
        <div className="flex items-start gap-4 md:contents">
          {/* 아바타 */}
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={hasPortrait ? () => setIsInfoModalOpen(true) : undefined}
              className={`relative group ${hasPortrait ? 'cursor-pointer' : 'cursor-default'}`}
              disabled={!hasPortrait}
            >
              {profileImageUrl ? (
                <div className={`relative rounded-full overflow-hidden border-2 border-accent/30 group-hover:border-accent transition-all duration-300 shadow-lg ${isCeleb ? 'w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] md:w-[120px] md:h-[120px]' : 'w-12 h-12 sm:w-14 sm:h-14 md:w-20 md:h-20'}`}>
                  <Image
                    src={profileImageUrl}
                    alt={profile.nickname}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  {hasPortrait && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full transition-opacity duration-300">
                      <Info size={24} className="text-white" />
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`rounded-full flex items-center justify-center font-bold text-bg-main border-2 border-accent/30 shadow-lg ${isCeleb ? 'w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] md:w-[120px] md:h-[120px] text-xl sm:text-2xl md:text-4xl' : 'w-12 h-12 sm:w-14 sm:h-14 md:w-20 md:h-20 text-lg sm:text-xl md:text-2xl'}`}
                  style={{ background: "linear-gradient(135deg, #d4af37, #f9d76e)" }}
                >
                  {profile.nickname.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          </div>

          {/* 닉네임 + 메타 정보 (모바일에서 아바타 옆에 배치) */}
          <div className="flex-1 min-w-0 md:hidden">
            <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1 flex-wrap">
              <h1 className="text-base sm:text-lg text-text-primary truncate max-w-[120px] sm:max-w-none">
                {profile.nickname}
              </h1>
              {profile.is_verified && (
                <CheckCircle size={14} className="text-accent flex-shrink-0" />
              )}
              {isCeleb && (
                <span className="px-1.5 py-0.5 bg-accent/10 text-accent border border-accent/20 text-[9px] sm:text-xs rounded-sm flex items-center gap-1">
                  <Sparkles size={8} />
                  Celeb
                </span>
              )}
            </div>
            {isCeleb && (profile.title || profile.profession || profile.nationality) && (
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs flex-wrap">
                {profile.title && (
                  <span className="text-accent font-medium truncate">{profile.title}</span>
                )}
                {profile.title && (profile.profession || profile.nationality) && (
                  <span className="text-text-tertiary/50">|</span>
                )}
                {profile.profession && (
                  <span className="text-text-tertiary truncate">{getCelebProfessionLabel(profile.profession)}</span>
                )}
                {profile.profession && profile.nationality && (
                  <span className="text-text-tertiary/50">·</span>
                )}
                {profile.nationality && (
                  <span className="text-text-tertiary"><NationalityText code={profile.nationality} /></span>
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
              <h1 className="text-2xl text-text-primary truncate">
                {profile.nickname}
              </h1>
              {profile.is_verified && (
                <CheckCircle size={20} className="text-accent flex-shrink-0" />
              )}
              {isCeleb && (
                <span className="px-2 py-0.5 bg-accent/10 text-accent border border-accent/20 text-xs rounded-sm flex items-center gap-1">
                  <Sparkles size={10} />
                  Celeb
                </span>
              )}
              {isFriend && !isCeleb && (
                <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-sm border border-accent/20">
                  친구
                </span>
              )}
            </div>
            {isCeleb && (profile.title || profile.profession || profile.nationality || profile.birth_date || profile.death_date) && (
              <div className="flex items-center gap-2 text-sm mb-2 flex-wrap">
                {profile.title && (
                  <span className="text-accent font-medium">{profile.title}</span>
                )}
                {profile.title && (profile.profession || profile.nationality) && (
                  <span className="text-text-tertiary/50">|</span>
                )}
                {profile.profession && (
                  <span className="text-text-tertiary">{getCelebProfessionLabel(profile.profession)}</span>
                )}
                {profile.profession && profile.nationality && (
                  <span className="text-text-tertiary/50">·</span>
                )}
                {profile.nationality && (
                  <span className="text-text-tertiary"><NationalityText code={profile.nationality} /></span>
                )}
                {(profile.birth_date || profile.death_date) && (
                  <span className="flex items-center gap-1 ml-2 border-l border-accent-dim/30 pl-2 text-text-tertiary">
                    <Calendar size={12} />
                    {formatLifespan(profile.birth_date, profile.death_date)}
                  </span>
                )}
              </div>
            )}
          </div>

          {profile.bio && (
            <p className="text-xs sm:text-sm text-text-secondary mb-3 line-clamp-3 md:line-clamp-2 leading-relaxed font-serif">
              {profile.bio}
            </p>
          )}

          {/* 셀럽 명언 */}
          {isCeleb && profile.quotes && (
            <div className="flex items-start gap-2 sm:gap-3 mb-4 p-2.5 sm:p-3 bg-bg-secondary/50 rounded-sm border-l-2 border-accent">
              <Quote size={14} className="text-accent flex-shrink-0 mt-0.5 fill-accent/20" />
              <p className="text-[11px] sm:text-sm text-text-secondary line-clamp-3 md:line-clamp-2 leading-relaxed font-serif">
                "{profile.quotes}"
              </p>
            </div>
          )}
          
          {/* 통계 - 320px 대응 폰트 및 간격 대폭 축소 */}
          <div className="grid grid-cols-5 gap-1 sm:gap-2 md:flex md:items-center md:gap-6 text-sm py-2 border-t border-accent-dim/20 mt-2">
            <Link 
              href={`/${profile.id}/reading`}
              className="flex flex-col items-center md:flex-row md:gap-2 text-text-secondary hover:text-text-primary transition-colors group"
            >
              <BookOpen size={14} className="mb-0.5 md:mb-0 group-hover:text-accent transition-colors shrink-0" />
              <span className="font-bold text-text-primary group-hover:text-accent transition-colors text-base sm:text-lg md:text-base">{profile.stats.content_count}</span>
              <span className="text-[8px] sm:text-[10px] md:text-sm uppercase tracking-wider">기록</span>
            </Link>
            
            <button
              onClick={() => {
                setFollowModalTab("followers");
                setIsFollowModalOpen(true);
              }}
              className="flex flex-col items-center md:flex-row md:gap-2 text-text-secondary hover:text-text-primary transition-colors group"
            >
              <Users size={14} className="mb-0.5 md:mb-0 group-hover:text-accent transition-colors shrink-0" />
              <span className="font-bold text-text-primary group-hover:text-accent transition-colors text-base sm:text-lg md:text-base">{profile.stats.follower_count}</span>
              <span className="text-[8px] sm:text-[10px] md:text-sm uppercase tracking-wider">팔로워</span>
            </button>
            
            <button
              onClick={() => {
                setFollowModalTab("following");
                setIsFollowModalOpen(true);
              }}
              className="flex flex-col items-center md:flex-row md:gap-2 text-text-secondary hover:text-text-primary transition-colors group tracking-normal"
            >
              <span className="font-bold text-text-primary group-hover:text-accent transition-colors text-base sm:text-lg md:text-base">{profile.stats.following_count}</span>
              <span className="text-[8px] sm:text-[10px] md:text-sm uppercase tracking-wider">팔로잉</span>
            </button>

            <div className="flex flex-col items-center md:flex-row md:gap-2 text-text-secondary group cursor-default">
              <span className="font-bold text-text-primary group-hover:text-accent transition-colors text-base sm:text-lg md:text-base">{profile.stats.friend_count}</span>
              <span className="text-[8px] sm:text-[10px] md:text-sm uppercase tracking-wider">친구</span>
            </div>

            <Link
              href={`/${profile.id}/guestbook`}
              className="flex flex-col items-center md:flex-row md:gap-2 text-text-secondary hover:text-accent transition-colors group"
            >
              <MessageSquare size={14} className="mb-0.5 md:mb-0 group-hover:text-accent transition-colors shrink-0" />
              <span className="font-bold text-text-primary group-hover:text-accent transition-colors text-base sm:text-lg md:text-base">{profile.stats.guestbook_count}</span>
              <span className="text-[8px] sm:text-[10px] md:text-sm uppercase tracking-wider">방명록</span>
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
              className={`w-full md:w-auto md:min-w-[100px] uppercase tracking-wider ${isFollowing ? "border-accent-dim/50 text-text-secondary hover:border-accent hover:text-accent" : "bg-accent text-bg-main hover:bg-accent-hover"}`}
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

      {/* 팔로우 리스트 모달 */}
      <FollowListModal
        isOpen={isFollowModalOpen}
        onClose={() => setIsFollowModalOpen(false)}
        userId={profile.id}
        initialTab={followModalTab}
        followerCount={profile.stats.follower_count}
        followingCount={profile.stats.following_count}
      />
    </div>
  );

}
