/*
  파일명: /components/shared/HubCard.tsx
  기능: 허브 페이지 카드
  책임: 서브페이지 미리보기 카드를 렌더링하고 클릭 시 해당 페이지로 이동한다.

  상호작용 규약 (docs/project/code-rules.md "상호작용" 절):
    - 즉각 반응(transition 없음): 테두리 금색 강조 + 제목 금색 전환. 손을 올린 즉시 바뀐다.
    - 곁들이는 연출(transition 허용): 배경 확대, 모서리 장식, 하단 라인 확장.
*/ // ------------------------------

import { ReactNode } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";

interface HubCardProps {
  id?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
  title: string;
  description: string;
  icon?: ReactNode;
  label?: string;
  /** 카드 배경에 깔 상징 이미지 경로 (없으면 기존 단색 배경) */
  backgroundImage?: string;
}

/** 모서리 갈고리 장식 — 네 귀퉁이를 금선으로 물어 액자처럼 잡아준다 */
function CornerBracket({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  // 내부 헤어라인(inset-[3px]) 위에 정확히 얹어 그 모서리를 금선으로 물어준다
  const edge = {
    tl: "top-[3px] left-[3px] border-l-2 border-t-2 rounded-tl-[9px]",
    tr: "top-[3px] right-[3px] border-r-2 border-t-2 rounded-tr-[9px]",
    bl: "bottom-[3px] left-[3px] border-l-2 border-b-2 rounded-bl-[9px]",
    br: "bottom-[3px] right-[3px] border-r-2 border-b-2 rounded-br-[9px]",
  }[position];

  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute h-6 w-6 border-accent/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${edge}`}
    />
  );
}

export default function HubCard({
  id,
  href,
  onClick,
  className: extraClassName,
  title,
  description,
  icon,
  label,
  backgroundImage,
}: HubCardProps) {
  const isButton = !!onClick;
  // 테두리·배경 강조는 transition 없이 즉시 (조작용 요소의 기본 반응)
  const className =
    "group relative isolate overflow-hidden flex flex-col gap-3 rounded-xl w-full text-left " +
    "border border-accent/15 bg-white/[0.02] p-5 md:p-6 " +
    "shadow-[0_10px_40px_-12px_rgba(0,0,0,0.9)] " +
    `hover:border-accent/60 hover:bg-white/[0.04] scroll-mt-24 ${extraClassName ?? ""}`;

  const content = (
    <>
      {/* 배경 상징 이미지 — 왼쪽을 짙게 덮어 본문 가독성을 지킨다 */}
      {backgroundImage && (
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <Image
            src={backgroundImage}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-bg-main/95 via-bg-main/60 to-transparent" />
        </div>
      )}

      {/* 내부 헤어라인 — 이중 윤곽으로 액자 무게를 준다 */}
      <span aria-hidden className="pointer-events-none absolute inset-[3px] rounded-[9px] border border-white/[0.07]" />

      {/* 모서리 갈고리 4개 */}
      <CornerBracket position="tl" />
      <CornerBracket position="tr" />
      <CornerBracket position="bl" />
      <CornerBracket position="br" />

      {/* 아이콘 */}
      {icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent shadow-[0_0_18px_-6px_rgba(212,175,55,0.5)]">
          {icon}
        </div>
      )}

      {/* 영문 라벨 */}
      {label && (
        <span className="text-[10px] font-cinzel font-bold tracking-[0.15em] uppercase text-accent/60">
          {label}
        </span>
      )}

      {/* 제목 — 즉각 반응 축 */}
      <h3 className="font-serif text-lg font-bold text-text-primary group-hover:text-accent">
        {title}
      </h3>

      {/* 설명 */}
      <p className="text-sm leading-relaxed">
        {description}
      </p>

      {/* 하단 장식 — 금선이 좌에서 우로 차오른다 */}
      <div className="mt-auto pt-3">
        <div className="relative h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent">
          <div className="absolute inset-y-0 left-0 w-0 bg-gradient-to-r from-accent/70 to-transparent transition-[width] duration-500 ease-out group-hover:w-full" />
        </div>
      </div>
    </>
  );

  if (isButton) {
    return (
      <button id={id} onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return (
    <Link id={id} href={href || "#"} className={className}>
      {content}
    </Link>
  );
}
