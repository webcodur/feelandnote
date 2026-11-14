import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { createElement, type AnchorHTMLAttributes, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load as parseHtml } from "cheerio";
import ts from "typescript";
import { EXPLORE_FEATURED_LINKS } from "@/constants/navigation";
import * as bannerStyles from "@/components/shared/bannerStyles";
import * as exploreModes from "@/constants/exploreModes";
import * as mythHref from "../myth/mythHref";

const require = createRequire(import.meta.url);
let pathname = "/explore";
let detailCrumbs: { label: string; href: string }[] = [];
const mocks: Record<string, object> = {
  "next/navigation": { useSelectedLayoutSegment: () => pathname.split("/")[2] ?? null },
  "next-intl": { useTranslations: () => (key: string) => key },
  "@/i18n/navigation": {
    usePathname: () => pathname,
    useRouter: () => ({ refresh() {} }),
    Link: ({ prefetch, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) => {
      void prefetch;
      return createElement("a", props);
    },
  },
  "@/constants/navigation": { EXPLORE_FEATURED_LINKS },
  "@/constants/exploreModes": exploreModes,
  "@/components/shared/bannerStyles": bannerStyles,
  "@/components/shared/BannerCrumbs": {
    useBannerCrumbs: () => detailCrumbs,
    BannerCrumbProvider: ({ children }: { children: ReactNode }) => children,
  },
  "./bannerStyles": bannerStyles,
  "@/components/lab/ConstellationBanner": { default: ({ children }: { children: ReactNode }) => createElement("div", { "data-explore-banner": true }, children) },
  "@/components/layout/PageContainer": { default: "main" },
  "./ExploreModeNav": { default: () => createElement("nav", { "data-explore-modes": true }) },
  "../myth/AtlasRecentHistory": { default: ({ world }: { world: string }) => createElement("aside", { "data-recent-world": world }) },
  "../myth/mythHref": mythHref,
};

function load(file: string) {
  const compiled = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} as { default: ComponentType<{ children?: ReactNode }> } };
  new Function("require", "module", "exports", compiled)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports);
  return loaded.exports;
}
mocks["@/components/shared/BannerHeading"] = load("../../../../shared/BannerHeading.tsx");
const bannerModule = load("./ExploreBanner.tsx");
mocks["./ExploreBanner"] = bannerModule;
const Banner = bannerModule.default;
const Layout = load("./ExploreLayoutFrame.tsx").default;

for (const mode of ["myth", "faction"]) {
  test(`${mode} detail keeps the explore banner, common mode selector, list return path, and content before recent history`, () => {
    pathname = `/explore/${mode}/selected-entry`;
    detailCrumbs = [{ label: "Selected entry", href: pathname }];
    const html = renderToStaticMarkup(createElement(Layout, {}, createElement("h1", null, "Selected entry")));
    const $ = parseHtml(html);
    assert.equal($("main nav[aria-label='breadcrumb']").length, 0, "Breadcrumbs belong inside the banner, outside the content and mode selector");
    for (const shell of ["[class~='md:hidden']", "[class~='md:block']"]) {
      assert.equal($(`${shell} nav[aria-label='breadcrumb']`).length, 1);
      assert.equal($(`${shell} nav a[href='/explore']`).length, 1);
      assert.equal($(`${shell} nav a[href='/explore?mode=${mode}']`).length, 1);
      assert.equal($(`${shell} nav a.pointer-events-auto`).length, 2, "Banner ancestor links must receive clicks above the decorative canvas");
      assert.deepEqual($(`${shell} nav li`).map((_, element) => $(element).text()).get(), ["nav.explore", `nav.modes.${mode}`, "Selected entry"]);
    }
    assert.equal((html.match(/data-explore-banner/g) ?? []).length, 1);
    assert.doesNotMatch(html, /mythology|navFaction/);
    assert.equal((html.match(/data-explore-modes/g) ?? []).length, 1);
    assert.doesNotMatch(html, /data-atlas-detail-breadcrumb/);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    assert.ok(html.indexOf("data-recent-world") > html.indexOf("</h1>"));
  });

  test(`${mode} detail uses its banner text as one breadcrumb trail without repeating the title`, () => {
    pathname = `/explore/${mode}/selected-entry`;
    detailCrumbs = [{ label: "Selected entry", href: pathname }];
    const html = renderToStaticMarkup(createElement(Banner));
    const $ = parseHtml(html);
    for (const shell of ["[class~='md:hidden']", "[class~='md:block']"]) {
      const banner = $(shell);
      assert.equal((banner.text().match(/nav.explore/g) ?? []).length, 1, "Explore appears once as part of the breadcrumb, with no separate title");
      assert.equal((banner.text().match(new RegExp(`nav.modes.${mode}`, "g")) ?? []).length, 1);
      assert.equal((banner.text().match(/Selected entry/g) ?? []).length, 1);
      assert.equal(banner.find("nav li:last-child a, nav li:last-child button").length, 0, "The final entry is the current page; the preceding mode link opens its home");
      assert.ok(banner.find("nav [class~='text-4xl'], nav [class~='text-2xl']").length > 0, "The large banner text forms the breadcrumb itself");
    }
    assert.doesNotMatch(html, /<h1\b|role="heading"/);
  });
}

test("the explore list banner owns its heading", () => {
  pathname = "/explore";
  const html = renderToStaticMarkup(createElement(Banner));
  assert.match(html, /<h1\b[^>]*>nav.explore<\/h1>/);
});

test("the explore list keeps its banner and the page's three-mode selector", () => {
  pathname = "/explore";
  const html = renderToStaticMarkup(createElement(Layout, {}, createElement("nav", { "data-explore-modes": true })));
  assert.match(html, /data-explore-banner/);
  assert.match(html, /data-explore-modes/);
  assert.doesNotMatch(html, /data-atlas-detail-breadcrumb|data-recent-world/);
});

test("influence and spectrum keep their existing navigation", () => {
  pathname = "/explore/influence";
  const html = renderToStaticMarkup(createElement(Layout, {}, "Rankings"));
  assert.match(html, /navInfluence · navSpectrum/);
  assert.doesNotMatch(html, /data-atlas-detail-breadcrumb/);
});

test("works keep their independent layout", () => {
  pathname = "/explore/works";
  assert.equal(renderToStaticMarkup(createElement(Layout, {}, "Works")), "Works");
});
