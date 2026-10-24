"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** 전 항목의 자리는 먼저 만들고, 본문 조회는 화면 가까이 온 항목부터 시작한다. */
export default function LibraryShelfLazyItem({ title, children }: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { rootMargin: "400px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} data-shelf-list-item className="min-w-0 [overflow-anchor:none]">
      {visible ? children : (
        <div aria-busy="true" className="min-h-80 overflow-hidden rounded-xl border border-white/20 bg-bg-card">
          <h3 className="border-b border-white/10 px-4 py-5 text-center font-semibold text-text-primary">{title}</h3>
          <div aria-hidden className="mx-5 my-6 h-40 animate-pulse rounded-lg bg-white/[0.03]" />
        </div>
      )}
    </div>
  );
}
