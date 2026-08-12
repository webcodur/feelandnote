type PersistImage = (
  celebId: string,
  file: File,
  revalidateAdminRoutes?: boolean
) => Promise<string>

interface PersistCroppedCelebImageInput {
  mode: 'create' | 'edit'
  celebId?: string
  file: File
  persist: PersistImage
}

export async function persistCroppedCelebImage({
  mode,
  celebId,
  file,
  persist,
}: PersistCroppedCelebImageInput): Promise<string | null> {
  if (mode !== 'edit' || !celebId) return null
  return persist(celebId, file, false)
}
