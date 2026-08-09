export const MAINTENANCE_PREVIEW_PARAM = 'maintenance-preview'
export const MAINTENANCE_PREVIEW_COOKIE = 'fn-maintenance-preview'

export function canUseMaintenancePreview() {
  return process.env.NODE_ENV === 'development'
}
