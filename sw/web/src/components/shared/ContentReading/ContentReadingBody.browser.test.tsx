import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import puppeteer from 'puppeteer'
import ContentReadingBody from './ContentReadingBody'

const require = createRequire(import.meta.url)

test('reading quotations keep the home gold across home, themed shelves, introductions and full text', async () => {
  const globals = fileURLToPath(new URL('../../../app/globals.css', import.meta.url))
  const css = await require('postcss')([require('@tailwindcss/postcss')()]).process(readFileSync(globals, 'utf8'), { from: globals })
  const text = '본문 “인용문”과 ‘용어’, 《작품명》을 함께 읽는다.'
  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(renderToStaticMarkup(<>
      {(['review', 'intro'] as const).flatMap(kind => [false, true].map(themed => <section key={`${kind}-${themed}`}
        data-case={`${kind}-${themed ? 'themed' : 'home'}`} style={themed ? { '--color-accent': '#78b7cf', '--color-accent-hover': '#a3d6e7' } as React.CSSProperties : undefined}>
        <ContentReadingBody kind={kind} label={kind === 'intro' ? '작품 소개' : '감상 배경'} text={text} />
      </section>))}
    </>))
    await page.addStyleTag({ content: css.css })
    const quotations = await page.$$eval('[data-case]', sections => sections.map(section => {
      const leaf = [...section.querySelectorAll('span')].find(element => element.childElementCount === 0 && element.textContent === '“인용문”')!
      const term = [...section.querySelectorAll('span')].find(element => element.childElementCount === 0 && element.textContent === '‘용어’')!
      return { surface: section.getAttribute('data-case'), quotation: getComputedStyle(leaf).color, weight: getComputedStyle(leaf).fontWeight, term: getComputedStyle(term).color }
    }))
    assert.deepEqual(quotations, ['review-home', 'review-themed', 'intro-home', 'intro-themed'].map(surface => ({
      surface, quotation: 'rgb(249, 215, 110)', weight: '500', term: 'rgb(212, 175, 55)',
    })))
  } finally { await browser.close() }
})
