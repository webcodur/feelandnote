/*
  파일명: /app/(main)/archive/layout.tsx
  기능: 기록관 레이아웃
  책임: 기록관 탭 네비게이션을 제공한다. (피드/휴게실 제외)
*/ // ------------------------------

"use client";

import { usePathname } from "next/navigation";
import { Tabs, LinkTab } from "@/components/ui/Tab";

const ARCHIVE_TABS = [
  { href: "/archive", label: "내 기록" },
  { href: "/archive/playlists", label: "재생목록" },
  { href: "/archive/explore", label: "탐색" },
];

export default function ArchiveLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // 피드, 휴게실은 1차 네비 독립 페이지이므로 탭 UI 미적용
  if (pathname.startsWith("/archive/feed") || pathname.startsWith("/archive/lounge")) {
    return <>{children}</>;
  }

  // 콘텐츠 상세 페이지 (/archive/[id])도 탭 UI 미적용
  // /archive/user/로 시작하지 않고, /archive/playlists, /archive/explore도 아닌 경우
  const isContentDetail = /^\/archive\/[^/]+$/.test(pathname) &&
    !pathname.startsWith("/archive/user") &&
    pathname !== "/archive/playlists" &&
    pathname !== "/archive/explore";

  if (isContentDetail) {
    return <>{children}</>;
  }

  // 활성 탭 확인
  const isActive = (href: string) => {
    if (href === "/archive") {
      return pathname === "/archive" || pathname.startsWith("/archive/user/");
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 탭 네비게이션 */}
      <Tabs>
        {ARCHIVE_TABS.map((tab) => (
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
