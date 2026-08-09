"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { Locale } from "@/types/locale";
import type { FeaturedTag } from "@/actions/home";
import { buildFactionCollection } from "./utils";
import type { CollectionSection, FactionDisplayMode } from "./types";
import CollectionHero from "./sections/CollectionHero";
import DisplayModePicker from "./sections/DisplayModePicker";
import AtlasCollection from "./sections/AtlasCollection";
import RegistryCollection from "./sections/RegistryCollection";
import styles from "./FactionIntroView.module.css";

/* 소개 배너 접힘 상태 — 한 번 끄면 다음 방문에도 접힌 채로 남는다(localStorage) */
const HERO_HIDDEN_KEY = "faction-intro-hero-hidden";
const HERO_TOGGLE_EVENT = "faction-intro-hero-toggle";

const subscribeHeroHidden = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(HERO_TOGGLE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(HERO_TOGGLE_EVENT, onChange);
  };
};
const readHeroHidden = () => window.localStorage.getItem(HERO_HIDDEN_KEY) === "1";
const writeHeroHidden = (hidden: boolean) => {
  window.localStorage.setItem(HERO_HIDDEN_KEY, hidden ? "1" : "0");
  window.dispatchEvent(new Event(HERO_TOGGLE_EVENT));
};

function sectionSlug(section: CollectionSection) {
  if (section.tag.slug) return section.tag.slug;
  return section.tag.id;
}

function findSectionIndex(sections: CollectionSection[], slug: string | null) {
  if (!slug) return 0;
  const index = sections.findIndex((section) => sectionSlug(section) === slug);
  return index >= 0 ? index : 0;
}

interface FactionIntroViewProps {
  tags: FeaturedTag[];
  locale: Locale;
  canEditNames?: boolean;
  onTagNameChange?: (tagId: string, patch: Pick<FeaturedTag, "name" | "name_en">) => void;
}

export default function FactionIntroView({
  tags,
  locale,
  canEditNames = false,
  onTagNameChange,
}: FactionIntroViewProps) {
  const t = useTranslations("explore.faction.intro");
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const [mode, setMode] = useState<FactionDisplayMode>("atlas");
  // 서버 렌더는 항상 펼친 모습 — 접힘 여부는 클라이언트 저장값이 정한다
  const heroHidden = useSyncExternalStore(subscribeHeroHidden, readHeroHidden, () => false);
  const data = useMemo(
    () => buildFactionCollection(tags, locale),
    [tags, locale],
  );
  const sections = useMemo(() => [...data.real, ...data.fiction], [data]);
  const [sectionIndex, setSectionIndex] = useState(() => findSectionIndex(sections, sectionParam));

  useEffect(() => {
    if (!sectionParam || sections.some((section) => sectionSlug(section) === sectionParam)) return;

    const url = new URL(window.location.href);
    url.searchParams.delete("section");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [sectionParam, sections]);

  useEffect(() => {
    const syncSectionFromUrl = () => {
      const slug = new URL(window.location.href).searchParams.get("section");
      setSectionIndex(findSectionIndex(sections, slug));
    };

    window.addEventListener("popstate", syncSectionFromUrl);
    return () => window.removeEventListener("popstate", syncSectionFromUrl);
  }, [sections]);

  const handleSectionChange = useCallback((index: number) => {
    const section = sections[index];
    if (!section) return;

    setSectionIndex(index);

    const url = new URL(window.location.href);
    url.searchParams.delete("tag");
    url.searchParams.set("section", sectionSlug(section));
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [sections]);

  const viewProps = {
    data,
    locale,
    sectionIndex,
    onSectionChange: handleSectionChange,
    canEditNames,
    onTagNameChange,
  };

  return (
    <div className={styles.shell}>
      {heroHidden ? (
        <button
          type="button"
          className={styles.heroRestore}
          onClick={() => writeHeroHidden(false)}
        >
          <span className="font-cinzel text-xs font-bold tracking-[0.22em] text-accent">
            FACTION ATLAS
          </span>
          {t("showIntro")}
          <ChevronDown size={14} />
        </button>
      ) : (
        <CollectionHero
          data={data}
          locale={locale}
          onHide={() => writeHeroHidden(true)}
        />
      )}
      <DisplayModePicker mode={mode} onChange={setMode} />
      <div aria-live="polite">
        {mode === "atlas" && <AtlasCollection {...viewProps} />}
        {mode === "registry" && <RegistryCollection {...viewProps} />}
      </div>
    </div>
  );
}
