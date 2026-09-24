/*
  파일명: /components/features/user/explore/monologue/MonologueScreen.tsx
  기능: 가상독백 수집 화면
  책임: 낭독 음원이 깃든 독백을 큰 발췌 카드로 앞세우고,
        글로만 읽는 독백은 아래 명부에 작게 모아 찾게 한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import type { VirtualMonologueCeleb } from "@/actions/celebs/getVirtualMonologueCelebs";
import SilentMonologueList from "./SilentMonologueList";
import VoicedMonologueCard from "./VoicedMonologueCard";
import { getCelebVirtualMonologue } from "@/actions/celebs/getCelebVirtualMonologue";

interface MonologueScreenProps {
  voiced: VirtualMonologueCeleb[];
  silent: VirtualMonologueCeleb[];
}

export default async function MonologueScreen({ voiced, silent }: MonologueScreenProps) {
  const t = await getTranslations("explore.monologue");
  const voicedWithText = await Promise.all(voiced.map(async (celeb) => ({
    celeb,
    text: await getCelebVirtualMonologue(celeb.id, celeb.voiceLocale) ?? "",
  })));

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
            {voicedWithText.map(({ celeb, text }, index) => (
              <li key={celeb.id} className={index === 0 ? "lg:col-span-2" : undefined}>
                <VoicedMonologueCard celeb={celeb} text={text} hero={index === 0} voiceBadge={t("voiceBadge")} listenLabel={t("listenCta")} profileLabel={t("openProfile")} />
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
