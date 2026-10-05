import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import puppeteer from 'puppeteer'

const arg = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback
const origin = arg('--origin', 'http://localhost:3000')
const paths = arg('--paths', '/,/en').split(',')
const viewports = arg('--viewports', 'mobile,desktop').split(',')
const messages = Object.fromEntries(await Promise.all(['ko', 'en'].map(async locale => [locale, JSON.parse(await readFile(new URL(`../messages/${locale}/core.json`, import.meta.url), 'utf8'))])))
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--mute-audio'] })
const userAgent = (await browser.userAgent()).replace('HeadlessChrome/', 'Chrome/')
let failures = 0

try {
  for (const path of paths) for (const viewport of viewports) {
    const page = await browser.newPage()
    await page.setUserAgent(userAgent)
    await page.setViewport(viewport === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 })
    const media = []
    const fontStyles = []
    const errors = []
    page.on('request', request => {
      if (/\.(mp3|m4a|ogg|wav)(?:[?#]|$)/i.test(request.url())) media.push(request.url())
      if (/pretendard.*\.css/i.test(request.url()) && !request.url().startsWith(origin)) fontStyles.push(request.url())
    })
    page.on('pageerror', error => errors.push(error.message))
    try {
      const response = await page.goto(new URL(path, origin).href, { waitUntil: 'networkidle2', timeout: 120_000 })
      await page.waitForFunction(() => document.querySelector('audio') && document.body.innerText.length > 400, { timeout: 30_000 })
      const initial = await page.evaluate(() => ({
        preload: document.querySelector('audio')?.preload,
        audioReadyState: document.querySelector('audio')?.readyState,
        font: getComputedStyle(document.body).fontFamily,
        heading: document.querySelector('h1')?.textContent,
      }))
      console.log(JSON.stringify({ path, viewport, status: response.status(), initial, mediaBeforePlay: media.length, externalFontStyles: fontStyles.length, errors }))
      assert.equal(response.status(), 200)
      assert.equal(media.length, 0, 'Audio must not download before a playback action')
      assert.equal(fontStyles.length, 0, 'Font CSS must not block first paint through an external request')
      assert(initial.heading, 'The homepage heading must remain visible')
      assert.equal(errors.length, 0, 'No application errors during initial rendering')
      const labels = messages[new URL(page.url()).pathname.startsWith('/en') ? 'en' : 'ko'].layout.musicPlayer
      const clickLabel = async (label, scope = '') => {
        const button = await page.$(`${scope}button[aria-label=${JSON.stringify(label)}]`)
        assert(button, `Missing control: ${label}`)
        await button.click()
      }
      await page.evaluate(() => document.fonts.ready)
      assert(await page.evaluate(() => [...document.fonts].some(font => font.family.includes('Pretendard') && font.status === 'loaded')), 'Pretendard must load successfully')
      await clickLabel(labels.music)
      await page.waitForSelector('[role="dialog"]')
      assert.equal(media.length, 0, 'Opening the music panel must not download audio')
      await clickLabel(labels.play, '[role="dialog"] ')
      await page.waitForFunction(() => {
        const audio = document.querySelector('audio')
        return audio && !audio.paused && audio.currentTime > 0
      }, { timeout: 30_000 })
      assert(media.length > 0, 'The play button must start downloading audio')
      const firstTrack = await page.$eval('audio', audio => audio.currentSrc)
      await clickLabel(labels.pause, '[role="dialog"] ')
      assert(await page.$eval('audio', audio => audio.paused), 'Pause must stop playback')
      const picker = await page.$('[role="dialog"] button[aria-haspopup="menu"]')
      await picker.click()
      await page.waitForSelector('[role="menuitemradio"]')
      const gameMenuItem = await page.evaluateHandle(label => [...document.querySelectorAll('[role="menuitemradio"]')].find(button => button.textContent.trim().includes(label)), labels.modes.game)
      assert(gameMenuItem.asElement(), 'Game playlist must be available')
      await gameMenuItem.asElement().click()
      const otherTrack = await page.evaluateHandle(() => [...document.querySelectorAll('[role="dialog"] button[aria-pressed]')].filter(button => !button.disabled)[1])
      assert(otherTrack.asElement(), 'A different track must be selectable')
      await otherTrack.asElement().click()
      await page.waitForFunction(previous => {
        const audio = document.querySelector('audio')
        return audio && audio.currentSrc !== previous && !audio.paused && audio.currentTime > 0
      }, { timeout: 30_000 }, firstTrack)
      assert.equal(errors.length, 0, 'No application errors during playback')
      console.log(JSON.stringify({ path, viewport, playback: 'play, pause and track change passed', mediaAfterPlay: media.length }))
    } catch (error) {
      failures++
      console.error(`${path} ${viewport}: ${error.message}`)
    } finally {
      await page.close()
    }
  }
} finally {
  await browser.close()
}
process.exitCode = failures ? 1 : 0
