import type { ReactNode } from "react";
import Lane from "@/components/ui/pending/Lane";
import AtlasRoutePending from "@/components/features/user/explore/atlas/AtlasRoutePending";

export default function MythLayout({ children }: { children: ReactNode }) {
  return <Lane fallback={<AtlasRoutePending mode="myth" />}>{children}</Lane>;
}
