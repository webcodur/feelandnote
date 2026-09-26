"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { EXPLORE_MODES } from "@/constants/navigation";
import { EXPLORE_NAV_LAYOUT as layout } from "./exploreNavLayout";

export default function ExploreModeTabs() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const worksPath = EXPLORE_MODES[1].href;
  const activeMode = pathname === worksPath || pathname.startsWith(`${worksPath}/`) ? "works" : "figures";

  return (
    <nav aria-label={t("explore")} className="mb-6 flex justify-center gap-2">
      {EXPLORE_MODES.map((mode) => (
        <Link
          key={mode.key}
          href={mode.href}
          prefetch={false}
          aria-current={mode.key === activeMode ? "page" : undefined}
          className={`${layout.chip} ${layout.pill} min-w-24 !h-10 !px-5 outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            mode.key === activeMode ? `${layout.chipSelected} hover:bg-accent/20` : layout.chipIdle.pill
          }`}
        >
          {t(`modes.${mode.key}`)}
        </Link>
      ))}
    </nav>
  );
}
