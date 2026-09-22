"use client";

import { useTranslations } from "next-intl";
import { PendingBlock } from "@/components/ui/pending";
import { cn } from "@/lib/utils";

type Kind = "spectrum" | "influence" | "faction" | "guestbook" | "books" | "graph";

function Ghost({ className }: { className: string }) {
  return <div className={cn("rounded-sm border border-white/[0.06] bg-white/[0.03]", className)} />;
}

function Lines() {
  return <div className="space-y-2.5">
    <Ghost className="h-3 w-3/4" />
    <Ghost className="h-3 w-full" />
    <Ghost className="h-3 w-2/3" />
  </div>;
}

function People() {
  return <div className="grid grid-cols-3 gap-3">
    {[0, 1, 2].map(index => <div key={index} className="space-y-2">
      <Ghost className="mx-auto aspect-square w-full max-w-20 rounded-full" />
      <Ghost className="mx-auto h-3 w-3/4" />
    </div>)}
  </div>;
}

function Spectrum() {
  return <div className="space-y-6">
    <div className="rounded-md border border-white/[0.06] p-5"><Lines /></div>
    {[0, 1, 2].map(index => <div key={index}
      className={cn("gap-6 md:grid md:grid-cols-2", index > 0 && "hidden")}>
      <div className="space-y-5 rounded-md border border-white/[0.06] p-5">
        <Ghost className="h-4 w-28" />
        <Ghost className="mx-auto size-44 rounded-full md:size-52" />
        <div className="flex justify-center gap-3">
          {[0, 1, 2].map(key => <Ghost key={key} className="h-3 w-12" />)}
        </div>
      </div>
      <div className="hidden space-y-6 p-5 md:block"><Ghost className="h-4 w-32" /><People /><Lines /></div>
    </div>)}
  </div>;
}

function Influence() {
  return <div className="space-y-6">
    <div className="flex items-center justify-center gap-6 rounded-md border border-white/[0.06] px-5 py-8">
      <Ghost className="size-20 rounded-full" />
      <div className="w-44 space-y-3"><Ghost className="h-4 w-24" /><Ghost className="h-9 w-32" /><Ghost className="h-3 w-full" /></div>
    </div>
    <Ghost className="mx-auto h-9 w-36" />
    <div className="space-y-5">
      {Array.from({ length: 7 }, (_, index) => <div key={index} className="space-y-2 border-b border-white/[0.06] pb-4">
        <div className="flex justify-between"><Ghost className="h-4 w-20" /><Ghost className="h-4 w-12" /></div>
        <Ghost className="h-2 w-full" />
      </div>)}
    </div>
    <People />
  </div>;
}

function Faction() {
  return <div className="space-y-5 pt-4 md:pt-6">
    <div className="flex gap-3"><Ghost className="h-9 w-28" /><Ghost className="h-9 w-24" /></div>
    <Ghost className="aspect-[16/9] w-full rounded-md md:aspect-[21/9]" />
    <div className="space-y-4"><Ghost className="h-6 w-1/3" /><Lines /></div>
    <People />
  </div>;
}

function Guestbook() {
  return <div className="space-y-4 pb-2 pt-4 sm:pb-3 sm:pt-5 md:pb-4 md:pt-6">
    <div className="flex items-center gap-3"><Ghost className="size-9 rounded-full" /><Ghost className="h-3 w-1/2" /></div>
    <div className="overflow-hidden rounded-md border border-white/[0.09]">
      <div className="min-h-[132px] p-4 sm:min-h-[148px] sm:p-5"><Lines /></div>
      <div className="flex min-h-14 items-center justify-between border-t border-white/[0.06] px-4 py-2.5">
        <Ghost className="h-3 w-14" /><Ghost className="h-10 w-[104px]" />
      </div>
    </div>
  </div>;
}

function Books({ english }: { english: boolean }) {
  return <div className="flex gap-3 overflow-hidden px-4 pt-4 md:flex-wrap md:justify-center md:gap-5 md:px-0 md:pt-6">
    {[0, 1, 2, 3].map(index => <div key={index}
      className={cn("shrink-0 space-y-3 md:w-[180px]", english ? "w-[128px]" : "w-[144px]")}>
      <Ghost className="aspect-[2/3] w-full" />
      <Ghost className="h-4 w-5/6" /><Ghost className="h-3 w-2/3" /><Ghost className="h-10 w-full" />
    </div>)}
  </div>;
}

function Graph() {
  return <div className="relative h-full min-h-0 overflow-hidden rounded-sm border border-white/[0.06] bg-white/[0.015]">
    <div className="absolute inset-x-[20%] top-1/2 h-px bg-white/[0.08]" />
    <div className="absolute inset-y-[20%] left-1/2 w-px bg-white/[0.08]" />
    <Ghost className="absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rounded-full" />
    {['left-1/2 top-[20%]', 'left-[20%] top-1/2', 'left-[80%] top-1/2', 'left-1/2 top-[80%]'].map(position => (
      <Ghost key={position} className={cn("absolute size-16 -translate-x-1/2 -translate-y-1/2 rounded-full", position)} />
    ))}
  </div>;
}

// 내용이 아직 없는 수동 조회에는 구조를 예고한다. 관계도만 실제 계산된 높이를 그대로 채운다.
export default function CelebSectionSkeleton({ kind, english = false }: { kind: Kind; english?: boolean }) {
  const t = useTranslations("pending");
  const content = {
    spectrum: <Spectrum />, influence: <Influence />, faction: <Faction />,
    guestbook: <Guestbook />, books: <Books english={english} />, graph: <Graph />,
  }[kind];
  return <PendingBlock variant="panel" label={t("loading")} className={kind === "graph" ? "h-full" : undefined}>
    {content}
  </PendingBlock>;
}
