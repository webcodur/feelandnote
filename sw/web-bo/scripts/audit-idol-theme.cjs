const path = require('node:path')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const childSlugs = [
  'idol-group-current-male',
  'idol-group-former-male',
  'idol-group-current-female',
  'idol-group-former-female',
]
const folders = ['IDOL-MALE', 'IDOL-MALE-FORMER', 'IDOL-FEMALE', 'IDOL-FEMALE-FORMER']

async function main() {
  const { data: tags, error: tagError } = await db.from('celeb_tags')
    .select('id,slug,name,name_en,parent_id,is_featured,is_fiction,sort_order')
    .or('slug.eq.music,slug.eq.korean-idol-groups,slug.like.idol-group-%')
    .order('sort_order')
  if (tagError) throw tagError

  const { data: episodes, error: episodeError } = await db.from('faction_episodes')
    .select('id,folder,status,registered').in('folder', folders)
  if (episodeError) throw episodeError

  const episodeIds = (episodes || []).map((e) => e.id)
  const { data: groups, error: groupError } = await db.from('faction_groups')
    .select('episode_id,name,tag_id').in('episode_id', episodeIds).order('name')
  if (groupError) throw groupError

  const tagById = new Map((tags || []).map((t) => [t.id, t]))
  const parent = (tags || []).find((t) => t.slug === 'music')
  const children = (tags || []).filter((t) => childSlugs.includes(t.slug))

  const atlas = {}
  for (const tag of children) {
    const { data, error } = await db.from('faction_atlas_members')
      .select('celeb_id,source,hidden').eq('tag_id', tag.id)
    if (error) throw error
    atlas[tag.slug] = {
      total: (data || []).length,
      visible: (data || []).filter((r) => !r.hidden).length,
      hidden: (data || []).filter((r) => r.hidden).length,
      production: (data || []).filter((r) => r.source === 'production').length,
      manual: (data || []).filter((r) => r.source === 'manual').length,
    }
  }

  console.log(JSON.stringify({
    parent,
    children: children.map((t) => ({
      ...t,
      parent_slug: t.parent_id ? tagById.get(t.parent_id)?.slug || null : null,
      atlas: atlas[t.slug],
    })),
    missing_children: childSlugs.filter((slug) => !children.some((t) => t.slug === slug)),
    episodes: (episodes || []).map((e) => ({
      ...e,
      groups: (groups || []).filter((g) => g.episode_id === e.id).map((g) => ({
        name: g.name,
        tag_slug: tagById.get(g.tag_id)?.slug || null,
      })),
    })),
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
