/*
  파일명: /components/features/home/IntroFrame.tsx
  기능: 서비스 첫인사 액자 (알렉산더·나폴레옹·링컨 사례 + 표어 + 영감의 연쇄 안내)
  책임: 홈 환영판과 /about이 같은 액자를 그리도록 한 벌로 묶는다.
*/

"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight, Info } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Modal, { ModalBody } from "@/components/ui/Modal";
import InspirationChainGraphic from "./InspirationChainGraphic";

/**
 * [[인물명]] → 엑센트 색상
 * 《작품명》 → 텍스트 프라이머리
 * 나머지    → 기본 회색
 */
export function renderHighlighted(text: string): ReactNode[] {
  return text.split(/(\[\[.*?\]\]|《.*?》)/).map((seg, i) => {
    if (seg.startsWith("[[") && seg.endsWith("]]")) {
      const name = seg.slice(2, -2);
      if (name === "Feel&Note") {
        return (
          <span key={i} className="font-cormorant font-semibold tracking-wide inline-flex items-baseline ml-0.5 mr-1.5 text-[17px] md:text-xl whitespace-nowrap">
            <span className="logo-text-cream">FEEL</span>
            <span className="logo-text-sepia mx-1">&amp;</span>
            <span className="logo-text-cream">NOTE</span>
          </span>
        );
      }
      return (
        <span key={i} className="text-accent font-medium tracking-wide">
          {name}
        </span>
      );
    }
    if (seg.startsWith("《") && seg.endsWith("》")) {
      const book = seg.slice(1, -1);
      return (
        <span key={i} className="text-text-primary/95 font-medium tracking-wide">
          《{book}》
        </span>
      );
    }
    return <span key={i}>{seg}</span>;
  });
}

export interface IntroFrameLabels {
  intro: string;
  inspirationChainTitle: string;
  inspirationChains: {
    text: string;
    reader: { name: string; avatar_url: string | null } | null;
    author: { name: string; avatar_url: string | null } | null;
  }[][];
  inspirationConclusion: string;
}

export default function IntroFrame({
  labels,
  closingHref,
}: {
  labels: IntroFrameLabels;
  /** 주면 맺음 문장을 가운데 세우고, 눌렀을 때 그 화면으로 가는 문으로 만든다 */
  closingHref?: string;
}) {
  const [showRelayInfo, setShowRelayInfo] = useState(false);
  const paragraphs = labels.intro.split("\n\n");

  return (
    <div className="w-full max-w-2xl mx-auto min-w-0 md:px-6">
      <div className="relative min-w-0 px-4 py-6 md:px-10 md:py-12 bg-white/[0.02] rounded-sm">
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-5 h-5 md:w-7 md:h-7 border-t border-l border-accent/20" />
        <div className="absolute top-0 right-0 w-5 h-5 md:w-7 md:h-7 border-t border-r border-accent/20" />
        <div className="absolute bottom-0 left-0 w-5 h-5 md:w-7 md:h-7 border-b border-l border-accent/20" />
        <div className="absolute bottom-0 right-0 w-5 h-5 md:w-7 md:h-7 border-b border-r border-accent/20" />

        {/* Info Icon */}
        <button
          onClick={() => setShowRelayInfo(true)}
          className="absolute top-4 right-4 md:top-6 md:right-6 z-20 p-2 hover:text-accent bg-white/5 hover:bg-accent/10 rounded-full"
          title={labels.inspirationChainTitle}
        >
          <Info size={16} />
        </button>

        {/* Prose */}
        <div className="relative z-10 space-y-6 md:space-y-8 text-[14.5px] md:text-[16.5px] text-text-primary/80 leading-[2] md:leading-[2.1] break-keep font-light tracking-wide">
          {paragraphs.map((para, i) => {
            // 맺음 문장은 가운데 세우고, 누르면 서비스 소개로 가는 문으로 쓴다
            if (closingHref && i === paragraphs.length - 1) {
              return (
                <Link
                  key={i}
                  href={closingHref}
                  className="group flex w-full flex-wrap items-center justify-center gap-1.5 text-center hover:text-accent"
                >
                  <span className="whitespace-pre-line">{renderHighlighted(para)}</span>
                  <ChevronRight
                    size={18}
                    aria-hidden
                    className="shrink-0 text-accent transition-transform duration-300 group-hover:translate-x-1"
                  />
                </Link>
              );
            }
            return (
              <p key={i} className="whitespace-pre-line">{renderHighlighted(para)}</p>
            );
          })}
        </div>

      </div>

      <Modal
        isOpen={showRelayInfo}
        onClose={() => setShowRelayInfo(false)}
        title={labels.inspirationChainTitle}
        icon={Info}
      >
        <ModalBody className="py-4 px-3 md:py-5 md:px-5">
          <InspirationChainGraphic
            chains={labels.inspirationChains}
            conclusion={labels.inspirationConclusion}
          />
        </ModalBody>
      </Modal>
    </div>
  );
}
