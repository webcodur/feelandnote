/*
  파일명: /app/(main)/agora/feed/page.tsx
  기능: 레거시 피드 리다이렉트
  책임: 기존 /agora/feed URL을 /explore/feed로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function FeedRedirectPage() {
  const locale = await getLocale();
  redirect({ href: "/explore/feed", locale });
}
