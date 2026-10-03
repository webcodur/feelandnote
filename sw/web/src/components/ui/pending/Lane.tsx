/*
  파일명: /components/ui/pending/Lane.tsx
  기능: 구획 하나를 독립적으로 스트리밍하는 경계
  책임: 사용자에게 준비된 구획을 먼저 보내고 봇에는 완성 본문을 보낸다.
        메타데이터 대기는 Next.js의 htmlLimitedBots가 맡는다. 동적 페이지에서 쓰며
        공개 데이터 캐시는 그대로 유지한다.

        실패 처리는 하지 않는다. 구획 컴포넌트가 스스로 try/catch로 잡아 RetryBlock을 세운다.
        여기서 던지면 완성 HTML 모드에서 화면 전체가 죽는다.
*/ // ------------------------------

import { Suspense, type ReactNode } from "react";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { shouldStreamForRequest } from "@/lib/render-mode";

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

export default async function Lane({ fallback, children }: Props) {
  const content = <AsyncIntlProvider>{children}</AsyncIntlProvider>;

  if (!(await shouldStreamForRequest())) return content;

  return <Suspense fallback={fallback}>{content}</Suspense>;
}
