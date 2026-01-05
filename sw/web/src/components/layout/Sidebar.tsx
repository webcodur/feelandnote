"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Folder,
  ListMusic,
  Compass,
  Newspaper,
  Gamepad2,
  BarChart2,
  Trophy,
  Settings,
  BookOpen,
  Megaphone,
  MessageSquare,
  Info,
  LucideIcon,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Z_INDEX } from "@/constants/zIndex";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "기록관",
    defaultOpen: true,
    items: [
      { href: "/archive", label: "내 기록관", icon: Folder },
      { href: "/archive/playlists", label: "재생목록", icon: ListMusic },
      { href: "/archive/explore", label: "탐색", icon: Compass },
      { href: "/archive/feed", label: "피드", icon: Newspaper },
      { href: "/archive/playground", label: "놀이터", icon: Gamepad2 },
    ],
  },
  {
    title: "마이페이지",
    defaultOpen: true,
    items: [
      { href: "/profile/stats", label: "통계", icon: BarChart2 },
      { href: "/profile/achievements", label: "업적", icon: Trophy },
      { href: "/profile/settings", label: "설정", icon: Settings },
      { href: "/profile/guestbook", label: "방명록", icon: BookOpen },
    ],
  },
  {
    title: "게시판",
    defaultOpen: false,
    items: [
      { href: "/board/notice", label: "공지사항", icon: Megaphone },
      { href: "/board/free", label: "자유게시판", icon: MessageSquare },
    ],
  },
  {
    title: "about us",
    defaultOpen: false,
    items: [
      { href: "/about", label: "회사 소개", icon: Info },
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
}

function NavItemLink({
  href,
  active,
  icon: Icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium no-underline
        ${active ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"}`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
}

function NavSectionComponent({ section, pathname }: { section: NavSection; pathname: string }) {
  const [isOpen, setIsOpen] = useState(section.defaultOpen ?? true);
  const hasActiveItem = section.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-text-tertiary uppercase tracking-wider hover:text-text-secondary"
      >
        <span>{section.title}</span>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {isOpen && (
        <div className="mt-1 space-y-0.5">
          {section.items.map((item) => (
            <NavItemLink
              key={item.href}
              href={item.href}
              active={pathname === item.href || (item.href !== "/archive" && pathname.startsWith(item.href + "/")) || (item.href === "/archive" && (pathname === "/archive" || pathname.startsWith("/archive/user/")))}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </div>
      )}

      {!isOpen && hasActiveItem && (
        <div className="mt-1 space-y-0.5">
          {section.items.filter((item) => pathname === item.href || pathname.startsWith(item.href + "/")).map((item) => (
            <NavItemLink
              key={item.href}
              href={item.href}
              active
              icon={item.icon}
              label={item.label}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const SIDEBAR_WIDTH = 200;

export default function Sidebar({ isOpen = true }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div
      className="fixed top-16 left-0 h-[calc(100vh-64px)]"
      style={{
        width: SIDEBAR_WIDTH,
        transform: !isOpen ? `translateX(-${SIDEBAR_WIDTH}px)` : undefined,
        zIndex: Z_INDEX.sidebar,
      }}
    >
      <nav className="w-full h-full bg-bg-secondary border-r border-border flex flex-col py-4 px-2 overflow-y-auto scrollbar-thin">
        {NAV_SECTIONS.map((section) => (
          <NavSectionComponent key={section.title} section={section} pathname={pathname} />
        ))}
      </nav>
    </div>
  );
}
