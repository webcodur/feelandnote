import sharp from 'sharp'
import { FACTION_TEAM_DISPLAY } from '@feelandnote/shared/constants/responsive-artwork'

/** 원본은 별도로 보존한다. 애니메이션이나 이미 더 작은 원본은 그대로 제공한다. */
export async function encodeFactionTeamDisplay(original: Buffer): Promise<Buffer | null> {
  const metadata = await sharp(original).metadata()
  if ((metadata.pages ?? 1) > 1) return null
  const display = await sharp(original).rotate().webp({ quality: FACTION_TEAM_DISPLAY.quality }).toBuffer()
  return display.length < original.length ? display : null
}
