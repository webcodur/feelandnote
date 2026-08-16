/*
  파일명: /app/(main)/about/layout.tsx
  기능: 서비스 소개 레이아웃
  책임: 소개 글은 안내 문구를 폭넓게 쓰므로 공통 뼈대에 남은 문구를 통째로 덧댄다.
*/ // ------------------------------

import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";

import MessageScope from "@/components/shared/MessageScope";

interface Props {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AboutLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <MessageScope>{children}</MessageScope>;
}
