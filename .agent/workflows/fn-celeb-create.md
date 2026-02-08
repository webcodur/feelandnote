---
description: 셀럽 정보 생성처리
---

### 1. 작업 개요
본 워크플로우는 `feelandnote` 프로젝트에서 새로운 셀럽(Celeb) 정보를 생성할 때 따르는 절차입니다.
단순 데이터 입력이 아니라, **AI 룰북을 기반으로 고품질의 텍스트(감상 철학 등)를 생성**하고 DB에 반영하는 것이 핵심입니다.

### 2. 생성 절차
1. **AI 프롬프트 확인 및 생성**:
    - `packages/ai-services/src/prompts/celeb-profile-prompt.ts` 파일의 `PHILOSOPHY_PROMPT` 등을 확인합니다.
    - 특히 **감상 철학**은 '블라디미르 푸틴' 예시와 같이 4문단 구조, 단정적 어조, 구체적 콘텐츠 언급이 필수입니다.
    - **영향력 평가**는 `INFLUENCE_RULEBOOK_PROMPT`를 기준으로 점수를 산정합니다.

2. **데이터베이스 삽입 (SQL)**:
    - UI를 통하지 않고 직접 SQL을 실행하여 생성하는 경우 아래 템플릿을 사용합니다.
    - `id` 생성을 위해 `gen_random_uuid()`를 사용하고, `auth.users`, `profiles`, `user_social`, `user_scores`, `celeb_influence` 테이블을 순차적으로 초기화해야 합니다.

### 3. SQL 템플릿 (Copy & Paste)
```sql
DO $$
DECLARE
  new_id UUID := gen_random_uuid();
  new_email TEXT;
BEGIN
  new_email := 'celeb_' || new_id || '@feelandnote.local';

  -- 1. auth.users (더미 계정)
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role
  ) VALUES (
    new_id, 
    new_email, 
    '$2a$10$dummyhashdummyhashdummyhashdummyhashdummyhash', 
    now(), 
    '{"provider": "email", "providers": ["email"]}'::jsonb, 
    '{}'::jsonb, 
    'authenticated', 
    'authenticated'
  );

  -- 2. profiles (기본 정보 & 감상 철학)
  INSERT INTO public.profiles (
    id, nickname, profession, title, nationality, birth_date, death_date, 
    bio, quotes, consumption_philosophy, profile_type, is_verified, role, status
  ) VALUES (
    new_id,
    '[이름]', 
    '[직군코드: director|musician|visual_artist|humanities_scholar|social_scientist|scientist|leader...]',
    '[수식어]', 
    '[국가코드: KR|US...]', 
    'YYYY-MM-DD', 
    '', -- 사망일 (생존시 빈값)
    '[바이오]', 
    '[명언]', 
    E'[감상철학: 4문단 구조, 단정적 어조]', 
    'CELEB', 
    true,
    'user',
    'active'
  );

  -- 3. 초기화 (social, scores)
  INSERT INTO public.user_social (user_id, follower_count, following_count, friend_count, influence)
  VALUES (new_id, 0, 0, 0, 0);

  INSERT INTO public.user_scores (user_id, activity_score, title_bonus, total_score)
  VALUES (new_id, 0, 0, 0);

  -- 4. celeb_influence (영향력)
  INSERT INTO public.celeb_influence (
    celeb_id, 
    political, political_exp, 
    strategic, strategic_exp, 
    tech, tech_exp, 
    social, social_exp, 
    economic, economic_exp, 
    cultural, cultural_exp, 
    transhistoricity, transhistoricity_exp, 
    total_score
  ) VALUES (
    new_id, 
    0, '설명', -- political
    0, '설명', -- strategic
    0, '설명', -- tech
    0, '설명', -- social
    0, '설명', -- economic
    0, '설명', -- cultural
    0, '설명', -- transhistoricity
    0 -- total_score (합계)
  );
END $$;
```

---

### 4. 🚫 콘텐츠 등록 규칙 (필수 준수)

> [!CAUTION]
> AI가 셀럽의 추천 콘텐츠를 등록할 때 **외부 API에서 검증되지 않은 콘텐츠는 절대 등록하지 않습니다.**

#### 허용되는 등록 방법

| 콘텐츠 유형 | 검증 방법 | content_id 형식 |
|-------------|-----------|-----------------|
| **BOOK** | Naver Book API로 ISBN 검색 | ISBN (예: `9788937460470`) |
| **VIDEO** | TMDB API로 ID 검색 | `tmdb_123456` |
| **GAME** | IGDB API로 ID 검색 | `igdb-123456` |
| **MUSIC** | Spotify API로 ID 검색 | `spotify-xxxxx` |
| **CERTIFICATE** | Q-Net API로 검색 | `qnet-1234` |

#### 금지 사항

- ❌ `external_source = 'manual'` 로 등록하는 것 금지
- ❌ 임의로 `content_id`를 만들어 등록하는 것 금지 (예: `morgan_gutenberg_bible`)
- ❌ 외부 API에서 찾을 수 없는 고서, 필사본, 희귀 자료 등록 금지

#### 대안

- 해당 콘텐츠가 외부 API에 없는 경우: **등록하지 않음**
- 셀럽의 `consumption_philosophy`(감상 철학) 텍스트에서 언급하는 것으로 대체