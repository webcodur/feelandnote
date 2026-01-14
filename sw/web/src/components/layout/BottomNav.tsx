/*
  파일명: /components/layout/BottomNav.tsx
  기능: 모바일 하단 네비게이션 바
  책임: 모바일 화면에서 주요 페이지로의 탐색 UI를 제공한다.
*/ // ------------------------------

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Folder,
  Newspaper,
  Gamepad2,
  User,
  MoreHorizontal,
} from "lucide-react";
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
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const navItems = [
    { href: "/archive", icon: <Folder size={20} />, label: "기록관" },
    { href: "/archive/feed", icon: <Newspaper size={20} />, label: "피드" },
    { href: "/archive/lounge", icon: <Gamepad2 size={20} />, label: "휴게실" },
    { href: "/profile", icon: <User size={20} />, label: "마이" },
  ];

  // 더보기에 포함된 경로들 (활성 상태 체크용)
  const moreMenuPaths = [
    "/",
    "/archive/playlists",
    "/archive/explore",
    "/profile/stats",
    "/profile/achievements",
    "/profile/settings",
    "/profile/guestbook",
    "/board/notice",
    "/board/free",
  ];

  const isMoreActive = moreMenuPaths.some((path) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path)
  );

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 h-16 bg-bg-secondary border-t border-border flex items-center md:hidden"
        style={{ zIndex: Z_INDEX.bottomNav }}
      >
        {navItems.map((item) => {
          const isActive = item.href === "/archive"
            ? (pathname === "/archive" || pathname.startsWith("/archive/user/") || /^\/archive\/[^/]+$/.test(pathname))
            : item.href === "/profile"
              ? pathname === "/profile"
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
          icon={<MoreHorizontal size={20} />}
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
        <BottomNavSheet onClose={() => setIsSheetOpen(false)} />
      </BottomSheet>
    </>
  );
}
