/*
  파일명: /app/(main)/dashboard/page.tsx
  기능: 대시보드 페이지 리다이렉트
  책임: /archive 페이지로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "next/navigation";

export default function Page() {
  redirect("/archive");
}
