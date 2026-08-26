type HeaderReader = {
  get(name: string): string | null
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
