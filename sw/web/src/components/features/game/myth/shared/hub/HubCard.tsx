/*
  파일명: components/features/game/myth/shared/hub/HubCard.tsx
  기능: 신화 게임 목록 카드
  책임: 게임 하나를 표지 그림·무게(가볍게·깊게)·이름·소개로 보인다. 휴대폰은 그림을 옆에 둔 한 줄,
        넓은 화면은 그림이 위에 선 세로 카드다. hover는 테두리·이름 색이 즉시 바뀌고, 그림 확대와 금선은 자식이 맡는다.
*/ // ------------------------------
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface Props {
  href: string;
  cover: string | null;
  title: string;
  intro: string | null;
  weightLabel: string;
  deep: boolean;
  order: number;
}

// 차례대로 떠오르게 한다(움직임을 줄인 사람에게는 끈다)
const ENTER = "animate-[fadeInUp_0.7s_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none";

export default function HubCard({ href, cover, title, intro, weightLabel, deep, order }: Props) {
  return (
    <li className={`${ENTER} h-full`} style={{ animationDelay: `${120 + order * 70}ms` }}>
      <Link
        href={href}
        className="group relative flex h-full overflow-hidden rounded-2xl border border-border bg-bg-card/85 hover:border-accent sm:flex-col"
      >
        <div className="relative aspect-square w-28 shrink-0 overflow-hidden bg-bg-stone-light sm:aspect-[16/10] sm:w-full">
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
          )}
          <span aria-hidden className="absolute inset-0 bg-linear-to-r from-transparent to-bg-card/40 sm:bg-linear-to-t sm:from-bg-card sm:via-bg-card/10 sm:to-transparent" />
          <span aria-hidden className="absolute inset-1.5 hidden rounded-xl border border-accent/20 sm:block" />
        </div>
        <div className="relative flex min-w-0 flex-1 flex-col gap-1.5 p-3.5 sm:p-4 sm:pt-2">
          <span className={`text-sm font-semibold tracking-[0.12em] ${deep ? "text-accent" : "text-text-secondary"}`}>{weightLabel}</span>
          <span className="flex items-center gap-2">
            <span className="min-w-0 flex-1 break-keep text-lg font-bold leading-snug text-text-primary group-hover:text-accent">{title}</span>
            <ChevronRight size={18} aria-hidden className="shrink-0 text-accent-dim group-hover:text-accent" />
          </span>
          {intro && <span className="line-clamp-3 break-keep text-sm leading-relaxed text-text-secondary">{intro}</span>}
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 scale-x-0 bg-linear-to-r from-transparent via-accent to-transparent transition-transform duration-500 ease-out group-hover:scale-x-100" />
        </div>
      </Link>
    </li>
  );
}
