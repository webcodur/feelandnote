/*
  파일명: /components/layout/BottomNav.tsx
  기능: 모바일 하단 네비게이션 바
  책임: 모바일 화면에서 주요 페이지로의 탐색 UI를 제공한다.
*/ // ------------------------------

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  PantheonIcon,
  AstrolabeIcon,
  MosaicCoinIcon,
  BustIcon,
  MoreIcon,
} from "@/components/ui/icons/neo-pantheon";
import { Z_INDEX } from "@/constants/zIndex";
import BottomSheet from "@/components/ui/BottomSheet";
import BottomNavSheet from "./BottomNavSheet";

interface NavItemProps {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}

function NavItem({ href, active, icon, label }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-0.5 py-2 flex-1 no-underline
        ${active ? "text-accent" : "text-text-secondary"}`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

interface NavButtonProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function NavButton({ active, icon, label, onClick }: NavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 py-2 flex-1 bg-transparent border-none cursor-pointer
        ${active ? "text-accent" : "text-text-secondary"}`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
        // Simple client-side check or use a context if available
        // For now, importing createClient from client
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setProfileId(user.id);
        }
    };
    loadProfile();
  }, []);

  const navItems = [
    { href: "/", icon: <PantheonIcon size={20} />, label: "피드" },
    { href: "/explore", icon: <AstrolabeIcon size={20} />, label: "탐색" },
    { href: "/play", icon: <MosaicCoinIcon size={20} />, label: "휴게실" },
    { href: profileId ? `/${profileId}` : "/login", icon: <BustIcon size={20} />, label: "마이" },
  ];

  // 더보기에 포함된 경로들 (활성 상태 체크용)
  const moreMenuPaths = [
    "/board/notice",
    "/board/free",
  ];

  const isMoreActive = moreMenuPaths.some((path) => pathname.startsWith(path));

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 h-16 bg-bg-secondary border-t border-border flex items-center md:hidden"
        style={{ zIndex: Z_INDEX.bottomNav }}
      >
        {navItems.map((item) => {
          const isActive = item.href === "/" 
            ? pathname === "/" 
            : pathname.startsWith(item.href);
          
          return (
            <NavItem
              key={item.href}
              href={item.href}
              active={isActive}
              icon={item.icon}
              label={item.label}
            />
          );
        })}

        {/* 더보기 버튼 */}
        <NavButton
          active={isMoreActive}
          icon={<MoreIcon size={20} />}
          label="더보기"
          onClick={() => setIsSheetOpen(true)}
        />
      </nav>

      {/* 더보기 시트 */}
      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="메뉴"
      >
        <BottomNavSheet onClose={() => setIsSheetOpen(false)} userId={profileId} />
      </BottomSheet>
    </>
  );
}
