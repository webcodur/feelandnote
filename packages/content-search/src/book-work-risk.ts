/** Provider records can attach study guides to the original's title and work ID. */
export function requiresIndependentBookWorkReview(publisher: string | null | undefined): boolean {
  return /\b(cram101|aipi)\b/i.test(publisher ?? '')
}
