// Run from any directory: node sw/web/scripts/check-celeb-avatar-sizing.mjs
// Bundles the real component; needs neither Next dev nor the user's browser.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const { build } = require(require.resolve('esbuild', { paths: [require.resolve('tsx')] }));
const webRoot = fileURLToPath(new URL('../', import.meta.url));
const { outputFiles } = await build({
  absWorkingDir: webRoot,
  stdin: {
    resolveDir: webRoot,
    loader: 'tsx',
    contents: `
      import { StrictMode } from 'react';
      import { createRoot } from 'react-dom/client';
      import { flushSync } from 'react-dom';
      import CelebAvatarImage from './src/components/ui/CelebAvatarImage';
      let root = createRoot(document.getElementById('root'));
      window.renderAvatars = (avatars) => flushSync(() => root.render(
        <StrictMode>{avatars.map(({ id, src, width, height, hidden, flow, scale }) =>
          <div key={id} id={id} style={{ position: 'relative', width, height, display: hidden ? 'none' : 'block', transform: scale == null ? undefined : 'scale(' + scale + ')' }}>
            <CelebAvatarImage src={src} alt={id}
              {...(flow ? { width: 800, height: 800, style: { width: '100%', height: 'auto' } } : {})}
              onLoad={() => { window.avatarLoads = (window.avatarLoads ?? 0) + 1; }}
              onError={() => { window.avatarErrors = (window.avatarErrors ?? 0) + 1; }} />
          </div>
        )}</StrictMode>
      ));
      window.unmountAvatars = () => { flushSync(() => root.unmount()); root = createRoot(document.getElementById('root')); };
    `,
  },
  bundle: true,
  write: false,
  platform: 'browser',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"development"' },
});
const images = new Map(await Promise.all([96, 384, 800].map(async (size) => [size,
  await sharp({ create: { width: size, height: size, channels: 3, background: '#8493a8' } }).webp().toBuffer(),
])));
const avatarUrl = (id, tier = 'original') => `https://avatar.test/celebs/${id}/avatar${tier === true || tier === 'small' ? '-sm' : tier === 'medium' ? '-md' : ''}.webp?v=regression`;
const browser = await puppeteer.launch({ headless: true });
let passed = 0;

async function scenario(name, pixelRatio, run) {
  const page = await browser.newPage();
  const requests = [];
  const errors = [];
  try {
    await page.setViewport({ width: 900, height: 700, deviceScaleFactor: pixelRatio });
    await page.setCacheEnabled(false);
    await page.setRequestInterception(true);
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      const url = request.url();
      requests.push(url);
      const missing = (/\/(missing|missing-medium)\/avatar-(sm|md)\.webp/.test(url) || url.includes('/all-missing/'));
      void request.respond({
        status: missing ? 404 : 200,
        contentType: 'image/webp',
        headers: { 'cache-control': 'no-store' },
        body: missing ? '' : images.get(url.includes('avatar-sm.webp') ? 96 : url.includes('avatar-md.webp') ? 384 : 800),
      });
    });
    await page.setContent('<style>body{margin:0}.object-cover{object-fit:cover}</style><div id="root"></div>');
    // Instrument native APIs without replacing layout, observer delivery or media matching.
    await page.evaluate(() => {
      const NativeObserver = window.ResizeObserver;
      const observers = new Set();
      const listeners = new Map();
      const mediaQueries = [];
      const resizeListeners = new Set();
      window.ResizeObserver = class extends NativeObserver {
        nodes = new Set();
        constructor(callback) { super(callback); observers.add(this); }
        observe(node, options) { this.nodes.add(node); return super.observe(node, options); }
        unobserve(node) { this.nodes.delete(node); return super.unobserve(node); }
        disconnect() { this.nodes.clear(); return super.disconnect(); }
      };
      const nativeMatchMedia = window.matchMedia.bind(window);
      window.matchMedia = (query) => {
        const media = nativeMatchMedia(query);
        mediaQueries.push(media);
        const add = media.addEventListener.bind(media);
        const remove = media.removeEventListener.bind(media);
        media.addEventListener = (type, listener, options) => { if (type === 'change') listeners.set(media, listener); return add(type, listener, options); };
        media.removeEventListener = (type, listener, options) => { if (type === 'change' && listeners.get(media) === listener) listeners.delete(media); return remove(type, listener, options); };
        return media;
      };
      // CDP changes devicePixelRatio/matches but omits the OS/browser density event.
      window.deliverDensityChange = () => {
        for (const media of [...mediaQueries]) {
          if (!media.matches) media.dispatchEvent(new Event('change'));
        }
      };
      const add = window.addEventListener.bind(window);
      const remove = window.removeEventListener.bind(window);
      window.addEventListener = (type, listener, options) => { if (type === 'resize') resizeListeners.add(listener); return add(type, listener, options); };
      window.removeEventListener = (type, listener, options) => { if (type === 'resize') resizeListeners.delete(listener); return remove(type, listener, options); };
      window.observerCounts = () => ({
        observers: [...observers].filter((observer) => observer.nodes.size > 0).length,
        nodes: [...observers].reduce((count, observer) => count + observer.nodes.size, 0),
        densityListeners: listeners.size,
        resizeListeners: resizeListeners.size,
      });
    });
    await page.addScriptTag({ content: outputFiles[0].text });
    const render = (avatars) => page.evaluate((items) => window.renderAvatars(items), avatars);
    const settled = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const expectImage = async (id, src, size) => {
      await page.waitForFunction((id, src, size) => {
        const image = document.querySelector('#' + id + ' img');
        return image?.getAttribute('src') === src && image.complete && image.naturalWidth === size;
      }, { timeout: 5000 }, id, src, size);
      await settled();
    };
    const item = (id, width, height = width, extra = {}) => ({ id, src: avatarUrl(id), width, height, ...extra });
    await run({ page, requests, render, settled, expectImage, item });
    await page.evaluate(() => window.unmountAvatars());
    assert.deepEqual(await page.evaluate(() => window.observerCounts()), {
      observers: 0, nodes: 0, densityListeners: 0, resizeListeners: 0,
    }, `${name}: observer/listener cleanup`);
    assert.deepEqual(errors, [], `${name}: browser errors`);
    passed++;
    console.log(`PASS ${name}`);
  } finally {
    await page.close();
  }
}

try {
  for (const [name, dpr, width, height, tier] of [
    ['48px square at DPR 2', 2, 48, 48, 'small'],
    ['48x68 portrait at DPR 2', 2, 48, 68, 'medium'],
    ['40px square at DPR 3', 3, 40, 40, 'medium'],
    ['192px at DPR 2 medium boundary', 2, 192, 192, 'medium'],
    ['193px at DPR 2 needs original', 2, 193, 193, 'original'],
  ]) {
    await scenario(name, dpr, async ({ requests, render, expectImage, item }) => {
      await render([item('first', width, height)]);
      await expectImage('first', avatarUrl('first', tier), tier === 'small' ? 96 : tier === 'medium' ? 384 : 800);
      assert.deepEqual(requests, [avatarUrl('first', tier)], 'only the selected image is requested');
    });
  }
  await scenario('height-only resize', 2, async ({ page, render, expectImage, item }) => {
    await render([item('resize', 48)]);
    await expectImage('resize', avatarUrl('resize', true), 96);
    await page.$eval('#resize', (node) => { node.style.height = '68px'; });
    await expectImage('resize', avatarUrl('resize', 'medium'), 384);
  });
  await scenario('DPR change without CSS resize (density event supplied for CDP)', 2, async ({ page, render, expectImage, item }) => {
    await render([item('density', 40)]);
    await expectImage('density', avatarUrl('density', true), 96);
    await page.setViewport({ width: 900, height: 700, deviceScaleFactor: 3 });
    await page.evaluate(() => window.deliverDensityChange());
    await expectImage('density', avatarUrl('density', 'medium'), 384);
    await page.setViewport({ width: 900, height: 700, deviceScaleFactor: 2 });
    await page.evaluate(() => window.deliverDensityChange());
    await expectImage('density', avatarUrl('density', true), 96);
  });
  await scenario('missing small falls back once; replacement source resets failure', 2, async ({ requests, render, expectImage, item }) => {
    await render([item('missing', 40)]);
    await expectImage('missing', avatarUrl('missing'), 800);
    assert.deepEqual(requests, [avatarUrl('missing', true), avatarUrl('missing')]);
    await render([item('missing', 40, 40, { src: avatarUrl('replacement') })]);
    await expectImage('missing', avatarUrl('replacement', true), 96);
    assert.deepEqual(requests, [avatarUrl('missing', true), avatarUrl('missing'), avatarUrl('replacement', true)]);
  });
  await scenario('missing medium falls back once without retry loop', 2, async ({ requests, render, expectImage, item }) => {
    await render([item('missing-medium', 140)]);
    await expectImage('missing-medium', avatarUrl('missing-medium'), 800);
    assert.deepEqual(requests, [avatarUrl('missing-medium', 'medium'), avatarUrl('missing-medium')]);
    await render([item('missing-medium', 180)]);
    await expectImage('missing-medium', avatarUrl('missing-medium'), 800);
    assert.equal(requests.length, 2);
  });
  await scenario('intrinsic dimensions retain flow layout before and after loading', 2, async ({ page, requests, render, expectImage, item }) => {
    await render([item('flow', 160, undefined, { flow: true })]);
    await expectImage('flow', avatarUrl('flow', 'medium'), 384);
    assert.deepEqual(await page.$eval('#flow img', (node) => ({
      width: node.getBoundingClientRect().width,
      height: node.getBoundingClientRect().height,
      position: getComputedStyle(node).position,
    })), { width: 160, height: 160, position: 'static' });
    assert.deepEqual(requests, [avatarUrl('flow', 'medium')]);
  });
  await scenario('entrance scale does not select an undersized image', 2, async ({ render, expectImage, item }) => {
    await render([item('animated', 56, 56, { scale: 0.85 })]);
    await expectImage('animated', avatarUrl('animated', 'medium'), 384);
  });
  await scenario('external error handler runs only when original also fails', 2, async ({ page, requests, render, expectImage, item }) => {
    await render([item('missing-medium', 140)]);
    await expectImage('missing-medium', avatarUrl('missing-medium'), 800);
    assert.equal(await page.evaluate(() => window.avatarErrors ?? 0), 0);
    await render([item('all-missing', 140)]);
    await page.waitForFunction(() => window.avatarErrors === 1);
    assert.deepEqual(requests.slice(-2), [avatarUrl('all-missing', 'medium'), avatarUrl('all-missing')]);
    assert.equal(await page.evaluate(() => window.avatarLoads), 1);
  });
  await scenario('hidden zero-size waits until visible', 2, async ({ page, requests, render, settled, expectImage, item }) => {
    await render([item('hidden', 48, 68, { hidden: true })]);
    await settled();
    assert.deepEqual(requests, []);
    assert.equal(await page.$eval('#hidden img', (node) => node.getAttribute('src')), null);
    await page.$eval('#hidden', (node) => { node.style.display = 'block'; });
    await expectImage('hidden', avatarUrl('hidden', 'medium'), 384);
    assert.deepEqual(requests, [avatarUrl('hidden', 'medium')]);
  });
  await scenario('external image URL remains unchanged', 3, async ({ requests, render, expectImage, item }) => {
    const src = 'https://external.test/person.jpg?size=100';
    await render([item('external', 40, 40, { src })]);
    await expectImage('external', src, 800);
    assert.deepEqual(requests, [src]);
  });
  await scenario('StrictMode shared observer and unmount/remount cleanup', 2, async ({ page, render, expectImage, item }) => {
    const avatars = [item('one', 32), item('two', 40), item('three', 80)];
    await render(avatars);
    await expectImage('three', avatarUrl('three', 'medium'), 384);
    assert.deepEqual(await page.evaluate(() => window.observerCounts()), {
      observers: 1, nodes: 3, densityListeners: 1, resizeListeners: 1,
    });
    await page.evaluate(() => window.unmountAvatars());
    assert.deepEqual(await page.evaluate(() => window.observerCounts()), {
      observers: 0, nodes: 0, densityListeners: 0, resizeListeners: 0,
    });
    await render([item('again', 48, 68)]);
    await expectImage('again', avatarUrl('again', 'medium'), 384);
  });
  console.log(`All ${passed} avatar sizing browser regressions passed.`);
} finally {
  await browser.close();
}
