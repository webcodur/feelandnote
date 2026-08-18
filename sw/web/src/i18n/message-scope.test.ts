import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { AbstractIntlMessages } from "next-intl";

import { BASE_MESSAGE_PATHS, pickMessages } from "./message-scope";

function loadAgoraMessages(locale: "ko" | "en"): AbstractIntlMessages {
  const fileUrl = new URL(`../../messages/${locale}/agora.json`, import.meta.url);
  return JSON.parse(readFileSync(fileUrl, "utf8")) as AbstractIntlMessages;
}

for (const locale of ["ko", "en"] as const) {
  test(`base message scope includes the Header agora label for ${locale}`, () => {
    const scoped = pickMessages(loadAgoraMessages(locale), BASE_MESSAGE_PATHS);

    assert.equal(
      (scoped.agora as AbstractIntlMessages | undefined)?.section,
      locale === "ko" ? "광장" : "Agora",
    );
  });
}
