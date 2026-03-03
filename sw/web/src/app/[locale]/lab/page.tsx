/*
  파일명: /app/lab/page.tsx
  기능: Lab 기본 페이지
  책임: 기본값으로 컨텐츠 카드 페이지로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function Page() {
  const locale = await getLocale();
  redirect({ href: "/lab/content-cards", locale });
}
