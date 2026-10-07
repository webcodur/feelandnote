"use client";

import type { ReactNode } from "react";
import { BookOpen, Film, Gamepad2, Music } from "lucide-react";
import ContentCover from "@/components/ui/ContentCover";
import type { ContentType } from "@/types/database";

export interface ContentFact { label: string; value: ReactNode }

// 정보 창의 표지·제목·서지는 한 벌만 그린다. 모바일에서 서지를 아래로, 넓은 화면에서는 표지 옆으로 옮긴다.
export default function ContentInfoHeader({ type, title, creator, thumbnail, label, subtitle, facts = [], extra, factsExtra, compact = false }: {
  type: ContentType;
  title: string;
  creator?: string | null;
  thumbnail?: string | null;
  label?: ReactNode;
  subtitle?: string | null;
  facts?: ContentFact[];
  extra?: ReactNode;
  factsExtra?: ReactNode;
  compact?: boolean;
}) {
  const Icon = { BOOK: BookOpen, VIDEO: Film, GAME: Gamepad2, MUSIC: Music }[type];
  const hasFacts = facts.length > 0 || Boolean(factsExtra);
  return <header className={`grid items-start gap-x-4 gap-y-4 ${compact ? "grid-cols-[64px_minmax(0,1fr)]" : "grid-cols-[96px_minmax(0,1fr)] md:grid-cols-[144px_minmax(0,1fr)] md:gap-x-6"} ${hasFacts && !compact ? "md:grid-rows-[auto_1fr]" : ""}`}>
    <div className={`relative overflow-hidden rounded-control border border-line bg-bg-secondary shadow-lg ${type === "MUSIC" ? "aspect-square" : "aspect-[2/3]"} ${hasFacts ? "md:row-span-2" : ""}`}>
      <ContentCover src={thumbnail} alt={title} sizes={compact ? "64px" : "(max-width: 767px) 96px, 144px"} className="object-contain"
        fallback={<div className="flex h-full items-center justify-center text-text-tertiary"><Icon size={28} aria-hidden /></div>} />
    </div>
    <div className="min-w-0">
      {label && <p className="mb-2 pe-7 text-xs font-medium tabular-nums text-accent">{label}</p>}
      <h2 className={`break-words text-xl font-semibold leading-tight text-text-primary ${compact ? "" : "md:text-2xl"} ${label ? "" : "pe-7"}`}>{title}</h2>
      {subtitle && <p className="mt-2 text-sm leading-relaxed text-text-secondary">{subtitle}</p>}
      {creator && <p className="mt-2 text-sm leading-relaxed text-text-secondary">{creator}</p>}
      {extra}
    </div>
    {hasFacts && <div className="col-span-2 min-w-0 md:col-span-1 md:col-start-2 md:row-start-2">
      <dl className="space-y-1.5 text-xs leading-relaxed text-text-secondary">
        {facts.map(({ label: name, value }) => <div key={name} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
          <dt className="text-text-tertiary">{name}</dt><dd className="break-words">{value}</dd>
        </div>)}
      </dl>
      {factsExtra && <div className="mt-3">{factsExtra}</div>}
    </div>}
  </header>;
}
