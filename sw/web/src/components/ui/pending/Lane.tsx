/*
  파일명: /components/ui/pending/Lane.tsx
  기능: 구획 하나를 독립 레인으로 흘려보낼지 가르는 경계
  책임: 봇·미확인 UA는 완성 HTML을 받고(스켈레톤을 본문으로 읽힌 사고 이력은
        docs/project/operations/seo.md), 사람 브라우저만 구획별로 스트리밍한다.
        내용은 같고 전달 방식만 다르다. ISR 화면(인물·작품 상세)에서 쓰지 마라 —
        요청 헤더를 읽는 순간 정적이 깨진다.

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
