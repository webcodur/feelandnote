import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import FormattedText from "./FormattedText";

function renderText(text: string) {
  return renderToStaticMarkup(React.createElement(FormattedText, { text }));
}

function renderHighlightedText(text: string) {
  return renderToStaticMarkup(
    React.createElement(FormattedText, { text, highlightClassName: "text-3d-gold-bright" }),
  );
}

test("straight and typographic double quotes share the same emphasis", () => {
  const html = renderText('"straight quote" 그리고 “여닫는 quote”');

  assert.equal((html.match(/font-medium text-accent-hover/g) ?? []).length, 2);
  assert.match(html, /“straight quote”/);
  assert.match(html, /“여닫는 quote”/);
});

test("typographic single quotes receive inline quote emphasis", () => {
  const html = renderText("‘여닫는 작은따옴표’");

  assert.match(html, /class="font-serif text-accent">‘여닫는 작은따옴표’<\/span>/);
});

test("typographic quotes keep the modal highlight override", () => {
  const html = renderHighlightedText("“모달 인용문”과 ‘짧은 인용’");

  assert.match(html, /class="font-semibold text-3d-gold-bright">“모달 인용문”<\/span>/);
  assert.match(html, /class="font-medium text-3d-gold-bright">‘짧은 인용’<\/span>/);
});
