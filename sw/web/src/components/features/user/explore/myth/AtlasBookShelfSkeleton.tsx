"use client";

import { useTranslations } from "next-intl";
import LibraryCategoryPicker from "@/components/shared/LibraryCategoryPicker";
import { LIBRARY_CONTROL_LAYOUT } from "@/components/shared/libraryControlLayout";
import { LIBRARY_DETAIL_FRAME_CLASS } from "@/components/shared/LibraryDetailNavigation";
import { Ghost } from "../hub/ExploreSkeleton";

const noop = () => {};

/** 책장은 카드 여섯 장이 아니라 분류 선택기와 한 권의 상세를 보여 준다. */
export default function AtlasBookShelfSkeleton() {
  const t = useTranslations("celebPage");
  const keys = ["Theme", "Appeared", "Read", "Authored", "Profession"] as const;
  return <div aria-hidden data-atlas-bookshelf-skeleton>
    <div className={`mx-auto flex flex-col gap-2 ${LIBRARY_CONTROL_LAYOUT.width} ${LIBRARY_CONTROL_LAYOUT.contentGap}`}>
      <LibraryCategoryPicker options={keys.map(key => ({ key, label: t(`group${key}`), count: 0, disabled: true }))}
        value="" ariaLabel={t("sourceWorkPickerLabel")} onChange={noop} />
    </div>
    <div className={LIBRARY_DETAIL_FRAME_CLASS}>
      <div className="col-start-1 row-span-2 row-start-1 hidden border-e border-white/10 md:block" />
      <div className="col-start-1 row-start-1 flex h-16 flex-col items-center justify-center gap-2 border-b border-white/[0.08] bg-bg-secondary/80 md:col-start-2">
        <Ghost className="h-5 w-48 max-w-[70%]" /><Ghost className="h-4 w-24" />
      </div>
      <div className="col-start-1 row-start-2 min-w-0 md:col-start-2">
        <div className="flow-root px-3 py-5 sm:grid sm:grid-cols-[192px_minmax(0,1fr)] sm:gap-x-6 sm:gap-y-4 sm:px-4 md:px-5 md:py-6">
          <div className="float-start mb-2 me-4 w-24 sm:float-none sm:m-0 sm:w-full">
            <Ghost className="aspect-[2/3] w-full rounded" /><Ghost className="mt-3 h-9 w-full" />
          </div>
          <div className="min-w-0 space-y-3">
            <Ghost className="h-5 w-3/4" /><Ghost className="h-4 w-1/2" />
            <Ghost className="h-20 w-full sm:h-40" />
          </div>
          <Ghost className="clear-both mt-3 h-8 w-full sm:col-span-2" />
        </div>
        <Ghost className="mx-3 mb-4 h-20 w-auto sm:mx-4 md:mx-5" />
        <div className="h-11 border-t border-white/10 md:hidden" />
      </div>
      <div className="col-start-3 row-span-2 row-start-1 hidden border-s border-white/10 md:block" />
    </div>
  </div>;
}
