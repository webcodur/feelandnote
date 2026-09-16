/*
  파일명: /app/(main)/explore/faction/FactionAtlasScreen.tsx
  기능: 세력도감 화면 — 대문과 테마 주소가 함께 그린다
  책임: 신화 탐색처럼 칩 상자 하나(섹션·테마·진영)로 고르고, 그 아래 테마·진영 설명과 탐색과 같은 인물 카드 격자를 보여 준다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import type { FeaturedTag } from "@/actions/home";
import { getTagFigureBooks } from "@/actions/home/getTagFigureBooks";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import FactionAtlasNav from "@/components/features/faction/atlas/FactionAtlasNav";
import { FactionGroupProvider, type FactionGroupMeta } from "@/components/features/faction/atlas/FactionGroupContext";
import FactionGroupIntro from "@/components/features/faction/atlas/FactionGroupIntro";
import FactionThemeMusic from "@/components/features/faction/atlas/FactionThemeMusic";
import FactionThemeView from "@/components/features/faction/atlas/FactionThemeView";
import { FormattedText, splitReadableParagraphs } from "@/components/ui";
import { PendingBlock, RetryBlock } from "@/components/ui/pending";
import Lane from "@/components/ui/pending/Lane";
import {
  buildFactionClusters,
  factionSectionKey,
  localizedTagDescription,
  localizedTagName,
  type FactionSection,
} from "@/lib/faction-sections";
import { getFactionThemeCelebs } from "@/lib/faction-theme-celebs";
import { getFactionGroupDescriptions } from "@/lib/faction-theme-groups";
import { getAlternates, toSeoDescription } from "@/lib/seo";
import { getCelebProfileUrl } from "@/lib/url";
import type { CelebProfile } from "@/types/home";
import type { Locale } from "@/types/locale";

interface FactionAtlasScreenProps {
  sections: FactionSection[];
  section: FactionSection;
  theme: FeaturedTag;
  locale: Locale;
  /** 테마 정식 주소에서만 켠다 — 구성원 목록 구조화 데이터를 싣는다 */
  withJsonLd?: boolean;
}

/* 테마 구성원 구조화 데이터 — 역할·긴 소개는 모달에만 뜨므로 이름·역할·인물 주소를 HTML에 남겨 검색이 읽게 한다 */
function buildThemeJsonLd(theme: FeaturedTag, name: string, celebs: CelebProfile[], locale: Locale) {
  const seoLocale = locale === "en" ? "en" : "ko";
  const pageUrl = getAlternates(`/explore/faction/${theme.slug}`, seoLocale).canonical;
  const description = localizedTagDescription(theme, locale);
  const members = new Map(theme.celebs.map((member) => [member.id, member]));
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": pageUrl,
    url: pageUrl,
    name,
    ...(description && { description: toSeoDescription(description) }),
    inLanguage: seoLocale,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: celebs.length,
      itemListElement: celebs.map((celeb, index) => {
        const member = members.get(celeb.id);
        const role = (locale === "en" ? member?.short_desc_en : member?.short_desc)?.trim();
        return {
          "@type": "ListItem",
          position: index + 1,
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

/* 테마 본문 — 카드 자료를 받아 명단 차례·진영으로 나눠 넘긴다.
   카드 직함은 탐색과 같은 인물 직함이다. 이 테마에서의 역할·긴 소개는 카드를 눌러 뜨는 모달이 보인다 */
async function ThemeBody({ theme, name, clusters, locale, withJsonLd }: {
  theme: FeaturedTag;
  name: string;
  clusters: { key: string; celebIds: string[] }[];
  locale: Locale;
  withJsonLd: boolean;
}) {
  /* 인물 카드와 테마 등장 작품을 함께 받는다 — 작품 선반은 격자 아래에 붙는 본문이라
     인물 카드만큼 기다려 준다. 작품 조회는 실패해도 빈 목록으로 돌아와 카드를 막지 않는다 */
  const [celebsResult, themeBooks] = await Promise.all([
    getFactionThemeCelebs(theme.id, theme.celebs.map((celeb) => celeb.id)).catch((error) => {
      console.error("[FactionAtlas] 인물 카드 조회 실패:", error);
      return null;
    }),
    getTagFigureBooks(theme.id, locale),
  ]);
  if (!celebsResult) return <RetryBlock />;
  const celebs = celebsResult;

  const byId = new Map<string, CelebProfile>(celebs.map((celeb) => [celeb.id, celeb]));
  const ordered = theme.celebs.flatMap((member) => byId.get(member.id) ?? []);
  // 모달 머리에 쓰는 이 테마에서의 역할·진영 — 영문 역할이 비면 한국어를 내보내지 않는다.
  // 진영이 하나뿐인 테마는 진영 이름이 테마와 겹치므로 붙이지 않는다
  const members: Record<string, { role: string | null; group: string | null }> = {};
  for (const member of theme.celebs) {
    members[member.id] = {
      role: (locale === "en" ? member.short_desc_en : member.short_desc)?.trim() || null,
      group: clusters.length > 1
        ? (locale === "en" ? member.group_label_en?.trim() || member.group_label : member.group_label) ?? null
        : null,
    };
  }

  // 테마를 옮기면 정렬·열린 모달을 처음 상태로 되돌린다
  return (
    <>
      {withJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildThemeJsonLd(theme, name, ordered, locale)).replace(/</g, "\\u003c") }}
        />
      )}
      <FactionThemeView
        key={theme.id}
        tagId={theme.id}
        themeName={name}
        celebs={ordered}
        clusters={clusters.map((cluster) => ({ key: cluster.key, celebs: cluster.celebIds.flatMap((id) => byId.get(id) ?? []) }))}
        members={members}
        themeBooks={themeBooks}
      />
    </>
  );
}

export default async function FactionAtlasScreen({ sections, section, theme, locale, withJsonLd = false }: FactionAtlasScreenProps) {
  const [t, pending, groupRows] = await Promise.all([
    getTranslations("explore.faction"),
    getTranslations("pending"),
    // 진영 설명은 곁들임이다 — 못 받아도 진영 줄과 카드는 그대로 보인다
    getFactionGroupDescriptions(theme.id).catch((error) => {
      console.error("[FactionAtlas] 진영 설명 조회 실패:", error);
      return [];
    }),
  ]);
  const name = localizedTagName(theme, locale);
  const paragraphs = splitReadableParagraphs(localizedTagDescription(theme, locale));

  // 영문 설명이 비면 한국어를 내보내지 않는다 — 신화 그룹 개요와 같은 규칙
  const groupDescriptions = new Map(groupRows.map((group) => [
    group.name,
    (locale === "en" ? group.description_en : group.description)?.trim() || null,
  ]));
  const clusters = buildFactionClusters(theme.celebs, locale).map((cluster, index) => ({ ...cluster, key: `cluster-${index}` }));
  // 진영이 하나뿐이면 고를 것이 없어 줄을 세우지 않는다
  const groups: FactionGroupMeta[] = clusters.length > 1
    ? clusters.map((cluster) => ({
      key: cluster.key,
      label: cluster.label,
      description: cluster.name ? groupDescriptions.get(cluster.name) ?? null : null,
      count: cluster.celebIds.length,
    }))
    : [];

  return (
    <AsyncIntlProvider>
      {/* 첫 진영부터 시작한다 — 테마를 옮기면 새 테마의 첫 진영으로 되돌린다 */}
      <FactionGroupProvider key={theme.id} initialKey={groups[0]?.key ?? null}>
        <div className="space-y-6 md:space-y-8">
          <FactionAtlasNav
            sections={sections.map((item) => ({
              key: factionSectionKey(item),
              name: localizedTagName(item.tag, locale),
              themes: item.themes.map((child) => ({
                slug: child.slug!,
                name: localizedTagName(child, locale),
                count: child.celebs.length,
              })),
            }))}
            activeSectionKey={factionSectionKey(section)}
            activeThemeSlug={theme.slug!}
            groups={groups}
          />

          {/* 지금 테마곡을 전역 음악 재생기에 「추천」으로 올린다 */}
          <FactionThemeMusic id={theme.id} title={name} url={theme.music?.url ?? null} />

          <header className="border-b border-white/10 pb-6">
            <div className="mx-auto max-w-3xl">
              {/* 제목은 가운데 — 인원 수는 제목 오른쪽에 떠 있어 가운데 맞춤에 끼어들지 않는다. 좌우 여백은 긴 제목이 수와 겹치지 않을 자리다 */}
              <div className="px-14 text-center">
                <h2 className="relative inline-block text-balance font-serif text-3xl font-bold text-text-primary md:text-4xl">
                  {name}
                  <span className="absolute start-full bottom-1 ms-3 whitespace-nowrap font-sans text-sm font-semibold tabular-nums text-accent/80">
                    {t("figureCount", { count: theme.celebs.length })}
                  </span>
                </h2>
              </div>
              {paragraphs.length > 0 && (
                <div className="mt-4 space-y-3 break-keep text-sm leading-7 text-text-secondary md:text-[15px] md:leading-8">
                  {paragraphs.map((paragraph, index) => (
                    <p key={index}>
                      <FormattedText text={paragraph} />
                    </p>
                  ))}
                </div>
              )}
              {/* 칩 상자에서 고른 진영의 설명 — 테마 설명 바로 아래 */}
              <FactionGroupIntro groups={groups} />
            </div>
          </header>

          <Lane key={theme.id} fallback={<PendingBlock variant="grid" count={12} label={pending("loading")} />}>
            <ThemeBody theme={theme} name={name} clusters={clusters} locale={locale} withJsonLd={withJsonLd} />
          </Lane>
        </div>
      </FactionGroupProvider>
    </AsyncIntlProvider>
  );
}
