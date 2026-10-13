import hubStyles from "@/components/shared/HubSection.module.css";
import { getTranslations } from 'next-intl/server'
import { Coins } from 'lucide-react'
import PageContainer from '@/components/layout/PageContainer'
import SupportShopNavigation from '@/components/features/commerce/SupportShopNavigation'
import SupportProductGrid from '@/components/features/commerce/SupportProductGrid'
import { getSupportProductLink, type SupportProduct } from '@/constants/supportProducts'
import { getCommerceProducts } from '@/lib/commerce-products'
import { withQueryFallback } from '@/lib/cache'
import { AFFILIATE_PLATFORMS } from '@/constants/affiliatePlatforms'
import AsyncIntlProvider from '@/components/shared/AsyncIntlProvider'

export default async function SupportShopPage({ locale, page }: { locale: 'ko' | 'en'; page: 'support' | 'shop' }) {
  const t = await getTranslations('support')
  const shop = page === 'shop'
  const productResult = await withQueryFallback<SupportProduct[] | null>('commerce_products', () => getCommerceProducts(locale, page), null)
  const products = productResult ?? []
  const sectionId = shop ? 'reading-tools' : 'essentials'
  const titleId = `${page}-title`
  const copyKey = (key: 'titleFirst' | 'titleSecond' | 'intro' | 'productsTitle' | 'thanks') => shop ? `shop.${key}` : key
  const hasAffiliate = products.some(product => getSupportProductLink(product, locale).affiliate)

  return (
    <AsyncIntlProvider>
      <PageContainer width="detail" className={`text-text-primary ${hubStyles.page}`}>
        <div className="mb-9 md:mb-12">
          <SupportShopNavigation active={page} />
        </div>

        <header className="mx-auto mb-6 max-w-3xl text-center md:mb-8">
          <h1 id={titleId} className="break-keep text-2xl font-bold leading-[1.3] tracking-tight md:text-[2rem]">
            <span className="block md:inline">{t(copyKey('titleFirst'))}</span>{' '}
            <span className="block md:inline">{t(copyKey('titleSecond'))}</span>
          </h1>
        </header>

        <div id={sectionId} className="scroll-mt-20">
          <SupportProductGrid products={products} locale={locale} collection={page} loadError={productResult === null} guide={(
            <div className="mx-auto max-w-xl text-center">
              <p className="mx-auto max-w-md whitespace-pre-line break-keep text-sm leading-7 text-text-secondary md:text-base">{t(copyKey('intro'))}</p>
              <div className="mx-auto mt-7 max-w-md md:mt-8">
                <div aria-hidden="true" className="mx-auto mb-4 h-px w-10 bg-line-strong" />
                <p className="flex items-center justify-center gap-2 text-sm font-medium leading-6 text-text-primary">
                  <Coins className="size-4 shrink-0 text-accent" strokeWidth={1.5} aria-hidden="true" />
                  <span className="break-keep">{t('purchaseBenefit')}</span>
                </p>
                {hasAffiliate && (
                  <p id="how-it-works" className="mt-2 scroll-mt-24 break-keep text-xs leading-6 text-text-secondary">
                    {locale === 'en' ? AFFILIATE_PLATFORMS.amazon.notice : t('affiliateNotice')}
                  </p>
                )}
              </div>
            </div>
          )} />

          <p className={`break-keep border-t border-line text-center text-sm leading-7 text-text-secondary ${hubStyles.closing} ${hubStyles.afterDivider}`}>{t(copyKey('thanks'))}</p>
        </div>
      </PageContainer>
    </AsyncIntlProvider>
  )
}
