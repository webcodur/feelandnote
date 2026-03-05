/*
  파일명: /components/features/scriptures/academy/ReadingComparison.tsx
  기능: 독서법 비교 분석 뷰
  책임: 7가지 독서법을 비교 요약 테이블과 개별 카드로 보여준다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, BookOpen } from "lucide-react";
import { ReadingMethod } from "@/constants/scripturesMuseum";
import { FormattedText } from "@/components/ui";
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

const SPEED_STYLES: Record<string, { color: string; width: string }> = {
  slow: { color: "bg-blue-400/60", width: "w-1/4" },
  medium: { color: "bg-emerald-400/60", width: "w-2/4" },
  fast: { color: "bg-amber-400/60", width: "w-3/4" },
  variable: { color: "bg-purple-400/60", width: "w-2/4" },
};

function SpeedBar({ speed }: { speed: string }) {
  const s = SPEED_STYLES[speed] ?? SPEED_STYLES.medium;
  const t = useTranslations("scriptures.academy.speedLevel");
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${s.color} ${s.width} transition-all`} />
      </div>
      <span className="text-[10px] text-white/50 w-6">{t(speed as "slow" | "medium" | "fast" | "variable")}</span>
    </div>
  );
}

function ComparisonTable({ data }: { data: ReadingMethod[] }) {
  const t = useTranslations("scriptures.academy");
  return (
    <div className="mb-8">
      <div className="sm:hidden flex flex-col gap-1.5">
        {data.map((m) => (
          <div key={m.id} className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] text-white/90 font-semibold leading-none">{m.name}</span>
              <span className="text-[9px] text-[#d4af37]/50 flex-shrink-0">{m.nameEn}</span>
            </div>
            <div className="mb-1">
              <SpeedBar speed={m.speed} />
            </div>
            <div className="flex flex-wrap gap-1">
              {m.bestFor.slice(0, 2).map((b, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/50">
                  {b}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden sm:block">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2.5 px-3 text-white/40 font-semibold uppercase tracking-wider">{t("readingMethod")}</th>
              <th className="text-left py-2.5 px-3 text-white/40 font-semibold uppercase tracking-wider">{t("speed")}</th>
              <th className="text-left py-2.5 px-3 text-white/40 font-semibold uppercase tracking-wider">{t("memoryRetention")}</th>
              <th className="text-left py-2.5 px-3 text-white/40 font-semibold uppercase tracking-wider">{t("suitableSituation")}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.id} className="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 px-3">
                  <div className="flex flex-col">
                    <span className="text-white/90 font-semibold">{m.name}</span>
                    <span className="text-[10px] text-[#d4af37]/50">{m.nameEn}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 w-28">
                  <SpeedBar speed={m.speed} />
                </td>
                <td className="py-2.5 px-3 text-white/60 max-w-[200px]">
                  {m.memoryEffect.split("로 ")[0]}
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex flex-wrap gap-1">
                    {m.bestFor.slice(0, 2).map((b, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50">
                        {b}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReadingCard({ item }: { item: ReadingMethod }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("scriptures.academy");

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
          <div className="w-24 mt-2">
            <SpeedBar speed={item.speed} />
          </div>
        </div>

        <p className="text-white/60 text-xs sm:text-[13px] leading-relaxed mb-3">
          {item.description}
        </p>

        <div className="mb-2">
          <h4 className="text-[10px] text-white/30 uppercase tracking-widest mb-1 font-semibold">{t("activatedBrainRegion")}</h4>
          <div className="flex flex-wrap gap-1">
            {item.brainRegions.map((r, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/5 text-[#d4af37]/80">
                {r}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <div>
            <h4 className="text-[10px] text-white/30 uppercase tracking-widest mb-1 font-semibold">{t("memoryRetention")}</h4>
            <p className="text-[11px] text-white/60 leading-relaxed">{item.memoryEffect}</p>
          </div>
          <div>
            <h4 className="text-[10px] text-white/30 uppercase tracking-widest mb-1 font-semibold">{t("comprehension")}</h4>
            <p className="text-[11px] text-white/60 leading-relaxed">{item.comprehension}</p>
          </div>
        </div>

        <div>
          <h4 className="text-[10px] text-white/30 uppercase tracking-widest mb-1 font-semibold">{t("suitableSituation")}</h4>
          <div className="flex flex-wrap gap-1.5">
            {item.bestFor.map((b, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-white/50 border border-white/[0.06]">
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

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

export default function ReadingComparison({ data }: { data: ReadingMethod[] }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6">
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="w-4 h-4 text-[#d4af37]/60" />
        <span className="text-xs text-[#d4af37]/60 uppercase tracking-[0.15em] font-semibold">
          Reading Methods Comparison
        </span>
      </div>

      <ComparisonTable data={data} />

      <div className="flex flex-col gap-4">
        {data.map((item) => (
          <ReadingCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
