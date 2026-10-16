// Next forwards shared Server Actions to route templates. next-intl must receive
// a concrete locale, otherwise /[locale]/... resolves to another worker and loops.
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0'])

function forwardedActionUrl(input, init) {
  if (typeof input !== 'string' && !(input instanceof URL)) return input
  const headers = new Headers(init?.headers)
  if (headers.get('x-action-forwarded') !== '1' || !headers.has('next-action')) return input
  const url = new URL(input)
  if (!LOOPBACK_HOSTS.has(url.hostname)) return input
  const template = /^\/(?:\[locale\]|%5Blocale%5D)(?=\/)/i
  if (!template.test(url.pathname)) return input
  // Korean uses the unprefixed public path; /ko would redirect the POST again.
  url.pathname = url.pathname.replace(template, headers.get('x-next-intl-locale') === 'en' ? '/en' : '')
  return url
}

function wrapForwardedActionFetch(fetcher) {
  return Object.assign(function (input, init) {
    return fetcher.call(this, forwardedActionUrl(input, init), init)
  }, fetcher)
}

if (process.env.NODE_ENV === 'production') {
  globalThis.fetch = wrapForwardedActionFetch(globalThis.fetch)
}

module.exports = { forwardedActionUrl, wrapForwardedActionFetch }
