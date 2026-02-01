/*
  파일명: /app/(main)/board/feedback/[id]/edit/page.tsx
  기능: 피드백 수정 페이지
  책임: 작성자가 피드백을 수정할 수 있다.
*/ // ------------------------------

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFeedback } from "@/actions/board/feedbacks";
import FeedbackForm from "@/components/features/board/feedbacks/FeedbackForm";
import { getBoardPageTitle } from "@/constants/board";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: getBoardPageTitle("feedback", "수정") };

export default async function FeedbackEditPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const feedback = await getFeedback(id);

  if (!feedback) {
    notFound();
  }

  // 본인 글이 아니거나 PENDING 상태가 아니면 접근 불가
  if (feedback.author_id !== user.id || feedback.status !== "PENDING") {
    redirect(`/board/feedback/${id}`);
  }

  return <FeedbackForm mode="edit" initialData={feedback} />;
}
