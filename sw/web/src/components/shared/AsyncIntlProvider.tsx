/*
  파일명: /components/shared/AsyncIntlProvider.tsx
  기능: Suspense 경계 내부 intl 컨텍스트 재공급
  책임: Next.js 16 스트리밍 SSR에서 Suspense 경계를 넘어
        NextIntlClientProvider 컨텍스트가 소실되는 문제를 해결한다.
        비동기 서버 컴포넌트 내부에서 클라이언트 컴포넌트를 감싸는 용도.
*/ // ------------------------------

import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function AsyncIntlProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
