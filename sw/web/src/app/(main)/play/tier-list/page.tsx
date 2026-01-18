/*
  파일명: /app/(main)/play/tier-list/page.tsx
  기능: 티어리스트 페이지 리다이렉트
  책임: /play 페이지로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "next/navigation";

export default function Page() {
  redirect("/play");
}
