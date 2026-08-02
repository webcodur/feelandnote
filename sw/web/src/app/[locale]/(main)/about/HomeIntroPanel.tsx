/*
  파일명: /app/(main)/about/HomeIntroPanel.tsx
  기능: 홈 환영판 — 첫인사 액자만 세운다
  책임: 홈에서는 제목 없이 첫인사만 보이고, 맺음 문장을 누르면 서비스 소개(/about)로 넘어간다.
        나머지 소개 본문(지향점·현황·제작 방식·초대)은 /about 한 곳에만 둔다.
*/

import { getLocale, getTranslations } from "next-intl/server";
import { getProfilesBySlugs } from "@/actions/celebs/getProfilesBySlugs";
import IntroFrame from "@/components/features/home/IntroFrame";

/** 첫인사 액자에 들어갈 자료 — 사례 본문과 영감의 연쇄 인물 얼굴 */
async function buildIntroLabels(locale: string) {
  const t = await getTranslations("home.ui.tabs");
  const rawChains = t.raw("inspirationChains") as { reader: string; author: string; text: string }[][];
  const slugSet = new Set<string>();
  rawChains.forEach((chain) =>
    chain.forEach((step) => {
      slugSet.add(step.reader);
      slugSet.add(step.author);
    })
  );
  // 캐시 키 안정화 — 명단 순서가 흔들려도 같은 캐시를 쓴다
  const profileMap = await getProfilesBySlugs(Array.from(slugSet).sort());
  const isEn = locale === "en";
  const inspirationChains = rawChains.map((chain) =>
    chain.map((step) => {
      const r = profileMap[step.reader];
      const a = profileMap[step.author];
      return {
        text: step.text,
        reader: r ? { avatar_url: r.avatar_url, name: (isEn ? r.nickname_en || r.nickname : r.nickname) ?? step.reader } : null,
        author: a ? { avatar_url: a.avatar_url, name: (isEn ? a.nickname_en || a.nickname : a.nickname) ?? step.author } : null,
      };
    })
  );
  return {
    intro: t("intro"),
    inspirationChainTitle: t("inspirationChainTitle"),
    inspirationChains,
    inspirationConclusion: t("inspirationConclusion"),
  };
}

export default async function HomeIntroPanel() {
  const locale = await getLocale();
  const labels = await buildIntroLabels(locale);

  return <IntroFrame labels={labels} closingHref="/about" />;
}
