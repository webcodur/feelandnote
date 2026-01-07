/*
  파일명: /app/(main)/profile/page.tsx
  기능: 프로필 페이지 리다이렉트
  책임: /profile/stats 페이지로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "next/navigation";

export default function Page() {
  redirect("/profile/stats");
}
