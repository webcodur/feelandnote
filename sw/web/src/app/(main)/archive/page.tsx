/*
  파일명: /app/(main)/archive/page.tsx
  기능: 기록관 루트 페이지
  책임: 로그인 여부에 따라 사용자 기록관으로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 로그인한 사용자는 /archive/user/{userId}로 리다이렉트
  if (user) {
    redirect(`/archive/user/${user.id}`);
  }

  // 비로그인 사용자는 로그인 페이지로
  redirect("/login");
}
