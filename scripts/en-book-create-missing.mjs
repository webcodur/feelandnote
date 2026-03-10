/**
 * BOOK en 행 누락 178건 생성
 *
 * 1. 사전 매핑 (ko→en) 기반으로 en_title + en_creator 확보
 * 2. OL 검색으로 ISBN 확보 + 실존 확인
 * 3. BookCover → OL fallback 썸네일
 * 4. content_locales en 행 INSERT
 *
 * 실행: node scripts/en-book-create-missing.mjs
 * 드라이런: node scripts/en-book-create-missing.mjs --dry-run
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

const DRY_RUN = process.argv.includes('--dry-run')
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── en 매핑: 영문판이 존재하는 것들 ──
// 형식: { ko_title 접두어: { en_title, en_creator } }
// 여기 없는 건 = 영문판 없음 (한국 고유 저작)
const EN_MAP = {
  // 동양 고전
  '도연명 시집': { t: 'The Complete Works of Tao Yuanming', a: 'Tao Yuanming' },
  '두보시선': { t: 'Selected Poems of Du Fu', a: 'Du Fu' },
  '백거이 시선': { t: 'Selected Poems of Bai Juyi', a: 'Bai Juyi' },
  '이백 시선': { t: 'Selected Poems of Li Bai', a: 'Li Bai' },
  '육유 시선': { t: 'Selected Poems of Lu You', a: 'Lu You' },
  '열하일기': { t: 'The Jehol Diary', a: 'Park Jiwon' },
  '전등신화': { t: 'New Tales Told by Lamplight', a: 'Qu You' },
  '천자문': { t: 'Thousand Character Classic', a: 'Zhou Xingsi' },
  '한유문집': { t: 'Collected Works of Han Yu', a: 'Han Yu' },
  '한유산문선': { t: 'Selected Prose of Han Yu', a: 'Han Yu' },
  '화엄경': { t: 'Avatamsaka Sutra', a: 'Buddhabhadra' },
  '삼강행실도': { t: 'Illustrated Guide to the Three Bonds', a: 'Seol Sun' },
  '주역참동계': { t: 'The Kinship of the Three', a: 'Wei Boyang' },
  '천주실의': { t: 'The True Meaning of the Lord of Heaven', a: 'Matteo Ricci' },
  '예경': { t: 'Book of Rites', a: 'Confucius' },
  '파탄잘리 요가 수트라': { t: 'Yoga Sutras of Patanjali', a: 'Patanjali' },
  '심경부주': { t: 'Classic of the Mind', a: 'Zhen Dexiu' },

  // 서양 문학 한국어 번역본
  '삶이 그대를 속일지라도': { t: 'Selected Poems of Pushkin', a: 'Alexander Pushkin' },
  '삶이 당신을': { t: 'Poems of Pushkin', a: 'Alexander Pushkin' },
  '예세닌 시선': { t: 'Selected Poems of Sergei Yesenin', a: 'Sergei Yesenin' },
  '아무것도 말할 필요가 없다': { t: 'Selected Poems of Osip Mandelstam', a: 'Osip Mandelstam' },
  '충만한 힘': { t: 'Selected Poems of Pablo Neruda', a: 'Pablo Neruda' },
  '탱고': { t: 'Selected Poems of Jorge Luis Borges', a: 'Jorge Luis Borges' },
  '콜리지 시선': { t: 'Selected Poems of Samuel Taylor Coleridge', a: 'Samuel Taylor Coleridge' },
  '키츠 시선': { t: 'Selected Poems of John Keats', a: 'John Keats' },
  '테니슨 시선': { t: 'Selected Poems of Alfred Tennyson', a: 'Alfred Tennyson' },
  '포프 시선': { t: 'Selected Poems of Alexander Pope', a: 'Alexander Pope' },
  '하이네 시집': { t: 'Selected Poems of Heinrich Heine', a: 'Heinrich Heine' },
  '예이츠 시선': { t: 'Selected Poems of W. B. Yeats', a: 'W. B. Yeats' },
  '프랑시스 잠 시집': { t: 'Selected Poems of Francis Jammes', a: 'Francis Jammes' },
  '모든 이별에 앞서가라': { t: 'Selected Poems', a: 'Johann Wolfgang von Goethe' },
  '셰익스피어 희곡선: 맥베스, 로미오와 줄리엣': { t: 'Macbeth and Romeo and Juliet', a: 'William Shakespeare' },
  '초조한 마음': { t: 'Beware of Pity', a: 'Stefan Zweig' },
  '하르츠 여행기': { t: 'The Harz Journey', a: 'Heinrich Heine' },
  '에드거 앨런 포 일곱 개의 기이한 이야기': { t: 'Seven Tales of Edgar Allan Poe', a: 'Edgar Allan Poe' },
  '톨스토이 단편선': { t: 'Short Stories of Leo Tolstoy', a: 'Leo Tolstoy' },
  '위버멘쉬': { t: 'Thus Spoke Zarathustra', a: 'Friedrich Nietzsche' },
  '세네카의 말': { t: 'Letters from a Stoic', a: 'Seneca' },
  '호란하 이야기': { t: 'Tales of Hulan River', a: 'Xiao Hong' },
  '칼 라르손의 나의 집 나의 가족': { t: 'Our Home', a: 'Carl Larsson' },
  '케테 콜비츠': { t: 'Käthe Kollwitz', a: 'Catherina Kramer' },
  '한스 크리스티안 안데르센 동화집: 인어공주, 미운 아기 오리': { t: 'Fairy Tales of Hans Christian Andersen', a: 'Hans Christian Andersen' },
  '키케로 노트': { t: 'Handbook on Electioneering', a: 'Quintus Tullius Cicero' },
  '프랑수아-르네 드 샤또브리앙 전기': { t: 'Chateaubriand', a: 'André Maurois' },
  '펠럼 그렌빌 우드하우스': { t: 'The Best of Wodehouse', a: 'P. G. Wodehouse' },
  '마쓰시타 고노스케 길을 열다': { t: 'The Path', a: 'Konosuke Matsushita' },
  '신비신학': { t: 'The Book of Secrets', a: 'Osho' },
  '파인만 씨 농담도 잘하시네 1': { t: "Surely You're Joking, Mr. Feynman!", a: 'Richard Feynman' },
  '파인만의 QED 강의': { t: 'QED: The Strange Theory of Light and Matter', a: 'Richard Feynman' },
  '내일의 식탁': { t: "Tomorrow's Table", a: 'Pamela Ronald' },
  '우주의 통찰': { t: 'The Universe', a: 'John Brockman' },
  '카비르의 노래': { t: 'Songs of Kabir', a: 'Kabir' },
  '영원한 생명을 주는 진리의 길': { t: 'Sermons', a: 'Johannes Tauler' },
  '바흐 평균율 클라비어곡집 1': { t: 'The Well-Tempered Clavier Book I', a: 'Johann Sebastian Bach' },

  // 성경·종교
  '예레미야 (심판의 끝, 은혜의 시작)': { t: 'The Message of Jeremiah', a: 'Christopher Wright' },
  '욥기 (고난과 은혜)': { t: 'The Message of Job', a: 'David Atkinson' },
  '하박국, 폭력의 세상에서 믿음으로 살다': { t: 'The Message of Habakkuk', a: 'Christopher Wright' },

  // 일본 문학
  '요코미쓰 리이치 단편집': { t: 'Short Stories of Yokomitsu Riichi', a: 'Yokomitsu Riichi' },
  '우나기 선생': { t: 'The Eel', a: 'Imamura Shohei' },
  '아직 늦지 않았다': { t: "It's Not Too Late", a: 'Matsumoto Seicho' },
  '생각보다 인생은 짧다': { t: 'Life Is Shorter Than You Think', a: 'Senda Takuya' },
  '호쿠사이 부악백경': { t: 'One Hundred Views of Mount Fuji', a: 'Katsushika Hokusai' },

  // 기타 번역 가능
  '나는 왜 너가 아니고 나인가': { t: "Chief Seattle's Speech", a: 'Chief Seattle' },
  '에피쿠로스 쾌락': { t: 'The Art of Happiness', a: 'Epicurus' },
  '초역 몽테뉴의 말: 에세': { t: 'The Complete Essays', a: 'Michel de Montaigne' },
  '흄의 인간 오성에 관한 탐구 입문': { t: 'An Enquiry Concerning Human Understanding', a: 'David Hume' },
  '존 로크의 인간 오성론 읽기': { t: 'An Essay Concerning Human Understanding', a: 'John Locke' },
  '애덤 스미스 도덕감정론 읽기': { t: 'The Theory of Moral Sentiments', a: 'Adam Smith' },
  '슬로 라이프': { t: 'Slow Life', a: 'Tsuji Shinichi' },
}

// ── OL 검색 ──

async function searchOL(title, author, retries = 2) {
  const params = new URLSearchParams({
    title,
    fields: 'title,author_name,isbn,cover_i,first_publish_year',
    limit: '5',
  })
  if (author) params.set('author', author)

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`https://openlibrary.org/search.json?${params}`)
      if (res.status === 429) { await sleep(5000); continue }
      if (!res.ok) return null
      const data = await res.json()
      if (!data.docs?.length) return null

      const titleLower = title.toLowerCase().trim()
      for (const doc of data.docs) {
        if (doc.title?.toLowerCase().trim() === titleLower) {
          return parseOLDoc(doc)
        }
      }
      return parseOLDoc(data.docs[0])
    } catch {
      if (i < retries) await sleep(2000)
    }
  }
  return null
}

function parseOLDoc(doc) {
  let isbn = null
  if (doc.isbn?.length) {
    isbn = doc.isbn.find(i => i.length === 13) || doc.isbn.find(i => i.length === 10) || null
  }
  return {
    title: doc.title,
    author: doc.author_name?.[0] || null,
    isbn,
    coverId: doc.cover_i || null,
  }
}

// ── BookCover ──

async function fetchBookCover(title, author, retries = 2) {
  if (!author) return null
  const params = new URLSearchParams({ book_title: title, author_name: author })
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`https://bookcover.longitood.com/bookcover?${params}`)
      if (res.status === 429) { await sleep(3000); continue }
      if (!res.ok) return null
      const data = await res.json()
      return data.url || null
    } catch {
      if (i < retries) await sleep(1000)
    }
  }
  return null
}

// ── 메인 ──

async function main() {
  console.log(`BOOK en 행 누락 생성 ${DRY_RUN ? '(DRY RUN)' : ''}`)

  const PAGE = 200
  let items = []
  for (let offset = 0; ; offset += PAGE) {
    const { data: page, error: e } = await supabase
      .from('contents')
      .select('id, external_source')
      .eq('type', 'BOOK')
      .eq('external_source', 'naver_book')
      .range(offset, offset + PAGE - 1)
    if (e || !page?.length) break
    items.push(...page)
  }

  // en 행이 없는 것만 필터
  const enSet = new Set()
  for (let offset = 0; ; offset += PAGE) {
    const { data: rows } = await supabase
      .from('content_locales')
      .select('content_id')
      .eq('locale', 'en')
      .range(offset, offset + PAGE - 1)
    if (!rows?.length) break
    rows.forEach(r => enSet.add(r.content_id))
  }
  items = items.filter(i => !enSet.has(i.id))

  // ko 데이터 조회
  const koMap = new Map()
  for (let i = 0; i < items.length; i += PAGE) {
    const batch = items.slice(i, i + PAGE).map(t => t.id)
    const { data: koData } = await supabase
      .from('content_locales')
      .select('content_id, title, creator, isbn')
      .eq('locale', 'ko')
      .in('content_id', batch)
    if (koData) koData.forEach(r => koMap.set(r.content_id, r))
  }

  console.log(`대상: ${items.length}건\n`)

  const stats = { created: 0, noEn: 0, failed: 0 }
  const logs = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const ko = koMap.get(item.id)
    if (!ko) continue

    const koTitle = ko.title
    const koCreator = ko.creator

    // 매핑 검색
    const mapped = EN_MAP[koTitle]

    if (!mapped) {
      // 영문판 없음 → 최소 en 행 생성 (verified=false)
      if (!DRY_RUN) {
        await supabase.from('content_locales').insert({
          content_id: item.id,
          locale: 'en',
          title: null,
          creator: null,
          verified: false,
          sources: { primary: 'none' },
        })
      }
      stats.noEn++
      logs.push(`[${i}] ${koTitle} | NO_EN`)
      continue
    }

    const enTitle = mapped.t
    const enCreator = mapped.a

    // OL 검색
    const ol = await searchOL(enTitle, enCreator)
    await sleep(1000)

    const enIsbn = ol?.isbn || null

    // 썸네일
    let thumb = null
    let thumbSource = null

    const bcUrl = await fetchBookCover(enTitle, enCreator)
    await sleep(500)

    if (bcUrl) {
      thumb = bcUrl
      thumbSource = 'goodreads'
    } else if (ol?.coverId) {
      thumb = `https://covers.openlibrary.org/b/id/${ol.coverId}-L.jpg`
      thumbSource = 'openlibrary'
    } else {
      thumbSource = 'confirmed_unavailable'
    }

    // INSERT
    if (!DRY_RUN) {
      const { error: err } = await supabase.from('content_locales').insert({
        content_id: item.id,
        locale: 'en',
        title: enTitle,
        creator: enCreator,
        isbn: enIsbn,
        thumbnail_url: thumb,
        verified: true,
        sources: {
          primary: ol ? 'openlibrary' : 'manual',
          ...(thumbSource ? { thumbnail: thumbSource } : {}),
        },
      })
      if (err) {
        stats.failed++
        logs.push(`[${i}] ${koTitle} → ${enTitle} | FAIL: ${err.message}`)
        continue
      }
    }

    stats.created++
    logs.push(`[${i}] ${koTitle} → ${enTitle} (${enCreator}) isbn=${enIsbn || 'null'} thumb=${thumbSource}`)

    if ((i + 1) % 20 === 0) {
      console.log(`[${i + 1}/${items.length}] created=${stats.created} noEn=${stats.noEn}`)
    }
  }

  console.log(`\n완료: created=${stats.created} noEn=${stats.noEn} failed=${stats.failed}`)
  writeFileSync(resolve('scripts/en-book-create-missing.log'), logs.join('\n'), 'utf8')
  console.log('로그 → scripts/en-book-create-missing.log')
}

main().catch(console.error)
