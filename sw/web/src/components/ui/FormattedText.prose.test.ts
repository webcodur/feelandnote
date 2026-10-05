import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import FormattedText from "./FormattedText";
import ReadingHighlightText from "../shared/ReadingHighlightText";
import { splitTextBlocks } from "./formatted-text/structure";
import { normalizeIntroBreaks, normalizeLegacyIntroBreaks, preserveIntroBreaks } from "../../lib/utils/prose-line-breaks";

function prose(text: string, mark?: { start: number; end: number }) {
  return load(renderToStaticMarkup(React.createElement(FormattedText, { text, mark, layout: "prose" })));
}
function inMode(mode: string, run: () => void) {
  const previous = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: mode });
  try { run(); } finally {
    if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: previous });
  }
}

test("a poem keeps line breaks and authored stanza boundaries", () => {
  const source = "첫 시구\n둘째 시구\n\n다음 연\n마지막 시구";
  const $ = prose(preserveIntroBreaks(source));
  assert.equal($('[data-text-paragraph]').length, 2);
  assert.equal($('br').length, 2);
  assert.equal($('[role=separator]').length, 0);
});

test("publisher section marks separate a synopsis heading from its body", () => {
  const text = "호메로스의 대서사시\n\n⁋시놉시스\n10년의 귀향 이야기입니다.\n\n한편 고향에서는 왕권을 노립니다.\n⁋불확실한 세계를 건너는 기록\n신과 인간의 이야기를 보여줍니다.";
  const $ = prose(text);
  assert.equal($('[data-text-heading]').length, 2);
  assert.equal($('[role=separator]').length, 2);
  assert.equal($('[data-text-paragraph]').filter((_, el) => $(el).text().includes("한편 고향")).text(), "한편 고향에서는 왕권을 노립니다.");
  assert.equal($('[data-text-heading]').first().text(), "시놉시스");
});

test("many blank lines remain an ordinary paragraph boundary", () => {
  const $ = prose("첫 문단\n\n\n\n다음 문단");
  assert.equal($('[data-text-paragraph]').length, 2);
  assert.equal($('[role=separator]').length, 0);
});

test("standalone divider variants display as one spaced separator", () => {
  for (const divider of ["---", "-----", "- - -", "  - - -  "]) {
    const $ = prose(`첫 문단\n\n${divider}\n\n다음 문단`);
    assert.equal($('[data-text-paragraph]').length, 2);
    assert.equal($('[role=separator]').length, 1);
    assert.equal($('[role=separator]').text(), "- - -");
    assert.equal($('br').length, 0);
  }
});

test("lists and hyphens within sentences do not become sections", () => {
  const $ = prose("- 첫 항목\n- 둘째 항목\nA --- B, long-term, 1990–2000.");
  assert.equal($('[role=separator]').length, 0);
  assert.equal($('br').length, 2);
  assert.match($.text(), /A --- B, long-term/);
});

test("consecutive dividers collapse and empty leading/trailing sections are omitted", () => {
  const $ = prose("---\n\n첫 문단\n---\n\n- - -\n다음 문단\n---");
  assert.equal($('[role=separator]').length, 1);
  assert.equal($('[data-text-paragraph]').length, 2);
});

test("paragraph ranges preserve original CRLF and indentation offsets", () => {
  const source = "앞 문단\r\n\r\n  ---\r\n\r\n  뒤 문단 ‘강조’";
  const blocks = splitTextBlocks(source);
  for (const block of blocks) {
    if (block.kind === "paragraph") assert.equal(source.slice(block.start, block.end), block.text);
  }
  const start = source.indexOf("강조");
  const $ = prose(source, { start, end: start + 2 });
  assert.equal($('mark').text(), "강조");
  assert.equal($('mark').parent().attr('class'), "font-serif text-accent");
});

test("narration marks in later paragraphs retain title and term emphasis", () => {
  const text = '앞 문단.\n\n---\n\n뒤 문단의 『작품명』과 인공지능(AI).';
  const start = text.indexOf("작품명"), end = text.indexOf("AI") + 2;
  const $ = prose(text, { start, end });
  assert.equal($('mark').map((_, e) => $(e).text()).get().join(''), "작품명》과 인공지능(AI");
  assert.equal($('mark').first().parent().attr('class'), "text-white font-bold");
});

test("development switches both introduction normalization and the shared renderer", () => {
  inMode("development", () => {
    const text = "제목\n\n다음 제목\n\n---\n\n본문";
    assert.equal(normalizeIntroBreaks(text), text);
    const $ = load(renderToStaticMarkup(React.createElement(FormattedText, { text })));
    assert.equal($('[data-text-paragraph]').length, 3);
    assert.equal($('[role=separator]').length, 1);
    const raw = "첫 문장이다. 둘째 문장이다.\n셋째 문장이다. 넷째 문장이다.";
    assert.equal(normalizeIntroBreaks(raw), raw);
  });
});

test("production keeps the existing introduction normalization and inline renderer", () => {
  inMode("production", () => {
    const text = "제목\n\n다음 제목\n\n---\n\n본문";
    assert.equal(normalizeIntroBreaks(text), normalizeLegacyIntroBreaks(text));
    const $ = load(renderToStaticMarkup(React.createElement(FormattedText, { text })));
    assert.equal($('[data-formatted-layout]').length, 0);
    assert.equal($('[role=separator]').length, 0);
  });
});

test("segmented narration also shares sections without shifting the active sentence", () => {
  inMode("development", () => {
    const text = "첫 문단.\n\n---\n\n둘째 문단의 ‘인용’입니다.";
    const start = text.indexOf("인용");
    const $ = load(renderToStaticMarkup(React.createElement(ReadingHighlightText, {
      text, mark: { start, end: start + 2 }, segments: [{ start: 0, end: 2, textStart: text.indexOf("둘째"), textEnd: text.length }],
      onPlayFrom: () => {},
    })));
    assert.equal($('[role=separator]').length, 1);
    assert.equal($('mark').text(), "인용");
    assert.ok($('[role=button]').length > 0);
  });
});
