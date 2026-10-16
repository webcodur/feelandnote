const assert = require('node:assert/strict')
const test = require('node:test')
const { forwardedActionUrl, wrapForwardedActionFetch } = require('./server-action-forwarding.cjs')

const actionHeaders = { 'x-action-forwarded': '1', 'next-action': 'public-action-id' }

test('forwarded dynamic workers resolve their actual locale without a Korean redirect', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]']) {
    for (const template of ['[locale]', '%5Blocale%5D']) {
      const url = `http://${host}:3111/${template}/celeb/[slug]?focus=analysis`
      assert.equal(String(forwardedActionUrl(url, { headers: actionHeaders })),
        `http://${host}:3111/celeb/[slug]?focus=analysis`)
      assert.equal(String(forwardedActionUrl(url, { headers: { ...actionHeaders, 'x-next-intl-locale': 'en' } })),
        `http://${host}:3111/en/celeb/[slug]?focus=analysis`)
    }
  }
})

test('ordinary fetches, public hosts and concrete routes stay unchanged', () => {
  const template = 'http://localhost:3000/[locale]/celeb/[slug]'
  for (const [url, headers] of [
    [template, {}], [template, { 'x-action-forwarded': '1' }],
    [template, { 'next-action': 'public-action-id' }],
    ['https://feelandnote.com/[locale]/celeb/[slug]', actionHeaders],
    ['http://localhost:3000/en/celeb/bill-gates', actionHeaders],
  ]) assert.equal(forwardedActionUrl(url, { headers }), url)
})

test('the forwarding fix preserves the body, auth headers, abort signal and fetch extensions', async () => {
  let received
  const original = async (input, init) => { received = { input, init }; return 'response' }
  original.extension = true
  const wrapped = wrapForwardedActionFetch(original)
  const init = { method: 'POST', headers: { ...actionHeaders, cookie: 'example=session' },
    body: 'read-only-action-body', signal: new AbortController().signal, duplex: 'half' }
  assert.equal(await wrapped('http://localhost:3000/[locale]/celeb/[slug]', init), 'response')
  assert.equal(received.input.pathname, '/celeb/[slug]')
  assert.equal(received.init, init)
  assert.equal(wrapped.extension, true)
})
