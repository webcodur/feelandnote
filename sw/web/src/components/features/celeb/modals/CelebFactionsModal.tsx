"use client";

import { ArrowUpRight } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Link } from "@/i18n/navigation";
import { mythHref } from "@/components/features/user/explore/myth/mythHref";
import { readableFactionColor } from "@/lib/utils/factionColor";
import type { CelebFactionInfo } from "@/types/home";
import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/types/locale";

interface CelebFactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  factions: CelebFactionInfo[];
  personName: string;
  /** 커스텀 z-index */
  zIndex?: number;
}

export default function CelebFactionsModal({ isOpen, onClose, factions, personName, zIndex }: CelebFactionsModalProps) {
  const tHome = useTranslations("home.ui");
  const t = useTranslations("home.ui.tags");
  const tFaction = useTranslations("explore.faction");
  const locale = useLocale() as Locale;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={tHome("affiliationsTitle", { name: personName })}
      frame="plain"
      size="md"
      overlayClassName="bg-black/60 backdrop-blur-sm"
      boxClassName="rounded-2xl border border-border bg-bg-main shadow-2xl"
      animateHeight={false}
      zIndex={zIndex}
    >
      {/* Header */}
      <div className="shrink-0 px-6 py-4 pe-14 border-b border-border/50 bg-bg-card/50">
        <p className="mb-1 text-xs font-medium tracking-widest text-accent/80">{t("atlasTitle")}</p>
        <h3 className="font-serif font-bold text-lg text-text-primary">
          {tHome("affiliationsTitle", { name: personName })}
        </h3>
      </div>

      {/* List */}
      <div className="min-h-0 overflow-y-auto p-6 custom-scrollbar flex flex-col gap-6">
        {factions.map((faction) => {
          const factionName = locale === "en" ? (faction.name_en ?? faction.name) : faction.name;
          const description = locale === "en" ? (faction.long_desc_en ?? faction.long_desc) : faction.long_desc;
          // 페이지가 있는 소속은 제목을 눌러 도감으로 이동한다.
          // 신화 소속은 신화 주소로 — 세력도감 주소는 신화를 싣지 않아 404였다(26.09.29)
          const href = faction.is_featured && faction.slug
            ? faction.is_myth ? mythHref(faction.slug) : `/explore/faction/${faction.slug}`
            : null;
          const heading = (
            <>
              <span>{tFaction.rich("personInTheme", { theme: factionName, name: personName, accent: (chunks) => <span style={{ color: readableFactionColor(faction.color) }}>{chunks}</span> })}</span>
              {href && <ArrowUpRight size={14} className="shrink-0" aria-hidden />}
            </>
          );
          return (
          <section key={faction.id} className="border-s-2 ps-4" style={{ borderColor: readableFactionColor(faction.color) }}>
            <h4 className="mb-2 text-sm font-semibold leading-relaxed text-text-primary">
              {href ? (
                <Link
                  href={href}
                  onClick={onClose}
                  title={t("goToFaction")}
                  className="inline-flex items-center gap-1.5 rounded hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {heading}
                </Link>
              ) : (
                heading
              )}
            </h4>
            {description ? (
              <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
            ) : <p className="text-sm italic">{t("noDescription")}</p>}
          </section>
          );
        })}
      </div>
    </Modal>
  );
}
