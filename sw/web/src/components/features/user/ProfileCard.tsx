/*
  파일명: /components/features/user/ProfileCard.tsx
  기능: 프로필 미니 카드 컴포넌트
  책임: 친구/셀럽/즐겨찾기 목록용 아바타+닉네임 카드 렌더링
*/ // ------------------------------
"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";

interface ProfileCardProps {
  id: string;
  nickname: string;
  avatar_url: string | null;
  content_count?: number;
  is_self?: boolean;
  badge?: string;
  href?: string;
}

export default function ProfileCard({
  id,
  nickname,
  avatar_url,
  content_count = 0,
  is_self = false,
  badge,
  href,
}: ProfileCardProps) {
  const resolvedHref = href ?? (is_self ? "/archive/me" : `/archive/user/${id}`);

  return (
    <Link
      href={resolvedHref}
      className="flex flex-col items-center p-4 bg-surface rounded-xl hover:bg-surface-hover group min-w-[100px]"
    >
      {/* 아바타 */}
      <div className="relative mb-2">
        {avatar_url ? (
          <img
            src={avatar_url}
            alt={nickname}
            className="w-16 h-16 rounded-full object-cover ring-2 ring-transparent group-hover:ring-accent"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white ring-2 ring-transparent group-hover:ring-accent"
            style={{ background: is_self ? "linear-gradient(135deg, #8b5cf6, #6366f1)" : "linear-gradient(135deg, #8b5cf6, #ec4899)" }}
          >
            {nickname.charAt(0).toUpperCase()}
          </div>
        )}
        {/* 배지 */}
        {badge && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-accent text-white text-[10px] font-bold rounded-full">
            {badge}
          </span>
        )}
        {is_self && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full whitespace-nowrap">
            나
          </span>
        )}
      </div>

      {/* 닉네임 */}
      <span className="text-sm font-medium text-text-primary group-hover:text-accent truncate max-w-full">
        {nickname}
      </span>

      {/* 기록 수 */}
      {content_count > 0 && (
        <span className="flex items-center gap-1 text-xs text-text-tertiary mt-1">
          <BookOpen size={10} />
          {content_count}
        </span>
      )}
    </Link>
  );
}

// 즐겨찾기 카드 (별표 표시)
export function FavoriteProfileCard(props: ProfileCardProps) {
  return <ProfileCard {...props} badge="★" />;
}

// 셀럽 카드 (인증 마크)
export function CelebProfileCard(props: ProfileCardProps) {
  return <ProfileCard {...props} badge="✓" />;
}
