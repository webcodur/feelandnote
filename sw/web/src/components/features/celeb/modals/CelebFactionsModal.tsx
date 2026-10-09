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
  const locale = useLocale() as Locale;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={tHome("affiliationsTitle", { name: personName })}
      frame="plain"
      size="md"
      overlayClassName="bg-black/60 backdrop-blur-sm"
      boxClassName="rounded-panel border border-line bg-bg-main shadow-2xl"
      animateHeight={false}
      zIndex={zIndex}
    >
      {/* Header */}
      <div className="shrink-0 px-6 py-4 pe-14 border-b border-line bg-bg-card">
        <p className="mb-1 text-xs font-medium text-accent">{t("atlasTitle")}</p>
        <h3 className="font-semibold text-lg text-text-primary">
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
              <span className="min-w-0 break-words">{factionName}</span>
              {href && <ArrowUpRight size={18} className="shrink-0" aria-hidden />}
            </>
          );
          return (
          <section key={faction.id} className="border-b border-line pb-6 last:border-b-0 last:pb-0">
            <h4 className="mb-3 text-lg font-semibold leading-snug" style={{ color: readableFactionColor(faction.color) }}>
              {href ? (
                <Link
                  href={href}
                  onClick={onClose}
                  title={t("goToFaction")}
                  className="-mx-2 flex min-h-11 w-fit max-w-[calc(100%+1rem)] items-center gap-2 rounded-control px-2 py-1.5 hover:bg-bg-raised hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {heading}
                </Link>
              ) : (
                heading
              )}
            </h4>
            {description ? (
              <p className="text-sm font-normal leading-[1.8] text-text-secondary whitespace-pre-line break-words">{description}</p>
            ) : <p className="text-sm font-normal leading-[1.8] text-text-secondary">{t("noDescription")}</p>}
          </section>
          );
        })}
      </div>
    </Modal>
  );
}
