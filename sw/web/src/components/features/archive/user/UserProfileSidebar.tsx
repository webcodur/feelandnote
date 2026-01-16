"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  PillarIcon,
  ScrollIcon,
  MessageTabletIcon,
  SacredFlameIcon
} from "@/components/ui/icons/neo-pantheon";
import { type PublicUserProfile } from "@/actions/user";

interface UserProfileSidebarProps {
  profile: PublicUserProfile;
  isOwner: boolean;
  userId: string;
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

const ITEM_HEIGHT = 56;
const ITEM_GAP = 8;

export default function UserProfileSidebar({ profile, isOwner, userId }: UserProfileSidebarProps) {
  const pathname = usePathname();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const tabs = [
    { label: "기록", href: `/${userId}/records`, icon: PillarIcon },
    { label: "컬렉션", href: `/${userId}/collections`, icon: ScrollIcon },
    { label: "방명록", href: `/${userId}/guestbook`, icon: MessageTabletIcon },
  ];

  const isActive = (href: string, exact: boolean = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  // 현재 활성 탭 인덱스
  const activeIndex = tabs.findIndex(tab => isActive(tab.href));
  // 표시할 인덱스 (호버 중이면 호버 인덱스, 아니면 활성 인덱스)
  const targetIndex = hoveredIndex ?? activeIndex;
  const indicatorTop = targetIndex * (ITEM_HEIGHT + ITEM_GAP);

  return (
    <aside className="w-full lg:w-[240px] flex-shrink-0 animate-fade-in mb-8 lg:mb-0">
      <div className="card-classical p-6 flex flex-col items-center">
        {/* 클릭 시 인물 정보 페이지로 이동 */}
        <Link href={`/${userId}`} className="group flex flex-col items-center cursor-pointer">
          {/* Profile Label */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-10 bg-accent/40 group-hover:w-12 transition-all" />
            <span className="text-serif text-accent text-sm tracking-widest font-black">프 로 필</span>
            <div className="h-px w-10 bg-accent/40 group-hover:w-12 transition-all" />
          </div>

          {/* Avatar Area */}
          <div className="relative mb-6 flex justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-accent/20 scale-125 group-hover:scale-130 transition-transform" />
            <div className="w-24 h-24 rounded-full border-2 border-accent p-1.5 bg-bg-card relative z-10 shadow-[0_0_20px_rgba(212,175,55,0.15)] group-hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] transition-shadow">
              <div className="w-full h-full rounded-full overflow-hidden border border-accent-dim/40 bg-bg-secondary flex items-center justify-center">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.nickname}
                    width={96}
                    height={96}
                    className="object-cover"
                  />
                ) : (
                  <span className="text-3xl font-serif text-accent font-black">
                    {profile.nickname.charAt(0)}
                  </span>
                )}
              </div>
            </div>
            {profile.profile_type === 'CELEB' && (
              <div className="absolute -bottom-1 -right-1 bg-accent text-bg-main p-2 rounded-full border-2 border-bg-card z-20 shadow-lg">
                <SacredFlameIcon size={14} />
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="text-center mb-8">
            <h2 className="text-serif text-3xl text-text-primary tracking-tight font-black drop-shadow-md mb-2 group-hover:text-accent transition-colors">
              {profile.nickname}
            </h2>
            {profile.profession ? (
              <p className="text-sm text-accent tracking-[0.15em] font-serif font-bold uppercase">
                {profile.profession}
              </p>
            ) : (
              <p className="text-sm text-accent-dim tracking-widest font-serif font-bold uppercase opacity-80">
                입문자
              </p>
            )}
          </div>
        </Link>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent mb-6" />

        {/* Navigation Menu */}
        <nav
          className="w-full relative"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* 이동하는 클래시컬 인디케이터 */}
          {targetIndex >= 0 && (
            <div
              className="absolute left-0 right-0 pointer-events-none transition-all duration-300 ease-out"
              style={{
                top: indicatorTop,
                height: ITEM_HEIGHT,
              }}
            >
              {/* 배경 그라데이션 */}
              <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-accent/15 to-accent/5 rounded-sm" />
              {/* 좌측 장식 바 */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-gradient-to-b from-accent/40 via-accent to-accent/40 rounded-full shadow-[0_0_12px_rgba(212,175,55,0.5)]" />
              {/* 상단 라인 */}
              <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
              {/* 하단 라인 */}
              <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
            </div>
          )}

          {/* 메뉴 아이템들 */}
          <div className="relative z-10 flex flex-col gap-2">
            {tabs.map((tab, index) => {
              const isTabActive = isActive(tab.href);
              const isHighlighted = hoveredIndex === index || (hoveredIndex === null && isTabActive);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onMouseEnter={() => setHoveredIndex(index)}
                  className={cn(
                    "group flex items-center gap-4 px-5 text-base tracking-wide font-serif transition-all",
                    isHighlighted
                      ? "text-accent font-black"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                  style={{ height: ITEM_HEIGHT }}
                >
                  <tab.icon
                    size={20}
                    className={cn(
                      "transition-all duration-300",
                      isHighlighted
                        ? "text-accent drop-shadow-[0_0_10px_rgba(212,175,55,0.7)]"
                        : "opacity-40 group-hover:opacity-80"
                    )}
                  />
                  <span className={cn(
                    isHighlighted && "text-glow"
                  )}>
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </aside>
  );
}
