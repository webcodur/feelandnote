/*
  파일명: /app/(main)/agora/feed/page.tsx
  기능: 레거시 피드 리다이렉트
  책임: 기존 /agora/feed URL을 /agora/celeb-feed로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "next/navigation";

export default function FeedRedirectPage() {
  redirect("/agora/celeb-feed");
}
