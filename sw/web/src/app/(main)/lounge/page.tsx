/*
  파일명: /app/(main)/lounge/page.tsx
  기능: 라운지 기본 페이지
  책임: 기본값으로 업다운 페이지로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "next/navigation";

export const metadata = { title: "라운지" };

export default function Page() {
  redirect("/lounge/higher-lower");
}
