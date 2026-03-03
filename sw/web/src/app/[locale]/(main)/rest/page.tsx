/*
  파일명: /app/(main)/rest/page.tsx
  기능: 쉼터 기본 페이지
  책임: 기본값으로 여명 페이지로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("rest.meta");
  return { title: t("title"), description: t("description") };
}

export default async function Page() {
  const locale = await getLocale();
  redirect({ href: "/rest/dawn", locale });
}
