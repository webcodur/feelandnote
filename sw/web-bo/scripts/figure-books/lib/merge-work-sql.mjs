/** 작품 통합은 한 PostgreSQL transaction에서만 실행한다. 충돌은 전체 pair를 되돌린다. */
import { toIsbn13 } from '@feelandnote/content-search/book-isbn'
import { CONTENT_ARRAY_REFERENCES } from './content-array-references.mjs'
export const REFERENCE_TABLES = ['content_locales', 'figure_book_contents', 'figure_book_characters', 'figure_book_editions', 'member_contents', 'celeb_contents', 'curated_list_items', 'flow_nodes', 'records', 'notes', 'activity_logs']
const arrayReferences = table => CONTENT_ARRAY_REFERENCES.filter(ref => ref.table === table)
const rankedReferences = CONTENT_ARRAY_REFERENCES.filter(ref => ref.shape === 'tiers')
export const ARRAY_REFERENCE_TABLES = [...new Set(CONTENT_ARRAY_REFERENCES.map(ref => ref.table))].filter(table => !REFERENCE_TABLES.includes(table))
export const SNAPSHOT_TABLES = ['contents', ...REFERENCE_TABLES, 'figure_book_products', ...ARRAY_REFERENCE_TABLES]
export function hasArrayReference(table, row, id) {
  return arrayReferences(table).some(ref => ref.shape === 'tiers'
    ? Object.values(row[ref.column] ?? {}).some(ids => Array.isArray(ids) && ids.includes(id))
    : Array.isArray(row[ref.column]) && row[ref.column].includes(id))
}
function arrayReferenceWhere(ref, id, prefix = '') {
  const column = `${prefix}${ref.column}`
  if (ref.shape === 'tiers') return `jsonb_path_exists(${column}, '$.*[*] ? (@ == $drop)', jsonb_build_object('drop', ${id}))`
  return ref.storage === 'text[]' ? `${id} = ANY(${column})` : `${column} @> jsonb_build_array(${id})`
}
function referenceWhere(table, k, d, alias = '') {
  const p = alias ? `${alias}.` : ''
  if (table === 'contents') return `${p}id IN (${k}, ${d})`
  if (table === 'figure_book_products') return `${p}edition_id IN (SELECT id FROM public.figure_book_editions WHERE content_id IN (${k}, ${d}))`
  const predicates = arrayReferences(table).map(ref => arrayReferenceWhere(ref, d, p))
  if (REFERENCE_TABLES.includes(table)) predicates.unshift(`${p}content_id IN (${k}, ${d})`)
  return predicates.length > 1 ? `(${predicates.join(' OR ')})` : predicates[0]
}
function rankGroupsSql(table, column) {
  return `coalesce(t.${column},'{}'::jsonb)` + arrayReferences(table).filter(ref => ref.shape === 'array')
    .map(ref => ` || jsonb_build_object('${ref.column}',coalesce(to_jsonb(t.${ref.column}),'[]'::jsonb))`).join('')
}
function arrayUpdateSql(ref) {
  const column = `t.${ref.column}`
  const mapped = 'CASE WHEN entry.id=drop_id THEN keep_id ELSE entry.id END'
  const grouping = `${mapped}${ref.table === 'faction_lv2' ? '' : ', CASE WHEN entry.id IN (keep_id,drop_id) THEN 0 ELSE entry.position END'}`
  const entries = source => `SELECT ${mapped} AS mapped_id,min(entry.position) AS first_position FROM ${source} WITH ORDINALITY entry(id,position) GROUP BY ${grouping}`
  const jsonArray = source => `(SELECT coalesce(jsonb_agg(to_jsonb(mapped_id) ORDER BY first_position),'[]'::jsonb) FROM (${entries(source)}) ids)`
  const value = ref.shape === 'tiers'
    ? `(SELECT jsonb_object_agg(tier.key,${jsonArray('jsonb_array_elements_text(tier.value)')}) FROM jsonb_each(${column}) tier)`
    : ref.storage === 'text[]'
      ? `(SELECT array_agg(mapped_id ORDER BY first_position) FROM (${entries(`unnest(${column})`)}) ids)`
      : jsonArray(`jsonb_array_elements_text(${column})`)
  return `UPDATE public.${ref.table} t SET ${ref.column}=${value} WHERE ${arrayReferenceWhere(ref, 'drop_id', 't.')};`
}
export function sqlLiteral(value) {
  if (typeof value !== 'string' || value.includes('\0')) throw new Error('SQL 문자열이 잘못됐습니다.')
  return "E'" + value.replaceAll('\\', '\\\\').replaceAll("'", "''") + "'"
}
export function validatePair(pair) {
  if (!pair || typeof pair.keep !== 'string' || typeof pair.drop !== 'string' || !pair.keep || !pair.drop || pair.keep === pair.drop) throw new Error('서로 다른 keep/drop 작품 ID가 필요합니다.')
}
function unrepresentedExternalIsbn(snapshot, pair) {
  const drop = snapshot.contents?.find(row => row.id === pair.drop), isbn = toIsbn13(drop?.external_id ?? '')
  return isbn && ![...(snapshot.content_locales ?? []), ...(snapshot.figure_book_editions ?? [])].some(row => toIsbn13(row.isbn ?? '') === isbn) ? isbn : null
}
export function findConflicts(snapshot, pair) {
  validatePair(pair)
  if (unrepresentedExternalIsbn(snapshot, pair)) return 'external-isbn-edition-needs-review'
  const rows = table => snapshot[table] ?? []
  const duplicates = (table, key) => rows(table).filter(row => row.content_id === pair.drop).flatMap(drop => rows(table).filter(keep => keep.content_id === pair.keep && keep[key] === drop[key]).map(keep => ({ keep, drop })))
  if (duplicates('member_contents', 'member_id').length) return 'member-duplicate-needs-review'
  for (const { keep, drop } of duplicates('celeb_contents', 'celeb_id')) {
    for (const key of new Set([...Object.keys(keep), ...Object.keys(drop)])) {
      if (['id', 'content_id', 'created_at', 'updated_at'].includes(key)) continue
      const a = keep[key], b = drop[key]
      const filled = value => value !== null && value !== undefined && value !== ''
      if (JSON.stringify(a) !== JSON.stringify(b) && (!['review', 'review_en', 'source_url'].includes(key) || (filled(a) && filled(b)))) return `celeb-${key}-needs-review`
    }
  }
  // 큐레이션 목록은 같은 작품의 개별 선정 행을 허용한다. 원행은 합치거나 삭제하지 않는다.
  for (const { table, column } of rankedReferences) for (const row of rows(table)) {
    const groups = Object.entries(row[column] ?? {})
    for (const ref of arrayReferences(table).filter(ref => ref.shape === 'array')) groups.push([ref.column, row[ref.column] ?? []])
    const keepGroups = groups.filter(([, ids]) => Array.isArray(ids) && ids.includes(pair.keep)).map(([name]) => name)
    const dropGroups = groups.filter(([, ids]) => Array.isArray(ids) && ids.includes(pair.drop)).map(([name]) => name)
    if (keepGroups.some(name => dropGroups.some(other => name !== other))) return `${table}-rank-needs-review`
  }
  for (const { keep, drop } of duplicates('figure_book_characters', 'celeb_id')) {
    for (const key of ['description', 'description_en']) if (keep[key] && drop[key] && keep[key] !== drop[key]) return `character-${key}-needs-review`
  }
  for (const drop of rows('figure_book_editions').filter(row => row.content_id === pair.drop && row.isbn != null)) {
    const keep = rows('figure_book_editions').find(row => row.content_id === pair.keep && row.locale === drop.locale && row.isbn === drop.isbn)
    for (const key of ['edition_kind', 'text_scope']) if (keep?.[key] && drop[key] && keep[key] !== drop[key]) return `edition-${key}-needs-review`
  }
  return null
}

export function buildMergeSql(pair, snapshot) {
  validatePair(pair)
  for (const table of SNAPSHOT_TABLES) if (!Array.isArray(snapshot[table])) throw new Error(`백업 누락: ${table}`)
  if (unrepresentedExternalIsbn(snapshot, pair)) throw new Error('MERGE_REVIEW: external ISBN has no preserved edition')
  const k = sqlLiteral(pair.keep), d = sqlLiteral(pair.drop)
  const originalEditionIds = snapshot.figure_book_editions.map(row => sqlLiteral(String(row.id))).join(', ') || 'NULL'
  const rawInput = JSON.stringify({ pair, snapshot })
  let delimiter = '$merge_work$'
  for (let suffix = 1; rawInput.includes(delimiter); suffix += 1) delimiter = `$merge_work_${suffix}$`
  const checks = SNAPSHOT_TABLES.map(table => {
    const where = referenceWhere(table, k, d, 't')
    return `IF (SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.${table} t WHERE ${where}) IS DISTINCT FROM (SELECT coalesce(jsonb_agg(v ORDER BY v::text), '[]'::jsonb) FROM jsonb_array_elements(${sqlLiteral(JSON.stringify(snapshot[table]))}::jsonb) v) THEN RAISE EXCEPTION 'MERGE_REVIEW: concurrent change in ${table}'; END IF;`
  }).join('\n')
  const whitelist = REFERENCE_TABLES.map(sqlLiteral).join(', ')
  const rowLocks = SNAPSHOT_TABLES.map(table => {
    const where = referenceWhere(table, k, d)
    return `PERFORM 1 FROM public.${table} WHERE ${where} ORDER BY ${table === 'contents' ? 'id' : `to_jsonb(${table})::text`} FOR UPDATE;`
  }).join('\n')
  return `\\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO ${delimiter}
DECLARE
  keep_id text := ${k}; drop_id text := ${d};
  row_pair record; field record; duplicate_edition record;
  canonical_id bigint; unknown_ref record; dependent_count bigint;
BEGIN
  -- FK 없는 배열·활동 참조는 행 잠금만으로 새 참조 삽입을 막을 수 없다.
  LOCK TABLE ${[...new Set(['activity_logs', ...CONTENT_ARRAY_REFERENCES.map(ref => ref.table)])].map(table => `public.${table}`).join(', ')} IN SHARE ROW EXCLUSIVE MODE;
  ${rowLocks}
  ${checks}
  IF (SELECT count(*) FROM public.contents WHERE id IN (keep_id, drop_id) AND type = 'BOOK') <> 2 THEN RAISE EXCEPTION 'MERGE_REVIEW: two BOOK works required'; END IF;
  -- 새 FK나 비표준 참조가 추가됐으면 원값 백업과 이동 코드가 갖춰지기 전에는 실행하지 않는다.
  FOR unknown_ref IN SELECT c.conrelid::regclass AS rel, c.conkey, c.confkey, c.confrelid,
      n.nspname, r.relname, a.attname
    FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
    LEFT JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
    WHERE c.contype='f' AND c.confrelid IN ('public.contents'::regclass, 'public.figure_book_contents'::regclass, 'public.figure_book_editions'::regclass)
  LOOP
    IF unknown_ref.confrelid='public.contents'::regclass THEN
      IF unknown_ref.nspname <> 'public' OR unknown_ref.relname NOT IN (${whitelist}) OR cardinality(unknown_ref.conkey) <> 1 OR unknown_ref.attname <> 'content_id' THEN
        RAISE EXCEPTION 'MERGE_REVIEW: unhandled contents FK %', unknown_ref.rel;
      END IF;
    ELSIF unknown_ref.confrelid='public.figure_book_contents'::regclass THEN
      IF unknown_ref.nspname <> 'public' OR unknown_ref.relname NOT IN ('figure_book_characters','figure_book_editions') OR cardinality(unknown_ref.conkey) <> 1 OR unknown_ref.attname <> 'content_id' THEN RAISE EXCEPTION 'MERGE_REVIEW: unhandled catalog FK %', unknown_ref.rel; END IF;
    ELSIF unknown_ref.nspname <> 'public' OR unknown_ref.relname <> 'figure_book_products' OR cardinality(unknown_ref.conkey) <> 1 OR unknown_ref.attname <> 'edition_id' THEN
      RAISE EXCEPTION 'MERGE_REVIEW: unhandled edition FK %', unknown_ref.rel;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM public.member_contents a JOIN public.member_contents b USING(member_id) WHERE a.content_id=keep_id AND b.content_id=drop_id) THEN RAISE EXCEPTION 'MERGE_REVIEW: member duplicate; no user rows deleted'; END IF;
  ${rankedReferences.map(({ table, column }) => `IF EXISTS (SELECT 1 FROM public.${table} t CROSS JOIN LATERAL jsonb_each(${rankGroupsSql(table, column)}) a CROSS JOIN LATERAL jsonb_each(${rankGroupsSql(table, column)}) b WHERE a.key <> b.key AND a.value @> jsonb_build_array(keep_id) AND b.value @> jsonb_build_array(drop_id)) THEN RAISE EXCEPTION 'MERGE_REVIEW: ${table} rank conflict'; END IF;`).join('\n')}
  IF EXISTS (SELECT 1 FROM public.figure_book_characters a JOIN public.figure_book_characters b USING(celeb_id) WHERE a.content_id=keep_id AND b.content_id=drop_id AND ((nullif(a.description,'') IS NOT NULL AND nullif(b.description,'') IS NOT NULL AND a.description<>b.description) OR (nullif(a.description_en,'') IS NOT NULL AND nullif(b.description_en,'') IS NOT NULL AND a.description_en<>b.description_en))) THEN RAISE EXCEPTION 'MERGE_REVIEW: character description conflict'; END IF;
  IF EXISTS (SELECT 1 FROM public.figure_book_editions a JOIN public.figure_book_editions b USING(locale,isbn) WHERE a.content_id=keep_id AND b.content_id=drop_id AND ((a.edition_kind IS NOT NULL AND b.edition_kind IS NOT NULL AND a.edition_kind<>b.edition_kind) OR (a.text_scope IS NOT NULL AND b.text_scope IS NOT NULL AND a.text_scope<>b.text_scope))) THEN RAISE EXCEPTION 'MERGE_REVIEW: edition scope conflict'; END IF;
  FOR row_pair IN SELECT to_jsonb(a) AS a, to_jsonb(b) AS b FROM public.celeb_contents a JOIN public.celeb_contents b USING(celeb_id) WHERE a.content_id=keep_id AND b.content_id=drop_id LOOP
    FOR field IN SELECT x.key, x.value AS a, row_pair.b->x.key AS b FROM jsonb_each(row_pair.a) x WHERE x.key NOT IN ('id','content_id','created_at','updated_at') LOOP
      IF field.a IS DISTINCT FROM field.b AND (field.key NOT IN ('review','review_en','source_url') OR (field.a NOT IN ('null'::jsonb, '""'::jsonb) AND field.b NOT IN ('null'::jsonb, '""'::jsonb))) THEN RAISE EXCEPTION 'MERGE_REVIEW: celeb conflict in %', field.key; END IF;
    END LOOP;
    -- 감상 행을 가리키는 자식 데이터를 cascade로 지우지 않는다.
    FOR unknown_ref IN SELECT c.conrelid::regclass AS rel, a.attname FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1] WHERE c.contype='f' AND c.confrelid='public.celeb_contents'::regclass LOOP
      EXECUTE format('SELECT count(*) FROM %s WHERE %I::text=$1', unknown_ref.rel, unknown_ref.attname) INTO dependent_count USING row_pair.b->>'id';
      IF dependent_count>0 THEN RAISE EXCEPTION 'MERGE_REVIEW: celeb child references %', unknown_ref.rel; END IF;
    END LOOP;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM public.figure_book_contents WHERE content_id=keep_id) THEN
    INSERT INTO public.figure_book_contents(content_id) VALUES(keep_id);
    -- seed가 만든 표시용 제목 행은 실제 판본이 아니다. 기존 ISBN 없는 판본은 삭제하지 않는다.
    DELETE FROM public.figure_book_editions WHERE content_id=keep_id AND isbn IS NULL AND sources->>'primary'='none' AND sources->>'title' IN ('translated','romanized','original');
  END IF;
  -- catalog 생성 트리거가 만든 새 카드 판본 때문에 반대편 원판본 ID가 삭제되지 않게 한다.
  -- 원래 판본과 그 구매 참조는 보존하고, 이번 transaction에서 생긴 무참조 seed만 제거한다.
  DELETE FROM public.figure_book_editions seeded
    WHERE seeded.content_id=keep_id AND seeded.id NOT IN (${originalEditionIds}) AND seeded.isbn IS NOT NULL
      AND EXISTS(SELECT 1 FROM public.figure_book_editions original WHERE original.content_id=drop_id AND original.id IN (${originalEditionIds}) AND original.locale=seeded.locale AND original.isbn=seeded.isbn)
      AND NOT EXISTS(SELECT 1 FROM public.figure_book_products p WHERE p.edition_id=seeded.id);
  -- 같은 언어의 다른 ISBN 카드도 판본으로 보존한 뒤 대표 카드를 합친다.
  INSERT INTO public.figure_book_editions(content_id,locale,title,creator,description,isbn,publisher,thumbnail_url,verified,sources)
    SELECT CASE WHEN EXISTS(SELECT 1 FROM public.figure_book_contents f WHERE f.content_id=l.content_id) THEN l.content_id ELSE keep_id END,l.locale,l.title,l.creator,l.description,l.isbn,l.publisher,l.thumbnail_url,l.verified,l.sources
    FROM public.content_locales l WHERE l.content_id IN(keep_id,drop_id) AND (l.isbn IS NOT NULL OR coalesce(l.sources->>'primary','none')<>'none')
      AND NOT EXISTS(SELECT 1 FROM public.figure_book_editions e WHERE e.content_id IN(keep_id,drop_id) AND e.locale=l.locale AND (e.isbn=l.isbn OR (l.isbn IS NULL AND e.isbn IS NULL AND e.title=l.title AND e.sources IS NOT DISTINCT FROM l.sources)))
    ORDER BY CASE WHEN l.content_id=keep_id THEN 0 ELSE 1 END
    ON CONFLICT (content_id, locale, isbn) WHERE isbn IS NOT NULL DO NOTHING;
  UPDATE public.figure_book_characters a SET description=coalesce(nullif(a.description,''),b.description), description_en=coalesce(nullif(a.description_en,''),b.description_en), relation_type=CASE WHEN a.relation_type='authored' OR b.relation_type='authored' THEN 'authored' WHEN a.relation_type='appearance' OR b.relation_type='appearance' THEN 'appearance' ELSE a.relation_type END
    FROM public.figure_book_characters b WHERE a.content_id=keep_id AND b.content_id=drop_id AND a.celeb_id=b.celeb_id;
  DELETE FROM public.figure_book_characters b USING public.figure_book_characters a WHERE b.content_id=drop_id AND a.content_id=keep_id AND a.celeb_id=b.celeb_id;
  UPDATE public.figure_book_characters SET content_id=keep_id WHERE content_id=drop_id;
  FOR duplicate_edition IN SELECT * FROM public.figure_book_editions WHERE content_id=drop_id ORDER BY id LOOP
    canonical_id := NULL;
    IF duplicate_edition.isbn IS NOT NULL THEN SELECT id INTO canonical_id FROM public.figure_book_editions WHERE content_id=keep_id AND locale=duplicate_edition.locale AND isbn=duplicate_edition.isbn LIMIT 1; END IF;
    IF canonical_id IS NULL THEN UPDATE public.figure_book_editions SET content_id=keep_id WHERE id=duplicate_edition.id;
    ELSE
      -- 플랫폼 활성 상품 충돌은 버리지 않고 비활성 이력으로 모두 남긴다.
      UPDATE public.figure_book_products p SET is_active=false WHERE p.edition_id=duplicate_edition.id AND p.is_active AND EXISTS(SELECT 1 FROM public.figure_book_products q WHERE q.edition_id=canonical_id AND q.platform=p.platform AND q.is_active);
      UPDATE public.figure_book_products SET edition_id=canonical_id WHERE edition_id=duplicate_edition.id;
      UPDATE public.figure_book_editions a SET creator=coalesce(nullif(a.creator,''),duplicate_edition.creator), description=coalesce(nullif(a.description,''),duplicate_edition.description), publisher=coalesce(nullif(a.publisher,''),duplicate_edition.publisher), thumbnail_url=coalesce(a.thumbnail_url,duplicate_edition.thumbnail_url), release_date=coalesce(a.release_date,duplicate_edition.release_date), edition_kind=coalesce(a.edition_kind,duplicate_edition.edition_kind), text_scope=coalesce(a.text_scope,duplicate_edition.text_scope), verified=coalesce(a.verified,duplicate_edition.verified), sources=coalesce(duplicate_edition.sources,'{}'::jsonb)||coalesce(a.sources,'{}'::jsonb) WHERE a.id=canonical_id;
      DELETE FROM public.figure_book_editions WHERE id=duplicate_edition.id;
    END IF;
  END LOOP;
  UPDATE public.content_locales l SET content_id=keep_id WHERE content_id=drop_id AND NOT EXISTS(SELECT 1 FROM public.content_locales k WHERE k.content_id=keep_id AND k.locale=l.locale);
  UPDATE public.content_locales a SET creator=coalesce(nullif(a.creator,''),b.creator), description=coalesce(nullif(a.description,''),b.description), publisher=coalesce(nullif(a.publisher,''),b.publisher), thumbnail_url=coalesce(a.thumbnail_url,b.thumbnail_url), sources=coalesce(b.sources,'{}'::jsonb)||coalesce(a.sources,'{}'::jsonb)
    FROM public.content_locales b WHERE a.content_id=keep_id AND b.content_id=drop_id AND a.locale=b.locale AND a.isbn=b.isbn;
  DELETE FROM public.content_locales WHERE content_id=drop_id;
  UPDATE public.member_contents SET content_id=keep_id WHERE content_id=drop_id;
  UPDATE public.celeb_contents a SET review=coalesce(nullif(a.review,''),b.review),review_en=coalesce(nullif(a.review_en,''),b.review_en),source_url=coalesce(nullif(a.source_url,''),b.source_url)
    FROM public.celeb_contents b WHERE a.content_id=keep_id AND b.content_id=drop_id AND a.celeb_id=b.celeb_id;
  DELETE FROM public.celeb_contents b USING public.celeb_contents a WHERE b.content_id=drop_id AND a.content_id=keep_id AND a.celeb_id=b.celeb_id;
  UPDATE public.celeb_contents SET content_id=keep_id WHERE content_id=drop_id;
  ${['curated_list_items', 'flow_nodes', 'records', 'notes', 'activity_logs'].map(table => `UPDATE public.${table} SET content_id=keep_id WHERE content_id=drop_id;`).join('\n')}
  ${CONTENT_ARRAY_REFERENCES.map(arrayUpdateSql).join('\n')}
  DELETE FROM public.figure_book_contents WHERE content_id=drop_id;
  -- 모든 참조 이동을 확인한 뒤에만 원래 작품을 지운다.
  ${REFERENCE_TABLES.map(table => `IF EXISTS(SELECT 1 FROM public.${table} WHERE content_id=drop_id) THEN RAISE EXCEPTION 'MERGE_REVIEW: residual ${table} reference'; END IF;`).join('\n')}
  ${CONTENT_ARRAY_REFERENCES.map(ref => `IF EXISTS(SELECT 1 FROM public.${ref.table} WHERE ${arrayReferenceWhere(ref, 'drop_id')}) THEN RAISE EXCEPTION 'MERGE_REVIEW: residual ${ref.table}.${ref.column} array reference'; END IF;`).join('\n')}
  IF (SELECT count(*) FROM public.member_contents WHERE content_id=keep_id) <> ${snapshot.member_contents.length} THEN RAISE EXCEPTION 'MERGE_REVIEW: member row count changed'; END IF;
  IF (SELECT count(*) FROM public.celeb_contents WHERE content_id=keep_id) <> ${new Set(snapshot.celeb_contents.map(row => row.celeb_id)).size} THEN RAISE EXCEPTION 'MERGE_REVIEW: celeb relationships lost'; END IF;
  IF (SELECT count(*) FROM public.figure_book_characters WHERE content_id=keep_id) <> ${new Set(snapshot.figure_book_characters.map(row => row.celeb_id)).size} THEN RAISE EXCEPTION 'MERGE_REVIEW: character relationships lost'; END IF;
  IF (SELECT count(*) FROM public.figure_book_products p JOIN public.figure_book_editions e ON e.id=p.edition_id WHERE e.content_id=keep_id) <> ${snapshot.figure_book_products.length} THEN RAISE EXCEPTION 'MERGE_REVIEW: product history lost'; END IF;
  ${['records', 'notes', 'flow_nodes', 'curated_list_items', 'activity_logs'].map(table => `IF (SELECT count(*) FROM public.${table} WHERE content_id=keep_id) <> ${snapshot[table].filter(row => [pair.keep, pair.drop].includes(row.content_id)).length} THEN RAISE EXCEPTION 'MERGE_REVIEW: ${table} rows lost'; END IF;`).join('\n')}
  IF EXISTS(SELECT 1 FROM public.contents c WHERE c.id=keep_id AND (c.member_count IS DISTINCT FROM (SELECT count(*) FROM public.member_contents WHERE content_id=keep_id) OR c.celeb_count IS DISTINCT FROM (SELECT count(*) FROM public.celeb_contents WHERE content_id=keep_id) OR c.record_count IS DISTINCT FROM (SELECT count(*) FROM public.member_contents WHERE content_id=keep_id)+(SELECT count(*) FROM public.celeb_contents WHERE content_id=keep_id))) THEN RAISE EXCEPTION 'MERGE_REVIEW: content counters differ from relationships'; END IF;
  DELETE FROM public.contents WHERE id=drop_id;
END;
${delimiter};
COMMIT;
SELECT 'MERGE_COMMITTED';
`
}
