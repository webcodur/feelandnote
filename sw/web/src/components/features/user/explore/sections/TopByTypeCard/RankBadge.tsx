/*
  파일명: /components/features/user/explore/sections/TopByTypeCard/RankBadge.tsx
  기능: 랭킹 카드 순위 뱃지
  책임: 1~3위는 메달 모양, 4~10위는 미니멀 석판 넘버로 표시한다.
*/ // ------------------------------

// #region 순위 뱃지 스타일
const RANK_META: Record<number, {
  gradient: string;        // 배경 그라디언트
  border: string;          // 테두리 색
  text: string;            // 숫자 색
  glow: string;            // 외부 glow
  shine: boolean;          // 광택 애니메이션
}> = {
  1: {
    gradient: "linear-gradient(160deg, #f5d560 0%, #d4af37 45%, #a07818 100%)",
    border: "rgba(255, 225, 100, 0.6)",
    text: "#3d2800",
    glow: "0 0 12px rgba(212,175,55,0.5), 0 2px 6px rgba(0,0,0,0.6)",
    shine: true,
  },
  2: {
    gradient: "linear-gradient(160deg, #dcdcdc 0%, #b0b0b0 45%, #808080 100%)",
    border: "rgba(220, 220, 220, 0.4)",
    text: "#2a2a2a",
    glow: "0 0 8px rgba(180,180,180,0.3), 0 2px 6px rgba(0,0,0,0.6)",
    shine: false,
  },
  3: {
    gradient: "linear-gradient(160deg, #dda060 0%, #b8763a 45%, #8a5520 100%)",
    border: "rgba(210, 160, 90, 0.4)",
    text: "#2e1800",
    glow: "0 0 8px rgba(184,118,58,0.3), 0 2px 6px rgba(0,0,0,0.6)",
    shine: false,
  },
};

export default function RankBadge({ rank }: { rank: number }) {
  const meta = RANK_META[rank];

  // Top 3: 쉴드 형태 메달
  if (meta) {
    return (
      <div
        className="absolute z-20 flex items-center justify-center"
        style={{
          top: -6,
          left: -6,
          width: 32,
          height: 36,
          // 쉴드 실루엣
          clipPath: "polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%)",
          background: meta.gradient,
          boxShadow: meta.glow,
          filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.7))",
        }}
      >
        {/* 쉴드 내부 보더 (동일 clip-path로 inset) */}
        <div
          className="absolute pointer-events-none"
          style={{
            inset: 1,
            clipPath: "polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%)",
            border: `1px solid ${meta.border}`,
          }}
        />
        {/* 상단 광택 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            clipPath: "polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%)",
            background: "linear-gradient(170deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.08) 35%, transparent 50%)",
          }}
        />
        {/* 순위 숫자 */}
        <span
          className="relative font-cinzel font-black text-sm leading-none"
          style={{
            color: meta.text,
            marginTop: -3,
            textShadow: "0 1px 0 rgba(255,255,255,0.3)",
          }}
        >
          {rank}
        </span>
        {/* 1위 미세 shimmer */}
        {meta.shine && (
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{ clipPath: "polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%)" }}
          >
            <div
              className="absolute h-full w-[60%] animate-shine opacity-40"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
                top: 0,
                left: 0,
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // 4~10위: 미니멀 석판 넘버
  return (
    <div
      className="absolute z-20 flex items-center justify-center font-cinzel font-bold text-[11px] text-text-secondary"
      style={{
        top: -4,
        left: -4,
        width: 22,
        height: 22,
        borderRadius: 4,
        background: "linear-gradient(145deg, #1e1e1e, #161616)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {rank}
    </div>
  );
}
// #endregion
