"use client";

import { useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import FaceStack from "../FaceStack";
import Pager from "../Pager";
import SectionCarousel from "../SectionCarousel";
import ThemeAction from "../ThemeAction";
import type { CollectionSection, CollectionViewProps } from "../types";
import collectionStyles from "../FactionCollection.module.css";
import viewStyles from "../FactionViews.module.css";

const REGISTRY_PAGE_SIZE = 7;

function RegistrySection({
  section,
}: {
  section: CollectionSection;
}) {
  const t = useTranslations("explore.faction.intro");
  const sectionStyle = { "--faction-color": section.color } as CSSProperties;
  const [page, setPage] = useState(0);
  const pages = Math.ceil(section.themes.length / REGISTRY_PAGE_SIZE);
  const visibleThemes = section.themes.slice(
    page * REGISTRY_PAGE_SIZE,
    (page + 1) * REGISTRY_PAGE_SIZE,
  );

  return (
    <article className={`${collectionStyles.section} ${viewStyles.registrySection}`} style={sectionStyle}>
      <header className={viewStyles.registryGroup}>
        <p className="font-cinzel text-sm tracking-[0.18em] text-accent">
          {t("registryLabel")}
        </p>
        <h2 className={collectionStyles.groupTitle}>{section.name}</h2>
        {section.description && (
          <p className="mt-3 text-sm leading-7 text-text-secondary">
            {section.description}
          </p>
        )}
        <div className="mt-5">
          <FaceStack people={section.people} />
        </div>
      </header>

      <div className={viewStyles.registryList}>
        {visibleThemes.map((theme, index) => (
          <ThemeAction
            key={theme.tag.id}
            theme={theme}
            className={`${collectionStyles.themeAction} ${viewStyles.registryRow}`}
            style={{ "--faction-color": theme.tag.color } as CSSProperties}
            openLabel={t("carousel.openPage")}
          >
            <span className={viewStyles.registryNumber}>
              {String(page * REGISTRY_PAGE_SIZE + index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <h3 className={collectionStyles.registryTitle}>{theme.name}</h3>
              {theme.description && (
                <p className="mt-1 line-clamp-1 text-sm text-text-secondary">
                  {theme.description}
                </p>
              )}
            </div>
            <div className="hidden min-w-0 md:block">
              <p className="truncate text-sm text-text-secondary">
                {theme.people.slice(0, 4).map((person) => person.nickname).join(" · ")}
              </p>
            </div>
            <span className={`${viewStyles.registryCount} whitespace-nowrap text-sm text-text-secondary`}>
              {theme.tag.is_featured
                ? t("figureCount", { count: theme.tag.celebs.length })
                : t("upcomingBadge")}
            </span>
          </ThemeAction>
        ))}
      </div>
      <Pager page={page} pages={pages} onChange={setPage} />
    </article>
  );
}

export default function RegistryCollection({
  data,
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
          <RegistrySection section={section} />
        )}
      </SectionCarousel>
    </div>
  );
}
