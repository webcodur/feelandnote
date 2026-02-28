import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "서가",
  description: "시대별, 직군별, 인물별로 정리된 감상 아카이브. 역사 속 명작부터 현대 걸작까지 셀럽들의 감상 기록을 탐색하세요.",
};

export default function Page() {
  redirect("/scriptures/era");
}
