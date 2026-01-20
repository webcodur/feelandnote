"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { RomanGateIcon, BustIcon } from "@/components/ui/icons/neo-pantheon";
import Button from "@/components/ui/Button";
import { TitleBadge, type TitleInfo } from "@/components/ui";
import { Z_INDEX } from "@/constants/zIndex";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  selected_title: TitleInfo | null;
}

interface HeaderProfileMenuProps {
  profile: UserProfile | null;
}

export default function HeaderProfileMenu({ profile }: HeaderProfileMenuProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-profile-dropdown]")) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showDropdown]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="relative" data-profile-dropdown>
      <Button unstyled onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-white/5">
        {profile?.avatar_url ? (
          <div className="relative w-7 h-7 rounded-full overflow-hidden ring-2 ring-white/10">
            <Image src={profile.avatar_url} alt="프로필" fill unoptimized className="object-cover" />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-stone-600 to-stone-400 ring-2 ring-white/10" />
        )}
      </Button>

      {showDropdown && (
        <div className="absolute end-0 top-11 w-48 bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden" style={{ zIndex: Z_INDEX.dropdown }}>
          {/* 프로필 헤더 */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm truncate">{profile?.nickname || "사용자"}</p>
              <TitleBadge title={profile?.selected_title ?? null} size="sm" />
            </div>
          </div>

          {/* 내 기록관 링크 */}
          <div className="py-1">
            {profile && (
              <Link
                href={`/${profile.id}`}
                onClick={() => setShowDropdown(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 no-underline text-text-primary"
              >
                <BustIcon size={16} className="text-text-secondary" />
                내 기록관
              </Link>
            )}
          </div>

          {/* 로그아웃 */}
          <div className="border-t border-border py-1">
            <Button unstyled onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 w-full">
              <RomanGateIcon size={16} />
              로그아웃
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
