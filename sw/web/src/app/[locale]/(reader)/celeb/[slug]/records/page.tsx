import { cache } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { getContentBrief } from "@/actions/contents/getContentBrief";
import { getPublicUserContents } from "@/actions/contents/getUserContents";
import { getCelebBySlug } from "@/actions/user/getCelebBySlug";
import { getAlternates } from "@/lib/seo";

import RecordsPageBody from "./RecordsPageBody";
import { loadRecords, parseRecordsPage, recordsPath } from "./recordsPageData";

interface Props {
  params: Promise<{ locale: string; slug: string; page?: string }>;
  searchParams: Promise<{ focus?: string }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

const getRecords = cache(async (slug: string, locale: string, page: number, focus?: string) => {
  const data = await loadRecords(slug, locale, {
    getProfile: getCelebBySlug,
    getContents: getPublicUserContents,
    getBrief: getContentBrief,
  }, page, focus);
  if (!data) notFound();
  return data;
});

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug, page: pageParam } = await params;
  const { focus } = await searchParams;
  const page = parseRecordsPage(pageParam);
  if (page === null) notFound();
  setRequestLocale(locale);
  const data = await getRecords(slug, locale, page, focus);
  const t = await getTranslations({ locale, namespace: "celebPage.records" });
  const pageLabel = t("page", { page: data.contents.page, total: data.contents.totalPages });
  const title = `${t("pageTitle", { name: data.profile.nickname })}${data.contents.page > 1 ? ` · ${pageLabel}` : ""}`;
  const description = t("description", { name: data.profile.nickname });
  const alternates = getAlternates(recordsPath(slug, data.contents.page), locale === "en" ? "en" : "ko");

  return {
    title,
    description,
    alternates,
    robots: { index: true, follow: true },
    openGraph: { title, description, url: alternates.canonical, type: "website" },
  };
}

export default async function RecordsPage({ params, searchParams }: Props) {
  const { locale, slug, page: pageParam } = await params;
  const { focus } = await searchParams;
  const page = parseRecordsPage(pageParam);
  if (page === null) notFound();
  setRequestLocale(locale);
  const data = await getRecords(slug, locale, page, focus);
  if (pageParam === "1" || data.contents.page !== page) {
    const prefix = locale === "en" ? "/en" : "";
    const query = focus ? `?focus=${encodeURIComponent(focus)}` : "";
    redirect(`${prefix}${recordsPath(slug, data.contents.page)}${query}`);
  }
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
        previous: t("previous"),
        next: t("next"),
        page: t("page", { page: data.contents.page, total: data.contents.totalPages }),
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
