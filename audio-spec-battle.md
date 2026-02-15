# 패권 게임 음원 스펙

> **프로젝트 테마**: Neo-Pantheon — 고대 신전의 권위와 장엄함, 다크 스톤 배경, 골드 액센트.
> 모든 음원은 이 톤에 맞춰야 한다. 판타지/게임 느낌이 아닌, 고전적이고 묵직한 권위감.

## 파일 경로

```
sw/web/public/assets/suikoden/audio/battle/
```

---

## ElevenLabs SFX 프롬프트 작성 가이드

### 핵심 원칙

1. **키워드 나열** — 문장형 묘사 금지. 소리 요소를 쉼표로 나열한다.
2. **한 프롬프트 = 한 소리** — 복합 레이어(A + B + C)는 각각 따로 생성 후 DAW에서 합성한다.
3. **길이 지정 비신뢰** — "0.4 seconds" 같은 지시는 무시될 수 있다. 길게 생성 후 트림한다.
4. **Duration 슬라이더 활용** — 프롬프트에 길이를 쓰지 말고, UI의 Duration 설정을 사용한다.
5. **여러 번 생성** — 같은 프롬프트로 3~5회 생성하여 가장 깨끗한 것을 선택한다.

### 프롬프트 구조

```
[핵심 소리], [재질/악기], [공간감/리버브], [무드 키워드 1~2개]
```

### 안 되면 분리 생성 → 합성

복합 소리가 필요한 경우:
1. 각 레이어를 개별 프롬프트로 생성
2. Audacity 등에서 레이어링 + 볼륨 조절 + 페이드

---

## BGM (5종)

> BGM은 **Suno**로 생성한다.

### 1. `bgm-intro.mp3` — BGM

- **재생**: 게임 설명 + 대전 시작 대기 화면 (루프)
- **길이**: 30~60초
- **느낌**: 신전 입구에 서서 안을 들여다보는 순간. 아직 대전이 시작되지 않은, 기대감과 경외감이 공존하는 고요. 드래프트 BGM보다 가볍고 여유롭되, 같은 세계관 안에 있는 느낌.

**A** — 30~60초:
> Solo piano melody in E minor. Simple repeating theme, 4 bars. No other instruments. Reverb. Calm and mysterious. 76 BPM, loopable. 30-60 seconds. No vocals.

**B (예비)** — 30~60초:
> Solo harp melody in C minor. Gentle arpeggios with a clear theme. No other instruments. Reverb. Quiet anticipation. 76 BPM, loopable. 30-60 seconds. No vocals.

### 2. `bgm-draft.mp3` — BGM

- **재생**: 드래프트 페이즈 전체 (루프)
- **길이**: 60~90초
- **느낌**: 어두운 석조 성당 안에서 신관들이 제물을 고르는 의식. 낮게 울리는 금관 지속음이 돌벽에 반사되고, 팀파니가 대리석 바닥을 밟는 발소리처럼 드문드문 울린다. 긴장되지만 절제된, 신성한 숙의의 시간.

**A** — 60~90초:
> Solo piano theme in D minor, memorable 4-bar melody repeating. Only a low cello drone underneath. Dark and tense. 80 BPM, loopable. 60-90 seconds. No vocals.

**B (예비)** — 60~90초:
> Solo oboe melody in C minor, haunting 4-bar theme repeating. Only a sustained organ pad underneath. Mysterious and sacred. 80 BPM, loopable. 60-90 seconds. No vocals.

### 3. `bgm-battle.mp3` — BGM

- **재생**: 배틀 페이즈 전체 (루프)
- **길이**: 90~120초
- **느낌**: 신전 안의 고요한 대국. 부드러운 현악 멜로디가 흐르되, 석조 공간의 묵직한 잔향이 권위감을 유지한다. 오래 들어도 편안하면서 긴장의 끈은 놓지 않는, 고전적인 품위.

**A** — 90~120초:
> Solo violin melody in A minor, warm memorable 8-bar theme. Only soft piano chords underneath. Noble and smooth, not aggressive. Easy to loop. 88 BPM, loopable. 90-120 seconds. No vocals.

**B (예비)** — 90~120초:
> Solo cello melody in G minor, lyrical memorable theme. Only gentle harp arpeggios underneath. Warm and elegant. Easy to loop. 88 BPM, loopable. 90-120 seconds. No vocals.

### 4. `bgm-result-win.mp3` — BGM

- **재생**: 결과 화면 (승리)
- **길이**: 30~45초
- **느낌**: 신전에 황금빛이 쏟아지는 순간. 현악이 상승하며 프렌치 호른이 기품 있는 승리 선율을 연주한다. 과하지 않은 장엄함, 왕관을 쓰는 의식 같은 품위.

**A** — 30~45초:
> Solo French horn melody in D major, bold rising victory theme. Only sustained string chord underneath. Majestic and triumphant. 90 BPM, cinematic. 30-45 seconds. No vocals.

**B (예비)** — 30~45초:
> Solo trumpet melody in C major, clear victorious theme. Only warm string pad underneath. Noble and uplifting. 90 BPM. 30-45 seconds. No vocals.

### 5. `bgm-result-lose.mp3` — BGM

- **재생**: 결과 화면 (패배/무승부)
- **길이**: 30~45초
- **느낌**: 빈 신전에 파이프 오르간 한 화음이 길게 울린다. 이어서 현악이 숙연하고 차분한 선율을 엮는다. 비참하지 않고 담담한, 돌에 새겨진 판결문 같은 무게.

**A** — 30~45초:
> Solo violin melody in D minor, slow descending theme. Only a sustained organ chord underneath. Dignified and reflective, not sad. 90 BPM, cinematic. 30-45 seconds. No vocals.

**B (예비)** — 30~45초:
> Solo piano melody in A minor, simple melancholic theme. No other instruments. Quiet gravity. 90 BPM. 30-45 seconds. No vocals.

---

## SFX (6종)

> 각 SFX는 **단일 프롬프트 하나**로 생성한다. 3~5회 돌려서 가장 깨끗한 것 선택.
> Duration은 프롬프트에 쓰지 말고 **UI 슬라이더**로 조절.

### 6. `sfx-start.mp3` — SFX

- **트리거**: "대전 시작" 버튼 클릭
- **Duration**: 2초
- **핵심 소리**: 묵직한 징 한 타, 돌 공간 잔향

> single heavy gong strike, deep dark resonance, stone hall reverb

### 7. `sfx-card-pick.mp3` — SFX

- **트리거**: 카드 선택 (드래프트 픽 + 배틀 카드 선택 겸용)
- **Duration**: 1초 (트림 → 0.4초)
- **핵심 소리**: 돌끼리 부딪히는 짧은 탁 소리

> short marble stone tap, clean click

### 8. `sfx-deploy.mp3` — SFX

- **트리거**: "출전" 클릭 + 드래프트 완료 전환
- **Duration**: 1초 (트림 → 0.6초)
- **핵심 소리**: 돌 도장 쾅 찍는 묵직한 충격

> heavy stone seal stamp, deep thud, reverb

### 9. `sfx-reveal.mp3` — SFX

- **트리거**: revealing 시작, 양측 카드 공개
- **Duration**: 1초
- **핵심 소리**: 돌문 미끄러지며 열리는 마찰음

> stone door sliding open, grinding scrape, short whoosh

### 10. `sfx-win.mp3` — SFX

- **트리거**: 라운드 승리 판정
- **Duration**: 1~2초
- **핵심 소리**: 짧은 금관 팡파르, 승리 선언

> short brass fanfare, triumphant, bright and majestic

### 11. `sfx-lose.mp3` — SFX

- **트리거**: 라운드 패배 판정 (무승부 겸용)
- **Duration**: 1초
- **핵심 소리**: 묵직한 돌 쿵 닫히는 소리

> muffled heavy stone slab thud, dull impact, short reverb


---

## 후처리 체크리스트

모든 SFX 생성 후 공통 적용:

- [ ] **트림** — 앞뒤 무음 구간 잘라내기 (0.05초 여유)
- [ ] **노멀라이즈** — 피크 -1dB로 통일
- [ ] **페이드아웃** — 끝 0.05~0.1초에 짧은 페이드 (클릭 노이즈 방지)
- [ ] **포맷** — MP3 192kbps 이상, 44.1kHz
- [ ] **파일명** — 위 스펙 그대로 (`sfx-start.mp3` 등)
