import assert from 'node:assert/strict'
import test from 'node:test'

import { isBotUserAgent, isHumanBrowserUserAgent } from './render-mode'

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
})

test('UA가 없거나 비어 있으면 봇으로 본다', () => {
  assert.equal(isBotUserAgent(null), true)
  assert.equal(isBotUserAgent(''), true)
  assert.equal(isBotUserAgent('   '), true)
  assert.equal(isHumanBrowserUserAgent(null), false)
})

test('자동화 도구도 봇으로 본다', () => {
  assert.equal(isBotUserAgent(CURL), true)
  assert.equal(isHumanBrowserUserAgent(CURL), false)
})

test('사람이 쓰는 브라우저만 스트리밍 대상이다', () => {
  for (const ua of [DESKTOP_CHROME, MOBILE_SAFARI, WHALE, FIREFOX]) {
    assert.equal(isBotUserAgent(ua), false, ua)
    assert.equal(isHumanBrowserUserAgent(ua), true, ua)
  }
})

test('모르는 UA는 사람으로 보지 않는다', () => {
  assert.equal(isHumanBrowserUserAgent('SomeUnknownAgent/1.0'), false)
})
