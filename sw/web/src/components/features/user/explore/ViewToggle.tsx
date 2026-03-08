"use client";

import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, Rows3 } from "lucide-react";
import { useTranslations } from "next-intl";

type ViewMode = "carousel" | "grid";

interface ViewToggleProps {
  current: ViewMode;
}

export default function ViewToggle({ current }: ViewToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("explore.ui");

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
    router.push(`/explore/figures${qs ? `?${qs}` : ""}`);
  };

  return (
    <button
      onClick={toggle}
      className="h-9 flex items-center gap-1.5 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-medium transition-colors shrink-0"
      title={current === "carousel" ? t("gridViewTitle") : t("carouselViewTitle")}
    >
      {current === "carousel" ? (
        <>
          <LayoutGrid size={14} />
          <span className="hidden sm:inline">{t("grid")}</span>
        </>
      ) : (
        <>
          <Rows3 size={14} />
          <span className="hidden sm:inline">{t("carousel")}</span>
        </>
      )}
    </button>
  );
}
