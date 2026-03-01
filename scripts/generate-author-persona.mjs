import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. 환경 변수 체크 (Node --env-file 플래그로 로드되었다고 가정)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wouqtpvfctednlffross.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
  console.error('필수 환경 변수(SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY)가 누락되었습니다.');
  console.error('실행 시 --env-file=sw/web-bo/.env 플래그를 사용했는지 확인하세요.');
  process.exit(1);
}

// 2. 초기화 (출력 파일 경로를 절대 경로로 고정하여 혼선 방지)
const OUTPUT_FILE = path.join(process.cwd(), 'tmp_author_personas.json');
console.log('Results will be saved to:', OUTPUT_FILE);

// 3. 페르소나 분석 프롬프트 템플릿
const SYSTEM_PROMPT = `
당신은 역사 및 문학 비평 전문가이자 게임 밸런스 설계자입니다.
제시된 인물의 생애와 업적을 분석하여 게임 시스템에 적합한 16가지 페르소나 수치와 해설지를 작성하세요.

### 수치 산정 규칙 (엄격 준수)
1. **덕목(8종) & 능력(4종)**: 0~100 범위.
   - 95~99: 인류사 불멸의 정점 (매우 드물게 부여)
   - 90~94: 동시대 최상위권 (준전설)
   - 80~89: 해당 분야의 전문가/우수자
   - 50~79: 평범하거나 준수한 수준
2. **성향(4종)**: -50 ~ +50 범위. 0은 중립.
3. **말투(Speech Tone)**: loyal, composed, bold, humble, gentle, free 중 하나 선택.
4. **해설지(Rationale)**: 해당 수치가 왜 그렇게 산정되었는지 역사적/문학적 근거를 바탕으로 1문단(150~300자)으로 정중하게 작성.

### 주의사항
- 문인(Author) 직군임을 고려하여 Intellect와 Reflection 수치를 정밀하게 조정하세요.
- Martial(무력)은 직접 전투 경험이 없는 작가의 경우 0~15 사이로 설정하세요.
- 인플레이션을 방지하기 위해 100점은 절대 부여하지 마세요 (최대 99).
`;

async function analyzeAuthor(author) {
  const prompt = `인물: ${author.nickname} (직군: author)
이 인물의 페르소나를 분석하여 다음 JSON 형식으로만 답변하세요:
{
  "temperance": 0, "diligence": 0, "reflection": 0, "courage": 0,
  "loyalty": 0, "benevolence": 0, "fairness": 0, "humility": 0,
  "command": 0, "martial": 0, "intellect": 0, "charisma": 0,
  "pessimism_optimism": 0, "conservative_progressive": 0,
  "individual_social": 0, "cautious_bold": 0,
  "speech_tone": "composed",
  "rationale": "..."
}`;

  try {
    const result = await model.generateContent([SYSTEM_PROMPT, prompt]);
    const response = await result.response;
    const text = response.text();
    // JSON 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('응답에서 JSON을 찾을 수 없습니다.');
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error(`[${author.nickname}] 분석 실패:`, error.message);
    return null;
  }
}

// 4. 메인 실행 루프
async function main() {
  console.log('🚀 문인(Author) 페르소나 분석 워커 가동...');

  // 1단계: 문인 목록 로드
  const { data: authors, error } = await supabase
    .from('profiles')
    .select('id, nickname')
    .eq('profile_type', 'CELEB')
    .eq('profession', 'author');

  if (error) throw error;
  console.log(`대상 인물: 총 ${authors.length}명`);

  const results = fs.existsSync(OUTPUT_FILE) 
    ? JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')) 
    : {};

  // 2단계: 순차 분석 (Gemini API 할당량 고려)
  for (let i = 0; i < authors.length; i++) {
    const author = authors[i];
    if (results[author.id]) {
      console.log(`[${i+1}/${authors.length}] ${author.nickname} - 이미 완료됨`);
      continue;
    }

    console.log(`[${i+1}/${authors.length}] ${author.nickname} 분석 중...`);
    const persona = await analyzeAuthor(author);
    
    if (persona) {
      results[author.id] = {
        nickname: author.nickname,
        ...persona
      };
      // 중간 저장 (안정성)
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf8');
    }

    // API Rate limit 방지를 위한 짧은 대기
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('✅ 모든 분석이 완료되었습니다. 결과 파일: ' + OUTPUT_FILE);
}

main().catch(console.error);
