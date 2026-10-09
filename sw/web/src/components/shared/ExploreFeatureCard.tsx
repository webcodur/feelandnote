import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import styles from "./ExploreFeatureCard.module.css";

/*
  탐색 두 모드 아래 「주제별 탐색」의 안내 카드. 크기는 두 단계뿐이다.
  - 기본(큰 카드): 휴대폰은 그림이 위, 글이 아래인 세로 타일(두 열로 놓인다). md부터 글 | 정사각 그림 두 칸.
  - compact(낮은 줄 카드): 글 | 작은 그림. 휴대폰 두 열에서는 설명을 접고 이름만 둔다.
  그림은 청동 소품(art — 칸을 채워 자른다) 또는 선 아이콘(icon — 둥근 받침 가운데).
  같은 사이트 안으로 가는 입구라 → 화살표를 쓴다(↗는 바깥 사이트로 나가는 표시로 읽힌다).
  단색 카드 배경에 그림을 잇고, hover의 즉각 축은 테두리·제목 색이다.
  그림 확대는 곁들이는 연출이다.
*/
const ZOOM = "transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:transform-none";

function CardFrame({ href, className, children }: { href?: string; className: string; children: ReactNode }) {
  if (!href) return <div aria-disabled="true" className={className}>{children}</div>;
  return <Link href={href} prefetch={false}
    className={`group hover:border-accent/60 active:bg-accent/10 outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}>
    {children}
  </Link>;
}

export default function ExploreFeatureCard({ href, title, description, imageSrc, imageKind = "art", imageFit = "cover", wide = false, compact = false, badge }: {
  href?: string;
  title: string;
  description: string;
  imageSrc: string;
  imageKind?: "art" | "icon";
  imageFit?: "cover" | "contain";
  wide?: boolean;
  compact?: boolean;
  badge?: string;
}) {
  const badgeNode = badge && (
    <span className="w-fit shrink-0 rounded-control border border-line-strong px-1.5 py-0.5 text-xs font-medium text-text-secondary">{badge}</span>
  );

  if (compact) {
    return (
      <CardFrame href={href}
        className="relative grid min-h-[72px] grid-cols-[minmax(0,1fr)_56px] items-center overflow-hidden rounded-card border border-line bg-bg-card sm:min-h-24 sm:grid-cols-[minmax(0,1fr)_88px] md:min-h-28 md:grid-cols-[minmax(0,1fr)_112px]">
        <div className={`relative order-2 flex aspect-square w-full items-center justify-center overflow-hidden ${imageKind === "art" ? styles.compactArtwork : ""}`}>
          {imageKind === "icon" ? (
            <span className="flex size-11 items-center justify-center rounded-full border border-line-strong bg-bg-card sm:size-14">
              <Image src={imageSrc} alt="" width={32} height={32} className={`size-6 sm:size-8 ${ZOOM}`} />
            </span>
          ) : (
            <Image src={imageSrc} alt="" fill sizes="112px" className={`${imageFit === "contain" ? "object-contain" : "object-cover"} object-center ${ZOOM}`} />
          )}
        </div>
        <div className="relative z-10 flex min-w-0 flex-col justify-center gap-1.5 px-3 py-3 sm:px-4 md:px-5">
          <h3 className="flex flex-wrap items-center gap-x-2 gap-y-1 break-keep text-[15px] font-semibold leading-snug text-text-primary group-hover:text-accent sm:text-base">
            <span className="inline-flex items-center gap-1.5">{title}{href && <ArrowRight size={15} className="shrink-0 text-accent" aria-hidden />}</span>
            {badgeNode}
          </h3>
          {/* 줄 수 자르기(line-clamp)가 display를 쓰므로 숨김은 바깥 칸이 맡는다 */}
          <div className="hidden sm:block">
            <p className="line-clamp-2 break-keep text-sm leading-relaxed text-text-secondary">{description}</p>
          </div>
        </div>
      </CardFrame>
    );
  }

  return (
    <CardFrame href={href}
      className={`relative flex flex-col overflow-hidden rounded-card border border-line bg-bg-card md:grid md:min-h-56 md:grid-cols-[minmax(0,1fr)_44%] md:items-center ${wide ? "lg:grid-cols-[minmax(0,1fr)_24%]" : ""}`}>
      <div className={`relative aspect-[4/3] w-full overflow-hidden md:order-2 md:aspect-square ${styles.largeArtwork}`}>
        <Image src={imageSrc} alt="" fill sizes={wide ? "(min-width: 1024px) 256px, (min-width: 768px) 44vw, 50vw" : "(min-width: 1024px) 260px, (min-width: 768px) 22vw, 50vw"}
          className={`${imageFit === "contain" ? "object-contain" : "object-cover"} object-center ${ZOOM}`} />
      </div>
      <div className="relative z-10 flex min-w-0 flex-col justify-center px-3 pb-3.5 pt-1 md:pl-6 md:pr-3 md:py-5">
        {badgeNode && <div className="mb-2">{badgeNode}</div>}
        <h3 className="text-base font-semibold leading-snug text-text-primary group-hover:text-accent md:text-xl">
          <span className="inline-flex items-center gap-1.5">{title}{href && <ArrowRight size={17} className="shrink-0 text-accent" aria-hidden />}</span>
        </h3>
        <p className="mt-1 line-clamp-2 max-w-sm break-keep text-sm leading-relaxed text-text-secondary md:mt-2 md:line-clamp-none">{description}</p>
      </div>
    </CardFrame>
  );
}
