export const SOURCE_URL_SEPARATOR = ' | '

function sourceParts(value: string | null | undefined): string[] {
  return [...new Set((value ?? '').split('|').map(part => part.trim()).filter(Boolean))]
}

function isHttpUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value) || /[\u0000-\u0020\u007f\\]/.test(value)) return false
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password
  } catch {
    return false
  }
}

export function parseSourceUrls(value: string | null | undefined): string[] {
  return sourceParts(value).filter(isHttpUrl)
}

export function formatSourceUrls(value: string | null | undefined): string | null {
  const sources = sourceParts(value)
  if (sources.some(source => !isHttpUrl(source))) {
    throw new Error('Sources must contain valid HTTP or HTTPS URLs.')
  }
  return sources.length ? sources.join(SOURCE_URL_SEPARATOR) : null
}
