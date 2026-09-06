import assert from "node:assert/strict";
import test from "node:test";

import {
  FIGURE_BOOK_RELATION_TYPES,
  FIGURE_BOOK_TERMS,
  figureBookRelationLabel,
  figureBookSectionLabel,
} from "./figure-book-terms";

function flatten(value: unknown, path: string[] = []): Array<[string, { ko: string; en: string }]> {
  if (value && typeof value === "object" && "ko" in value && "en" in value) {
    return [[path.join("."), value as { ko: string; en: string }]];
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => flatten(child, [...path, key]));
  }
  return [];
}

test("모든 용어는 한국어·영어를 다 가진다", () => {
  for (const [path, term] of flatten(FIGURE_BOOK_TERMS)) {
    assert.ok(term.ko.trim(), `${path}.ko`);
    assert.ok(term.en.trim(), `${path}.en`);
  }
});

test("화면 구획 이름은 관계명 + 작품이다", () => {
  for (const type of FIGURE_BOOK_RELATION_TYPES) {
    assert.equal(figureBookSectionLabel(type), `${figureBookRelationLabel(type)} ${FIGURE_BOOK_TERMS.work.ko}`);
  }
  assert.equal(figureBookSectionLabel("authored"), "창작 작품");
  assert.equal(figureBookSectionLabel("appearance", "en"), "Appearing Works");
});

test("없앤 말은 값으로 돌아오지 않는다", () => {
  const banned = ["등장 도서", "연관 도서", "관련 상품", "관련 도서", "책장", "원전", "저작"];
  for (const [path, term] of flatten(FIGURE_BOOK_TERMS)) {
    for (const word of banned) assert.ok(!term.ko.includes(word), `${path}: ${word}`);
  }
});
