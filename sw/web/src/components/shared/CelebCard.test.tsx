import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import type { ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import ts from "typescript";
import type { CelebProfile } from "@/types/home";
import { getCelebProfileUrl } from "@/lib/url";

const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(readFileSync(new URL("./CelebCard.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function renderCard(options: { variant?: "card" | "circle" | "medallion"; locale?: "ko" | "en"; profile?: boolean; subtitle?: boolean } = {}) {
  const locale = options.locale ?? "ko";
  const profile = {
    id: "figure-id", slug: "bill-gates", nickname: "빌 게이츠", nickname_en: "Bill Gates",
    has_voice: false, greeting: ["안녕하세요"], view_count: 120,
  } as CelebProfile;
  const mocks: Record<string, unknown> = {
    "@/i18n/navigation": {
      Link: ({ href, prefetch, ...props }: React.ComponentProps<"a"> & { prefetch?: boolean }) => {
        assert.equal(prefetch, false);
        return <a {...props} href={`${locale === "en" ? "/en" : ""}${href}`} />;
      },
    },
    "@/lib/url": { getCelebProfileUrl },
    "@/components/features/celeb/modals/CelebViewsModal": { default: () => null },
    "@/components/ui": {
      CelebImage: ({ alt }: { alt: string }) => <svg role="img" aria-label={alt} />,
      VoiceBadge: ({ active }: { active: boolean }) => <span data-voice-active={String(active)} />,
    },
    "@/hooks/useCelebGreeting": { useCelebGreeting: () => ({ fireGreeting: () => {} }) },
    "next-intl": {
      useLocale: () => locale,
      useTranslations: () => (key: string) => key === "playDialogue" ? "Show dialogue" : key,
    },
  };
  const loaded = { exports: {} as { default: ComponentType<{
    id: string; nickname: string; celebProfile?: CelebProfile; recentViews: number;
    variant?: "card" | "circle" | "medallion"; onSubtitle?: () => void;
  }> } };
  new Function("require", "module", "exports", compiled)(
    (id: string) => mocks[id] ?? require(id), loaded, loaded.exports,
  );
  const Card = loaded.exports.default;
  return load(renderToStaticMarkup(
    <Card id="figure-id" nickname="빌 게이츠" celebProfile={options.profile === false ? undefined : profile}
      recentViews={30} variant={options.variant} onSubtitle={options.subtitle === false ? undefined : () => {}} />,
  ));
}

for (const variant of ["card", "circle", "medallion"] as const) {
  test(`${variant}: the portrait is inside the initial detail link and dialogue is a sibling button`, () => {
    const $ = renderCard({ variant });
    const link = $('a[href="/celeb/bill-gates"]');
    assert.equal(link.length, 1);
    assert.equal(link.find('[role="img"]').length, 1);
    assert.equal(link.attr("aria-label"), "빌 게이츠");
    assert.equal(link.find("button, a, [role=button]").length, 0);
    const dialogue = $('button[aria-label="빌 게이츠 · Show dialogue"]');
    assert.equal(dialogue.length, 1);
    assert.equal(dialogue.parents("a").length, 0);
    assert.equal(dialogue.find("[data-voice-active]").attr("data-voice-active"), "false");
    if (variant !== "medallion") assert.ok(link.text().includes("빌 게이츠"));
    if (variant === "card") assert.equal($('button[aria-label*="viewsBadge"]').parents("a").length, 0);
  });
}

test("English names and links use the locale while views remain a separate action", () => {
  const $ = renderCard({ locale: "en" });
  assert.equal($('a[href="/en/celeb/bill-gates"]').text().trim(), "Bill Gates");
  assert.equal($('button[aria-label="Bill Gates · Show dialogue"]').length, 1);
  assert.equal($('button[aria-label*="viewsBadge"]').length, 1);
});

test("cards without a loaded profile retain the UUID route and offer no unusable dialogue button", () => {
  const $ = renderCard({ profile: false });
  assert.equal($('a[href="/figure-id"]').find('[role="img"]').length, 1);
  assert.equal($('button[aria-label*="Show dialogue"]').length, 0);
});

test("cards without a subtitle host do not offer a dialogue action", () => {
  const $ = renderCard({ subtitle: false });
  assert.equal($('button[aria-label*="Show dialogue"]').length, 0);
  assert.equal($('a[href="/celeb/bill-gates"]').length, 1);
});
