"use client";

import { useState } from "react";
import type { AchievementData } from "@/actions/achievements";
import { updateShowcaseTitles } from "@/actions/achievements";
import ShowcaseSection from "./AchievementShowcase";
import CatalogSection from "./AchievementCatalog";

interface ProfileAchievementsSectionProps {
  achievements: AchievementData;
  showcaseCodes: string[];
  isOwner?: boolean;
}

export default function ProfileAchievementsSection({ achievements, showcaseCodes: initialShowcaseCodes, isOwner = true }: ProfileAchievementsSectionProps) {
  const [showcaseCodes, setShowcaseCodes] = useState<string[]>(initialShowcaseCodes);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAddToShowcase = async (code: string) => {
    if (isUpdating || showcaseCodes.length >= 3 || showcaseCodes.includes(code)) return;
    const next = [...showcaseCodes, code];
    setIsUpdating(true);
    const result = await updateShowcaseTitles(next);
    if (result.success) setShowcaseCodes(next);
    setIsUpdating(false);
  };

  const handleRemoveFromShowcase = async (code: string) => {
    if (isUpdating) return;
    const next = showcaseCodes.filter(c => c !== code);
    setIsUpdating(true);
    const result = await updateShowcaseTitles(next);
    if (result.success) setShowcaseCodes(next);
    setIsUpdating(false);
  };

  return (
    <section className="space-y-4 animate-fade-in" style={{ animationDelay: "0.4s" }}>
      <ShowcaseSection
        showcaseCodes={showcaseCodes}
        titles={achievements.titles}
        isOwner={isOwner}
        isUpdating={isUpdating}
        onRemove={handleRemoveFromShowcase}
      />
      <CatalogSection
        achievements={achievements}
        showcaseCodes={showcaseCodes}
        isOwner={isOwner}
        isUpdating={isUpdating}
        onAddToShowcase={handleAddToShowcase}
      />
    </section>
  );
}
