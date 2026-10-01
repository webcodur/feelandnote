"use client";

import { useTranslations } from "next-intl";
import MythScreen from "@/components/features/user/explore/myth/MythScreen";
import { mythLeadImage } from "@/components/features/user/explore/myth/mythLeadImage";
import type { MythData } from "@/actions/home/mythTypes";
import type { FactionFigureBook } from "@/actions/home/getFactionFigureBooks";
import type { AtlasTheme } from "@/components/features/user/explore/myth/atlasNavigationData";
import { isThemeBook } from "@/lib/figure-books/themeBooks";
import type { CelebProfile } from "@/types/home";
import FactionMemberModal, { type FactionMemberMeta } from "./FactionMemberModal";
import ThemeBookShelf from "./ThemeBookShelf";
import type { AtlasIndexGroup } from "@/components/features/user/explore/myth/AtlasIndex";

interface Props {
  data: MythData;
  navigationTree: AtlasTheme[];
  themeId: string;
  celebs: CelebProfile[];
  members: Record<string, FactionMemberMeta>;
  factionBooks: FactionFigureBook[];
  /** 화면 아래 전체 세력 목록 — 신화 화면의 「전체」 구획과 같은 자리에 선다 */
  indexHeading: string;
  indexGroups: AtlasIndexGroup[];
}

/** 선택 상태와 화면은 신화의 한 벌을 쓰고, 팩션의 책장과 소개 자료만 연결한다. */
export default function FactionEntryView({ data, navigationTree, themeId, celebs, members, factionBooks, indexHeading, indexGroups }: Props) {
  const t = useTranslations("explore.faction");
  const theme = data.myths[0];
  const byId = new Map(celebs.map((person) => [person.id, person]));
  return (
    <MythScreen data={data} indexHeading={indexHeading} indexGroups={indexGroups} faction={{
      navigationTree, themeId,
      title: t("title"), overviewLabel: t("overview"), overviewFallback: t("overviewFallback"), shelfTitle: t("worksTitle"),
      renderPerson: (person, onClose) => (
        <FactionMemberModal key={person.id} factionId={theme.id} factionName={theme.name}
          celeb={byId.get(person.id)!} meta={members[person.id]} portraitUrl={mythLeadImage(person, theme.id)} onClose={onClose} />
      ),
      renderWorks: (personIds) => {
        const ids = new Set(personIds);
        const books = factionBooks.filter((book) => book.memberIds.some((id) => ids.has(id)) || isThemeBook(book, theme.slug, theme.name, false));
        return <ThemeBookShelf key={personIds.join(",")} books={books} memberIds={personIds} name={theme.name} slug={theme.slug} isMyth={false} />;
      },
    }} />
  );
}
