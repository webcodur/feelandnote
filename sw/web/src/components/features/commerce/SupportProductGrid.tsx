import hubStyles from "@/components/shared/HubSection.module.css";
import { getTranslations } from 'next-intl/server'
import { ArrowUpRight, BookOpen, Bookmark, Coffee, CookingPot, CupSoda, Droplets, LampDesk, NotebookPen, PenTool, Printer, Radio, ShowerHead, Sparkles, Speaker, Star, Tablet, Timer, ToyBrick, Truck, Utensils, Wheat } from 'lucide-react'
import CommerceProductCard from './CommerceProductCard'
import HubSection from '@/components/shared/HubSection'
import { getCommerceProductGroups, getSupportProductLink, type SupportProduct, type SupportProductKind } from '@/constants/supportProducts'

function ProductIcon({ kind }: { kind: SupportProductKind }) {
  const icons = { rice: Wheat, laundry: Sparkles, water: Droplets, bath: ShowerHead, kitchen: Utensils, food: CookingPot, drink: CupSoda, coffee: Coffee, stand: BookOpen, desk: LampDesk, pen: PenTool, notebook: NotebookPen, reader: Tablet, light: LampDesk, remote: Radio, bookHolder: BookOpen, bookmark: Bookmark, timer: Timer, speaker: Speaker, labelPrinter: Printer, object: ToyBrick }
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

export default async function SupportProductGrid({ products, locale, collection }: { products: SupportProduct[]; locale: 'ko' | 'en'; collection: 'shop' | 'support' }) {
  const t = await getTranslations('support')
  const checkedDates = [...new Set(products.flatMap(product => product.offer ? [product.offer.checkedAt] : []))]
  const dateLabel = checkedDates.map(date => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))).join(', ')
  const groups = getCommerceProductGroups(products, collection)
  const renderCard = (product: SupportProduct) => {
    const link = getSupportProductLink(product, locale)
    const offer = product.offer
    const price = offer && (locale === 'ko' && offer.currency === 'KRW'
      ? `${offer.price.toLocaleString('ko-KR')}원`
      : new Intl.NumberFormat(locale, { style: 'currency', currency: offer.currency, maximumFractionDigits: offer.currency === 'KRW' ? 0 : 2 }).format(offer.price))
    return (
      <CommerceProductCard key={product.productUrl} href={link.href} affiliate={link.affiliate} linkLabel={t('productLinkLabel', { name: product.name })} zoomLabel={t('zoomImageLabel', { name: product.name })} imageUrl={product.imageUrl} name={product.name} collection={collection} fallback={<ProductIcon kind={product.kind} />}>
          <p className="mb-2 hidden text-center text-[11px] text-text-tertiary lg:block">{t(`categories.${product.kind}`)}</p>
          <h3 className="break-keep text-center text-[13px] font-semibold leading-snug lg:text-base">{product.name}</h3>
          <p className={`mt-1 break-keep text-center text-xs leading-relaxed text-text-secondary lg:mt-2 lg:text-sm ${offer ? '' : 'flex-1'}`}>{product.size}</p>
          {product.description && <p className="mt-2 break-keep text-center text-[11px] leading-relaxed text-text-secondary lg:text-xs">{product.description}</p>}
          {offer && (
            <div className="mt-auto pt-3 text-center lg:pt-4">
              <p className="text-base font-semibold tabular-nums sm:text-lg lg:text-xl">{price}</p>
              {offer.priceCondition === 'coupon' && <p className="mt-0.5 text-[11px] text-text-secondary lg:text-xs">{t('couponPrice')}</p>}
              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 lg:mt-2">
                <span className={`inline-flex items-center gap-1 rounded-control px-1.5 py-1 text-[11px] font-medium ${offer.delivery === 'standard' ? 'bg-bg-raised text-text-secondary' : offer.delivery === 'rocketFresh' ? 'bg-store-kyobo/20 text-text-primary' : 'bg-blue-500/10 text-blue-400'}`}>
                  <Truck className="size-3" aria-hidden="true" />{t(`shipping.${offer.delivery}`)}
                </span>
                {offer.rating !== undefined && <span aria-label={t('ratingLabel', { rating: offer.rating.toFixed(1) })} className="inline-flex items-center gap-1 text-[11px] tabular-nums text-text-primary lg:text-xs"><Star className="size-3 fill-accent text-accent" aria-hidden="true" />{offer.rating.toFixed(1)}</span>}
                <span className="text-[11px] tabular-nums text-text-secondary lg:text-xs">{t('reviewCount', { count: offer.reviewCount.toLocaleString(locale) })}</span>
              </div>
              {offer.monthlyPurchaseCount !== undefined && (
                <p className="mt-1 break-keep text-[11px] leading-4 tabular-nums text-text-tertiary">
                  {t('monthlyPurchaseCount', { count: offer.monthlyPurchaseCount.toLocaleString(locale) })}
                </p>
              )}
            </div>
          )}
          <span data-store-cta className={`mt-3 flex min-h-11 items-center rounded-control px-2.5 py-2 text-xs font-medium lg:mt-4 lg:px-3 lg:text-sm ${locale === 'ko' ? 'justify-between gap-2 border border-white/10 bg-linear-to-r from-store-coupang-to to-store-coupang text-white shadow-sm group-hover:border-white/30 group-hover:from-store-coupang group-focus-within:border-white/30 group-focus-within:from-store-coupang group-active:brightness-90' : 'justify-center gap-1.5 bg-bg-stone-light group-hover:bg-text-primary group-hover:text-bg-main'}`}>
            {locale === 'ko' && <span className="shrink-0 text-[13px] font-bold tracking-tight lg:text-sm">{t('storeName')}</span>}
            <span className={`inline-flex items-center gap-1 whitespace-nowrap ${locale === 'ko' ? 'border-l border-white/25 pl-2 lg:pl-3' : ''}`}>
              {t('viewProduct')}<ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
            </span>
          </span>
      </CommerceProductCard>
    )
  }
  const renderProducts = (items: SupportProduct[]) => {
    const units: SupportProduct[][] = []
    for (const product of items) {
      const pair = product.pair && units.find(unit => unit.length === 1 && unit[0].pair === product.pair)
      if (pair) pair.push(product)
      else units.push([product])
    }
    return (
      <div data-product-grid className={`mx-auto grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-5 lg:gap-x-5 lg:gap-y-6 ${items.length === 3 ? 'lg:w-3/4 lg:grid-cols-3' : items.length === 2 ? 'lg:w-1/2 lg:grid-cols-2' : 'lg:grid-cols-4'}`}>
        {units.map(unit => unit.length === 2 ? (
          <div key={unit[0].productUrl} data-product-pair={unit[0].pair} className="col-span-2 grid grid-cols-2 gap-x-3 sm:gap-x-4 lg:gap-x-5">
            {unit.map(renderCard)}
          </div>
        ) : renderCard(unit[0]))}
      </div>
    )
  }
  return (
    <>
      <div>
        {groups.map((group, index) => (
          <HubSection key={group.id} id={`${collection}-${group.id}`} title={t(`${collection === 'shop' ? 'shop.groups' : 'groups'}.${group.id}`)} index={index} total={groups.length} compact hideDivider={index === 0}>
            {renderProducts(group.products)}
          </HubSection>
        ))}
      </div>
      <p className={`mx-auto max-w-2xl break-keep text-center text-sm leading-7 text-text-secondary ${hubStyles.closing}`}>{checkedDates.length > 0 ? t('priceNote', { date: dateLabel }) : t('purchaseNote')}</p>
    </>
  )
}
