import type { ReactNode } from "react";
import Lane from "@/components/ui/pending/Lane";
import MythScreenSkeleton from "@/components/features/user/explore/myth/MythScreenSkeleton";

export default function MythLayout({ children }: { children: ReactNode }) {
  return <Lane fallback={<MythScreenSkeleton />}>{children}</Lane>;
}
