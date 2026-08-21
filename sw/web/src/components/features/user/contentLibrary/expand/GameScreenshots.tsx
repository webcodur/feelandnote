"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import ContentImage from "@/components/ui/ContentImage";
import ImageGalleryModal, { type GalleryImage } from "@/components/ui/ImageGalleryModal";

interface GameScreenshotsProps {
  screenshots: string[];
  mediaEnabled?: boolean;
}

export default function GameScreenshots({
  screenshots,
  mediaEnabled = true,
}: GameScreenshotsProps) {
  const t = useTranslations("contentDetail");
  const tLanding = useTranslations("landing");
  const tAccessibility = useTranslations("shared.accessibility");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const visibleScreenshots = screenshots.slice(0, 6);
  const images = useMemo<GalleryImage[]>(
    () => visibleScreenshots.map((src, index) => ({
      src,
      alt: `${t("screenshots")} ${index + 1} / ${visibleScreenshots.length}`,
    })),
    [t, visibleScreenshots],
  );

  if (visibleScreenshots.length === 0) return null;

  const closeGallery = () => {
    const trigger = activeIndex == null ? null : triggerRefs.current[activeIndex];
    setActiveIndex(null);
    requestAnimationFrame(() => trigger?.focus());
  };

  return (
    <div>
      <h4 className="mb-2 text-sm font-medium text-text-secondary">{t("screenshots")}</h4>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {images.map((image, index) => (
          mediaEnabled ? (
            <button
              key={`${image.src}-${index}`}
              ref={(element) => { triggerRefs.current[index] = element; }}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={image.alt}
              aria-haspopup="dialog"
              className="group relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] hover:border-accent/70 hover:bg-accent/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ContentImage
                src={image.src}
                alt=""
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <span className="pointer-events-none absolute bottom-1.5 end-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[11px] tabular-nums text-white/80">
                {index + 1} / {images.length}
              </span>
            </button>
          ) : (
            <div key={`${image.src}-${index}`} aria-hidden className="relative aspect-video rounded-lg border border-white/10 bg-white/[0.03]" />
          )
        ))}
      </div>

      {activeIndex != null ? (
        <ImageGalleryModal
          images={images}
          initialIndex={activeIndex}
          title={t("screenshots")}
          labels={{
            close: tAccessibility("close"),
            previous: tLanding("previousPhoto"),
            next: tLanding("nextPhoto"),
          }}
          onClose={closeGallery}
        />
      ) : null}
    </div>
  );
}
