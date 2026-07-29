"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/types/locale";
import type { FeaturedTag } from "@/actions/home";
import { buildFactionCollection } from "./utils";
import type { CollectionTheme, FactionDisplayMode } from "./types";
import CollectionHero from "./sections/CollectionHero";
import DisplayModePicker from "./sections/DisplayModePicker";
import AtlasCollection from "./sections/AtlasCollection";
import GalleryCollection from "./sections/GalleryCollection";
import RegistryCollection from "./sections/RegistryCollection";
import ThemePreviewModal from "./ThemePreviewModal";
import styles from "./FactionIntroView.module.css";

interface FactionIntroViewProps {
  tags: FeaturedTag[];
  locale: Locale;
}

export default function FactionIntroView({
  tags,
  locale,
}: FactionIntroViewProps) {
  const [mode, setMode] = useState<FactionDisplayMode>("atlas");
  const [sectionIndex, setSectionIndex] = useState(0);
  const [previewTheme, setPreviewTheme] = useState<CollectionTheme | null>(null);
  const data = useMemo(() => buildFactionCollection(tags, locale), [tags, locale]);
  const sections = useMemo(() => [...data.real, ...data.fiction], [data]);
  const previewThemes = useMemo(
    () => sections[sectionIndex]?.themes ?? [],
    [sectionIndex, sections],
  );
  const viewProps = {
    data,
    locale,
    onPreview: setPreviewTheme,
    sectionIndex,
    onSectionChange: setSectionIndex,
  };

  return (
    <div className={styles.shell}>
      <CollectionHero data={data} locale={locale} />
      <DisplayModePicker mode={mode} onChange={setMode} />
      <div aria-live="polite">
        {mode === "atlas" && <AtlasCollection {...viewProps} />}
        {mode === "gallery" && <GalleryCollection {...viewProps} />}
        {mode === "registry" && <RegistryCollection {...viewProps} />}
      </div>
      <ThemePreviewModal
        theme={previewTheme}
        themes={previewThemes}
        onChange={setPreviewTheme}
        onClose={() => setPreviewTheme(null)}
      />
    </div>
  );
}
