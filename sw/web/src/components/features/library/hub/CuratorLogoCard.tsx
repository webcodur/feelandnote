"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CuratedHub } from "@/actions/library/types";
import { getCuratorBrand } from "../curated/curatorBrandPalettes";
import { getCuratorLogoUrl } from "../curated/curatorLogos";

export default function CuratorLogoCard({ curator, query, onSelect }: { curator: CuratedHub["curators"][number]; query: string; onSelect: () => void }) {
  const t = useTranslations("library.curated");
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const brand = getCuratorBrand(curator.slug, curator.kind);
  const logoUrl = getCuratorLogoUrl(curator.slug, curator.logoUrl);
  return (
    <Link href={`/explore/works/curated/${curator.slug}${query}`} prefetch={false} title={curator.name} aria-haspopup="dialog" onClick={event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); onSelect();
    }} className="group flex min-w-0 flex-col outline-none">
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-bg-card group-hover:ring-1 group-hover:ring-accent/70 group-focus-visible:ring-2 group-focus-visible:ring-accent">
        {logoUrl && logoUrl !== failedLogo ? (
          <Image src={logoUrl} alt="" fill sizes="(min-width: 1280px) 150px, (min-width: 768px) 20vw, 32vw" className="object-contain" onError={() => setFailedLogo(logoUrl)} />
        ) : <span className="flex h-full items-center justify-center px-2 text-center font-serif text-2xl font-bold" style={{ color: brand.primary }}>{brand.monogram.slice(0, 4)}</span>}
      </div>
      <div className="px-0.5 pb-2 pt-2 text-center">
        <h3 className="line-clamp-2 min-h-9 break-keep text-xs font-semibold leading-[18px] text-text-primary group-hover:text-accent md:min-h-10 md:text-sm md:leading-5">{curator.name}</h3>
        <p className="mt-1 truncate text-[10px] text-text-secondary md:text-xs">{t(`kind.${curator.kind}`)}</p>
        <p className="mt-0.5 text-[10px] tabular-nums text-text-secondary md:text-xs">{t("listCount", { count: curator.lists.length })}</p>
      </div>
    </Link>
  );
}
