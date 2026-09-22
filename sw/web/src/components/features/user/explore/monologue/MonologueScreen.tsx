/*
  파일명: /components/features/user/explore/monologue/MonologueScreen.tsx
  기능: 가상독백 수집 화면
  책임: 낭독 음원이 깃든 독백을 큰 발췌 카드로 앞세우고,
        글로만 읽는 독백은 아래 명부에 작게 모아 찾게 한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { ArrowUpRight, AudioLines } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCelebProfileUrl } from "@/lib/url";
import type { VirtualMonologueCeleb } from "@/actions/celebs/getVirtualMonologueCelebs";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import SilentMonologueList from "./SilentMonologueList";

interface MonologueScreenProps {
  voiced: VirtualMonologueCeleb[];
  silent: VirtualMonologueCeleb[];
}

/* 낭독 카드 — 즉각 축은 테두리·이름·CTA 색, 곁들이는 연출은 따옴표 글리프와 아바타 광륜이 맡는다 */
function VoicedCard({ celeb, hero, voiceBadge, listenLabel }: { celeb: VirtualMonologueCeleb; hero?: boolean; voiceBadge: string; listenLabel: string }) {
  return (
    <Link
      href={`${getCelebProfileUrl(celeb)}#reading`}
      prefetch={false}
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-accent/25 bg-[linear-gradient(160deg,#191712_0%,#12110e_55%,#0f0f0f_100%)] shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)] hover:border-accent/60 active:bg-accent/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${hero ? "p-5 md:p-8" : "p-5 md:p-6"}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-6 right-3 select-none font-serif text-[110px] leading-none text-accent/[0.08] transition-opacity duration-500 group-hover:text-accent/[0.16] md:text-[130px]"
      >
        “
      </span>
      <div className={`flex items-center ${hero ? "gap-4 md:gap-5" : "gap-3.5"}`}>
        <span
          className={`relative shrink-0 overflow-hidden rounded-full border border-accent/40 bg-black/40 shadow-[0_0_28px_-8px_rgba(212,175,55,0.5)] ${hero ? "size-16 md:size-20" : "size-14"}`}
        >
          {celeb.avatar_url ? <CelebAvatarImage src={celeb.avatar_url} alt="" boxPx={hero ? 80 : 56} /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`truncate font-bold text-text-primary group-hover:text-accent ${hero ? "text-lg md:text-xl" : "text-base"}`}>
            {celeb.nickname}
          </p>
          {celeb.title ? (
            <p className="mt-0.5 truncate text-xs text-text-secondary md:text-sm">{celeb.title}</p>
          ) : null}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
          <AudioLines size={13} strokeWidth={2} aria-hidden />
          {voiceBadge}
        </span>
      </div>
      <blockquote
        className={`mt-4 break-keep font-serif leading-relaxed text-text-primary/90 md:mt-5 ${hero ? "text-base md:text-lg" : "text-sm md:text-[15px]"}`}
      >
        {celeb.excerpt}
      </blockquote>
      <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-accent/70 group-hover:text-accent md:mt-5">
        {listenLabel}
        <ArrowUpRight size={14} aria-hidden className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

export default async function MonologueScreen({ voiced, silent }: MonologueScreenProps) {
  const t = await getTranslations("explore.monologue");

  return (
    <div className="space-y-10 md:space-y-14">
      <header className="mx-auto max-w-2xl text-center">
        <p className="font-cinzel text-[11px] uppercase tracking-[0.35em] text-accent/80 md:text-xs">
          {t("eyebrow")}
        </p>
        <p className="mt-3 break-keep text-sm leading-relaxed text-text-secondary md:text-base">
          {t("lead")}
        </p>
        <p className="mt-3 text-xs text-text-tertiary">
          {t("stats", { voiced: voiced.length, silent: silent.length })}
        </p>
      </header>

      {voiced.length > 0 ? (
        <section aria-labelledby="monologue-voiced">
          <div className="mb-5 text-center md:mb-6">
            <h2 id="monologue-voiced" className="font-serif text-lg font-bold tracking-tight text-text-primary md:text-xl">
              {t("voicedTitle")}
            </h2>
            <p className="mt-1.5 break-keep text-xs leading-relaxed text-text-secondary md:text-sm">
              {t("voicedDesc")}
            </p>
          </div>
          <ul className="grid gap-4 md:gap-5 lg:grid-cols-2">
            {voiced.map((celeb, index) => (
              <li key={celeb.id} className={index === 0 ? "lg:col-span-2" : undefined}>
                <VoicedCard celeb={celeb} hero={index === 0} voiceBadge={t("voiceBadge")} listenLabel={t("listenCta")} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {silent.length > 0 ? (
        <section aria-labelledby="monologue-silent" className="border-t border-white/10 pt-8 md:pt-10">
          <div className="mb-5 text-center md:mb-6">
            <h2 id="monologue-silent" className="font-serif text-base font-bold tracking-tight text-text-primary md:text-lg">
              {t("silentTitle")}
            </h2>
            <p className="mt-1.5 break-keep text-xs leading-relaxed text-text-secondary md:text-sm">
              {t("silentDesc")}
            </p>
          </div>
          <SilentMonologueList
            celebs={silent.map(({ id, slug, nickname, avatar_url, quote }) => ({ id, slug, nickname, avatar_url, quote }))}
          />
        </section>
      ) : null}
    </div>
  );
}
