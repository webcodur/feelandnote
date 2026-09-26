"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";
import BlurDissolve from "@/components/ui/BlurDissolve";
import FactionArtworkTitle from "./FactionArtworkTitle";
import { Z_INDEX } from "@/constants/zIndex";

interface Props {
  images: { url: string; label?: string | null; caption?: string | null }[];
  title: string;
  /** 세력 표지는 원본 오른쪽에 제목을 위한 여백이 있다. */
  titleInArtwork?: boolean;
  onClose: () => void;
  nested?: boolean;
}

/** 표지·인물 화보의 원본을 자르지 않고 연다. 개요 읽기와 독립된 창이다. */
export default function FactionArtworkViewer({ images, title, titleInArtwork = false, onClose, nested = false }: Props) {
  const t = useTranslations("explore.hub.myth");
  const tAccess = useTranslations("shared.accessibility");
  const [index, setIndex] = useState(0);
  const [dimensions, setDimensions] = useState<{ url: string; ratio: number } | null>(null);
  const image = images[index] ?? images[0];
  if (!image) return null;
  const ratio = dimensions?.url === image.url ? dimensions.ratio : 3 / 2;
  const move = (direction: number) => setIndex((current) => (current + direction + images.length) % images.length);
  const arrowClass = "grid size-10 place-items-center rounded-full border border-white/20 text-text-primary outline-none hover:border-accent hover:bg-accent/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <Modal isOpen onClose={onClose} title={titleInArtwork ? undefined : title} ariaLabel={title} stickyHeader frame="plain" widthClassName="max-w-[1200px]"
      boxClassName="overflow-hidden rounded-2xl border border-white/15 bg-bg-main" animateHeight={false} escapeCapture={nested} zIndex={nested ? Z_INDEX.modal + 1 : undefined}>
      <div className={titleInArtwork ? "@container relative mx-auto w-full bg-black/40" : "relative h-[min(70dvh,800px)] bg-black/40"}
        style={titleInArtwork ? { aspectRatio: ratio, maxWidth: `${70 * ratio}dvh` } : undefined} data-artwork-viewer>
        <button type="button" onClick={onClose} aria-label={tAccess("close")} data-artwork-dismiss
          className="absolute inset-0 cursor-zoom-out outline-none hover:ring-1 hover:ring-inset hover:ring-accent/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
        <BlurDissolve key={image.url} animateOnMount className="absolute inset-0">
          <Image src={image.url} alt={image.label ?? title} fill unoptimized className="object-contain"
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              if (naturalHeight > 0) setDimensions({ url: image.url, ratio: naturalWidth / naturalHeight });
            }} />
        </BlurDissolve>
        </button>
        {titleInArtwork && <FactionArtworkTitle title={title} heading />}
      </div>
      {image.caption && (
        <p data-artwork-caption className="mx-auto max-w-3xl break-keep px-4 py-4 text-center text-sm leading-relaxed text-text-primary [overflow-wrap:anywhere] md:px-8 md:py-5 md:text-base">
          {image.caption}
        </p>
      )}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-4 py-3">
          <button type="button" onClick={() => move(-1)} aria-label={t("previousImage")} className={arrowClass}><ChevronLeft size={18} aria-hidden /></button>
          <span aria-live="polite" className="text-sm tabular-nums text-text-secondary">{index + 1} / {images.length}</span>
          <button type="button" onClick={() => move(1)} aria-label={t("nextImage")} className={arrowClass}><ChevronRight size={18} aria-hidden /></button>
        </div>
      )}
    </Modal>
  );
}
