/*
  파일명: /components/shared/MessageScope.tsx
  기능: 화면에 필요한 번역 문구만 골라 아래로 내려보낸다
  책임: 인물·작품 상세는 자기 몫만 받고, 나머지 화면은 남은 문구를 통째로 받는다.
        새 번역 파일이 늘어도 나머지 쪽에 자동으로 포함돼 문구가 비지 않는다.
*/ // ------------------------------

import type { ReactNode } from "react";
import { getMessages } from "next-intl/server";

import { pickMessages, restMessagePaths } from "@/i18n/message-scope";

import ScopedMessages from "./ScopedMessages";

interface Props {
  /** 덧댈 문구 경로. 비우면 공통 뼈대에 없는 나머지를 전부 덧댄다. */
  paths?: readonly string[];
  children: ReactNode;
}

export default async function MessageScope({ paths, children }: Props) {
  const all = await getMessages();
  const extra = pickMessages(all, paths ?? restMessagePaths(all));

  return <ScopedMessages extra={extra}>{children}</ScopedMessages>;
}
