/*
  파일명: /components/features/scriptures/museum/TypographyCatalog.tsx
  기능: 서체 분류 도감 카드 그리드
  책임: 8개 서체 분류를 카드 형태로 보여주고, 클릭 시 에세이를 아코디언으로 펼친다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Type } from "lucide-react";
import { TypographyClass } from "@/constants/scripturesMuseum";
import { FormattedText } from "@/components/ui";
import Image from "next/image";
import { useTranslations } from "next-intl";

function EssayContent({ markdown }: { markdown: string }) {
  const paragraphs = markdown.split("\n\n");
  return (
    <div className="space-y-3 sm:space-y-4">
      {paragraphs.map((para, i) => (
        <p key={i} className="text-white/75 text-[13px] sm:text-sm leading-[1.75] sm:leading-[1.8]">
          <FormattedText text={para} />
        </p>
      ))}
    </div>
  );
}

function TypographyCard({ item }: { item: TypographyClass }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("scriptures.museum");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden hover:border-white/15 transition-colors duration-300"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h3 className="text-lg sm:text-xl font-serif font-bold text-white leading-tight">
              {item.name}
            </h3>
            <span className="text-[11px] text-[#d4af37]/60 font-medium tracking-wide">
              {item.nameEn}
            </span>
          </div>
          <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full whitespace-nowrap mt-1">
            {item.period}
          </span>
        </div>

        <p className="text-white/60 text-xs sm:text-[13px] leading-relaxed mb-3">
          {item.description}
        </p>

        <div className="flex flex-wrap gap-1 mb-3">
          {item.characteristics.map((tag, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/5 text-[#d4af37]/80">
              {tag}
            </span>
          ))}
        </div>

        <div className="mb-2">
          <h4 className="text-[10px] text-white/30 uppercase tracking-widest mb-1 font-semibold">{t("representativeTypeface")}</h4>
          <div className="flex flex-wrap gap-1.5">
            {item.representatives.map((font, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-white/70 border border-white/[0.06]">
                {font}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-[10px] text-white/30 uppercase tracking-widest mb-1 font-semibold">{t("usageContext")}</h4>
          <div className="flex flex-wrap gap-1.5">
            {item.useCases.map((uc, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-white/50 border border-white/[0.06]">
                {uc}
              </span>
            ))}
          </div>
        </div>
      </div>

      {item.imageUrl && (
        <div className="relative w-full h-48 sm:h-56">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 768px"
            priority={false}
          />
        </div>
      )}

      {item.essay && (
        <>
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-white/[0.06] text-white/40 hover:text-white/70 transition-colors text-[11px] font-medium"
          >
            <span>{open ? t("foldEssay") : t("unfoldEssay")}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-white/[0.06]">
                  <h4 className="text-sm sm:text-base font-serif font-bold text-white pt-4 mb-3">
                    {item.essay.title}
                  </h4>
                  <EssayContent markdown={item.essay.contentMarkdown} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

export default function TypographyCatalog({ data }: { data: TypographyClass[] }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6">
      <div className="flex items-center gap-2 mb-6">
        <Type className="w-4 h-4 text-[#d4af37]/60" />
        <span className="text-xs text-[#d4af37]/60 uppercase tracking-[0.15em] font-semibold">
          Typography Classification
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:gap-4">
        {data.map((item) => (
          <TypographyCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
