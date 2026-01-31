/*
  파일명: /app/(main)/board/feedback/[id]/page.tsx
  기능: 피드백 상세 페이지
  책임: 피드백 상세 내용을 보여준다.
*/ // ------------------------------

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/checkAdmin";
import { getFeedback } from "@/actions/board/feedbacks";
import { getComments } from "@/actions/board/comments";
import FeedbackDetail from "@/components/features/board/feedbacks/FeedbackDetail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FeedbackDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [feedback, comments, admin, { data: { user } }] = await Promise.all([
    getFeedback(id),
    getComments({ boardType: "FEEDBACK", postId: id }),
    isAdmin(supabase),
    supabase.auth.getUser(),
  ]);

  if (!feedback) {
    notFound();
  }

  const isAuthor = user?.id === feedback.author_id;

  return (
    <FeedbackDetail
      feedback={feedback}
      isAuthor={isAuthor}
      initialComments={comments}
      isAdmin={admin}
      currentUserId={user?.id}
    />
  );
}
