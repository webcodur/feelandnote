import sharp from 'sharp'
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { MYTH_TITLE_DISPLAY } from '@feelandnote/shared/constants/responsive-artwork'

const root = fileURLToPath(new URL('../', import.meta.url))
const directory = join(root, 'public/images/myth-atlas/title-art')
const manifest: Record<string, Array<{ src: string; width: number }>> = {}
let sourceBytes = 0, displayBytes = 0
for (const file of (await readdir(directory)).filter(file => file.endsWith('.png')).sort()) {
  const source = await readFile(join(directory, file))
  const hash = createHash('sha256').update(source).update(JSON.stringify(MYTH_TITLE_DISPLAY)).digest('hex').slice(0, 12)
  sourceBytes += source.length
  const variants = []
  for (const width of MYTH_TITLE_DISPLAY.widths) {
    const { data, info } = await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: MYTH_TITLE_DISPLAY.quality }).toBuffer({ resolveWithObject: true })
    const name = `${file.slice(0, -4)}.${hash}.${info.width}.webp`
    const output = join(directory, name)
    try { await writeFile(output, data, { flag: 'wx' }) }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      if (!(await readFile(output)).equals(data)) throw new Error(`Existing asset differs: ${name}`)
    }
    if (!variants.some(variant => variant.width === info.width)) {
      variants.push({ src: `/images/myth-atlas/title-art/${name}`, width: info.width })
      displayBytes += data.length
    }
  }
  manifest[`/images/myth-atlas/title-art/${file}`] = variants
}
await mkdir(join(root, 'src/generated'), { recursive: true })
await writeFile(join(root, 'src/generated/myth-title-images.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(JSON.stringify({ images: Object.keys(manifest).length, sourceBytes, displayBytes }))
