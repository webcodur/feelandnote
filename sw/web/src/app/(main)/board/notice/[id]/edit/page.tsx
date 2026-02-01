/*
  파일명: /app/(main)/board/notice/[id]/edit/page.tsx
  기능: 공지사항 수정 페이지
  책임: 관리자가 공지사항을 수정할 수 있다.
*/ // ------------------------------

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/checkAdmin";
import { getNotice } from "@/actions/board/notices";
import NoticeForm from "@/components/features/board/notices/NoticeForm";
import { getBoardPageTitle } from "@/constants/board";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: getBoardPageTitle("notice", "수정") };

export default async function NoticeEditPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = await isAdmin(supabase);

  if (!admin) {
    redirect("/board/notice");
  }

  const notice = await getNotice(id);

  if (!notice) {
    notFound();
  }

  return <NoticeForm mode="edit" notice={notice} />;
}
