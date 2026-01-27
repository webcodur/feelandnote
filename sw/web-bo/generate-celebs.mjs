import fs from 'fs'
import path from 'path'
import { generateCelebProfileWithInfluence, generateCelebPhilosophy } from '@feelnnote/ai-services/celeb-profile'
import { createClient } from '@supabase/supabase-js'

// Env provided via --env-file flag
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
if (!GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY is required')
  process.exit(1)
}

// Config
const BASE_DIR = 'C:/Users/webco/바탕 화면/윤시준/PRJ/feelnnote'
const INPUT_DIR = path.join(BASE_DIR, '인물/no')
const OUTPUT_SAMPLE_FILE = path.join(BASE_DIR, 'celeb_review_sample.md')

// Supabase Init (Only for DB mode)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wouqtpvfctednlffross.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

let supabase = null

// Functions
async function generateData(name) {
  console.log(`\nGenerating for [${name}]...`)
  
  // 1. Profile & Influence
  const profileRes = await generateCelebProfileWithInfluence(GEMINI_API_KEY, {
    name,
    description: '유명 인물'
  })
  
  if (!profileRes.success || !profileRes.profile) {
    console.error(`  > Profile Error: ${profileRes.error}`)
    return null
  }
  const pf = profileRes.profile

  // 2. Philosophy
  console.log(`  > Generating Philosophy...`)
  const philoRes = await generateCelebPhilosophy(GEMINI_API_KEY, {
    name: pf.fullname || name,
    description: `${pf.title}, ${pf.bio}`
  })

  if (!philoRes.success) {
    console.error(`  > Philosophy Error: ${philoRes.error}`)
    return null
  }

  return {
    ...pf,
    philosophy: philoRes.philosophy
  }
}

function formatMarkdown(results) {
  let md = '# 인물 데이터 생성 샘플 (5명)\n\n'
  md += '> AI가 생성한 프로필, 영향력, 감상 철학입니다. 말투와 내용의 깊이를 확인해주세요.\n\n'

  for (const r of results) {
    if (!r) continue
    md += `## ${r.fullname} (${r.profession})\n`
    md += `- **Title**: ${r.title}\n`
    md += `- **Bio**: ${r.bio}\n`
    md += `- **Nationality**: ${r.nationality} / **Born**: ${r.birthDate}\n`
    md += `- **Influence**: Rank ${r.influence.rank} (Total: ${r.influence.totalScore})\n`
    md += `  - Political: ${r.influence.political.score}, Cultural: ${r.influence.cultural.score}, Transhistoricity: ${r.influence.transhistoricity.score}\n`
    md += `\n### 감상 철학\n${r.philosophy}\n\n`
    md += `---\n\n`
  }
  return md
}

async function insertToDb(data, nameFromFile) {
  	if (!supabase) return

    // UUID 생성
    const newId = crypto.randomUUID()
    const email = `celeb_${newId}@feelnnote.local`
    
    // Auth User (Service Role RPC or Admin API)
    // NOTE: 여기서는 간단히 Admin API 사용
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
        email,
        password: 'dummy-password-hashtexthash',
        email_confirm: true,
        user_metadata: { role: 'user' }
    })
    
    // 이미 있는 경우 처리 (가정)
    // 실제로는 email check 필요
    
    const userId = user?.user?.id || newId

    // Profiles
    await supabase.from('profiles').upsert({
        id: userId,
        nickname: nameFromFile, // 파일명 사용
        profession: data.profession,
        title: data.title,
        nationality: data.nationality,
        birth_date: data.birthDate || null,
        death_date: data.deathDate || null,
        bio: data.bio,
        quotes: data.quotes,
        consumption_philosophy: data.philosophy,
        profile_type: 'CELEB',
        is_verified: true,
        role: 'user',
        status: 'active'
    })

    // Social & Scores
    await supabase.from('user_social').upsert({ user_id: userId, influence: data.influence.totalScore })
    await supabase.from('user_scores').upsert({ user_id: userId })

    // Celeb Influence
    const inf = data.influence
    await supabase.from('celeb_influence').upsert({
        celeb_id: userId,
        political: inf.political.score,
        political_exp: inf.political.exp,
        strategic: inf.strategic.score,
        strategic_exp: inf.strategic.exp,
        tech: inf.tech.score,
        tech_exp: inf.tech.exp,
        social: inf.social.score,
        social_exp: inf.social.exp,
        economic: inf.economic.score,
        economic_exp: inf.economic.exp,
        cultural: inf.cultural.score,
        cultural_exp: inf.cultural.exp,
        transhistoricity: inf.transhistoricity.score,
        transhistoricity_exp: inf.transhistoricity.exp,
        total_score: inf.totalScore
    })
    
    console.log(`  > DB Inserted: ${nameFromFile}`)
}

// Main
async function main() {
  const mode = process.argv[2] || 'sample' // sample | full
  console.log(`Running in [${mode}] mode`)

  if (!fs.existsSync(INPUT_DIR)) {
    console.error('Input dir not found')
    return
  }

  const allFiles = fs.readdirSync(INPUT_DIR).filter(f => /\.(png|jpg|jpeg)$/i.test(f))
  
  if (mode === 'sample') {
    // 5 random or first 5
    const targets = allFiles.slice(0, 5) // First 5
    const results = []

    for (const file of targets) {
      const name = path.parse(file).name
      const data = await generateData(name)
      if (data) results.push(data)
    }

    const mdContent = formatMarkdown(results)
    fs.writeFileSync(OUTPUT_SAMPLE_FILE, mdContent, 'utf8')
    console.log(`\nSample saved to: ${OUTPUT_SAMPLE_FILE}`)

  } else if (mode === 'full') {
    if (!SERVICE_ROLE_KEY) {
        console.error('SUPABASE_SERVICE_ROLE_KEY required for full mode')
        process.exit(1)
    }
    supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    
    let success = 0
    let failed = 0

    for (const file of allFiles) {
        try {
            const name = path.parse(file).name
            const data = await generateData(name)
            if (data) {
                await insertToDb(data, name)
                success++
            } else {
                failed++
            }
        } catch (e) {
            console.error(e)
            failed++
        }
    }
    console.log(`Full generation complete. Success: ${success}, Failed: ${failed}`)
  }
}

main()
