import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import puppeteer from 'puppeteer'

const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx'))('esbuild')
const postcss = require('postcss')
const tailwind = require('@tailwindcss/postcss')
const messages = Object.fromEntries(['ko','en'].map(locale => [locale, {
  ...require(`../../../../../../messages/${locale}/core.json`),
  ...require(`../../../../../../messages/${locale}/content.json`),
}]))
type Builder = {
  onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void
  onLoad: (options: { filter: RegExp; namespace?: string }, callback: (args: { path: string }) => unknown) => void
}
type FixtureWindow = Window & { fixtureLocale?: string; updateCard: (props: Record<string, unknown>) => void }

test('music shelf restores preview and listening link without retaining another track', async () => {
  const resolveDir = fileURLToPath(new URL('./', import.meta.url))
  const output = await build({
    absWorkingDir: fileURLToPath(new URL('../../../../../../', import.meta.url)),
    tsconfig: fileURLToPath(new URL('../../../../../../tsconfig.json', import.meta.url)),
    stdin: { resolveDir, loader: 'tsx', contents: `
      import {createRoot} from 'react-dom/client'; import {useState} from 'react'; import Card from './ExpandCard';
      const item={content_id:'track-a',review:'Why this track matters',content:{id:'track-a',type:'MUSIC',title:'Buriburi',creator:'Balming Tiger'}};
      const brief={contentId:'track-a',category:'music',description:'Track introduction',metadata:{artists:['Eddie Vedder & Mike McCready'],albumType:'track',genre:'Alternative',previewUrl:'https://example.test/a.m4a',itunesUrl:'https://music.apple.com/album/track-a'}};
      function App(){const [props,setProps]=useState({item,brief,isActive:true,isBriefLoading:false,isRecordLoading:false,hasBriefError:false,hasRecordError:false,onRetryBrief(){},onRetryRecord(){}});
        window.updateCard=next=>setProps(previous=>({...previous,...next}));return <Card {...props}/>}
      createRoot(document.getElementById('root')).render(<App/>);
    ` },
    bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env': '{}' },
    plugins: [{ name: 'music-shelf-fixture', setup(builder: Builder) {
      builder.onResolve({ filter: /^(next-intl|.*\/(ContentCover|ContentCoverLink|ContentTextModal|ContentPurchaseAction|ContentIntro|CreatorNames|FormattedText|ContentReadingText|ReviewScrollBox|Button))$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => {
        const contents = args.path === 'next-intl'
          ? `const messages=${JSON.stringify(messages)};export const useLocale=()=>window.fixtureLocale||'ko';export const useTranslations=namespace=>key=>[...namespace.split('.'),...key.split('.')].reduce((v,k)=>v?.[k],messages[window.fixtureLocale||'ko'])||key;`
          : args.path.endsWith('/CreatorNames')
            ? `export default function Names({text}){return text}`
            : args.path.endsWith('/ContentIntro')
              ? `export default function Intro(){return <p data-fixture-intro>작품 소개: 에디 베더와 마이크 매크리디의 라이브다. 2006년 녹음이다. 팬들의 보물이다.</p>}`
            : args.path.endsWith('/ContentCoverLink')
              ? `export default function Cover({className}){return <div data-fixture-cover className={className} style={{background:'#343b3e'}}/>}`
            : args.path.endsWith('/ContentPurchaseAction')
              ? `export default function Purchase({className}){return <button className={className}>구매 및 감상</button>}`
            : args.path.endsWith('/FormattedText')
              ? `export default function Text({text}){return <span data-fixture-review>{text}</span>}`
            : `export const REVIEW_PREVIEW_TEXT_CLASS='';export default function Leaf({children}){return children??null}`
        return { contents, loader: 'jsx', resolveDir }
      })
    } }],
  })
  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    const errors: string[] = []
    page.on('pageerror', error => errors.push(String(error)))
    const css = await postcss([tailwind()]).process(`
      @import "tailwindcss" source(none);
      @source "./components/features/user/contentLibrary/expand/ExpandCard.tsx";
      @source "./components/features/user/contentLibrary/expand/ContentMetaDetails.tsx";
      @source "./components/features/user/contentLibrary/expand/MusicPreviewPlayer.tsx";
      @theme { --color-accent:#78b7cf; --color-accent-hover:#a3d6e7; --color-bg-main:#090f12; --color-bg-card:#101c22; --color-text-primary:#e5e9eb; --color-text-secondary:#9aadb6; --color-text-tertiary:#82949c; }
    `, { from: fileURLToPath(new URL('../../../../../music-fixture.css', import.meta.url)) })
    await page.setContent('<style>body{margin:0;background:#090f12;color:#9aadb6;font:15px/1.65 sans-serif}#root{max-width:900px;margin:auto}</style><div id="root"></div>')
    await page.addStyleTag({content:css.css})
    await page.evaluate(() => {
      HTMLMediaElement.prototype.play = async function () { this.dispatchEvent(new Event('play')) }
      HTMLMediaElement.prototype.pause = function () { this.dispatchEvent(new Event('pause')) }
    })
    await page.addScriptTag({ content: output.outputFiles[0].text })
    await page.waitForSelector('article')
    assert.equal(await page.$eval('article', node => node.querySelectorAll('audio').length), 1,
      'The selected music shelf card must expose the saved audio preview')
    const audio = await page.$eval('audio', node => ({ src: node.src, preload: node.preload, autoplay: node.autoplay }))
    assert.deepEqual(audio, { src: 'https://example.test/a.m4a', preload: 'none', autoplay: false })
    assert.equal(await page.$eval('a[href^="https://music.apple.com"]', node => node.getAttribute('target')), '_blank')
    for (const width of [320, 390, 900]) {
      await page.setViewport({width,height:800})
      const layout = await page.$eval('[data-music-details]', node => {
        const box=node.getBoundingClientRect();const player=node.querySelector('[data-music-preview]')!.getBoundingClientRect()
        return {box:{left:box.left,right:box.right},player:{left:player.left,right:player.right,bottom:player.bottom},reviewTop:document.querySelector('article section')!.getBoundingClientRect().top,labels:[...node.querySelectorAll('dt')].map(label=>({height:label.getBoundingClientRect().height,lineHeight:parseFloat(getComputedStyle(label).lineHeight)})),overflow:document.documentElement.scrollWidth>innerWidth}
      })
      assert.equal(layout.overflow,false)
      assert.ok(layout.player.left>=layout.box.left && layout.player.right<=layout.box.right+1)
      assert.ok(layout.labels.every(label=>label.height<=label.lineHeight+1),'Metadata labels must remain on one line')
      assert.ok(layout.player.bottom<=layout.reviewTop,'The player must not overlap the review below')
      if (width===900) assert.ok(layout.box.left>200,'Music details belong beside the cover with the introduction')
      if (process.env.TEST_ARTIFACT_DIR) await page.screenshot({path:`${process.env.TEST_ARTIFACT_DIR}/music-${width}.png`,fullPage:true})
    }
    await page.click('button[aria-label="미리듣기 재생"]')
    await page.waitForSelector('button[aria-label="일시정지"]')
    await page.$eval('audio', audio => { audio.dispatchEvent(new Event('pause'));Object.defineProperty(audio,'duration',{value:30,configurable:true});audio.dispatchEvent(new Event('durationchange')) })
    await page.waitForSelector('button[aria-label="미리듣기 재생"]')
    await page.focus('input[type=range]')
    await page.keyboard.press('ArrowRight')
    assert.ok(await page.$eval('audio',audio=>audio.currentTime)>0,'Seeking must update the media element')
    await page.click('button[aria-label="음소거"]')
    await page.waitForSelector('button[aria-label="음소거 해제"]')
    assert.equal(await page.$eval('audio',audio=>audio.muted),true)
    await page.$eval('audio',audio=>audio.dispatchEvent(new Event('error')))
    await page.waitForSelector('[data-music-preview] [role=alert]')

    const update = (props: Record<string, unknown>) => page.evaluate(props => (window as unknown as FixtureWindow).updateCard(props), props)
    await page.evaluate(() => { (window as unknown as FixtureWindow).fixtureLocale='en' })
    await update({ownerNickname:'Figure'})
    await page.waitForSelector('button[aria-label="Play preview"]')
    await page.setViewport({width:320,height:800})
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
    await page.evaluate(() => { (window as unknown as FixtureWindow).fixtureLocale='ko' })
    await update({ownerNickname:undefined,hasBriefError:true})
    await page.waitForSelector('button[aria-label="미리듣기 재생"]')
    assert.ok(await page.$('audio'),'An introduction-provider error must not remove saved music playback')
    await update({hasBriefError:false})
    await update({ showIntroduction: false })
    await page.waitForFunction(() => !document.querySelector('[data-fixture-intro]'))
    assert.equal(await page.$$eval('audio', nodes => nodes.length), 1)
    assert.equal(await page.$eval('[data-fixture-review]', node => node.textContent), 'Why this track matters')
    await update({ showIntroduction: true })
    await page.waitForSelector('[data-fixture-intro]')
    await update({ isActive: false })
    await page.waitForFunction(() => !document.querySelector('audio'))
    await update({ isActive: true })
    await page.waitForSelector('audio')
    await update({ item: { content_id: 'track-b', content: { id: 'track-b', type: 'MUSIC', title: 'Next track' } } })
    await page.waitForFunction(() => !document.querySelector('audio') && !document.querySelector('a[href^="https://music.apple.com"]'))
    await update({ isBriefLoading: true, brief: { contentId: 'track-b', category: 'music', metadata: { previewUrl: 'https://example.test/b.m4a' } } })
    await page.waitForFunction(() => !document.querySelector('audio') && !document.querySelector('a[href^="https://music.apple.com"]'))
    await update({ isBriefLoading: false, brief: { contentId: 'track-b', category: 'music', metadata: { previewUrl: 'https://example.test/b.m4a' } } })
    await page.waitForFunction(() => document.querySelector('audio')?.src === 'https://example.test/b.m4a')
    await update({ brief: { contentId: 'track-b', category: 'music', metadata: { itunesUrl: 'https://music.apple.com/album/track-b' } } })
    await page.waitForFunction(() => !document.querySelector('audio') && !!document.querySelector('a[href$="track-b"]'))
    await update({ item: { content_id: 'book', content: { id: 'book', type: 'BOOK', title: 'Book' } } })
    await page.waitForFunction(() => !document.querySelector('audio') && !document.querySelector('a[href^="https://music.apple.com"]'))
    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
  }
})
