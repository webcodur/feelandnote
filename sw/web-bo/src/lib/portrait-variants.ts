import sharp from 'sharp'
import { PORTRAIT_DISPLAY, artworkVariantKey } from '@feelandnote/shared/constants/responsive-artwork'

export async function buildPortraitVariants(original: Buffer) {
  return Promise.all(PORTRAIT_DISPLAY.widths.map(async (width) => ({
    width,
    body: await sharp(original).rotate().resize({ width, withoutEnlargement: true })
      .webp({ quality: PORTRAIT_DISPLAY.quality }).toBuffer(),
  })))
}

export async function uploadPortraitVariants(key: string, original: Buffer, put: (key: string, body: Buffer) => Promise<unknown>) {
  const variants = await buildPortraitVariants(original)
  for (const variant of variants) await put(artworkVariantKey(key, variant.width), variant.body)
}
