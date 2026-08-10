"use client";

import { useTranslations } from "next-intl";
import { UsersRound, Waypoints, X } from "lucide-react";
import type { CSSProperties } from "react";
import type { Locale } from "@/types/locale";
import type { FactionCollectionData } from "../types";
import ThemeVisual from "./ThemeVisual";
import styles from "../FactionIntroView.module.css";

interface CollectionHeroProps {
  data: FactionCollectionData;
  locale: Locale;
  /** 소개 배너 접기 — 접힌 뒤엔 자리에 「소개 열기」 단추가 남는다 */
  onHide?: () => void;
}

export default function CollectionHero({ data, locale, onHide }: CollectionHeroProps) {
  const t = useTranslations("explore.faction.intro");

  return (
    <header className={styles.hero}>
      {onHide && (
        <button type="button" className={styles.heroHide} onClick={onHide}>
          {t("hideIntro")}
          <X size={14} />
        </button>
      )}
      <div className={styles.heroCopy}>
        <div className="flex items-center gap-3 text-accent">
          <Waypoints size={18} />
          <span className="font-cinzel text-sm font-bold tracking-[0.22em]">
            FACTION ATLAS
          </span>
        </div>
        <h2 className={styles.displayTitle}>{t("title")}</h2>
        <p className="max-w-2xl whitespace-pre-line text-base leading-8 text-text-secondary md:text-lg">
          {t("description")}
        </p>
        <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <dt className="text-sm text-text-secondary">{t("stats.themes")}</dt>
            <dd className="font-cinzel text-2xl text-text-primary">{data.totalThemes}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">{t("stats.figures")}</dt>
            <dd className="flex items-center gap-2 font-cinzel text-2xl text-text-primary">
              <UsersRound size={19} className="text-accent" />
              {data.totalCelebs}
            </dd>
          </div>
        </dl>
      </div>

      <div className={styles.heroMontage} aria-label={t("heroPreview")}>
        {data.heroThemes.map((theme, index) => (
          <div
            key={theme.tag.id}
            className={styles.heroPanel}
            style={{ "--faction-color": theme.tag.color } as CSSProperties}
          >
            <ThemeVisual theme={theme} />
            <div className={styles.heroPanelLabel}>
              <span className="font-cinzel text-sm text-accent">0{index + 1}</span>
              <strong className={styles.heroThemeName} lang={locale}>
                {theme.name}
              </strong>
            </div>
          </div>
        ))}
      </div>
    </header>
  );
}
