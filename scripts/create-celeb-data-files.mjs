import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

config({ path: './sw/web/.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE = './docs/celeb-data';

async function main() {
  const { data: batch1, error: e1 } = await supabase
    .from('profiles')
    .select('id, nickname, profession, speech_tone')
    .eq('profile_type', 'CELEB')
    .order('nickname')
    .range(0, 999);

  const { data: batch2, error: e2 } = await supabase
    .from('profiles')
    .select('id, nickname, profession, speech_tone')
    .eq('profile_type', 'CELEB')
    .order('nickname')
    .range(1000, 1999);

  if (e1 || e2) { console.error(e1 || e2); process.exit(1); }
  const celebs = [...batch1, ...(batch2 || [])];

  let personaCount = 0;
  let dialogueCount = 0;

  for (const c of celebs) {
    const safeName = c.nickname.replace(/ /g, '_');
    const prof = c.profession || 'other';

    // persona
    const personaDir = join(BASE, 'persona', prof);
    const personaFile = join(personaDir, `${safeName}.json`);
    if (!existsSync(personaFile)) {
      const personaData = {
        celeb_id: c.id,
        nickname: c.nickname,
        profession: prof,
        temperance: 0, diligence: 0, reflection: 0, courage: 0,
        loyalty: 0, benevolence: 0, fairness: 0, humility: 0,
        command: 0, martial: 0, intellect: 0, charm: 0,
        pessimism_optimism: 0, conservative_progressive: 0,
        individual_social: 0, cautious_bold: 0,
        rationale: ""
      };
      writeFileSync(personaFile, JSON.stringify(personaData, null, 2), 'utf-8');
      personaCount++;
    }

    // dialogue
    const dialogueDir = join(BASE, 'dialogue', prof);
    const dialogueFile = join(dialogueDir, `${safeName}.json`);
    if (!existsSync(dialogueFile)) {
      const dialogueData = {
        celeb_id: c.id,
        nickname: c.nickname,
        profession: prof,
        speech_tone: c.speech_tone || "",
        lines: {
          greeting: ["", "", ""],
          answer: ["", "", ""],
          deploy: ["", "", ""],
          battle_win: ["", "", ""],
          battle_draw: ["", "", ""],
          battle_lose: ["", "", ""],
          clash_attack: ["", "", ""]
        }
      };
      writeFileSync(dialogueFile, JSON.stringify(dialogueData, null, 2), 'utf-8');
      dialogueCount++;
    }
  }

  console.log(`총 ${celebs.length}명`);
  console.log(`persona 파일 생성: ${personaCount}개`);
  console.log(`dialogue 파일 생성: ${dialogueCount}개`);
}

main();
