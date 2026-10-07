/** 한영 홈 공통 선정일. 한국 시간 낮 12시에 날짜가 바뀐다. */
export function featuredReviewDay(now = Date.now()): string {
  return new Date(now - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function featuredReviewCutoff(day: string): string {
  return day + "T03:00:00.000Z";
}

/** 어느 연속된 여섯 달도 포함하도록 가장 긴 반년인 184일을 확보한다. */
export const FEATURED_REVIEW_COOLDOWN_DAYS = 184;
/** 짧은 감상 기록을 홈의 읽을거리로 선정하지 않는다. 공백·서식·URL은 분량에서 뺀다. */
export const FEATURED_REVIEW_MIN_TEXT_LENGTH = { ko: 250, en: 425 } as const;
const DAY_MS = 86_400_000;

export interface FeaturedReviewText {
  review: string | null;
  review_en: string | null;
}

export function featuredReviewTextLength(text: string | null | undefined): number {
  return [...(text ?? "").normalize("NFC")
    .replace(/https?:\/\/\S+|\*\*|__|~~|\s|[\u200B-\u200D\uFEFF]/gu, "")].length;
}

/** 한영 홈에서 같은 감상을 고르므로 두 본문의 최소 분량을 함께 확인한다. */
export function featuredReviewHasEnoughText(row: FeaturedReviewText): boolean {
  return featuredReviewTextLength(row.review) >= FEATURED_REVIEW_MIN_TEXT_LENGTH.ko
    && featuredReviewTextLength(row.review_en) >= FEATURED_REVIEW_MIN_TEXT_LENGTH.en;
}

export interface FeaturedReviewCandidate {
  id: string;
  celeb_id: string | null;
  content_id: string;
  review_approved_at: string;
}

function seedScore(seed: string): number {
  let score = 2166136261;
  for (const character of seed) score = Math.imul(score ^ character.charCodeAt(0), 16777619) >>> 0;
  score = Math.imul(score ^ (score >>> 16), 2246822507) >>> 0;
  score = Math.imul(score ^ (score >>> 13), 3266489909) >>> 0;
  return (score ^ (score >>> 16)) >>> 0;
}

/**
 * 기존 승인 시각으로 하루 한 편의 선정 결과를 재계산한다. 노출 이력은 저장하지 않는다.
 * 새 승인은 과거 날짜의 후보에 끼워 넣지 않아 기존 순서를 흔들지 않는다.
 * 후보가 부족하면 해당 날짜는 비운다. 승인 취소·삭제로 과거 후보까지 사라지면
 * 재계산 결과가 달라질 수 있으므로 실제 노출 이력에 대한 보장은 현재 후보 집합 기준이다.
 */
export function featuredReviewSchedule<T extends FeaturedReviewCandidate>(rows: readonly T[], throughDay: string): Map<string, T> {
  const scheduled = new Map<string, T>();
  const unique = new Map(rows.filter(row => row.celeb_id).map(row => [row.id, row]));
  const candidates = [...unique.values()].map(row => ({ row, approved: Date.parse(row.review_approved_at) }))
    .filter(candidate => Number.isFinite(candidate.approved));
  if (!candidates.length) return scheduled;
  const firstApproval = Math.min(...candidates.map(candidate => candidate.approved));
  const firstDay = Date.parse(featuredReviewDay(firstApproval) + "T00:00:00.000Z");
  const endDay = Date.parse(throughDay + "T00:00:00.000Z");
  const lastSelected = new Map<string, number>();
  for (let date = firstDay; date <= endDay; date += DAY_MS) {
    const day = new Date(date).toISOString().slice(0, 10);
    const dayNumber = date / DAY_MS;
    // 첫날만 정오 이후 최초 검수를 포함한다. 이후의 새 승인은 다음 정오부터 반영한다.
    const cutoff = date === firstDay ? date + DAY_MS + 3 * 60 * 60 * 1000 - 1 : Date.parse(featuredReviewCutoff(day));
    let selected: T | null = null;
    let best = -1;
    for (const { row, approved } of candidates) {
      if (approved > cutoff) continue;
      const previous = lastSelected.get(row.id);
      if (previous !== undefined && dayNumber - previous < FEATURED_REVIEW_COOLDOWN_DAYS) continue;
      const score = seedScore(day + ":" + row.celeb_id + ":" + row.content_id + ":" + row.id);
      if (score > best || (score === best && row.id < selected!.id)) {
        selected = row;
        best = score;
      }
    }
    if (selected) {
      scheduled.set(day, selected);
      lastSelected.set(selected.id, dayNumber);
    }
  }
  return scheduled;
}

export function selectFeaturedReview<T extends FeaturedReviewCandidate>(rows: readonly T[], day: string): T | null {
  return featuredReviewSchedule(rows, day).get(day) ?? null;
}
