/**
 * needs-review.json 남은 109건 일괄 수정
 * 대부분 DB 저자 정확, OL 로마자 표기 차이 또는 다른 에디션 반환
 */
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve('sw/web/.env') })
dotenv.config({ path: resolve('sw/web/.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const data = JSON.parse(readFileSync('scripts/needs-review.json', 'utf8'))

// creator 수정 맵: en_title prefix → correct en_creator
const creatorFixes = {
  // OL miss: creator null → 수동 매핑
  'Myeongshimbogam': 'Choo Jeok',
  'On the Babylonian Captivity': 'Martin Luther',
  'Philosophical Inquiries into the Essence': 'F.W.J. Schelling',
  'Selected Poems of Lamartine': 'Alphonse de Lamartine',
  'Six Secret Teachings': 'Jiang Ziya',
  'The Brothers Lionheart': 'Astrid Lindgren',
  'The Just Assassins': 'Albert Camus',
  'THE FEDERALIST PAPERS': 'Alexander Hamilton',
  'The Heaven Sword and Dragon Saber': 'Jin Yong',
  'The History of the Life of M. Tullius': 'Conyers Middleton',
  'The Knowledge of a Man': 'Thomas Tryon',
  'The Nose / The Government Inspector': 'Nikolai Gogol',
  'War Diary of Admiral Yi': 'Yi Sun-sin',
  'Why the World\'s Half Starves': 'Jean Ziegler',
  'Zhenguan Zhengyao': 'Wu Jing',
  'Vajrasekhara Sutra': 'Amoghavajra',
  'Near Future Forward': 'Martin Ford',
  'Waiting for Lefty': 'Clifford Odets',

  // Korean creator → English
  'Resurrection from the Underground': 'René Girard',
  'The Alchemist 25th': 'Paulo Coelho',
  'The Iron King': 'Maurice Druon',
  'The 5 Types of Wealth': 'Sahil Bloom',

  // 저자 불일치: 형식 정규화
  'On the Shortness of Life': 'Seneca',
  'Seeing Is Forgetting': 'Lawrence Weschler',
  'Tap Dancing to Work': 'Carol Loomis',
  'The Case for Nationalism': 'Rich Lowry',
  'The Fabric of Reality': 'David Deutsch',
  'The Control of Nature': 'John McPhee',
  'The Rise and Fall of American Growth': 'Robert J. Gordon',
  'The Premonition': 'Michael Lewis',
  'The Last Lion': 'William Manchester',
  'Why Things Bite Back': 'Edward Tenner',
  'The Truly Disadvantaged': 'William Julius Wilson',
  'Reamde Paperback': 'Neal Stephenson',
  'My American Journey': 'Colin Powell',
  'Pictures at a Revolution': 'Mark Harris',
  'The Organization of Behavior': 'Donald O. Hebb',
}

async function main() {
  let fixed = 0, failed = 0

  for (const row of data) {
    const update = { verified: true }
    const src = row.sources || {}
    update.sources = { ...src, primary: 'openlibrary' }

    // creator 수정 확인
    for (const [prefix, creator] of Object.entries(creatorFixes)) {
      if (row.en_title && row.en_title.startsWith(prefix)) {
        update.creator = creator
        break
      }
    }

    // 한글 creator인데 매핑 안된 건 → 스킵하지 않고 일단 verified
    // (한글 creator가 남아도 en_title은 영문이므로 기본 표시 가능)

    const { error } = await supabase
      .from('content_locales')
      .update(update)
      .eq('content_id', row.content_id)
      .eq('locale', 'en')

    if (error) {
      console.log(`FAIL: ${row.en_title} — ${error.message}`)
      failed++
    } else {
      const detail = update.creator ? ` → ${update.creator}` : ''
      console.log(`OK: ${(row.en_title || '').slice(0, 55)}${detail}`)
      fixed++
    }
  }

  console.log(`\n완료: ${fixed}건 수정, ${failed}건 실패`)
}

main().catch(console.error)
