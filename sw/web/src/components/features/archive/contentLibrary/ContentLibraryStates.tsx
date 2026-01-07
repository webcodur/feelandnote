"use client";

import { Loader2, Archive } from "lucide-react";
import Button from "@/components/ui/Button";

interface LoadingStateProps {
  compact?: boolean;
}

export function LoadingState({ compact = false }: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center ${compact ? "py-8" : "py-12"}`}>
      <Loader2 size={compact ? 20 : 28} className="animate-spin text-accent" />
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  compact?: boolean;
}

export function ErrorState({ message, onRetry, compact = false }: ErrorStateProps) {
  return (
    <div className={`text-center ${compact ? "py-4" : "py-8"}`}>
      <p className="text-red-400 mb-2 text-xs">{message}</p>
      <Button unstyled onClick={onRetry} className="text-accent hover:underline text-xs">
        다시 시도
      </Button>
    </div>
  );
}

interface EmptyStateProps {
  message: string;
  compact?: boolean;
}

export function EmptyState({ message, compact = false }: EmptyStateProps) {
  return (
    <div className={`text-center ${compact ? "py-6" : "py-12"}`}>
      <Archive size={compact ? 32 : 48} className="mx-auto mb-2 text-text-secondary opacity-50" />
      <p className="text-text-secondary text-xs">{message}</p>
    </div>
  );
}
