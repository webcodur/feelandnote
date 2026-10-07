"use client";

import { useTranslations } from "next-intl";
import type { FigureBookCharacter } from "@/actions/figure-books/getFigureBooks";
import type { ContentCuratedEntry } from "@/actions/library/types";
import AccordionSection from "./AccordionSection";
import FigureBookCharactersSection from "./FigureBookCharactersSection";
import CuratedEntriesSection from "./CuratedEntriesSection";

const BADGE = "rounded-full border border-accent/20 bg-accent/[0.06] px-2 py-0.5 text-[11px] text-accent";

export function ContentCharacters({ characters }: { characters: FigureBookCharacter[] }) {
  const t = useTranslations("contentDetail");
  if (!characters.length) return null;
  return <AccordionSection title={t("fictionCharacters")} defaultOpen
    badge={<span className={BADGE}>{t("fictionCharactersCount", { count: characters.length })}</span>}>
    <FigureBookCharactersSection characters={characters} />
  </AccordionSection>;
}

export function ContentCurated({ entries }: { entries: ContentCuratedEntry[] }) {
  const t = useTranslations("library.curated");
  if (!entries.length) return null;
  return <AccordionSection title={t("onContent.title")} defaultOpen
    badge={<span className={BADGE}>{t("onContent.badge", { count: entries.length })}</span>}>
    <CuratedEntriesSection entries={entries} />
  </AccordionSection>;
}
