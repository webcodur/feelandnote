"use client";

import { useRef, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import FaceStack from "../FaceStack";
import Pager from "../Pager";
import SectionCarousel from "../SectionCarousel";
import ThemeAction from "../ThemeAction";
import type { CollectionSection, CollectionViewProps } from "../types";
import ThemeVisual from "./ThemeVisual";
import collectionStyles from "../FactionCollection.module.css";
import viewStyles from "../FactionViews.module.css";

const ATLAS_PAGE_SIZE = 8;

function AtlasSection({
  section,
  ordinal,
}: {
  section: CollectionSection;
  ordinal: number;
}) {
  const t = useTranslations("explore.faction.intro");
  const sectionStyle = { "--faction-color": section.color } as CSSProperties;
  const articleRef = useRef<HTMLElement>(null);
  const [page, setPage] = useState(0);
  const pages = Math.ceil(section.themes.length / ATLAS_PAGE_SIZE);
  const visibleThemes = section.themes.slice(
    page * ATLAS_PAGE_SIZE,
    (page + 1) * ATLAS_PAGE_SIZE,
  );

  /* 하단 넘김 버튼은 화면 맨 아래에 있다 — 페이지를 바꾼 뒤 구획 제목부터 다시 보이게 올린다 */
  const changePage = (next: number) => {
    setPage(next);
    articleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <article ref={articleRef} className={collectionStyles.section} style={sectionStyle}>
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
            className={`${collectionStyles.themeAction} ${viewStyles.atlasCard} ${viewStyles.atlasSide}`}
            style={{ "--faction-color": theme.tag.color } as CSSProperties}
            openLabel={t("carousel.openPage")}
          >
            <ThemeVisual theme={theme} />
            <span className={viewStyles.cardNumber}>
              #{page * ATLAS_PAGE_SIZE + index + 1}
            </span>
            <span className={viewStyles.figureBadge}>
              {theme.tag.is_featured
                ? t("figureCount", { count: theme.tag.celebs.length })
                : t("upcomingBadge")}
            </span>
            <div className={viewStyles.atlasCardCopy}>
              <h3 className={collectionStyles.themeTitle}>{theme.name}</h3>
            </div>
          </ThemeAction>
        ))}
      </div>
      <Pager page={page} pages={pages} onChange={changePage} />
    </article>
  );
}

export default function AtlasCollection({
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
        {(section, index) => (
          <AtlasSection
            section={section}
            ordinal={index}
          />
        )}
      </SectionCarousel>
    </div>
  );
}
