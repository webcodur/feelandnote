/*
  파일명: /app/(main)/agora/page.tsx
  기능: 광장 기본 페이지
  책임: 기본값으로 피드 페이지로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("agora.meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function Page() {
  redirect("/agora/celeb-feed");
}
