import { getLocale } from 'next-intl/server'
import { permanentRedirect } from 'next/navigation'
import { getPathname } from '@/i18n/navigation'

export default async function AboutPage() {
  permanentRedirect(getPathname({ href: '/', locale: await getLocale() }))
}
