/*
  파일명: components/features/game/myth/shared/FigureAvatar.tsx
  기능: 신화 게임 인물 얼굴
  책임: 배경을 도려낸 아바타를 어두운 바탕 위 원판에 올린다. 칸 크기에 맞는 작은 판을 먼저 쓰고,
        작은 판이 없으면 원본으로 한 번 되돌린다. 미리 받아 두기(preloadAvatar)도 같은 주소를 쓴다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { celebAvatarMediumUrl, celebAvatarSmallUrl } from "@feelandnote/shared/constants/celeb-avatar-small";

export type AvatarSize = "sm" | "md";

export function avatarSource(src: string | null, size: AvatarSize): string | null {
  return (size === "sm" ? celebAvatarSmallUrl(src) : celebAvatarMediumUrl(src)) ?? src;
}

// 판이 열리기 전에 얼굴을 받아 둔다. 다 받거나 실패하면 끝난 것으로 본다
export function preloadAvatar(src: string | null, size: AvatarSize = "md"): Promise<void> {
  const url = avatarSource(src, size);
  if (!url || typeof window === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
}

interface Props {
  src: string | null;
  alt: string;
  size?: AvatarSize;
  className?: string;
}

export default function FigureAvatar({ src, alt, size = "md", className = "" }: Props) {
  const [failed, setFailed] = useState<string | null>(null);
  const derived = avatarSource(src, size);
  const shown = failed === src ? src : derived;
  return (
    <div className={`relative overflow-hidden rounded-full bg-bg-stone-light ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(var(--color-accent-rgb),0.22),transparent_70%)]" />
      {shown && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shown}
          alt={alt}
          draggable={false}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => { if (shown !== src) setFailed(src); }}
        />
      )}
    </div>
  );
}
