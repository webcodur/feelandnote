"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import type { CelebTagInfo } from "@/types/home";
import { Z_INDEX } from "@/constants/zIndex";
import { useTranslations, useLocale } from "next-intl";

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
  const locale = useLocale() as 'ko' | 'en';
  if (!isOpen || typeof document === "undefined") return null;

  const content = (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      style={{ zIndex: zIndex ?? Z_INDEX.modal }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-bg-main border border-border rounded-2xl shadow-2xl overflow-hidden animate-zoom-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-bg-card/50">
          <h3 className="font-serif font-bold text-lg text-text-primary">
            {title || "Keywords & Insights"}
          </h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X size={20} />
          </button>
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
                <p className="text-sm text-text-tertiary italic pl-1">
                  {t("noDescription")}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
