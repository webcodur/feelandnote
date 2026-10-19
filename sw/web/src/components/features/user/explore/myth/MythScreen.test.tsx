import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { load } from "cheerio";
import type { MythData } from "@/actions/home/mythTypes";
import type { ThemeScreenOptions } from "./MythScreen";

const require = createRequire(import.meta.url);
const Empty = () => null;

function loadComponent(file: URL, modules: Record<string, unknown>) {
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} as { default: React.ElementType } };
  new Function("require", "module", "exports", code)((id: string) => {
    if (id in modules) return modules[id];
    if (id === "react" || id === "react/jsx-runtime") return require(id);
    return { __esModule: true, default: Empty };
  }, loaded, loaded.exports);
  return loaded.exports.default;
}

function renderScreen(slug: string, locale = "ko", faction?: ThemeScreenOptions) {
  const modules = {
    "next-intl": { useLocale: () => locale, useTranslations: () => (key: string) => key },
    "lucide-react": { Clock3: Empty, Eye: Empty },
    "next/navigation": { useSearchParams: () => new URLSearchParams() },
    "@/i18n/navigation": { usePathname: () => `/explore/myth/${slug}`, useRouter: () => ({}) },
    "@/hooks/useRecentAtlas": { useRecentAtlas: () => {} },
    "@/contexts/FactionMusicContext": { useRegisterFactionMusic: () => {} },
    "@/lib/atlas-navigation": { buildMythNavigation: () => [] },
    "./mythHref": require("./mythHref"),
    "./mythLayout": { MYTH_LAYOUT: {} },
    "./atlasNavigationData": { ATLAS_GROUP_PARAM: "group", ATLAS_PERSON_PARAM: "person" },
    "./hubSectionUtils": { hubSectionId: () => "section" },
    "./HubSection.module.css": { default: {} },
    "./MythOverview": { default: Empty },
    "./PageLikeButton": { default: ({ kind, targetId }: { kind: string; targetId: string }) => <button data-page-like={kind} data-target={targetId}>like</button> },
    "@/components/ui/ShareButtons": { default: ({ path }: { path: string }) => <a href={path}>share</a> },
  };
  const Participation = loadComponent(new URL("../../../engagement/FactionParticipation.tsx", import.meta.url), modules);
  const HubSection = loadComponent(new URL("../../../../shared/HubSection.tsx", import.meta.url), modules);
  const Screen = loadComponent(new URL("./MythScreen.tsx", import.meta.url), {
    ...modules,
    "@/components/features/engagement/FactionParticipation": { default: Participation },
    "@/components/shared/HubSection": { default: HubSection },
  });
  const data: MythData = {
    regions: [{ id: "region", slug: "region", name: "지역", mythIds: [slug] }],
    myths: [{ id: slug, slug, name: slug, headline: "한 줄 소개", description: null, isPublished: true, regionId: "region", images: [], music: null, personIds: [], leadPersonIds: [], groups: [] }],
    people: [], works: [],
  };
  return renderToStaticMarkup(<Screen data={data} faction={faction} indexHeading="전체" indexGroups={[]} />);
}

test("신화 제목·소개 아래에 조회수·좋아요·공유를 표시하고 선택 상자에서는 제외한다", () => {
  for (const locale of ["ko", "en"]) {
    for (const slug of ["odyssey", "myth-china-xiyou"]) {
      const markup = renderScreen(slug, locale);
      assert.match(markup, /data-faction-participation/);
      assert.match(markup, /data-faction-views/);
      assert.match(markup, /data-page-like="faction"/);
      assert.ok(markup.includes(`data-target="${slug}"`), markup);
      assert.ok(markup.includes(`href="/explore/myth/${slug}"`), markup);
      const $ = load(markup);
      const header = $("#atlas-selection > [data-hub-header]");
      assert.equal(header.find("[data-faction-participation]").length, 1);
      assert.equal(header.children("p").next().is("[data-faction-participation]"), true);
      assert.equal($("[data-faction-selection] [data-faction-participation]").length, 0);
      assert.equal($("[data-faction-participation]").children().first().is("[data-faction-views]"), true);
    }
  }
});

test("세력도감에서 전달한 참여 영역은 그대로 유지한다", () => {
  const markup = renderScreen("intelligence", "ko", {
    navigationTree: [], themeId: "region", title: "세력도감", overviewLabel: "개요", overviewFallback: "", shelfTitle: "책장",
    participation: <span data-existing-participation />,
    renderPerson: () => null, renderWorks: () => null,
  });
  assert.match(markup, /data-existing-participation/);
  assert.doesNotMatch(markup, /data-faction-participation/);
  const $ = load(markup);
  assert.equal($("#atlas-selection > [data-hub-header] [data-existing-participation]").length, 1);
  assert.equal($("[data-faction-selection] [data-existing-participation]").length, 0);
});
