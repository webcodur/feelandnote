/*
  파일명: /app/(main)/agora/feed/page.tsx
  기능: 레거시 피드 리다이렉트
  책임: 폐지한 피드 주소를 인물 페이지로 보낸다.
*/ // ------------------------------

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function FeedRedirectPage() {
  const locale = await getLocale();
  redirect({ href: "/explore", locale });
}
