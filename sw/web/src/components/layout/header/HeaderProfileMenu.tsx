"use client";

import { useState, useEffect } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { ChevronRight, CircleUserRound } from "lucide-react";
import { RomanGateIcon, BustIcon, TempleBellIcon, SacredFlameIcon, MessageTabletIcon, ScrollIcon, LaurelIcon } from "@/components/ui/icons/neo-pantheon";
import Button from "@/components/ui/Button";
import { TitleBadge, type TitleInfo } from "@/components/ui";
import { Z_INDEX } from "@/constants/zIndex";
import { createClient } from "@/lib/db/client";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS } from "date-fns/locale";
import { useHeaderNotifications, type HeaderNotification } from "./useHeaderNotifications";

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

// 머리 단추와 메뉴 속 프로필 칸이 같은 얼굴을 크기만 달리해 쓴다
function ProfileAvatar({ url, alt, className }: { url: string | null | undefined; alt: string; className: string }) {
  return url ? (
    <div className={`relative shrink-0 overflow-hidden rounded-full ring-2 ring-white/10 ${className}`}>
      <Image src={url} alt={alt} fill unoptimized className="object-cover" />
    </div>
  ) : (
    <div className={`shrink-0 rounded-full bg-gradient-to-br from-stone-600 to-stone-400 ring-2 ring-white/10 ${className}`} />
  );
}

export default function HeaderProfileMenu({ profile, isLoggedIn = true }: HeaderProfileMenuProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const t = useTranslations("layout.profile");
  const tNotif = useTranslations("layout.notifications");
  const locale = useLocale();
  const router = useRouter();
  const { notifications, unreadCount, loading, markRead, markAllRead } = useHeaderNotifications();

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
    const db = createClient();
    await db.auth.signOut();
    window.location.href = "/login";
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "like": return <SacredFlameIcon size={14} />;
      case "comment": return <MessageTabletIcon size={14} />;
      case "follow": return <BustIcon size={14} />;
      case "achievement": return <LaurelIcon size={14} />;
      case "guestbook": return <ScrollIcon size={14} />;
      default: return <TempleBellIcon size={14} />;
    }
  };

  const notifTime = (createdAt: string | null) => {
    if (!createdAt) return "";
    return formatDistanceToNow(new Date(createdAt), {
      addSuffix: true,
      locale: locale === "ko" ? ko : enUS,
    });
  };

  const handleNotifClick = (notif: HeaderNotification) => {
    void markRead(notif);
    setShowDropdown(false);
    if (notif.link) router.push(notif.link);
  };

  // 비로그인 상태
  if (!isLoggedIn) {
    return (
      <div className="relative" data-profile-dropdown>
        <Button unstyled onClick={() => setShowDropdown(!showDropdown)} aria-label={t("login")} className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-white/5">
          <CircleUserRound size={28} strokeWidth={1.5} className="text-text-secondary hover:text-text-primary" />
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
            </div>
          </div>
        )}
      </div>
    );
  }

  // 로그인 상태
  return (
    <div className="relative" data-profile-dropdown>
      <Button unstyled onClick={() => setShowDropdown(!showDropdown)} aria-label={tNotif("title")} className="relative flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-white/5">
        <ProfileAvatar url={profile?.avatar_url} alt={t("avatar")} className="w-7 h-7" />
        {unreadCount > 0 && (
          <span className="absolute top-0 end-0 w-2.5 h-2.5 rounded-full bg-accent border-2 border-black" />
        )}
      </Button>

      {showDropdown && (
        <div className="absolute end-0 top-11 w-72 max-w-[calc(100vw-24px)] bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden" style={{ zIndex: Z_INDEX.dropdown }}>
          {/* 프로필 — 누르면 내 페이지로 간다. 휴대폰에서도 내 페이지 입구는 여기 하나다 */}
          {profile ? (
            <Link
              href={`/${profile.id}`}
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-3 px-4 py-3 border-b border-border no-underline text-text-primary hover:bg-white/5"
            >
              <ProfileAvatar url={profile.avatar_url} alt={t("avatar")} className="w-9 h-9" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{profile.nickname || t("defaultName")}</p>
                  <TitleBadge title={profile.selected_title ?? null} size="sm" />
                </div>
                <p className="mt-0.5 text-xs text-text-secondary">{t("myPage")}</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-text-secondary" />
            </Link>
          ) : (
            <div className="px-4 py-3 border-b border-border">
              <p className="font-semibold text-sm truncate">{t("defaultName")}</p>
            </div>
          )}

          {/* 알림 */}
          <div className="border-b border-border py-1">
            <div className="flex items-center justify-between px-4 py-1.5">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <TempleBellIcon size={14} className="text-text-secondary" />
                {tNotif("title")}
                {unreadCount > 0 && (
                  <span className="text-accent font-medium">{tNotif("newCount", { count: unreadCount })}</span>
                )}
              </span>
              {unreadCount > 0 && (
                <Button unstyled onClick={() => void markAllRead()} className="text-[11px] text-text-secondary hover:text-text-primary">
                  {tNotif("markAllRead")}
                </Button>
              )}
            </div>
            <div className="max-h-60 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-5 text-center text-text-secondary text-xs">{tNotif("loading")}</div>
              ) : notifications.length > 0 ? (
                notifications.slice(0, 7).map((notif) => (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => handleNotifClick(notif)}
                    className={`w-full px-4 py-2.5 flex gap-2.5 hover:bg-white/5 text-left ${!notif.is_read ? "bg-accent/5" : ""}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${!notif.is_read ? "bg-accent/20 text-accent" : "bg-bg-secondary text-text-secondary"}`}>
                      {getNotifIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] leading-snug line-clamp-2 ${!notif.is_read ? "text-text-primary font-medium" : "text-text-secondary"}`}>
                        {notif.message}
                      </p>
                      <p className="text-[11px] text-text-tertiary mt-0.5">{notifTime(notif.created_at)}</p>
                    </div>
                    {!notif.is_read && <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" />}
                  </button>
                ))
              ) : (
                <div className="px-4 py-5 text-center text-text-secondary text-xs">{tNotif("empty")}</div>
              )}
            </div>
            {notifications.length > 0 && (
              <Link
                href="/notifications"
                onClick={() => setShowDropdown(false)}
                className="block text-center text-xs text-accent hover:underline decoration-accent/50 underline-offset-2 font-medium px-4 py-2 border-t border-border/40 no-underline"
              >
                {tNotif("viewAll")}
              </Link>
            )}
          </div>

          {/* 로그아웃 */}
          <div className="py-1">
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
