/*
  파일명: /app/(main)/agora/page.tsx
  기능: 광장 기본 페이지
  책임: 기본값으로 피드 페이지로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "next/navigation";
import { AGORA_SECTION_NAME } from "@/constants/agora";

export const metadata = { title: AGORA_SECTION_NAME };

export default function Page() {
  redirect("/agora/celeb-feed");
}
