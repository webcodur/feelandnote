"use client";

import { AlignLeft, Image as ImageIcon, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CelebCardImage } from "@/components/shared/CelebCard";

const views = [
  { value: "avatar", Icon: UserRound },
  { value: "portrait", Icon: ImageIcon },
] as const;

/** 설명 표시 여부와 사진 종류를 독립적으로 고른다. */
export default function AtlasMemberViewToggle({ showDescription, imageMode, onDescriptionChange, onImageModeChange }: {
  showDescription: boolean;
  imageMode: CelebCardImage;
  onDescriptionChange: (show: boolean) => void;
  onImageModeChange: (value: CelebCardImage) => void;
}) {
  const t = useTranslations("explore.hub.myth.memberView");
  return (
    <div role="group" aria-label={t("label")} className="flex min-w-0 flex-wrap items-center justify-center gap-3">
      <button type="button" role="switch" data-member-description-toggle aria-label={t("description")} title={t("description")} aria-checked={showDescription}
        onClick={() => onDescriptionChange(!showDescription)}
        className={`grid size-11 shrink-0 place-items-center rounded-control border outline-none hover:border-accent/60 hover:bg-accent/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent ${showDescription ? "border-accent/60 bg-accent/15 text-accent shadow-[0_0_10px_rgba(212,175,55,0.16)]" : "border-line-strong bg-bg-main text-text-secondary"}`}>
        <AlignLeft size={18} aria-hidden />
      </button>
      <div role="group" aria-label={t("imageLabel")} className="inline-flex min-w-0 divide-x divide-line-strong overflow-hidden rounded-control border border-line-strong bg-bg-main">
        {views.map(({ value: view, Icon }) => (
          <button key={view} type="button" data-member-view={view} aria-label={t(view)} title={t(view)} aria-pressed={imageMode === view} onClick={() => onImageModeChange(view)}
            className={`grid size-11 shrink-0 place-items-center outline-none hover:bg-accent/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${imageMode === view ? "bg-accent/15 text-accent" : "text-text-secondary"}`}>
            <Icon size={18} aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
