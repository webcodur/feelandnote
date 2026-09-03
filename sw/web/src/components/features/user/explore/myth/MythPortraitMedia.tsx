"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MythPerson } from "@/actions/home/mythAtlasTypes";
import BlurDissolve from "@/components/ui/BlurDissolve";

interface Props { person: MythPerson }

export default function MythPortraitMedia({ person }: Props) {
  const t = useTranslations("explore.hub.myth");
  const [index, setIndex] = useState(0);
  const images = person.images.length > 0
    ? person.images
    : person.imageUrl ? [{ url: person.imageUrl }]
      : person.avatarUrl ? [{ url: person.avatarUrl }]
        : [];
  const activeImage = images[index] ?? images[0] ?? null;

  const move = (direction: -1 | 1) => {
    setIndex((current) => (current + direction + images.length) % images.length);
  };

  if (images.length === 0) {
    return <div className="absolute inset-0 flex items-center justify-center bg-bg-card text-8xl font-black text-accent/20">{person.name.slice(0, 1)}</div>;
  }

  return (
    <>
      {activeImage && (
        <BlurDissolve key={activeImage.url} className="absolute inset-0">
          <Image
            src={activeImage.url}
            alt={person.name}
            fill
            unoptimized
            sizes="(max-width: 1023px) 100vw, 42vw"
            className="object-cover"
            style={{
              objectPosition: activeImage.focus ? `${activeImage.focus.x}% ${activeImage.focus.y}%` : "50% 20%",
              // 대형 화보는 원본 그대로 둔다.
              filter: "none",
            }}
          />
        </BlurDissolve>
      )}

      {images.length > 1 && (
        <div role="group" aria-label={t("imageControls")} className="absolute end-4 top-4 z-20 flex items-center rounded-full border border-stone-heavy bg-bg-secondary/90 p-1 shadow-lg backdrop-blur-sm">
          <button type="button" onClick={() => move(-1)} aria-label={t("previousImage")} className="flex size-9 items-center justify-center rounded-full text-text-secondary hover:bg-accent/10 hover:text-accent">
            <ChevronLeft size={18} />
          </button>
          <span aria-live="polite" className="min-w-12 text-center text-sm font-bold tabular-nums text-text-primary">{index + 1}/{images.length}</span>
          <button type="button" onClick={() => move(1)} aria-label={t("nextImage")} className="flex size-9 items-center justify-center rounded-full text-text-secondary hover:bg-accent/10 hover:text-accent">
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </>
  );
}
