"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";

/** 주요 메뉴를 통한 새 화면 진입만 상단으로 맞춘다. 뒤로 가기와 필터 변경은 기존 위치를 따른다. */
export default function useNavigationToTop() {
  const pathname = usePathname();
  const destination = useRef<string | null>(null);

  useEffect(() => {
    const target = destination.current;
    destination.current = null;
    if (target === pathname) window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (href: string) => {
    destination.current = href === pathname ? null : href;
  };
}
