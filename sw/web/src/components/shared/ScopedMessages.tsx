/*
  파일명: /components/shared/ScopedMessages.tsx
  기능: 위에서 받은 번역 사전에 이 화면 몫만 덧댄다
  책임: next-intl의 공급자는 사전을 통째로 갈아치운다. 중첩할 때마다 전체를 다시
        내려보내면 바이트가 배로 는다. 부모 사전을 화면 안에서 읽어 합치고,
        서버에서 넘어오는 것은 늘어난 몫뿐이다.
*/ // ------------------------------

"use client";

import { useMemo, type ReactNode } from "react";
import {
  NextIntlClientProvider,
  useLocale,
  useMessages,
  type AbstractIntlMessages,
} from "next-intl";

import { mergeMessages } from "@/i18n/message-scope";

interface Props {
  extra: AbstractIntlMessages;
  children: ReactNode;
}

export default function ScopedMessages({ extra, children }: Props) {
  const locale = useLocale();
  const base = useMessages();
  const messages = useMemo(() => mergeMessages(base, extra), [base, extra]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
