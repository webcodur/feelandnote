const ALLOWED_IMAGE_HOSTS = new Set([
  'archive.org',
  't1.daumcdn.net',
  'image.tmdb.org',
  'covers.openlibrary.org',
  'i.gr-assets.com',
  'images.igdb.com',
  'books.google.com',
  'image.aladin.co.kr',
  'image.yes24.com',
  'upload.wikimedia.org',
  'contents.kyobobook.co.kr',
])

const ALLOWED_IMAGE_HOST_SUFFIXES = [
  '.archive.org',
  '.r2.dev',
  '.supabase.co',
  '.mzstatic.com',
  '.imgix.net',
  '.bigcommerce.com',
]

export function isAllowedSeoImageUrl(url: URL): boolean {
  if (url.protocol !== 'https:') return false

  const hostname = url.hostname.toLowerCase()
  return ALLOWED_IMAGE_HOSTS.has(hostname)
    || ALLOWED_IMAGE_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
}
