const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
}

const MIN_DESCRIPTION_LENGTH = 60

export type DescriptionBackfillDecision =
  | { kind: 'update'; description: string }
  | { kind: 'unchanged'; reason: 'same-or-longer' }
  | { kind: 'skip'; reason: 'no-full-description' | 'too-short' | 'different-description' }

function comparable(value: string): string {
  return value
    .replace(/&(?:amp|apos|gt|lt|nbsp|quot);/giu, (entity) => (
      HTML_ENTITIES[entity.slice(1, -1).toLowerCase()] ?? entity
    ))
    .normalize('NFKC')
    .replace(/\s+/gu, ' ')
    .trim()
}

export function decideDescriptionBackfill(
  current: string | null,
  fullDescription: string | null,
): DescriptionBackfillDecision {
  const candidate = fullDescription?.replace(/\r\n?/gu, '\n').trim() ?? ''
  if (!candidate) return { kind: 'skip', reason: 'no-full-description' }

  const candidateComparable = comparable(candidate)
  if (candidateComparable.length < MIN_DESCRIPTION_LENGTH) {
    return { kind: 'skip', reason: 'too-short' }
  }

  const currentComparable = comparable(current ?? '')
  if (!currentComparable) return { kind: 'update', description: candidate }
  if (candidateComparable.length <= currentComparable.length) {
    return { kind: 'unchanged', reason: 'same-or-longer' }
  }

  const prefix = currentComparable.replace(/(?:\.{3}|…)+$/u, '').trimEnd()
  if (!candidateComparable.startsWith(prefix)) {
    return { kind: 'skip', reason: 'different-description' }
  }
  return { kind: 'update', description: candidate }
}
