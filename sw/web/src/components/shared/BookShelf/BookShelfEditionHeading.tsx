"use client";

import { useTranslations } from "next-intl";
import type { BookShelfBook } from "./types";

export default function BookShelfEditionHeading({ source, edition, sharedEditionKeys }: {
  source: BookShelfBook; edition: { id?: number; title: string; creator: string | null; isbn?: string | null };
  sharedEditionKeys?: ReadonlySet<string>;
}) {
  const t = useTranslations("celebPage");
  const editionKey = edition.isbn?.trim() || "title:" + edition.title.trim().toLowerCase();
  const omnibus = sharedEditionKeys?.has(editionKey);
  const hasEditionTitle = edition.title.trim() !== source.title.trim();
  const hasEditionCreator = edition.creator && edition.creator !== source.creator;
  if (!hasEditionTitle && !hasEditionCreator && !omnibus) return null;
  return (
    <div className="mb-3 text-sm leading-relaxed text-text-secondary">
      {hasEditionTitle && <p className="font-semibold text-text-primary">{edition.title}</p>}
      {hasEditionCreator && <p>{edition.creator?.replace(/\^/g, ', ')}</p>}
      {omnibus && <p title={t("sourceEditionOmnibusHint")} className="mt-1 text-xs">{t("sourceEditionOmnibus")}</p>}
    </div>
  );
}
