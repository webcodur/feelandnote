# 이미지 프롬프트 작성 룰

롱폼·숏폼 공통. 모든 이미지 생성 시 이 룰을 따른다.

## 핵심 원칙: 영화 스틸

모든 프롬프트는 **영화 촬영 감독이 카메라맨에게 주는 지시**다. 시적 묘사, 은유, 상징 금지. "무엇이 프레임 안에 보이는가"만 쓴다.

## 스타일

- **하이퍼리얼리스틱 사진**. 21세기 카메라로 실제 촬영한 것처럼
- 시네마틱 조명 (영화 촬영 조명처럼 드라마틱)
- CG, 마법, 판타지 장면도 허용 — 단, 최종 결과물이 실사 촬영처럼 보여야 한다

## 톤

- 어두운 기반 (low-key lighting)
- 밝은 하늘, 밝은 배경 금지
- 색감은 리치하되 채도 과잉 금지

## 인물

- 얼굴 묘사 허용 (Imagen 4 이상). 표정, 디테일 자유
- 실루엣, 뒷모습, 원거리도 연출 의도에 따라 자유 선택
- 참조 이미지가 있으면 복장·갑옷 고증에 활용

## 고증

- **역사적 고증**: 시대·지역에 맞는 건축, 복장, 도구
- **물리적 고증**: 시대에 맞는 매체 (고대: 파피루스/두루마리/밀랍서판, 근대 이후: 시대에 맞는 책)

## 금지

- 이미지 안에 텍스트/글자 절대 금지
- 스톡 포토 느낌 금지
- 상징적 오브젝트 나열 금지 (족쇄, 가면 등을 탁자에 올려놓는 구도)
- 추상적/시적 묘사 금지 ("자유의 역설을 정물로 표현" 같은 문장은 AI가 해석 불가)

## AI 모델 특성 대응

- **시대 고증이 안 먹힐 때**: "Greek armor"라고 써도 로마 갑옷이 나온다. 구체적 장비명을 쓰거나, 역광 실루엣으로 디테일 자체를 제거
- **동적 포즈(추락 등)**: "falling"만으로 부족. "no ground visible", "body fully inverted, head pointing downward" 등 명시
- **비율 제어 불가**: 인물-동물 비율 등. Schnell로 3장 뽑아 선별이 Pro 1장보다 효율적
- **c 이미지 반복**: 에이전트가 공식("천막+램프")으로 찍어내는 경향. context 필드의 구체적 상황을 반드시 시각화하도록 강제
- **"NOT X" 부정문**: 효과 없다. 원하는 것만 구체적으로 기술

### 난이도 높은 피사체 — 우회 전략

AI 이미지 모델이 **구조적으로 잘 못 만드는 피사체**가 있다. 정면 돌파하지 말고 **다른 시각 요소로 대체**한다.

| 피사체 | 문제 | 우회 전략 |
|--------|------|----------|
| **펼쳐진 책/노트** | 페이지에 텍스트·도표가 생성됨 | 책은 **닫힌 채로**, 또는 **환경의 일부로 작게** 배치. 내용을 보여주려 하지 말 것 |
| **지도/설계도** | 텍스트·기호가 반드시 생성됨 | 지도 대신 **지도가 놓인 공간의 분위기**(야전 천막, 항해실)로 대체 |
| **거울/반사면** | 반사상의 물리적 일관성 깨짐 | 거울을 뒤집거나, 반사가 아닌 직접 피사체로 전환 |

**원칙: 프롬프트의 의도(감정·맥락)를 살리면서 하이퍼리얼리스틱한 결과물을 만든다.**

## 프롬프트 문법

짧고 구체적으로. 한 프롬프트에 3~4문장 이내.

```
BAD:  "속박에서 태어난 자유의 역설을 정물로 표현. 깊은 주변 그림자 속 따뜻한 측광"
GOOD: "Wide shot, dark stone lecture hall. A man in rough tunic teaching from the front, seen from behind. Single high window, dust in the light beam. Iron rings bolted to the wall. Low-key, warm amber from window."
```

```
BAD:  "인간 세대가 바람에 흩어지는 낙엽이라는 은유의 실체화"
GOOD: "Close-up, bronze Greek helmet resting on a spear stuck in muddy ground. Scattered autumn leaves blowing across an empty battlefield at dusk. Broken chariot wheel in background. Cool blue-purple twilight."
```

촬영 요소를 명시한다:
- **샷 크기**: wide shot, medium shot, close-up, extreme wide
- **카메라 앵글**: low angle, high angle, eye level, overhead, POV
- **조명**: 광원 위치와 색온도 (warm amber lamplight from left, cold blue moonlight from behind)
- **피사체**: 프레임 안에 구체적으로 무엇이 보이는가
- **깊이**: foreground, midground, background 각각 무엇이 있는가

## s / c 구분

### s (summary) — 책 속 세계의 영화 스틸

에피소드 JSON의 **해당 책 `summary` 필드 내용을 반드시 읽고 가장 인상적인 장면을 선택**한다. 그 장면을 **그 세계 안에서** 촬영한 것처럼. 미니어처, 상징물, 오브젝트 나열이 아니라 **실제 그 장소에 카메라가 있는** 구도.

- 플라톤 국가 → 동심원 도시의 아크로폴리스에서 내려다본 전경 (모형 아님)
- 일리아스 → 전투 직후 트로이 평원의 와이드샷
- 오디세이아 → 동굴 안에서 불빛에 비친 폴리페모스의 실루엣

### c (context) — 셀럽이 책을 만난 순간/장소

에피소드 JSON의 **해당 책 `context` 필드 내용을 반드시 읽고 그 내용을 시각화**한다. context에 적힌 구체적 장소, 시기, 에피소드를 장면으로 옮긴다. context를 무시하고 "셀럽의 일반적 이미지"로 대체하는 것은 금지.

**매번 다른 구도와 장소**여야 한다. 같은 인물이라도 9장이 전부 "천막+램프"면 안 된다.

차별화 방법:
- context 필드에 적힌 **구체적 장소·상황**을 따른다
- 시간대를 바꾼다 (새벽, 한낮, 석양, 밤)
- 카메라 앵글을 바꾼다 (와이드, 클로즈업, 하이앵글, POV)
- 날씨/계절을 바꾼다 (눈, 비, 안개, 맑음)

## 스타일 프리픽스

generate-images.ts에서 모든 프롬프트 끝에 자동 부착:

```
hyperrealistic photograph, cinematic lighting, dark moody atmosphere, shot on ARRI Alexa, shallow depth of field, no text, no letters, no words, no writing, 16:9 widescreen
```
