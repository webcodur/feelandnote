/*
  파일명: /components/layout/BottomNav.tsx
  기능: 모바일 하단 네비게이션 바
  책임: 모바일 화면에서 주요 페이지로의 탐색 UI를 제공하고, 마지막 칸을 음악 재생기에 내준다.
        보이기·숨기기는 CSS(md:hidden)가 해서 서버 HTML에 처음부터 들어간다.
        음악 재생기·인물 목차 띠가 들어오는 포털 자리는 좁은 화면에서만 내건다 —
        PC에서 숨은 탭에 자리를 걸어 두면 재생기가 그 안으로 들어가 사라진다.
*/ // ------------------------------

"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Z_INDEX } from "@/constants/zIndex";
import { BOTTOM_NAV_ITEMS } from "@/constants/navigation";
import { MEDIA_BELOW_MD } from "@/constants/breakpoints";
import useMediaQuery from "@/hooks/useMediaQuery";
import { LinkPending } from "@/components/ui/pending";
import { setBottomNavDock } from "./bottomNavDock";
import { setMusicNavPanelSlot, setMusicNavTabSlot } from "./musicPlayerSlots";

interface NavItemProps {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}

// 누르는 칸은 탭 하나가 폭 1/5 × 높이 64px 전체다. 현재 탭은 금색, 나머지는 흐린 글자색
function NavItem({ href, active, icon, label }: NavItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex h-16 flex-1 flex-col items-center justify-center gap-1 no-underline ${
        active ? "text-accent" : "text-text-tertiary hover:text-text-primary"
      }`}
    >
      {icon}
      <span className={`text-[11px] leading-none ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
      <LinkPending className="absolute top-2 end-[22%]" />
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const isNarrow = useMediaQuery(MEDIA_BELOW_MD);
  // 홈("/")은 모든 경로의 앞머리라 정확히 일치할 때만 켠다
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    // 고정은 바깥 틀 하나만 한다. 위에 붙는 띠(bottomNavDock)도 이 틀 안에서 함께 움직인다.
    // 틀에 backdrop-filter를 걸지 않는다 — 안쪽 띠의 흐림이 본문을 보지 못하게 된다.
    <div className="fixed inset-x-0 bottom-0 md:hidden" style={{ zIndex: Z_INDEX.bottomNav }}>
      {/* 음악 창이 포털로 들어가는 자리. 이 고정 틀 안에 있어야 창(화면 가운데 모달)이 내비와 같은 층에서 뜬다. 높이가 없어 아래를 가리지 않는다 */}
      <div ref={isNarrow ? setMusicNavPanelSlot : undefined} className="pointer-events-none absolute inset-x-0 bottom-full" />
      <div ref={isNarrow ? setBottomNavDock : undefined} />
      {/* 탭 높이 64px은 그대로 두고, 홈 표시줄·제스처 막대 높이만큼 아래를 더 채운다 */}
      <nav className="flex items-stretch border-t border-line bg-bg-secondary/92 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        {BOTTOM_NAV_ITEMS.map((item) => (
          <NavItem
            key={item.key}
            href={item.href}
            active={isActive(item.href)}
            icon={<item.icon size={22} strokeWidth={1.75} />}
            label={t(item.key)}
          />
        ))}
        {/* 마지막 칸은 음악 재생기가 여는 단추로 채운다 */}
        <div ref={isNarrow ? setMusicNavTabSlot : undefined} className="flex h-16 flex-1" />
      </nav>
    </div>
  );
}
