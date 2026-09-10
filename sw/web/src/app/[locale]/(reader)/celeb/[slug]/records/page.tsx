import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { getContentBrief } from "@/actions/contents/getContentBrief";
import { getPublicUserContents } from "@/actions/contents/getUserContents";
import { getCelebBySlug } from "@/actions/user/getCelebBySlug";
import { getAlternates } from "@/lib/seo";

import RecordsPageBody from "./RecordsPageBody";
import { loadRecords, recordsPath } from "./recordsPageData";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ focus?: string }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

const getRecords = cache(async (slug: string, locale: string) => {
  const data = await loadRecords(slug, locale, {
    getProfile: getCelebBySlug,
    getContents: getPublicUserContents,
    getBrief: getContentBrief,
  });
  if (!data) notFound();
  return data;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const data = await getRecords(slug, locale);
  const t = await getTranslations({ locale, namespace: "celebPage.records" });
  const title = t("pageTitle", { name: data.profile.nickname });
  const description = t("description", { name: data.profile.nickname });
  const alternates = getAlternates(recordsPath(slug), locale === "en" ? "en" : "ko");

  return {
    title,
    description,
    alternates,
    robots: { index: true, follow: true },
    openGraph: { title, description, url: alternates.canonical, type: "website" },
  };
}

export default async function RecordsPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const { focus } = await searchParams;
  setRequestLocale(locale);
  const data = await getRecords(slug, locale);
  const t = await getTranslations({ locale, namespace: "celebPage.records" });

  return (
    <RecordsPageBody
      slug={slug}
      locale={locale}
      contents={data.contents}
      descriptions={data.descriptions}
      initialFocusContentId={focus}
      labels={{
        title: t("title", { name: data.profile.nickname }),
        back: t("back"),
        source: t("source"),
        emptyReview: t("emptyReview"),
        spoiler: t("spoiler"),
        originalLanguage: t("originalLanguage"),
        introduction: t("introduction"),
        myReview: t("myReview"),
      }}
    />
  );
}
