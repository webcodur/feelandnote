"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { MythData } from "@/actions/home/mythTypes";
import type { FactionFigureBook } from "@/actions/home/getFactionFigureBooks";
import MythScreen from "@/components/features/user/explore/myth/MythScreen";
import { mythLeadImage } from "@/components/features/user/explore/myth/mythLeadImage";
import AffiliateBookList from "@/components/shared/AffiliateBookList";
import type { AtlasTheme } from "@/components/features/user/explore/myth/atlasNavigationData";
import { getBookStorePlatform } from "@/constants/affiliatePlatforms";
import type { CelebProfile } from "@/types/home";
import FactionMemberModal, { type FactionMemberMeta } from "./FactionMemberModal";

interface Props {
  data: MythData;
  navigationTree: AtlasTheme[];
  themeId: string;
  celebs: CelebProfile[];
  members: Record<string, FactionMemberMeta>;
  factionBooks: FactionFigureBook[];
}

function Works({ books }: { books: FactionFigureBook[] }) {
  const t = useTranslations("explore.faction");
  const tMore = useTranslations("shared.libraryShelf");
  const tBooks = useTranslations("popularBooks");
  const tCeleb = useTranslations("celebPage");
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  if (!books.length) return null;
  return (
    <div className="mt-4 overflow-hidden rounded-[24px] bg-black/[0.14] px-5 py-6 md:px-8 md:py-8">
      <AffiliateBookList books={expanded ? books : books.slice(0, 12)} heading={t("works")}
        buyLabel={locale === "en" ? tCeleb("sourceWorkBuyAmazon") : tBooks("buy")} platform={getBookStorePlatform(locale)} />
      {!expanded && books.length > 12 && (
        <div className="mt-5 flex justify-center">
          <button type="button" onClick={() => setExpanded(true)} className="min-h-10 rounded-full border border-white/15 px-5 text-sm font-semibold text-text-secondary outline-none hover:border-accent/60 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent">
            {tMore("more", { count: books.length - 12 })}
          </button>
        </div>
      )}
    </div>
  );
}

/** 선택 상태와 화면은 신화의 한 벌을 쓰고, 팩션의 책장과 소개 자료만 연결한다. */
export default function FactionEntryView({ data, navigationTree, themeId, celebs, members, factionBooks }: Props) {
  const t = useTranslations("explore.faction");
  const theme = data.myths[0];
  const byId = new Map(celebs.map((person) => [person.id, person]));
  return (
    <MythScreen data={data} faction={{
      navigationTree, themeId,
      title: t("title"), overviewLabel: t("overview"), overviewFallback: t("overviewFallback"),
      renderPerson: (person, onClose) => (
        <FactionMemberModal key={person.id} factionId={theme.id} factionName={theme.name}
          celeb={byId.get(person.id)!} meta={members[person.id]} portraitUrl={mythLeadImage(person, theme.id)} onClose={onClose} />
      ),
      renderWorks: (personIds) => {
        const ids = new Set(personIds);
        const books = factionBooks.filter((book) => book.memberIds.some((id) => ids.has(id)));
        return <Works key={personIds.join(",")} books={books} />;
      },
    }} />
  );
}
