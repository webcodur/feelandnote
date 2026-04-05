/**
 * youtube-lineup.ts — YouTube 편성표 데이터 로딩
 *
 * 메타 생성 로직은 @feelandnote/shared/lib/youtube-meta 단일원천 사용.
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

export type { EpisodeMeta, BookForDesc, YouTubeLink, YouTubeMeta, YouTubeSnippet } from '@feelandnote/shared/lib/youtube-meta'
export { buildTitle, buildDescription, buildTags, calcChapterTimestamps, buildYouTubeSnippet } from '@feelandnote/shared/lib/youtube-meta'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const lineupData = JSON.parse(readFileSync(path.join(__dirname, 'youtube-lineup.json'), 'utf-8'))
export const lineup: Record<string, import('@feelandnote/shared/lib/youtube-meta').EpisodeMeta> = lineupData
