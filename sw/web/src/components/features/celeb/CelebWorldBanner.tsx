/*
  파일명: /components/features/celeb/CelebWorldBanner.tsx
  기능: 인물 상세 맨 위 배너
  책임: 인물이 살았던 세계 그림을 깔고, 아래 본문 배경으로 자연스럽게 녹인다.

  설계 근거
  - 글자를 넣지 않는다. 이름·직군·명언은 바로 아래 소개 상자가 이미 담고 있어 겹친다.
  - 화면 크기별로 다른 그림을 쓰되 한 장만 내려받게 한다.
    두 장을 넣고 한쪽을 감추는 방식은 감춘 쪽까지 받아 전송량이 두 배가 된다.
  - 그림이 없는 세계는 무늬로 대신 그린다. 화면이 비지 않으므로 그림을 한 장씩 채워 나갈 수 있다.
*/

import { getWorldBannerImages } from "@/lib/celeb/worldImages";

interface CelebWorldBannerProps {
  worldId: string;
  /** 직군 강조색 "r, g, b". 그림 위에 옅게 덮어 같은 세계라도 직군에 따라 톤이 달라진다 */
  tintRgb?: string;
  /** 실험실에서 여러 개를 나란히 볼 때 높이를 줄인다 */
  compact?: boolean;
}

export default function CelebWorldBanner({ worldId, tintRgb, compact = false }: CelebWorldBannerProps) {
  const images = getWorldBannerImages(worldId);
  const heightClass = compact
    ? "h-[110px] md:h-[150px]"
    : "h-[160px] md:h-[260px]";

  return (
    <div className={`relative w-full overflow-hidden bg-bg-secondary ${heightClass}`}>
      {images ? (
        <picture>
          <source media="(min-width: 768px)" srcSet={images.pc} />
          <img
            src={images.mb}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        </picture>
      ) : (
        <PlaceholderPattern worldId={worldId} />
      )}

      {/* 직군 색을 옅게 덮는다 */}
      {tintRgb && (
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(180deg, rgba(${tintRgb},0.10), rgba(${tintRgb},0.03))` }}
        />
      )}

      {/* 아래쪽을 본문 배경색으로 떨어뜨려 경계선이 생기지 않게 한다 */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-b from-transparent to-bg-main" />
    </div>
  );
}

/* 그림이 아직 없는 세계용 임시 무늬. 세계 이름에서 각도와 색을 뽑아 세계마다 다르게 보인다 */
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
