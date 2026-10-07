import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";

// Run against an existing dev server: node scripts/check-content-detail-layout.mjs
// Recent history must be populated: an empty browser misses intrinsic grid overflow.
const url = process.env.CONTENT_DETAIL_LAYOUT_URL
  ?? "http://localhost:3000/content/3b7008a0-db1e-5171-8f28-895bfe68e989?editionId=2496";
const widths = process.env.LAYOUT_WIDTHS?.split(",").map(Number)
  ?? [1920, 1440, 1280, 1024, 768, 390, 320];
const counts = process.env.LAYOUT_HISTORY_COUNTS?.split(",").map(Number) ?? [0, 20];
// Optional viewer fixture exercises the actual review component without an account or DB writes.
// Run with --env-file=.env and LAYOUT_VIEWER_FIXTURE=1 for the public DB hostname cookie key.
const viewerFixture = process.env.LAYOUT_VIEWER_FIXTURE === "1";
const cookieKey = viewerFixture
  ? `sb-${new URL(process.env.NEXT_PUBLIC_DB_API_URL).hostname.split(".")[0]}-auth-token` : null;
const browser = await puppeteer.launch({ headless: true });
let failures = 0;
try {
  for (const count of counts) {
    for (const width of widths) {
      const page = await browser.newPage();
      try {
        let viewerRequests = 0;
        if (viewerFixture) {
          await page.setRequestInterception(true);
          page.on("request", request => {
            let args;
            try { args = JSON.parse(request.postData() ?? "null"); } catch { args = null; }
            if (request.url().includes("/auth/v1/")) {
              void request.abort();
            } else if (request.method() === "POST" && request.headers()["next-action"]
              && request.postData() === JSON.stringify([new URL(url).pathname.split("/").pop()])) {
              viewerRequests++;
              void request.respond({ status: 200, contentType: "text/x-component",
                body: '0:{"a":"$@1","f":"","b":"development"}\n1:{"userRecord":null,"isLoggedIn":true}\n' });
            } else if (request.method() === "POST" && request.headers()["next-action"]
              && Array.isArray(args) && /^\d{10,13}$/.test(args[0]) && ["ko", "en"].includes(args[1])) {
              // The book introduction read is allowed, without sending the fixture cookie to the server.
              const headers = { ...request.headers() };
              headers.cookie = (headers.cookie ?? "").split(";").filter(value => !value.trim().startsWith(`${cookieKey}=`)).join(";");
              void request.continue({ headers });
            } else if (request.method() !== "GET" && request.method() !== "HEAD") {
              // Fixture sessions must never send auth or mutation requests to a real service.
              void request.abort();
            } else void request.continue();
          });
          await page.evaluateOnNewDocument((key) => {
            const session = { access_token: "layout-fixture", refresh_token: "layout-fixture",
              expires_at: Date.now() / 1000 + 3600, user: { id: "layout-fixture" } };
            document.cookie = `${key}=${encodeURIComponent(JSON.stringify(session))}; Path=/; SameSite=Lax`;
          }, cookieKey);
        }
        await page.setViewport({ width, height: width < 768 ? 844 : width < 1340 ? 1024 : 900,
          isMobile: width < 768, hasTouch: width < 768 });
        await page.evaluateOnNewDocument((size) => {
          localStorage.setItem("recent_contents", JSON.stringify(Array.from({ length: size }, (_, i) => ({
            id: `layout-fixture-${i}`, type: "BOOK", title: `Recent book ${i}`,
            creator: "Layout fixture", thumbnail: null, visitedAt: Date.now() - i,
          }))));
        }, count);
        await page.goto(url, { waitUntil: "domcontentloaded" });
        await page.waitForSelector("[data-content-work-id] h1");
        await page.waitForFunction(() => !document.querySelector('[data-content-introduction][data-loading="true"]'));
        await page.waitForFunction(() => [...document.querySelectorAll("[data-content-edition-info] img")]
          .every(img => img.complete && img.naturalWidth > 0
            && getComputedStyle(img.parentElement).filter === "none"
            && Number(getComputedStyle(img.parentElement).opacity) >= 0.99));
        if (count) await page.waitForSelector("#work-recent .overflow-x-auto");
        if (viewerFixture) {
          await page.waitForSelector('#work-my-review input[type="radio"]');
          assert.ok(viewerRequests >= 1, "viewer fixture did not hydrate through the real action call");
          const choices = await page.$$('#work-my-review input[type="radio"]');
          assert.equal(choices.length, 6, "my review should offer six simple reactions");
          await page.$eval('#work-my-review input[value="POS_03"]', el => el.click());
          await choices[1].focus();
          await choices[1].press("ArrowRight");
          await page.waitForFunction(() => document.querySelector('#work-my-review input[value="POS_04"]:checked'));
          assert.equal(await page.$$eval('#work-my-review input:checked', els => els.length), 1,
            "only one reaction can be selected");
          await page.waitForSelector('#work-my-review textarea');
          assert.ok(await page.$eval('#work-my-review', el => el.querySelector('textarea').readOnly
            && el.querySelector('input[type="checkbox"]').disabled
            && [...el.querySelectorAll('button[aria-pressed]')].every(button => button.disabled)),
          'quick reaction must disable manual review fields');
          await page.$eval('#work-my-review input[value="POS_04"]', el => el.click());
          await page.waitForFunction(() => !document.querySelector('#work-my-review textarea').readOnly);
          assert.equal(await page.$$eval('#work-my-review input[type="radio"]:checked', els => els.length), 0,
            'clicking the selected reaction again should clear it');
          await page.$eval('#work-my-review input[value="POS_03"]', el => el.click());
          await page.click('#work-my-review textarea');
          await page.waitForFunction(() => !document.querySelector('#work-my-review textarea').readOnly);
          assert.equal(await page.$$eval('#work-my-review input[type="radio"]:checked', els => els.length), 0,
            'clicking the review field should clear the reaction');
          await page.type('#work-my-review textarea', 'A review can be written normally.');
          const stars = await page.$$('#work-my-review button[aria-pressed]');
          await stars[2].focus();
          await stars[2].press('Enter');
          await page.waitForFunction(() => document.querySelector('#work-my-review button[aria-pressed="true"]'));
          await stars[2].press('Enter');
          await page.waitForFunction(() => !document.querySelector('#work-my-review button[aria-pressed="true"]'));
          assert.equal(await page.$$eval('#work-my-review button[aria-pressed="true"]', els => els.length), 0,
            'rating can be cleared without changing the reaction');
          await page.$eval('#work-my-review input[value="POS_04"]', el => el.click());
          assert.equal(await page.$eval('#work-my-review textarea', el => el.value), 'A review can be written normally.',
            'choosing a reaction must preserve the manual draft');
        }
        const result = await page.evaluate(() => {
          const root = document.querySelector("[data-content-work-id]");
          const bounds = root.getBoundingClientRect();
          const sections = [...root.querySelectorAll("[data-content-detail-section]")].map(el => {
            const rect = el.getBoundingClientRect();
            const line = el.querySelector("section")?.firstElementChild;
            return { id: el.dataset.contentDetailSection, left: rect.left, right: rect.right, width: rect.width,
              dividerGap: line?.classList.contains("bg-line")
                ? line.nextElementSibling.getBoundingClientRect().top - line.getBoundingClientRect().bottom : null };
          });
          const rail = root.querySelector("#work-recent .overflow-x-auto");
          const select = root.querySelector("select");
          const reactionControls = [...root.querySelectorAll('#work-my-review input[type="radio"] + span')].map(el => {
            const rect = el.getBoundingClientRect();
            return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
          });
          const hero = root.querySelector("[data-content-edition-info]");
          const heading = root.querySelector("#work-information h2");
          const preview = root.querySelector("[data-content-introduction] p");
          const introduction = root.querySelector("[data-content-introduction]");
          const title = root.querySelector("h1");
          return {
            root: { left: bounds.left, right: bounds.right, width: bounds.width },
            viewport: innerWidth, sections,
            rail: rail && { width: rail.clientWidth, content: rail.scrollWidth },
            select: select && { right: select.getBoundingClientRect().right },
            reactionControls,
            externalReviewSearch: !!root.querySelector('#work-my-review [data-external-resource-search]'),
            reviewForm: root.querySelector('#work-my-review textarea') && {
              right: root.querySelector('#work-my-review textarea').getBoundingClientRect().right,
              stars: root.querySelectorAll('#work-my-review button[aria-pressed]').length,
              spoiler: !!root.querySelector('#work-my-review input[type="checkbox"]'),
              saveEnabled: !root.querySelector('#work-my-review [data-save-review]').disabled,
              manualDisabled: root.querySelector('#work-my-review textarea').readOnly,
            },
            reviewPortraits: [...root.querySelectorAll('[data-review-kind="celeb"]')].map(card => {
              const header = card.firstElementChild.getBoundingClientRect();
              const portrait = card.querySelector("button").getBoundingClientRect();
              return { leftGap: portrait.left - card.getBoundingClientRect().left,
                topGap: portrait.top - header.top, heightGap: header.height - portrait.height,
                width: portrait.width, narrow: card.clientWidth <= 480 };
            }),
            externalSearch: root.querySelector("[data-external-resource-search]") && {
              headingFits: (() => { const el = root.querySelector("[data-external-search-heading]"); return el.scrollWidth <= el.clientWidth + 1; })(),
              buttonsFit: [...root.querySelectorAll("[data-external-resource-search] button")].every(el => el.scrollWidth <= el.clientWidth + 1 && el.getBoundingClientRect().height >= 44),
            },
            info: hero && heading && { height: hero.getBoundingClientRect().height,
              headerGap: hero.getBoundingClientRect().top - heading.getBoundingClientRect().bottom },
            introduction: preview && { visibleHeight: preview.clientHeight, fullHeight: preview.scrollHeight,
              left: introduction.getBoundingClientRect().left, titleLeft: title.getBoundingClientRect().left,
              clipped: preview.classList.contains("clip-fade-end"), opensDialog: preview.getAttribute("aria-haspopup") },
            banner: root.querySelector("[data-content-banner] img") && {
              loaded: root.querySelector("[data-content-banner] img").complete && root.querySelector("[data-content-banner] img").naturalWidth > 0,
              theme: root.querySelector("[data-content-banner]").getAttribute("data-content-banner"),
            },
          };
        });
        assert.ok(result.root.left >= -1 && result.root.right <= result.viewport + 1, "page exceeds viewport");
        assert.ok(result.root.width <= 961, "work page should use the narrower reading width");
        for (const section of result.sections) {
          assert.ok(section.left >= result.root.left - 1 && section.right <= result.root.right + 1,
            `${section.id} is ${section.width}px inside ${result.root.width}px page`);
          if (section.dividerGap !== null) assert.equal(Math.round(section.dividerGap), width >= 768 ? 64 : 48,
            `${section.id} should use the celebrity page's divider-to-heading gap`);
        }
        if (result.select) assert.ok(result.select.right <= result.root.right + 1, "edition selector exceeds page");
        assert.equal(result.externalReviewSearch, false, "external review search should be removed");
        if (viewerFixture) {
          assert.ok(result.reviewForm, 'normal review form should remain available');
          assert.ok(result.reviewForm.right <= result.root.right + 1, 'review textarea exceeds page');
          assert.equal(result.reviewForm.stars, 5, 'normal rating controls should remain available');
          assert.equal(result.reviewForm.spoiler, true, 'spoiler setting should remain available');
          assert.equal(result.reviewForm.saveEnabled, true, 'review text should be saveable');
          assert.equal(result.reviewForm.manualDisabled, true, 'selected reaction should disable manual fields');
        }
        for (const control of result.reactionControls) {
          assert.ok(control.left >= result.root.left - 1 && control.right <= result.root.right + 1, "reaction control exceeds page");
          assert.ok(control.width >= 44 && control.height >= 44, "reaction touch target is too small");
        }
        if (result.externalSearch) {
          assert.ok(result.externalSearch.headingFits, "external search title is clipped");
          assert.ok(result.externalSearch.buttonsFit, "external search buttons are clipped or too small");
        }
        for (const portrait of result.reviewPortraits) {
          assert.ok(portrait.width >= (portrait.narrow ? 64 : 80), "celebrity portrait was shrunk");
          assert.ok(Math.abs(portrait.leftGap) <= 2 && Math.abs(portrait.topGap) <= 1
            && Math.abs(portrait.heightGap) <= 1, "celebrity portrait should fill the header's left edge");
        }
        if (result.info) assert.ok(result.info.headerGap <= 16, "work information header leaves excessive space");
        if (result.introduction) {
          assert.ok(result.introduction.fullHeight <= result.introduction.visibleHeight + 1, "introduction is vertically clipped");
          assert.equal(result.introduction.clipped, false, "introduction should not fade out");
          assert.equal(result.introduction.opensDialog, null, "full introduction should already be visible");
          if (width >= 768) assert.ok(result.introduction.left >= result.introduction.titleLeft - 1,
            "desktop introduction should stay in the information column beside the cover");
          else assert.ok(result.introduction.left < result.introduction.titleLeft,
            "mobile introduction should use the full card width below the identity row");
        }
        if (result.banner) assert.equal(result.banner.loaded, true, "banner image did not load");
        if (count) {
          assert.ok(result.rail && result.rail.content > result.rail.width, "recent history should scroll inside its rail");
          const scrolled = await page.$eval("#work-recent .overflow-x-auto", el => {
            el.scrollLeft = 100;
            return el.scrollLeft;
          });
          assert.ok(scrolled > 0, "recent rail cannot scroll");
        }
        if (process.env.LAYOUT_SCREENSHOT_DIR) {
          const directory = process.env.LAYOUT_SCREENSHOT_DIR;
          await mkdir(directory, { recursive: true });
          const prefix = `${width}-history-${count}${viewerFixture ? "-viewer" : ""}`;
          await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
          await page.screenshot({ path: path.join(directory, `${prefix}-intro.png`) });
          if (viewerFixture) {
            await page.$eval("#work-my-review", el => el.scrollIntoView({ block: "start", behavior: "instant" }));
            await page.screenshot({ path: path.join(directory, `${prefix}-review.png`) });
          }
        }
        console.log(`PASS ${width}px / history ${count} / page ${result.root.width}px / banner ${result.banner?.theme}${viewerFixture ? " / viewer fixture" : ""}`);
      } catch (error) {
        failures++;
        console.error(`FAIL ${width}px / history ${count}: ${error.message}`);
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}
if (failures) process.exitCode = 1;
