import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCelebBySlug } from "@/actions/user/getCelebBySlug";
import { getPublicUserContents } from "@/actions/contents/getUserContents";
import { getContentBrief } from "@/actions/contents/getContentBrief";
import { getAlternates } from "@/lib/seo";
import RecordsPageBody from "../RecordsPageBody";
import { loadRecordsPage, recordsPath } from "../recordsPageData";

interface Props {
  params: Promise<{ locale: string; slug: string; page: string }>;
  searchParams: Promise<{ focus?: string }>;
}

export const revalidate = false;
export function generateStaticParams() { return []; }

const getPage = cache(async (slug: string, locale: string, page: string) => {
  const data = await loadRecordsPage(slug, locale, page, {
    getProfile: getCelebBySlug,
    getContents: getPublicUserContents,
    getBrief: getContentBrief,
  });
  if (!data) notFound();
  return data;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug, page } = await params;
  setRequestLocale(locale);
  const data = await getPage(slug, locale, page);
  const t = await getTranslations({ locale, namespace: "celebPage.records" });
  const args = { name: data.profile.nickname, page: data.page };
  const title = t("pageTitle", args);
  const description = t("description", args);
  const alternates = getAlternates(recordsPath(slug, data.page), locale === "en" ? "en" : "ko");
  return {
    title, description, alternates,
    robots: { index: true, follow: true },
    openGraph: { title, description, url: alternates.canonical, type: "website" },
  };
}

export default async function RecordsPage({ params, searchParams }: Props) {
  const { locale, slug, page } = await params;
  const { focus } = await searchParams;
  setRequestLocale(locale);
  const data = await getPage(slug, locale, page);
  const t = await getTranslations({ locale, namespace: "celebPage.records" });
  return <RecordsPageBody slug={slug} locale={locale} contents={data.contents} descriptions={data.descriptions}
    initialFocusContentId={focus} labels={{
    title: t("title", { name: data.profile.nickname }),
    page: t("page", { page: data.page, total: data.contents.totalPages }),
    back: t("back"), previous: t("previous"), next: t("next"), source: t("source"),
    emptyReview: t("emptyReview"), spoiler: t("spoiler"), originalLanguage: t("originalLanguage"),
    introduction: t("introduction"), myReview: t("myReview"),
  }} />;
}
