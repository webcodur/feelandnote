export type PaginationItem = number | "start-ellipsis" | "end-ellipsis";

export function getPaginationRange(currentPage: number, totalPages: number) {
  const total = Number.isFinite(totalPages) ? Math.max(0, Math.floor(totalPages)) : 0;
  const current = Math.min(Math.max(1, Number.isFinite(currentPage) ? Math.floor(currentPage) : 1), Math.max(1, total));
  const sequence = (start: number, length: number) => Array.from({ length }, (_, index) => start + index);
  let items: PaginationItem[];
  if (total <= 7) items = sequence(1, total);
  else if (current <= 4) items = [...sequence(1, 5), "end-ellipsis", total];
  else if (current >= total - 3) items = [1, "start-ellipsis", ...sequence(total - 4, 5)];
  else items = [1, "start-ellipsis", current - 1, current, current + 1, "end-ellipsis", total];
  return { current, total, items };
}
