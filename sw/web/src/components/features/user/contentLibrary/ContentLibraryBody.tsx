import type { ReactNode } from "react";

import { Pagination } from "@/components/ui";
import AnimatedHeight from "@/components/ui/AnimatedHeight";

import { ErrorState } from "./ContentLibraryStates";
import type { ViewMode } from "./contentLibraryTypes";

interface ContentLibraryBodyProps {
  animateHeight: boolean;
  compact: boolean;
  currentPage: number;
  error: string | null;
  hasContents: boolean;
  hasFilteredContents: boolean;
  isExpandView: boolean;
  isRefreshing: boolean;
  loadContents: () => void;
  noResultsMessage: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSize: number;
  presentationViewMode: ViewMode;
  renderContentsForMode: (viewMode: ViewMode) => ReactNode;
  showPagination: boolean;
  totalPages: number;
}

export default function ContentLibraryBody({
  animateHeight,
  compact,
  currentPage,
  error,
  hasContents,
  hasFilteredContents,
  isExpandView,
  isRefreshing,
  loadContents,
  noResultsMessage,
  onPageChange,
  onPageSizeChange,
  pageSize,
  presentationViewMode,
  renderContentsForMode,
  showPagination,
  totalPages,
}: ContentLibraryBodyProps) {
  const contents = (
    <div aria-busy={isRefreshing} className="py-8 [overflow-anchor:none]">
      {hasFilteredContents ? (
        renderContentsForMode(presentationViewMode)
      ) : (
        <div className="py-12 text-center text-text-secondary">
          {noResultsMessage}
        </div>
      )}

      {!compact && showPagination && !isExpandView && (
        <div>
          <hr className="border-white/10 mt-8 mb-8" />
          <div className="flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
              pageSize={pageSize}
              onPageSizeChange={onPageSizeChange}
              showPageSizeSelector
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative">
      {error && hasContents && (
        <div
          role="alert"
          className="absolute end-2 top-2 z-30 rounded-md border border-red-400/30 bg-card px-3 shadow-lg"
        >
          <ErrorState message={error} onRetry={loadContents} compact />
        </div>
      )}
      {isRefreshing && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-2 top-0 z-20 h-px animate-pulse bg-accent shadow-[0_0_10px_color-mix(in_srgb,var(--color-accent)_55%,transparent)]"
        />
      )}
      {animateHeight ? (
        <AnimatedHeight duration={200}>{contents}</AnimatedHeight>
      ) : contents}
    </div>
  );
}
