import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { AbstractIntlMessages } from "next-intl";
import { CELEB_PROFESSIONS, getCelebProfessionMessages } from "@feelandnote/shared/constants/celeb-professions";

import { BASE_MESSAGE_PATHS, pickMessages } from "./message-scope";

function loadMessages(
  locale: "ko" | "en",
  namespaces: readonly string[],
): AbstractIntlMessages {
  const messages = Object.assign(
    {},
    ...namespaces.map((namespace) => {
      const fileUrl = new URL(`../../messages/${locale}/${namespace}.json`, import.meta.url);
      return JSON.parse(readFileSync(fileUrl, "utf8")) as AbstractIntlMessages;
    }),
  );
  messages.profession = { ...messages.profession, ...getCelebProfessionMessages(locale) };
  return messages;
}

for (const locale of ["ko", "en"] as const) {
  test(`base message scope receives every profession from shared data for ${locale}`, () => {
    const scoped = pickMessages(loadMessages(locale, ["core"]), BASE_MESSAGE_PATHS);
    const professions = scoped.profession as AbstractIntlMessages;
    for (const profession of CELEB_PROFESSIONS) {
      assert.equal(professions[profession.value], locale === "en" ? profession.label_en : profession.label);
    }
    assert.equal(professions.all, locale === "en" ? "All" : "전체");
    assert.equal(professions.uncategorized, locale === "en" ? "Uncategorized" : "미분류");
  });

  test(`base message scope includes the Header agora label for ${locale}`, () => {
    const scoped = pickMessages(loadMessages(locale, ["agora"]), BASE_MESSAGE_PATHS);

    assert.equal(
      (scoped.agora as AbstractIntlMessages | undefined)?.section,
      locale === "ko" ? "광장" : "Agora",
    );
  });

  test(`base message scope includes common celeb modal labels for ${locale}`, () => {
    const scoped = pickMessages(loadMessages(locale, ["home", "celeb"]), BASE_MESSAGE_PATHS);
    const home = scoped.home as AbstractIntlMessages;
    const celebPage = scoped.celebPage as AbstractIntlMessages;
    const followLabel = (home.ui as AbstractIntlMessages | undefined)?.followLabel;
    const modalLabels = [
      celebPage.playGreetingVoice,
      celebPage.dialogue_greeting,
      celebPage.enlargePhoto,
      celebPage.playQuoteVoice,
    ];

    assert.equal(typeof followLabel, "string");
    modalLabels.forEach((label) => assert.equal(typeof label, "string"));

    if (locale === "en") {
      assert.equal(followLabel, "Follow");
    }
  });
}
