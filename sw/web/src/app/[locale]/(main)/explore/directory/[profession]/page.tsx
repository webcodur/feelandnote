/*
  파일명: /app/(main)/explore/directory/[profession]/page.tsx
  기능: 직군별 인물 명부 (SEO용 중간 허브)
  책임: 전체 명부 한 장에 1,700여 링크가 몰려 크롤러가 인물 사이의 경중을 읽지 못하던 구조를
        직군 단위(수십~수백 명)로 쪼갠다. 직군명이 제목·본문에 서고 링크마다 한 줄 직함이 붙어
        "직군 + 인물" 검색어와 이어질 단서를 만든다. 직군 목록은 CELEB_PROFESSIONS 상수가 쥔다.
*/ // ------------------------------

import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCelebDirectory } from "@/actions/celebs/getCelebDirectory";
import { getLocalizedAlternates } from "@/lib/seo";
import { PROFESSION_ICONS, PROFESSION_COLORS } from "@/constants/professionIcons";
import { CELEB_PROFESSIONS } from "@/constants/celebProfessions";

// 정적(ISR). 전체 명부(directory)와 같은 주기 — 인물 등록·삭제 때 'celebs' 태그가 비운다.
export const revalidate = 604800;

// 상위 [locale]에 params가 없어 빌드 생성이 안 된다 — 전체 명부와 같이 첫 요청에 ISR로 만든다.
// 직군 상수 밖 문자열은 본문에서 404로 보낸다.
export function generateStaticParams() {
  return [];
}

interface PageProps {
  params: Promise<{ locale: string; profession: string }>;
}

function resolveProfession(value: string) {
  return CELEB_PROFESSIONS.find((prof) => prof.value === value) ?? null;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale, profession } = await params;
  setRequestLocale(locale);
  const prof = resolveProfession(profession);
  if (!prof) return {};

  const t = await getTranslations("explore.directory");
  const label = locale === "en" ? prof.label_en : prof.label;
  const celebs = await getCelebDirectory();
  const count = celebs.filter((c) => c.profession === prof.value).length;

  return {
    title: t("professionMetaTitle", { profession: label }),
    description: t("professionMetaDescription", { profession: label, count }),
    alternates: await getLocalizedAlternates(`/explore/directory/${prof.value}`),
  };
}

/** 목록 항목 한 줄 — 전체 명부와 같은 즉각 반응 hover */
const ITEM_CLASS =
  "group flex items-baseline gap-2 py-1.5 text-sm text-text-primary hover:text-accent";

export default async function ProfessionDirectoryPage({ params }: PageProps) {
  const { locale, profession } = await params;
  setRequestLocale(locale);

  const prof = resolveProfession(profession);
  if (!prof) notFound();

  const t = await getTranslations("explore.directory");
  const label = locale === "en" ? prof.label_en : prof.label;
  const localePrefix = locale === "en" ? "/en" : "";

  const celebs = await getCelebDirectory();
  const members = celebs.filter((c) => c.profession === prof.value);
  const Icon = PROFESSION_ICONS[prof.value];
  const color = PROFESSION_COLORS[prof.value] ?? "";

  return (
    <div className="max-w-4xl mx-auto">
      {/* 제목 — 직군명이 페이지의 검색 단서다 */}
      <div className="mb-8 space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-serif font-bold text-text-primary">
          {Icon && <Icon size={22} className={color} />}
          {t("professionHeading", { profession: label })}
        </h1>
        <p className="text-sm text-text-secondary">
          {t("professionCount", { count: members.length })}
        </p>
      </div>

      {/* 인물 목록 — 색인용 명부라 순수 링크(<a>)로 그린다(전체 명부와 같은 이유) */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0.5 mb-12">
        {members.map((celeb) => {
          const displayName =
            locale === "en" && celeb.nickname_en ? celeb.nickname_en : celeb.nickname;
          const title = locale === "en" ? celeb.title_en ?? celeb.title : celeb.title;
          return (
            <li key={celeb.slug}>
              <a href={`${localePrefix}/celeb/${celeb.slug}`} className={ITEM_CLASS}>
                <span className="font-medium shrink-0">{displayName}</span>
                {title && (
                  <span className="truncate text-xs text-text-secondary">{title}</span>
                )}
              </a>
            </li>
          );
        })}
      </ul>

      {/* 다른 직군 명부 — 직군 페이지끼리 서로 이어 한 장이 고립되지 않게 한다 */}
      <nav aria-label={t("otherProfessions")} className="border-t border-white/5 pt-6 space-y-3">
        <h2 className="text-sm font-semibold text-text-secondary">
          {t("otherProfessions")}
        </h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {CELEB_PROFESSIONS.filter((p) => p.value !== prof.value).map((p) => (
            <li key={p.value}>
              <a
                href={`${localePrefix}/explore/directory/${p.value}`}
                className="text-sm text-text-secondary hover:text-accent"
              >
                {locale === "en" ? p.label_en : p.label}
              </a>
            </li>
          ))}
          <li>
            <a
              href={`${localePrefix}/explore/directory`}
              className="text-sm text-accent/80 hover:text-accent"
            >
              {t("backToDirectory")}
            </a>
          </li>
        </ul>
      </nav>
    </div>
  );
}
