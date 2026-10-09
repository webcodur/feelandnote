/*
  파일명: /components/features/library/museum/MuseumEraSection.tsx
  기능: 전시관 시대별 섹션
  책임: 시대 이미지/제목 + 설명 + 에세이 + 주요 콘텐츠 태그를 렌더링한다.
*/ // ------------------------------

"use client";

import { motion } from "framer-motion";
import HubSection from "@/components/shared/HubSection";
import { FormattedText } from "@/components/ui";
import Image from "next/image";
import type { HistoryEra } from "@/constants/libraryMuseum";
import TargetProduct from "@/components/features/commerce/TargetProduct";
import DeveloperCollectionJourney from "@/components/features/commerce/DeveloperCollectionJourney";
import type { TargetProductMatch } from "@/components/features/commerce/targetProducts";

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
  targetProducts?: TargetProductMatch[];
  era: HistoryEra;
  index: number;
  eras: HistoryEra[];
  keyContentsLabel: string;
}

export default function MuseumEraSection({ era, index, eras, keyContentsLabel, targetProducts = [] }: Props) {
  return (
    <HubSection id={`era-${era.id}`} title={era.name} subtitle={era.period}
      index={index} total={eras.length} hideDivider={index === 0}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {era.imageUrl && (
          <div className="relative mb-4 h-[35vh] overflow-hidden rounded-xl sm:mb-6 sm:h-[45vh] sm:rounded-2xl">
            <Image src={era.imageUrl} alt={era.name} fill className="object-cover"
              sizes="(max-width: 640px) 100vw, 768px" priority={index < 2} />
          </div>
        )}
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
          <h4 className="text-[11px] sm:text-xs text-text-tertiary uppercase tracking-widest mb-1.5 sm:mb-2 font-semibold">{keyContentsLabel}</h4>
          <div className="flex flex-col">
            {era.contents.map((content, idx) => {
              const match = targetProducts.find((item) => item.label === content);
              if (match?.product.id === "breath-of-the-wild") return <div key={content} className="border-b border-border py-3">
                <p className="text-sm text-text-secondary">{content}</p>
                <DeveloperCollectionJourney target={{ title: match.product.name, creator: "Nintendo", type: "GAME" }} placement="museum-work" />
              </div>;
              if (match) return <TargetProduct key={content} label={content} product={match.product} />;
              return (
              <span
                key={idx}
                className="border-b border-border py-3 text-sm text-text-secondary"
              >
                {content}
              </span>
              );
            })}
          </div>
        </motion.div>

      </div>
    </HubSection>
  );
}
// #endregion
