import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { load } from 'cheerio'
import CountryFlagImage from './CountryFlagImage'
import NationalityText from './NationalityText'

function render(code: string | null, display?: 'text' | 'flag' | 'both', locale = 'ko') {
  const messages = JSON.parse(readFileSync(`messages/${locale}/core.json`, 'utf8'))
  return renderToStaticMarkup(<NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
    <NationalityText code={code} display={display} />
  </NextIntlClientProvider>)
}

test('country names retain their existing Korean and English text display', () => {
  assert.equal(load(render('KR', 'text')).text(), '대한민국')
  assert.equal(load(render('KR', 'text', 'en')).text(), 'South Korea')
  assert.equal(render(null), '')
  assert.equal(render('  '), '')
})

test('metadata defaults to an interactive flag instead of country codes or text', () => {
  const page = load(render('US'))
  assert.equal(page('[class~="flag:US"]').length, 1)
  assert.equal(page('button[aria-haspopup="dialog"]').length, 1)
  assert.equal(page('button').attr('aria-label'), '미국 국기 안내')
  assert.equal(page.text(), '')
})

test('standalone flags offer a localized dialog action and normalize input', () => {
  for (const [locale, name] of [['ko', '대한민국'], ['en', 'South Korea']]) {
    const page = load(render(' kr ', 'flag', locale))
    const button = page('button')
    assert.equal(page('[class~="flag:KR"]').length, 1)
    assert.ok(button.attr('aria-label')?.includes(name))
    assert.equal(button.attr('aria-haspopup'), 'dialog')
    assert.equal(button.attr('aria-expanded'), 'false')
    assert.equal(button.attr('title'), button.attr('aria-label'))
    assert.equal(page('[class~="flag:KR"]').attr('aria-hidden'), 'true')
  }
})

test('flags beside country names remain separate dialog buttons', () => {
  const page = load(render('US', 'both', 'en'))
  assert.equal(page.text(), 'United States')
  assert.equal(page('[class~="flag:US"]').attr('aria-hidden'), 'true')
  assert.equal(page('[role="img"]').length, 0)
  assert.equal(page('button[aria-haspopup="dialog"]').length, 1)
  assert.equal(page('button button, a button, button a').length, 0)
})

test('unknown and historical nationalities retain their names without invented flags', () => {
  for (const display of ['flag', 'both'] as const) {
    assert.equal(load(render('XX', display)).text(), '미확인')
    assert.equal(load(render('XX', display, 'en')).text(), 'Unknown')
    assert.equal(load(render('SU', display)).text(), '소련')
    assert.equal(load(render('SU', display, 'en')).text(), 'Soviet Union')
    assert.equal(load(render('ZZ', display)).text(), '미확인')
    assert.equal(load(render('CS', display)).text(), '체코슬로바키아')
    assert.equal(load(render('CS', display, 'en')).text(), 'Czechoslovakia')
    assert.equal(load(render('SU', display))('[class*="flag:"]').length, 0)
  }
})

test('decorative flags omit unsupported countries and filter sentinel values', () => {
  for (const code of [null, undefined, '', 'XX', 'SU', 'CS', 'ZZ', 'all', 'none', 'K1']) {
    assert.equal(renderToStaticMarkup(<CountryFlagImage code={code} />), '')
  }
  assert.equal(load(renderToStaticMarkup(<CountryFlagImage code="JP" />))('[class~="flag:JP"]').attr('aria-hidden'), 'true')
})
