import { verifyAmazonBookProduct } from '../../../../packages/content-search/src/amazon-book-product.ts'

/** One atomic statement fills missing connections; existing links, metadata and products are untouched. */
export function buildAmazonProductApplySql(plan) {
  const seen = new Set()
  const rows = plan.map(({ target, page }) => {
    const result = verifyAmazonBookProduct(target, page)
    if (result.status !== 'verified') throw new Error(`Unverified Amazon product: ${target?.isbn}`)
    const key = `${target.contentId}:${target.editionId ?? 'locale'}`
    if (seen.has(key)) throw new Error(`Duplicate Amazon target: ${key}`)
    seen.add(key)
    return { content_id: target.contentId, edition_id: target.editionId ?? null, isbn: target.isbn,
      title: target.title, creator: target.creator ?? null, product_id: result.product.productId,
      url: result.product.productUrl, evidence: result.product.qualityEvidence }
  })
  // ASCII JSON avoids the Windows shell's Unicode pipe conversion. No credentials are embedded.
  const payload = JSON.stringify(rows).replace(/[\u007f-\uffff]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`).replace(/'/g, "''")
  return `SET standard_conforming_strings=on;
WITH approved AS (SELECT * FROM jsonb_to_recordset('${payload}'::jsonb)
 AS a(content_id text,edition_id bigint,isbn text,title text,creator text,product_id text,url text,evidence jsonb)),
locales_filled AS (
 UPDATE public.content_locales l SET affiliate_url=coalesce(l.affiliate_url,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('platform','amazon','url',a.url))
 FROM approved a WHERE a.edition_id IS NULL AND l.content_id=a.content_id AND l.locale='en'
 AND l.isbn=a.isbn AND l.title=a.title AND l.creator IS NOT DISTINCT FROM a.creator
 AND EXISTS(SELECT 1 FROM public.contents c WHERE c.id=l.content_id AND c.type='BOOK')
 AND (l.affiliate_url IS NULL OR jsonb_typeof(l.affiliate_url)='array')
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(l.affiliate_url)='array' THEN l.affiliate_url ELSE '[]'::jsonb END) link WHERE link->>'platform'='amazon')
 RETURNING l.content_id,NULL::bigint AS edition_id,l.affiliate_url),
products_filled AS (
 INSERT INTO public.figure_book_products(edition_id,platform,product_id,product_url,affiliate_url,quality_evidence,checked_at,is_active)
 SELECT e.id,'amazon',a.product_id,a.url,a.url,a.evidence,now(),true FROM approved a JOIN public.figure_book_editions e ON e.id=a.edition_id
 WHERE e.content_id=a.content_id AND e.locale='en' AND e.isbn=a.isbn AND e.title=a.title AND e.creator IS NOT DISTINCT FROM a.creator
 AND NOT EXISTS(SELECT 1 FROM public.figure_book_products p WHERE p.edition_id=e.id AND p.platform='amazon')
 ON CONFLICT DO NOTHING RETURNING edition_id,affiliate_url),
filled AS (SELECT l.content_id,l.edition_id,l.affiliate_url FROM locales_filled l UNION ALL
 SELECT a.content_id,p.edition_id,to_jsonb(p.affiliate_url) FROM products_filled p JOIN approved a ON a.edition_id=p.edition_id)
SELECT jsonb_build_object('saved',count(*),'rows',coalesce(jsonb_agg(to_jsonb(filled)),'[]'::jsonb)) FROM filled;`
}
