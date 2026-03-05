"use client";

import type { FeaturedTag } from "@/actions/home";
import type { SpotlightLocation } from "./FeaturedSpotlight";
import { useTranslations } from "next-intl";
import CuratedSpotlightDesktop from "./CuratedSpotlightDesktop";

import type { DialogueSubtitleData } from "@/components/features/game/shared/hooks/useDialogue";

interface FeaturedSpotlightDesktopProps {
  activeTag: FeaturedTag | null;
  location?: Exclude<SpotlightLocation, "explore-mb">;
  onSubtitle?: (data: DialogueSubtitleData) => void;
}

export default function FeaturedSpotlightDesktop({
  activeTag,
  location = "main",
  onSubtitle,
}: FeaturedSpotlightDesktopProps) {

  const t = useTranslations("landing");
  const isExplore = location === "explore-pc";

  if (!activeTag) {
    return (
      <div className="w-full h-96 flex items-center justify-center border border-dashed border-border rounded-2xl bg-bg-card/30">
        <span className="text-text-tertiary font-serif italic">{t("noSpotlights")}</span>
      </div>
    );
  }

  return (
    <div className={`w-full flex flex-col ${isExplore ? "gap-10 md:gap-14" : "gap-8 md:gap-12"}`}>
      <div className="w-full flex flex-col relative">
        <CuratedSpotlightDesktop
          activeTag={activeTag}
          location={location}
          onSubtitle={onSubtitle}
        />
      </div>
    </div>
  );
}
