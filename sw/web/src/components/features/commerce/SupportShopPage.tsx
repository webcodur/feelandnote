import hubStyles from "@/components/shared/HubSection.module.css";
import { getTranslations } from 'next-intl/server'
import PageContainer from '@/components/layout/PageContainer'
import SupportShopNavigation from '@/components/features/commerce/SupportShopNavigation'
import SupportProductGrid from '@/components/features/commerce/SupportProductGrid'
import { getCommerceProductGroups, getSupportProductLink, type SupportProduct } from '@/constants/supportProducts'
import { getCommerceProducts } from '@/lib/commerce-products'
import { withQueryFallback } from '@/lib/cache'
import { AFFILIATE_PLATFORMS } from '@/constants/affiliatePlatforms'
import AtlasNavSections from '@/components/shared/atlasNav/AtlasNavSections'
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
  const hasFreshProducts = products.some(product => product.offer?.delivery === 'rocketFresh')
  const sections = getCommerceProductGroups(products, page).map(group => ({ id: `${page}-${group.id}`, title: t(`${shop ? 'shop.groups' : 'groups'}.${group.id}`) }))

  return (
    <AsyncIntlProvider>
      <PageContainer width="detail" className={`text-text-primary ${hubStyles.page}`}>
        <AtlasNavSections items={sections.map((section, index) => ({ key: section.id, sectionId: section.id, chapter: String(index + 1).padStart(2, '0'), label: section.title }))} />
        <div className="mb-9 md:mb-12">
          <SupportShopNavigation active={page} />
        </div>

        <section aria-labelledby={titleId} className="mx-auto max-w-3xl text-center">
          <h1 id={titleId} className="break-keep text-2xl font-bold leading-[1.3] tracking-tight md:text-[2rem]">
            <span className="block md:inline">{t(copyKey('titleFirst'))}</span>{' '}
            <span className="block md:inline">{t(copyKey('titleSecond'))}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md whitespace-pre-line break-keep text-sm leading-7 text-text-secondary md:mt-6 md:text-base">{t(copyKey('intro'))}</p>
          <div className="mx-auto mt-7 max-w-2xl space-y-3 md:mt-8">
            <p className="flex flex-wrap justify-center gap-x-2 text-xs leading-relaxed text-text-secondary">
              <span>{t('samePrice')}</span><span aria-hidden="true">·</span><span>{t('noDonation')}</span>
            </p>
            {hasAffiliate && (
              <p id="how-it-works" className="scroll-mt-24 break-keep text-[11px] leading-5 text-text-secondary md:text-xs md:leading-6">
                {locale === 'en' ? AFFILIATE_PLATFORMS.amazon.notice : t('affiliateNotice')}
              </p>
            )}
            {hasFreshProducts && <p className="mx-auto max-w-xl break-keep text-xs leading-5 text-text-secondary md:leading-6">{t('freshNote')}</p>}
          </div>
        </section>

        <div id={sectionId} className="scroll-mt-20">
          <section aria-label={t(copyKey('productsTitle'))}>
            {productResult === null ? (
              <p role="alert" className="py-12 text-center text-sm text-text-secondary">{t('productsLoadError')}</p>
            ) : <SupportProductGrid products={products} locale={locale} collection={page} />}
            {shop && <p className="mx-auto mt-3 max-w-2xl break-keep text-center text-sm leading-7 text-text-secondary">{t('shop.readerNote')}</p>}
          </section>

          <p className={`break-keep border-t border-line text-center text-sm leading-7 text-text-secondary ${hubStyles.closing} ${hubStyles.afterDivider}`}>{t(copyKey('thanks'))}</p>
        </div>
      </PageContainer>
    </AsyncIntlProvider>
  )
}
