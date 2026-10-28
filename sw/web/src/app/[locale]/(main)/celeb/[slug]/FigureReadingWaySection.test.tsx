import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";

import FigureReadingWaySection from "./FigureReadingWaySection";

test("reading approach formats titles and quotes while preserving paragraphs and line breaks", () => {
  const $ = load(renderToStaticMarkup(React.createElement(FigureReadingWaySection, {
    text: '  『논어』를 읽었다.\n「배움」을 메모했다.\n\n"다시 읽는다"고 말했다.  ',
  })));

  assert.equal($("p").length, 2);
  assert.equal($("p").first().text(), "《논어》를 읽었다.‘배움’을 메모했다.");
  assert.equal($("p").first().find("br").length, 1);
  assert.equal($(".text-text-primary.font-semibold").text(), "《논어》");
  assert.equal($(".font-serif.text-accent").text(), "‘배움’");
  assert.equal($(".text-accent-hover").text(), "“다시 읽는다”");
});

test("reading approach formats English text and hides missing text", () => {
  const $ = load(renderToStaticMarkup(React.createElement(FigureReadingWaySection, {
    text: 'He read <Hamlet>.\r\n\r\nHe said "read again".',
  })));
  assert.equal($("p").length, 2);
  assert.equal($(".font-serif.text-accent").text(), "‘Hamlet’");
  assert.equal($(".text-accent-hover").text(), "“read again”");

  for (const text of [null, "", " \r\n "]) {
    assert.equal(renderToStaticMarkup(React.createElement(FigureReadingWaySection, { text })), "");
  }
});
