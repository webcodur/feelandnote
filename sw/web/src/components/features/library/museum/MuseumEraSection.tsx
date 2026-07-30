/*
  파일명: /components/features/library/museum/MuseumEraSection.tsx
  기능: 전시관 시대별 섹션
  책임: 시대 이미지/제목 + 설명 + 에세이 + 주요 콘텐츠 태그를 렌더링한다.
*/ // ------------------------------

"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FormattedText } from "@/components/ui";
import Image from "next/image";
import type { HistoryEra } from "@/constants/libraryMuseum";

// #region 에세이 본문 렌더러
function EssayContent({ markdown }: { markdown: string }) {
  const paragraphs = markdown.split("\n\n");
  return (
    <div className="space-y-3 sm:space-y-4">
      {paragraphs.map((para, i) => (
        <p key={i} className="text-white/90 text-[15px] sm:text-base leading-[1.8] sm:leading-[1.85]">
          <FormattedText text={para} />
        </p>
      ))}
    </div>
  );
}
// #endregion

// #region 메인 컴포넌트
interface Props {
  era: HistoryEra;
  index: number;
  eras: HistoryEra[];
  keyContentsLabel: string;
}

export default function MuseumEraSection({ era, index, eras, keyContentsLabel }: Props) {
  const prevEra = index > 0 ? eras[index - 1] : null;
  const nextEra = index < eras.length - 1 ? eras[index + 1] : null;

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(`era-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <section id={`era-${era.id}`} className="relative scroll-mt-4">
      {index > 0 && (
        <div className="flex items-center justify-center py-10 sm:py-16 md:py-20">
          <div className="w-px h-12 sm:h-16 bg-gradient-to-b from-transparent via-white/15 to-transparent" />
        </div>
      )}

      {era.imageUrl ? (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8 }}
          className="relative w-full max-w-3xl mx-auto h-[35vh] sm:h-[45vh] md:h-[55vh] overflow-hidden rounded-xl sm:rounded-2xl mb-0 px-4 sm:px-6"
        >
          <Image
            src={era.imageUrl}
            alt={era.name}
            fill
            className="object-cover rounded-xl sm:rounded-2xl"
            sizes="(max-width: 640px) 100vw, 768px"
            priority={index < 2}
          />
          <div className="absolute inset-0 bg-radial-[ellipse_at_center] from-black/30 via-black/10 to-black/50" />

          <div className="absolute inset-0 flex items-center justify-center z-10 px-4">
            {prevEra ? (
              <button
                onClick={() => scrollTo(prevEra.id)}
                className="absolute left-5 sm:left-7 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/30 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/50 transition-all"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            ) : null}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center"
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] leading-tight">
                {era.name}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-xs sm:text-sm text-[#d4af37] font-semibold tracking-wider font-cinzel drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
                  {era.period}
                </span>
                <span className="text-white/40 drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">·</span>
                <span className="text-xs sm:text-sm text-white/80 font-semibold drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
                  {index + 1} / {eras.length}
                </span>
              </div>
            </motion.div>

            {nextEra ? (
              <button
                onClick={() => scrollTo(nextEra.id)}
                className="absolute right-5 sm:right-7 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/30 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/50 transition-all"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            ) : null}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="relative w-full max-w-3xl mx-auto px-4 sm:px-6"
        >
          <div className="relative flex items-center justify-center py-8 sm:py-12 md:py-16">
            {prevEra ? (
              <button
                onClick={() => scrollTo(prevEra.id)}
                className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            ) : null}

            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-black text-white leading-tight">
                {era.name}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-xs sm:text-sm text-[#d4af37] font-semibold tracking-wider font-cinzel">
                  {era.period}
                </span>
                <span className="text-white/40">·</span>
                <span className="text-xs sm:text-sm text-white/60 font-semibold">
                  {index + 1} / {eras.length}
                </span>
              </div>
            </div>

            {nextEra ? (
              <button
                onClick={() => scrollTo(nextEra.id)}
                className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            ) : null}
          </div>
        </motion.div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="pt-4 sm:pt-6 pb-3 sm:pb-4"
        >
          <p className="text-white/80 text-sm sm:text-base leading-relaxed">
            {era.description}
          </p>
        </motion.div>

        {era.essay && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="pb-4 sm:pb-6"
          >
            <div className="border-t border-white/10 pt-4 sm:pt-6 mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg md:text-xl font-serif font-bold text-white">
                {era.essay.title}
              </h3>
            </div>

            <EssayContent markdown={era.essay.contentMarkdown} />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="pb-3"
        >
          <h4 className="text-[11px] sm:text-xs text-white/40 uppercase tracking-widest mb-1.5 sm:mb-2 font-semibold">{keyContentsLabel}</h4>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {era.contents.map((content, idx) => (
              <span
                key={idx}
                className="text-[11px] sm:text-xs px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border border-white/10 bg-white/5 text-white/75"
              >
                {content}
              </span>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  );
}
// #endregion
