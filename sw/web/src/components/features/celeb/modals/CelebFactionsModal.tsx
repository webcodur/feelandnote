"use client";

import Modal from "@/components/ui/Modal";
import { readableFactionColor } from "@/lib/utils/factionColor";
import type { CelebFactionInfo } from "@/types/home";
import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/types/locale";

interface CelebFactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  factions: CelebFactionInfo[];
  title?: string;
  /** 커스텀 z-index */
  zIndex?: number;
}

export default function CelebFactionsModal({ isOpen, onClose, factions, title, zIndex }: CelebFactionsModalProps) {
  const t = useTranslations("home.ui.tags");
  const locale = useLocale() as Locale;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      frame="plain"
      size="md"
      overlayClassName="bg-black/60 backdrop-blur-sm"
      boxClassName="rounded-2xl border border-border bg-bg-main shadow-2xl"
      animateHeight={false}
      zIndex={zIndex}
    >
      {/* Header */}
      <div className="flex items-center px-6 py-4 border-b border-border/50 bg-bg-card/50">
        <h3 className="font-serif font-bold text-lg text-text-primary">
          {title || "Keywords & Insights"}
        </h3>
      </div>

      {/* List */}
      <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar flex flex-col gap-6">
        {factions.map((faction) => (
          <div key={faction.id} className="flex flex-col gap-2">
            <div className="flex items-start">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
                style={{
                  backgroundColor: `${faction.color}14`,
                  color: readableFactionColor(faction.color),
                  borderColor: `${faction.color}50`
                }}
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: faction.color }} />
                {locale === 'en' ? (faction.name_en ?? faction.name) : faction.name}
              </span>
            </div>

            {((locale === 'en' ? (faction.short_desc_en ?? faction.short_desc) : faction.short_desc) || (locale === 'en' ? (faction.long_desc_en ?? faction.long_desc) : faction.long_desc)) ? (
              <div className="pl-1 space-y-1">
                {(locale === 'en' ? (faction.short_desc_en ?? faction.short_desc) : faction.short_desc) && (
                  <p className="text-sm text-accent font-medium">
                    {locale === 'en' ? (faction.short_desc_en ?? faction.short_desc) : faction.short_desc}
                  </p>
                )}
                {(locale === 'en' ? (faction.long_desc_en ?? faction.long_desc) : faction.long_desc) && (
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {locale === 'en' ? (faction.long_desc_en ?? faction.long_desc) : faction.long_desc}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm italic pl-1">
                {t("noDescription")}
              </p>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
