"use client";

import Image from "next/image";
import { ArrowUpRight, List } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Modal from "@/components/ui/Modal";
import type { CuratedHub } from "@/actions/library/types";
import { getCuratorLogoUrl } from "../curated/curatorLogos";
import { getCountryNameByLocale } from "@/lib/countries";

export default function CuratorPreviewModal({ curator, query, onClose }: { curator: CuratedHub["curators"][number]; query: string; onClose: () => void }) {
  const t = useTranslations("library.hub");
  const tc = useTranslations("library.curated");
  const locale = useLocale();
  const logoUrl = getCuratorLogoUrl(curator.slug, curator.logoUrl);
  const href = `/explore/works/curated/${curator.slug}${query}`;
  return (
    <Modal isOpen onClose={onClose} title={curator.name} size="lg" stickyHeader animateHeight={false}>
      <div className="space-y-4 p-4 sm:p-6">
        <Link href={href} prefetch={false} aria-label={t("viewInstitution")}
          className="group flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-accent/5 outline-none focus-visible:ring-2 focus-visible:ring-accent">
          {logoUrl && <div className="relative size-16 shrink-0 overflow-hidden rounded-md"><Image src={logoUrl} alt="" fill sizes="64px" className="object-contain" /></div>}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-bold leading-snug text-text-primary group-hover:text-accent">{curator.name}</h3>
              <ArrowUpRight size={15} aria-hidden className="mt-0.5 shrink-0 text-text-secondary group-hover:text-accent" />
            </div>
            <p className="text-xs text-accent">{[
              tc(`kind.${curator.kind}`),
              curator.country ? getCountryNameByLocale(curator.country, locale) : null,
              tc("listCount", { count: curator.lists.length }),
            ].filter(Boolean).join(" · ")}</p>
            {curator.description && <p className="line-clamp-4 text-sm leading-relaxed text-text-secondary">{curator.description}</p>}
          </div>
        </Link>
        <div className="ms-1 space-y-2 border-s border-white/10 ps-3">{curator.lists.map(list => (
          <Link key={list.slug} href={`/explore/works/curated/${curator.slug}/${list.slug}`} prefetch={false}
            className="group flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 hover:border-accent/40 hover:bg-accent/5 outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-sm bg-white/5">
              {list.covers[0] ? <Image src={list.covers[0]} alt="" fill sizes="48px" className="object-cover" /> : <List size={20} aria-hidden className="m-auto h-full text-text-secondary" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold leading-snug text-text-primary group-hover:text-accent">{list.title}</h3>
                <ArrowUpRight size={14} aria-hidden className="shrink-0 text-text-secondary group-hover:text-accent" />
              </div>
              <p className="mt-1 text-xs tabular-nums text-accent">{tc("itemCount", { count: list.itemCount })}</p>
              {list.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary">{list.description}</p>}
            </div>
          </Link>
        ))}</div>
      </div>
    </Modal>
  );
}
