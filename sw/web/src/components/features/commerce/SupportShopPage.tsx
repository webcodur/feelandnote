import { getTranslations } from 'next-intl/server'
import { ArrowDown, ArrowLeft, ArrowUpRight, Check, ShoppingBag, Wheat } from 'lucide-react'
import PageContainer from '@/components/layout/PageContainer'
import SupportShopNavigation from '@/components/features/commerce/SupportShopNavigation'
import SupportProductGrid from '@/components/features/commerce/SupportProductGrid'
import { Link } from '@/i18n/navigation'
import { SHOP_PRODUCTS, SUPPORT_PRODUCTS } from '@/constants/supportProducts'

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg-main'

function CommerceIllustration({ shop }: { shop: boolean }) {
  if (shop) return (
    <svg viewBox="0 0 320 320" fill="none" aria-hidden="true" className="h-full w-full">
      <circle cx="160" cy="160" r="140" fill="var(--color-bg-card)" />
      <circle cx="160" cy="160" r="119" stroke="var(--color-line-strong)" strokeDasharray="2 9" />
      <ellipse cx="160" cy="267" rx="91" ry="10" fill="var(--color-bg-secondary)" />
      <g transform="rotate(7 191 149)">
        <rect x="143" y="67" width="100" height="152" rx="11" fill="var(--color-text-primary)" />
        <rect x="151" y="77" width="84" height="127" rx="3" fill="var(--color-bg-main)" />
        <path d="M166 99H220M166 109H213M166 137H220M166 147H220M166 157H208M166 172H220M166 182H212" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" />
        <path d="M168 122H194" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="193" cy="211" r="2" fill="var(--color-bg-main)" />
      </g>
      <g transform="rotate(-7 120 214)">
        <path d="M66 176Q94 166 127 181Q157 166 184 176V246Q154 237 127 250Q96 237 66 246Z" fill="var(--color-text-primary)" />
        <path d="M66 181V249Q96 242 127 255Q155 242 184 249V181M127 183V250" stroke="var(--color-text-secondary)" strokeWidth="2" />
        <path d="M79 190Q96 188 114 195M79 204Q96 202 114 209M79 218Q96 216 114 223M140 195Q156 188 171 190M140 209Q156 202 171 204M140 223Q156 216 171 218" stroke="var(--color-bg-main)" strokeOpacity=".3" strokeWidth="2" strokeLinecap="round" />
        <path d="M149 174V204L155 199L161 204V173" fill="var(--color-accent)" />
      </g>
      <g transform="rotate(20 239 228)">
        <rect x="235" y="188" width="8" height="65" rx="3" fill="var(--color-text-secondary)" />
        <path d="M235 204H243" stroke="var(--color-accent)" strokeWidth="3" />
        <path d="M235 250L239 260L243 250" fill="var(--color-text-primary)" />
      </g>
      <path d="M85 78V94M77 86H93M266 151V163M260 157H272" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
  return (
    <svg viewBox="0 0 320 320" fill="none" aria-hidden="true" className="h-full w-full">
      <circle cx="160" cy="160" r="140" fill="var(--color-bg-card)" />
      <circle cx="160" cy="160" r="119" stroke="var(--color-line-strong)" strokeDasharray="2 9" />
      <ellipse cx="158" cy="267" rx="88" ry="10" fill="var(--color-bg-secondary)" />
      <g transform="rotate(-7 157 164)">
        <path d="M103 69H211L204 95L220 246Q158 268 92 246L108 95Z" fill="var(--color-text-primary)" />
        <path d="M103 69H211L204 95H108Z" fill="var(--color-text-secondary)" />
        <path d="M111 77H202M108 87H205" stroke="var(--color-bg-main)" strokeOpacity=".25" strokeWidth="2" />
        <path d="M111 114H202V228H111Z" fill="var(--color-bg-main)" />
        <path d="M123 126H190V216H123Z" stroke="var(--color-line-strong)" />
        <path d="M156 192V147M156 165C142 162 141 150 141 146C154 149 156 157 156 165ZM156 178C169 175 172 163 172 159C158 163 157 172 156 178ZM156 153C169 149 172 138 172 134C158 138 156 146 156 153Z" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M140 202H174" stroke="var(--color-text-primary)" strokeWidth="2" />
        <path d="M102 237Q159 251 210 237" stroke="var(--color-bg-main)" strokeOpacity=".15" strokeWidth="2" />
      </g>
      <g stroke="var(--color-text-secondary)" strokeWidth="2">
        <ellipse cx="227" cy="268" rx="4" ry="9" transform="rotate(52 227 268)" />
        <ellipse cx="245" cy="261" rx="4" ry="9" transform="rotate(75 245 261)" />
        <ellipse cx="234" cy="249" rx="4" ry="9" transform="rotate(23 234 249)" />
      </g>
      <path d="M240 79V95M232 87H248M73 189V201M67 195H79" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default async function SupportShopPage({ locale, page }: { locale: 'ko' | 'en'; page: 'support' | 'shop' }) {
  const t = await getTranslations('support')
  const shop = page === 'shop'
  const products = (shop ? SHOP_PRODUCTS : SUPPORT_PRODUCTS)[locale]
  const sectionId = shop ? 'reading-tools' : 'essentials'
  const titleId = `${page}-title`
  const HeroIcon = shop ? ShoppingBag : Wheat
  const copyKey = (key: 'intro' | 'browse' | 'productsTitle' | 'productsIntro' | 'thanks') => shop ? `shop.${key}` : key

  return (
    <PageContainer width="detail" className="text-text-primary">
      <Link href="/" className={`inline-flex min-h-11 items-center gap-2 rounded-control text-sm text-text-secondary hover:text-accent ${focus}`}>
        <ArrowLeft className="size-4" aria-hidden="true" />{t('back')}
      </Link>

      <SupportShopNavigation active={page} />

      <section aria-labelledby={titleId} className="grid items-center gap-3 pb-6 pt-2 sm:grid-cols-[1.5fr_1fr] sm:gap-5 lg:gap-8 lg:pb-16 lg:pt-10">
        <div className="text-center">
          <p className="mb-3 flex items-center justify-center gap-2 text-xs font-medium tracking-[0.16em] text-text-secondary lg:mb-5 lg:text-sm">
            <HeroIcon className="size-4" aria-hidden="true" /> {shop ? 'SHOP' : 'SUPPORT US'}
          </p>
          <h1 id={titleId} className="break-keep text-[clamp(1.625rem,4.4vw,3rem)] font-bold leading-[1.25] tracking-tight">
            {shop ? <span className="block">{t('shop.title')}</span> : (
              <>
                <span className="block">{t('titleFirst')}</span>
                <span className="mt-1 block lg:mt-2">{t('titleSecond')}</span>
              </>
            )}
          </h1>
          <p className="mx-auto mt-3 max-w-md whitespace-pre-line break-keep text-sm leading-relaxed text-text-secondary lg:mt-6 lg:text-lg">{t(copyKey('intro'))}</p>
          <a href={`#${sectionId}`} className={`mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-accent px-4 py-2 text-sm font-medium text-bg-main hover:bg-accent-hover active:bg-accent-dim lg:mt-7 lg:min-h-12 lg:gap-3 lg:px-6 lg:py-3 lg:text-base ${focus}`}>
            {t(copyKey('browse'))}<ArrowDown className="size-4" aria-hidden="true" />
          </a>
        </div>
        <div className="mx-auto w-24 sm:w-full sm:max-w-48 lg:max-w-80"><CommerceIllustration shop={shop} /></div>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-y border-line py-3 text-xs text-text-secondary lg:gap-x-8 lg:gap-y-3 lg:py-5 lg:text-sm">
        {['samePrice', 'noDonation', shop ? 'shop.usualShopping' : 'usualShopping'].map(key => (
          <p key={key} className="flex items-center gap-1.5"><Check className="size-3.5 shrink-0 text-text-primary lg:size-4" aria-hidden="true" />{t(key)}</p>
        ))}
      </div>

      <section id={sectionId} aria-labelledby={`${sectionId}-title`} className="scroll-mt-24 pt-7 lg:pt-16">
        <header className="mb-4 text-center lg:mb-8">
          <p className="mb-2 text-xs text-text-secondary lg:mb-3 lg:text-sm">{t('store')}</p>
          <h2 id={`${sectionId}-title`} className="text-xl font-semibold lg:text-3xl">{t(copyKey('productsTitle'))}</h2>
          <p className="mt-2 break-keep text-sm text-text-secondary lg:mt-3 lg:text-base">{t(copyKey('productsIntro'), { count: products.length })}</p>
        </header>
        <SupportProductGrid products={products} locale={locale} />
        {shop && <p className="mt-3 text-sm leading-relaxed text-text-secondary">{t('shop.readerNote')}</p>}
      </section>

      <section aria-labelledby="how-title" className="pb-4 pt-8 lg:pt-20">
        <header className="text-center">
          <h2 id="how-title" className="text-xl font-semibold lg:text-2xl">{t('howTitle')}</h2>
          <p className="mx-auto mt-3 max-w-2xl break-keep text-sm leading-relaxed text-text-secondary lg:mt-4 lg:text-base">{t('howBody')}</p>
        </header>
        <ol className="mt-4 grid gap-2 sm:grid-cols-3 lg:mt-8 lg:gap-4">
          {[ShoppingBag, ArrowUpRight, Wheat].map((Icon, index) => (
            <li key={index} className="flex items-start gap-3 rounded-card border border-line bg-bg-card p-3 text-left sm:block sm:p-4 sm:text-center lg:px-6 lg:py-7">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-control bg-bg-secondary text-accent sm:mx-auto sm:mb-3 lg:mb-4 lg:size-11">
                <Icon className="size-4 lg:size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="break-keep text-sm font-semibold lg:text-base">{t(`steps.${index}.title`)}</h3>
                <p className="mt-1 break-keep text-xs leading-relaxed text-text-secondary lg:mt-2 lg:text-sm">{t(`steps.${index}.body`)}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 break-keep text-center text-sm leading-relaxed text-text-secondary lg:mt-8 lg:text-base">{t(copyKey('thanks'))}</p>
      </section>
    </PageContainer>
  )
}
