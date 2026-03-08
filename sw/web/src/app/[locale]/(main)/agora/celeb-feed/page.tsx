/*
  파일명: /app/(main)/agora/celeb-feed/page.tsx
  기능: 레거시 리다이렉트
  책임: /agora/celeb-feed → /explore/feed로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function CelebFeedRedirectPage() {
  const locale = await getLocale();
  redirect({ href: "/explore/feed", locale });
}
