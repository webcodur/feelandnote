"use client";

import Image from "next/image";

interface CelebHeroPhotoProps {
  /** 대표 화보(1:1). 없으면 얼굴 사진으로 돌아간다 */
  photoUrl: string | null;
  avatarUrl: string | null;
  nickname: string;
  onClick: () => void;
  /** 화보가 있을 때의 크기 */
  photoSize: string;
  /** 얼굴 사진으로 돌아갔을 때의 크기 */
  avatarSize: string;
  /** 얼굴 사진 자리의 첫 글자 크기 */
  initialSize: string;
}

/**
 * 인물 상세 첫 구획의 대표 이미지.
 * 화보가 있으면 정사각으로 크게 걸고, 없으면 기존 원형 얼굴 사진을 그대로 쓴다.
 * 어느 쪽이든 누르면 인사 음성이 재생된다.
 */
export default function CelebHeroPhoto({
  photoUrl,
  avatarUrl,
  nickname,
  onClick,
  photoSize,
  avatarSize,
  initialSize,
}: CelebHeroPhotoProps) {
  // 테두리 강조는 지연 없이 즉시, 확대는 애니메이션으로 (전 앱 공통 상호작용 원칙)
  const ringClass =
    "ring-1 ring-accent/20 hover:ring-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  if (photoUrl) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={nickname}
        className={`group relative flex-shrink-0 self-start overflow-hidden rounded-sm bg-bg-secondary ${ringClass} ${photoSize} cursor-pointer active:scale-95`}
      >
        {/* 비율이 안 맞는 화보가 들어와도 잘리지 않도록 뒤를 흐린 사진으로 메운다 */}
        <Image
          src={photoUrl}
          alt=""
          fill
          unoptimized
          aria-hidden
          className="object-cover scale-110 blur-2xl opacity-40"
        />
        <div className="absolute inset-0 bg-black/20" />
        <Image
          src={photoUrl}
          alt={nickname}
          fill
          unoptimized
          sizes="(max-width: 768px) 224px, 240px"
          className="object-contain transition-transform duration-500 group-hover:scale-105"
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={nickname}
      className={`flex-shrink-0 self-start overflow-hidden rounded-full bg-bg-secondary ${ringClass} ${avatarSize} cursor-pointer active:scale-95`}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={nickname}
          width={224}
          height={224}
          className="w-full h-full object-cover"
          unoptimized
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center font-serif text-accent/30 ${initialSize}`}
        >
          {nickname.charAt(0)}
        </div>
      )}
    </button>
  );
}
