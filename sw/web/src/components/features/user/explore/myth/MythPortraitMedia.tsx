"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MythPerson } from "@/actions/home/mythAtlasTypes";
import BlurDissolve from "@/components/ui/BlurDissolve";

export interface MythPortrait {
  url: string;
  /** 음성 재생 기준 초. 대사용 화보 묶음에서만 온다 */
  at?: number;
  focus?: { x: number; y: number };
}

interface Props {
  person: MythPerson;
  /** 걸어 둘 화보들. 대사 묶음이 있으면 그 화보가 오고, 없으면 대표 사진 한 장이다 */
  images: MythPortrait[];
  /** 지금 보이는 화보. 대사 재생 중에는 발화 시각이 이 값을 옮긴다 */
  index: number;
  onMove: (index: number) => void;
}

export default function MythPortraitMedia({ person, images, index, onMove }: Props) {
  const t = useTranslations("explore.hub.myth");
  const activeImage = images[index] ?? images[0] ?? null;

  const move = (direction: -1 | 1) => {
    onMove((index + direction + images.length) % images.length);
  };

  if (images.length === 0) {
    return (
      <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[radial-gradient(circle_at_50%_28%,rgba(217,181,78,.13),transparent_55%),var(--color-bg-card)]">
        <span className="grid size-28 place-items-center rounded-full border border-accent/30 bg-accent/[0.06] shadow-[0_0_60px_rgba(217,181,78,.12)]">
          <span className="grid size-24 place-items-center rounded-full border border-accent/20 text-5xl font-black text-accent">{person.name.slice(0, 1)}</span>
        </span>
      </div>
    );
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
