/*
  파일명: /app/(main)/explore/page.tsx
  기능: 탐색 기본 페이지
  책임: 기본값으로 셀럽 페이지로 리다이렉트한다.
*/ // ------------------------------

import { redirect } from "next/navigation";

export const metadata = {
  title: "탐색 - Feel&Note",
  description: "다양한 분야의 셀럽들과 그들의 인생 콘텐츠를 탐색해보세요.",
  openGraph: {
    title: "탐색 - Feel&Note",
    description: "다양한 분야의 셀럽들과 그들의 인생 콘텐츠를 탐색해보세요.",
  },
};

export default function Page() {
  redirect("/explore/celebs");
}
