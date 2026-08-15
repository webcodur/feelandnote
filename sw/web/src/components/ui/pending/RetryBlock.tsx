/*
  파일명: /components/ui/pending/RetryBlock.tsx
  기능: 조회에 실패한 구획의 제자리 안내
  책임: 실패한 구획이 조용히 사라지지 않도록 자리를 지키고, 한 줄 안내와 다시 시도 단추만 조용히 둔다.
        onRetry가 없으면 화면을 다시 불러온다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface Props {
  onRetry?: () => void;
  message?: string;
  className?: string;
}

export default function RetryBlock({ onRetry, message, className }: Props) {
  const t = useTranslations("pending");
  const router = useRouter();

  const handleRetry = onRetry ?? (() => router.refresh());

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-8 text-center",
        className,
      )}
    >
      <p className="text-sm text-text-secondary">{message ?? t("failed")}</p>
      <button
        type="button"
        onClick={handleRetry}
        className="rounded-full border border-accent/30 px-4 py-1.5 text-sm text-accent hover:bg-accent/10 hover:border-accent"
      >
        {t("retry")}
      </button>
    </div>
  );
}
