/**
 * PostgREST 1,000행 상한 회피용 페이징.
 *
 * PostgREST는 응답을 서버 측 설정(db-max-rows)으로 1,000행에서 자른다.
 * `.limit(3000)`이나 `Range: 0-4999`를 줘도 뚫리지 않는다(실측: celeb_persona 1,577행 →
 * 어느 쪽이든 1,000행만 수신). 그래서 전량이 필요하면 나눠 받는 수밖에 없다.
 *
 * ⚠️ 호출자는 반드시 **고유 키로 order를 걸어야 한다.**
 * 정렬 없는 offset 페이징은 페이지 사이 행 순서가 보장되지 않아 중복·누락이 생긴다.
 *
 * 대량 행을 그냥 끌어오는 용도가 아니다 — 계산에 전수가 필요하고 결과를
 * `unstable_cache`로 공유하는 경우에만 쓴다. 카운트만 필요하면
 * `head:true count:'exact'`를, 상위 N건만 필요하면 SQL 함수를 쓴다.
 *
 * 순수 함수다 — supabase 클라이언트에 의존하지 않고 `page(from, to)` 콜백만 받는다.
 * sw/web·sw/web-bo 양쪽이 공유한다.
 */

/** PostgREST 서버 상한과 동일 (이보다 크게 잡아도 서버가 자른다) */
const ROWS_PER_PAGE = 1000
const IDS_PER_CHUNK = 200

export async function selectAllPages<T>(
  page: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  max = Infinity
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; from < max; from += ROWS_PER_PAGE) {
    const to = Math.min(from + ROWS_PER_PAGE, max) - 1
    const { data, error } = await page(from, to)
    // 조용한 폴백 금지 — 부분 수신을 전량으로 오인하면 결과가 소리 없이 틀어진다
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < to - from + 1) break // 마지막 페이지
  }
  return rows
}

/**
 * UUID 목록을 PostgREST URL 한도보다 작은 묶음으로 나눠 조회한다.
 * `.in()` 대상이 수백 건이면 요청 자체가 실패하므로 빈 결과로 대체하지 않고 즉시 오류를 낸다.
 */
export async function selectInChunks<T>(
  ids: string[],
  query: (
    chunk: string[]
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const chunks: string[][] = []
  for (let index = 0; index < ids.length; index += IDS_PER_CHUNK) {
    chunks.push(ids.slice(index, index + IDS_PER_CHUNK))
  }

  const results = await Promise.all(chunks.map((chunk) => query(chunk)))
  const rows: T[] = []
  for (const { data, error } of results) {
    if (error) throw new Error(error.message)
    if (data) rows.push(...data)
  }
  return rows
}
