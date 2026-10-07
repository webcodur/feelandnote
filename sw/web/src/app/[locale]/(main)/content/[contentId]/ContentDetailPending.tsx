import { PendingBlock } from "@/components/ui/pending";

/** 표지와 제목 자리를 먼저 잡아 작품 정보가 들어올 때 화면 이동을 줄인다. */
export default function ContentDetailPending() {
  return <div className="mx-auto max-w-3xl space-y-4">
    <div aria-hidden="true" className="flex h-9 items-center justify-between">
      <div className="h-2 w-16 rounded-full bg-text-secondary/10" />
      <div className="h-7 w-24 rounded-lg border border-border/60" />
    </div>
    <PendingBlock variant="panel" minHeight="min-h-80">
      <div className="rounded-xl border border-border bg-bg-card p-4 sm:p-6">
        <div className="mb-6 h-2 w-20 rounded-full bg-text-secondary/10" />
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="aspect-[2/3] w-32 shrink-0 rounded-lg border border-border/60 bg-text-secondary/[0.04] sm:w-40" />
          <div className="w-full space-y-4 pt-2">
            <div className="h-3 w-3/4 rounded-full bg-text-secondary/10" />
            <div className="h-2 w-1/3 rounded-full bg-text-secondary/[0.06]" />
            <div className="space-y-3 pt-5">
              <div className="h-1.5 rounded-full bg-text-secondary/[0.06]" />
              <div className="h-1.5 w-5/6 rounded-full bg-text-secondary/[0.06]" />
              <div className="h-1.5 w-2/3 rounded-full bg-text-secondary/[0.06]" />
            </div>
          </div>
        </div>
      </div>
    </PendingBlock>
    <PendingBlock variant="rows" count={3} />
  </div>;
}
