// celebs.publication_status 허용값의 코드 SSoT.
// DB CHECK는 이 집합을 강제하는 사본이고, 일반 관리 화면은 active/inactive만 전환한다.
export const CELEB_PUBLICATION_STATUSES = [
  'active',
  'inactive',
  'suspended',
  'deleted',
] as const

export type CelebPublicationStatus = (typeof CELEB_PUBLICATION_STATUSES)[number]

export const CELEB_MANAGED_PUBLICATION_STATUSES = [
  'active',
  'inactive',
] as const satisfies readonly CelebPublicationStatus[]

export type CelebManagedPublicationStatus =
  (typeof CELEB_MANAGED_PUBLICATION_STATUSES)[number]

export const DEFAULT_CELEB_PUBLICATION_STATUS =
  'inactive' satisfies CelebManagedPublicationStatus

export function isCelebPublicationStatus(
  value: string | null | undefined,
): value is CelebPublicationStatus {
  return !!value && (CELEB_PUBLICATION_STATUSES as readonly string[]).includes(value)
}
