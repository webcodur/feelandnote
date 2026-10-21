import type { ReactNode } from "react";
import Lane from "@/components/ui/pending/Lane";
import AtlasRoutePending from "@/components/features/user/explore/atlas/AtlasRoutePending";

export default function FactionLayout({ children }: { children: ReactNode }) {
  return <Lane fallback={<AtlasRoutePending mode="faction" />}>{children}</Lane>;
}
