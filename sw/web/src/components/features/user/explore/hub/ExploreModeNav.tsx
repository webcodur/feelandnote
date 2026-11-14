"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EXPLORE_MODES, type ExploreMode } from "@/constants/exploreModes";
import { useRecentHistory } from "@/hooks/useRecentHistory";
import { useAtlasCatalogPreferences } from "@/hooks/useAtlasCatalogPreferences";
import { exploreModeResumeHref } from "@/lib/exploreModeResume";
import LinkPending from "@/components/ui/pending/LinkPending";

const subscribeHydration = () => () => {};
const browserReady = () => true;
const serverReady = () => false;

export default function ExploreModeNav({ mode }: { mode: ExploreMode }) {
  const t = useTranslations("nav.modes");
  const hydrated = useSyncExternalStore(subscribeHydration, browserReady, serverReady);
  const myths = useRecentHistory(null, "myth");
  const factions = useRecentHistory(null, "faction");
  const mythCatalog = useAtlasCatalogPreferences("myth");
  const factionCatalog = useAtlasCatalogPreferences("faction");
  const href = (key: ExploreMode) => exploreModeResumeHref(key, key === "myth" ? myths : factions,
    hydrated ? document.cookie : "", key === "myth" ? mythCatalog : factionCatalog);
  const baseClass = "relative flex min-h-12 items-center justify-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold outline-none hover:bg-accent/5 hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent";
  return (
    <nav aria-label={t("explore")} data-explore-modes
      className="mx-auto mb-6 grid w-full max-w-[420px] grid-cols-3 border-b border-line-strong md:mb-8">
      {EXPLORE_MODES.map(key => key === mode ? (
        <span key={key} aria-current="page" data-explore-mode={key} className={`${baseClass} border-accent text-accent`}>{t(key)}</span>
      ) : (
        <Link key={key} href={href(key)} prefetch={false} scroll={false} data-explore-mode={key}
          className={`${baseClass} border-transparent text-text-secondary`}>{t(key)}<LinkPending /></Link>
      ))}
    </nav>
  );
}
