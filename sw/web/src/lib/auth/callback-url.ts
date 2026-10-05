type HeaderReader = {
  get(name: string): string | null
}

/** Auth always returns to a local app route in the language used to sign in. */
export function localizedAuthPath(path: string | null | undefined, locale: string, fallback = '/'): string {
  const candidate = path?.trim() || fallback
  if (!candidate.startsWith('/') || candidate.startsWith('//') || /[\\\u0000-\u001f]/.test(candidate)) {
    return localizedAuthPath(fallback, locale)
  }
  const url = new URL(candidate, 'https://feelandnote.com')
  const pathname = url.pathname.replace(/^\/(ko|en)(?=\/|$)/, '') || '/'
  if (/^\/(api|auth)(\/|$)/.test(pathname)) return localizedAuthPath(fallback, locale)
  return `${locale === 'en' ? '/en' : ''}${pathname === '/' && locale === 'en' ? '' : pathname}${url.search}${url.hash}`
}

export function authReturnPath(headers: HeaderReader, locale: string, fallback: string): string {
  const callback = resolveAuthCallbackUrl(headers)
  try {
    const referer = new URL(headers.get('referer') || '')
    if (referer.origin === new URL(callback).origin) {
      return localizedAuthPath(referer.searchParams.get('redirect'), locale, fallback)
    }
  } catch { /* No trusted app return route was supplied. */ }
  return localizedAuthPath(fallback, locale)
}

const PRODUCTION_HOSTS = new Set(['feelandnote.com', 'www.feelandnote.com'])
const LOCAL_HOSTS = new Set(['localhost:3000', '127.0.0.1:3000'])

export function resolveAuthCallbackUrl(headers: HeaderReader): string {
  const forwardedHost = headers.get('x-forwarded-host')?.split(',', 1)[0].trim()
  const host = (forwardedHost || headers.get('host') || '').toLowerCase()
  if (!PRODUCTION_HOSTS.has(host) && !LOCAL_HOSTS.has(host)) {
    throw new Error(`Unsupported auth callback host: ${host || '(missing)'}`)
  }
  const protocol = LOCAL_HOSTS.has(host) ? 'http' : 'https'
  return `${protocol}://${host}/auth/callback`
}
