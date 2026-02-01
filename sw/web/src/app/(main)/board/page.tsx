/*
  파일명: /app/(main)/board/page.tsx
  기능: 게시판 기본 페이지
  책임: 기본값으로 공지사항 페이지로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "next/navigation";
import { BOARD_SECTION_NAME } from "@/constants/board";

export const metadata = { title: BOARD_SECTION_NAME };

export default function Page() {
  redirect("/board/notice");
}
