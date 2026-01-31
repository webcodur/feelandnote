/*
  파일명: /app/(main)/board/feedback/page.tsx
  기능: 피드백 목록 페이지
  책임: 피드백 목록을 보여준다.
*/ // ------------------------------

import { createClient } from "@/lib/supabase/server";
import { getFeedbacks } from "@/actions/board/feedbacks";
import FeedbackList from "@/components/features/board/feedbacks/FeedbackList";

export const metadata = { title: "피드백 | 게시판" };

const ITEMS_PER_PAGE = 10;

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function FeedbackPage({ searchParams }: Props) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10));
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { feedbacks, total } = await getFeedbacks({ limit: ITEMS_PER_PAGE, offset });

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <FeedbackList
      feedbacks={feedbacks}
      total={total}
      currentPage={currentPage}
      totalPages={totalPages}
      isLoggedIn={!!user}
    />
  );
}
