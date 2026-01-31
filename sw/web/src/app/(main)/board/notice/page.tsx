/*
  파일명: /app/(main)/board/notice/page.tsx
  기능: 공지사항 목록 페이지
  책임: 공지사항 목록을 보여준다.
*/ // ------------------------------

import { getNotices } from "@/actions/board/notices";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/checkAdmin";
import NoticeList from "@/components/features/board/notices/NoticeList";

export const metadata = { title: "공지사항 | 게시판" };

const ITEMS_PER_PAGE = 10;

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function NoticePage({ searchParams }: Props) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10));
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const supabase = await createClient();
  const [{ notices, total }, admin] = await Promise.all([
    getNotices({ limit: ITEMS_PER_PAGE, offset }),
    isAdmin(supabase),
  ]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <NoticeList
      notices={notices}
      total={total}
      currentPage={currentPage}
      totalPages={totalPages}
      isAdmin={admin}
    />
  );
}
