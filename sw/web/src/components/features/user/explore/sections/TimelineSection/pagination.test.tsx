import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import type { ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import ts from "typescript";
import type { TimelineCeleb, TimelineData } from "@/actions/home/getCelebTimeline";
import { getCelebProfileUrl } from "@/lib/url";
import { getTimelinePath, paginateTimeline, TIMELINE_PAGE_SIZE } from "./pagination";
import * as timelineUtils from "./utils";
import * as continents from "./continents";
import { fetchCountries, UNKNOWN_COUNTRY_CODE } from "@feelandnote/shared/lib/countries";
import { MYTH_LAYOUT } from "@/components/features/user/explore/myth/mythLayout";

const require = createRequire(import.meta.url);
const figures = Array.from({ length: 107 }, (_, index) => ({
  id: String(index).padStart(3, "0"), slug: `figure-${index}`, nickname: `인물 ${index}`, nickname_en: `Figure ${index}`,
  avatar_url: null, title: "인물 설명", title_en: "Figure title", bio: `이 인물의 전체 소개 ${index}`, bio_en: `Complete biography ${index}`,
  nationality: "KR", birth_date: `${1800 + index}-01-01`, death_date: null, celeb_tier: "full", has_voice: false, voice_v: 0, profession: null,
} satisfies TimelineCeleb));
const data: TimelineData = {
  celebs: [...figures].reverse().concat({ ...figures[0], id: "other", nationality: "US" }),
  countries: [{ code: "KR", name: "대한민국", count: figures.length }, { code: "US", name: "미국", count: 1 }],
};

test("every figure is reachable once through page boundaries with stable chronological order", () => {
  const pages = Array.from({ length: 3 }, (_, index) => paginateTimeline(data, "KR", String(index + 1)));
  assert.deepEqual(pages.map(page => page.celebs.length), [TIMELINE_PAGE_SIZE, TIMELINE_PAGE_SIZE, 7]);
  assert.deepEqual(pages.flatMap(page => page.celebs.map(celeb => celeb.id)), figures.map(celeb => celeb.id));
  assert.equal(pages[0].previousPath, null);
  assert.equal(pages[0].nextPath, pages[1].path);
  assert.equal(pages[1].previousPath, pages[0].path);
  assert.equal(pages[2].nextPath, null);
  assert.equal(pages[2].previousPath, pages[1].path);
});

test("country, page, and era links preserve the selected view without shipping other countries", () => {
  const us = paginateTimeline(data, "US", "1");
  assert.equal(us.path, "/explore/timeline?country=US");
  assert.deepEqual(us.celebs.map(item => item.id), ["other"]);
  assert.equal(getTimelinePath("US", "KR", 2), "/explore/timeline?country=US&page=2");
  const first = paginateTimeline(data);
  assert.equal(first.eras.find(item => item.era.key === "contemporary-1")?.href, "/explore/timeline?page=3#era-contemporary-1");
  assert.equal(paginateTimeline(data, "invalid", "-3").path, first.path);
  assert.equal(paginateTimeline(data, "KR", "9999").page, 3);
  assert.equal(paginateTimeline({ celebs: [], countries: [] }).page, 1);
});

function loadComponent(relative: string, mocks: Record<string, unknown>): ComponentType<Record<string, unknown>> {
  const compiled = ts.transpileModule(readFileSync(new URL(relative, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} as { default: ComponentType<Record<string, unknown>> } };
  new Function("require", "module", "exports", compiled)((id: string) => mocks[id] ?? require(id), loaded, loaded.exports);
  return loaded.exports.default;
}

const mocks: Record<string, unknown> = {
  "@/i18n/navigation": { Link: ({ prefetch, ...props }: React.ComponentProps<"a"> & { prefetch?: boolean }) => {
    assert.equal(prefetch, false);
    return <a {...props} />;
  } },
  "@/lib/url": { getCelebProfileUrl },
  "@/components/ui": { CelebImage: ({ alt }: { alt: string }) => <svg role="img" aria-label={alt} />, VoiceBadge: () => null },
  "next-intl": { useLocale: () => "ko", useTranslations: () => (key: string) => key },
  "../utils": timelineUtils,
  "./utils": timelineUtils,
  "./ContemporariesPanel": { default: () => null },
};

const countryPickerMocks = {
  ...mocks,
  "@/lib/utils/countryFlag": { getCountryFlag: () => "" },
  "../pagination": { getTimelinePath },
  "../continents": continents,
  "@/components/features/user/explore/myth/mythLayout": { MYTH_LAYOUT },
  "@/hooks/useMouseDragScroll": { useMouseDragScroll: () => ({ ref: { current: null }, dragProps: {}, cursorClassName: "" }) },
  "@/components/ui/BottomSheet": { default: () => null },
};

test("every supported country belongs to one continent and unknown countries remain reachable", async () => {
  const countries = (await fetchCountries()).map(country => ({ ...country, count: 1 }));
  const groups = continents.groupTimelineCountries(countries);
  assert.deepEqual(groups.flatMap(group => group.countries.map(country => country.code)).sort(), countries.map(country => country.code).sort());
  assert.deepEqual(groups.find(group => group.id === "other")?.countries.map(country => country.code), [UNKNOWN_COUNTRY_CODE]);
  const cases = {
    asia: ["KR", "JP", "TW", "TR", "CY", "KZ"], europe: ["FR", "RU", "XK"], africa: ["EG", "ZA"],
    northAmerica: ["US", "CA", "MX", "JM", "CW"], southAmerica: ["BR", "AR"], oceania: ["AU", "NZ"], other: ["XX", "ZZ"],
  };
  for (const [continent, codes] of Object.entries(cases)) {
    for (const code of codes) assert.equal(continents.getCountryContinent(code), continent, code);
  }
});

test("country deep links select their continent and expose only that continent's country choices", () => {
  const CountryPicker = loadComponent("./sections/CountryPicker.tsx", countryPickerMocks);
  for (const selectedCountry of ["KR", "US"]) {
    const $ = load(renderToStaticMarkup(<CountryPicker countries={data.countries} selectedCountry={selectedCountry} defaultCountry="KR" countrySearch="" onSearchChange={() => {}} />));
    assert.equal($('nav[aria-label="countryNav"] a').length, 1);
    assert.equal($('nav[aria-label="countryNav"] a').attr("href"), getTimelinePath(selectedCountry, "KR"));
    assert.equal($('nav[aria-label="continentNav"] a[aria-current="page"]').text(), `continent.${continents.getCountryContinent(selectedCountry)}`);
    assert.equal($('nav[aria-label="continentNav"] a').length, 2);
  }
});

test("a timeline row emits its complete biography once for both responsive layouts", () => {
  const Item = loadComponent("./sections/CelebTimelineItem.tsx", mocks);
  const html = renderToStaticMarkup(<Item celeb={figures[0]} locale="ko" isBioExpanded={false} isContemporariesShown={false}
    isContemporariesLoading={false} onToggleBio={() => {}} onToggleContemporaries={() => {}} onFireDialogue={() => {}} getContemporaries={() => []} />);
  const $ = load(html);
  assert.equal(html.split(figures[0].bio!).length - 1, 1);
  assert.equal($('a[href="/celeb/figure-0"]').length, 2);
  assert.equal($('a[href="/celeb/figure-0"]').first().find('[role="img"]').length, 1);
  assert.equal($("a button, button a").length, 0);
});

test("SSR pagination exposes actual previous and next links and country choices expose addresses", () => {
  const CountryPicker = loadComponent("./sections/CountryPicker.tsx", countryPickerMocks);
  const picker = load(renderToStaticMarkup(<CountryPicker countries={data.countries} selectedCountry="KR" defaultCountry="KR" countrySearch="" onSearchChange={() => {}} />));
  assert.equal(picker('a[href="/explore/timeline?country=US"]').length, 1);
  const Section = loadComponent("./TimelineSection.tsx", {
    ...mocks,
    "@/lib/utils/countryFlag": { getCountryFlag: () => "" },
    "@/components/features/game/shared/hooks/useDialogue": { useDialogueSubtitle: () => ({ handleSubtitle: () => {} }) },
    "@/hooks/useCelebGreeting": { useCelebGreeting: () => ({ fireGreeting: () => {} }) },
    "@/actions/home/getCelebTimeline": { getTimelineContemporaries: () => { throw new Error("SSR must not load contemporaries"); } },
    "@/actions/celebs/getCelebForModal": { getCelebForModal: () => { throw new Error("SSR must not load dialogue"); } },
    "./sections/CountryPicker": { default: CountryPicker },
    "./sections/EraBanner": { default: () => null },
    "./sections/CelebTimelineItem": { default: loadComponent("./sections/CelebTimelineItem.tsx", mocks) },
  });
  const page = paginateTimeline(data, "KR", "2");
  const html = renderToStaticMarkup(<Section {...page} countries={data.countries} />);
  const $ = load(html);
  assert.equal($('a[rel="prev"]').attr("href"), page.previousPath);
  assert.equal($('a[rel="next"]').attr("href"), page.nextPath);
  assert.equal($("a[href^='/celeb/']").length, 2 * TIMELINE_PAGE_SIZE);
  assert.ok(Buffer.byteLength(html + JSON.stringify(page), "utf8") < 2_000_000);
});
