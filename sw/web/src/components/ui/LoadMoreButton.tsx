"use client";

import { Loader2 } from "lucide-react";
import Button from "./Button";

interface LoadMoreButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  hasMore: boolean;
  className?: string;
}

export default function LoadMoreButton({
  onClick,
  isLoading = false,
  hasMore,
  className = "",
}: LoadMoreButtonProps) {
  if (!hasMore) return null;

  return (
    <Button
      unstyled
      onClick={onClick}
      disabled={isLoading}
      className={`w-full py-3 text-sm font-medium text-text-secondary hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          불러오는 중...
        </>
      ) : (
        "더보기"
      )}
    </Button>
  );
}
