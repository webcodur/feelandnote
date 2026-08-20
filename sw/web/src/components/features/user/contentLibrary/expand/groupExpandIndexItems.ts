export interface ExpandIndexEntry {
  itemId: string;
  title: string;
  originalIndex: number;
  localIndex: number;
}

export interface ExpandIndexTypeGroup {
  dbType: string;
  items: ExpandIndexEntry[];
}

interface ExpandIndexSource {
  itemIds: string[];
  titles: string[];
  contentTypes: string[];
}

export function groupExpandIndexItems(
  source: ExpandIndexSource,
  categoryOrder: readonly string[],
): ExpandIndexTypeGroup[] {
  const buckets = new Map<string, Omit<ExpandIndexEntry, "localIndex">[]>();

  source.titles.forEach((title, originalIndex) => {
    const dbType = source.contentTypes[originalIndex] ?? "";
    const bucket = buckets.get(dbType) ?? [];
    bucket.push({
      itemId: source.itemIds[originalIndex] ?? String(originalIndex),
      title,
      originalIndex,
    });
    buckets.set(dbType, bucket);
  });

  const extras = [...buckets.keys()].filter((type) => !categoryOrder.includes(type));
  const orderedTypes = [...categoryOrder, ...extras].filter(
    (type) => (buckets.get(type)?.length ?? 0) > 0,
  );

  return orderedTypes.map((dbType) => ({
    dbType,
    items: (buckets.get(dbType) ?? []).map((item, index) => ({
      ...item,
      localIndex: index + 1,
    })),
  }));
}

export function getExpandIndexNavigationOrder(
  groups: readonly ExpandIndexTypeGroup[],
): number[] {
  return groups.flatMap((group) => group.items.map((item) => item.originalIndex));
}

export function getExpandIndexNeighbor(
  order: readonly number[],
  selectedIndex: number,
  step: -1 | 1,
): number {
  if (order.length === 0) return selectedIndex;

  const selectedPosition = order.indexOf(selectedIndex);
  if (selectedPosition < 0) return order[0] ?? selectedIndex;

  const targetPosition = (selectedPosition + step + order.length) % order.length;
  return order[targetPosition] ?? selectedIndex;
}
