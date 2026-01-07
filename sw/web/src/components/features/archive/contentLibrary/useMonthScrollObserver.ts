"use client";

import { useState, useEffect } from "react";

export function useMonthScrollObserver(monthKeys: string[], collapsedMonths: Set<string>) {
  const [currentVisibleMonth, setCurrentVisibleMonth] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            if (id.startsWith("month-section-")) {
              const monthKey = id.replace("month-section-", "");
              setCurrentVisibleMonth(monthKey);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: "-20% 0px -60% 0px", // 화면 상단 20% ~ 40% 지점에서 교차 감지
        threshold: 0,
      }
    );

    const sections = document.querySelectorAll("[id^='month-section-']");
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [monthKeys, collapsedMonths]);

  return currentVisibleMonth;
}
