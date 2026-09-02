"use client";

import dynamic from "next/dynamic";
import { BookOpenText, Images, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import type { FictionSourceCharacter } from "@/actions/fiction/getFictionSources";

const ImageGalleryModal = dynamic(
  () => import("@/components/ui/ImageGalleryModal"),
  { ssr: false },
);

interface FictionCharactersSectionProps {
  characters: FictionSourceCharacter[];
}

export default function FictionCharactersSection({
  characters,
}: FictionCharactersSectionProps) {
  const t = useTranslations("contentDetail");
  const [preview, setPreview] = useState<FictionSourceCharacter | null>(null);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-start gap-2.5 rounded-lg border border-accent/20 bg-accent/[0.05] px-3 py-2.5">
        <BookOpenText size={16} className="mt-0.5 shrink-0 text-accent" />
        <p className="text-xs leading-relaxed text-text-secondary">
          {t("fictionCharactersIntro")}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {characters.map((character) => {
          const imageLabel = t("fictionCharacterImage", {
            name: character.nickname,
          });

          return (
            <div
              key={character.id}
              className="group flex h-[70px] items-stretch overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] hover:border-accent/60 hover:bg-accent/[0.07]"
            >
              <Link
                href={`/celeb/${character.slug}`}
                className="flex min-w-0 flex-1 items-stretch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
              >
                <span className="relative w-12 shrink-0 overflow-hidden border-e border-white/10 bg-bg-secondary">
                  {character.avatarUrl ? (
                    <CelebAvatarImage
                      src={character.avatarUrl}
                      alt=""
                      sizes="48px"
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
              </Link>

              {character.avatarUrl && (
                <button
                  type="button"
                  onClick={() => setPreview(character)}
                  aria-label={imageLabel}
                  aria-haspopup="dialog"
                  title={imageLabel}
                  className="my-auto me-2.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-text-secondary hover:border-accent/60 hover:bg-accent/[0.12] hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Images size={16} aria-hidden />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {preview?.avatarUrl && (
        <ImageGalleryModal
          images={[{ src: preview.avatarUrl, alt: preview.nickname }]}
          initialIndex={0}
          title={preview.nickname}
          labels={{
            close: t("imageViewer.close"),
            previous: t("imageViewer.previous"),
            next: t("imageViewer.next"),
          }}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
