/*
  파일명: /components/features/user/explore/monologue/MonologueScreen.tsx
  기능: 가상독백 수집 화면
  책임: 독백 인물의 검색·분류·페이지 목록과 선택한 인물의 소개·독백·음원·책장을 보여준다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import type { VirtualMonologueCeleb } from "@/actions/celebs/getVirtualMonologueCelebs";
import { getCountryNameByLocale } from "@/lib/countries";
import MonologueDeck from "./MonologueDeck";

interface MonologueScreenProps {
  celebs: VirtualMonologueCeleb[];
  locale: string;
}

export default async function MonologueScreen({ celebs, locale }: MonologueScreenProps) {
  const t = await getTranslations("explore.monologue");
  const tProfession = await getTranslations("profession");
  // Intl 국가명·정렬은 Node와 브라우저의 ICU 버전에 따라 다르므로 서버에서 한 번 확정한다.
  const browseOptions = {
    professions: [...new Set(celebs.map(celeb => celeb.profession).filter((value): value is string => !!value))]
      .map(value => ({ value, label: tProfession.has(value) ? tProfession(value) : value }))
      .sort((a, b) => a.label.localeCompare(b.label, locale)),
    nationalities: [...new Set(celebs.map(celeb => celeb.nationality).filter((value): value is string => !!value))]
      .map(value => ({ value, label: getCountryNameByLocale(value, locale) }))
      .sort((a, b) => a.label.localeCompare(b.label, locale)),
  };

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
          {t("stats", { total: celebs.length, voiced: celebs.filter(celeb => celeb.hasVoice).length })}
        </p>
      </header>

      {celebs.length > 0 ? (
        <section aria-labelledby="monologue-voiced">
          <div className="mb-5 text-center md:mb-6">
            <h2 id="monologue-voiced" className="font-serif text-lg font-bold tracking-tight text-text-primary md:text-xl">
              {t("voicedTitle")}
            </h2>
            <p className="mt-1.5 break-keep text-xs leading-relaxed text-text-secondary md:text-sm">
              {t("voicedDesc")}
            </p>
          </div>
          <MonologueDeck items={celebs} browseOptions={browseOptions} />
        </section>
      ) : null}
    </div>
  );
}
