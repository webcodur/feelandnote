/*
  파일명: /components/features/user/contentLibrary/expand/ReviewScrollBox.tsx
  기능: 감상배경 본문 상자. 긴 글만 이 안에서 굴린다.
  책임: 상자를 16줄로 넉넉히 잡아 열에 아홉은 스크롤이 아예 생기지 않게 한다.
        예전에 6줄로 좁혀 거의 모든 글이 상자에 갇혔고, 그걸 휠 가로채기로 풀려다 실패했다.
        overscroll을 막지 않아 상자 끝에 닿으면 브라우저가 휠을 페이지로 넘긴다.
        5px 스크롤 막대만으로는 글이 더 있는지 모르므로, 남은 글이 있을 때만 끝을 흐린다.
*/ // ------------------------------
"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/** 흐려지는 구간. 다음 줄이 반쯤 걸쳐 보여야 더 있다는 게 읽힌다 */
const FADE = "[mask-image:linear-gradient(to_bottom,black_calc(100%-2.75rem),transparent)]";

export default function ReviewScrollBox({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  const measure = useCallback(() => {
    const box = ref.current;
    if (!box) return;
    setHasMoreBelow(box.scrollTop + box.clientHeight < box.scrollHeight - 4);
  }, []);

  useEffect(() => {
    const box = ref.current;
    if (!box) return;

    measure();
    // 글꼴이 늦게 오거나 창을 줄이면 넘침 여부가 달라진다
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div
      ref={ref}
      onScroll={measure}
      className={`custom-scrollbar max-h-[29.6em] min-w-0 w-full overflow-y-auto overscroll-y-auto whitespace-pre-line break-words pe-2 font-sans text-[15px] leading-[1.85] text-text-secondary ${
        hasMoreBelow ? FADE : ""
      }`}
    >
      {children}
    </div>
  );
}
