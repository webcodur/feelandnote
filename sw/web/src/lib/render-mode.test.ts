import assert from 'node:assert/strict'
import test from 'node:test'

import { isBotUserAgent, isHumanBrowserUserAgent, shouldStreamForUserAgent } from './render-mode'

const GOOGLEBOT_SMARTPHONE =
  'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.33 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
const YETI = 'Mozilla/5.0 (compatible; Yeti/1.1; +http://naver.me/spd)'
const CURL = 'curl/8.4.0'

const DESKTOP_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const MOBILE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
const WHALE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Whale/3.27.172.9 Safari/537.36'
const FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0'

test('브라우저 서명을 달고 오는 크롤러도 봇으로 잡는다', () => {
  assert.equal(isBotUserAgent(GOOGLEBOT_SMARTPHONE), true)
  assert.equal(isHumanBrowserUserAgent(GOOGLEBOT_SMARTPHONE), false)
  assert.equal(isBotUserAgent(YETI), true)
  assert.equal(isHumanBrowserUserAgent(YETI), false)
  assert.equal(shouldStreamForUserAgent(GOOGLEBOT_SMARTPHONE), false)
  assert.equal(shouldStreamForUserAgent(YETI), false)
})

test('빈 UA도 먼저 표시하되 공유 HTML 캐시용 브라우저로 간주하지 않는다', () => {
  for (const ua of [null, '', '   ']) {
    assert.equal(isBotUserAgent(ua), false)
    assert.equal(shouldStreamForUserAgent(ua), true)
    assert.equal(isHumanBrowserUserAgent(ua), false)
  }
})

test('자동화 도구도 봇으로 본다', () => {
  assert.equal(isBotUserAgent(CURL), true)
  assert.equal(isHumanBrowserUserAgent(CURL), false)
  assert.equal(shouldStreamForUserAgent(CURL), false)
})

test('확인된 브라우저는 스트리밍과 공유 HTML 캐시 대상이다', () => {
  for (const ua of [DESKTOP_CHROME, MOBILE_SAFARI, WHALE, FIREFOX]) {
    assert.equal(isBotUserAgent(ua), false, ua)
    assert.equal(isHumanBrowserUserAgent(ua), true, ua)
    assert.equal(shouldStreamForUserAgent(ua), true, ua)
  }
})

test('미확인 UA는 먼저 표시하되 공유 HTML 캐시 대상에서 제외한다', () => {
  assert.equal(shouldStreamForUserAgent('SomeUnknownAgent/1.0'), true)
  assert.equal(isHumanBrowserUserAgent('SomeUnknownAgent/1.0'), false)
})

test('링크 미리보기 봇은 브라우저 서명이 있어도 완성 HTML을 받는다', () => {
  const ua = `${DESKTOP_CHROME} facebookexternalhit/1.1`
  assert.equal(shouldStreamForUserAgent(ua), false)
  assert.equal(isHumanBrowserUserAgent(ua), false)
})
