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
