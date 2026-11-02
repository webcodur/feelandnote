import FormattedText from '@/components/ui/FormattedText'
import { isDeveloperMode } from '@/lib/developer-mode'
import ContentSourceLabel from './ContentSourceLabel'
import { normalizeContentIntroText } from './contentIntroText'

export type ContentReadingKind = 'intro' | 'review'

/** 화면의 배치·높이와 무관한 소개·감상 본문. 출처 이동은 라벨 한 곳에서만 제공한다. */
export default function ContentReadingBody({ kind, label, text, sourceUrl, textLayout }: {
  kind: ContentReadingKind
  label: string
  text: string
  sourceUrl?: string | null
  textLayout?: 'inline' | 'prose'
}) {
  return <span data-content-reading-body={kind} className={`font-normal [word-break:normal] [overflow-wrap:anywhere] ${kind === 'intro' ? 'text-book-intro' : 'text-review'}`}>
    <span data-content-reading-label={kind} className="font-medium text-text-secondary">
      <ContentSourceLabel href={sourceUrl}>{label}</ContentSourceLabel>{': '}
    </span>
    <FormattedText text={kind === 'intro' ? normalizeContentIntroText(text) : text}
      layout={textLayout ?? (isDeveloperMode() ? 'prose' : 'inline')} />
  </span>
}
