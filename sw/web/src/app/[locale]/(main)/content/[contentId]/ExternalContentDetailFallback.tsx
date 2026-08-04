"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { getContentDetail, type ContentDetailData } from "@/actions/contents/getContentDetail";
import ContentDetailPage from "@/components/features/content/ContentDetailPage";
import type { CategoryId } from "@/constants/categories";

const EXTERNAL_CATEGORIES = new Set<CategoryId>(["book", "video", "game", "music"]);

export default function ExternalContentDetailFallback({ contentId }: { contentId: string }) {
  const searchParams = useSearchParams();
  const t = useTranslations("contentDetail");
  const rawCategory = searchParams.get("category") as CategoryId | null;
  const category = rawCategory && EXTERNAL_CATEGORIES.has(rawCategory) ? rawCategory : null;
  const requestKey = category ? `${contentId}:${category}` : null;
  const [result, setResult] = useState<{
    requestKey: string;
    data: ContentDetailData | null;
  } | null>(null);

  useEffect(() => {
    let isActive = true;
    if (!category || !requestKey) {
      return () => {
        isActive = false;
      };
    }

    void getContentDetail(contentId, category)
      .then((result) => {
        if (isActive) setResult({ requestKey, data: result });
      })
      .catch((error) => {
        console.error("[ExternalContentDetailFallback]", error);
        if (isActive) setResult({ requestKey, data: null });
      });

    return () => {
      isActive = false;
    };
  }, [category, contentId, requestKey]);

  if (requestKey && result?.requestKey !== requestKey) {
    return <div className="mx-auto min-h-80 max-w-3xl animate-pulse rounded-xl bg-white/[0.02]" />;
  }

  if (!requestKey || !result?.data) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-border bg-bg-card px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-text-primary">{t("notFoundTitle")}</h1>
        <p className="mt-2 text-sm text-text-secondary">{t("notFoundDescription")}</p>
      </div>
    );
  }

  return <ContentDetailPage initialData={result.data} />;
}
