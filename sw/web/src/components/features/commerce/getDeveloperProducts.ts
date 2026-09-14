import 'server-only'
import { getLocale } from 'next-intl/server'
import { isDeveloperMode } from '@/lib/developer-mode'
import type { TargetProductMatch } from './targetProducts'

export default async function getDeveloperProducts(): Promise<TargetProductMatch[]> {
  if (!isDeveloperMode()) return []
  if (await getLocale() !== 'ko') return []
  const { TARGET_PRODUCTS } = await import('./targetProducts')
  return TARGET_PRODUCTS
}
