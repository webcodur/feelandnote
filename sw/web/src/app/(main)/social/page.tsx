/*
  파일명: /app/(main)/social/page.tsx
  기능: 소셜 페이지 리다이렉트
  책임: /archive/feed 페이지로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "next/navigation";

export default function Page() {
  redirect("/archive/feed");
}
