/*
  파일명: /app/reading/page.tsx
  기능: 독서 모드 메인 페이지
  책임: 독서 몰입 환경 + 보편적 독서 지원 콘텐츠 제공
*/ // ------------------------------

import { redirect } from "next/navigation";
import { getProfile } from "@/actions/user";
import ReadingWorkspace from "./components/ReadingWorkspace";

export default async function ReadingPage() {
  const profile = await getProfile();

  return (
    <ReadingWorkspace
      userId={profile?.id}
    />
  );
}
