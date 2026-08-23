/* 타임라인 상수 — `actions/admin/timeline.ts`는 'use server' 파일이라
   async 함수 외에는 내보낼 수 없다. 그래서 상수는 여기 둔다.
   값의 단일원천은 DB CHECK 제약이며 규격은 docs/project/celeb/celeb-timeline.md 다. */

export const TIMELINE_KINDS = [
  'birth', 'death', 'education', 'work', 'publish',
  'battle', 'travel', 'office', 'meeting', 'other',
] as const

export type TimelineKind = (typeof TIMELINE_KINDS)[number]

export const TIMELINE_KIND_LABELS: Record<string, string> = {
  birth: '출생',
  death: '사망',
  education: '수학',
  work: '업적',
  publish: '저술',
  battle: '전투',
  travel: '이동',
  office: '취임',
  meeting: '만남',
  other: '그 밖',
}
