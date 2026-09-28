/*
  파일명: /app/(main)/agora/page.tsx
  기능: 광장 기본 페이지
  책임: 광장 첫 탭(AGORA_ITEMS[0], 공지사항)으로 보낸다.
*/ // ------------------------------

import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AGORA_ITEMS } from "@/constants/agora";
import { getLocalizedAlternates } from "@/lib/seo";

export async function generateMetadata() {
  const t = await getTranslations("agora.meta");
  return {
    title: t("title"),
    description: t("description"),
    alternates: await getLocalizedAlternates("/agora"),
  };
}

export default async function Page() {
  const locale = await getLocale();
  redirect({ href: AGORA_ITEMS[0].href, locale });
}
