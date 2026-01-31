/*
  파일명: /app/(main)/board/feedback/write/page.tsx
  기능: 피드백 작성 페이지
  책임: 로그인한 사용자가 피드백을 작성할 수 있다.
*/ // ------------------------------

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FeedbackForm from "@/components/features/board/feedbacks/FeedbackForm";

export const metadata = { title: "피드백 작성 | 게시판" };

export default async function FeedbackWritePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <FeedbackForm mode="create" />;
}
