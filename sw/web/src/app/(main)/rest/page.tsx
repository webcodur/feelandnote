/*
  파일명: /app/(main)/rest/page.tsx
  기능: 쉼터 기본 페이지
  책임: 기본값으로 여명 페이지로 리다이렉트한다.
*/ // ------------------------------

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ARENA_SECTION_NAME } from "@/constants/arena";

export const metadata: Metadata = {
  title: ARENA_SECTION_NAME,
  description: "Feel&Note의 게임 아레나. 전략 시뮬레이션, 미궁 탐험 등 다양한 미니게임을 즐기세요.",
};

export default function Page() {
  redirect("/rest/dawn");
}
