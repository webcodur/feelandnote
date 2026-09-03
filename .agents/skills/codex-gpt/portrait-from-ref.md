# 발주서 — 인물 REF가 있을 때의 초상 재생성

기존 인물 이미지(저화질·흑백·회화 포함)를 `-i` 로 붙여 고화질 실사 초상으로 다시 뽑을 때 쓰는 양식이다. 셀럽 아바타·팩션 개인샷 공통.

**핵심: REF가 신원을 정한다.** 그러므로 발주서에 인물을 묘사하지 않는다. "같은 얼굴·나이·피부톤 유지" 류를 쓰면 불필요할 뿐 아니라 **원본이 흑백이면 흑백으로 고착된다**(26.07.28 실측: 흑백 원본 40명 중 30명이 흑백 산출). 넣는 것은 스타일·색·크기·경로 넷뿐이다.

호출법·회수·토큰은 `SKILL.md` 참조.

---

## ⚠️ 용도를 먼저 가른다 — 아바타 / 팩션 개인샷

이 양식은 두 용도를 겸하지만 **규격이 서로 다르다.**

| 용도 | 규격 SSoT | 프레이밍 |
|------|-----------|----------|
| **셀럽 아바타**(`celebs.avatar_url`, 얼굴 원형 썸네일) | `docs/project/celeb/celeb-08-01-avatar.md` | 이 문서의 FRAMING 블록 **필수** |
| **팩션 개인샷**(`faction_image_url`, 원본 전신·연출 화보) | `faction-image` 스킬 | 아바타 규격 적용 안 함. 얼굴 크롭도 하지 않는다 |

### 아바타 용도일 때 — FRAMING 블록을 반드시 함께 넣는다

아래 양식만 쓰면 참조 이미지의 구도·화각·시선까지 복제할 수 있다. 아바타에는 다음 블록을 `{STYLE}` 앞에 그대로 넣는다. 기하 목표값과 합격 범위는 프롬프트에 복제하지 않으며 `avatar-geometry.ts`의 `AVATAR_SPEC`과 아바타 문서의 「구도」·「검수」를 따른다.

```text
FRAMING FOR A CIRCULAR PROFILE AVATAR:
One person only, in a tight square headshot, with the face centered.
Face the camera directly or at only a very shallow three-quarter angle, with direct eye contact.
Keep the full forehead, eyebrows, ears, and chin visible; hair, hats, crowns, or helmets may touch the top edge.
Leave enough image around the face for a landmark-based square crop, but do not pull back into a chest-up portrait.
No hands, props, microphones, books, weapons, text, logos, or other people.
Use a clean background clearly separated from the person, with no meaningful detail in the corners.
```

---

## 양식

`{TAG}` = 세션 식별용 고유값(보통 slug) · `{FRAMING_IF_AVATAR}` = 아바타면 위 FRAMING 블록, 다른 용도면 빈칸 · `{STYLE}` = 용도와 인물에 맞춘 스타일 · `{SIZE}` = 목표 출력 크기 · `{PATH}` = 저장 경로

```
TASK-ID: AVATARHD-{TAG}

Regenerate the attached portrait at high resolution.

{FRAMING_IF_AVATAR}

{STYLE}

Full color photograph. Rich, natural, lifelike color — never black and white, never sepia, never monochrome or desaturated.

Output size: exactly {SIZE} x {SIZE} pixels, square 1:1.

Generate the image with the image_gen tool, then save the resulting PNG to this exact path using python:
{PATH}
Report only the saved path as your final message.
```

---

## 스타일 블록

⚠️ **아바타 용도일 때 아래 성별 블록을 고정 템플릿으로 돌려쓰지 마라.** 조명 방향·색온도·표정 온도·복식은 인물마다 고르고, 공통으로 강제할 것은 위 FRAMING 블록뿐이다. 블록 자체는 팩션 개인샷 등 다른 용도에 쓸 수 있다.

⚠️ **강조어 누적 주의.** 같은 문서 §4.2는 밀랍 인형처럼 되는 것을 막으려 `Photorealistic`·`Bold cinematic`·`f/1.4`·`lens flare`를 겹쳐 쓰지 말라고 정했다. 이 양식에 그 네 낱말이 그대로 들어 있지는 않지만, `Ultra-photorealistic` + `8K ultra high resolution` + `Extremely high detail` + `Shallow depth of field`가 같은 방향으로 쌓여 있다. 아바타 산출물에서 피부가 밀랍처럼 보이면 이 줄들부터 덜어낸다.

### 남성

```
Ultra-photorealistic portrait image

Real human skin texture with visible pores, micro wrinkles, and fine details
No skin smoothing, no blur, no beauty filter

Strong directional natural light from a window (side lighting)
Clear shadow contrast on face (Rembrandt lighting)
High dynamic range, realistic shadows and highlights

85mm lens, full-frame DSLR look
Shallow depth of field, sharp focus on eyes
Natural color grading, RAW photo quality

Extremely high detail, high-frequency texture preserved
8K ultra high resolution, crisp edges, no softness

Clean background, slightly blurred, neutral tones
Professional studio-quality photograph
```

### 여성

```
Ultra-photorealistic portrait image

Natural and refined human skin texture
Visible skin detail with subtle pores and soft micro-texture
Healthy and clean complexion
No plastic skin, no excessive smoothing, no beauty filter, no blur

Soft directional natural window light
Gentle Rembrandt lighting with smooth shadow transitions
High dynamic range with realistic highlight roll-off
Soft luminous skin rendering

85mm lens, full-frame DSLR look
Shallow depth of field, tack sharp focus on eyes
Natural facial proportions and subtle asymmetry

Balanced color grading
Clean skin tones with realistic translucency
RAW photo quality

High detail with preserved facial features
Fine eyelashes, natural eyebrows, soft baby hairs
Smooth texture transitions without over-sharpening

Ultra high resolution, crisp eyes and hair detail
No harsh skin contrast, no exaggerated pores

Clean minimal background
Slightly blurred neutral tones
Professional editorial portrait photography
```

---

## 넣지 말 것

| 넣지 않는다 | 이유 |
|------|------|
| 얼굴·나이·체격·인상 묘사 | REF가 정한다. 쓰면 REF를 무시하고 글자대로 새 얼굴을 만든다 |
| "같은 사람/피부톤/머리 유지" | 불필요. 흑백 원본을 흑백으로 고착시킨다 |
| 배경 색·밝기 지정 | 스타일 블록의 `Clean background`로 충분. 누끼를 뜨면 어차피 사라진다 |
| "단순 업스케일 금지" | 스타일 블록의 텍스처 지시가 이미 같은 일을 한다 |

## 산출 후

1. **진위 검사** — 원본과 축소 지문 대조, 해상도 상승 확인(`SKILL.md` 회수 절). 안 하면 실패분이 원본 그대로 성공 집계된다.
2. **누끼** — `nobg-cutout` 스킬(전용 도구 `C:\project\nobg`, `birefnet-general`). **병렬 실행 금지** — CPU 연산이라 한 번에 프로세스 하나만. 대량을 몰아 돌리지도 말 것 — CPU 과부하가 오므로 한 장씩 분리 실행 권장.
3. 아바타 등록이면 얼굴 크롭 → 800×800 webp(품질 95) → R2 → `celebs.avatar_url`.
   - 얼굴 크롭은 눈높이·턱끝 랜드마크를 사용하며 계산은 `sw/web-bo/src/lib/avatar-geometry.ts` 한 곳이 쥔다. 자를 크기와 위치를 호출 인자로 바꾸지 않는다.
   - **얼굴을 못 찾으면 등록이 실패한다.** 임의 위치를 잘라 올리지 말고 원본과 FRAMING 준수 여부를 다시 확인한다.
