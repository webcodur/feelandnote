"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Users, Rss, Megaphone, MessageSquare, NotebookPen } from "lucide-react";
import { RomanGateIcon, BustIcon } from "@/components/ui/icons/neo-pantheon";
import Button from "@/components/ui/Button";
import LocaleSwitcher from "@/components/shared/LocaleSwitcher";
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
  isLoggedIn?: boolean;
}

export default function HeaderProfileMenu({ profile, isLoggedIn = true }: HeaderProfileMenuProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const t = useTranslations("layout.profile");
  const tLayout = useTranslations("layout");

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

  // 비로그인 상태
  if (!isLoggedIn) {
    return (
      <div className="relative" data-profile-dropdown>
        <Button unstyled onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-white/5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-stone-600 to-stone-400 ring-2 ring-white/10" />
        </Button>

        {showDropdown && (
          <div className="absolute end-0 top-11 w-48 bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden" style={{ zIndex: Z_INDEX.dropdown }}>
            <div className="py-1">
              <Link
                href="/login"
                onClick={() => setShowDropdown(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 no-underline text-text-primary"
              >
                <RomanGateIcon size={16} className="text-text-secondary" />
                {t("login")}
              </Link>
              <LocaleSwitcher variant="menu" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // 로그인 상태
  return (
    <div className="relative" data-profile-dropdown>
      <Button unstyled onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-white/5">
        {profile?.avatar_url ? (
          <div className="relative w-7 h-7 rounded-full overflow-hidden ring-2 ring-white/10">
            <Image src={profile.avatar_url} alt={t("avatar")} fill unoptimized className="object-cover" />
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
              <p className="font-semibold text-sm truncate">{profile?.nickname || t("defaultName")}</p>
              <TitleBadge title={profile?.selected_title ?? null} size="sm" />
            </div>
          </div>

          {/* 내 페이지 링크 */}
          <div className="py-1">
            <Link
              href={`/${profile?.id}`}
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 no-underline text-text-primary"
            >
              <BustIcon size={16} className="text-text-secondary" />
              {t("myPage")}
            </Link>
          </div>

          {/* 감상 모드 */}
          <div className="border-t border-border py-1">
            <Link
              href="/reading"
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 no-underline text-text-primary"
            >
              <NotebookPen size={16} className="text-text-secondary" />
              {tLayout("readingMode")}
            </Link>
          </div>

          {/* 커뮤니티 */}
          <div className="border-t border-border py-1">
            <p className="px-4 py-1.5 text-xs text-text-tertiary">{t("community")}</p>
            <Link
              href="/agora/social"
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 no-underline text-text-primary"
            >
              <Users size={16} className="text-text-secondary" />
              {t("social")}
            </Link>
            <Link
              href="/agora/social-feed"
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 no-underline text-text-primary"
            >
              <Rss size={16} className="text-text-secondary" />
              {t("feed")}
            </Link>
            <Link
              href="/agora/board/notice"
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 no-underline text-text-primary"
            >
              <Megaphone size={16} className="text-text-secondary" />
              {t("notice")}
            </Link>
            <Link
              href="/agora/board/feedback"
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 no-underline text-text-primary"
            >
              <MessageSquare size={16} className="text-text-secondary" />
              {t("feedback")}
            </Link>
          </div>

          {/* 언어 전환 */}
          <div className="border-t border-border py-1">
            <LocaleSwitcher variant="menu" />
          </div>

          {/* 로그아웃 */}
          <div className="border-t border-border py-1">
            <Button unstyled onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 w-full">
              <RomanGateIcon size={16} />
              {t("logout")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
