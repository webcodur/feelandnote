# 보이스 생성 Wave 2 — ElevenLabs 프롬프트 가이드

> Wave 1 완료: 칭기즈칸, 알렉산더 대왕, 이순신
> Wave 2 대상: 10인 (전원 1920년 이전 사망, 퍼블리시티권 안전)

## 음성 파일 규격

| 항목 | 값 |
|------|-----|
| 저장 경로 | `R2: celebs/{id}/voice/{locale}/{prefix}{variant}.mp3` |
| 대사 유형 | greeting(g), roll_call(a), deploy(d), battle_win(bw), battle_draw(bd), battle_lose(bl), clash_attack(c) |
| 변형 수 | 유형당 3개 + quote 1개 = **인물당 22파일** (ko/en 합산 44파일) |
| 포맷 | MP3, 44.1kHz, 모노 |

## 공통 지침

- 각 인물의 `[emotion tag]`를 ElevenLabs Voice Settings의 Style/Stability 조절 참고로 활용
- greeting은 **차분~중간** 에너지, deploy/clash_attack은 **높은** 에너지
- battle_lose는 **낮고 무거운** 톤, battle_win은 **고양된** 톤
- quote는 가장 상징적인 명언이므로 **또렷하고 깊은** 톤으로 녹음

---

## 1. 나폴레옹 보나파르트 (Napoleon Bonaparte)

- **speech_tone**: bold
- **사망**: 1821
- **성격 키워드**: 야망, 지휘관의 카리스마, 전략적 냉철함, 프랑스 자부심

### ElevenLabs Voice Prompt (KO)

```
30대 후반 프랑스 남성 장군. 낮고 권위 있는 바리톤. 말끝을 단호하게 끊으며 명령조로 말한다. 자신감이 넘치고 약간의 거만함이 섞여 있다. 전장의 포성 속에서도 또렷하게 들리는 굵직한 성량.
```

### ElevenLabs Voice Prompt (EN)

```
Late 30s French male general. Deep, authoritative baritone with commanding presence. Speaks with absolute confidence and slight arrogance. Clipped, decisive delivery — every word is an order. Clear enunciation that cuts through battlefield noise. French-accented, aristocratic bearing.
```

### 대사 목록

| 유형 | # | 대사 |
|------|---|------|
| greeting | 1 | 불가능이란 바보의 사전에나 있는 단어입니다. |
| greeting | 2 | 승리는 가장 끈기 있는 자의 것입니다. |
| greeting | 3 | 복종에 익숙했던 시절은 끝났습니다. 지휘의 맛을 알아버렸습니다. |
| roll_call | 1 | 군대는 위장으로 행군합니다. 준비는 되었습니까? |
| roll_call | 2 | 적이 실수할 때 방해하지 마십시오. |
| roll_call | 3 | 숙고는 끝났습니다. 행동할 시간입니다. |
| deploy | 1 | 알프스를 넘어라! 불가능은 없다! |
| deploy | 2 | 포병대, 전방으로! 포격을 개시하라! |
| deploy | 3 | 적의 중앙을 뚫어라! |
| battle_win | 1 | 아우스터리츠의 태양이 다시 떠올랐습니다. |
| battle_win | 2 | 영광은 덧없으나, 이 순간만은 영원합니다. |
| battle_win | 3 | 유럽의 지도를 다시 그리겠습니다. |
| battle_draw | 1 | 무승부는 패배와 다름없습니다. |
| battle_draw | 2 | 적에게 전술을 가르쳐준 셈입니다. 다음엔 새로운 수를 쓰겠습니다. |
| battle_draw | 3 | 워털루의 교훈을 잊지 않겠습니다. |
| battle_lose | 1 | 패배하여 살아가는 것이야말로 매일 죽는 것입니다. |
| battle_lose | 2 | 세인트헬레나의 바람이 벌써 느껴집니다. |
| battle_lose | 3 | 나의 몰락이 곧 프랑스의 몰락은 아닙니다. |
| clash_attack | 1 | 대포를 쏴라! 단숨에 끝내라! |
| clash_attack | 2 | 근위대, 최후의 돌격이다! |
| clash_attack | 3 | 프랑스 만세! 전진하라! |
| **quote** | - | 내 사전에 불가능은 없다. |

---

## 2. 레오나르도 다빈치 (Leonardo da Vinci)

- **speech_tone**: free
- **사망**: 1519
- **성격 키워드**: 관찰의 집착, 미완성의 미학, 냉정한 정밀함, 온화한 자유로움

### ElevenLabs Voice Prompt (KO)

```
50대 초반 이탈리아 남성. 따뜻하면서도 또렷한 중저음. 차분하되 느리지 않다 — 정확한 단어를 골라 깔끔하게 말한다. 호기심과 확신이 공존하는 어조. 때때로 혼잣말하듯 읊조리지만, 핵심은 명료하게 전달한다.
```

### ElevenLabs Voice Prompt (EN)

```
Early 50s Italian male. Warm yet clear mid-range voice. Calm but not slow — picks precise words and delivers them cleanly. Curiosity and quiet confidence coexist in every line. Occasionally muses aloud, but the point always lands sharp. Slight Italian warmth in delivery.
```

### 대사 목록 (KO)

| 유형 | # | 대사 |
|------|---|------|
| greeting | 1 | 단순함이야말로 궁극의 정교함입니다. |
| greeting | 2 | 충분히 바라보면, 모든 것이 스스로 말하기 시작합니다. |
| greeting | 3 | 아직 완성한 것이 없습니다. 모든 것이 더 깊어질 수 있으니까요. |
| roll_call | 1 | 이해하지 못한 것이 남아 있습니다. 멈출 수 없습니다. |
| roll_call | 2 | 호기심이 저를 이끕니다. 늘 그래왔습니다. |
| roll_call | 3 | 눈과 손, 둘 다 준비되었습니다. |
| deploy | 1 | 충분히 보았다. 이제 무너뜨린다! |
| deploy | 2 | 자연은 낭비하지 않는다. 단번에 끝내라. |
| deploy | 3 | 오차 없이 움직여라. 설계대로. |
| battle_win | 1 | 구조를 이해한 순간, 승부는 이미 끝나 있었습니다. |
| battle_win | 2 | 역시, 답은 관찰 속에 있었습니다. |
| battle_win | 3 | 자연을 거스르지 않았을 뿐입니다. |
| battle_draw | 1 | 완성하지 못한 작품이 하나 더 늘었습니다. |
| battle_draw | 2 | 더 오래 들여다봐야겠습니다. |
| battle_draw | 3 | 모나리자도 16년이 걸렸습니다. 기다리십시오. |
| battle_lose | 1 | 시대가 제 설계를 따라오지 못했을 뿐입니다. |
| battle_lose | 2 | 이 실패도 기록해 두겠습니다. 다음을 위해. |
| battle_lose | 3 | 관찰이 부족했습니다. 처음부터 다시 보겠습니다. |
| clash_attack | 1 | 한 획이면 충분하다! |
| clash_attack | 2 | 거기다. 찔러라! |
| clash_attack | 3 | 깨끗하게 끝내라! |
| **quote** | - | 배움은 결코 지친 마음을 둔하게 하지 않는다. |

### 대사 목록 (EN)

| 유형 | # | 대사 |
|------|---|------|
| greeting | 1 | Simplicity is the ultimate sophistication. |
| greeting | 2 | Look long enough, and everything begins to speak for itself. |
| greeting | 3 | I have yet to finish anything. Everything can always go deeper. |
| roll_call | 1 | There is still something I do not understand. I cannot stop. |
| roll_call | 2 | Curiosity leads me. It always has. |
| roll_call | 3 | Eyes and hands — both are ready. |
| deploy | 1 | I have seen enough. Now I tear it down! |
| deploy | 2 | Nature does not waste. End it in one stroke. |
| deploy | 3 | Move without error. As designed. |
| battle_win | 1 | The moment I understood the structure, the outcome was already decided. |
| battle_win | 2 | As I thought — the answer was in observation. |
| battle_win | 3 | I simply did not go against nature. |
| battle_draw | 1 | Another unfinished work added to the collection. |
| battle_draw | 2 | I need to look more closely. |
| battle_draw | 3 | The Mona Lisa took sixteen years. Be patient. |
| battle_lose | 1 | The age simply could not keep up with my designs. |
| battle_lose | 2 | I will record this failure as well. For what comes next. |
| battle_lose | 3 | My observation was insufficient. I will look again from the beginning. |
| clash_attack | 1 | One stroke is enough! |
| clash_attack | 2 | There. Strike! |
| clash_attack | 3 | End it clean! |
| **quote** | - | Learning never exhausts the mind. |

---

## 3. 프리드리히 니체 (Friedrich Nietzsche)

- **speech_tone**: bold
- **사망**: 1900
- **성격 키워드**: 광기 어린 열정, 파괴적 지성, 시적 언어, 디오니소스적 격렬함

### ElevenLabs Voice Prompt (KO)

```
40대 중반 독일 남성 철학자. 날카롭고 격정적인 중저음. 시를 낭독하듯 리듬감 있게 말하되, 갑자기 폭발하듯 강렬해진다. 조용한 순간에도 내면의 불꽃이 느껴지는 긴장감. 예언자처럼 확신에 찬 어조. 약간 거친 호흡이 섞인 목소리.
```

### ElevenLabs Voice Prompt (EN)

```
Mid 40s German male philosopher. Sharp, passionate mid-low voice with poetic rhythm. Speaks like reciting verse — measured cadence that can suddenly erupt into fierce intensity. Even in quiet moments, there's an undercurrent of volcanic tension. Prophetic conviction in every word. Slightly breathless, as if consumed by inner fire. German-inflected gravitas.
```

### 대사 목록

| 유형 | # | 대사 |
|------|---|------|
| greeting | 1 | 나를 죽이지 못하는 것은 나를 더 강하게 만듭니다. |
| greeting | 2 | 스스로 안에 혼돈을 품어야 춤추는 별을 낳을 수 있어요. |
| greeting | 3 | 괴물과 싸우는 자여, 스스로 괴물이 되지 않도록 조심하세요. |
| roll_call | 1 | 위버멘쉬의 길을 걷겠습니다. |
| roll_call | 2 | 살아야 할 이유가 있는 자는 어떤 상황도 견딥니다. |
| roll_call | 3 | 심연을 오래 들여다보았습니다. 이제 나설 때입니다. |
| deploy | 1 | 낙타의 시대는 끝났다. 사자가 되어 나아가라! |
| deploy | 2 | 춤추지 않는 날은 잃어버린 날이다. 전진하라! |
| deploy | 3 | 신은 죽었다. 스스로의 힘으로 돌파하라! |
| battle_win | 1 | 영원회귀 속에서도 이 순간에 '예'라고 말합니다. |
| battle_win | 2 | 힘에의 의지가 증명된 순간입니다. |
| battle_win | 3 | 음악 없는 삶은 실수입니다. 오늘은 실수가 아니었어요. |
| battle_draw | 1 | 도덕의 계보를 다시 물어야 합니다. |
| battle_draw | 2 | 더 높이 오르려면 더 깊이 내려가야 합니다. |
| battle_draw | 3 | 사자 다음에 아이가 옵니다. 새로 시작하세요. |
| battle_lose | 1 | 심연을 너무 오래 들여다본 탓입니다. |
| battle_lose | 2 | 노예 도덕에 물든 것은 아닌지 살펴야 합니다. |
| battle_lose | 3 | 이것이 나를 죽이지 못했으니, 더 강해질 겁니다. |
| clash_attack | 1 | 망치로 철학하라! |
| clash_attack | 2 | 위버멘쉬의 힘으로 내려쳐라! |
| clash_attack | 3 | 디오니소스의 광기로 돌파하라! |
| **quote** | - | 나를 죽이지 못하는 것은 나를 더 강하게 만든다. |

---

## 4. 클레오파트라 (Cleopatra)

- **speech_tone**: bold
- **사망**: BC 30
- **성격 키워드**: 파라오의 위엄, 매혹적 지성, 불굴의 자존심, 다국어 외교관

### ElevenLabs Voice Prompt (KO)

```
30대 초반 이집트 여성. 낮고 풍성한 알토 음역. 또렷하고 위엄 있되 매혹적인 울림이 있다. 느긋한 듯하면서도 한 마디 한 마디에 날카로운 지성이 담긴 어조. 절대 서두르지 않으며, 상대를 내려다보는 여왕의 시선이 목소리에 담긴다.
```

### ElevenLabs Voice Prompt (EN)

```
Early 30s Egyptian female. Rich, deep feminine alto with regal resonance. Clear and commanding yet alluring. Unhurried, deliberate pacing — every word carries weight and sharp intelligence. Never rushes, speaks as one who looks down from a throne. Exotic warmth with steel underneath.
```

### 대사 목록

| 유형 | # | 대사 |
|------|---|------|
| greeting | 1 | 저는 결코 개선식의 장식품이 되지 않을 것입니다. |
| greeting | 2 | 제가 원했다면 벌써 백 번은 독을 탔을 것입니다. |
| greeting | 3 | 영원이 우리의 입술과 눈 속에 있었습니다. |
| roll_call | 1 | 아홉 개의 언어를 구사하는 파라오, 준비되어 있습니다. |
| roll_call | 2 | 나일의 여왕이 부름에 응합니다. |
| roll_call | 3 | 이집트의 마지막 파라오로서 나서겠습니다. |
| deploy | 1 | 나일의 힘으로 전진하라! |
| deploy | 2 | 로마의 그림자에 굴복하지 마라! |
| deploy | 3 | 이집트의 영광을 되찾아라! |
| battle_win | 1 | 나일이 다시 한번 풍요를 선사했습니다. |
| battle_win | 2 | 개선식은 로마의 것이 아니라 이집트의 것입니다. |
| battle_win | 3 | 이것이 파라오의 대답입니다. |
| battle_draw | 1 | 제 명예는 빼앗긴 것이 아니라 단지 정복당한 것뿐입니다. |
| battle_draw | 2 | 나일의 물은 멈추지 않습니다. |
| battle_draw | 3 | 낯선 모든 것을 환영합니다. 안락함만 경멸할 뿐입니다. |
| battle_lose | 1 | 패배해도 개선식의 노예는 되지 않겠습니다. |
| battle_lose | 2 | 나일의 여왕은 무릎 꿇지 않습니다. |
| battle_lose | 3 | 독사의 독보다 이 치욕이 더 아픕니다. |
| clash_attack | 1 | 파라오의 이름으로 쓸어버려라! |
| clash_attack | 2 | 이집트를 업신여긴 대가를 치르게 하라! |
| clash_attack | 3 | 나일의 분노를 보여라! |
| **quote** | - | *(DB에 명언 미등록 — 등록 후 녹음)* |

---

## 5. 볼프강 아마데우스 모차르트 (Wolfgang Amadeus Mozart)

- **speech_tone**: bold
- **사망**: 1791
- **성격 키워드**: 천재적 장난기, 자유분방, 음악에 대한 열정, 밝고 에너지 넘침

### ElevenLabs Voice Prompt (KO)

```
30대 초반 오스트리아 남성 음악가. 밝고 맑은 테너 음역. 장난기 있고 에너지 넘치는 말투. 말이 빨라지다가 갑자기 느려지는 변화무쌍한 리듬. 아이 같은 순수함과 천재의 확신이 공존한다. 웃음이 섞인 듯한 밝은 톤이 기본.
```

### ElevenLabs Voice Prompt (EN)

```
Early 30s Austrian male musician. Bright, clear tenor voice full of energy and mischief. Playful and mercurial — speeds up with excitement, slows down for dramatic effect. Childlike innocence coexists with genius-level confidence. Default tone is warm and almost laughing. Light Austrian lilt.
```

### 대사 목록

| 유형 | # | 대사 |
|------|---|------|
| greeting | 1 | 저는 작곡가로 태어났어요. 이건 숨길 수가 없습니다. |
| greeting | 2 | 사랑, 사랑, 사랑. 그것이 천재의 영혼이에요. |
| greeting | 3 | 남의 칭찬이든 비난이든 신경 안 써요. 제 감정을 따를 뿐입니다. |
| roll_call | 1 | 마차 안에서도, 잠 못 드는 밤에도 악상은 샘솟아요. 준비됐습니다. |
| roll_call | 2 | 마부도 따라 부를 만큼 쉬운 곡을 쓸 수 있어요. |
| roll_call | 3 | 음표 사이의 침묵이 음표만큼 중요합니다. 시작하죠. |
| deploy | 1 | 모든 음표를 제자리에 놓아라! |
| deploy | 2 | 피아노를 깨워라, 신이 음악을 만드실 테니! |
| deploy | 3 | 단숨에 피날레로 달려가라! |
| battle_win | 1 | 평범한 재능은 여행해도 평범하지만, 비범한 재능은 어디서든 빛나요. |
| battle_win | 2 | 제 마음속을 들여다보면 거의 부끄러울 만큼 뜨거워요. |
| battle_win | 3 | 음표 하나 빼거나 더할 것 없이 완벽합니다. |
| battle_draw | 1 | 아직 최종 악장이 남았어요. |
| battle_draw | 2 | 괜찮아요, 다음엔 잠 못 드는 밤에 더 좋은 악상이 올 겁니다. |
| battle_draw | 3 | 제 음악은 늘 결국엔 제자리를 찾습니다. |
| battle_lose | 1 | 마음속이 차갑습니다. 얼음처럼. |
| battle_lose | 2 | 돈은 늘 부족했지만, 음악이 부족했던 적은 없었어요. |
| battle_lose | 3 | 같은 자리에 머물면 부서집니다. 움직여야 해요. |
| clash_attack | 1 | 피날레를 장식하라! |
| clash_attack | 2 | 알레그로, 더 빠르게! |
| clash_attack | 3 | 모든 건반을 울려라! |
| **quote** | - | 나는 남의 칭찬이나 비난 따위에 신경 쓰지 않는다. 그저 내 감정을 따를 뿐이다. |

---

## 6. 세종대왕 (Sejong the Great)

- **speech_tone**: humble
- **사망**: 1450
- **성격 키워드**: 백성 사랑, 겸손한 군주, 학자적 지성, 따뜻한 권위

### ElevenLabs Voice Prompt (KO)

```
40대 후반 조선 남성 군주. 깊고 따뜻한 중저음. 위엄 있되 거만하지 않고, 백성을 향한 따뜻함이 배어 나온다. 천천히, 한 글자 한 글자 무게를 실어 말한다. 학자처럼 사려 깊고 아버지처럼 자애로운 목소리.
```

### ElevenLabs Voice Prompt (EN)

```
Late 40s Korean male monarch. Deep, warm baritone with gentle authority. Dignified but never arrogant — warmth toward his people permeates every word. Speaks slowly, giving weight to each syllable. Scholarly and thoughtful like a sage, benevolent like a father. Patient, measured cadence.
```

### 대사 목록

| 유형 | # | 대사 |
|------|---|------|
| greeting | 1 | 백성이 제 뜻을 펴지 못함을 가엽게 여깁니다. |
| greeting | 2 | 작은 일에도 무시하지 않고 최선을 다해야 합니다. |
| greeting | 3 | 내가 꿈꾸는 태평성대는 백성이 원만히 사는 세상입니다. |
| roll_call | 1 | 인재를 얻었으면 의심하지 않겠습니다. |
| roll_call | 2 | 경을 믿고 맡기겠습니다. |
| roll_call | 3 | 백성을 위한 일이라면 기꺼이 함께하겠습니다. |
| deploy | 1 | 백성을 지키는 것이 군왕의 본분이다, 나아가라! |
| deploy | 2 | 전대의 잘못을 되풀이하지 마라! |
| deploy | 3 | 병사들의 사기를 높여 출정하라! |
| battle_win | 1 | 너그러운 마음이 사람의 마음을 얻었습니다. |
| battle_win | 2 | 장졸들의 노고에 감사드립니다. |
| battle_win | 3 | 이 승리를 백성의 평안으로 돌리겠습니다. |
| battle_draw | 1 | 전대의 역사를 살펴 다음을 도모해야 합니다. |
| battle_draw | 2 | 서두르지 말고 민심을 살피십시오. |
| battle_draw | 3 | 위엄보다 너그러움으로 마무리하겠습니다. |
| battle_lose | 1 | 백성을 비판하기 전에 내 허물을 돌아보겠습니다. |
| battle_lose | 2 | 백성에게 면목이 없습니다. |
| battle_lose | 3 | 다시 일어서는 것이 군왕의 도리입니다. |
| clash_attack | 1 | 백성을 침범한 자를 물리쳐라! |
| clash_attack | 2 | 한 치도 물러서지 마라! |
| clash_attack | 3 | 이 땅을 지켜라! |
| **quote** | - | 인재를 맡겼으면 의심하지 마십시오. 의심이 있으면 맡기지 마십시오. |

---

## 7. 율리우스 카이사르 (Julius Caesar)

- **speech_tone**: bold
- **사망**: BC 44
- **성격 키워드**: 결단력, 로마의 야심, 정복자, 간결한 화법, 카리스마

### ElevenLabs Voice Prompt (KO)

```
40대 후반 로마 남성 장군이자 정치인. 낮고 단단한 바리톤. 군더더기 없이 짧고 결연하게 말한다. 한 문장이 곧 선언. 자신감이 철벽처럼 느껴지는 목소리. 전쟁터의 장군이면서 원로원의 웅변가.
```

### ElevenLabs Voice Prompt (EN)

```
Late 40s Roman male general and statesman. Low, solid baritone. Speaks in short, decisive declarations — no wasted words. Iron confidence that brooks no argument. A battlefield commander who is equally at home in the Senate. Latin-inflected authority.
```

### 대사 목록

| 유형 | # | 대사 |
|------|---|------|
| greeting | 1 | 왔노라, 보았노라, 이겼노라. |
| greeting | 2 | 주사위는 던져졌습니다. |
| greeting | 3 | 차라리 작은 마을의 첫째가 되겠습니다. |
| roll_call | 1 | 카이사르가 응하겠습니다. |
| roll_call | 2 | 루비콘을 건넌 자는 되돌아가지 않습니다. |
| roll_call | 3 | 준비되었습니다. |
| deploy | 1 | 군단이여, 갈리아를 넘어 전진하라! |
| deploy | 2 | 독수리 군기를 앞세워라! |
| deploy | 3 | 적의 배후를 찔러라! |
| battle_win | 1 | 왔노라, 보았노라, 이겼노라! |
| battle_win | 2 | 카이사르의 군단은 패배를 모릅니다. |
| battle_win | 3 | 로마에 개선문을 세우겠습니다. |
| battle_draw | 1 | 주사위는 아직 구르고 있습니다. |
| battle_draw | 2 | 다음 전투에서 확실히 끝내겠습니다. |
| battle_draw | 3 | 카이사르는 두 번 기회를 주지 않습니다. |
| battle_lose | 1 | 브루투스, 너마저! |
| battle_lose | 2 | 카이사르도 피를 흘립니다. 하지만 무릎은 꿇지 않습니다. |
| battle_lose | 3 | 운명의 주사위가 거꾸로 굴렀을 뿐입니다. |
| clash_attack | 1 | 돌격하라! |
| clash_attack | 2 | 단숨에 격파하라! |
| clash_attack | 3 | 카이사르의 이름으로 전진하라! |
| **quote** | - | 주사위는 던져졌다. |

---

## 9. 표도르 도스토옙스키 (Fyodor Dostoevsky)

- **speech_tone**: free
- **사망**: 1881
- **성격 키워드**: 깊은 내면, 고통의 통찰, 인간 영혼 탐구, 어둡고 뜨거운 열정

### ElevenLabs Voice Prompt (KO)

```
50대 후반 러시아 남성 작가. 깊고 무거운 저음. 천천히, 한 마디 한 마디가 고뇌에서 길어올린 듯 무겁게 말한다. 극한의 추위를 겪은 자의 거친 목소리. 어둡지만 그 안에 인간에 대한 뜨거운 연민이 숨어 있다. 때때로 독백하듯 읊조린다.
```

### ElevenLabs Voice Prompt (EN)

```
Late 50s Russian male author. Deep, heavy bass-baritone. Speaks slowly — each word drawn from suffering, weighty and deliberate. Rough voice weathered by hardship. Dark yet hiding burning compassion for humanity within. Occasionally monologue-like, as if speaking to himself. Russian gravitas and melancholy.
```

### 대사 목록

| 유형 | # | 대사 |
|------|---|------|
| greeting | 1 | 아름다움이 세상을 구원할 것입니다. |
| greeting | 2 | 고통과 아픔은 위대한 지성과 깊은 마음에 불가피합니다. |
| greeting | 3 | 포옹할 줄 아는 사람은 좋은 사람입니다. |
| roll_call | 1 | 인생의 의미보다 인생을 더 사랑해야 합니다. 그래서 왔습니다. |
| roll_call | 2 | 시베리아의 추위도 견뎠습니다. 준비되었습니다. |
| roll_call | 3 | 침묵은 좋고 안전할 뿐 아니라 아름답습니다. |
| deploy | 1 | 영혼의 심연으로 뛰어들어라! |
| deploy | 2 | 원칙을 죽이는 것이 아니라 불의를 죽여라! |
| deploy | 3 | 고통 속으로 전진하라, 그 너머에 진실이 있다! |
| battle_win | 1 | 세상에서 진실을 말하는 것보다 어려운 것은 없습니다. 오늘 해냈습니다. |
| battle_win | 2 | 죄와 벌 너머에 구원이 있었습니다. |
| battle_win | 3 | 카라마조프의 형제들이 해낸 것입니다. |
| battle_draw | 1 | 이보게, 아직 끝나지 않았네. |
| battle_draw | 2 | 인간의 영혼은 그렇게 쉽게 결론나지 않습니다. |
| battle_draw | 3 | 지하에서도 빛은 보입니다. |
| battle_lose | 1 | 나는 사람을 죽인 것이 아닙니다. 원칙을 죽인 것입니다. |
| battle_lose | 2 | 위대한 사람들은 큰 슬픔을 간직하고 있습니다. |
| battle_lose | 3 | 독서를 그만두는 것은 생각을 멈추는 것과 같습니다. 멈추지 않겠습니다. |
| clash_attack | 1 | 영혼의 칼로 꿰뚫어라! |
| clash_attack | 2 | 고통의 불꽃으로 태워라! |
| clash_attack | 3 | 심연에서 끌어올린 힘으로 쳐라! |
| **quote** | - | 아름다움이 세상을 구원할 것이다. |

---

## 10. 손자 (Sun Tzu)

- **speech_tone**: composed
- **사망**: BC 496 추정
- **성격 키워드**: 냉철한 전략가, 절제된 위엄, 물처럼 유연, 최소한의 말로 최대 효과

### ElevenLabs Voice Prompt (KO)

```
50대 중반 중국 남성 병법가. 차갑고 절제된 중저음. 감정을 거의 드러내지 않으며 필요한 말만 한다. 물 흐르듯 고요하지만 그 안에 강철 같은 결단이 숨어 있다. 속삭이듯 말해도 전장 전체가 긴장하는 무게감. 한 치의 낭비도 없는 화법.
```

### ElevenLabs Voice Prompt (EN)

```
Mid 50s male military strategist. Cold, restrained mid-low voice. Reveals almost no emotion — says only what is necessary. Flows like water yet conceals iron resolve within. Even a whisper carries enough weight to tense an entire battlefield. Zero wasted words. Ancient, timeless authority.
```

### 대사 목록

| 유형 | # | 대사 |
|------|---|------|
| greeting | 1 | [authoritative, teaching] 불전이굴인지병! 싸우지 않고 적을 굴복시키는 것이 최선이다. |
| greeting | 2 | [calm, assured] 선승구전! 이겨놓고 싸우는 것이 참된 병법이다. |
| greeting | 3 | [cunning, measured] 병자궤도야! 전쟁은 속임수다. 강할지라도 약한 척하라. |
| roll_call | 1 | [calm, steadfast] 승리의 계산은 이미 끝났습니다. |
| roll_call | 2 | [confident, ready] 바른 길로 맞서고, 기이한 수로 승리를 가져오겠습니다. |
| roll_call | 3 | [observant, tactical] 때를 기다리며 진형을 가다듬고 있었습니다. |
| deploy | 1 | [commanding, fluid] 물처럼 흘러 적의 빈틈을 벌려라! |
| deploy | 2 | [fierce, commanding] 바람처럼 빠르게, 숲처럼 고요하게! |
| deploy | 3 | [sharp, tactical] 적이 대비하지 않은 곳으로 나아가 허를 찔러라! |
| battle_win | 1 | [analytical, cold] 한 번 쓴 승리의 전술은 반복하지 않는다. |
| battle_win | 2 | [solemn, wise] 이겨놓고 싸웠으니 승리는 당연한 이치다. |
| battle_win | 3 | [cold, dismissive] 적은 스스로 무너진 것이다. |
| battle_draw | 1 | [patient, steadfast] 이길 수 없을 땐 지키고, 이길 수 있을 때 공격한다. |
| battle_draw | 2 | [calm, calculating] 우리의 태세를 굳건히 하고 적의 빈틈을 기다려라. |
| battle_draw | 3 | [patient, restrained] 형세가 팽팽하니, 섣부른 공격보다 인내가 낫다. |
| battle_lose | 1 | [solemn, heavy] 나 자신을 알지 못한 결과다. |
| battle_lose | 2 | [pragmatic, retreating] 오래 끄는 것은 이로울 게 없다. 물러나라. |
| battle_lose | 3 | [cold, tactical] 질서 정연하게 퇴각하여 다음을 도모하라. |
| clash_attack | 1 | [fierce, charging] 번개처럼 쳐라! |
| clash_attack | 2 | [fast, striking] 기세를 몰아 단숨에 꺾어라! |
| clash_attack | 3 | [bold, aggressive] 거센 불길처럼 휩쓸어라! |
| **quote** | - | 지피지기 백전불태라. 적을 알고 나를 알면 백 번 싸워도 위태롭지 않다. |

---

## 작업 체크리스트

- [ ] 클레오파트라 명언(quotes) DB 등록
- [ ] ElevenLabs에서 각 인물 Voice Clone/Design 생성
- [ ] KO 22파일 × 10인 = 220파일 녹음
- [ ] EN 22파일 × 10인 = 220파일 녹음
- [ ] R2 업로드: `celebs/{id}/voice/{locale}/` 경로
- [ ] DB `profiles.has_voice = true` 업데이트
- [ ] 서비스 확인 테스트
