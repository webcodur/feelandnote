import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import SupportShopPage from '@/components/features/commerce/SupportShopPage'
import { getLocalizedAlternates } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'support.shop' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: await getLocalizedAlternates('/shop'),
  }
}

export default async function ShopPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <SupportShopPage locale={locale === 'en' ? 'en' : 'ko'} page="shop" />
}
