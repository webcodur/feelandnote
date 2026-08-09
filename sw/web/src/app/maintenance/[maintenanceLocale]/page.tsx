import { notFound, redirect } from 'next/navigation'
import { canUseMaintenancePreview, MAINTENANCE_PREVIEW_PARAM } from '@/lib/maintenance'
import styles from './MaintenancePage.module.css'

export const dynamic = 'force-dynamic'

type MaintenanceLocale = 'ko' | 'en'

const copy = {
  ko: {
    eyebrow: 'SERVICE NOTICE',
    title: '서버 점검 중입니다.',
    description: '더 안정적인 서비스를 위해 서버를 정비하고 있습니다.',
    timeLabel: '서비스 재개 예정',
    timezone: '한국 시각',
    previewLabel: '로컬 미리보기 · 공개 사이트에는 나타나지 않습니다',
    previewExit: '미리보기 종료',
  },
  en: {
    eyebrow: 'SERVICE NOTICE',
    title: 'We are improving our servers.',
    description: 'We are tuning our servers for a more stable Feel&Note.',
    timeLabel: 'Expected service resumption',
    timezone: 'Korea Standard Time',
    previewLabel: 'Local preview · This is not visible on the public site',
    previewExit: 'Exit preview',
  },
} satisfies Record<MaintenanceLocale, Record<string, string>>

function formatEndsAt(endsAt: Date, locale: MaintenanceLocale) {
  return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(endsAt)
}

function parseEndsAt(value?: string) {
  if (!value) return null

  const endsAt = new Date(value)
  return Number.isNaN(endsAt.getTime()) ? null : endsAt
}

export default async function MaintenancePage({
  params,
  searchParams,
}: {
  params: Promise<{ maintenanceLocale: string }>
  searchParams: Promise<{ preview?: string; endsAt?: string }>
}) {
  const [{ maintenanceLocale }, { preview, endsAt }] = await Promise.all([params, searchParams])
  if (maintenanceLocale !== 'ko' && maintenanceLocale !== 'en') notFound()

  const locale: MaintenanceLocale = maintenanceLocale
  const isLocalPreview = canUseMaintenancePreview() && preview === '1'
  if (!isLocalPreview) redirect(locale === 'en' ? '/en' : '/')

  const text = copy[locale]
  const maintenanceEndsAt = parseEndsAt(endsAt)
  const exitHref = `${locale === 'en' ? '/en' : '/'}?${MAINTENANCE_PREVIEW_PARAM}=0`

  return (
    <main className={styles.page}>
      <div className={styles.frame} aria-hidden="true" />
      <header className={styles.header}>
        <span className={styles.wordmark}>
          <span>FEEL</span><b>&amp;</b><span>NOTE</span>
        </span>
        <span className={styles.status}>
          <i aria-hidden="true" />
          {text.eyebrow}
        </span>
        <aside className={styles.previewTools} aria-label={text.previewLabel}>
          <span>{text.previewLabel}</span>
          <a href={exitHref}>{text.previewExit}</a>
        </aside>
      </header>

      <section className={styles.notice} aria-labelledby="maintenance-title">
        <div className={styles.symbol} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <p className={styles.kicker}>{text.eyebrow}</p>
        <h1 id="maintenance-title">{text.title}</h1>
        <p className={styles.description}>{text.description}</p>

        {maintenanceEndsAt ? (
          <div className={styles.schedule} role="status" aria-live="polite">
            <span>{text.timeLabel}</span>
            <time dateTime={maintenanceEndsAt.toISOString()}>
              {formatEndsAt(maintenanceEndsAt, locale)}
              <small>{text.timezone}</small>
            </time>
          </div>
        ) : null}
      </section>

      <footer className={styles.footer}>
        <span>FEELANDNOTE.COM</span>
        <span aria-hidden="true">FN / 503</span>
      </footer>
    </main>
  )
}
