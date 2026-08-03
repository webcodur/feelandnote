import { getWorldBannerImages } from "@/lib/celeb/worldImages";
import CelebWorldBannerView from "./CelebWorldBannerView";

interface CelebWorldBannerProps {
  worldId: string;
  compact?: boolean;
}

/** 서버에서 실제 파일 쌍을 확인한 뒤 순수 표시 컴포넌트에 넘긴다. */
export default function CelebWorldBanner({ worldId, compact = false }: CelebWorldBannerProps) {
  return (
    <CelebWorldBannerView
      worldId={worldId}
      images={getWorldBannerImages(worldId)}
      compact={compact}
    />
  );
}
