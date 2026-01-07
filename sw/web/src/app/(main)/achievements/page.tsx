/*
  파일명: /app/(main)/achievements/page.tsx
  기능: 업적 페이지 리다이렉트
  책임: /profile 페이지로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "next/navigation";

export default function Page() {
  redirect("/profile");
}
