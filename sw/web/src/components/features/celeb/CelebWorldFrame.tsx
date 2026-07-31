/*
  파일명: /components/features/celeb/CelebWorldFrame.tsx
  기능: 인물 사진을 감싸는 세계별 틀
  책임: 사진 둘레의 테두리 생김새를 세계에서 끌어온다. 사진 자체는 건드리지 않는다.

  배너보다 오래 남는 자리다. 첫 화면에서 사진과 나란히 보이고, 사진이 곧 인물이므로
  인물과 그가 산 세계가 한 덩어리로 읽힌다. 그림 파일은 쓰지 않는다.

  두께는 네 종류가 모두 같다(8px). 두께가 제각각이면 사진 크기가 같아도 바깥 크기가
  달라져, 목록이나 두 열 배치에서 인물마다 사진 위치가 어긋난다.
*/

import type { ReactNode } from "react";
import type { WorldFrame } from "@/lib/celeb/worldStyle";

interface CelebWorldFrameProps {
  frame: WorldFrame;
  children: ReactNode;
  className?: string;
}

/** 네 종류가 공유하는 테두리 폭. 바깥 크기를 같게 유지한다 */
const FRAME_PADDING = "p-2";

const SURFACES: { readonly [key in WorldFrame]: string } = {
  wood: "linear-gradient(150deg, #6b4f33, #4a3522 45%, #5d4229)",
  stone: "linear-gradient(160deg, #4a4a45, #2e2e2a 55%, #3d3d38)",
  gilt: "linear-gradient(145deg, rgba(var(--color-accent-rgb),0.5), rgba(var(--color-accent-rgb),0.14) 42%, rgba(var(--color-accent-rgb),0.38))",
  // 근현대도 테두리에 무게가 있어야 한다. 비워 두면 폭이 같아도 혼자 얇아 보인다
  plain: "linear-gradient(150deg, #232323, #141414 55%, #1d1d1d)",
};

const OUTER_SHADOWS: { readonly [key in WorldFrame]: string } = {
  wood: "inset 0 0 0 1px rgba(0,0,0,0.45), 0 2px 10px rgba(0,0,0,0.5)",
  stone: "inset 0 0 0 1px rgba(255,255,255,0.06), 0 2px 10px rgba(0,0,0,0.5)",
  gilt: "0 2px 10px rgba(0,0,0,0.45)",
  plain: "inset 0 0 0 1px rgba(255,255,255,0.10), 0 2px 10px rgba(0,0,0,0.45)",
};

/** 사진 바로 바깥에 앉는 안쪽 선. 틀마다 결이 다르다 */
const INNER_SHADOWS: { readonly [key in WorldFrame]: string } = {
  wood: "inset 0 0 0 2px rgba(0,0,0,0.35)",
  stone: "inset 0 0 0 2px rgba(0,0,0,0.4)",
  gilt: "inset 0 0 0 1px rgba(var(--color-accent-rgb),0.6), inset 0 0 0 3px rgba(0,0,0,0.55)",
  plain: "inset 0 0 0 1px rgba(var(--color-accent-rgb),0.35)",
};

export default function CelebWorldFrame({ frame, children, className = "" }: CelebWorldFrameProps) {
  return (
    <div
      className={`relative ${FRAME_PADDING} ${className}`}
      style={{ background: SURFACES[frame], boxShadow: OUTER_SHADOWS[frame] }}
    >
      <div className="relative" style={{ boxShadow: INNER_SHADOWS[frame] }}>
        {children}
      </div>

      {/* 목판은 네 귀에 못, 석재는 네 귀에 돌 블록 */}
      {frame === "wood" &&
        ["left-1 top-1", "right-1 top-1", "left-1 bottom-1", "right-1 bottom-1"].map((pos) => (
          <span key={pos} className={`absolute ${pos} h-[3px] w-[3px] rounded-full bg-black/45`} aria-hidden />
        ))}
      {frame === "stone" &&
        ["left-0 top-0", "right-0 top-0", "left-0 bottom-0", "right-0 bottom-0"].map((pos) => (
          <span key={pos} className={`absolute ${pos} h-2 w-2 bg-white/[0.07]`} aria-hidden />
        ))}
    </div>
  );
}
