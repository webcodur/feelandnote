"use client";

import { Clock, BookOpen, Building2, MapPin, Palette } from "lucide-react";
import ContentImage from "@/components/ui/ContentImage";
import { WORK_TYPE_EMOJI } from "./constants";
import type { LiveWorkItem, ResolvedWorkItem } from "./types";

interface WorkListItemProps {
  item: LiveWorkItem;
  resolved: ResolvedWorkItem;
  roleLabel: string;
  typeLabel: string | null;
  description: string | null;
  onClick: () => void;
}

export default function WorkListItem({ item, resolved: r, roleLabel, typeLabel, description, onClick }: WorkListItemProps) {
  return (
    <div
      className="w-full max-w-[300px] md:max-w-none cursor-pointer"
      onClick={onClick}
    >
      <div className="flex gap-3 p-3 rounded-xl border border-border/30 bg-surface/30 hover:bg-surface-hover/50 transition-colors">
        {/* 썸네일 */}
        {r.thumbnail ? (
          <div className="relative shrink-0 w-16 h-22 rounded-lg overflow-hidden bg-surface-hover">
            <ContentImage src={r.thumbnail} alt={r.title} sizes="64px" />
          </div>
        ) : (
          <div className="shrink-0 w-16 h-22 rounded-lg bg-surface-hover/50 flex items-center justify-center">
            <span className="text-lg">
              {WORK_TYPE_EMOJI[item.work_type || ""] || "📄"}
            </span>
          </div>
        )}

        {/* 정보 */}
        <div className="flex-1 min-w-0">
          {/* 배지 행 */}
          <div className="flex items-center gap-1.5 mb-1.5 text-xs">
            {typeLabel && (
              <span className="px-1.5 py-0.5 rounded bg-surface-hover text-text-secondary font-medium">
                {typeLabel}
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
              {roleLabel}
            </span>
            {r.yearStr && (
              <span className="font-mono">{r.yearStr}</span>
            )}
          </div>

          {/* 제목 */}
          <h3 className="text-sm font-medium text-text-primary leading-snug line-clamp-2">
            {r.title}
          </h3>
          {r.subTitle && (
            <p className="text-sm text-text-secondary mt-0.5 truncate">{r.subTitle}</p>
          )}

          {/* 메타 정보 */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs">
            {r.genreLabel && <span>{r.genreLabel}</span>}
            {r.durationStr && (
              <span className="flex items-center gap-0.5">
                <Clock size={10} />
                {r.durationStr}
              </span>
            )}
            {item.publisher && (
              <span className="flex items-center gap-0.5">
                <Building2 size={10} />
                {item.publisher}
              </span>
            )}
            {item.pages && (
              <span className="flex items-center gap-0.5">
                <BookOpen size={10} />
                {item.pages}p
              </span>
            )}
            {item.record_label && <span>{item.record_label}</span>}
            {r.materialLabel && (
              <span className="flex items-center gap-0.5">
                <Palette size={10} />
                {r.materialLabel}
              </span>
            )}
            {r.locationLabel && (
              <span className="flex items-center gap-0.5">
                <MapPin size={10} />
                {r.locationLabel}
              </span>
            )}
            {r.collectionLabel && <span>{r.collectionLabel}</span>}
            {item.imdb_id && (
              <span className="text-amber-400 font-bold">IMDb</span>
            )}
          </div>

          {/* 설명 */}
          {description && (
            <p className="text-sm text-text-secondary mt-1.5 line-clamp-2">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
