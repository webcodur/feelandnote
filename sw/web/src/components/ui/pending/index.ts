/*
  파일명: /components/ui/pending/index.ts
  기능: 대기·실패·지연 표시 공용 모듈 모음
  책임: 구획이 기다리는 자리·실패한 자리·아직 안 부를 자리를 한 어휘로 모아 내보낸다.
        여기 있는 것은 전부 클라이언트에서도 안전하다.

        `Lane`은 next/headers를 읽는 서버 전용이라 이 모음에 넣지 않는다 — 모음을 거치면
        브라우저 번들에 딸려 들어가 빌드가 깨진다. `@/components/ui/pending/Lane`에서 직접 가져온다.
*/ // ------------------------------

export { default as PendingMark } from "./PendingMark";
export { default as PendingBlock } from "./PendingBlock";
export { default as RetryBlock } from "./RetryBlock";
export { default as Deferred } from "./Deferred";
export { default as LinkPending } from "./LinkPending";
export { useNearViewport } from "./useNearViewport";
