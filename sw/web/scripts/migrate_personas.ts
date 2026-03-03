import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables (ensure .env exists in sw/web with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Requires service role to bypass RLS for migration
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !openaiKey) {
  console.error("Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY).");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });

// Function to generate persona using OpenAI
async function generatePersonaForCeleb(nickname: string, title?: string, bio?: string) {
  const prompt = `
당신은 역사적, 문학적, 철학적 인물들의 심층적인 내면과 성향을 분석하는 전문가입니다.
인물: ${nickname}
수식어: ${title || '없음'}
설명: ${bio || '없음'}

이 인물의 생애와 업적을 바탕으로 다음 16가지 성향 스탯(0-100)과 그 평가 이유(reason, 2문장 이내)를 포함한 JSON 객체를 생성해 주세요.
반드시 아래 제시된 JSON 형식으로만 응답해야 합니다. 코멘트나 마크다운 기호를 포함하지 말고 순수 JSON만 출력하세요.

스탯 항목:
1. temperance (절제)
2. diligence (근면)
3. reflection (성찰)
4. courage (용기)
5. loyalty (충성/신의)
6. benevolence (인/자비)
7. fairness (공정성)
8. humility (겸손)
9. command (지휘/통솔)
10. martial (무용/신체적 투쟁)
11. intellect (지력)
12. charm (매력)
13. pessimism_optimism (비관-낙관)
14. conservative_progressive (보수-진보)
15. individual_social (개인-사회)
16. cautious_bold (신중-과감)

{
  "temperance": { "score": 숫자, "reason": "이유 텍스트" },
  "diligence": { "score": 숫자, "reason": "이유 텍스트" },
... (나머지 14개 항목 동일하게 작성)
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Empty response from OpenAI");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error generating persona for ${nickname}:`, error);
    return null;
  }
}

async function migratePersonas() {
  console.log("Starting Persona Migration Process...");

  // 1. Fetch all profiles where profile_type is 'CELEB'
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('id, nickname, title, bio')
    .eq('profile_type', 'CELEB');

  if (fetchError || !profiles) {
    console.error("Failed to fetch celebrities:", fetchError);
    return;
  }

  console.log(`Found ${profiles.length} celebrities to process.`);

  let successCount = 0;
  let failCount = 0;

  // Process sequentially to be safe with rate limits (or use Promise.all in small chunks if needed)
  for (let i = 0; i < profiles.length; i++) {
    const celeb = profiles[i];
    console.log(`[${i + 1}/${profiles.length}] Processing ${celeb.nickname}...`);

    const personaData = await generatePersonaForCeleb(celeb.nickname, celeb.title, celeb.bio);

    if (personaData) {
      // Upsert into celeb_persona
      const { error: upsertError } = await supabase
        .from('celeb_persona')
        .upsert({
          celeb_id: celeb.id,
          persona: personaData, // This maps to the new JSONB 'persona' column
          updated_at: new Date().toISOString()
        }, { onConflict: 'celeb_id' });

      if (upsertError) {
        console.error(`  -> Failed to save DB for ${celeb.nickname}:`, upsertError.message);
        failCount++;
      } else {
        console.log(`  -> Successfully updated DB for ${celeb.nickname}`);
        successCount++;
      }
    } else {
      failCount++;
    }

    // Optional: Add a small delay to avoid hitting OpenAI rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log("-----------------------------------------");
  console.log("Migration Complete!");
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
}

migratePersonas();
