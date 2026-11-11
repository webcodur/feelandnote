// 인물 상세·작품·참고도서 캐시를 갱신한다. 사용: node --import tsx reval-fb.mjs <slug> <contentId...>
import { R, W } from './paths.mjs'
import { pathToFileURL } from 'node:url'
const Root = R
process.loadEnvFile(Root + '/sw/web-bo/.env')
const { revalidateTags, database } = await import(pathToFileURL(Root + '/scripts/browser/reading-way-argon.mjs').href)
const { CACHE_TAGS, itemRevalidationTags } = await import(pathToFileURL(Root + '/packages/shared/src/constants/cache-tags.ts').href)
const [slug, ...ids] = process.argv.slice(2)
const id = (await database(`select id from celebs where slug='${slug}'`, W)).text.trim()
await revalidateTags(itemRevalidationTags([{ domain: CACHE_TAGS.CELEBS, id }, { domain: CACHE_TAGS.CELEBS, id: slug }, ...ids.map((c) => ({ domain: CACHE_TAGS.CONTENTS, id: c }))], [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS, CACHE_TAGS.FIGURE_BOOKS]), slug)
