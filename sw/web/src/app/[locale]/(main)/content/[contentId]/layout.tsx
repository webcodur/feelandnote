/*
  파일명: /app/(main)/content/[contentId]/layout.tsx
  기능: 작품 상세 레이아웃
  책임: 이 화면이 실제로 쓰는 문구만 브라우저로 내려보낸다. 사전 전체를 실으면
        한 장이 굳을 때마다 HTML·RSC 양쪽에 187KB가 복사된다
        (external-services.md「ISR 쓰기 비용 규칙」).
*/ // ------------------------------

import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";

import MessageScope from "@/components/shared/MessageScope";
import { CONTENT_MESSAGE_PATHS } from "@/i18n/message-scope";

interface Props {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function ContentDetailLayout({ children, params }: Props) {
  // 문구 조회가 요청 헤더로 언어를 되짚지 않도록 미리 못 박는다. 이걸 빼면 정적이 깨진다.
  const { locale } = await params;
  setRequestLocale(locale);

  return <MessageScope paths={CONTENT_MESSAGE_PATHS}>{children}</MessageScope>;
}
