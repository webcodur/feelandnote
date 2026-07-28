# 발주서 — 인물 REF가 있을 때의 초상 재생성

기존 인물 이미지(저화질·흑백·회화 포함)를 `-i` 로 붙여 고화질 실사 초상으로 다시 뽑을 때 쓰는 양식이다. 셀럽 아바타·팩션 개인샷 공통.

**핵심: REF가 신원을 정한다.** 그러므로 발주서에 인물을 묘사하지 않는다. "같은 얼굴·나이·피부톤 유지" 류를 쓰면 불필요할 뿐 아니라 **원본이 흑백이면 흑백으로 고착된다**(26.07.28 실측: 흑백 원본 40명 중 30명이 흑백 산출). 넣는 것은 스타일·색·크기·경로 넷뿐이다.

호출법·회수·토큰은 `SKILL.md` 참조.

---

## 양식

`{TAG}` = 세션 식별용 고유값(보통 slug) · `{STYLE}` = 아래 스타일 블록 중 성별에 맞는 것 · `{SIZE}` = 목표 규격의 1.3배(800 아바타면 1024) · `{PATH}` = 저장 경로

```
TASK-ID: AVATARHD-{TAG}

Regenerate the attached portrait at high resolution.

{STYLE}

Full color photograph. Rich, natural, lifelike color — never black and white, never sepia, never monochrome or desaturated.

Output size: exactly {SIZE} x {SIZE} pixels, square 1:1.

Generate the image with the image_gen tool, then save the resulting PNG to this exact path using python:
{PATH}
Report only the saved path as your final message.
```

---

## 스타일 블록 — 남성

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

## 스타일 블록 — 여성

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
2. **누끼** — `nobg-cutout` 스킬(전용 도구 `C:\project\nobg`, `birefnet-general`).
3. 아바타 등록이면 얼굴 크롭 → 800×800 webp → R2 → `profiles.avatar_url`.
