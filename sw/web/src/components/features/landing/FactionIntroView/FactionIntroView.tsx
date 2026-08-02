"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import type { Locale } from "@/types/locale";
import type { FeaturedTag } from "@/actions/home";
import { buildFactionCollection } from "./utils";
import type { FactionDisplayMode } from "./types";
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

interface FactionIntroViewProps {
  tags: FeaturedTag[];
  locale: Locale;
}

export default function FactionIntroView({
  tags,
  locale,
}: FactionIntroViewProps) {
  const t = useTranslations("explore.faction.intro");
  const [mode, setMode] = useState<FactionDisplayMode>("atlas");
  const [sectionIndex, setSectionIndex] = useState(0);
  // 서버 렌더는 항상 펼친 모습 — 접힘 여부는 클라이언트 저장값이 정한다
  const heroHidden = useSyncExternalStore(subscribeHeroHidden, readHeroHidden, () => false);
  const data = useMemo(
    () => buildFactionCollection(tags, locale, { upcoming: t("upcomingSection") }),
    [tags, locale, t],
  );
  const viewProps = {
    data,
    locale,
    sectionIndex,
    onSectionChange: setSectionIndex,
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
