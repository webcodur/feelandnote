/*
  파일명: /components/features/user/flows/FlowCard.tsx
  기능: 플로우 카드 컴포넌트
  책임: 플로우의 메타데이터를 모자이크 썸네일 레이아웃으로 시각화한다.
*/
"use client";

import Image from "next/image";
import { Layers, Lock } from "lucide-react";
import type { FlowSummary } from "@/types/database";
import { BLUR_DATA_URL } from "@/constants/image";

interface FlowCardProps {
  flow: FlowSummary;
  onClick: () => void;
  className?: string;
}

/** 전체 스테이지에서 고유 썸네일 URL을 최대 max개 수집 */
function collectThumbnails(flow: FlowSummary, max: number): string[] {
  const urls: string[] = [];
  for (const stage of flow.stages || []) {
    for (const node of stage.nodes || []) {
      const url = node.content?.thumbnail_url;
      if (url && !urls.includes(url)) {
        urls.push(url);
        if (urls.length >= max) return urls;
      }
    }
  }
  return urls;
}

function Thumb({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        className="object-cover group-hover:scale-[1.06] transition-transform duration-700 ease-out"
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
      />
    </div>
  );
}

export default function FlowCard({ flow, onClick, className = "" }: FlowCardProps) {
  const thumbs = collectThumbnails(flow, 4);
  const count = thumbs.length;

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col w-full bg-[#141414] border border-white/[0.06] hover:border-accent/40 rounded-lg overflow-hidden transition-all duration-500 ${className}`}
    >
      {/* Mosaic Thumbnail Area */}
      <div className="relative w-full aspect-square overflow-hidden bg-[#0a0a0a]">
        {count >= 4 ? (
          <div className="grid grid-cols-2 grid-rows-2 gap-px w-full h-full">
            {thumbs.slice(0, 4).map((url, i) => (
              <Thumb key={i} src={url} alt={`${flow.name} ${i + 1}`} />
            ))}
          </div>
        ) : count === 3 ? (
          <div className="grid grid-cols-2 grid-rows-2 gap-px w-full h-full">
            <Thumb src={thumbs[0]} alt={flow.name} className="row-span-2" />
            <Thumb src={thumbs[1]} alt={flow.name} />
            <Thumb src={thumbs[2]} alt={flow.name} />
          </div>
        ) : count === 2 ? (
          <div className="grid grid-cols-2 gap-px w-full h-full">
            <Thumb src={thumbs[0]} alt={flow.name} />
            <Thumb src={thumbs[1]} alt={flow.name} />
          </div>
        ) : count === 1 ? (
          <Thumb src={thumbs[0]} alt={flow.name} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Layers size={48} className="text-white/[0.08]" strokeWidth={1} />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none" />

        {/* Node count badge */}
        {flow.node_count > 0 && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded-full flex items-center gap-1.5 border border-white/[0.08]">
            <Layers size={10} className="text-accent" />
            <span className="text-[10px] font-serif font-bold text-white/80">
              {flow.node_count}
            </span>
          </div>
        )}

        {/* Private badge */}
        {!flow.is_public && (
          <div className="absolute top-2 left-2 p-1.5 bg-black/60 backdrop-blur-sm rounded-full border border-white/[0.08]">
            <Lock size={10} className="text-text-secondary" />
          </div>
        )}
      </div>

      {/* Info Area */}
      <div className="flex-1 flex flex-col p-3 md:p-4">
        {/* Expanding gold accent line */}
        <div className="w-6 h-px bg-accent/30 group-hover:w-full group-hover:bg-accent/50 transition-all duration-500 ease-out mb-2" />

        <h3 className="text-sm md:text-[15px] font-serif font-bold text-white/90 group-hover:text-accent transition-colors duration-300 line-clamp-2 leading-snug text-left">
          {flow.name}
        </h3>

        <div className="mt-auto pt-2 flex items-center gap-1.5 text-[10px] md:text-[11px] text-text-secondary font-serif">
          {flow.stage_count > 0 && (
            <span>{flow.stage_count}단계</span>
          )}
          {flow.difficulty && (
            <>
              <span className="opacity-30">·</span>
              <span className="text-accent/50">Lv.{flow.difficulty}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
