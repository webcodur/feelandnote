"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Rows3 } from "lucide-react";

type ViewMode = "carousel" | "grid";

interface ViewToggleProps {
  current: ViewMode;
}

export default function ViewToggle({ current }: ViewToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const toggle = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (current === "carousel") {
      params.set("view", "grid");
    } else {
      params.delete("view");
      // 그리드→캐러셀 전환 시 필터 파라미터 유지하지 않음
      params.delete("profession");
      params.delete("nationality");
      params.delete("contentType");
      params.delete("gender");
      params.delete("search");
      params.delete("sortBy");
      params.delete("page");
      params.delete("pageSize");
      params.delete("tagId");
    }
    const qs = params.toString();
    router.push(`/explore/celebs${qs ? `?${qs}` : ""}`);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs transition-colors"
      title={current === "carousel" ? "그리드 뷰로 전환" : "캐러셀 뷰로 전환"}
    >
      {current === "carousel" ? (
        <>
          <LayoutGrid size={14} />
          <span className="hidden sm:inline">그리드</span>
        </>
      ) : (
        <>
          <Rows3 size={14} />
          <span className="hidden sm:inline">캐러셀</span>
        </>
      )}
    </button>
  );
}
