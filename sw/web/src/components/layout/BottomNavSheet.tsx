/*
  파일명: /components/layout/BottomNavSheet.tsx
  기능: 더보기 메뉴 시트 내용
  책임: 바텀 네비에 포함되지 않은 메뉴들을 그룹화하여 표시한다.
*/ // ------------------------------

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ListMusic,
  Compass,
  BarChart2,
  Trophy,
  Settings,
  BookOpen,
  Megaphone,
  MessageSquare,
  LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getUnreadGuestbookCount } from "@/actions/guestbook";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "기록관",
    items: [
      { href: "/", label: "홈", icon: Home },
      { href: "/archive/playlists", label: "재생목록", icon: ListMusic },
      { href: "/archive/explore", label: "탐색", icon: Compass },
    ],
  },
  {
    title: "마이페이지",
    items: [
      { href: "/profile/stats", label: "통계", icon: BarChart2 },
      { href: "/profile/achievements", label: "업적", icon: Trophy },
      { href: "/profile/settings", label: "설정", icon: Settings },
      { href: "/profile/guestbook", label: "방명록", icon: BookOpen },
    ],
  },
  {
    title: "게시판",
    items: [
      { href: "/board/notice", label: "공지사항", icon: Megaphone },
      { href: "/board/free", label: "자유게시판", icon: MessageSquare },
    ],
  },
];

interface BottomNavSheetProps {
  onClose: () => void;
}

export default function BottomNavSheet({ onClose }: BottomNavSheetProps) {
  const pathname = usePathname();
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchBadges = async () => {
      const unreadCount = await getUnreadGuestbookCount();
      setBadges({ "/profile/guestbook": unreadCount });
    };
    fetchBadges();
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="p-4 pb-8 space-y-4">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          {/* 섹션 헤더 */}
          <div className="px-3 py-2 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
            {section.title}
          </div>

          {/* 메뉴 항목들 */}
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const badge = badges[item.href];

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium no-underline
                    ${active ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"}`}
                >
                  <Icon size={20} />
                  <span className="flex-1">{item.label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span className="min-w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1.5">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
