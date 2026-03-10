# DB 스키마 - 셀럽

Supabase 프로젝트 ID: `wouqtpvfctednlffross`

## 셀럽 테이블
- **`celeb_influence`**: 영향력 6축(political/strategic/tech/social/economic/cultural, 각 0~10) + transhistoricity(0~40) = total_score(0~100)
- **`celeb_persona`**: 인물 페르소나 수치. **3개 카테고리를 반드시 구분할 것** (단일원천: `sw/web/src/lib/persona/constants.ts`)
  - **덕목 8개** (VirtueKey, 0~100): temperance 절제, diligence 근면, reflection 성찰, courage 용기, loyalty 충의, benevolence 인애, fairness 공정, humility 겸양
  - **능력 4개** (AbilityKey, 0~100): command 통솔, martial 무력, intellect 지력, charm 매력
  - **성향 4개** (TendencyKey, -50~+50): pessimism_optimism, conservative_progressive, individual_social, cautious_bold
  - **rationale** (text): 페르소나 수치에 대한 역사적/비평적 근거 (해설지). 사용자의 납득을 위한 필수 데이터
  - **i18n**: persona jsonb 내 `reason`/`reason_en`, `rationale`/`rationale_en` 이중 구조
  - ⚠️ 덕목(품성)과 능력(역량)은 별개. 덕목을 능력으로 취급하거나 혼용 금지
- **`profiles.speech_tone`** (text): 말투 6종 (loyal/composed/bold/humble/gentle/free). 패권 게임 대사 톤 결정. **profiles 테이블에 직접 존재** (celeb_persona 아님). Speech 트랙 룰북: `celeb-7-speech.md`
- **`celeb_dialogues`**: 인물별 고유 대사(**dialogueLines**). celeb_id(PK, profiles FK), lines(JSONB: 7상황×3변형=21개 대사. greeting/select/deploy/battle_win/battle_draw/battle_lose/clash_attack)
  - **dialogueLines**: DB 개인화 대사 (celeb_dialogues 테이블). 인물별 고유 대사
  - **defaultLines**: 톤별 범용 대사 (코드 하드코딩). speech_tone 6종 기반. DB 개인화 불필요한 부수적 인터랙션에서 사용
- **`celeb_tags`** / **`celeb_tag_assignments`**: 스포트라이트 태그 (is_featured, 기간 설정)
- **퍼블릭 도메인 셀럽**: 1920년 이전 사망자. 게임 등에서 활용. `isPublicDomainCeleb()` 함수로 필터링 (`death_date` 존재 + 빈 문자열 아님 + 연도 ≤ 1920)

## 셀럽 작업 룰북

셀럽 데이터 생성·수정 시 반드시 해당 룰북을 읽고 따른다.

| # | 단계 | 룰북 경로 |
|---|------|----------|
| 1 | 기본 정보 | `docs/project/celeb/celeb-1-basic-profile.md` |
| 2 | 콘텐츠 수집 | `docs/project/celeb/celeb-2-content-collector.md` |
| 3 | 감상 철학 | `docs/project/celeb/celeb-3-philosophy.md` |
| 4 | 영향력 평가 | `docs/project/celeb/celeb-4-influence.md` |
| 5 | 페르소나 | `docs/project/celeb/celeb-5-persona.md` |
| 6 | 큐 관리 | `docs/project/celeb/celeb-6-queue.md` |
| 7 | Speech 트랙 | `docs/project/celeb/celeb-7-speech.md` |
| 8 | 고유 대사 | `docs/project/celeb/celeb-8-dialogue.md` |
| 9 | 명언 검수 | `docs/project/celeb/celeb-9-quotes.md` |
