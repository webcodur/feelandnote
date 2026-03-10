/**
 * 셀럽 창작 서가 일괄 수집 — Wikidata notable works (P800) 파이프라인
 *
 * 1. profiles에서 author/humanities_scholar 셀럽 조회
 * 2. Wikidata Entity Search (nickname_en) → QID 확보
 * 3. SPARQL → notable works (en/ko 제목 + 출판연도)
 * 4. DB 매칭 (content_locales.title) → 있으면 content_id 연결
 * 5. 없으면 Naver Books 검색 → contents + content_locales INSERT → content_id 연결
 * 6. celeb_works INSERT
 *
 * 사용법:
 *   node scripts/celeb-works-wikidata.mjs                  # 전체
 *   node scripts/celeb-works-wikidata.mjs --dry-run        # DB 미수정
 *   node scripts/celeb-works-wikidata.mjs --offset 50      # 50번째부터
 *   node scripts/celeb-works-wikidata.mjs --limit 10       # 10명만
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { writeFileSync } from 'fs'

dotenv.config({ path: resolve('sw/web/.env') })
dotenv.config({ path: resolve('sw/web/.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const OFFSET = parseInt(args[args.indexOf('--offset') + 1]) || 0
const LIMIT = parseInt(args[args.indexOf('--limit') + 1]) || 99999

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── Wikidata description 매칭용 키워드 ──

const PROF_KEYWORDS = {
  author: ['writer', 'author', 'poet', 'novelist', 'playwright', 'essayist', 'literary'],
  humanities_scholar: ['philosopher', 'historian', 'theologian', 'scholar', 'thinker', 'jurist', 'philologist', 'political', 'reformer', 'monk', 'cleric', 'nun'],
  scientist: ['physicist', 'mathematician', 'scientist', 'astronomer', 'chemist', 'biologist', 'naturalist'],
}

function matchDescription(description, profession) {
  if (!description) return false
  const desc = description.toLowerCase()
  const keywords = PROF_KEYWORDS[profession] || []
  return keywords.some(kw => desc.includes(kw))
}

// ── Wikidata API ──

async function searchWikidataQID(nameEn, profession, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&limit=5&language=en&search=${encodeURIComponent(nameEn)}`
      const res = await fetch(url, { headers: { 'User-Agent': 'FeelandnoteBot/1.0' } })
      if (res.status === 429) { await sleep(5000); continue }
      if (!res.ok) return null
      const data = await res.json()
      if (!data.search?.length) return null

      // description 키워드 매칭으로 정확한 인물 선택
      for (const s of data.search) {
        if (matchDescription(s.description, profession)) {
          return { qid: s.id, label: s.label, description: s.description }
        }
      }
      // fallback: 1위 반환 (person 계열이면)
      const first = data.search[0]
      if (first.description && /\d{3,4}/.test(first.description)) {
        return { qid: first.id, label: first.label, description: first.description }
      }
      return null
    } catch {
      if (i < retries) await sleep(2000)
    }
  }
  return null
}

async function getNotableWorks(qid, retries = 2) {
  const sparql = `SELECT ?work ?workLabel ?workLabelKo ?date WHERE {
    wd:${qid} wdt:P800 ?work .
    OPTIONAL { ?work wdt:P577 ?date }
    OPTIONAL { ?work rdfs:label ?workLabelKo . FILTER(LANG(?workLabelKo) = "ko") }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
  }`

  for (let i = 0; i <= retries; i++) {
    try {
      const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`
      const res = await fetch(url, { headers: { 'User-Agent': 'FeelandnoteBot/1.0' } })
      if (res.status === 429) { await sleep(5000); continue }
      if (!res.ok) return []
      const data = await res.json()

      // 중복 제거 (같은 제목 다른 에디션)
      const seen = new Set()
      const works = []
      for (const b of data.results.bindings) {
        const en = b.workLabel?.value || ''
        if (!en || seen.has(en.toLowerCase())) continue
        seen.add(en.toLowerCase())
        works.push({
          en,
          ko: b.workLabelKo?.value || '',
          year: b.date?.value?.slice(0, 4) || null,
          wikidata_id: b.work?.value?.split('/').pop() || '',
        })
      }
      return works
    } catch {
      if (i < retries) await sleep(2000)
    }
  }
  return []
}

// ── Naver Books 검색 ──

async function searchNaverBooks(title, author) {
  if (!NAVER_CLIENT_ID) return null
  const query = author ? `${title} ${author}` : title
  const url = `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(query)}&display=5`
  try {
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
      },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.items?.length) return null

    // 제목 유사도로 최적 매칭
    const titleLower = title.toLowerCase().trim()
    for (const item of data.items) {
      const clean = item.title.replace(/<[^>]*>/g, '').trim()
      if (clean.toLowerCase().includes(titleLower) || titleLower.includes(clean.toLowerCase())) {
        return {
          title: clean,
          author: item.author?.replace(/<[^>]*>/g, '') || null,
          isbn: item.isbn?.split(' ').pop() || null,
          thumbnail: item.image || null,
          publisher: item.publisher || null,
          description: item.description?.replace(/<[^>]*>/g, '').slice(0, 500) || null,
        }
      }
    }
    // fallback: 1위
    const item = data.items[0]
    return {
      title: item.title.replace(/<[^>]*>/g, '').trim(),
      author: item.author?.replace(/<[^>]*>/g, '') || null,
      isbn: item.isbn?.split(' ').pop() || null,
      thumbnail: item.image || null,
      publisher: item.publisher || null,
      description: item.description?.replace(/<[^>]*>/g, '').slice(0, 500) || null,
    }
  } catch {
    return null
  }
}

// ── DB 매칭 ──

async function findContentByTitle(titleEn, titleKo) {
  // en 제목으로 검색
  if (titleEn) {
    const { data } = await supabase
      .from('content_locales')
      .select('content_id')
      .eq('locale', 'en')
      .ilike('title', titleEn)
      .limit(1)
    if (data?.length) return data[0].content_id
  }
  // ko 제목으로 검색
  if (titleKo) {
    const { data } = await supabase
      .from('content_locales')
      .select('content_id')
      .eq('locale', 'ko')
      .ilike('title', titleKo)
      .limit(1)
    if (data?.length) return data[0].content_id
  }
  return null
}

// ── contents + content_locales INSERT ──

async function createContent(work, naverData) {
  const externalId = naverData?.isbn || `wikidata-${work.wikidata_id}`
  const externalSource = naverData?.isbn ? 'naver_book' : 'wikidata'

  // 중복 체크
  const { data: existing } = await supabase
    .from('contents')
    .select('id')
    .eq('external_id', externalId)
    .maybeSingle()

  if (existing) return existing.id

  const { data: newContent, error } = await supabase
    .from('contents')
    .insert({
      type: 'BOOK',
      external_id: externalId,
      external_source: externalSource,
      release_date: work.year ? `${work.year}-01-01` : null,
    })
    .select('id')
    .single()

  if (error || !newContent) return null
  const contentId = newContent.id

  // ko locale
  if (naverData) {
    await supabase.from('content_locales').insert({
      content_id: contentId,
      locale: 'ko',
      title: naverData.title,
      creator: naverData.author,
      thumbnail_url: naverData.thumbnail,
      isbn: naverData.isbn,
      publisher: naverData.publisher,
      description: naverData.description,
      sources: { primary: 'naver_book' },
      verified: true,
    })
  } else if (work.ko) {
    await supabase.from('content_locales').insert({
      content_id: contentId,
      locale: 'ko',
      title: work.ko,
      sources: { primary: 'wikidata' },
      verified: false,
    })
  }

  // en locale
  if (work.en) {
    await supabase.from('content_locales').insert({
      content_id: contentId,
      locale: 'en',
      title: work.en,
      sources: { primary: 'wikidata' },
      verified: false,
    })
  }

  return contentId
}

// ── 메인 ──

async function main() {
  console.log('셀럽 창작 서가 수집 — Wikidata P800 파이프라인')
  console.log(`옵션: offset=${OFFSET}, limit=${LIMIT}, dry=${DRY_RUN}\n`)

  // 대상 셀럽 조회
  const { data: celebs, error } = await supabase
    .from('profiles')
    .select('id, nickname, nickname_en, profession')
    .not('celeb_tier', 'is', null)
    .in('profession', ['author', 'humanities_scholar'])
    .order('profession')
    .order('nickname')

  if (error) throw new Error(`DB 조회 실패: ${error.message}`)

  // 이미 celeb_works 있는 셀럽 제외
  const { data: existingWorks } = await supabase
    .from('celeb_works')
    .select('celeb_id')
  const existingSet = new Set(existingWorks?.map(w => w.celeb_id) || [])
  const targets = celebs.filter(c => !existingSet.has(c.id)).slice(OFFSET, OFFSET + LIMIT)

  console.log(`전체 ${celebs.length}명 중 미등록 ${targets.length}명 대상\n`)

  const stats = { success: 0, noQid: 0, noWorks: 0, worksInserted: 0, contentsCreated: 0, failed: 0 }
  const logs = []
  const failures = []

  for (let i = 0; i < targets.length; i++) {
    const celeb = targets[i]
    const label = `[${i + OFFSET}] ${celeb.nickname}`

    // Step 1: Wikidata QID
    const searchName = celeb.nickname_en || celeb.nickname
    const wd = await searchWikidataQID(searchName, celeb.profession)
    await sleep(500)

    if (!wd) {
      stats.noQid++
      logs.push(`${label} | QID 미매칭 (${searchName})`)
      failures.push({ ...celeb, reason: 'QID 미매칭' })
      continue
    }

    // Step 2: notable works
    const works = await getNotableWorks(wd.qid)
    await sleep(1200)

    if (!works.length) {
      stats.noWorks++
      logs.push(`${label} | QID=${wd.qid} 작품 0건`)
      failures.push({ ...celeb, reason: 'P800 없음', qid: wd.qid })
      continue
    }

    // Step 3~6: 각 작품 처리
    let celebWorksCount = 0
    for (const work of works) {
      // DB 매칭
      let contentId = await findContentByTitle(work.en, work.ko)

      if (!contentId && !DRY_RUN) {
        // Naver Books 검색 (ko 제목 우선, 없으면 en)
        const searchTitle = work.ko || work.en
        const naver = await searchNaverBooks(searchTitle, celeb.nickname)
        await sleep(300)

        contentId = await createContent(work, naver)
        if (contentId) stats.contentsCreated++
      }

      // celeb_works INSERT
      if (!DRY_RUN) {
        const insertData = {
          celeb_id: celeb.id,
          content_id: contentId || null,
          title: work.ko || work.en,
          title_en: work.en,
          role: 'author',
          work_type: 'BOOK',
          release_year: work.year ? parseInt(work.year) : null,
        }

        const { error: insertErr } = await supabase
          .from('celeb_works')
          .insert(insertData)

        if (insertErr) {
          // 중복이면 스킵
          if (insertErr.code === '23505') continue
          logs.push(`${label} | INSERT 실패: ${work.en} — ${insertErr.message}`)
          continue
        }
      }

      celebWorksCount++
      stats.worksInserted++
    }

    stats.success++
    logs.push(`${label} | QID=${wd.qid} | ${celebWorksCount}작품 등록`)

    // 진행 출력
    const done = i + 1
    if (done % 5 === 0 || done >= targets.length) {
      console.log(`[${done}/${targets.length}] ✓${stats.success} works=${stats.worksInserted} created=${stats.contentsCreated} noQid=${stats.noQid} noP800=${stats.noWorks}`)
    }
  }

  // ── 결과 ──
  console.log('\n===== 완료 =====')
  console.log(`성공: ${stats.success} | 작품등록: ${stats.worksInserted} | 콘텐츠생성: ${stats.contentsCreated}`)
  console.log(`QID미매칭: ${stats.noQid} | P800없음: ${stats.noWorks} | 실패: ${stats.failed}`)

  // 로그 저장
  const logFile = resolve('scripts/celeb-works-wikidata.log')
  writeFileSync(logFile, logs.join('\n'), 'utf8')
  console.log(`로그 → ${logFile}`)

  // 실패 목록
  if (failures.length) {
    const failFile = resolve('scripts/celeb-works-failures.json')
    writeFileSync(failFile, JSON.stringify(failures, null, 2), 'utf8')
    console.log(`실패 목록 → ${failFile} (${failures.length}건)`)
  }
}

main().catch(err => {
  console.error('치명적 오류:', err)
  process.exit(1)
})
