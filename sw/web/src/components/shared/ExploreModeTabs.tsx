"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { EXPLORE_MODES } from "@/constants/navigation";
import { EXPLORE_LIST_TOP_ID } from "@/constants/exploreLenses";
import { cn } from "@/lib/utils";

/*
  탐색의 인물 | 작품 전환. 화면(주소)을 바꾸는 이동이라 헤더 메뉴와 같은 문법 — 글자 탭 + 현재 탭 금색 밑줄 — 을 쓴다.
  아래 검색 조작(채운 상자·칩)과 모양이 겹치지 않아야 "화면을 바꾸는 것"과 "목록을 거르는 것"이 갈린다.
  밑줄은 탭 줄 아래 헤어라인 위에 얹힌다.
*/
export default function ExploreModeTabs({ className }: { className?: string } = {}) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const worksPath = EXPLORE_MODES[1].href;
  const activeMode = pathname === worksPath || pathname.startsWith(`${worksPath}/`) ? "works" : "figures";

  // 아래 안내 구획의 「인물별 보기 ↑」가 이 자리로 돌아온다 — 고정 머리글에 탭이 가리지 않게 여백을 둔다
  return (
    <nav id={EXPLORE_LIST_TOP_ID} aria-label={t("explore")} className={cn("mx-auto mb-4 grid w-full max-w-xs scroll-mt-[calc(var(--layer-header-h)+1rem)] grid-cols-2 border-b border-line md:mb-5", className)}>
      {EXPLORE_MODES.map((mode) => {
        const isActive = mode.key === activeMode;
        return (
          <Link
            key={mode.key}
            href={mode.href}
            prefetch={false}
            aria-current={isActive ? "page" : undefined}
            className={`-mb-px flex min-h-12 items-center justify-center border-b-2 px-5 text-base outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isActive
                ? "border-accent font-semibold text-text-primary"
                : "border-transparent font-medium text-text-secondary hover:border-line-strong hover:text-text-primary"
            }`}
          >
            {t(`modes.${mode.key}`)}
          </Link>
        );
      })}
    </nav>
  );
}
