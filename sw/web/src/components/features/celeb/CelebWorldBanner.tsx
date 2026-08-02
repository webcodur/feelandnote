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
    : "h-[200px] md:h-[340px]";

  return (
    <div className={`relative w-full overflow-hidden bg-bg-secondary ${heightClass}`}>
      {images ? (
        <>
          {/* 본문 최대 폭보다 넓은 화면에서 좌우 여백을 같은 그림의 흐린 확대본으로 채운다.
              같은 파일이라 내려받기는 한 번이다 */}
          {/* 좌우 옆자리를 같은 그림의 흐린 확대본으로 위에서 아래까지 채운다.
              가운데는 아래의 또렷한 원본이 덮으므로 실제로는 옆에만 보인다 */}
          <picture>
            <source media="(min-width: 768px)" srcSet={images.pc} />
            <img
              src={images.mb}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
              draggable={false}
            />
          </picture>
          {/* 또렷한 원본은 세로를 다 보여준다(위아래 잘림 없음). 좌우 남는 자리는 위 블러가 채우고,
              경계는 마스크로 서서히 녹인다 */}
          <div
            className="absolute inset-y-0 left-1/2 -translate-x-1/2"
            style={{
              maskImage: "linear-gradient(90deg, transparent, black 7%, black 93%, transparent)",
              WebkitMaskImage: "linear-gradient(90deg, transparent, black 7%, black 93%, transparent)",
            }}
          >
            <picture>
              <source media="(min-width: 768px)" srcSet={images.pc} />
              <img
                src={images.mb}
                alt=""
                aria-hidden
                className="h-full w-auto max-w-none"
                draggable={false}
              />
            </picture>
          </div>
        </>
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

      {/* 아래 경계는 그림이 그대로 끊긴다. 흐림·가라앉힘·장식선을 두지 않는다 */}
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
