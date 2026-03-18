import type { CelebProfileScript } from './types'

import alexanderTheGreat from '../../../episodes/celeb-profile/alexander-the-great.json'

export const episodes: Record<string, CelebProfileScript> = {
  'alexander-the-great': alexanderTheGreat as unknown as CelebProfileScript,
}
