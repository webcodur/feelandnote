"use client";

import { useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Maximize2 } from "lucide-react";
import FaceStack from "../FaceStack";
import Pager from "../Pager";
import SectionCarousel from "../SectionCarousel";
import ThemeAction from "../ThemeAction";
import type { CollectionSection, CollectionViewProps } from "../types";
import ThemeVisual from "./ThemeVisual";
import collectionStyles from "../FactionCollection.module.css";
import viewStyles from "../FactionViews.module.css";

const ATLAS_CARD_SIZES = [
  viewStyles.atlasLead,
  viewStyles.atlasSide,
  viewStyles.atlasSide,
  viewStyles.atlasThird,
  viewStyles.atlasThird,
  viewStyles.atlasThird,
];
const ATLAS_PAGE_SIZE = 6;

function AtlasSection({
  section,
  ordinal,
  onPreview,
}: {
  section: CollectionSection;
  ordinal: number;
  onPreview: CollectionViewProps["onPreview"];
}) {
  const t = useTranslations("explore.faction.intro");
  const sectionStyle = { "--faction-color": section.color } as CSSProperties;
  const [page, setPage] = useState(0);
  const pages = Math.ceil(section.themes.length / ATLAS_PAGE_SIZE);
  const visibleThemes = section.themes.slice(
    page * ATLAS_PAGE_SIZE,
    (page + 1) * ATLAS_PAGE_SIZE,
  );

  return (
    <article className={collectionStyles.section} style={sectionStyle}>
      <header className={collectionStyles.sectionHeader}>
        <div>
          <p className="font-cinzel text-sm tracking-[0.2em] text-accent">
            SECTION {String(ordinal + 1).padStart(2, "0")}
          </p>
          <h2 className={collectionStyles.groupTitle}>{section.name}</h2>
          {section.description && (
            <p className="mt-3 max-w-xl text-sm leading-7 text-text-secondary">
              {section.description}
            </p>
          )}
        </div>
        <div className="flex items-end justify-between gap-5 md:flex-col md:items-end">
          <span className={collectionStyles.sectionMeta}>
            {t("sectionMeta", {
              themes: section.themes.length,
              figures: section.totalCelebs,
            })}
          </span>
          <FaceStack people={section.people} />
        </div>
      </header>

      <div className={viewStyles.atlasGrid} data-theme-rail>
        {visibleThemes.map((theme, index) => (
          <ThemeAction
            key={theme.tag.id}
            theme={theme}
            onPreview={onPreview}
            className={`${collectionStyles.themeAction} ${viewStyles.atlasCard} ${
              ATLAS_CARD_SIZES[index % ATLAS_CARD_SIZES.length]
            }`}
            style={{ "--faction-color": theme.tag.color } as CSSProperties}
            previewLabel={t("carousel.previewImage")}
            pageLabel={t("carousel.openPage")}
            shortcutClassName="right-4 top-[3.65rem]"
          >
            <ThemeVisual theme={theme} />
            <span className={viewStyles.cardNumber}>
              {String(page * ATLAS_PAGE_SIZE + index + 1).padStart(2, "0")}
            </span>
            <span className={viewStyles.figureBadge}>
              {t("figureCount", { count: theme.tag.celebs.length })}
            </span>
            <div className={viewStyles.atlasCardCopy}>
              <h3 className={collectionStyles.themeTitle}>{theme.name}</h3>
              {theme.description && (
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-secondary">
                  {theme.description}
                </p>
              )}
              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-text-primary">
                  {t("carousel.previewImage")}
                </span>
                <Maximize2 size={17} className="text-accent" />
              </div>
            </div>
          </ThemeAction>
        ))}
      </div>
      <Pager page={page} pages={pages} onChange={setPage} />
    </article>
  );
}

export default function AtlasCollection({
  data,
  onPreview,
  sectionIndex,
  onSectionChange,
}: CollectionViewProps) {
  return (
    <div className={collectionStyles.collectionBody}>
      <SectionCarousel
        data={data}
        activeIndex={sectionIndex}
        onChange={onSectionChange}
      >
        {(section, index) => (
          <AtlasSection
            section={section}
            ordinal={index}
            onPreview={onPreview}
          />
        )}
      </SectionCarousel>
    </div>
  );
}
