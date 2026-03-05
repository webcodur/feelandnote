/*
  파일명: /app/(main)/agora/friend-feed/page.tsx
  기능: 레거시 리다이렉트
  책임: /agora/friend-feed → /agora/social-feed로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function FriendFeedRedirectPage() {
  const locale = await getLocale();
  redirect({ href: "/agora/social-feed", locale });
}
