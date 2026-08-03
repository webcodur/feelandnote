import type { WorldBannerImages } from "@/lib/celeb/worldImages";

interface CelebWorldBannerViewProps {
  worldId: string;
  images: WorldBannerImages | null;
  compact?: boolean;
}

/** 파일 시스템에 접근하지 않는 배너 표시부. 서버가 확정한 경로만 그린다. */
export default function CelebWorldBannerView({
  worldId,
  images,
  compact = false,
}: CelebWorldBannerViewProps) {
  const heightClass = compact
    ? "h-[110px] md:h-[150px]"
    : "h-[200px] md:h-[340px]";

  return (
    <div className={`relative w-full overflow-hidden bg-bg-secondary ${heightClass}`}>
      {images ? (
        <picture className="absolute inset-0 block">
          <source media="(min-width: 768px)" srcSet={images.pc} />
          <img
            src={images.mb}
            alt=""
            aria-hidden
            className="h-full w-full object-cover"
            draggable={false}
          />
        </picture>
      ) : (
        <PlaceholderPattern worldId={worldId} />
      )}
    </div>
  );
}

function PlaceholderPattern({ worldId }: { worldId: string }) {
  let hash = 2166136261;
  for (const char of worldId) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  const seed = hash >>> 0;
  const hue = seed % 360;
  const angle = 100 + (seed % 60);

  return (
    <div
      className="absolute inset-0"
      style={{
        background: `
          radial-gradient(120% 90% at ${25 + (seed % 50)}% 15%, hsla(${hue}, 45%, 38%, 0.55), transparent 60%),
          linear-gradient(${angle}deg, hsl(${hue}, 22%, 10%), hsl(${(hue + 40) % 360}, 18%, 6%))
        `,
      }}
    />
  );
}
