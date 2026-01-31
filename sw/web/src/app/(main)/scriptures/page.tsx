/*
  파일명: /app/(main)/scriptures/page.tsx
  기능: 지혜의 서고 기본 페이지
  책임: 기본값으로 인물들의 선택 페이지로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "next/navigation";

export const metadata = { title: "지혜의 서고" };

export default function Page() {
  redirect("/scriptures/chosen");
}
