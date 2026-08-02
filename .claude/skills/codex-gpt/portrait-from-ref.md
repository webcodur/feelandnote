# 발주서 — 인물 REF가 있을 때의 초상 재생성

기존 인물 이미지(저화질·흑백·회화 포함)를 `-i` 로 붙여 고화질 실사 초상으로 다시 뽑을 때 쓰는 양식이다. 셀럽 아바타·팩션 개인샷 공통.

**핵심: REF가 신원을 정한다.** 그러므로 발주서에 인물을 묘사하지 않는다. "같은 얼굴·나이·피부톤 유지" 류를 쓰면 불필요할 뿐 아니라 **원본이 흑백이면 흑백으로 고착된다**(26.07.28 실측: 흑백 원본 40명 중 30명이 흑백 산출). 넣는 것은 스타일·색·크기·경로 넷뿐이다.

호출법·회수·토큰은 `SKILL.md` 참조.

---

## ⚠️ 용도를 먼저 가른다 — 아바타 / 팩션 개인샷

이 양식은 두 용도를 겸하지만 **규격이 서로 다르다.**

| 용도 | 규격 SSoT | 프레이밍 |
|------|-----------|----------|
| **셀럽 아바타**(`profiles.avatar_url`, 얼굴 원형 썸네일) | `docs/project/celeb-avatar-spec.md` | 아래 FRAMING 블록 **필수** |
| **팩션 개인샷**(`faction_image_url`, 원본 전신·연출 화보) | `faction-image` 스킬 | 아바타 규격 적용 안 함. 얼굴 크롭도 하지 않는다 |

### 아바타 용도일 때 — FRAMING 블록을 반드시 함께 넣는다

아래 양식에는 프레이밍 지시가 없다. **빠뜨리면 참조 이미지의 구도·화각·시선·배경이 그대로 복제되고, 그 결과 아바타마다 얼굴 크기와 위치가 제각각이 된다.** 아바타로 쓸 이미지는 `docs/project/celeb-avatar-spec.md` §4.1 「프레이밍 블록」 전문을 `{STYLE}` 앞에 그대로 붙여 넣는다(수정 금지). 요지는 다음과 같다.

- 화면을 100단위로 볼 때 눈높이 46 · 턱끝 81 · 콧대 가로 50(목표값. 판정 허용은 SSoT §1). 머리 위는 자유(머리카락·모자·투구가 잘려도 무방하고 얼굴이 잘리면 불합격).
- 턱 아래도 자유다. 맨 목·옷깃·러프·관복 깃·투구 목가리개·갑옷 어깨보호구·긴 머리카락 무엇이 채워도 되고 어깨가 아예 안 보여도 된다. 어깨를 담으려고 카메라를 빼지 않는다. 쇄골·가슴이 드러나 상반신이 길어지는 것만 막는다.
- 정면~3/4 15도 이내, 카메라 응시. 한 명만, 소품·글자 없음.
- 원형 마스크로 네 모서리가 잘리고 세로 직사각으로 좌우 12%가 잘린다 — 모서리에 뜻이 있는 것을 두지 않는다.
- 출력 1024×1024로 뽑아 800×800 RGBA WebP(품질 95)로 줄인다.

판정 기준(불합격 유형·재발주 조건)도 같은 문서 §5를 따른다.

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

## 스타일 블록

⚠️ **아바타 용도일 때 성별로 고정해 돌려쓰지 마라.** 아래 두 블록은 조명(창가 측광·렘브란트)과 렌즈(85mm)를 성별에 따라 못박는다. `docs/project/celeb-avatar-spec.md` §4.3은 조명 방향·색온도·표정 온도·복식을 **인물마다 하나씩 골라 개별 기입**하도록 정했다(돌려막기 금지). 아바타로 뽑을 때는 아래 블록의 조명 줄을 인물별 선택값으로 갈아 끼운다. 블록 자체는 팩션 개인샷 등 다른 용도에 그대로 쓴다.

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
3. 아바타 등록이면 얼굴 크롭 → 800×800 webp(품질 95) → R2 → `profiles.avatar_url`.
   - 얼굴 크롭은 **눈높이·턱끝 랜드마크 기준으로 통일됐다**(2026-08-01). 자를 크기·위치를 인자로 조절하지 않는다 — 옛 조절 인자는 폐기됐다. 규격은 `docs/project/celeb-avatar-spec.md` §6, 계산은 `sw/web-bo/src/lib/avatar-geometry.ts` 한 곳이다.
   - **얼굴을 못 찾으면 등록이 실패한다.** 예전처럼 아무 데나 잘라 올라가지 않는다. 이 양식으로 뽑은 그림은 §4.1 프레이밍 블록을 지켰다면 검출에 걸린다.
