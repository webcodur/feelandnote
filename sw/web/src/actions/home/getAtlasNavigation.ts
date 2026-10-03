"use server";

import { getLocale, getTranslations } from "next-intl/server";
import { buildFactionSections } from "@/lib/faction-sections";
import { buildFactionNavigation, buildMythNavigation } from "@/lib/atlas-navigation";
import { getMythClientData } from "./mythPublicData";
import { getMythData } from "./getMythData";
import { getFeaturedFactions } from "./getFeaturedFactions";

// 다른 세계를 열 때 목록만 받는다. 인물·작품 본문은 확정 후 해당 주소에서 읽는다.
export async function getAtlasNavigation(myth: boolean) {
  const locale = (await getLocale()) === "en" ? "en" : "ko";
  const t = await getTranslations("explore.hub.myth");
  if (myth) return buildMythNavigation(getMythClientData(await getMythData(locale)), { other: t("otherGroup"), unnamed: t("unnamedGroup") });
  return buildFactionNavigation(buildFactionSections(await getFeaturedFactions()), locale, t("otherGroup"));
}
