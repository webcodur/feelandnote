"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Clock,
  BookOpen,
  Building2,
  MapPin,
  Palette,
  ExternalLink,
  Search,
} from "lucide-react";
import Modal, { ModalBody } from "@/components/ui/Modal";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import type { Locale } from "@/types/locale";

interface WorkDetailItem {
  id: string;
  title: string;
  subTitle: string | null;
  typeLabel: string | null;
  roleLabel: string;
  yearStr: string | null;
  thumbnail: string | null;
  genreLabel: string | null;
  durationStr: string | null;
  publisher: string | null;
  pages: number | null;
  record_label: string | null;
  materialLabel: string | null;
  locationLabel: string | null;
  collectionLabel: string | null;
  imdb_id: string | null;
  description: string | null;
  searchUrl: string;
}

interface WorkDetailModalProps {
  item: WorkDetailItem | null;
  onClose: () => void;
  locale: Locale;
}

export type { WorkDetailItem };

export default function WorkDetailModal({
  item,
  onClose,
  locale,
}: WorkDetailModalProps) {
  const t = useTranslations("celebPage");
  const [imageOpen, setImageOpen] = useState(false);

  useEffect(() => {
    setImageOpen(false);
  }, [item]);

  if (!item) return null;

  const metaItems: { icon: typeof Clock; label: string }[] = [];
  if (item.genreLabel) metaItems.push({ icon: Clock, label: item.genreLabel });
  if (item.durationStr)
    metaItems.push({ icon: Clock, label: item.durationStr });
  if (item.publisher)
    metaItems.push({ icon: Building2, label: item.publisher });
  if (item.pages)
    metaItems.push({ icon: BookOpen, label: `${item.pages}p` });
  if (item.record_label)
    metaItems.push({ icon: Building2, label: item.record_label });
  if (item.materialLabel)
    metaItems.push({ icon: Palette, label: item.materialLabel });
  if (item.locationLabel)
    metaItems.push({ icon: MapPin, label: item.locationLabel });
  if (item.collectionLabel)
    metaItems.push({ icon: Building2, label: item.collectionLabel });

  return (
    <>
      <Modal isOpen onClose={onClose} size="md">
        <ModalBody className="p-0 max-h-[85vh] overflow-y-auto">
          {/* 포스터 */}
          {item.thumbnail && (
            <button
              type="button"
              onClick={() => setImageOpen(true)}
              className="relative w-full bg-black/30 flex items-center justify-center cursor-zoom-in group overflow-hidden"
              style={{ maxHeight: "320px" }}
            >
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                style={{ maxHeight: "320px" }}
                onError={(e) => {
                  (e.target as HTMLImageElement).parentElement!.style.display =
                    "none";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}

          {/* 본문 */}
          <div className="px-5 py-5 space-y-4">
            {/* 배지 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {item.typeLabel && (
                <span className="px-2 py-0.5 rounded bg-surface-hover text-text-secondary text-xs font-medium">
                  {item.typeLabel}
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-accent/10 text-accent text-xs font-medium">
                {item.roleLabel}
              </span>
              {item.yearStr && (
                <span className="text-xs text-text-tertiary font-mono">
                  {item.yearStr}
                </span>
              )}
            </div>

            {/* 제목 */}
            <div>
              <h2 className="text-lg font-medium text-text-primary leading-snug break-keep">
                {item.title}
              </h2>
              {item.subTitle && (
                <p className="text-sm text-text-secondary mt-1 break-keep">
                  {item.subTitle}
                </p>
              )}
            </div>

            {/* 메타 정보 */}
            {metaItems.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 border-t border-border/30">
                {metaItems.map((meta, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 text-sm text-text-secondary"
                  >
                    <meta.icon size={14} className="text-text-tertiary" />
                    {meta.label}
                  </span>
                ))}
              </div>
            )}

            {/* 설명 */}
            {item.description && (
              <div className="pt-1 border-t border-border/30">
                <p className="text-sm text-text-secondary leading-relaxed break-keep">
                  {item.description}
                </p>
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex items-center gap-2 pt-2">
              <a
                href={item.searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-colors"
              >
                <Search size={14} />
                {locale === "en" ? "Search" : "검색"}
              </a>
              {item.imdb_id && (
                <a
                  href={`https://www.imdb.com/title/${item.imdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors"
                >
                  <ExternalLink size={14} />
                  IMDb
                </a>
              )}
            </div>
          </div>
        </ModalBody>
      </Modal>

      {/* 이미지 확대 뷰어 */}
      {item.thumbnail && (
        <ImageViewerModal
          src={item.thumbnail}
          alt={item.title}
          isOpen={imageOpen}
          onClose={() => setImageOpen(false)}
        />
      )}
    </>
  );
}
