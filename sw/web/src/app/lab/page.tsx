/*
  파일명: /app/lab/page.tsx
  기능: Lab 기본 페이지
  책임: 기본값으로 컨텐츠 카드 페이지로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "next/navigation";

export default function Page() {
  redirect("/lab/content-cards");
}
