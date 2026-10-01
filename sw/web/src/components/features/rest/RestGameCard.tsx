"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { REST_GAMES } from "@/constants/rest-games";

interface Props {
  game: (typeof REST_GAMES)[number];
  title: string;
  onClick: () => void;
}

export default function RestGameCard({ game, title, onClick }: Props) {
  const t = useTranslations("shared.game");
  const tArena = useTranslations("rest.arena");
  const Icon = game.icon;

  return (
    <button
      id={game.valueKey}
      type="button"
      onClick={onClick}
      aria-label={`${title} · ${t("enterGame")}`}
      className="group relative mx-auto block aspect-[4/3] w-full max-w-3xl overflow-hidden rounded-card border border-line bg-bg-card text-start outline-none hover:border-accent focus-visible:ring-2 focus-visible:ring-accent sm:aspect-[16/7]"
    >
      <Image
        src={game.image}
        alt=""
        fill
        sizes="(max-width: 768px) calc(100vw - 32px), 768px"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-bg-main via-bg-main/30 to-transparent" />
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 md:p-7">
        <span className="flex min-w-0 flex-col gap-3">
          <span className="flex items-center gap-2 text-xs font-medium tracking-widest text-text-secondary">
            <Icon size={18} aria-hidden />
            {game.label}
          </span>
          {game.dev && <span className="text-xs text-text-secondary">{tArena("inDevelopment")}</span>}
          <span className="text-lg font-semibold text-text-primary group-hover:text-accent md:text-xl">
            {t("enterGame")}
          </span>
        </span>
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line-strong bg-bg-main/70 text-text-primary group-hover:border-accent group-hover:text-accent">
          <ArrowRight size={20} />
        </span>
      </span>
    </button>
  );
}
