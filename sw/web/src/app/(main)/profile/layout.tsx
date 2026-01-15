/*
  파일명: /app/(main)/profile/layout.tsx
  기능: 마이페이지 레이아웃
  책임: 마이페이지 탭 네비게이션을 제공한다.
*/ // ------------------------------

"use client";

import { usePathname } from "next/navigation";
import { Tabs, LinkTab } from "@/components/ui/Tab";

const PROFILE_TABS = [
  { href: "/profile/stats", label: "통계" },
  { href: "/profile/achievements", label: "업적" },
  { href: "/profile/guestbook", label: "방명록" },
  { href: "/profile/settings", label: "설정" },
];

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 탭 네비게이션 */}
      <Tabs>
        {PROFILE_TABS.map((tab) => (
          <LinkTab
            key={tab.href}
            href={tab.href}
            label={tab.label}
            active={isActive(tab.href)}
          />
        ))}
      </Tabs>

      {/* 탭 콘텐츠 */}
      <div>{children}</div>
    </div>
  );
}
