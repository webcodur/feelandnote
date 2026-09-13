import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import ts from "typescript";
import { createTranslator } from "next-intl";
import { getPaginationRange } from "./paginationRange";
import type { Pagination as PaginationType } from "./Pagination";

const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(readFileSync(new URL("./Pagination.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const messages = JSON.parse(readFileSync(new URL("../../../messages/en/core.json", import.meta.url), "utf8"));
const translate = createTranslator({ locale: "en", messages, namespace: "shared.ui.pagination" });
const mocks = {
  react: { ...React, useId: () => "page-size" },
  "next-intl": { useTranslations: () => translate },
  "@/i18n/navigation": { Link: ({ prefetch, ...props }: React.ComponentProps<"a"> & { prefetch?: boolean }) => {
    assert.equal(prefetch, false);
    return <a {...props} />;
  } },
  "./paginationRange": { getPaginationRange },
};
const loaded = { exports: {} as { Pagination: typeof PaginationType } };
new Function("require", "module", "exports", compiled)((id: string) => mocks[id as keyof typeof mocks] ?? require(id), loaded, loaded.exports);
const Pagination = loaded.exports.Pagination;
const defaults = { currentPage: 5, totalPages: 10, onPageChange: () => {} };

function elements(node: React.ReactNode): React.ReactElement<React.ComponentProps<"a">>[] {
  if (!React.isValidElement<React.ComponentProps<"a">>(node)) return [];
  return [node, ...React.Children.toArray(node.props.children).flatMap(elements)];
}

function clickEvent(overrides: Partial<React.MouseEvent<HTMLAnchorElement>> = {}) {
  let prevented = false;
  const event = { button: 0, preventDefault: () => { prevented = true; }, ...overrides } as React.MouseEvent<HTMLAnchorElement>;
  return { event, wasPrevented: () => prevented };
}

test("page ranges have stable edges, one current page, at most seven items, and no invented pages", () => {
  for (let total = 0; total <= 200; total++) {
    for (let current = 1; current <= Math.max(1, total); current++) {
      const range = getPaginationRange(current, total);
      const numbers = range.items.filter((item): item is number => typeof item === "number");
      assert.ok(range.items.length <= 7);
      assert.equal(new Set(numbers).size, numbers.length);
      assert.ok(numbers.every(page => page >= 1 && page <= total));
      if (!total) continue;
      assert.equal(numbers[0], 1);
      assert.equal(numbers.at(-1), total);
      assert.equal(numbers.filter(page => page === current).length, 1);
      for (let index = 1; index < range.items.length; index++) {
        const previous = range.items[index - 1];
        const item = range.items[index];
        if (typeof previous === "number" && typeof item === "number") assert.equal(item - previous, 1);
      }
    }
  }
  assert.deepEqual(getPaginationRange(5, 10).items, [1, "start-ellipsis", 4, 5, 6, "end-ellipsis", 10]);
  assert.deepEqual(getPaginationRange(-5, 3).items, [1, 2, 3]);
  assert.equal(getPaginationRange(999, 3).current, 3);
  assert.equal(getPaginationRange(NaN, Infinity).total, 0);
});

test("SSR exposes page labels, current page, mobile summary and native URL links", () => {
  const $ = load(renderToStaticMarkup(<Pagination {...defaults} getPageHref={page => `/explore?page=${page}`} />));
  assert.equal($('nav[aria-label="Pagination"]').length, 1);
  assert.equal($('[aria-current="page"]').attr("href"), "/explore?page=5");
  assert.equal($('[aria-current="page"]').attr("aria-label"), "Page 5");
  assert.equal($('a[rel="prev"]').attr("href"), "/explore?page=4");
  assert.equal($('a[rel="next"]').attr("href"), "/explore?page=6");
  assert.equal($('a[aria-label="Last page, page 10"]').length, 1);
  assert.ok($('[role="status"]').text().includes("Page 5 of 10"));
  assert.equal($("input").length, 0);
});

test("first and last page boundaries are disabled and single-page results omit navigation", () => {
  for (const [currentPage, label] of [[1, "Previous"], [10, "Next"]] as const) {
    const $ = load(renderToStaticMarkup(<Pagination {...defaults} currentPage={currentPage} />));
    assert.equal($(`button[aria-label="${label}"][disabled]`).length, 1);
  }
  const $ = load(renderToStaticMarkup(<Pagination {...defaults} totalPages={1} pageSize={20} pageSizeOptions={[10, 20, 50]} onPageSizeChange={() => {}} showPageSizeSelector />));
  assert.equal($("nav").length, 0);
  assert.equal($('label[for="page-size"]').text(), "Items per page");
  assert.equal($("select option[selected]").attr("value"), "20");
});

test("ordinary URL clicks call existing handlers while modified clicks preserve browser navigation", () => {
  const changes: number[] = [];
  const tree = Pagination({ ...defaults, onPageChange: page => changes.push(page), getPageHref: page => `/explore?page=${page}` });
  const next = elements(tree).find(element => element.props.rel === "next")!;
  const normal = clickEvent();
  next.props.onClick?.(normal.event);
  assert.deepEqual(changes, [6]);
  assert.equal(normal.wasPrevented(), true);
  for (const overrides of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
    const modified = clickEvent(overrides);
    next.props.onClick?.(modified.event);
    assert.equal(modified.wasPrevented(), false);
  }
  assert.deepEqual(changes, [6]);
});

test("pending page requests block ordinary links and disable page-size changes", () => {
  const tree = Pagination({ ...defaults, isLoading: true, onPageChange: () => assert.fail("pending navigation"), getPageHref: page => `/explore?page=${page}` });
  const next = elements(tree).find(element => element.props.rel === "next")!;
  const normal = clickEvent();
  next.props.onClick?.(normal.event);
  assert.equal(normal.wasPrevented(), true);
  assert.equal(next.props["aria-disabled"], true);
  const $ = load(renderToStaticMarkup(<Pagination {...defaults} isLoading pageSize={20} pageSizeOptions={[20, 50]} onPageSizeChange={() => {}} showPageSizeSelector />));
  assert.equal($("select[disabled]").length, 1);
  assert.equal($('nav[aria-busy="true"]').length, 1);
});
