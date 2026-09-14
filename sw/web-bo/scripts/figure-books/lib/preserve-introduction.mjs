const introductionModule = await import('@feelandnote/content-search/book-introduction')
const contractModule = await import('@feelandnote/content-search/book-introduction-contract')
const { forLocale } = introductionModule.default ?? introductionModule
const { isBookIntroductionSource } = contractModule.default ?? contractModule

const isbnKey = (value) => String(value ?? '').replace(/[^0-9Xx]/g, '').toUpperCase()
const hasDescription = (row) => Boolean(String(row?.description ?? '').trim())

/** A failed lookup must not erase a stored introduction or attach an old source to a new edition. */
export function preserveIntroduction(previous, next, locale) {
  if (hasDescription(next) || !hasDescription(previous)) return next
  if (isBookIntroductionSource(previous.description)) {
    const validSource = locale === 'ko' ? previous.description !== 'OPEN' : previous.description === 'OPEN'
    if (!validSource || !isbnKey(previous.isbn) || isbnKey(previous.isbn) !== isbnKey(next.isbn)) {
      throw new Error('Introduction source needs verification before changing/removing its ISBN')
    }
  } else if (!forLocale(previous.description, locale)) {
    // Unknown/wrong-language text needs review, not automatic deletion or copying.
    throw new Error(`Stored introduction language needs review (${locale})`)
  }
  return {
    ...next,
    description: previous.description,
    sources: {
      ...next.sources,
      ...(previous.sources?.description ? { description: previous.sources.description } : {}),
    },
  }
}

/** Deleting a locale or edition requires relocating its introduction first. */
export function assertNoIntroductionLoss(rows, retained = null) {
  for (const row of rows ?? []) {
    if (hasDescription(row) && (!retained || row.description !== retained.description
      || (isBookIntroductionSource(row.description) && row.sources?.description !== retained.sources?.description))) {
      throw new Error('Stored introduction must be preserved before deleting or replacing this row')
    }
  }
}
