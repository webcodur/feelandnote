/*
  파일명: components/features/game/myth/shared/hub/HubEpicCard.tsx
  기능: 신화 게임 목록 큰 칸
  책임: 한 판이 긴 큰 게임(epic)을 표지 그림을 가득 채운 큰 칸으로 맨 위에 세운다.
        금테·네 모서리 장식을 두르고, hover는 테두리·이름 색이 즉시 바뀌며 그림 확대는 자식이 맡는다.
*/ // ------------------------------
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface Props {
  href: string;
  cover: string | null;
  title: string;
  intro: string | null;
  badge: string;
  enterLabel: string;
  order: number;
}

const ENTER = "animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none";
const CORNER = "pointer-events-none absolute h-6 w-6 border-accent";

export default function HubEpicCard({ href, cover, title, intro, badge, enterLabel, order }: Props) {
  return (
    <li className={ENTER} style={{ animationDelay: `${80 + order * 90}ms` }}>
      <Link
        href={href}
        className="group relative isolate flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-3xl border border-accent-dim bg-bg-card shadow-[0_30px_80px_-30px_rgba(var(--color-accent-rgb),0.45)] hover:border-accent sm:aspect-[16/9]"
      >
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" decoding="async" className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105" />
        )}
        <span aria-hidden className="absolute inset-0 -z-10 bg-linear-to-t from-bg-main via-bg-main/45 to-transparent" />
        <span aria-hidden className="absolute inset-0 -z-10 bg-linear-to-r from-bg-main/60 via-transparent to-transparent" />
        <span aria-hidden className="pointer-events-none absolute inset-2.5 rounded-[18px] border border-accent/30" />
        <span aria-hidden className={`${CORNER} start-4 top-4 border-s-2 border-t-2`} />
        <span aria-hidden className={`${CORNER} end-4 top-4 border-e-2 border-t-2`} />
        <span aria-hidden className={`${CORNER} bottom-4 start-4 border-b-2 border-s-2`} />
        <span aria-hidden className={`${CORNER} bottom-4 end-4 border-b-2 border-e-2`} />
        <div className="flex flex-col gap-2 p-6 sm:p-8">
          <span className="self-start rounded-full bg-accent px-3 py-1 text-sm font-bold tracking-[0.12em] text-bg-main">{badge}</span>
          <span className="break-keep text-3xl font-black leading-tight tracking-tight text-text-primary group-hover:text-accent sm:text-4xl">{title}</span>
          {intro && <span className="line-clamp-2 max-w-xl break-keep text-sm leading-relaxed text-text-primary sm:text-base">{intro}</span>}
          <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-accent">
            {enterLabel}
            <ArrowRight size={16} aria-hidden />
          </span>
        </div>
      </Link>
    </li>
  );
}
