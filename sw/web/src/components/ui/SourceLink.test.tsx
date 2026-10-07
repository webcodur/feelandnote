import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import SourceLink from "./SourceLink";

test("one source remains a direct external link", () => {
  const $ = load(renderToStaticMarkup(
    <SourceLink sourceUrl="https://example.com/reading">Review source</SourceLink>,
  ));
  assert.equal($("a").attr("href"), "https://example.com/reading");
  assert.equal($("a").attr("target"), "_blank");
  assert.equal($("button").length, 0);
});

test("multiple sources use a list trigger instead of a combined href", () => {
  const $ = load(renderToStaticMarkup(
    <SourceLink sourceUrl="https://example.com/reading | https://example.com/explanation">리뷰 출처</SourceLink>,
  ));
  assert.equal($("a").length, 0);
  assert.equal($("button").text(), "리뷰 출처");
  assert.equal($("button").attr("aria-haspopup"), "dialog");
  assert.equal($("button").attr("aria-expanded"), "false");
});

test("duplicate sources still open directly and empty sources have no control", () => {
  const duplicate = renderToStaticMarkup(
    <SourceLink sourceUrl="https://example.com/reading | https://example.com/reading">Source</SourceLink>,
  );
  assert.equal(load(duplicate)("a").length, 1);
  assert.equal(renderToStaticMarkup(<SourceLink sourceUrl=" | javascript:alert(1) ">Source</SourceLink>), "");
});
