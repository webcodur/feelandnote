"use client";

import { Link } from "@/i18n/navigation";
import { Users, BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";

export function HomeNavigationLinks() {
  const t = useTranslations("home.ui.navLinks");
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4">
      <Link
        href="/explore"
        className="group flex flex-col items-center justify-center py-4 md:p-6 md:rounded-xl bg-transparent md:bg-card border-0 md:border md:border-white/5 md:hover:border-accent/30 md:hover:bg-accent/5 transition-all duration-300"
      >
        <div className="p-3 rounded-full bg-main mb-3 text-text-secondary group-hover:text-accent group-hover:scale-110 transition-all duration-300">
          <Users size={24} strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-serif font-bold text-text-primary mb-1 group-hover:text-accent transition-colors">
          {t("moreCelebs")}
        </h3>
        <p className="text-sm text-text-tertiary">
          {t("moreCelebsDesc")}
        </p>
      </Link>

      <Link
        href="/scriptures"
        className="group flex flex-col items-center justify-center py-4 md:p-6 md:rounded-xl bg-transparent md:bg-card border-0 md:border md:border-white/5 md:hover:border-accent/30 md:hover:bg-accent/5 transition-all duration-300"
      >
        <div className="p-3 rounded-full bg-main mb-3 text-text-secondary group-hover:text-accent group-hover:scale-110 transition-all duration-300">
          <BookOpen size={24} strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-serif font-bold text-text-primary mb-1 group-hover:text-accent transition-colors">
          {t("moreResources")}
        </h3>
        <p className="text-sm text-text-tertiary">
          {t("moreResourcesDesc")}
        </p>
      </Link>
    </div>
  );
}
