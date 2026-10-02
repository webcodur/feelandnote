"use client";

import { useLayoutEffect, useRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props extends HTMLAttributes<HTMLElement> {
  selectedKey?: string | number;
  resetKey?: string;
}

/** 목록 안에서만 현재 항목을 맞춘다. 검색·분류 변경은 맨 위부터, 추가 로드는 제자리에서 본다. */
export default function LibraryIndexList({ selectedKey, resetKey = "", className, children, ...props }: Props) {
  const ref = useRef<HTMLElement>(null);
  const previousResetKey = useRef(resetKey);
  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) return;
    if (previousResetKey.current !== resetKey) {
      previousResetKey.current = resetKey;
      list.scrollTop = 0;
      return;
    }
    const selected = list.querySelector<HTMLElement>("[data-library-index-selected]");
    if (!selected) return;
    const offset = selected.getBoundingClientRect().top - list.getBoundingClientRect().top;
    list.scrollTop += offset - (list.clientHeight - selected.offsetHeight) / 2;
  }, [selectedKey, resetKey]);

  return <nav {...props} ref={ref} data-library-index-list
    className={cn("custom-scrollbar relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain [overflow-anchor:none]", className)}>
    {children}
  </nav>;
}
