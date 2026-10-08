import { getTranslations } from 'next-intl/server'
import { ArrowUpRight, BookOpen, Coffee, CookingPot, Droplets, LampDesk, NotebookPen, PenTool, ShowerHead, Sparkles, Tablet, Truck, Utensils, Wheat } from 'lucide-react'
import ContentImage from '@/components/ui/ContentImage'
import { getSupportProductLink, type SupportProduct, type SupportProductKind } from '@/constants/supportProducts'
import { AFFILIATE_PLATFORMS } from '@/constants/affiliatePlatforms'

function ProductIcon({ kind }: { kind: SupportProductKind }) {
  const icons = { rice: Wheat, laundry: Sparkles, water: Droplets, bath: ShowerHead, kitchen: Utensils, food: CookingPot, coffee: Coffee, stand: BookOpen, pen: PenTool, notebook: NotebookPen, reader: Tablet, light: LampDesk }
  if (kind !== 'paper') {
    const Icon = icons[kind]
    return <Icon className="size-8" strokeWidth={1.25} aria-hidden="true" />
  }
  return (
    <svg viewBox="0 0 48 48" fill="none" className="size-8" aria-hidden="true">
      <ellipse cx="22" cy="12" rx="13" ry="6" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="22" cy="12" rx="4" ry="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 12V34C9 37.3 14.8 40 22 40C29.2 40 35 37.3 35 34V12M35 17L41 21V40L35 36" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export default async function SupportProductGrid({ products, locale }: { products: SupportProduct[]; locale: 'ko' | 'en' }) {
  const t = await getTranslations('support')
  const hasAffiliate = products.some(product => getSupportProductLink(product, locale).affiliate)
  const checkedDates = [...new Set(products.flatMap(product => product.offer ? [product.offer.checkedAt] : []))]
  const dateLabel = checkedDates.map(date => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))).join(', ')
  return (
    <>
      <div data-product-grid className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {products.map(product => {
          const link = getSupportProductLink(product, locale)
          const offer = product.offer
          const price = offer && (locale === 'ko' && offer.currency === 'KRW'
            ? `${offer.price.toLocaleString('ko-KR')}원`
            : new Intl.NumberFormat(locale, { style: 'currency', currency: offer.currency, maximumFractionDigits: offer.currency === 'KRW' ? 0 : 2 }).format(offer.price))
          return (
            <div key={product.productUrl} className="flex min-w-0 flex-col">
              <a href={link.href} target="_blank" rel={`noopener noreferrer${link.affiliate ? ' sponsored' : ''}`} aria-label={t('productLinkLabel', { name: product.name })} className="group flex min-w-0 flex-1 flex-col rounded-card border border-line bg-bg-card p-2.5 hover:border-line-strong hover:bg-bg-raised active:bg-bg-stone-light lg:p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg-main">
                <div className={`relative mb-2 flex items-center justify-center overflow-hidden rounded-control lg:mb-3 ${product.imageUrl ? 'aspect-square bg-white' : 'h-12 bg-bg-raised text-text-secondary group-hover:text-text-primary lg:h-16'}`}>
                  {product.imageUrl ? (
                    <ContentImage src={product.imageUrl} alt={product.name} sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 240px" className="object-contain p-2" dissolve={false} />
                  ) : <ProductIcon kind={product.kind} />}
                </div>
                <p className="mb-2 hidden text-center text-[11px] text-text-tertiary lg:block">{t(`categories.${product.kind}`)}</p>
                <h3 className="break-keep text-center text-[13px] font-semibold leading-snug lg:text-base">{product.name}</h3>
                <p className="mt-1 flex-1 break-keep text-center text-xs leading-relaxed text-text-secondary lg:mt-2 lg:text-sm">{product.size}</p>
                {offer && (
                  <div className="mt-2 text-center lg:mt-3">
                    <p className="text-base font-semibold tabular-nums sm:text-lg lg:text-xl">{price}</p>
                    {offer.priceCondition === 'coupon' && <p className="mt-0.5 text-[11px] text-text-secondary lg:text-xs">{t('couponPrice')}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 lg:mt-2">
                      <span className={`inline-flex items-center gap-1 rounded-control px-1.5 py-1 text-[11px] font-medium ${offer.delivery === 'standard' ? 'bg-bg-raised text-text-secondary' : 'bg-blue-500/10 text-blue-400'}`}>
                        <Truck className="size-3" aria-hidden="true" />{t(`shipping.${offer.delivery}`)}
                      </span>
                      <span className="text-[11px] tabular-nums text-text-secondary lg:text-xs">{t('reviewCount', { count: offer.reviewCount.toLocaleString(locale) })}</span>
                    </div>
                    {offer.monthlyPurchaseCount !== undefined && (
                      <p className="mt-1 break-keep text-[11px] leading-4 tabular-nums text-text-tertiary">
                        {t('monthlyPurchaseCount', { count: offer.monthlyPurchaseCount.toLocaleString(locale) })}
                      </p>
                    )}
                  </div>
                )}
                <span className={`mt-2 flex min-h-11 items-center justify-center gap-1.5 rounded-control px-2 py-2 text-xs font-medium lg:mt-3 lg:text-sm ${locale === 'ko' ? 'bg-store-coupang/80 text-white group-hover:bg-store-coupang group-focus-visible:bg-store-coupang' : 'bg-bg-stone-light group-hover:bg-text-primary group-hover:text-bg-main'}`}>
                  {t('viewProduct')}<ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
                </span>
              </a>
            </div>
          )
        })}
      </div>
      <p className="mt-5 break-keep text-sm leading-relaxed text-text-secondary">{checkedDates.length > 0 ? t('priceNote', { date: dateLabel }) : t('purchaseNote')}</p>
      {hasAffiliate && <p className="mt-3 text-sm leading-relaxed text-text-secondary">{locale === 'en' ? AFFILIATE_PLATFORMS.amazon.notice : t('affiliateNotice')}</p>}
    </>
  )
}
