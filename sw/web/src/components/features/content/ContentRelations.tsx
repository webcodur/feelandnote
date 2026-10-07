"use client";

import { useTranslations } from "next-intl";
import type { FigureBookCharacter } from "@/actions/figure-books/getFigureBooks";
import type { ContentCuratedEntry } from "@/actions/library/types";
import ContentDetailSection from "./ContentDetailSection";
import FigureBookCharactersSection from "./FigureBookCharactersSection";
import CuratedEntriesSection from "./CuratedEntriesSection";

const BADGE = "rounded-full border border-accent/20 bg-accent/[0.06] px-2 py-0.5 text-[11px] text-accent";

export function ContentCharacters({ characters }: { characters: FigureBookCharacter[] }) {
  const t = useTranslations("contentDetail");
  if (!characters.length) return null;
  return <ContentDetailSection id="work-characters" title={t("fictionCharacters")}
    headerActions={<span className={BADGE}>{t("fictionCharactersCount", { count: characters.length })}</span>}>
    <FigureBookCharactersSection characters={characters} />
  </ContentDetailSection>;
}

export function ContentCurated({ entries }: { entries: ContentCuratedEntry[] }) {
  const t = useTranslations("library.curated");
  if (!entries.length) return null;
  return <ContentDetailSection id="work-curated" title={t("onContent.title")}
    headerActions={<span className={BADGE}>{t("onContent.badge", { count: entries.length })}</span>}>
    <CuratedEntriesSection entries={entries} />
  </ContentDetailSection>;
}
