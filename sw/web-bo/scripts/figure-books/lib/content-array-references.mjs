// @ts-check
/** 실제 작품 ID 배열의 저장 형태. 감사·통합·DB 방어가 같은 목록을 사용한다. */
/**
 * @typedef {Readonly<
 *   { table: 'flow_nodes', column: 'bonus_content_ids', shape: 'array', storage: 'jsonb' } |
 *   { table: 'flows', column: 'tiers', shape: 'tiers', storage: 'jsonb' } |
 *   { table: 'tier_lists', column: 'tiers', shape: 'tiers', storage: 'jsonb' } |
 *   { table: 'tier_lists', column: 'unranked', shape: 'array', storage: 'text[]' } |
 *   { table: 'faction_lv2', column: 'theme_book_ids', shape: 'array', storage: 'text[]' }
 * >} ContentArrayReference
 */
/** @type {ContentArrayReference[]} */
const references = [
  { table: 'flow_nodes', column: 'bonus_content_ids', shape: 'array', storage: 'jsonb' },
  { table: 'flows', column: 'tiers', shape: 'tiers', storage: 'jsonb' },
  { table: 'tier_lists', column: 'tiers', shape: 'tiers', storage: 'jsonb' },
  { table: 'tier_lists', column: 'unranked', shape: 'array', storage: 'text[]' },
  { table: 'faction_lv2', column: 'theme_book_ids', shape: 'array', storage: 'text[]' },
]

/** @type {readonly ContentArrayReference[]} */
export const CONTENT_ARRAY_REFERENCES = Object.freeze(references.map(ref => Object.freeze(ref)))
