/*
  친구용 명판 카드
  - 가로형 레이아웃
  - 좌측에 원형 아바타
  - 중앙에 명판 스타일 정보 (닉네임)
  - 우측에 기록 수 세로 배치
  - materials.ts 기반 재질 스타일링
*/
"use client";

import {
  MATERIALS,
  NORMAL_LEVEL_TO_MATERIAL,
  type MaterialKey,
  type NormalLevel,
} from "@/constants/materials";

// #region Types & Config
interface FriendInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  content_count: number;
}

interface FriendCardNameplateProps {
  friend: FriendInfo;
  onClick: () => void;
  level?: NormalLevel;         // 노멀 등급
  materialKey?: MaterialKey;   // 직접 재질 지정 (level보다 우선)
}

// 기본 재질 (tier 미지정 시)
const DEFAULT_MATERIAL = MATERIALS.wood;
// #endregion

export default function FriendCardNameplate({ friend, onClick, level, materialKey }: FriendCardNameplateProps) {
  // materialKey 우선, 없으면 level로 결정
  const mat = materialKey
    ? MATERIALS[materialKey]
    : level
      ? NORMAL_LEVEL_TO_MATERIAL[level]
      : DEFAULT_MATERIAL;

  // 배경 스타일 (텍스처 포함)
  const bgStyle = mat.textureUrl
    ? {
        background: mat.gradient.simple,
        backgroundImage: `${mat.gradient.simple}, url("${mat.textureUrl}")`,
        backgroundBlendMode: "overlay" as const,
      }
    : { background: mat.gradient.simple };

  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.01]"
      style={{
        ...bgStyle,
        boxShadow: mat.shadow.base,
        border: `1px solid ${mat.colors.border}`,
      }}
    >
      {/* LP 효과 (금~철만) */}
      {mat.lp && (
        <div
          className="absolute pointer-events-none [animation-play-state:paused] group-hover:[animation-play-state:running]"
          style={{
            top: "-100%",
            left: "-100%",
            width: "300%",
            height: "300%",
            background: mat.lp.gradient,
            animation: `rotateSpin ${mat.lp.duration || "8s"} linear infinite`,
            mixBlendMode: (mat.lp.blendMode || "overlay") as any,
            zIndex: 0,
          }}
        />
      )}

      {/* 베벨 효과 */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          boxShadow: "inset 2px 2px 4px rgba(255,255,255,0.2), inset -1px -1px 3px rgba(0,0,0,0.3)",
        }}
      />

      {/* 상하단 악센트 라인 */}
      <div className="absolute inset-0 opacity-20 pointer-events-none z-[1]">
        <div
          className="absolute top-0 left-0 w-full h-[1px]"
          style={{ background: `linear-gradient(to right, transparent, ${mat.colors.light}, transparent)` }}
        />
        <div
          className="absolute bottom-0 left-0 w-full h-[1px]"
          style={{ background: `linear-gradient(to right, transparent, ${mat.colors.light}, transparent)` }}
        />
      </div>

      <div className="relative flex items-center gap-4 p-4 z-[2]">
        {/* 좌측 아바타 */}
        <div className="relative shrink-0">
          <div
            className="w-14 h-14 rounded-full overflow-hidden border-2 transition-colors"
            style={{ borderColor: mat.colors.border }}
          >
            {friend.avatar_url ? (
              <img
                src={friend.avatar_url}
                alt={friend.nickname}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: mat.colors.dark }}
              >
                <span
                  className="text-lg font-serif"
                  style={{ color: mat.colors.textOnSurface, opacity: 0.5 }}
                >
                  {friend.nickname[0]}
                </span>
              </div>
            )}
          </div>
          {/* 아바타 장식 링 */}
          <div
            className="absolute -inset-1 rounded-full border transition-colors"
            style={{ borderColor: `${mat.colors.primary}40` }}
          />
        </div>

        {/* 중앙 정보 - 명판 스타일 */}
        <div className="flex-1 min-w-0 text-left">
          <h3
            className="font-serif font-bold text-base leading-tight truncate"
            style={{
              color: mat.colors.textOnSurface,
              textShadow: `-1px -1px 0 rgba(0,0,0,0.3), 1px 1px 0 rgba(255,255,255,0.15)`,
            }}
          >
            {friend.nickname}
          </h3>
          <p className="text-[10px] mt-0.5" style={{ color: mat.colors.text, opacity: 0.7 }}>
            {level ? mat.normalLevel : "친구"}
          </p>
        </div>

        {/* 우측 기록 수 - 세로 배치 */}
        <div
          className="shrink-0 flex flex-col items-center justify-center px-3 border-l"
          style={{ borderColor: `${mat.colors.border}60` }}
        >
          <span
            className="text-xl font-serif font-bold leading-none"
            style={{ color: mat.colors.text }}
          >
            {friend.content_count || 0}
          </span>
          <span
            className="text-[8px] uppercase tracking-wider mt-1"
            style={{ color: mat.colors.text, opacity: 0.6 }}
          >
            기록
          </span>
        </div>
      </div>

      {/* 호버 시 글로우 효과 */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-[3]"
        style={{ background: `${mat.colors.primary}10` }}
      />
    </button>
  );
}
