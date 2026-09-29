import { cache } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { getContentBrief } from "@/actions/contents/getContentBrief";
import { getPublicUserContents } from "@/actions/contents/getUserContents";
import { withParticle } from "@/lib/korean-particle";
import { getCelebRouteProfile } from "@/lib/profile-route";
import { getAlternates } from "@/lib/seo";

import RecordsPageBody from "./RecordsPageBody";
import { loadRecords, parseRecordsPage, recordsPath, recordsSuffix } from "./recordsPageData";

interface Props {
  params: Promise<{ locale: string; slug: string; page?: string }>;
  searchParams: Promise<{ focus?: string }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

const getRecords = cache(async (slug: string, locale: string, page: number, focus?: string) => {
  const suffix = recordsSuffix(page) + (focus ? `?focus=${encodeURIComponent(focus)}` : "");
  const data = await loadRecords(slug, locale, {
    getProfile: async (slug, locale) => ({
      success: true,
      data: await getCelebRouteProfile(slug, locale, suffix),
    }),
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
  // 한국어 문구는 조사를 이름 받침에 맞춘 {subject}를 쓴다(「빌 게이츠가」). 영어 문구는 {name}만 쓴다.
  const description = t("description", {
    name: data.profile.nickname,
    subject: withParticle(data.profile.nickname, "subject"),
  });
  const alternates = getAlternates(recordsPath(slug, data.contents.page), locale === "en" ? "en" : "ko");

  return {
    title,
    description,
    alternates,
    robots: { index: true, follow: true },
    // openGraph는 선언하지 않는다 — 선언하면 레이아웃의 대표 이미지가 빠져 공유 미리보기에 그림이 없었다.
    // 제목·설명은 Next가 이 페이지의 title·description으로 채운다([locale]/layout.tsx)
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
