/*
  파일명: /components/layout/BottomNavSheet.tsx
  기능: 더보기 메뉴 시트 내용
  책임: 바텀 네비에 포함되지 않은 메뉴들을 그룹화하여 표시한다.
*/ // ------------------------------

"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Home,
  ListMusic,
  Compass,
  BookOpen,
  Megaphone,
  MessageSquarePlus,
  LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface BottomNavSheetProps {
  onClose: () => void;
  userId: string | null;
}

export default function BottomNavSheet({ onClose, userId }: BottomNavSheetProps) {
  const pathname = usePathname();
  const t = useTranslations("moreMenu");

  const navSections: NavSection[] = [
    {
      title: t("shortcuts"),
      items: [
        { href: "/", label: t("home"), icon: Home },
        { href: userId ? `/${userId}/reading/collections` : "/login", label: t("playlists"), icon: ListMusic },
        { href: "/explore", label: t("explore"), icon: Compass },
        { href: "/library", label: t("scriptures"), icon: BookOpen },
      ],
    },
    {
      title: t("board"),
      items: [
        { href: "/agora/board/notice", label: t("notice"), icon: Megaphone },
        { href: "/agora/board/feedback", label: t("feedback"), icon: MessageSquarePlus },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="p-4 pb-8 space-y-4">
      {navSections.map((section) => (
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
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
