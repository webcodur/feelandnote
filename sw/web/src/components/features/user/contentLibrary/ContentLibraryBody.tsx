import type { ReactNode } from "react";

import { Pagination } from "@/components/ui";

import { ErrorState } from "./ContentLibraryStates";
import type { ViewMode } from "./contentLibraryTypes";

type RenderContentsForMode = (
  viewMode: ViewMode,
  effectsEnabled?: boolean,
  desktopPresentation?: boolean,
) => ReactNode;

interface ContentLibraryBodyProps {
  compact: boolean;
  currentPage: number;
  error: string | null;
  hasContents: boolean;
  hasFilteredContents: boolean;
  hasResponsiveDefaultView: boolean;
  isDesktop: boolean | null;
  isExpandView: boolean;
  isRefreshing: boolean;
  loadContents: () => void;
  noResultsMessage: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSize: number;
  presentationViewMode: ViewMode;
  renderContentsForMode: RenderContentsForMode;
  responsiveDefaultViewMode: ViewMode;
  responsiveDesktopViewMode?: ViewMode;
  showPagination: boolean;
  totalPages: number;
}

export default function ContentLibraryBody({
  compact,
  currentPage,
  error,
  hasContents,
  hasFilteredContents,
  hasResponsiveDefaultView,
  isDesktop,
  isExpandView,
  isRefreshing,
  loadContents,
  noResultsMessage,
  onPageChange,
  onPageSizeChange,
  pageSize,
  presentationViewMode,
  renderContentsForMode,
  responsiveDefaultViewMode,
  responsiveDesktopViewMode,
  showPagination,
  totalPages,
}: ContentLibraryBodyProps) {
  const defaultPresenterViewMode = hasResponsiveDefaultView
    ? responsiveDefaultViewMode
    : presentationViewMode;
  const desktopPresenterViewMode = hasResponsiveDefaultView
    ? responsiveDesktopViewMode ?? responsiveDefaultViewMode
    : presentationViewMode;

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
      <div aria-busy={isRefreshing} className="py-8 [overflow-anchor:none]">
        {hasFilteredContents ? (
          responsiveDesktopViewMode !== undefined ? (
            <>
              {isDesktop !== true && (
                <div
                  key="responsive-default"
                  data-library-presenter={defaultPresenterViewMode}
                  className="md:hidden"
                >
                  {renderContentsForMode(
                    defaultPresenterViewMode,
                    isDesktop === false,
                  )}
                </div>
              )}
              {isDesktop !== false && (
                <div
                  key="responsive-desktop"
                  data-library-presenter={desktopPresenterViewMode}
                  className="hidden md:block"
                >
                  {renderContentsForMode(
                    desktopPresenterViewMode,
                    isDesktop === true,
                    true,
                  )}
                </div>
              )}
            </>
          ) : (
            renderContentsForMode(presentationViewMode)
          )
        ) : (
          <div className="py-12 text-center text-text-secondary">
            {noResultsMessage}
          </div>
        )}

        {!compact && showPagination && !isExpandView && (
          <div className={hasResponsiveDefaultView ? "md:hidden" : undefined}>
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
    </div>
  );
}
