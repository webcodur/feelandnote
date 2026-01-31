/*
  파일명: /app/(main)/board/notice/write/page.tsx
  기능: 공지사항 작성 페이지
  책임: 관리자가 공지사항을 작성할 수 있다.
*/ // ------------------------------

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/checkAdmin";
import NoticeForm from "@/components/features/board/notices/NoticeForm";

export const metadata = { title: "공지사항 작성 | 게시판" };

export default async function NoticeWritePage() {
  const supabase = await createClient();
  const admin = await isAdmin(supabase);

  if (!admin) {
    redirect("/board/notice");
  }

  return <NoticeForm mode="create" />;
}
