import type { ReactNode } from "react";
import Lane from "@/components/ui/pending/Lane";
import { PendingBlock } from "@/components/ui/pending";

export default function RecordsLayout({ children }: { children: ReactNode }) {
  return <Lane fallback={<PendingBlock variant="rows" count={6} className="mx-auto max-w-3xl my-8" />}>
    {children}
  </Lane>;
}
