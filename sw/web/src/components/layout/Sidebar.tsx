"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Folder,
  Newspaper,
  Compass,
  User,
  Settings,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
}

function NavItem({
  href,
  active,
  children,
  label,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`w-14 h-14 flex flex-col items-center justify-center gap-1 rounded-xl no-underline transition-all duration-200 relative
        ${active ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"}`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-accent rounded-r" />
      )}
      {children}
      <span className="text-[10px] font-semibold">{label}</span>
    </Link>
  );
}

export const SIDEBAR_WIDTH = 80;

export default function Sidebar({ isOpen = true }: SidebarProps) {
  const pathname = usePathname();

  const isArchive = pathname.startsWith("/archive");
  const isFeed = pathname.startsWith("/feed");
  const isPlayground = pathname.startsWith("/playground");
  const isProfile = pathname.startsWith("/profile");

  return (
    <div
      className="fixed top-16 left-0 h-[calc(100vh-64px)] z-50 transition-transform duration-300 ease-in-out"
      style={{
        width: SIDEBAR_WIDTH,
        transform: !isOpen ? `translateX(-${SIDEBAR_WIDTH}px)` : undefined
      }}
    >
      <nav className="w-20 h-full bg-bg-secondary border-r border-border flex flex-col items-center py-6 gap-2">
        <NavItem href="/archive" active={isArchive} label="기록관">
          <Folder size={24} />
        </NavItem>
        <NavItem href="/feed" active={isFeed} label="피드">
          <Newspaper size={24} />
        </NavItem>
        <NavItem href="/playground" active={isPlayground} label="놀이터">
          <Compass size={24} />
        </NavItem>
        <NavItem href="/profile" active={isProfile} label="내 정보">
          <User size={24} />
        </NavItem>

        <div className="mt-auto flex flex-col items-center gap-2">
          <NavItem href="/settings" active={pathname.startsWith("/settings")} label="설정">
            <Settings size={24} />
          </NavItem>
          <button
            className="w-14 h-14 flex flex-col items-center justify-center gap-1 rounded-xl cursor-pointer transition-all duration-200 bg-transparent border-none text-text-secondary hover:bg-white/5 hover:text-text-primary"
            onClick={() => {/* TODO: 로그아웃 처리 */}}
          >
            <LogOut size={24} />
            <span className="text-[10px] font-semibold">로그아웃</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
