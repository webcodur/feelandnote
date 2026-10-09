"use client";

import { useLayoutEffect, type ReactNode } from "react";
import HubSection from "@/components/shared/HubSection";

export default function AboutContact({ children, title, index, total }: { children: ReactNode; title: string; index: number; total: number }) {
  // 직접 연 해시 주소도 스트리밍 본문이 나타난 뒤 정확한 문의 위치로 맞춘다.
  useLayoutEffect(() => {
    const scrollToContact = () => {
      if (window.location.hash === "#contact") {
        document.getElementById("contact")?.scrollIntoView({ behavior: "instant", block: "start" });
      }
    };
    scrollToContact();
    window.addEventListener("hashchange", scrollToContact);
    return () => window.removeEventListener("hashchange", scrollToContact);
  }, []);

  return (
    <HubSection id="contact" title={title} index={index} total={total}>
      {children}
    </HubSection>
  );
}
