/*
  파일명: /app/(main)/explore/page.tsx
  기능: 탐색 기본 페이지
  책임: 기본값으로 셀럽 페이지로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("explore.meta");
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
    },
  };
}

export default function Page() {
  redirect("/explore/celebs");
}
