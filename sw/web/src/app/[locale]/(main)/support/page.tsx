import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import SupportShopPage from '@/components/features/commerce/SupportShopPage'
import { getLocalizedAlternates } from '@/lib/seo'
import { isSupportShopAvailable } from '@/constants/navigation'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isSupportShopAvailable(locale)) notFound()
  const t = await getTranslations({ locale, namespace: 'support' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: await getLocalizedAlternates('/support'),
  }
}

export default async function SupportPage({ params }: Props) {
  const { locale } = await params
  if (!isSupportShopAvailable(locale)) notFound()
  setRequestLocale(locale)
  return <SupportShopPage locale="ko" page="support" />
}
