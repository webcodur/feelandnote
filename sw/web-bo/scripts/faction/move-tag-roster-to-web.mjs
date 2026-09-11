/**
 * 세력도감 테마 하나의 명단을 영상 제작 데이터에서 웹 전용 배정으로 옮긴다.
 *
 * 영상층을 떼어 내는 절차(docs/todo/faction-video-stop.md 「웹 원천 분리」)를 테마 단위로 돈다.
 * 한 트랜잭션 안에서 아래를 차례로 하고, 대조가 한 건이라도 어긋나면 통째로 되돌린다.
 *  1. 이관 전 명단(공개 뷰 결과)과 끊을 세력의 테마 연결을 백업으로 뽑는다.
 *  2. 영상 행을 뷰가 계산한 값 그대로 celeb_tag_assignments로 옮긴다 — 문구·화보·숨김·대사 음성.
 *     같은 테마·셀럽의 가려진 웹 배정 행이 있으면 그 행을 덮는다.
 *  3. 영상 세력을 celeb_tag_groups에 시작값으로 복사하고 옮긴 행을 그 그룹에 건다.
 *  4. 테마 전체 순서를 지금 보이는 차례 그대로 10 간격으로 다시 매긴다.
 *  5. faction_groups.tag_id를 끊는다. 뷰의 제작 갈래가 이 테마에서 빠지고 웹 배정이 이어받는다.
 *  6. 이관 전후 인원·순서·문구·화보·음성·그룹을 대조한다.
 *
 * 기본은 모의 실행(끝에 롤백)이다. --apply 를 줘야 커밋하고 백업 JSON을 남긴다.
 *
 * 실행: cd sw/web-bo && node --env-file=.env scripts/faction/move-tag-roster-to-web.mjs --tag homer-iliad [--apply]
 * 되돌리기: 백업의 cutGroups로 faction_groups.tag_id를 되살리면 제작 갈래가 다시 이긴다.
 *          옮겨 만든 배정 행과 그룹은 그 뒤 지운다(movedCelebIds·createdGroups).
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const args = process.argv.slice(2)
const slug = args[args.indexOf('--tag') + 1]
const apply = args.includes('--apply')
if (!args.includes('--tag') || !slug || slug.startsWith('--')) throw new Error('--tag <테마 slug> 가 필요하다')

const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const { data: tag, error } = await db.from('celeb_tags').select('id,slug,name').eq('slug', slug).maybeSingle()
if (error) throw new Error(`테마 조회 실패: ${error.message}`)
if (!tag) throw new Error(`테마를 찾지 못했다: ${slug}`)
if (!/^[0-9a-f-]{36}$/u.test(tag.id)) throw new Error(`테마 id 형식이 이상하다: ${tag.id}`)

const T = `'${tag.id}'::uuid`
const CONTENT_COLUMNS = ['short_desc', 'short_desc_en', 'long_desc', 'long_desc_en', 'quote', 'quote_en', 'faction_image_url', 'hidden']

const sql = `
begin;

create temp table before_rows on commit drop as
  select * from private.faction_atlas_members_cache where tag_id = ${T};
create temp table prod_rows on commit drop as
  select * from before_rows where source = 'production';
create temp table cut_groups on commit drop as
  select id, tag_id from public.faction_groups where tag_id = ${T};

-- jsonb로 뽑는다 — json_agg는 원소 사이에 줄바꿈을 넣어 한 줄 파싱이 깨진다(26.09.11 백업 유실)
select 'BACKUP:' || jsonb_build_object(
  'tag', jsonb_build_object('id', ${T}, 'slug', ${sqlText(tag.slug)}),
  'cutGroups', coalesce((select jsonb_agg(to_jsonb(c)) from cut_groups c), '[]'::jsonb),
  'movedCelebIds', coalesce((select jsonb_agg(p.celeb_id) from prod_rows p), '[]'::jsonb),
  'existingGroups', coalesce((select jsonb_agg(to_jsonb(g)) from public.celeb_tag_groups g where g.tag_id = ${T}), '[]'::jsonb),
  'before', coalesce((select jsonb_agg(to_jsonb(b) order by b.sort_order) from before_rows b), '[]'::jsonb)
)::text;

insert into public.celeb_tag_assignments (tag_id, celeb_id, ${CONTENT_COLUMNS.join(', ')}, sort_order, quote_media)
select tag_id, celeb_id, ${CONTENT_COLUMNS.join(', ')}, sort_order, faction_quote_media
from prod_rows
on conflict (celeb_id, tag_id) do update set
  ${CONTENT_COLUMNS.map((column) => `${column} = excluded.${column}`).join(',\n  ')},
  quote_media = excluded.quote_media;

insert into public.celeb_tag_groups (tag_id, name, name_en, sort_order)
select distinct on (group_label) tag_id, group_label, group_label_en, group_position
from prod_rows
where group_label is not null
order by group_label, group_position
on conflict (tag_id, name) do nothing;

update public.celeb_tag_assignments a
set group_id = g.id
from prod_rows p
join public.celeb_tag_groups g on g.tag_id = p.tag_id and g.name = p.group_label
where a.tag_id = p.tag_id and a.celeb_id = p.celeb_id;

update public.celeb_tag_assignments a
set sort_order = r.new_order
from (
  select celeb_id, (row_number() over (order by sort_order, celeb_id) * 10)::integer as new_order
  from before_rows
) r
where a.tag_id = ${T} and a.celeb_id = r.celeb_id;

update public.faction_groups set tag_id = null where tag_id = ${T};

create temp table after_rows on commit drop as
  select * from private.faction_atlas_members_cache where tag_id = ${T};

do $verify$
declare
  v_before integer;
  v_after integer;
  v_bad integer;
begin
  select count(*) into v_before from before_rows;
  select count(*) into v_after from after_rows;
  if v_before <> v_after then
    raise exception '인원 불일치: 이관 전 % / 후 %', v_before, v_after;
  end if;
  if exists (select 1 from after_rows where source <> 'manual') then
    raise exception '제작 행이 남았다';
  end if;
  if (select array_agg(celeb_id order by sort_order, celeb_id) from before_rows)
     is distinct from (select array_agg(celeb_id order by sort_order, celeb_id) from after_rows) then
    raise exception '순서 불일치';
  end if;
  select count(*) into v_bad
  from before_rows b
  join after_rows a using (celeb_id)
  where ${CONTENT_COLUMNS.map((column) => `b.${column} is distinct from a.${column}`).join('\n     or ')}
     or b.faction_quote_media is distinct from a.faction_quote_media
     or (b.source = 'production' and (
          b.group_label is distinct from a.group_label
          or b.group_label_en is distinct from a.group_label_en
          or b.group_position is distinct from a.group_position));
  if v_bad > 0 then
    raise exception '문구·화보·음성·그룹 불일치 %건', v_bad;
  end if;
end
$verify$;

select 'SUMMARY:' || json_build_object(
  'total', (select count(*) from after_rows),
  'moved', (select count(*) from prod_rows),
  'voiced', (select count(*) from after_rows where faction_quote_media is not null),
  'grouped', (select count(*) from after_rows where group_label is not null),
  'groups', (select count(*) from public.celeb_tag_groups where tag_id = ${T}),
  'cutGroups', (select count(*) from cut_groups)
)::text;

${apply ? 'commit;' : 'rollback;'}
`

const stdout = await runSql(sql)
const line = (prefix) => stdout.split('\n').find((row) => row.startsWith(prefix))?.slice(prefix.length)

/* 커밋은 이미 끝났으므로 백업부터 남긴다. 파싱이 깨져도 원문은 잃지 않게 그대로 쓴다 */
if (apply) {
  const dir = path.resolve(process.cwd(), '../../data/celeb/_backup/faction-web-roster')
  mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${tag.slug}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  const raw = line('BACKUP:') ?? ''
  let body
  try {
    body = `${JSON.stringify(JSON.parse(raw), null, 2)}\n`
  } catch {
    body = stdout
  }
  writeFileSync(file, body)
  console.log(`백업: ${file}`)
}

const summary = JSON.parse(line('SUMMARY:') ?? 'null')
if (!summary) throw new Error(`결과 요약을 받지 못했다:\n${stdout.slice(0, 500)}`)
console.log(`${apply ? '적용' : '모의 실행(롤백)'} — ${tag.name} [${tag.slug}]`)
console.log(`  명단 ${summary.total}명 중 영상 행 ${summary.moved}명을 옮김, 음성 ${summary.voiced}명, 그룹 소속 ${summary.grouped}명`)
console.log(`  그룹 ${summary.groups}개, 끊은 영상 세력 ${summary.cutGroups}개, 이관 전후 대조 통과`)

function sqlText(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

/* 헤드라인 반영 도구(scripts/celeb/headline-rewrite/apply.ts)와 같은 경로 — SSH로 DB VM의 supabase-db 컨테이너에 SQL을 한 세션으로 보낸다 */
function runSql(query) {
  const host = process.env.FEELANDNOTE_DB_SSH_HOST ?? 'ubuntu@152.67.198.197'
  const sshKey = process.env.FEELANDNOTE_DB_SSH_KEY ?? path.join(process.env.USERPROFILE ?? '', '.ssh', 'feelandnote_oracle')
  if (!existsSync(sshKey)) throw new Error(`Oracle DB SSH 키가 없다: ${sshKey}`)
  return new Promise((resolve, reject) => {
    const child = spawn('ssh', [
      '-i', sshKey, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', host,
      'sudo', 'docker', 'exec', '-i', 'supabase-db',
      'psql', '-X', '-qAt', '--set', 'ON_ERROR_STOP=1', '--username', 'postgres', '--dbname', 'postgres',
    ], { windowsHide: true })
    let out = ''
    let err = ''
    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error('SQL 실행이 120초를 넘겼다'))
    }, 120_000)
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => { out += chunk })
    child.stderr.on('data', (chunk) => { err += chunk })
    child.on('error', (e) => { clearTimeout(timeout); reject(e) })
    child.on('close', (code) => {
      clearTimeout(timeout)
      if (code === 0) resolve(out)
      else reject(new Error(`SQL 실패(${code}) — 트랜잭션은 되돌려졌다:\n${err.slice(0, 800)}`))
    })
    child.stdin.end(query)
  })
}
