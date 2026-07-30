/*
  파일명: /components/pwa/ServiceWorkerRegistrar.tsx
  기능: 서비스 워커 등록
  책임: 운영 환경에서만 /sw.js 를 등록한다. 화면에 아무것도 그리지 않는다.
*/ // ------------------------------

"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    // 개발 중에는 등록하지 않는다 — 캐시가 끼어들어 디버깅을 망친다
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.error("서비스 워커 등록 실패:", error);
    });
  }, []);

  return null;
}
