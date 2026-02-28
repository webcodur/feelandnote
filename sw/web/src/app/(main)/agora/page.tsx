/*
  파일명: /app/(main)/agora/page.tsx
  기능: 광장 기본 페이지
  책임: 기본값으로 피드 페이지로 리다이렉트한다.
*/ // ------------------------------

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AGORA_SECTION_NAME } from "@/constants/agora";

export const metadata: Metadata = {
  title: AGORA_SECTION_NAME,
  description: "셀럽 피드, 자유 게시판, 공지사항 등 Feel&Note 커뮤니티 광장. 감상을 나누고 영감을 공유하세요.",
};

export default function Page() {
  redirect("/agora/celeb-feed");
}
