/** Resolve the current available seller when the user actually opens a purchase link. */
export function getBookPurchaseHref(contentId: string, editionId?: number, seller?: 'yes24' | 'kyobo' | 'coupang'): string {
  const path = `/api/books/purchase/${encodeURIComponent(contentId)}`
  const params = new URLSearchParams()
  if (editionId !== undefined) params.set('editionId', String(editionId))
  if (seller) params.set('seller', seller)
  return params.size ? `${path}?${params}` : path
}
