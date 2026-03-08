/*
  파일명: /app/(main)/explore/celebs/page.tsx
  기능: 레거시 리다이렉트
  책임: /explore/celebs → /explore/figures로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function CelebsRedirectPage() {
  const locale = await getLocale();
  redirect({ href: "/explore/figures", locale });
}
