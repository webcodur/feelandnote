import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const appDir = fileURLToPath(new URL("../../", import.meta.url));

async function buildFixture() {
  const mocks: Record<string, string> = {
    "next-intl": `const t = key => key; t.has = () => false; export const useTranslations = () => t; export const useLocale = () => 'ko';`,
    "next/image": `export default function Image({ fill, unoptimized, fetchPriority, ...props }) { return <img {...props}/>; }`,
    "@/i18n/navigation": `const router = { push() {} }; export const useRouter = () => router; export function Link({ children, ...props }) { return <a {...props}>{children}</a>; }`,
    "@/actions/user": `export const toggleFollow = async () => ({ success: true });`,
    "@/components/ui": `export const FormattedText = ({ text }) => <span>{text}</span>; export const Avatar = () => null; export const BlurDissolve = ({ children }) => children;`,
    "@/components/ui/NationalityText": `export default () => null;`,
    "@/contexts/GameAudioContext": `export const useRegisterGameAudio = () => {};`,
    "./hooks/useCheondoData": `export const useRoster = () => ({ roster: null, status: 'loading', retry() {} }); export const useVoice = () => null;`,
    "./hooks/useSuikodenAudio": `const audio = { sfx() {}, setBgm() {}, stopAll() {}, audioControls: {}, sfxMuted: true }; export const useSuikodenAudio = () => audio;`,
    "@/lib/game/suikoden/save": `export const readSaveMeta = () => null; export const loadGame = () => null; export const clearSave = () => {}; export const saveGame = () => true;`,
    "@/lib/game/suikoden/codex": `export const recordCodex = () => {}; export const recordLord = () => {};`,
    "@/lib/game/suikoden/world": `export const createGame = () => null;`,
    "./ui/Overlay": `const state = { toasts: [], push() {} }; export const useToasts = () => state; export const Modal = () => null; export const ToastStack = () => null;`,
    "./ui/styles": `export default '';`,
  };
  for (const component of ["./screens/CodexScreen", "./screens/GameScreen", "./screens/LordSelect", "./screens/TitleScreen", "./panels/HeroSheet", "./panels/HowToModal", "./MythBackdrop", "./MythTopBar"]) {
    mocks[component] = "export default () => null;";
  }
  return build({
    absWorkingDir: appDir, tsconfig: `${appDir}/tsconfig.json`,
    stdin: {
      resolveDir: appDir, loader: "tsx", contents: `
        import { StrictMode, useState } from 'react';
        import { createRoot } from 'react-dom/client';
        import { flushSync } from 'react-dom';
        import Modal from './src/components/ui/Modal';
        import Light from './src/components/features/celeb/modals/LightCelebModal';
        import Journey from './src/app/[locale]/(main)/celeb/[slug]/JourneyGlobeModal';
        import MythFrame from './src/components/features/game/myth/shared/MythGameFrame';
        import MythHub from './src/components/features/game/myth/shared/hub/MythHubLayer';
        import Troy from './src/components/features/game/myth/troy/ui/TroyFrame';
        import Cheondo from './src/components/features/game/suikoden/CheondoApp';
        import FullScreen from './src/components/shared/GameFullScreen';
        import Gallery from './src/components/ui/ImageGalleryModal';
        import ImageViewer from './src/components/ui/ImageViewerModal';
        import Artwork from './src/components/features/faction/FactionArtworkViewer';
        const noop = () => {};
        const pixel = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"/>');
        const components = {
          modal: <Modal isOpen onClose={noop} frame="plain" animateHeight={false}><button>Close</button></Modal>,
          light: <Light isOpen onClose={noop} celeb={{ id: 'test', nickname: 'Test', is_following: false }} />,
          journey: <Journey open onClose={noop} onPrevious={noop} onNext={noop} globe={<div/>} current={1} total={1} pageLabel="Page" title="Journey" closeLabel="Close" previousLabel="Previous" nextLabel="Next" />,
          'myth-frame': <MythFrame title="Myth" onTitleClick={noop} isFixture={false} fixtureCount={0}><div/></MythFrame>,
          'myth-hub': <MythHub><div/></MythHub>,
          troy: <Troy><div/></Troy>,
          cheondo: <Cheondo onExit={noop}/>,
          fullscreen: <FullScreen initialFullScreen><div/></FullScreen>,
          'image-viewer': <ImageViewer src={pixel} alt="Portrait" isOpen closeOnImageClick onClose={noop}/>,
        };
        function Harness() {
          const [layers, setLayers] = useState([]);
          const [mediaCount, setMediaCount] = useState(2);
          window.showLayers = next => flushSync(() => setLayers(next));
          window.changeMediaCount = count => flushSync(() => setMediaCount(count));
          return layers.map(name => {
            const owner = name.replace(/-copy$/, '');
            const images = Array.from({ length: mediaCount }, (_, index) => ({ src: pixel + '#' + index, alt: 'Image ' + index }));
            const component = owner === 'gallery'
              ? <Gallery images={images} initialIndex={1} title="Gallery" labels={{ close: 'Close', previous: 'Previous', next: 'Next' }} onClose={noop}/>
              : owner === 'artwork'
                ? <Artwork images={images.map(image => ({ url: image.src, label: image.alt, kind: 'scene', caption: 'Story.' }))} title="Story" initialIndex={1} onClose={noop}/>
                : components[owner];
            return <div key={name}>{component}</div>;
          });
        }
        createRoot(document.getElementById('root')).render(<StrictMode><Harness/></StrictMode>);
      `,
    },
    bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
    plugins: [{
      name: "scroll-fixture",
      setup(builder: {
        onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void;
        onLoad: (options: { filter: RegExp; namespace?: string }, callback: (args: { path: string }) => unknown) => void;
      }) {
        builder.onResolve({ filter: /.*/ }, args => args.path in mocks ? { path: args.path, namespace: "fixture" } : undefined);
        builder.onLoad({ filter: /\.css$/ }, () => ({ contents: "export default {};", loader: "js" }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: appDir }));
      },
    }],
  });
}

test("all page scroll lock owners release scroll after closing in either order", async t => {
  const output = await buildFixture();
  const browser = await puppeteer.launch({ headless: true });
  try {
    for (const name of ["modal", "light", "journey", "myth-frame", "myth-hub", "troy", "cheondo", "fullscreen", "image-viewer", "gallery", "artwork"]) {
      for (const scenario of ["single", "component-first", "modal-first", "reverse-open", "together", "same-owner"]) {
        await t.test(`${name}: ${scenario}`, async () => {
          const page = await browser.newPage();
          try {
            page.setDefaultTimeout(3000);
            await page.setViewport({ width: scenario === "single" ? 390 : 1440, height: 844 });
            const errors: string[] = [];
            page.on("pageerror", error => errors.push(String(error)));
            await page.setContent('<html style="overflow:visible"><body style="overflow:auto;margin:0"><div id="root"></div><div style="height:3000px"></div></body></html>');
            await page.addStyleTag({ content: ".fixed{position:fixed;inset:0}" });
            await page.addScriptTag({ content: output.outputFiles[0].text });
            await page.waitForFunction(() => typeof (window as unknown as { showLayers: unknown }).showLayers === "function");
            const show = async (layers: string[]) => {
              await page.evaluate(layers => (window as unknown as { showLayers: (layers: string[]) => void }).showLayers(layers), layers);
              await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
              assert.deepEqual(errors, [], "fixture must render actual lock owners without errors");
            };
            if (scenario === "same-owner") {
              await show([name]);
              await show([name, `${name}-copy`]);
              await show([`${name}-copy`]);
            } else if (scenario === "reverse-open") {
              await show(["modal"]);
              await show(["modal", name === "modal" ? "light" : name]);
              await show([name === "modal" ? "light" : name]);
            } else {
              await show([name]);
              if (scenario !== "single") {
                const other = name === "modal" ? "fullscreen" : "modal";
                await show([name, other]);
                if (scenario !== "together") await show([scenario === "component-first" ? other : name]);
              }
            }
            assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden", "remaining layer must keep the page locked");
            await show([]);
            assert.deepEqual(await page.evaluate(() => ({ body: document.body.style.overflow, root: document.documentElement.style.overflow })), { body: "auto", root: "visible" }, "closing all layers must restore both document styles");
            await page.mouse.move(300, 700);
            await page.mouse.wheel({ deltaY: 300 });
            await page.waitForFunction(() => window.scrollY > 0);
            assert.equal(await page.evaluate(() => document.body.dispatchEvent(new WheelEvent("wheel", { cancelable: true, bubbles: true }))), true, "no global wheel listener may block the page after closing");
          } finally {
            await page.close();
          }
        });
      }
    }
    for (const name of ["gallery", "artwork"]) {
      await t.test(`${name}: no visible image must not lock the page`, async () => {
        const page = await browser.newPage();
        try {
          page.setDefaultTimeout(3000);
          await page.setContent('<html><body><div id="root"></div><div style="height:3000px"></div></body></html>');
          await page.addScriptTag({ content: output.outputFiles[0].text });
          await page.waitForFunction(() => typeof (window as unknown as { showLayers: unknown }).showLayers === "function");
          const setCount = async (count: number) => {
            await page.evaluate(count => (window as unknown as { changeMediaCount: (count: number) => void }).changeMediaCount(count), count);
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
          };
          await setCount(0);
          await page.evaluate(name => (window as unknown as { showLayers: (layers: string[]) => void }).showLayers([name]), name);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
          assert.notEqual(await page.evaluate(() => document.body.style.overflow), "hidden", "empty viewer must not take a lock");
          await setCount(2);
          assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
          await page.keyboard.press("End");
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
          await setCount(1);
          assert.equal(await page.evaluate(() => Boolean(document.querySelector('[role="dialog"]'))), true, "shrinking image list must keep a visible close control");
          await setCount(0);
          assert.notEqual(await page.evaluate(() => document.body.style.overflow), "hidden", "vanishing images must release the lock");
          await page.mouse.wheel({ deltaY: 300 });
          await page.waitForFunction(() => window.scrollY > 0);
        } finally {
          await page.close();
        }
      });
    }
  } finally {
    await browser.close();
  }
});
