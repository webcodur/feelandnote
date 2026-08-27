/*
  파일명: /components/features/celeb/RelationMap/CelebNode.tsx
  기능: 관계망 그래프에 서는 인물 한 명 — 표시 전용
  책임: 네 그래프(사슬·갈래·맞수·무리)가 같은 얼굴·이름 규격을 쓰게 한다.
        크기만 자리에 맞춰 고르고 나머지는 이 부품이 정한다 — 그래프마다 따로 짜면
        같은 인물이 판마다 다른 크기와 굵기로 서서 한 구획으로 읽히지 않는다.
*/

import { User } from "lucide-react";

import { Link } from "@/i18n/navigation";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";

export type NodeSize = "sm" | "md" | "lg" | "xl";

/** 크기별 규격. tailwind가 클래스를 정적으로 훑으므로 문자열을 그대로 적는다(보간 금지) */
const SIZE_SPEC: Record<
  NodeSize,
  { box: string; px: number; name: string; title: string; width: string }
> = {
  sm: { box: "size-14", px: 56, name: "text-xs", title: "text-[11px]", width: "w-[92px]" },
  md: { box: "size-16", px: 64, name: "text-sm", title: "text-xs", width: "w-[104px]" },
  lg: { box: "size-24", px: 96, name: "text-base", title: "text-xs", width: "w-[128px]" },
  xl: { box: "size-32", px: 128, name: "text-lg", title: "text-sm", width: "w-[168px]" },
};

export interface NodeCeleb {
  id: string;
  slug: string | null;
  nickname: string;
  nicknameEn: string | null;
  avatarUrl: string | null;
  title: string | null;
  titleEn: string | null;
}

interface CelebNodeProps {
  celeb: NodeCeleb;
  isEn: boolean;
  size?: NodeSize;
  /** 그래프의 주인공. 얼굴에 금테를 둘러 판의 중심을 알린다 */
  emphasis?: boolean;
  /** 이름 아래 직함을 적을지. 얼굴이 빽빽한 자리에서는 끈다 */
  showTitle?: boolean;
  /** 이름 대신 이 문구를 쓴다 — 관계 라벨 같은 호출처 고유 정보 */
  caption?: string;
  className?: string;
}

export default function CelebNode({
  celeb,
  isEn,
  size = "sm",
  emphasis = false,
  showTitle = true,
  caption,
  className = "",
}: CelebNodeProps) {
  const spec = SIZE_SPEC[size];
  const name = (isEn && celeb.nicknameEn) || celeb.nickname;
  const title = (isEn && celeb.titleEn) || celeb.title;

  return (
    <Link
      href={`/celeb/${celeb.slug}`}
      className={`group flex flex-col items-center gap-2 text-center ${spec.width} ${className}`}
    >
      {/* 얼굴 테두리는 지연 없이 즉시 바뀐다 — 확대만 부드럽게 준다 */}
      <span
        className={`relative block ${spec.box} shrink-0 overflow-hidden rounded-full border-2 bg-main transition-transform duration-200 group-hover:scale-105 ${
          emphasis ? "border-accent/70" : "border-white/10 group-hover:border-accent/60"
        }`}
      >
        {celeb.avatarUrl ? (
          <CelebAvatarImage
            src={celeb.avatarUrl}
            alt={name}
            boxPx={spec.px}
            className="size-full object-cover"
          />
        ) : (
          <User
            aria-hidden
            size={Math.round(spec.px / 3)}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-text-secondary"
          />
        )}
      </span>

      <span className="flex min-w-0 flex-col gap-0.5">
        {/* break-keep은 한국어를 어절로 끊는다(「헨리 데이비드 / 소로」) */}
        <span
          className={`break-keep font-semibold leading-tight text-text-primary group-hover:text-accent ${spec.name}`}
        >
          {name}
        </span>
        {showTitle && (caption || title) && (
          <span className={`line-clamp-2 break-keep leading-tight text-text-secondary ${spec.title}`}>
            {caption || title}
          </span>
        )}
      </span>
    </Link>
  );
}
