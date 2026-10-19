"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import MicrosoftClarity from "./MicrosoftClarity";
import { canTrackAnalytics } from "@/lib/analytics/policy";
import { flushAnalyticsEvents } from "@/lib/analytics/queue";

const GA_ID = "G-LMVY8KTJ7T";

/** 실제 호스트와 브라우저의 제외 설정을 확인한 뒤 분석 스크립트를 불러온다. */
export default function WebAnalytics() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    // SSR에서는 호스트·저장소를 알 수 없어 닫고, hydration 뒤 한 번만 허용 여부를 정한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(canTrackAnalytics());
    const url = new URL(window.location.href);
    if (["off", "on"].includes(url.searchParams.get("analytics") ?? "")) {
      url.searchParams.delete("analytics");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
  }, []);
  if (!enabled) return null;
  return <>
    <Script id="_next-ga-init" strategy="afterInteractive" onReady={flushAnalyticsEvents}>
      {`window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments)};window.gtag('js',new Date());window.gtag('config',${JSON.stringify(GA_ID)});`}
    </Script>
    <Script id="_next-ga" strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
    <MicrosoftClarity />
  </>;
}
