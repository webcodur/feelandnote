/**
 * @deprecated This one-off cleanup targeted the removed mixed profile domain.
 *
 * The cleanup was completed before the member/celeb table cutover. Re-running its
 * destructive rewiring against the split schema is neither supported nor safe.
 * Recover the historical implementation from Git only for forensic review.
 */
throw new Error(
  'RETIRED: cleanup-faction-nonperson-celebs.ts targeted the removed mixed profile domain and must not be executed.',
)
