import { getTranslations } from "next-intl/server";
import type { FeaturedFaction } from "@/actions/home";
import { getFactionFigureBooks } from "@/actions/home/getFactionFigureBooks";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import type { AtlasTheme } from "@/components/features/user/explore/myth/atlasNavigationData";
import { MYTH_OTHER_GROUP_ID } from "@/actions/home/mythTypes";
import FactionEntryView from "@/components/features/faction/entry/FactionEntryView";
import MythScreenSkeleton from "@/components/features/user/explore/myth/MythScreenSkeleton";
import { RetryBlock } from "@/components/ui/pending";
import Lane from "@/components/ui/pending/Lane";
import { buildFactionClusters, factionSectionKey, localizedFactionDescription, localizedFactionName, type FactionSection } from "@/lib/faction-sections";
import { getFactionCelebs } from "@/lib/faction-celebs";
import { getFactionGroupDescriptions } from "@/lib/faction-groups";
import { getFactionThemeImage, toFactionThemeData, type FactionThemeGroup } from "@/lib/faction-theme";
import { getAlternates, toSeoDescription } from "@/lib/seo";
import { getCelebProfileUrl } from "@/lib/url";
import type { CelebProfile } from "@/types/home";
import type { Locale } from "@/types/locale";

interface FactionScreenProps {
  sections: FactionSection[];
  section: FactionSection;
  entry: FeaturedFaction;
  locale: Locale;
  withJsonLd?: boolean;
}

function buildEntryJsonLd(entry: FeaturedFaction, name: string, celebs: CelebProfile[], locale: Locale) {
  const seoLocale = locale === "en" ? "en" : "ko";
  const pageUrl = getAlternates(`/explore/faction/${entry.slug}`, seoLocale).canonical;
  const description = localizedFactionDescription(entry, locale);
  const members = new Map(entry.celebs.map((member) => [member.id, member]));
  return {
    "@context": "https://schema.org", "@type": "CollectionPage", "@id": pageUrl,
    url: pageUrl, name,
    ...(description && { description: toSeoDescription(description) }),
    inLanguage: seoLocale,
    mainEntity: {
      "@type": "ItemList", numberOfItems: celebs.length,
      itemListElement: celebs.map((celeb, index) => {
        const member = members.get(celeb.id);
        const role = (locale === "en" ? member?.short_desc_en : member?.short_desc)?.trim();
        return {
          "@type": "ListItem", position: index + 1,
          item: {
            "@type": "Person",
            name: (locale === "en" && celeb.nickname_en) || celeb.nickname,
            url: getAlternates(getCelebProfileUrl({ id: celeb.id, slug: celeb.slug }), seoLocale).canonical,
            ...(role && { description: role }),
          },
        };
      }),
    },
  };
}

async function EntryBody({ entry, locale, withJsonLd, navigationTree, themeId, groupRows }: {
  entry: FeaturedFaction;
  locale: Locale;
  withJsonLd: boolean;
  navigationTree: AtlasTheme[];
  themeId: string;
  groupRows: FactionThemeGroup[];
}) {
  const [celebs, factionBooks] = await Promise.all([
    getFactionCelebs(entry.id, entry.celebs.map((celeb) => celeb.id)).catch((error) => {
      console.error("[Faction] 인물 조회 실패:", error);
      return null;
    }),
    getFactionFigureBooks(entry.id, locale),
  ]);
  if (!celebs) return <RetryBlock />;
  const byId = new Map(celebs.map((celeb) => [celeb.id, celeb]));
  const ordered = entry.celebs.flatMap((member) => byId.get(member.id) ?? []);
  const name = localizedFactionName(entry, locale);
  const hasGroups = buildFactionClusters(entry.celebs, locale).length > 1;
  const members = Object.fromEntries(entry.celebs.map((member) => [member.id, {
    role: (locale === "en" ? member.short_desc_en : member.short_desc)?.trim() || null,
    group: hasGroups ? (locale === "en" ? member.group_label_en?.trim() || member.group_label : member.group_label) ?? null : null,
  }]));
  return (
    <AsyncIntlProvider>
      {withJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(buildEntryJsonLd(entry, name, ordered, locale)).replace(/</g, "\\u003c"),
      }} />}
      <FactionEntryView key={entry.id} data={toFactionThemeData(entry, ordered, groupRows, factionBooks, locale)}
        navigationTree={navigationTree} themeId={themeId} celebs={ordered} members={members} factionBooks={factionBooks} />
    </AsyncIntlProvider>
  );
}

/** 신화와 같은 탐색판을 쓰되 섹션·테마의 정식 주소와 검색용 자료는 유지한다. */
export default async function FactionScreen({ sections, section, entry, locale, withJsonLd = false }: FactionScreenProps) {
  const [t, tMyth, groupRows] = await Promise.all([
    getTranslations("explore.faction"),
    getTranslations("explore.hub.myth"),
    getFactionGroupDescriptions(entry.id).catch((error) => {
      console.error("[Faction] 진영 설명 조회 실패:", error);
      return [];
    }),
  ]);
  // 선택 창은 이름·인원만 받는다. 다른 팩션의 인물 자료는 적용 후 해당 주소에서 받는다.
  const navigationTree: AtlasTheme[] = sections.map((item) => ({
    id: factionSectionKey(item), name: localizedFactionName(item.faction, locale),
    entries: item.entries.map((child) => {
      const groups = buildFactionClusters(child.celebs, locale);
      return {
        id: child.id, name: localizedFactionName(child, locale), count: child.celebs.length,
        href: `/explore/faction/${child.slug}`,
        groups: groups.length > 1 ? groups.map((group) => ({
          id: group.name ?? MYTH_OTHER_GROUP_ID, name: group.label ?? tMyth("otherGroup"), count: group.celebIds.length,
        })) : [],
      };
    }),
  }));
  return (
    <Lane key={entry.id} fallback={<MythScreenSkeleton title={t("title")}
      hasArtwork={Boolean(getFactionThemeImage(entry.slug))} />}>
      <EntryBody entry={entry} locale={locale} withJsonLd={withJsonLd} navigationTree={navigationTree} themeId={factionSectionKey(section)} groupRows={groupRows} />
    </Lane>
  );
}
