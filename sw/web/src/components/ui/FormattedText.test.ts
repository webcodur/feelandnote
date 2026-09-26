import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";

import FormattedText from "./FormattedText";
import ReadingHighlightText from "../shared/ReadingHighlightText";

function renderText(text: string) {
  return renderToStaticMarkup(React.createElement(FormattedText, { text }));
}

function renderHighlightedText(text: string) {
  return renderToStaticMarkup(
    React.createElement(FormattedText, { text, highlightClassName: "text-3d-gold-bright" }),
  );
}

function renderHighlightedTextWithStyle(text: string) {
  return renderToStaticMarkup(
    React.createElement(FormattedText, {
      text,
      highlightClassName: "text-3d-gold-bright",
      highlightStyle: { filter: "none", backgroundImage: "linear-gradient(to bottom, #f0c948, #c9a33a)" },
    }),
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

test("modal highlight style applies only to quoted parts, not plain text", () => {
  const html = renderHighlightedTextWithStyle("본문 “인용” 뒤의 일반 글자");

  assert.match(html, /<span>본문 <\/span>/);
  assert.match(html, /<span> 뒤의 일반 글자<\/span>/);
  assert.match(html, /class="font-semibold text-3d-gold-bright" style="[^"]*background-image[^"]*">“인용”<\/span>/);
  assert.equal((html.match(/background-image/g) ?? []).length, 1);
});

test("English dash asides retain their punctuation and receive emphasis", () => {
  for (const aside of ["—a lasting influence—", "— a lasting influence —", "– a lasting influence –", "--a lasting influence--"]) {
    const html = renderText(`Books ${aside} shaped him.`);
    assert.ok(html.includes(`<span class="font-serif text-accent">${aside}</span>`));
    assert.ok(html.includes("<span> shaped him.</span>"));
  }
});

test("ranges, hyphens and unpaired dashes remain plain text", () => {
  for (const text of [
    "1990–2000, pages 10–20, a well-known writer and Anglo–American literature",
    "He read—then wrote. She listened—then spoke.",
    "He read — an influence\nthat lasted — for years.",
    "—One thought. Another—",
  ]) {
    assert.doesNotMatch(renderText(text), /text-accent/);
  }
});

test("English contractions and possessives do not become quotations", () => {
  const html = renderText("Don't change a writer's words. Don’t change a writer’s words.");
  assert.doesNotMatch(html, /text-accent/);
});

test("single-quoted English phrases keep internal apostrophes", () => {
  const html = renderText("'Don't stop' and ‘a writer’s life’");
  assert.equal((html.match(/class="font-serif text-accent"/g) ?? []).length, 2);
  assert.match(html, /‘Don&#x27;t stop’<\/span>/);
  assert.match(html, /‘a writer’s life’<\/span>/);
});

test("Korean quotes keep emphasis when a particle hugs the closing quote", () => {
  const html = renderText("‘빠르게 움직이고 기존의 틀을 깨라’는 모토로 내달렸다.");
  assert.match(html, /class="font-serif text-accent">‘빠르게 움직이고 기존의 틀을 깨라’<\/span>/);
  assert.match(html, /<span>는 모토로 내달렸다.<\/span>/);

  const attached = renderText("속으로'안돼'라고 했다.");
  assert.match(attached, /class="font-serif text-accent">‘안돼’<\/span>/);
  assert.match(attached, /<span>라고 했다.<\/span>/);
});

test("dash asides keep the modal highlight style off surrounding prose", () => {
  const html = renderHighlightedTextWithStyle("Books —a lasting influence— shaped him.");
  assert.equal((html.match(/background-image/g) ?? []).length, 1);
  assert.match(html, /class="font-medium text-3d-gold-bright" style="[^"]*">—a lasting influence—<\/span>/);
});

test("narration marks keep source offsets across English punctuation", () => {
  const text = "Books —a lasting influence— shaped ‘a writer’s life’.";
  const start = text.indexOf("influence");
  const end = text.indexOf("writer") + "writer’s".length;
  const html = renderToStaticMarkup(React.createElement(FormattedText, { text, mark: { start, end } }));
  const marked = Array.from(html.matchAll(/<mark[^>]*>(.*?)<\/mark>/g), (match) => match[1]).join("");
  assert.equal(marked, text.slice(start, end));
  assert.match(html, /<mark class="[^"]*bg-reading-active\/10[^"]*text-inherit/);
  assert.doesNotMatch(html, /3dff7a|emerald/);
});

test("quotes split across narration segments still get emphasis", () => {
  const text = "앞 문장. “싸우자! 싸우자! 싸우자!” 뒤 문장.";
  const s1 = text.indexOf("싸우자!");
  const s2 = text.indexOf("싸우자!", s1 + 1);
  const s3 = text.indexOf("싸우자!", s2 + 1);
  const q2 = text.indexOf("”") + 1;
  const segments = [
    { start: 0, end: 1, textStart: 0, textEnd: s1 },
    { start: 1, end: 2, textStart: s1, textEnd: s2 },
    { start: 2, end: 3, textStart: s2, textEnd: s3 },
    { start: 3, end: 4, textStart: s3, textEnd: q2 },
    { start: 4, end: 5, textStart: q2, textEnd: text.length },
  ];
  const html = renderToStaticMarkup(
    React.createElement(ReadingHighlightText, { text, segments, onPlayFrom: () => {} }),
  );
  // 인용구가 세그먼트 경계에서 잘려도 조각마다 강조가 입혀진다 — “ · 싸우자! · 싸우자! · 싸우자!” 네 조각
  assert.equal((html.match(/font-medium text-accent-hover/g) ?? []).length, 4);
  // 조각마다 자기 세그먼트의 재생 버튼을 유지한다 — 클릭한 지점부터 재생되는 게 그대로다
  assert.equal((html.match(/role="button"/g) ?? []).length, 6);
  assert.match(html, /싸우자!”<\/span>/);
});

test("reading previews share English emphasis and paragraph-relative narration marks", () => {
  const text = "A first paragraph.\n\nBooks —a lasting influence— shaped him.";
  const start = text.indexOf("influence");
  const html = renderToStaticMarkup(React.createElement(ReadingHighlightText, {
    text, mark: { start, end: start + "influence".length },
  }));
  assert.equal((html.match(/<p>/g) ?? []).length, 2);
  assert.match(html, /class="font-serif text-accent">—a lasting <\/span>/);
  assert.match(html, /<mark[^>]*aria-current="true">influence<\/mark>/);
});

test("Korean terms emphasize the name and parenthetical definition separately", () => {
  const html = renderText("그는 인공지능(AI)과 엔트로피(무질서도)를 설명했다.");
  assert.match(html, /<span>그는 <\/span><span class="font-semibold text-accent-hover">인공지능<\/span><span class="font-normal text-accent">\(AI\)<\/span>/);
  assert.match(html, /<span class="font-semibold text-accent-hover">엔트로피<\/span><span class="font-normal text-accent">\(무질서도\)<\/span><span>를 설명했다./);
});

test("English multiword terms expand only when their initials match the acronym", () => {
  for (const [name, acronym] of [["artificial intelligence", "AI"], ["cognitive behavioral therapy", "CBT"], ["Large Language Model", "LLM"]]) {
    const html = renderText(`He studied ${name} (${acronym}) closely.`);
    assert.ok(html.includes(`<span>He studied </span><span class="font-semibold text-accent-hover">${name}</span>`));
    assert.ok(html.includes(`<span class="font-normal text-accent"> (${acronym})</span>`));
  }
  const html = renderText("He studied entropy (disorder) closely.");
  assert.match(html, /<span>He studied <\/span><span class="font-semibold text-accent-hover">entropy<\/span>/);
});

test("term emphasis preserves spaces, hyphenated names, and following punctuation", () => {
  const html = renderText("인공지능 (AI), long-term (lasting). entropy\t(disorder)");
  assert.match(html, /font-normal text-accent"> \(AI\)/);
  assert.match(html, /font-semibold text-accent-hover">long-term<\/span>/);
  assert.match(html, /font-normal text-accent">\t\(disorder\)/);
});

test("bare parentheses, numeric references and dates remain plain", () => {
  assert.doesNotMatch(renderText("Microsoft (1975), 게이츠(1955), chapter (3), (a separate aside)"), /text-accent/);
});

test("acronym expansion does not cross punctuation or paragraph boundaries", () => {
  for (const prefix of ["artificial. ", "artificial\n", "artificial\n\n"]) {
    const html = renderText(`${prefix}intelligence (AI)`);
    assert.match(html, /font-semibold text-accent-hover">intelligence<\/span>/);
  }
});

test("term formatting preserves source offsets for narration across the definition", () => {
  const text = "He studied artificial intelligence (AI), then 인공지능(人工知能).";
  const start = text.indexOf("intelligence");
  const end = text.indexOf("人工") + 2;
  const html = renderToStaticMarkup(React.createElement(FormattedText, { text, mark: {start, end} }));
  const marked = Array.from(html.matchAll(/<mark[^>]*>(.*?)<\/mark>/g), match => match[1]).join("");
  assert.equal(marked, text.slice(start, end));
});

test("term emphasis respects modal colors without styling the surrounding text", () => {
  const html = renderHighlightedTextWithStyle("He studies artificial intelligence (AI) today.");
  assert.equal((html.match(/background-image/g) ?? []).length, 2);
  assert.match(html, /<span>He studies <\/span>/);
  assert.match(html, /class="font-semibold text-3d-gold-bright"/);
  assert.match(html, /class="font-normal text-3d-gold-bright"/);
});

test("active narration preserves the colors and weights of quotes, titles and terms", () => {
  const text = '본문 “직접 인용”과 《작품명》, ‘짧은 강조’, 인공지능(AI).';
  const $ = load(renderToStaticMarkup(React.createElement(FormattedText, {
    text, mark: { start: 0, end: text.length },
  })));
  const parentStyle = (text: string) => $('mark').filter((_, el) => $(el).text() === text).parent().attr('class');
  assert.equal(parentStyle('“직접 인용”'), 'font-medium text-accent-hover');
  assert.equal(parentStyle('《작품명》'), 'text-white font-bold');
  assert.equal(parentStyle('‘짧은 강조’'), 'font-serif text-accent');
  assert.equal(parentStyle('인공지능'), 'font-semibold text-accent-hover');
  assert.equal(parentStyle('(AI)'), 'font-normal text-accent');
  assert.ok($('mark').filter((_, el) => $(el).text() === '본문 ').hasClass('text-inherit'));
  assert.ok($('mark').filter((_, el) => $(el).text() === '“직접 인용”').hasClass('text-inherit'));
  assert.equal($('mark').map((_, el) => $(el).text()).get().join(''), text);
});

test("an active quote keeps emphasis when narration splits it across sentences", () => {
  const text = '“첫 문장! 둘째 문장!”';
  const split = text.indexOf('둘째');
  const $ = load(renderToStaticMarkup(React.createElement(ReadingHighlightText, {
    text, mark: { start: split, end: text.length },
    segments: [
      { start: 0, end: 1, textStart: 0, textEnd: split },
      { start: 1, end: 2, textStart: split, textEnd: text.length },
    ],
    onPlayFrom: () => {},
  })));
  assert.equal($('mark').text(), '둘째 문장!”');
  assert.ok($('mark').closest('.text-accent-hover').length > 0);
  assert.ok($('mark').hasClass('text-inherit'));
  assert.ok($('mark').hasClass('decoration-reading-active/70'));
  assert.equal($('mark').length, 1);
  assert.ok($('span.text-accent-hover').first().text().startsWith('“첫 문장!'));
});
