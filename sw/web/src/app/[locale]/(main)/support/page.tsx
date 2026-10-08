import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import SupportShopPage from '@/components/features/commerce/SupportShopPage'
import { getLocalizedAlternates } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'support' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: await getLocalizedAlternates('/support'),
  }
}

export default async function SupportPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <SupportShopPage locale={locale === 'en' ? 'en' : 'ko'} page="support" />
}
