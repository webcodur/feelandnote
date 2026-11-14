"use client";

import { Images, Users } from "lucide-react";
import { useTranslations } from "next-intl";

export default function AtlasEntryStats({ members, images, className = "" }: { members?: number; images?: number; className?: string }) {
  const t = useTranslations("explore.atlasCatalog");
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums text-text-secondary ${className}`}>
      {members !== undefined && <span data-atlas-person-count title={t("members", { count: members })} className="inline-flex items-center gap-1 whitespace-nowrap">
        <Users size={13} aria-hidden /><span aria-hidden>{members}</span><span className="sr-only">{t("members", { count: members })}</span>
      </span>}
      {images !== undefined && <span data-atlas-image-count={images} title={t("images", { count: images })} className="inline-flex items-center gap-1 whitespace-nowrap">
        <Images size={13} aria-hidden /><span aria-hidden>{images}</span><span className="sr-only">{t("images", { count: images })}</span>
      </span>}
    </span>
  );
}
