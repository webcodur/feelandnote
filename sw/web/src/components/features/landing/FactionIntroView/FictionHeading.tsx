"use client";

import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";
import introStyles from "./FactionIntroView.module.css";
import collectionStyles from "./FactionCollection.module.css";

export default function FictionHeading() {
  const t = useTranslations("landing");

  return (
    <header className={collectionStyles.fictionHeading}>
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-accent/30 text-accent">
        <BookOpen size={19} />
      </span>
      <div>
        <h2 className={introStyles.sectionTitle}>{t("fictionTitle")}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-text-secondary">
          {t("fictionNote")}
        </p>
      </div>
    </header>
  );
}
