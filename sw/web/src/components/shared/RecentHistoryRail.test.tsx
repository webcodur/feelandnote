import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as history from "../../lib/recent-history";

function renderRail(items: history.RecentHistoryItem[]) {
  const code = ts.transpileModule(readFileSync(new URL("./RecentHistoryRail.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  const loaded = { exports: {} as { default: React.ComponentType<{ items: history.RecentHistoryItem[] }> } };
  const Icon = () => null;
  const modules: Record<string, unknown> = {
    react: React,
    "next-intl": { useLocale: () => "ko", useTranslations: () => (key: string) => key },
    "lucide-react": { BookOpen: Icon, History: Icon, Users: Icon, UserRound: Icon, X: Icon },
    "@/i18n/navigation": {
      Link: ({ scroll, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { scroll?: boolean }) => {
        void scroll;
        return React.createElement("a", props);
      },
      usePathname: () => "/explore/myth/myth-china-xiyou",
    },
    "@/hooks/useMouseDragScroll": { useMouseDragScroll: () => ({ ref: { current: null }, cursorClassName: "", dragProps: {} }) },
    "@/lib/recent-history": history,
    "@/hooks/useRecentHistory": { removeRecentHistory: () => {}, useRecentHistory: () => items },
    "@/components/features/user/explore/myth/MythTitleImage": { default: Icon },
    "./HubSection.module.css": { default: {} },
    "./RecentHistoryRail.module.css": { default: {} },
  };
  new Function("require", "module", "exports", "React", code)((id: string) => {
    if (!(id in modules)) throw new Error(`Unexpected dependency: ${id}`);
    return modules[id];
  }, loaded, loaded.exports, React);
  return renderToStaticMarkup(React.createElement(loaded.exports.default, { items }));
}

test("신화·세력 최근 카드는 저장된 인물 소개를 자동으로 열지 않는다", () => {
  for (const kind of ["myth", "faction"] as const) {
    const href = `/explore/${kind}/myth-china-xiyou`;
    for (const [query, expected] of [["?group=crew&person=wukong#members", "?group=crew#members"], ["?person=wukong", ""], ["", ""]]) {
      const items = history.parseRecentHistory(JSON.stringify([{
        kind, id: "xiyou", href: `${href}${query}`, title: "서유기",
        thumbnail: null, position: { groupId: "crew", personId: "wukong" }, visitedAt: 1,
      }]));
      const markup = renderRail(items);
      assert.ok(markup.includes(`href="${href}${expected}"`), markup);
      assert.ok(!markup.includes("person=wukong"), markup);
    }
  }
});

test("인물·작품 최근 카드는 기존 상세·판본 주소를 유지한다", () => {
  for (const [kind, href] of [["profile", "/celeb/wukong"], ["content", "/content/xiyou?editionId=72&category=book"]] as const) {
    const markup = renderRail([{ kind, id: "xiyou", href, title: "서유기", thumbnail: null, visitedAt: 1 }]);
    assert.ok(markup.includes(`href="${href.replaceAll("&", "&amp;")}"`), markup);
  }
});
