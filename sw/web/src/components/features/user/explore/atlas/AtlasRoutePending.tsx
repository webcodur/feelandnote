"use client";

import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Ghost, SkeletonFrame } from "../hub/ExploreSkeleton";
import { atlasPageOwnsTitle } from "../myth/mythHref";
import { MYTH_LAYOUT as layout } from "../myth/mythLayout";
import type { AtlasWorld } from "../myth/atlasNavigationData";
import AtlasScreenSkeleton from "./AtlasScreenSkeleton";

export default function AtlasRoutePending({ mode }: { mode: AtlasWorld }) {
  const pathname = usePathname();
  const t = useTranslations("common");
  if (atlasPageOwnsTitle(pathname)) return <AtlasScreenSkeleton mode={mode} />;
  return <SkeletonFrame label={t("loading")} className={layout.shell}>
    <div className="mx-auto max-w-3xl space-y-5 py-8"><Ghost className="h-5 w-24" /><Ghost className="h-12 w-full rounded-control" /><div className="flex flex-wrap justify-center gap-2">{Array.from({ length: 6 }, (_, i) => <Ghost key={i} className="h-10 w-20 rounded-full" />)}</div></div>
    <div className={`${layout.catalogGrid} py-12`}>{Array.from({ length: 6 }, (_, i) => <div key={i} className="overflow-hidden rounded-xl border border-line-strong"><Ghost className="aspect-[16/10] w-full" /><div className="space-y-3 p-5"><Ghost className="h-6 w-2/3" /><Ghost className="h-4 w-full" /><Ghost className="h-4 w-10" /></div></div>)}</div>
  </SkeletonFrame>;
}
