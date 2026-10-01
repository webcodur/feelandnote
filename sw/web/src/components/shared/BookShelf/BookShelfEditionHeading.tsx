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
  const titleClass = "break-words text-xl font-bold leading-snug tracking-tight text-text-primary sm:text-2xl";
  return (
    <>
      <h3 className={titleClass}>{edition.title}</h3>
      {(edition.creator || source.creator) && <p className="mt-2 text-sm leading-relaxed text-text-secondary">{edition.creator || source.creator}</p>}
      {omnibus && <p title={t("sourceEditionOmnibusHint")} className="mt-2 text-xs text-text-secondary">{t("sourceEditionOmnibus")}</p>}
    </>
  );
}
