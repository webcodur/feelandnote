"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Maximize2 } from "lucide-react";
import FaceStack from "../FaceStack";
import SectionCarousel from "../SectionCarousel";
import ThemeRail from "../ThemeRail";
import ThemeAction from "../ThemeAction";
import type { CollectionSection, CollectionViewProps } from "../types";
import ThemeVisual from "./ThemeVisual";
import collectionStyles from "../FactionCollection.module.css";
import viewStyles from "../FactionViews.module.css";

function GallerySection({
  section,
  onPreview,
}: {
  section: CollectionSection;
  onPreview: CollectionViewProps["onPreview"];
}) {
  const t = useTranslations("explore.faction.intro");
  const sectionStyle = { "--faction-color": section.color } as CSSProperties;

  return (
    <article className={collectionStyles.section} style={sectionStyle}>
      <header className={`${collectionStyles.sectionHeader} ${viewStyles.galleryHeader}`}>
        <div>
          <h2 className={collectionStyles.groupTitle}>{section.name}</h2>
          {section.description && (
            <p className="mt-2 max-w-2xl text-sm leading-7 text-text-secondary">
              {section.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <FaceStack people={section.people} limit={5} />
          <span className={collectionStyles.sectionMeta}>
            {t("sectionMeta", {
              themes: section.themes.length,
              figures: section.totalCelebs,
            })}
          </span>
        </div>
      </header>

      <ThemeRail className={viewStyles.galleryTrack}>
        {section.themes.map((theme, index) => (
          <ThemeAction
            key={theme.tag.id}
            theme={theme}
            onPreview={onPreview}
            className={`${collectionStyles.themeAction} ${viewStyles.galleryCard}`}
            style={{ "--faction-color": theme.tag.color } as CSSProperties}
            previewLabel={t("carousel.previewImage")}
            pageLabel={t("carousel.openPage")}
            shortcutClassName="right-4 top-[3.65rem]"
          >
            <ThemeVisual theme={theme} />
            <span className={viewStyles.galleryIndex}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className={viewStyles.figureBadge}>
              {t("figureCount", { count: theme.tag.celebs.length })}
            </span>
            <div className={viewStyles.galleryCopy}>
              <h3 className={collectionStyles.themeTitle}>{theme.name}</h3>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-text-secondary">
                {theme.people.slice(0, 3).map((person) => person.nickname).join(" · ")}
              </p>
              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm font-semibold text-text-primary">
                  {t("carousel.previewImage")}
                </span>
                <Maximize2 size={17} className="text-accent" />
              </div>
            </div>
          </ThemeAction>
        ))}
      </ThemeRail>
    </article>
  );
}

export default function GalleryCollection({
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
        {(section) => (
          <GallerySection section={section} onPreview={onPreview} />
        )}
      </SectionCarousel>
    </div>
  );
}
