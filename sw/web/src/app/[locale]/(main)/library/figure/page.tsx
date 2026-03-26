/*
  파일명: /app/(main)/scriptures/figure/page.tsx
  기능: 레거시 리다이렉트
  책임: /scriptures/figure → /explore/today로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function FigureRedirectPage() {
  const locale = await getLocale();
  redirect({ href: "/explore/today", locale });
}
