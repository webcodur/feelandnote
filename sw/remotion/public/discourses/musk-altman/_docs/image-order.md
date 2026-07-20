# 머스크 vs 알트만 — 쇼츠 1편 이미지 발주서

> **진행 순서:** STEP은 위에서부터 하나씩만 진행한다. 처음 만들 것은 STEP 1의 빈 배경 한 장뿐이다. STEP 2의 2인 대좌 컷이 완성·승인되기 전에는 STEP 3의 단독 서사 컷을 생성하지 않는다. 후보는 `_staging/`에 저장하고, 승인 전에는 `_background.png`·`images/_group.png`·`cast/`·`cast.json`·`turns.json`을 바꾸지 않는다.
>
> **승인본이 놓이는 자리:** 영상에 실제로 나가는 사진은 `images/`(공용 컷) 또는 `cast/<slug>/`(인물 컷)에 둔다. `_background.png`는 다음 컷을 생성할 때 쓰는 재료일 뿐 영상에 직접 나가지 않으므로 폴더 맨 위에 남긴다.

## 대상과 용도

- 대상: `Discourse-musk-altman-KO-S1`
- 대사 범위: `turns.json` T01~T05
- 화면: 1080×1920 세로 영상에 `object-fit: cover`로 들어가는 1:1 정사각 이미지
- 구도: 얼굴·손동작·핵심 소품을 정사각 이미지의 중앙 중단 영역에 자연스럽게 모은다.
- 인물 REF:
  - reference image 1 = 일론 머스크 — `_refs/elon-musk.png`
  - reference image 2 = 샘 알트만 — `_refs/sam-altman.png`

## 공통 비주얼

2015년의 공동창업 회의실과 2026년의 증언실이 한 공간으로 겹쳐진 야간 대좌 세트. 짙은 숯빛 미장 벽, 세로로 선 스모크드 글라스 패널, 낮은 무광 흑색 석재 테이블, 절제된 두 개의 의자만 둔다. 뒤쪽의 큰 반투명 백색 라이트 패널이 유일한 주광원이고, 왼쪽에는 탁한 적색 림라이트, 오른쪽에는 냉청색 림라이트가 아주 약하게 반사된다. 중앙 테이블 위에는 글자 없는 얇은 보관 문서철 한 개만 놓인다.

실제 풀프레임 카메라로 촬영한 편집 화보처럼 자연스러운 피부 질감, 살아 있는 눈, 미세한 필름 그레인, 얕은 피사계심도, 어둡고 깊은 그림자. 공간은 또렷하지만 인물보다 앞서지 않는다. 가구가 화면 하단을 크게 차지하지 않는다. 모든 표면은 무상표·무문자이고 화면·서버랙·케이블 장식 없이 건축과 빛만으로 긴장을 만든다.

---

## STEP 1 — 인물 없는 공통 배경

- 후보 산출: `_staging/_background-v1.png`
- 승인 산출: `_background.png`

```text
Use case: photorealistic-natural
Asset type: Discourse short-form video shared set
Primary request: Create an empty 1:1 square editorial photography set that merges a 2015 startup boardroom with the severe stillness of a 2026 deposition room.
Scene/backdrop: Dark charcoal plaster walls, tall smoked-glass panels, one low matte-black stone table and two restrained chairs set at a shallow angle toward each other. A single large frosted white light panel behind the set is the main light. A very subtle muted red reflection touches the left architecture and a very subtle cool blue reflection touches the right architecture. One thin unbranded archival folder rests at the shared center of the table.
Composition/framing: 1:1 square composition. Low, slightly oblique camera with a slim blurred glass edge in the foreground and layered foreground, midground and background depth. Keep the two seating positions and the central folder inside the central 55% portrait-safe area. The table remains low and does not dominate the lower frame. The set is ready for two people to be photographed together later.
Lighting/mood: Strong directional white key light, deep chiaroscuro shadows, restrained red and blue edge reflections, quiet confrontation.
Style/medium: A real editorial location photograph shot on a full-frame camera, 35mm lens, f/2.8, realistic stone, glass and fabric texture, slight film grain.
Constraints: Empty set with no people. Clean unbranded surfaces, no readable text, no logos or watermark.
```

## STEP 2 — 머스크·알트만 2인 대좌 컷

- 입력: `_staging/_background-v1.png` + 두 인물 REF
- 후보 산출: `_staging/_group-v1.png`
- 승인 산출: `images/_group.png`
  - ⚠️ 반드시 `images/` 안이다. 데이터에 폴더 없이 이름만 적은 사진(`_group.png`)은 렌더·편집기 모두 `images/` 하위에서 찾는다(`Discourse/utils.ts`의 `imgSrc`). 에피소드 폴더 맨 위에 두면 영상에서 사진이 통째로 빠지고 인물 이름 첫 글자만 뜬다.

```text
Use case: identity-preserve
Asset type: Discourse short-form video two-person confrontation tableau
Input images: Image 1 = the approved empty shared set; Image 2 = Elon Musk face identity reference; Image 3 = Sam Altman face identity reference.
Primary request: Photograph Elon Musk and Sam Altman together in one real shot inside the approved set, at the instant a private founding dispute turns into a formal confrontation.
Subject: Elon Musk occupies the inner-left seat, half risen with one hand planted naturally on the stone table, shoulders angled toward Sam, expression hard and questioning. Sam Altman occupies the inner-right seat, still seated upright with one hand resting near the thin archival folder, expression calm, controlled and unyielding. They meet each other's gaze; both recognizable three-quarter faces remain clearly visible. Their bodies, hands and furniture interactions are natural, anatomically correct and physically plausible.
Wardrobe: Musk wears a sharp charcoal-black jacket over a black crewneck. Altman wears a refined midnight-navy blazer over a dark navy crewneck. Distinct fabrics and silhouettes, tailored and understated.
Composition/framing: 1:1 square composition. Both men form one close conversational group inside the central 55% portrait-safe area, clearly separated and not overlapping. Low oblique camera, table edge as a restrained leading line, medium-wide framing from roughly upper thighs or seated knees upward. The space reads as a shared room, while both faces and the tension between them dominate.
Lighting/mood: Preserve the approved white key light and the subtle left red / right blue reflections. One camera, one light source, one color temperature and one film grain. Natural skin texture and pores, living eyes with catchlight, restrained tension, not waxy.
Identity constraints: Reference image 2 controls only Elon Musk's recognizable facial bone structure and identity. Reference image 3 controls only Sam Altman's recognizable facial bone structure and identity. Keep their facial structures distinctly different; never duplicate or blend one reference face into the other. Re-pose both men for this scene and naturally restyle hair and expressions; do not copy the original reference poses or bodies. Add eyeglasses only if the corresponding reference already shows them.
Constraints: Preserve the approved set geometry, materials and lighting. Unbranded, text-free scene with no watermark.
```

---

## STEP 3 — 단독 서사 컷 10장

> **STEP 2 대좌 컷 승인 뒤에만 진행한다.** 각 컷은 `_background.png` + 해당 인물 얼굴 REF를 입력으로 사용한다. 같은 날 같은 장소에서 같은 카메라와 광원으로 촬영한 커버리지처럼 이어져야 한다.

### 공통 생성 블록

```text
Use case: identity-preserve
Asset type: Discourse short-form video narrative portrait
Input images: Image 1 = approved shared set; Image 2 = the named person's face identity reference.
Primary request: Create the specified single-person narrative shot as coverage from the same confrontation, photographed in the exact same set with the same white key light, restrained red/blue reflections, color temperature, wardrobe continuity and film grain.
Composition/framing: 1:1 square composition. Keep the face, hands and any meaningful object naturally gathered in the central middle area. Frame from the upper thighs or seated knees upward, with modest headroom. The person dominates while the architectural set remains legible.
Style/medium: A real candid editorial photograph from a full-frame camera, natural skin texture and pores, living eyes with catchlight, slight film grain and shallow depth of field, not waxy.
Identity constraints: Preserve the recognizable facial bone structure and identity from the face reference. Naturally redesign hair and expression for this beat; do not copy the reference portrait's original pose or body. Add eyeglasses only if the reference already shows them.
Constraints: Only the named person is visible. Unbranded, text-free set and props, no watermark.
```

### 일론 머스크

| 파일 | 장면 지시 |
|---|---|
| `cast/elon-musk/01.png` | **같은 방에서 시작했다.** 테이블 끝에 앉아 몸을 빈 맞은편 자리 쪽으로 틀고, 한 손을 공동의 중앙을 향해 낮게 펴 보인다. 오래된 약속을 상기시키는 굳고 절제된 표정. 인물 소개 기본 이미지로도 사용한다. |
| `cast/elon-musk/02.png` | **지금 그 조직은 뭐지.** 자리에서 반쯤 일어나 한 손바닥을 테이블에 짚고 상대에게 답을 요구한다. 턱을 약간 내리고 시선은 날카롭지만 과장된 분노는 없다. |
| `cast/elon-musk/03.png` | **형태와 목적은 다르다.** 의자에 다시 앉아 몸을 반측면으로 두고, 닫힌 무문자 문서철의 모서리를 두 손가락으로 잡는다. 방어적이지만 확신에 찬 표정. |
| `cast/elon-musk/04.png` | **통제가 아니라 브레이크.** 스모크드 글라스 문 옆에 서서 문을 가로지르는 단순한 금속 손잡이에 한 손을 얹는다. 실제로 멈출 수 있는 사람이라는 태도, 낮고 단단한 시선. |
| `cast/elon-musk/05.png` | **존립 위험.** 배경의 백색 패널이 대부분 꺼진 듯 어두워지고 얼굴 한쪽만 차가운 빛에 남는다. 테이블 가장자리를 쥔 손과 멀리 향한 굳은 시선으로 위험의 크기를 보여준다. |

### 샘 알트만

| 파일 | 장면 지시 |
|---|---|
| `cast/sam-altman/01.png` | **질문은 먼저 당신이 받아야 한다.** 의자에 반듯이 앉아 두 손을 느슨하게 모으고 상대를 정면으로 바라본다. 조용하고 균형 잡힌 자신감. 인물 소개 기본 이미지로도 사용한다. |
| `cast/sam-altman/02.png` | **2015년 이메일.** 글자가 읽히지 않는 한 장의 보관 문서를 테이블 중앙으로 밀어 건네며 시선은 상대에게 고정한다. 증거를 과시하지 않고 제시하는 태도. |
| `cast/sam-altman/03.png` | **영리를 먼저 꺼낸 쪽.** 문서 위 한 지점을 검지로 가볍게 짚고, 고개를 약간 들어 상대의 모순을 확인한다. 차갑지 않되 정확한 표정. |
| `cast/sam-altman/04.png` | **초기 통제권.** 스모크드 글라스 패널 옆에 서서 얇게 닫힌 문서철을 옆구리에 든다. 몸은 상대를 향한 삼분의 사 각도, 표정은 차분한 추궁. |
| `cast/sam-altman/05.png` | **그 조건은 왜 필요했나.** 자리에 다시 앉아 상체를 조금 앞으로 기울이고 한 손바닥을 낮게 열어 질문한다. 공격이 아니라 답을 피할 수 없게 만드는 절제된 회의. |

---

## 인물 소개 전용 컷

> **이미지 돌려쓰기 금지.** 인물 소개 컷과 대사 컷은 파일을 공유하지 않는다. 인물 소개에서는 아래 전용 이미지만 사용한다.

| 파일 | 용도 |
|---|---|
| `cast/elon-musk/00.png` | 머스크 인물 소개 전용. 테이블 뒤에 서 있는 정면성 강한 무동작 포트레이트. |
| `cast/sam-altman/00.png` | 알트만 인물 소개 전용. 맞은편 의자 옆에 서 있는 차분한 무동작 포트레이트. |

---

## 쇼츠 1편 연결표

| 발언 | 시작 이미지 | 이미지 교체 |
|---|---|---|
| T01 머스크 | `_group.png` | chunk 2 → `cast/elon-musk/01.png`; chunk 5 → `cast/elon-musk/02.png` |
| T02 알트만 | `cast/sam-altman/01.png` | chunk 2 → `cast/sam-altman/02.png`; chunk 4 → `cast/sam-altman/03.png` |
| T03 머스크 | `cast/elon-musk/03.png` | 없음 |
| T04 알트만 | `cast/sam-altman/04.png` | chunk 2 → `cast/sam-altman/05.png` |
| T05 머스크 | `cast/elon-musk/04.png` | chunk 1 → `cast/elon-musk/05.png` |

`cast.json` 기본 이미지는 인물 소개 전용인 `cast/elon-musk/00.png`, `cast/sam-altman/00.png`로 연결한다. 대사 컷에서는 `00.png`를 사용하지 않는다. `turns.json` 반영은 모든 이미지의 승인·파일 존재 확인 뒤에만 한다.

## 승인 검사

1. 이름을 가려도 머스크와 알트만의 얼굴 골격·체형·표정 에너지가 서로 다른가.
2. 2인 컷만 보고 “공동 창업의 약속을 두고 한 사람이 추궁하고 다른 사람이 문서로 되받는 순간”이라고 설명할 수 있는가.
3. 1:1 화면의 중앙 중단 영역에서 얼굴·손동작·문서철이 자연스럽게 읽히는가.
4. 피부와 눈이 살아 있는 실제 사진처럼 보이고 밀랍·CG 질감이 없는가.
5. 공간·빛·복식이 14장 전체에서 같은 촬영 세션처럼 이어지는가.
6. 표면에 임의의 글자·로고·화면 UI가 생기지 않았는가.
7. 한 편 안에서 동일한 이미지 파일이 인물 소개·발언·이미지 교체에 두 번 이상 연결되지 않았는가.
