/*
  파일명: /components/features/user/explore/monologue/MonologueScreen.tsx
  기능: 가상독백 수집 화면
  책임: 낭독 음원이 있는 인물의 가벼운 명부를 보여준다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import type { VirtualMonologueCeleb } from "@/actions/celebs/getVirtualMonologueCelebs";
import MonologueDeck from "./MonologueDeck";

interface MonologueScreenProps {
  voiced: VirtualMonologueCeleb[];
}

export default async function MonologueScreen({ voiced }: MonologueScreenProps) {
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
          {t("stats", { voiced: voiced.length })}
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
          <MonologueDeck items={voiced} />
        </section>
      ) : null}
    </div>
  );
}
