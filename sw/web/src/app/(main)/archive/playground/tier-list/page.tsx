/*
  파일명: /app/(main)/archive/playground/tier-list/page.tsx
  기능: 티어리스트 페이지 리다이렉트
  책임: /archive/playground 페이지로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "next/navigation";

export default function Page() {
  redirect("/archive/playground");
}
