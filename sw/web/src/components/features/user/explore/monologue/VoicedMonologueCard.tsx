"use client";

import { useTranslations } from "next-intl";
import type { CelebBookShelf } from "@/actions/celebs/getCelebBookShelf";
import type { VirtualMonologueCeleb } from "@/actions/celebs/getVirtualMonologueCelebs";
import CelebBookShelfView from "@/components/features/celeb/CelebBookShelf";
import { isBookShelfAvailable } from "@/lib/books/bookShelf";
import ReadingPlayer from "@/components/shared/ReadingPlayer";

interface Props {
  celeb: VirtualMonologueCeleb;
  text: string;
  shelf: CelebBookShelf | null;
  shelfFailed: boolean;
  onShelfRetry?: () => void;
}

export default function VoicedMonologueCard({ celeb, text, shelf, shelfFailed, onShelfRetry }: Props) {
  const tMono = useTranslations("explore.monologue");
  const hasBooks = shelf && [
    ...shelf.appeared, ...shelf.authored, ...shelf.readBooks, ...shelf.professionBooks,
    ...shelf.factionGroups.flatMap(group => group.books),
  ].some(isBookShelfAvailable);

  return (
    <article className="min-w-0">
      <ReadingPlayer
        text={text}
        audioUrl={celeb.voiceUrl ?? ""}
        timingKind="monologue"
        celebId={celeb.id}
        readingLocale={celeb.voiceLocale}
        voiceV={celeb.voiceV}
      />

      {!shelf ? (
        <p className="relative mt-5 flex items-center gap-3 border-t border-white/10 pt-4 text-xs text-text-tertiary" role="status">
          {tMono(shelfFailed ? "bookShelfFailed" : "bookShelfLoading")}
          {shelfFailed && onShelfRetry ? (
            <button
              type="button"
              onClick={onShelfRetry}
              className="rounded-full border border-accent/50 px-3 py-1 text-xs font-semibold text-accent hover:bg-accent/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {tMono("retry")}
            </button>
          ) : null}
        </p>
      ) : hasBooks ? (
        <div className="mt-10 border-t border-white/10 pt-6 md:mt-12">
          <h3 className="mb-4 text-center font-serif text-lg font-bold text-text-primary md:text-xl">{tMono("bookShelf")}</h3>
          <CelebBookShelfView celebId={celeb.id} celebName={celeb.nickname} {...shelf} />
        </div>
      ) : <p className="mt-8 text-center text-sm text-text-tertiary">{tMono("bookShelfEmpty")}</p>}
    </article>
  );
}
