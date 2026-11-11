// 인물 슬러그의 캐시 태그만 다시 갱신한다. 사용(저장소 루트): node --import tsx <이 파일> <slug>
import { R, W } from './paths.mjs'
import { pathToFileURL } from 'node:url'
process.loadEnvFile(R + '/sw/web-bo/.env')
const { database, revalidateTags } = await import(pathToFileURL(R + '/scripts/browser/reading-way-argon.mjs').href)
const { CACHE_TAGS, itemRevalidationTags } = await import(pathToFileURL(R + '/packages/shared/src/constants/cache-tags.ts').href)
const slug = process.argv[2]
const ids = JSON.parse((await database(`SELECT json_build_object('id',c.id,'books',(SELECT json_agg(cc.content_id) FROM public.celeb_contents cc WHERE cc.celeb_id=c.id)) FROM public.celebs c WHERE c.slug='${slug.replaceAll("'", "''")}';`, W)).text.trim())
await revalidateTags(itemRevalidationTags([{ domain: CACHE_TAGS.CELEBS, id: ids.id }, { domain: CACHE_TAGS.CELEBS, id: slug }, ...ids.books.map((id) => ({ domain: CACHE_TAGS.CONTENTS, id }))], [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS]), slug)
console.log('revalidated', slug)
