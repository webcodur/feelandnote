/*
  파일명: /components/layout/Header.tsx
  기능: 앱 상단 헤더 컴포넌트
  책임: 로고, 1차 네비게이션, 검색, 알림, 프로필을 포함한 헤더 UI를 제공한다.
*/ // ------------------------------

"use client";

import { useState, useEffect } from "react";
import { NotebookPen } from "lucide-react";
import { LyreIcon, LyreSilentIcon } from "@/components/ui/icons/neo-pantheon";
import { useSound } from "@/contexts/SoundContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderSearch from "./HeaderSearch";
import HeaderNotifications from "./HeaderNotifications";
import HeaderProfileMenu from "./HeaderProfileMenu";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  selected_title: { name: string; grade: string } | null;
}

interface HeaderProps {
  isMobile?: boolean;
}

const ICON_BUTTON_CLASS = "w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5";
const ICON_SIZE = 20;

const NAV_ITEMS = [
  { href: "/explore", label: "탐색" },
  { href: "/feed", label: "피드" },
  { href: "/lounge", label: "라운지" },
]
export default function Header({ isMobile }: HeaderProps) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const { isSoundEnabled, toggleSound, playSound } = useSound();

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoggedIn(false);
        return;
      }

      setIsLoggedIn(true);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, nickname, avatar_url, selected_title:titles!profiles_selected_title_id_fkey(name, grade)")
        .eq("id", user.id)
        .single();
      if (profileData) {
        // Supabase FK relation이 배열로 타입 추론되지만 실제로는 단일 객체
        const rawTitle = profileData.selected_title;
        const selectedTitle = rawTitle
          ? (Array.isArray(rawTitle) ? rawTitle[0] : rawTitle) as { name: string; grade: string }
          : null;
        setProfile({
          id: profileData.id,
          nickname: profileData.nickname || "User",
          avatar_url: profileData.avatar_url,
          selected_title: selectedTitle,
        });
      }
    };
    loadProfile();
  }, []);

  const isNavActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="w-full h-16 bg-black/90 backdrop-blur-md border-b-[1px] border-b-white/5 flex items-center px-3 gap-2 md:px-6 md:gap-4 fixed top-0 start-0" style={{ zIndex: Z_INDEX.header }}>
      <div className="absolute bottom-0 start-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

      <div className="relative z-10 flex items-center w-full gap-2 md:gap-4">
        <Logo size="md" />

        {/* 1차 네비게이션 (데스크톱) */}
        {!isMobile && (
          <nav className="hidden md:flex items-center gap-1 ms-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium no-underline ${
                  isNavActive(item.href) ? "text-accent bg-accent/10 text-glow" : "text-text-secondary hover:text-text-primary hover:bg-white/5 hover:text-glow"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {profile && (
              <Link
                href={`/${profile.id}`}
                className={`px-3 py-2 rounded-lg text-sm font-medium no-underline ${
                  isNavActive(`/${profile.id}`) ? "text-accent bg-accent/10 text-glow" : "text-text-secondary hover:text-text-primary hover:bg-white/5 hover:text-glow"
                }`}
              >
                기록관
              </Link>
            )}
          </nav>
        )}

        <HeaderSearch />

        {/* 우측 영역 */}
        <div className="flex items-center gap-1 ms-auto">
          {/* 감상 모드 */}
          <Link
            href="/reading"
            className={`${ICON_BUTTON_CLASS} ${pathname.startsWith("/reading") ? "text-accent bg-accent/10" : "text-text-secondary hover:text-text-primary"}`}
            title="감상 모드"
          >
            <NotebookPen size={ICON_SIZE} />
          </Link>

          {/* 사운드 토글 */}
          <Button
            unstyled
            noSound
            onClick={() => {
              const isNowEnabled = toggleSound();
              if (isNowEnabled) playSound("volumeCheck", true);
            }}
            className={`${ICON_BUTTON_CLASS} hidden md:flex`}
            title={isSoundEnabled ? "사운드 끄기" : "사운드 켜기"}
          >
            {isSoundEnabled ? <LyreIcon size={ICON_SIZE} /> : <LyreSilentIcon size={ICON_SIZE} />}
          </Button>

          {/* 로그인 버튼 제거 */}

          {/* 알림 (로그인 시에만) */}
          {profile && <HeaderNotifications />}

          {/* 프로필 메뉴 (로그인 시에만) */}
          {profile && <HeaderProfileMenu profile={profile} />}
        </div>
      </div>
    </header>
  );
}
