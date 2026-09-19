import { forLocale } from '@feelandnote/content-search/book-introduction'
import type { IntroductionRow } from './book-description-sources-contract'

export interface ReviewedMediaIntroduction {
  content: { id: string; type: 'VIDEO' | 'GAME' | 'MUSIC'; external_id: string; external_source: string | null }
  target: IntroductionRow
  description: string
  /** null is allowed only for translations whose sibling source row records no description URL. */
  sourceUrl: string | null
  sourceLocale: 'ko' | 'en'
  method: 'provider' | 'translation'
  sourceText?: string
  identityEvidence: Array<{ url: string; note: string }>
}

const PROVIDERS = {
  VIDEO: new Set(['www.themoviedb.org']),
  GAME: new Set(['www.igdb.com', 'store.steampowered.com']),
  MUSIC: new Set(['en.wikipedia.org', 'ko.wikipedia.org', 'www.last.fm']),
}

/** Source languages are also reviewed against the provider response; this rejects obvious wrong-language payloads. */
export function mediaIntroductionText(value: string, locale: 'ko' | 'en'): string | null {
  if (forLocale(value, locale)) return value.trim()
  const letters = value.match(/\p{L}/gu)?.length ?? 0
  if (locale === 'ko') {
    const hangul = value.match(/[가-힣]/g)?.length ?? 0
    // Album, artist and label names may remain Latin; the surrounding prose must still be Korean.
    return hangul >= 15 && hangul / letters >= 0.25 && /[가-힣](?:다|요)[.!?…][\s"'”’)]*$/.test(value.trim()) ? value.trim() : null
  }
  if (locale !== 'en') return null
  const latin = value.match(/\p{Script=Latin}/gu)?.length ?? 0
  const words = new Set(value.toLowerCase().match(/\b(?:a|an|the|and|of|to|in|is|are|was|were|with|for|from|this|that|his|her|its|you|your|he|she|it|they|their|have|has|where|as|on|by|but)\b/g) ?? [])
  return letters && latin / letters >= 0.9 && words.size >= 2 ? value.trim() : null
}

export function prepareMediaIntroduction(input: ReviewedMediaIntroduction) {
  const { content, target } = input
  if (!PROVIDERS[content.type] || content.id !== target.content_id
    || !content.external_id || content.external_source === undefined) throw new Error('Media identity mismatch')
  // Legacy rows carry a provider-prefixed external_id with external_source null; the prefix still proves the provider.
  if (content.external_source === null
    && !(content.type === 'VIDEO' && content.external_id.startsWith('tmdb-'))) throw new Error('Media identity mismatch')
  if (!['ko', 'en'].includes(target.locale) || !['provider', 'translation'].includes(input.method)
    || (input.method === 'provider' && input.sourceLocale !== target.locale)
    || (input.method === 'translation' && (input.sourceLocale === target.locale || !input.sourceText
      || !mediaIntroductionText(input.sourceText, input.sourceLocale)))) throw new Error('Provider locale mismatch')
  if (target.description?.trim()) throw new Error('Introduction is already filled')
  if (target.sources !== null && (typeof target.sources !== 'object' || Array.isArray(target.sources))) throw new Error('Invalid sources')
  const description = mediaIntroductionText(input.description, target.locale)
  if (!description || /<\/?[a-z][^>]*>/i.test(description)) throw new Error('Invalid introduction text')
  if (input.sourceUrl === null) {
    // No recorded provider provenance; the shared content_id is the identity evidence.
    if (input.method !== 'translation') throw new Error('Unapproved source URL')
  } else {
    const source = new URL(input.sourceUrl)
    const steamLanguage = source.hostname === 'store.steampowered.com' && /^\?l=(koreana|english)$/.test(source.search)
    if (source.protocol !== 'https:' || source.username || source.password || source.port
      || (source.search && !steamLanguage) || source.hash || !PROVIDERS[content.type].has(source.hostname)) throw new Error('Unapproved source URL')
    if (content.type === 'VIDEO') {
      const id = /^tmdb-(movie|tv)-(\d+)$/.exec(content.external_id)
      if ((content.external_source !== 'tmdb' && content.external_source !== null) || !id || source.pathname !== `/${id[1]}/${id[2]}`) throw new Error('TMDB identity mismatch')
    }
    if (content.type === 'GAME' && (content.external_source !== 'igdb' || !/^igdb-\d+$/.test(content.external_id))) throw new Error('IGDB identity mismatch')
    if (!input.identityEvidence?.length || input.identityEvidence.some(e => !e.note?.trim() || !/^https:\/\//.test(e.url))) throw new Error('Missing identity evidence')
  }
  const sources: Record<string, unknown> = { ...target.sources, description_method: input.method, description_source_locale: input.sourceLocale }
  if (input.sourceUrl) sources.description = input.sourceUrl
  delete sources.introMissing
  return { description, sources }
}

const literal = (value: string) => `'${value.replace(/'/g, "''")}'`
const json = (value: unknown) => `${literal(JSON.stringify(value))}::jsonb`

/** A reviewed provider result may fill only the unchanged, empty locale of the exact external work. */
function mediaIntroductionStatement(input: ReviewedMediaIntroduction): string {
  const { description, sources } = prepareMediaIntroduction(input)
  const { content, target } = input
  const snapshot = { description: target.description, sources: target.sources, isbn: target.isbn,
    title: target.title, creator: target.creator, publisher: target.publisher }
  const body = `DECLARE changed integer;
BEGIN
IF NOT EXISTS (SELECT 1 FROM public.contents WHERE id = ${literal(content.id)}
  AND type = ${literal(content.type)} AND external_id = ${literal(content.external_id)}
  AND external_source IS NOT DISTINCT FROM ${content.external_source === null ? 'NULL' : literal(content.external_source)} FOR SHARE) THEN
  RAISE EXCEPTION 'Media identity changed concurrently';
END IF;
UPDATE public.content_locales SET description = ${literal(description)}, sources = ${json(sources)}, updated_at = now()
WHERE content_id = ${literal(content.id)} AND locale = ${literal(target.locale)}
  AND jsonb_build_object('description',description,'sources',sources,'isbn',isbn,
    'title',title,'creator',creator,'publisher',publisher) = ${json(snapshot)};
GET DIAGNOSTICS changed = ROW_COUNT;
IF changed <> 1 THEN RAISE EXCEPTION 'Media introduction changed concurrently'; END IF;
END;`
  let delimiter = '$media_introduction$'
  while (body.includes(delimiter)) delimiter = delimiter.replace(/\$$/, '_x$')
  return `DO ${delimiter}
${body}
${delimiter};`
}

export function mediaIntroductionSql(input: ReviewedMediaIntroduction): string {
  return mediaIntroductionBatchSql([input])
}

export function mediaIntroductionBatchSql(inputs: ReviewedMediaIntroduction[]): string {
  if (!inputs.length || new Set(inputs.map(i => `${i.content.id}:${i.target.locale}`)).size !== inputs.length) throw new Error('Empty or duplicate media batch')
  return `BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
${inputs.map(mediaIntroductionStatement).join('\n')}
COMMIT;`
}
