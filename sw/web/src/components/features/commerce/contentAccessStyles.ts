import type { AccessService, AccessType } from '@/lib/commerce/contentAccess'

export const ACCESS_SERVICES: Record<AccessService, { name: string; color: string; end: string }> = {
  steam: { name: 'Steam', color: '#327b9e', end: '#173b64' },
  playstation: { name: 'PlayStation', color: '#3269cd', end: '#243a87' },
  xbox: { name: 'Xbox', color: '#348b39', end: '#235337' },
  nintendo: { name: 'Nintendo', color: '#c94043', end: '#8a303d' },
  appleMusic: { name: 'Apple Music', color: '#d84a66', end: '#8e365e' },
  appleTv: { name: 'Apple TV', color: '#65717e', end: '#343b4b' },
}

export const ACCESS_OPENER_SPECTRUM: Record<AccessType, string> = {
  GAME: `linear-gradient(110deg,${ACCESS_SERVICES.nintendo.color} 0%,${ACCESS_SERVICES.playstation.color} 36%,${ACCESS_SERVICES.xbox.color} 68%,${ACCESS_SERVICES.steam.color} 100%)`,
  MUSIC: `linear-gradient(110deg,${ACCESS_SERVICES.appleMusic.color},${ACCESS_SERVICES.appleMusic.end})`,
  VIDEO: 'linear-gradient(110deg,#897345,#587f75)',
}

export const ACCESS_LINK_STYLE = '@container/access group/access relative block overflow-hidden rounded-md border border-purchase-ink/25 bg-[linear-gradient(115deg,color-mix(in_srgb,var(--access-color)_64%,var(--color-bg-stone-light)),color-mix(in_srgb,var(--access-end)_40%,var(--color-bg-stone-light)))] px-3 py-2.5 text-purchase-ink shadow-sm hover:border-purchase-ink/80 hover:shadow-[0_3px_14px_color-mix(in_srgb,var(--access-color)_20%,transparent)] active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
export const ACCESS_LABEL_STYLE = 'inline-block origin-center transition-transform duration-150 ease-out motion-safe:group-hover/access:scale-105 motion-safe:group-focus-visible/access:scale-105 motion-reduce:transition-none'
