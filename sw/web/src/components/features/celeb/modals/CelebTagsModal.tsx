"use client";

import Modal from "@/components/ui/Modal";
import type { CelebTagInfo } from "@/types/home";
import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/types/locale";

interface CelebTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: CelebTagInfo[];
  title?: string;
  /** 커스텀 z-index */
  zIndex?: number;
}

export default function CelebTagsModal({ isOpen, onClose, tags, title, zIndex }: CelebTagsModalProps) {
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
        {tags.map((tag) => (
          <div key={tag.id} className="flex flex-col gap-2">
            <div className="flex items-start">
              <span
                className="px-3 py-1 rounded-full text-xs font-bold border"
                style={{
                  backgroundColor: `${tag.color}15`,
                  color: tag.color,
                  borderColor: `${tag.color}30`
                }}
              >
                {locale === 'en' ? (tag.name_en ?? tag.name) : tag.name}
              </span>
            </div>

            {((locale === 'en' ? (tag.short_desc_en ?? tag.short_desc) : tag.short_desc) || (locale === 'en' ? (tag.long_desc_en ?? tag.long_desc) : tag.long_desc)) ? (
              <div className="pl-1 space-y-1">
                {(locale === 'en' ? (tag.short_desc_en ?? tag.short_desc) : tag.short_desc) && (
                  <p className="text-sm text-accent font-medium">
                    {locale === 'en' ? (tag.short_desc_en ?? tag.short_desc) : tag.short_desc}
                  </p>
                )}
                {(locale === 'en' ? (tag.long_desc_en ?? tag.long_desc) : tag.long_desc) && (
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {locale === 'en' ? (tag.long_desc_en ?? tag.long_desc) : tag.long_desc}
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
