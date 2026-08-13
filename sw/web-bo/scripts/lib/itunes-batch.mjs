export function chunkByCount(items, size) {
  if (!Number.isInteger(size) || size < 1) throw new Error('size must be a positive integer')
  const chunks = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

export function packByWeight(items, {
  maxItems,
  maxWeight,
  weightOf,
}) {
  if (!Number.isInteger(maxItems) || maxItems < 1) throw new Error('maxItems must be a positive integer')
  if (!Number.isFinite(maxWeight) || maxWeight <= 0) throw new Error('maxWeight must be positive')
  const packs = []
  let pack = []
  let weight = 0

  for (const item of items) {
    const itemWeight = Math.max(1, Number(weightOf(item)) || 1)
    if (pack.length && (pack.length >= maxItems || weight + itemWeight > maxWeight)) {
      packs.push(pack)
      pack = []
      weight = 0
    }
    pack.push(item)
    weight += itemWeight
    if (pack.length >= maxItems || weight >= maxWeight) {
      packs.push(pack)
      pack = []
      weight = 0
    }
  }
  if (pack.length) packs.push(pack)
  return packs
}

export function uniqueBy(items, keyOf) {
  const seen = new Set()
  return items.filter((item) => {
    const key = keyOf(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
