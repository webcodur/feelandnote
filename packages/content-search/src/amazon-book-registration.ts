import type { DatabaseClient } from '../../db/src/index'
import { type AmazonBookIdentity, type AmazonBookLookup, type AmazonBookProduct } from './amazon-book-product'
import { toIsbn13 } from './book-isbn'

/** Preserve other sellers and every existing Amazon link. Only fill a genuinely empty connection. */
export function addMissingAmazonLink(current: unknown, product: AmazonBookProduct): unknown[] | null {
  if (current !== null && current !== undefined && !Array.isArray(current)) return null
  const links = Array.isArray(current) ? current : []
  if (links.some(link => link && typeof link === 'object' && (link as { platform?: string }).platform === 'amazon')) return null
  return [...links, { platform: 'amazon', url: product.productUrl }]
}

export async function fillMissingAmazonBookConnection(db: DatabaseClient, input: AmazonBookIdentity & { contentId: string; editionId?: number }, product: AmazonBookProduct): Promise<boolean> {
  const table = input.editionId === undefined ? 'content_locales' : 'figure_book_editions'
  const fields = input.editionId === undefined ? 'content_id,locale,isbn,title,creator,affiliate_url' : 'id,content_id,locale,isbn,title,creator'
  let query = db.from(table).select(fields).eq('content_id', input.contentId).eq('locale', 'en')
  if (input.editionId !== undefined) query = query.eq('id', input.editionId)
  const { data: row, error } = await query.maybeSingle()
  if (error) throw new Error(`Amazon target lookup failed: ${error.message}`)
  if (!row || toIsbn13(row.isbn ?? '') !== toIsbn13(input.isbn ?? '') || row.title !== input.title || row.creator !== (input.creator ?? null)) return false
  if (input.editionId !== undefined) {
    const { data: existing, error: checkError } = await db.from('figure_book_products').select('id').eq('edition_id', input.editionId).eq('platform', 'amazon')
    if (checkError) throw new Error(`Amazon existing product lookup failed: ${checkError.message}`)
    if (existing?.length) return false
    // Insert rather than replace: the active-product unique index protects another session's new link.
    const { error: writeError } = await db.from('figure_book_products').insert({ edition_id: input.editionId, platform: 'amazon', product_id: product.productId,
      product_url: product.productUrl, affiliate_url: product.affiliateUrl, quality_evidence: product.qualityEvidence, checked_at: new Date().toISOString(), is_active: true })
    if (writeError?.code === '23505') return false
    if (writeError) throw new Error(`Amazon product save failed: ${writeError.message}`)
    const { data: saved, error: readError } = await db.from('figure_book_purchase_options').select('affiliate_url,isbn,content_id').eq('edition_id', input.editionId).eq('platform', 'amazon').maybeSingle()
    if (readError || !saved || saved.affiliate_url !== product.affiliateUrl || saved.isbn !== row.isbn || saved.content_id !== input.contentId) throw new Error('Amazon product readback mismatch')
    return true
  }
  const next = addMissingAmazonLink(row.affiliate_url, product)
  if (!next) return false
  let update = db.from('content_locales').update({ affiliate_url: next }).eq('content_id', input.contentId).eq('locale', 'en').eq('isbn', row.isbn).eq('title', row.title)
  update = row.creator === null ? update.is('creator', null) : update.eq('creator', row.creator)
  update = row.affiliate_url === null ? update.is('affiliate_url', null) : update.filter('affiliate_url', 'eq', JSON.stringify(row.affiliate_url))
  const { data: written, error: writeError } = await update.select('affiliate_url').maybeSingle()
  if (writeError) throw new Error(`Amazon locale save failed: ${writeError.message}`)
  if (!written) return false
  const { data: saved, error: readError } = await db.from('content_locales').select('affiliate_url').eq('content_id', input.contentId).eq('locale', 'en').single()
  const stored = saved?.affiliate_url
  if (readError || !Array.isArray(stored) || stored.length !== next.length
    || !stored.some(link => link?.platform === 'amazon' && link.url === product.productUrl)) throw new Error('Amazon locale readback mismatch')
  return true
}

export async function connectAmazonBookOnRegistration(db: DatabaseClient, input: AmazonBookIdentity & { contentId: string; editionId?: number }, lookup: (book: AmazonBookIdentity) => Promise<AmazonBookLookup>): Promise<void> {
  if (input.locale !== 'en') return
  // This is a purchase enrichment; an unavailable seller must not undo a successful book registration.
  try {
    if (input.editionId !== undefined) {
      const { data, error } = await db.from('figure_book_products').select('id').eq('edition_id', input.editionId).eq('platform', 'amazon').limit(1).maybeSingle()
      if (error) throw new Error(error.message)
      if (data) return
    } else {
      const { data, error } = await db.from('content_locales').select('affiliate_url').eq('content_id', input.contentId).eq('locale', 'en').maybeSingle()
      if (error) throw new Error(error.message)
      if (!data || (data.affiliate_url !== null && !Array.isArray(data.affiliate_url))
        || data.affiliate_url?.some((link: { platform?: string }) => link?.platform === 'amazon')) return
    }
    const result = await lookup(input)
    if (result.status === 'verified') await fillMissingAmazonBookConnection(db, input, result.product)
    else console.warn(`[Amazon book connection] ${input.contentId}: ${result.reason}`)
  } catch (error) { console.warn(`[Amazon book connection] ${input.contentId}: ${error instanceof Error ? error.message : 'save failed'}`) }
}
