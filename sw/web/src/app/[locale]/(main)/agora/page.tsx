/*
  파일명: /app/(main)/agora/page.tsx
  기능: 광장 기본 페이지
  책임: 기본값으로 피드 페이지로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getAlternates } from "@/lib/seo";

export async function generateMetadata() {
  const t = await getTranslations("agora.meta");
  return {
    title: t("title"),
    description: t("description"),
    alternates: getAlternates("/agora"),
  };
}

export default async function Page() {
  const locale = await getLocale();
  redirect({ href: "/agora/celeb-feed", locale });
}
