/*
  파일명: /components/layout/Header.tsx
  기능: 앱 상단 헤더 컴포넌트
  책임: 로고, 1차 네비게이션, 검색, 프로필(알림 포함)을 포함한 헤더 UI를 제공한다.
*/ // ------------------------------

"use client";

import { useState, useEffect } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Wheat } from "lucide-react";
import HeaderSearch from "./HeaderSearch";
import HeaderRecentProfiles from "./HeaderRecentProfiles";
import HeaderProfileMenu from "./HeaderProfileMenu";
import Logo from "@/components/ui/Logo";
import LocaleSwitcher from "@/components/shared/LocaleSwitcher";
import { LinkPending } from "@/components/ui/pending";
import { Z_INDEX } from "@/constants/zIndex";
import useNavigationToTop from "@/hooks/useNavigationToTop";
import { HEADER_NAV_ITEMS, SUPPORT_LINK, activeNavigationHref, isSupportShopAvailable } from "@/constants/navigation";


import { createClient } from "@/lib/db/client";
import { getTitleInfo } from "@/constants/titles";

interface UserProfile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  selected_title: { name: string; grade: string } | null;
}

export default function Header() {
  const pathname = usePathname();
  const t = useTranslations();
  const locale = useLocale();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  useEffect(() => {
    const loadProfile = async () => {
      const db = createClient();
      const { data: { user } } = await db.auth.getUser();
      if (!user) {
        setIsLoggedIn(false);
        return;
      }

      setIsLoggedIn(true);
      const { data: profileData } = await db
        .from("member_profiles")
        .select("id, nickname, avatar_url, selected_title")
        .eq("id", user.id)
        .single();
      if (profileData) {
        setProfile({
          id: profileData.id,
          nickname: profileData.nickname || "User",
          avatar_url: profileData.avatar_url,
          selected_title: getTitleInfo(profileData.selected_title),
        });
      }
    };
    loadProfile();
  }, []);

  const activeHref = activeNavigationHref(pathname);
  const navigateToTop = useNavigationToTop();

  return (
    // 좌우 여백은 노치가 있는 가로 화면에서 안전 영역만큼 더 들어간다(viewport-fit=cover)
    <header
      className="fixed top-0 start-0 flex h-16 w-full items-center border-b border-line bg-bg-secondary/90 backdrop-blur-md pl-[max(12px,env(safe-area-inset-left))] pr-[max(12px,env(safe-area-inset-right))] md:pl-[max(24px,env(safe-area-inset-left))] md:pr-[max(24px,env(safe-area-inset-right))] xl:pl-[max(40px,env(safe-area-inset-left))] xl:pr-[max(40px,env(safe-area-inset-right))]"
      style={{ zIndex: Z_INDEX.header }}
    >
      <div className="relative flex w-full min-w-0 items-center gap-2 md:gap-6">
        <div className="shrink-0 md:translate-y-[2px]">
          <Logo size="md" />
        </div>

        {/* 1차 네비게이션 (데스크톱) — 현재 위치는 금색 밑줄 하나로만 알린다 */}
        <nav className="hidden h-16 items-stretch gap-1 md:flex">
          {HEADER_NAV_ITEMS.map((item) => {
            const href = item.href.includes("{userId}")
              ? (profile ? item.href.replace("{userId}", profile.id) : "/login")
              : item.href;
            const isActive = item.href.includes("{userId}")
              ? profile ? pathname.startsWith(`/${profile.id}`) : false
              : activeHref === item.href;

            return (
              <Link
                key={item.key}
                href={href}
                onNavigate={() => navigateToTop(href)}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex items-center px-3 text-[15px] no-underline outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
                  isActive
                    ? "font-semibold text-text-primary shadow-[inset_0_-2px_0_var(--color-accent)]"
                    : "font-medium text-text-secondary hover:text-text-primary"
                }`}
              >
                {t(`nav.${item.key}`)}
                <LinkPending className="absolute top-3 end-1" />
              </Link>
            );
          })}
        </nav>

        <HeaderSearch />

        {/* 우측 영역 */}
        <div className="flex items-center gap-0.5 sm:gap-1 ms-auto shrink-0">
          {isSupportShopAvailable(locale) && <Link
            href={SUPPORT_LINK.href}
            onNavigate={() => navigateToTop(SUPPORT_LINK.href)}
            aria-label={t("nav.footer.support")}
            title={t("nav.footer.support")}
            aria-current={pathname === SUPPORT_LINK.href ? "page" : undefined}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2 text-sm hover:bg-white/5 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${pathname === SUPPORT_LINK.href ? "text-accent" : "text-text-secondary"}`}
          >
            <Wheat size={18} strokeWidth={1.5} aria-hidden="true" />
          </Link>}

          {/* 최근 방문 (모바일만 — 데스크톱은 좌측 중앙 패널이 쥔다) */}
          <HeaderRecentProfiles />

          {/* 언어 전환 (데스크톱) */}
          <LocaleSwitcher variant="icon" />

          {/* 프로필 메뉴 — 알림은 메뉴 안에 있다 (로그인 여부 확인 후 표시) */}
          {isLoggedIn !== null && (
            <HeaderProfileMenu profile={profile} isLoggedIn={isLoggedIn} />
          )}
        </div>
      </div>
    </header>
  );
}
