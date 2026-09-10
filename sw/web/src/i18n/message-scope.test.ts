import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { AbstractIntlMessages } from "next-intl";

import { BASE_MESSAGE_PATHS, pickMessages } from "./message-scope";

function loadMessages(
  locale: "ko" | "en",
  namespaces: readonly string[],
): AbstractIntlMessages {
  return Object.assign(
    {},
    ...namespaces.map((namespace) => {
      const fileUrl = new URL(`../../messages/${locale}/${namespace}.json`, import.meta.url);
      return JSON.parse(readFileSync(fileUrl, "utf8")) as AbstractIntlMessages;
    }),
  );
}

for (const locale of ["ko", "en"] as const) {
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
    const personGuide = celebPage.personGuide;
    const modalLabels = [
      celebPage.stopAudio,
      celebPage.playGreetingVoice,
      celebPage.dialogue_greeting,
      celebPage.enlargePhoto,
      celebPage.playQuoteVoice,
    ];

    assert.equal(typeof followLabel, "string");
    assert.equal(typeof personGuide, "string");
    modalLabels.forEach((label) => assert.equal(typeof label, "string"));

    if (locale === "en") {
      assert.equal(followLabel, "Follow");
      assert.equal(personGuide, "Figure Guide");
    }
  });
}
