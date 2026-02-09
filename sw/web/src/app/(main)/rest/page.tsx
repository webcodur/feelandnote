/*
  파일명: /app/(main)/rest/page.tsx
  기능: 쉼터 기본 페이지
  책임: 기본값으로 업다운 페이지로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "next/navigation";
import { ARENA_SECTION_NAME } from "@/constants/arena";

export const metadata = { title: ARENA_SECTION_NAME };

export default function Page() {
  redirect("/rest/up-down");
}
