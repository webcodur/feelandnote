"use client";

import { BookOpenText, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import CelebImage from "@/components/ui/CelebImage";
import type { FictionSourceCharacter } from "@/actions/fiction/getFictionSources";

interface FictionCharactersSectionProps {
  characters: FictionSourceCharacter[];
}

export default function FictionCharactersSection({
  characters,
}: FictionCharactersSectionProps) {
  const t = useTranslations("contentDetail");

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-start gap-2.5 rounded-lg border border-accent/20 bg-accent/[0.05] px-3 py-2.5">
        <BookOpenText size={16} className="mt-0.5 shrink-0 text-accent" />
        <p className="text-xs leading-relaxed text-text-secondary">
          {t("fictionCharactersIntro")}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {characters.map((character) => (
          <Link
            key={character.id}
            href={`/celeb/${character.slug}`}
            className="group flex h-[70px] items-stretch overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] hover:border-accent/60 hover:bg-accent/[0.07] active:scale-[0.99]"
          >
            <span className="relative w-[68px] shrink-0 overflow-hidden border-e border-white/10 bg-bg-secondary [&_img]:rounded-none">
              {character.avatarUrl ? (
                <CelebImage
                  src={character.avatarUrl}
                  alt=""
                  sizes="68px"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-text-tertiary">
                  <UserRound size={18} />
                </span>
              )}
            </span>

            <span className="min-w-0 flex-1 self-center ps-3">
              <span className="block truncate text-sm font-semibold text-text-primary group-hover:text-accent">
                {character.nickname}
              </span>
              {character.title && (
                <span className="mt-0.5 block truncate text-[11px] text-text-secondary">
                  {character.title}
                </span>
              )}
            </span>

            <span className="my-auto me-2.5 shrink-0 rounded border border-accent/20 bg-accent/[0.06] px-1.5 py-0.5 text-[9px] font-medium text-accent/80">
              {t(`fictionRelation.${character.relationType}`)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
