import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { NextIntlClientProvider } from "next-intl";
import type { ContentBrief } from "@/actions/contents/getContentBrief";

test("인물 페이지의 짧은 소개와 접힌 장문도 본문 표시를 사용한다", async () => {
  const require = createRequire(import.meta.url);
  const cssLoader = require.extensions[".css"];
  // 이 테스트는 본문 구조를 검사한다. CSS 배치는 별도 실제 브라우저 검사에서 확인한다.
  require.extensions[".css"] = module => { module.exports = {}; };
  const { default: ContentIntro } = await import("./ContentIntro");
  if (cssLoader) require.extensions[".css"] = cssLoader;
  else delete require.extensions[".css"];
  const previous = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "development" });
  try {
    for (const tail of ["다음 설명입니다.", "긴 설명입니다. ".repeat(1200)]) {
      const description = "첫 문단입니다.\n\n# 본문에 들어 있는 표기\n" + tail;
      const brief = { description, category: "book" } as ContentBrief;
      const html = renderToStaticMarkup(
        <NextIntlClientProvider locale="ko" timeZone="Asia/Seoul" messages={{archiveSearch:{
          expandContentIntro:"작품 소개",expandBookIntro:"책 소개",expandIntroMore:"전체 소개 보기",
        }}}>
          <ContentIntro brief={brief} category="book" isLoading={false} inlineLabel />
        </NextIntlClientProvider>,
      );
      const $ = load(html);
      assert.equal($('[data-text-paragraph]').length, 2);
      assert.equal($('[data-text-heading]').length, 0);
      assert.equal($('[role="separator"]').length, 0);
      assert.ok($.text().includes("# 본문에 들어 있는 표기"));
    }
  } finally {
    if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: previous });
  }
});
