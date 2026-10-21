import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { load } from "cheerio";
import type { MythData } from "@/actions/home/mythTypes";
import type { AtlasWorld } from "../myth/atlasNavigationData";

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

function renderScreen(mode: AtlasWorld, locale = "ko") {
  const modules = {
    "next-intl": { useLocale: () => locale, useTranslations: () => (key: string) => key },
    "lucide-react": { LayoutGrid: Empty, ArrowRight: Empty, Clock3: Empty, Eye: Empty, ChevronDown: Empty, ChevronLeft: Empty, ChevronRight: Empty },
    "next/navigation": { useSearchParams: () => new URLSearchParams() },
    "@/i18n/navigation": { Link: "a", usePathname: () => `/explore/${mode}/entry`, useRouter: () => ({}) },
    "@/hooks/useRecentAtlas": { useRecentAtlas: () => {} },
    "@/contexts/FactionMusicContext": { useRegisterFactionMusic: () => {} },
    "@/lib/atlas-navigation": { buildMythNavigation: () => [] },
    "../myth/mythHref": require("../myth/mythHref"),
    "../myth/mythLayout": { MYTH_LAYOUT: {} },
    "../myth/atlasNavigationData": require("../myth/atlasNavigationData"),
    "./atlasNavigationData": require("../myth/atlasNavigationData"),
    "./hubSectionUtils": { hubSectionId: () => "section" },
    "./HubSection.module.css": { default: {} },
    "./AtlasOverview": { default: ({ navigation }: { navigation: React.ReactNode }) => <>{navigation}<div data-scenes /></> },
    "./PageLikeButton": { default: ({ kind, targetId }: { kind: string; targetId: string }) => <button data-page-like={kind} data-target={targetId}>like</button> },
    "@/components/ui/ShareButtons": { default: ({ path }: { path: string }) => <a href={path}>share</a> },
  };
  const Participation = loadComponent(new URL("../../../engagement/FactionParticipation.tsx", import.meta.url), modules);
  const HubSection = loadComponent(new URL("../../../../shared/HubSection.tsx", import.meta.url), modules);
  const AtlasNavigation = loadComponent(new URL("../myth/AtlasNavigation.tsx", import.meta.url), modules);
  const AtlasSelection = loadComponent(new URL("./AtlasSelection.tsx", import.meta.url), {
    ...modules, "../myth/AtlasNavigation": { default: AtlasNavigation },
    "@/components/shared/HubSection": { default: HubSection },
  });
  const Screen = loadComponent(new URL("./AtlasScreen.tsx", import.meta.url), {
    ...modules,
    "@/components/features/engagement/FactionParticipation": { default: Participation },
    "@/components/shared/HubSection": { default: HubSection },
    "./AtlasSelection": { default: AtlasSelection },
    "../myth/AtlasNavigation": { default: AtlasNavigation },
  });
  const data: MythData = {
    regions: [{ id: "region", slug: "region", name: "지역", mythIds: ["entry"] }],
    myths: [{ id: "entry", slug: "entry", name: "Entry", headline: "한 줄 소개", description: null, isPublished: true, regionId: "region", images: [], music: null, personIds: ["person"], leadPersonIds: [], groups: [] }],
    people: [{ id: "person", slug: "person", name: "인물", title: null, headline: null, bio: null, reading: null, voiceV: 0, summary: null, appearances: [], avatarUrl: null, imageUrl: null, portraitUrl: null, images: [], mythIds: ["entry"], sourceIds: [] }], works: [],
  };
  const navigationTree = [{ id: "region", name: "Theme", entries: [{ id: "entry", name: "Entry", count: 1, groups: [] }] }];
  return renderToStaticMarkup(<Screen mode={mode} data={data} navigationTree={navigationTree} themeId="region" />);
}

test("신화·세력은 같은 제목·참여·장면·그룹 배치를 사용하고 공유 주소만 모드를 따른다", () => {
  for (const locale of ["ko", "en"]) {
    for (const mode of ["myth", "faction"] as const) {
      const markup = renderScreen(mode, locale);
      const $ = load(markup);
      assert.equal($("[data-atlas-mode]").attr("data-atlas-mode"), mode);
      assert.equal($("h1").length, 1);
      assert.equal($("h1 [data-atlas-value]").text(), "Entry");
      assert.equal($("#atlas-selection > [data-hub-header]").length, 1);
      assert.equal($("#atlas-selection > [data-hub-header] h2").text(), "tocSelection");
      assert.equal($("#atlas-members > [data-hub-header] h2").text(), "memberList");
      assert.equal($("#atlas-selection [data-faction-participation]").length, 1);
      assert.equal($("[data-page-like]").attr("data-target"), "entry");
      assert.equal($(`a[href='/explore/${mode}/entry']`).length, 1);
      assert.deepEqual($("#atlas-selection [data-atlas-level]").map((_, el) => $(el).attr("data-atlas-level")).get(), ["0", "1"]);
      assert.equal($("#atlas-members [data-atlas-level='2']").length, 1);
      assert.equal($("#atlas-members h2").length, 1);
      assert.equal($("#atlas-index").length, 0);
      assert.equal($("[data-atlas-catalog-link]").length, 0, "Detail content does not duplicate the world navigation");
      assert.ok(markup.indexOf("data-faction-participation") < markup.indexOf("data-scenes"));
      assert.ok(markup.indexOf("data-scenes") < markup.indexOf('id="atlas-members"'));
    }
  }
});

test("상단의 현재 신화·세력 버튼은 상세에서 전체 목록으로 돌아가고 목록에서는 현재 위치를 표시한다", () => {
  for (const mode of ["myth", "faction"] as const) for (const detail of [false, true]) {
    const Frame = loadComponent(new URL("../hub/ExploreLayoutFrame.tsx", import.meta.url), {
      "react": React,
      "next/navigation": { useSelectedLayoutSegment: () => mode },
      "next-intl": { useTranslations: () => (key: string) => key },
      "lucide-react": { CornerUpLeft: Empty },
      "@/i18n/navigation": { Link: "a", usePathname: () => `/explore/${mode}${detail ? "/entry" : ""}` },
      "@/constants/navigation": { EXPLORE_FEATURED_LINKS: [{ key: "myth", href: "/explore/myth" }, { key: "faction", href: "/explore/faction" }] },
      "@/components/layout/PageContainer": { default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> },
      "../myth/mythHref": require("../myth/mythHref"),
    });
    const $ = load(renderToStaticMarkup(<Frame><div>Body</div></Frame>));
    const current = $("nav [aria-current='page']");
    assert.equal(current.length, 1);
    assert.equal(current.is(detail ? "a" : "span"), true);
    if (detail) {
      assert.equal(current.attr("href"), `/explore/${mode}`);
      assert.equal(current.attr("data-atlas-catalog-link"), "true");
      assert.ok(current.attr("title"));
    }
  }
});

test("mode가 달라도 페이지 DOM 계층과 클래스는 같다", () => {
  const structure = (mode: AtlasWorld) => {
    const $ = load(renderScreen(mode));
    return $("#atlas-selection, #atlas-selection *, #atlas-members, #atlas-members *").map((_, el) => ({
      tag: el.tagName, className: $(el).attr("class"), level: $(el).attr("data-atlas-level"),
    })).get();
  };
  assert.deepEqual(structure("myth"), structure("faction"));
});

test("목록 카드는 실제 상세 링크와 인원 접근성 이름을 유지하며 장면 완성을 배경으로 표시한다", () => {
  const Card = loadComponent(new URL("./AtlasCatalogCard.tsx", import.meta.url), {
    "next-intl": { useTranslations: () => (key: string) => key },
    "@/i18n/navigation": { Link: "a" },
    "lucide-react": { ArrowRight: Empty, Compass: Empty, Users: Empty },
  });
  const $ = load(renderToStaticMarkup(<Card entry={{ id: "done", name: "Done", href: "/done", headline: null, cover: null, members: 56, scenesComplete: true }} />));
  assert.equal($('a[href="/done"][data-atlas-scenes-complete]').length, 1);
  assert.match($("a").attr("class")!, /bg-sky-200/);
  assert.equal($("h3").text(), "Done");
  assert.equal($(".sr-only").text(), "members");
});
