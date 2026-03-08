/*
  파일명: /app/(main)/explore/top-by-type/page.tsx
  기능: 레거시 리다이렉트
  책임: /explore/top-by-type → /explore/ranking으로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function TopByTypeRedirectPage() {
  const locale = await getLocale();
  redirect({ href: "/explore/ranking", locale });
}
