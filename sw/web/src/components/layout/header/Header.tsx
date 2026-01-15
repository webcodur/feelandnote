/*
  파일명: /components/layout/Header.tsx
  기능: 앱 상단 헤더 컴포넌트
  책임: 로고, 1차 네비게이션, 검색, 알림, 프로필을 포함한 헤더 UI를 제공한다.
*/ // ------------------------------

"use client";

import { useState, useEffect } from "react";
import { Bell, Heart, MessageCircle, UserPlus, Trophy, Volume2, VolumeX, BarChart2, Settings, LogOut, BookOpen } from "lucide-react";
import { useSound } from "@/contexts/SoundContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderSearch from "./HeaderSearch";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  nickname: string;
  avatar_url: string | null;
}

interface HeaderProps {
  isMobile?: boolean;
}

// 아이콘 버튼 공통 스타일
const ICON_BUTTON_CLASS = "w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5";
const ICON_SIZE = 20;

// 1차 네비게이션 항목
const NAV_ITEMS = [
  { href: "/archive", label: "기록관" },
  { href: "/archive/feed", label: "피드" },
  { href: "/archive/lounge", label: "휴게실" },
];

// 프로필 드롭다운 메뉴 항목
const PROFILE_MENU_ITEMS = [
  { href: "/profile/stats", label: "내 통계", icon: BarChart2 },
  { href: "/profile/achievements", label: "칭호", icon: Trophy },
  { href: "/profile/guestbook", label: "방명록", icon: BookOpen },
  { href: "/profile/settings", label: "설정", icon: Settings },
];

export default function Header({ isMobile }: HeaderProps) {
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
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
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, nickname, avatar_url")
        .eq("id", user.id)
        .single();

      if (profile) {
        setProfile({
          id: profile.id,
          nickname: profile.nickname || "User",
          avatar_url: profile.avatar_url,
        });
      }
    };
    loadProfile();
  }, []);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-notification-dropdown]")) {
        setShowNotifications(false);
      }
      if (!target.closest("[data-profile-dropdown]")) {
        setShowProfileMenu(false);
      }
    };

    if (showNotifications || showProfileMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showNotifications, showProfileMenu]);

  const notifications = [
    {
      id: 1,
      type: "like",
      icon: <Heart size={16} className="text-red-400" />,
      message: "마법사A님이 회원님의 리뷰를 좋아합니다",
      time: "10분 전",
      read: false,
    },
    {
      id: 2,
      type: "comment",
      icon: <MessageCircle size={16} className="text-blue-400" />,
      message: "BookLover님이 댓글을 남겼습니다",
      time: "2시간 전",
      read: false,
    },
    {
      id: 3,
      type: "follow",
      icon: <UserPlus size={16} className="text-green-400" />,
      message: "독서광님이 회원님을 팔로우하기 시작했습니다",
      time: "5시간 전",
      read: true,
    },
    {
      id: 4,
      type: "achievement",
      icon: <Trophy size={16} className="text-yellow-400" />,
      message: "새 칭호를 획득했습니다",
      time: "1일 전",
      read: true,
    },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  // 네비게이션 활성 상태 확인
  const isNavActive = (href: string) => {
    if (href === "/archive") {
      return pathname === "/archive" ||
        pathname.startsWith("/archive/user/") ||
        pathname.startsWith("/archive/playlists") ||
        pathname.startsWith("/archive/explore");
    }
    return pathname.startsWith(href);
  };

  return (
    <header
      className="w-full h-16 bg-bg-secondary border-b border-border flex items-center px-3 gap-2 md:px-6 md:gap-4 fixed top-0 left-0"
      style={{ zIndex: Z_INDEX.header }}
    >
      {/* 로고 */}
      <Logo size="md" />

      {/* 1차 네비게이션 (데스크톱) */}
      {!isMobile && (
        <nav className="hidden md:flex items-center gap-1 ml-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium no-underline
                ${isNavActive(item.href)
                  ? "text-accent bg-accent/10"
                  : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      {/* 검색 */}
      <HeaderSearch />

      {/* 우측 영역 */}
      <div className="flex items-center gap-1 ml-auto">
        {/* 사운드 토글 (데스크톱만, 로그인 시만) */}
        {isLoggedIn && (
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
            {isSoundEnabled ? (
              <Volume2 size={ICON_SIZE} className="text-accent" />
            ) : (
              <VolumeX size={ICON_SIZE} className="text-text-secondary" />
            )}
          </Button>
        )}

        {/* 비로그인 시 로그인 버튼 */}
        {isLoggedIn === false && (
          <Link href="/login">
            <Button variant="primary" size="sm">
              로그인
            </Button>
          </Link>
        )}

        {/* 로그인 시 알림 아이콘 */}
        {isLoggedIn && (
          <div className="relative" data-notification-dropdown>
            <Button
              unstyled
              onClick={() => setShowNotifications(!showNotifications)}
              className={`${ICON_BUTTON_CLASS} relative`}
            >
              <Bell size={ICON_SIZE} className="text-text-secondary" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 bg-accent rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>

            {/* 알림 드롭다운 */}
            {showNotifications && (
              <div
                className="absolute right-0 top-11 w-[calc(100vw-24px)] sm:w-80 bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
                style={{ zIndex: Z_INDEX.dropdown }}
              >
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <span className="font-semibold text-sm">알림</span>
                  {unreadCount > 0 && (
                    <span className="text-xs text-accent">{unreadCount}개의 새 알림</span>
                  )}
                </div>
                <div className="max-h-[320px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`px-4 py-3 flex gap-3 hover:bg-white/5 cursor-pointer ${!notif.read ? "bg-accent/5" : ""}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                          {notif.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary leading-snug">{notif.message}</p>
                          <p className="text-xs text-text-secondary mt-1">{notif.time}</p>
                        </div>
                        {!notif.read && <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />}
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-text-secondary text-sm">
                      알림이 없습니다
                    </div>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="px-4 py-2.5 flex justify-between items-center border-t border-border">
                    <Button unstyled className="text-xs text-text-secondary hover:text-text-primary">모두 읽음</Button>
                    <Button unstyled className="text-xs text-accent hover:underline">전체보기</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 로그인 시 프로필 드롭다운 */}
        {isLoggedIn && (
          <div className="relative" data-profile-dropdown>
            <Button
              unstyled
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-white/5"
            >
              {profile?.avatar_url ? (
                <div className="relative w-7 h-7 rounded-full overflow-hidden ring-2 ring-white/10">
                  <Image
                    src={profile.avatar_url}
                    alt="프로필"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 ring-2 ring-white/10" />
              )}
            </Button>

            {showProfileMenu && (
              <div
                className="absolute right-0 top-11 w-48 bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
                style={{ zIndex: Z_INDEX.dropdown }}
              >
                {/* 프로필 헤더 */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="font-semibold text-sm truncate">{profile?.nickname || "사용자"}</p>
                </div>

                {/* 메뉴 아이템 */}
                <div className="py-1">
                  {PROFILE_MENU_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowProfileMenu(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 no-underline
                        ${pathname.startsWith(item.href) ? "text-accent bg-accent/5" : "text-text-primary"}`}
                    >
                      <item.icon size={16} className="text-text-secondary" />
                      {item.label}
                    </Link>
                  ))}
                </div>

                {/* 로그아웃 */}
                <div className="border-t border-border py-1">
                  <Button
                    unstyled
                    onClick={async () => {
                      const supabase = createClient();
                      await supabase.auth.signOut();
                      window.location.href = "/login";
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 w-full"
                  >
                    <LogOut size={16} />
                    로그아웃
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
