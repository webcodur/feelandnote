/*
  파일명: /components/pwa/ServiceWorkerRegistrar.tsx
  기능: 서비스 워커 등록
  책임: 운영에서는 /sw.js 를 등록하고, 개발에서는 남아 있는 같은 워커를 해제한다.
*/ // ------------------------------

"use client";

import { useEffect } from "react";

// SSR HTML에서 먼저 실행한다. 캐시된 옛 번들은 useEffect로 넣은 복구 코드도 가로막는다.
const DEVELOPMENT_WORKER_RESET = `(async()=>{
  if(!('serviceWorker' in navigator))return;
  const workers=navigator.serviceWorker;
  const own=worker=>{if(!worker)return false;const url=new URL(worker.scriptURL);return url.origin===location.origin&&url.pathname==='/sw.js'};
  const registrations=await workers.getRegistrations();
  const owned=registrations.filter(registration=>[registration.active,registration.waiting,registration.installing].some(own));
  const controlled=own(workers.controller);
  await Promise.all(owned.map(registration=>registration.unregister()));
  if(controlled&&owned.length)location.reload();
})().catch(error=>console.error('개발 서비스 워커 해제 실패:',error));`;

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.error("서비스 워커 등록 실패:", error);
    });
  }, []);

  if (process.env.NODE_ENV !== "production") {
    return <script data-development-worker-reset dangerouslySetInnerHTML={{ __html: DEVELOPMENT_WORKER_RESET }} />;
  }
  return null;
}
