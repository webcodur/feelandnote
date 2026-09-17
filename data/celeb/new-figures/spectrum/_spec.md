# 영향력·스펙트럼 채점 규격 (new-figures 초안)

실존 인물의 영향력 7축과 스펙트럼 16축을 채점한다.
정본: `docs/project/celeb/celeb-03-01-influence.md`, `celeb-03-02-spectrum.md`,
`packages/influence-constants/src/core.ts`, `packages/ai-services/src/prompts/influence-rulebook.ts`,
`packages/shared/src/constants/celeb-spectrum-scale.ts`, `sw/web-bo/scripts/lib/spectrum-reason-check.ts`.
인물은 미등록이라 DB 대신 이 초안에 쓴다.

## 출력

`data/celeb/new-figures/spectrum/_out/<배치명>.json` — 닉네임 키 객체:

```json
{
  "닉네임": {
    "influence": {
      "political": 0, "political_exp": "30자 이내 1문장", "political_exp_en": "…",
      "strategic": 0, "strategic_exp": "…", "strategic_exp_en": "…",
      "tech": 0, "tech_exp": "…", "tech_exp_en": "…",
      "social": 0, "social_exp": "…", "social_exp_en": "…",
      "economic": 0, "economic_exp": "…", "economic_exp_en": "…",
      "cultural": 0, "cultural_exp": "…", "cultural_exp_en": "…",
      "transhistoricity": 0, "transhistoricity_exp": "…", "transhistoricity_exp_en": "…"
    },
    "persona": {
      "abilities":      {"command":{"score":0,"reason_ko":"…","reason_en":"…"},
                         "martial":{...},"intellect":{...},"charm":{...}},
      "inner_virtues":  {"temperance":{...},"diligence":{...},"reflection":{...},"courage":{...}},
      "outer_virtues":  {"loyalty":{...},"benevolence":{...},"fairness":{...},"humility":{...}},
      "dispositions":   {"pessimism_optimism":{...},"conservative_progressive":{...},
                         "individual_social":{...},"cautious_bold":{...}},
      "rationale_ko": "…",
      "rationale_en": "…"
    }
  }
}
```

## 영향력 (influence)

- 6개 영역 각 0~10, transhistoricity 0~40. 인과적 기여만 센다(직접>구조적>촉매적, 연결 6단계 이상 인정 불가).
- 점수대: 9-10 글로벌 패러다임 전환 / 7-8 핵심 시스템 구축 / 5-6 국가·지역·분야 실질 영향 / 3-4 부분 기여 / 1-2 미미 / 0 무관.
- transhistoricity: 35-40 문명 근본 토대 / 28-34 패러다임 전환 정착 / 20-27 분야 토대 장기 지속 / 10-19 근현대 큰 영향 / 5-9 현대 영향·지속 불확실 / 0-4 동시대 한정.
- exp는 30자 이내 1문장. 추측·상관관계·미래 예측 금지. 전문 분야 밖은 낮게.

## 스펙트럼 (persona) — 16축

- 점수 범위: abilities·inner/outer virtues는 0~100 정수, dispositions는 -50~50 정수.
- **성향 부호 확인 필수**: 키 앞 단어가 마이너스다. pessimism_optimism(-=비관) conservative_progressive(-=보수) individual_social(-=개인) cautious_bold(-=신중).
- **conservative_progressive는 사회 질서(왕정·신분·인종·젠더·이민)에 대한 입장만 근거** — 직업·학문·예술 혁신이나 개인 진로 선택은 이 축이 아니다.
- **무력**: 등급제(무신 95+·맹장 85-94·용장 75-84·무인 65-74·문무 50-64·서생 35-49·허약 20-34·잔질 5-19). 전투 기록 없음≠저체력 — 비신체직은 서생이 기본, 잔질은 실제 장애·중증 기록 있을 때만. 피격·기아·학대 같은 수동 피해는 근거에서 뺀다. **여성은 산출 후 보정**: raw≥50이면 -15, 미만이면 round(15×점수/50), 최저 5.
- **통솔**: 사람 채용·배치·해임 권한, 예산·전략 결정, 지휘 계통 조직을 실제로 이끈 기록만. 근거에 인원 규모나 기간을 적는다. 판매고·팔로워→매력, 사상 영향→지력.
- **매력**: 생애 정점 기준(말년 하락·논란은 다른 축이 담는다).
- **범죄·유죄판결 자체를 다른 축 점수로 환산하지 않는다.**
- **중립대**: 근거가 없는 fairness·benevolence·temperance·reflection·humility는 48~52에 둔다. 단, 「사치 기록 없음」「판결 후 반성 기록 없음」처럼 부정 행위의 부재·확정 사건 뒤 태도는 점수 근거로 인정.
- 기준점 인물과 상대 비교로 자리를 잡는다(앵커 표는 `celeb-spectrum-scale.ts`의 SPECTRUM_ANCHORS — 코드 파일을 직접 읽어라).
- **BOTH 인물**(생제르맹 백작): 사료가 뒷받침하는 층만 근거. 불로불사·예언 같은 전승 서술은 어떤 축의 근거도 아니다. 사료층이 얇으면 얇은 대로 중립 근처에 둔다.

## 근거문(reason_ko·reason_en)

- **15~40자**, 화면 한 줄. 구체적 행적 한 문장. 가능하면 연도 포함.
- 「용감한 인물」「높은 지력」처럼 점수 되풀이 금지. 「일반적인」「평균」「정보 부족」「기본값」「통상적」「보통 수준」「평범」 금지(기계 검사 대상).
- **같은 근거문을 다른 인물과 공유 금지** — 사람마다 문장이 달라야 한다(2명 초과 공유 시 기계 검사 오류).
- 생존 연예 직군(musician·actor·influencer·athlete·model·comedian·director)의 사적 신상(질병·가족·열애·종교·MBTI)은 근거 금지 — 사망자·역사 인물은 해당 없음.

## 종합 해설(rationale_ko·rationale_en)

- 16축 나열이 아니라 두드러진 축과 충돌·보완 관계를 잇는 짧은 분석(3~5문장).
- 한국어: -다체, 첫 문장은 주어 생략, 「수치」「스탯」「~형 인물」 금지, 인과는 원인→결과 순, 한 문장에 절 둘까지, 마지막 문장은 사실로.
- 영어: 인물명·대명사 주어 유지, 한국어를 낱문장 직역하지 말고 같은 근거를 자연스럽게.

## 절차

1. 사실 수집: 원장 bio(`../<카테고리>.json`)와 타임라인(`../timelines/<카테고리>.json`)을 읽고, 부족하면 웹으로 행적 보강. 이 단계에서 점수를 매기지 않는다.
2. 미확인 항목은 짐작으로 메우지 않는다.
3. 앵커와 견주어 축별 점수를 정한다.
4. 확인한 사실만 근거문에 쓴다. 16축 전부 + 영향력 7축 + rationale 한영을 한 번에 완성한다.
