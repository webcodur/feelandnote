# 셀럽 아바타 누락 명단

> 생성일: 2026-07-15
> 기준: `profiles.profile_type = 'CELEB'` 이고 `avatar_url` 이 NULL/빈 문자열
> 전체 CELEB 1,674명 중 아바타 없음 **138명** (역사·신화 80 / 현대 58)

## 범위 메모

- **1차 대상**: DB상 아바타 미등록 인물 전원.
- **쓰레기 이미지**: URL 중복(동일 파일 다중 배정)은 0건. 파일 내용 품질(동명이인·동전·석상·흐림·잘못된 인물)은 R2 전수 시각 검수 없이는 자동 판별 불가. 본 문서는 **미등록**에 한정. 품질 불량은 별도 수동 검수 큐로 남김.
- **역사·신화 구분**: 사망 1840 이전 / 출생 1800 이전 / `celeb_tier=fiction` / 신화 표기 → 카메라 실사 없음으로 보고 **외형 프롬프트** 작성.
- **현대**: 실사 확보 가능 인물. **누구인지 설명만** 기록.
- 프롬프트 공통: 얼굴 중앙 정사각 크롭 전제, 고전화풍·초상화 스타일, 영문(이미지 생성 모델 호환).

---

## 빠른 명단

### 역사·신화 (프롬프트 필요)

- 네스토르 (`nestor`) — 신화
- 노애 (`lao-ai`) — 역사
- 대 아이아스 (`ajax-the-great`) — 신화
- 디오메데스 (`diomedes`) — 신화
- 록사나 (`roxana`) — 역사
- 루이니콜라 다부 (`louis-nicolas-davout`) — 역사
- 루이알렉상드르 베르티에 (`louis-alexandre-berthier`) — 역사
- 리시마코스 (`lysimachus`) — 역사
- 마르쿠스 안토니우스 (`mark-antony`) — 역사
- 메넬라오스 (`menelaus`) — 신화
- 멤논 (`memnon`) — 신화
- 몽염 (`meng-tian`) — 역사
- 미셸 네 (`michel-ney`) — 역사
- 바투 칸 (`batu-khan`) — 역사
- 방연 (`pang-juan`) — 역사
- 백기 (`bai-qi`) — 역사
- 베르킨게토릭스 (`vercingetorix`) — 역사
- 보르테 (`borte`) — 역사
- 부소 (`fusu`) — 역사
- 브루투스 (`marcus-junius-brutus`) — 역사
- 사르페돈 (`sarpedon`) — 신화
- 샤를 모리스 드 탈레랑 (`talleyrand`) — 역사
- 셀레우코스 1세 (`seleucus-i-nicator`) — 역사
- 소 아이아스 (`ajax-the-lesser`) — 신화
- 수부타이 (`subutai`) — 역사
- 스파르타쿠스 (`spartacus`) — 역사
- 시논 (`sinon`) — 신화
- 아가멤논 (`agamemnon`) — 신화
- 아레스 (`ares`) — 신화
- 아이네이아스 (`aeneas`) — 신화
- 아킬레우스 (`achilles`) — 신화
- 아테나 (`athena`) — 신화
- 아폴론 (`apollo`) — 신화
- 아프로디테 (`aphrodite`) — 신화
- 안티고노스 1세 (`antigonus-i-monophthalmus`) — 역사
- 앙드레 마세나 (`andre-massena`) — 역사
- 여불위 (`lu-buwei`) — 역사
- 오고타이 칸 (`ogedei-khan`) — 역사
- 오디세우스 (`odysseus`) — 신화
- 올림피아스 (`olympias`) — 역사
- 왕전 (`wang-jian`) — 역사
- 왕충 (`wang-chong`) — 역사
- 유협 (`liu-xie`) — 역사
- 자무카 (`jamukha`) — 역사
- 장 란 (`jean-lannes`) — 역사
- 장드디외 술트 (`jean-de-dieu-soult`) — 역사
- 장바티스트 베르나도트 (`jean-baptiste-bernadotte`) — 역사
- 제베 (`jebe`) — 역사
- 제우스 (`zeus`) — 신화
- 조고 (`zhao-gao`) — 역사
- 조아생 뮈라 (`joachim-murat`) — 역사
- 조제프 푸셰 (`joseph-fouche`) — 역사
- 조제핀 드 보아르네 (`josephine-de-beauharnais`) — 역사
- 조치 (`jochi`) — 역사
- 진수 (`chen-shou`) — 역사
- 차가타이 (`chagatai-khan`) — 역사
- 카산드라 (`cassandra`) — 신화
- 카산드로스 (`cassander`) — 역사
- 카시우스 (`gaius-cassius-longinus`) — 역사
- 칼립소 (`calypso`) — 신화
- 크라수스 (`marcus-licinius-crassus`) — 역사
- 클레이토스 (`cleitus-the-black`) — 역사
- 키르케 (`circe`) — 신화
- 텔레마코스 (`telemachus`) — 신화
- 툴루이 (`tolui`) — 역사
- 파르메니온 (`parmenion`) — 역사
- 파리스 (`paris`) — 신화
- 파트로클로스 (`patroclus`) — 신화
- 페넬로페 (`penelope`) — 신화
- 펜테실레이아 (`penthesilea`) — 신화
- 포세이돈 (`poseidon`) — 신화
- 폴리페모스 (`polyphemus`) — 신화
- 폼페이우스 (`pompey-the-great`) — 역사
- 프리아모스 (`priam`) — 신화
- 필리포스 2세 (`philip-ii-of-macedon`) — 역사
- 헤라 (`hera`) — 신화
- 헤파이스티온 (`hephaestion`) — 역사
- 헥토르 (`hector`) — 신화
- 호해 (`hu-hai`) — 역사
- 훌라구 (`hulagu-khan`) — 역사

### 현대 (실사 수집 대상)

- T.S. 엘리엇 (`t.s.-eliot`)
- 김경주 (`kim-kyung-ju`)
- 김수영 (`kim-su-young`)
- 김영삼 (`young-sam-kim`)
- 김용현 (`yong-hyun-kim`)
- 돔 호프먼 (`dom-hofmann`)
- 라이언 피터슨 (`ryan-petersen`)
- 롭 퍼거스 (`rob-fergus`)
- 루카스 바이어 (`lucas-beyer`)
- 멕 휘트먼 (`meg-whitman`)
- 목시 말린스파이크 (`moxie-marlinspike`)
- 무하마드 알리 (`muhammad-ali`)
- 문성욱 (`sung-uk-moon`)
- 박경리 (`park-kyong-ni`)
- 박수만 (`park-soo-man`)
- 박완서 (`park-wan-suh`)
- 박태훈 (`park-tae-hoon`)
- 브라이언 싱어먼 (`brian-singerman`)
- 비벡 라마스와미 (`vivek-ramaswamy`)
- 샤오화 자이 (`xiaohua-zhai`)
- 서수길 (`seo-su-gil`)
- 슈차오 비 (`shuchao-bi`)
- 스티브 허프먼 (`steve-huffman`)
- 아흐메드 셰리프 (`ahmed-sherif`)
- 알렉산더 콜레스니코프 (`alexander-kolesnikov`)
- 알렉스 스파이로 (`alex-spiro`)
- 애런 슈워츠 (`aaron-swartz`)
- 앤드루 와인라이크 (`andrew-weinreich`)
- 앤드루 털럭 (`andrew-tulloch`)
- 앤서니 암스트롱 (`anthony-armstrong`)
- 얀 쿰 (`jan-koum`)
- 에밋 시어 (`emmett-shear`)
- 위 지아후이 (余家辉) (`jiahui-yu`)
- 이동형 (`lee-dong-hyung`)
- 이재현 (`lee-jay-hyun`)
- 장샤오룽 (`allen-zhang`)
- 잭 가라베디언 (`jack-garabedian`)
- 저우서우즈 (`shou-zi-chew`)
- 전제완 (`jeon-je-wan`)
- 정유정 (`jeong-you-jeong`)
- 제이 그레이버 (`jay-graber`)
- 제이지 (`jay-z`)
- 제프리 카첸버그 (`jeffrey-katzenberg`)
- 조너선 에이브럼스 (`jonathan-abrams`)
- 존 페리 발로우 (`john-perry-barlow`)
- 존 허링 (`john-hering`)
- 첼시 매닝 (`chelsea-manning`)
- 케빈 시스트롬 (`kevin-systrom`)
- 크리스 파블로프스키 (`chris-pavlovski`)
- 톰 앤더슨 (`tom-anderson`)
- 트라핏 반살 (`trapit-bansal`)
- 트레이 스티븐스 (`trae-stephens`)
- 파벨 두로프 (`pavel-durov`)
- 팔머 럭키 (`palmer-luckey`)
- 호리에 다카후미 (`takafumi-horie`)
- 호안 톤-탓 (`hoan-ton-that`)
- 홍위 렌 (`hongyu-ren`)
- 황지우 (`hwang-ji-u`)

---

## 1. 역사·신화 인물 (외형 프롬프트)

실사 카메라 사진이 없거나(고대·중세·나폴레옹기 이전 사망) 신화·허구 인물이라 실사가 성립하지 않는 경우. 이미지 생성 시 아래 프롬프트를 사용.

### 1. 네스토르 (Nestor)

- **slug**: `nestor`
- **구분**: 신화/허구 / tier `fiction` / commander
- **수식어**: 필로스 노왕
- **누구**: 그리스 신화 속 인물. 필로스의 늙은 왕으로, 그리스군의 지혜로운 조언자 역할을 했다.
- **외형 프롬프트**:

```
Portrait of Nestor of Pylos from Greek myth, elderly Greek king, long white hair and full white beard, wise wrinkled face, kind but long-winded expression, simple bronze-age royal robes and staff, Homeric epic painting style, face centered
```

### 2. 노애 (Lao Ai)

- **slug**: `lao-ai`
- **구분**: 역사 / tier `light` / politician
- **생몰**: ? ~ -238
- **수식어**: 장신후
- **누구**: 전국시대 진나라의 총신. 여불위의 천거로 진 태후의 총애를 받아 장신후에 봉해졌으나, 반란을 일으켰다가 거열형으로 처형되었다.
- **외형 프롬프트**:

```
Portrait of Lao Ai (嫪毐), late Warring States China court favorite, handsome ambitious Chinese nobleman in his 30s, long black hair tied in topknot, thin mustache, silk robes of Qin court in deep purple and gold, arrogant half-smile, sharp cheekbones, oil-painting historical portrait style, neutral dark background, face centered, photorealistic classical painting
```

### 3. 대 아이아스 (Ajax the Great)

- **slug**: `ajax-the-great`
- **구분**: 신화/허구 / tier `fiction` / commander
- **수식어**: 살라미스의 거인
- **누구**: 그리스 신화 속 인물. 살라미스 출신의 거구 전사로, 아킬레우스에 버금가는 그리스군의 방패였다.
- **외형 프롬프트**:

```
Portrait of Ajax the Great (Telamonian Ajax), massive Greek warrior of Salamis, huge muscular man in his 30s, tall broad-shouldered, strong jaw, short dark hair, large round shield and spear, grim steadfast expression, Homeric heroic painting, face centered
```

### 4. 디오메데스 (Diomedes)

- **slug**: `diomedes`
- **구분**: 신화/허구 / tier `fiction` / commander
- **수식어**: 아르고스 왕
- **누구**: 그리스 신화 속 인물. 아르고스의 왕으로, 신들과 맞서 싸울 만큼 용맹한 전사였다.
- **외형 프롬프트**:

```
Portrait of Diomedes of Argos, Greek hero who wounded gods in the Iliad, fierce young Greek warrior late 20s, intense eyes, short dark hair, bronze armor of Argos, battle-ready aggressive stance, Homeric epic portrait, face centered
```

### 5. 록사나 (Roxana)

- **slug**: `roxana`
- **구분**: 역사 / tier `light` / politician
- **생몰**: -340 ~ -310
- **수식어**: 작은 별
- **누구**: 소그디아나 귀족 옥시아르테스의 딸. 알렉산드로스 대왕의 왕비이자 알렉산드로스 4세의 어머니. 대왕 사후 후계 다툼에 휘말려 아들과 함께 카산드로스에게 살해당했다.
- **외형 프롬프트**:

```
Portrait of Roxana (Roxane), Sogdian princess and wife of Alexander the Great, young Central Asian woman about 20, fair olive skin, dark almond eyes, long black hair with gold diadem and Persian-style jewelry, elegant Bactrian-Hellenistic court dress, serene tragic beauty, classical oil portrait, soft side light, face centered
```

### 6. 루이니콜라 다부 (Louis-Nicolas Davout)

- **slug**: `louis-nicolas-davout`
- **구분**: 역사 / tier `light` / commander
- **생몰**: 1770-05-10 ~ 1823-06-01
- **수식어**: 철의 원수
- **누구**: 프랑스 나폴레옹 제국의 원수. 1806년 아우어슈테트에서 두 배 넘는 프로이센 주력을 격파했고, 전 생애 단 한 번도 패하지 않아 '철의 원수'로 불린다.
- **외형 프롬프트**:

```
Portrait of Marshal Louis-Nicolas Davout, French Napoleonic marshal in his 40s, stern thin face, short dark hair, high forehead, cold blue-grey eyes, clean-shaven, wearing dark blue French marshal uniform with gold embroidery and marshal's baton, rigid military posture, Empire-era oil portrait, face centered
```

### 7. 루이알렉상드르 베르티에 (Louis-Alexandre Berthier)

- **slug**: `louis-alexandre-berthier`
- **구분**: 역사 / tier `light` / commander
- **생몰**: 1753-11-20 ~ 1815-06-01
- **수식어**: 참모총장
- **누구**: 프랑스의 군인이자 나폴레옹의 참모총장. 지형공병 출신으로 근대 참모제도의 원형을 세웠다. 이탈리아 원정부터 1814년까지 그랑다르메의 작전을 조율했으며, 제국 원수이자 바그람 공이었다.
- **외형 프롬프트**:

```
Portrait of Louis-Alexandre Berthier, Napoleon's chief of staff, French officer in late 50s, refined intelligent face, powdered or greying hair, sharp nose, wearing dark blue general's uniform with gold braid and maps nearby, calm analytical expression, early 19th century French oil portrait, face centered
```

### 8. 리시마코스 (Lysimachus)

- **slug**: `lysimachus`
- **구분**: 역사 / tier `light` / commander
- **생몰**: -360 ~ -281
- **수식어**: 트라키아 왕
- **누구**: 알렉산드로스의 근위대 출신 디아도코이. 트라키아와 소아시아, 마케도니아를 지배한 왕. 기원전 281년 코르페디온 전투에서 셀레우코스에게 패해 전사했다.
- **외형 프롬프트**:

```
Portrait of Lysimachus, Diadochi king of Thrace, Macedonian Greek general-king in his 50s, weathered warrior face, short greying curly hair and beard in Hellenistic style, bronze cuirass with purple cloak, hard determined eyes, Hellenistic royal portrait painting, face centered
```

### 9. 마르쿠스 안토니우스 (Mark Antony)

- **slug**: `mark-antony`
- **구분**: 역사 / tier `light` / commander
- **생몰**: -83 ~ -30
- **수식어**: 제2삼두정
- **누구**: 로마의 정치가이자 군인. 카이사르의 부관으로 제2차 삼두정치를 이끌었다. 클레오파트라와 연합했으나 악티움 해전에서 패한 뒤 스스로 목숨을 끊었다.
- **외형 프롬프트**:

```
Portrait of Mark Antony (Marcus Antonius), Roman triumvir, powerful Roman man in his 40s, strong jaw, short dark curly hair, clean-shaven Roman fashion, broad shoulders, red-bordered toga or military breastplate with crimson cloak, bold charismatic expression, classical Roman bust-inspired oil portrait, face centered
```

### 10. 메넬라오스 (Menelaus)

- **slug**: `menelaus`
- **구분**: 신화/허구 / tier `fiction` / commander
- **수식어**: 스파르타 왕
- **누구**: 그리스 신화 속 인물. 스파르타의 왕으로, 아내 헬레네가 파리스에게 납치되며 트로이 전쟁의 불씨가 됐다.
- **외형 프롬프트**:

```
Portrait of Menelaus, king of Sparta, husband of Helen, Greek king in his 40s, reddish-blond hair and beard typical of Spartan royalty in art, wounded pride in eyes, bronze armor and red cloak, Homeric painting style, face centered
```

### 11. 멤논 (Memnon)

- **slug**: `memnon`
- **구분**: 신화/허구 / tier `fiction` / commander
- **수식어**: 에티오피아 왕
- **누구**: 그리스 신화 속 인물. 에티오피아의 왕으로, 트로이의 원군으로 참전해 아킬레우스와 겨뤘다.
- **외형 프롬프트**:

```
Portrait of Memnon, mythical king of Ethiopia, ally of Troy, majestic dark-skinned African warrior-king in his 30s, noble features, bronze armor with Ethiopian royal ornaments, tragic heroic presence, classical epic painting, face centered
```

### 12. 몽염 (Meng Tian)

- **slug**: `meng-tian`
- **구분**: 역사 / tier `light` / commander
- **생몰**: ? ~ -210
- **수식어**: 만리장성의 명장
- **누구**: 진(秦)의 명장. 30만 대군으로 흉노를 몰아내고 북방 장성을 하나로 이어 만리장성의 원형을 세웠다. 진시황 사후 조고가 꾸민 사구지변에 얽혀 부소와 함께 사사됐다.
- **외형 프롬프트**:

```
Portrait of Meng Tian (蒙恬), Qin dynasty general who built the Great Wall defenses, Chinese military commander in his 40s, disciplined face, long black beard and mustache, hair in warrior topknot under iron helmet or official cap, dark armor with black-and-red Qin style, stoic northern frontier general, traditional Chinese historical portrait painting, face centered
```

### 13. 미셸 네 (Michel Ney)

- **slug**: `michel-ney`
- **구분**: 역사 / tier `light` / commander
- **생몰**: 1769-01-10 ~ 1815-12-07
- **수식어**: 용자 중의 용자
- **누구**: 프랑스 제국의 원수. 통 제조공의 아들로 사병에서 시작해 원수에 올랐고, 러시아 원정 후위전으로 '용자 중의 용자' 칭호를 얻었으나 워털루 패전 뒤 반역죄로 처형됐다.
- **외형 프롬프트**:

```
Portrait of Marshal Michel Ney, Napoleonic 'bravest of the brave', French marshal mid-40s, fiery red-auburn hair, strong martial face, sideburns, blue marshal uniform with gold lace and red sash, intense courageous eyes, Empire oil portrait, face centered
```

### 14. 바투 칸 (Batu Khan)

- **slug**: `batu-khan`
- **구분**: 역사 / tier `light` / commander
- **생몰**: 1205 ~ 1255
- **수식어**: 금장한국
- **누구**: 몽골 제국의 지휘관. 칭기즈 칸의 손자로 킵차크 칸국(금장한국)을 세우고 1236년부터 유럽 원정을 이끌어 루스와 폴란드, 헝가리를 무너뜨렸다.
- **외형 프롬프트**:

```
Portrait of Batu Khan, Mongol founder of the Golden Horde, grandson of Genghis Khan, Mongol prince-commander in his 30s-40s, high cheekbones, sparse facial hair, dark almond eyes, traditional Mongol deel robe with fur trim and golden ornaments, warrior-ruler presence, historical steppe portrait painting, face centered
```

### 15. 방연 (Pang Juan)

- **slug**: `pang-juan`
- **구분**: 역사 / tier `full` / commander
- **생몰**: ? ~ -0342-01-01
- **수식어**: 마릉의 비극
- **누구**: 전국시대 위(魏)나라의 대장군. 동문 손빈을 시기하여 빈형에 처했으나, 마릉 전투에서 그 손빈의 감조유적 계책에 걸려 자결로 생을 마감했다.
- **외형 프롬프트**:

```
Portrait of Pang Juan (龐涓), Warring States Wei general, Chinese military officer mid-30s to 40s, proud sharp face, thin beard, hair in topknot, bronze armor of Wei state, cold jealous eyes, traditional Chinese historical portrait, face centered
```

### 16. 백기 (Bai Qi)

- **slug**: `bai-qi`
- **구분**: 역사 / tier `light` / commander
- **생몰**: ? ~ -257
- **수식어**: 장평의 살신
- **누구**: 진(秦) 소양왕 때의 명장. 이궐·언영·장평 등에서 연승해 무안군에 올랐고, 장평대전에서 조나라 대군을 갱살해 살신으로 불렸다. 평생 패한 적 없으나 왕명 거역으로 사사되었다.
- **외형 프롬프트**:

```
Portrait of Bai Qi (白起), Qin general known as the Human Butcher, Chinese commander in his 50s, gaunt severe face, thin long beard, cold merciless eyes, black Qin armor and dark cloak, aura of dread and discipline, traditional Chinese ink-and-color historical portrait, face centered
```

### 17. 베르킨게토릭스 (Vercingetorix)

- **slug**: `vercingetorix`
- **구분**: 역사 / tier `light` / commander
- **생몰**: -82 ~ -46
- **수식어**: 갈리아 통합
- **누구**: 갈리아 아르베르니족 족장. 기원전 52년 갈리아 부족을 규합해 로마의 카이사르에 맞선 대항쟁을 이끌었다. 알레시아에서 항복한 뒤 로마로 끌려가 처형됐다.
- **외형 프롬프트**:

```
Portrait of Vercingetorix, Gallic chieftain who fought Caesar, Celtic warrior-king late 20s-30s, long flowing reddish-blond hair and thick mustache, fierce blue eyes, gold torc around neck, plaid cloak and bronze armor, proud defiant expression, 19th-century romantic historical painting style, face centered
```

### 18. 보르테 (Borte)

- **slug**: `borte`
- **구분**: 역사 / tier `light` / politician
- **생몰**: 1161 ~ 1230
- **수식어**: 몽골 제1황후
- **누구**: 몽골 제국 칭기즈칸의 정실 황후. 대오르도를 다스리며 아시아 교역로를 관리하고 칸의 조언자로서 제국의 기틀을 세웠다.
- **외형 프롬프트**:

```
Portrait of Börte, first empress of the Mongol Empire, wife of Genghis Khan, Mongol noblewoman in her 30s-40s, high cheekbones, dark eyes, long black hair with traditional headdress (boqta), silk deel with rich embroidery, dignified wise expression, historical Mongol portrait painting, face centered
```

### 19. 부소 (Fusu)

- **slug**: `fusu`
- **구분**: 역사 / tier `light` / politician
- **생몰**: ? ~ -210
- **수식어**: 비운의 태자
- **누구**: 진시황의 장남. 분서갱유에 간언하다 북방으로 쫓겨났고, 시황 사후 조고와 이사가 위조한 조서에 따라 스스로 목숨을 끊었다.
- **외형 프롬프트**:

```
Portrait of Fusu (扶蘇), eldest son of Qin Shi Huang, Chinese crown prince in his 30s, refined scholarly face, thin beard, official robes of Qin heir rather than full armor, earnest upright expression tinged with tragedy, traditional Chinese historical portrait, face centered
```

### 20. 브루투스 (Marcus Junius Brutus)

- **slug**: `marcus-junius-brutus`
- **구분**: 역사 / tier `light` / politician
- **생몰**: -85 ~ -42
- **수식어**: 카이사르 암살
- **누구**: 로마 공화정 말기의 정치가이자 스토아·아카데미아 철학 저술가. 카이사르 암살을 주도하고 공화정 회복을 명분으로 내걸었으며, 필리피 전투에서 패한 뒤 자결했다.
- **외형 프롬프트**:

```
Portrait of Marcus Junius Brutus, Roman senator and assassin of Caesar, Roman aristocrat mid-40s, lean intellectual face, short receding hair, clean-shaven, serious melancholy eyes, white toga with purple stripe, stoic expression, classical Roman oil portrait, face centered
```

### 21. 사르페돈 (Sarpedon)

- **slug**: `sarpedon`
- **구분**: 신화/허구 / tier `fiction` / commander
- **수식어**: 리키아 왕
- **누구**: 그리스 신화 속 인물. 제우스의 아들이자 리키아의 왕으로, 트로이 편에서 싸우다 파트로클로스에게 죽었다.
- **외형 프롬프트**:

```
Portrait of Sarpedon, Lycian king and son of Zeus, Trojan ally, noble Anatolian-Greek warrior in his 30s-40s, strong divine-blood features, ornate Lycian armor, dignified doomed expression, Homeric epic painting, face centered
```

### 22. 샤를 모리스 드 탈레랑 (Talleyrand)

- **slug**: `talleyrand`
- **구분**: 역사 / tier `light` / politician
- **생몰**: 1754-02-02 ~ 1838-05-17
- **수식어**: 외교의 화신
- **누구**: 프랑스 정치가. 부르봉 왕정·혁명·나폴레옹 제국·왕정복고 등 5개 정권을 섬긴 외교관.
- **외형 프롬프트**:

```
Portrait of Charles-Maurice de Talleyrand-Périgord, French diplomat, aristocratic French man in his 50s-60s, refined pale face, high forehead, thin lips with subtle ironic smile, powdered or grey hair, dark formal coat of Empire/Restoration era, limp subtle in posture, elegant cynical presence, neoclassical oil portrait, face centered
```

### 23. 셀레우코스 1세 (Seleucus I Nicator)

- **slug**: `seleucus-i-nicator`
- **구분**: 역사 / tier `light` / commander
- **생몰**: -358 ~ -281
- **수식어**: 니카토르
- **누구**: 알렉산드로스의 근위보병 지휘관 출신 디아도코이. 바빌로니아 총독에서 출발해 서아시아부터 중앙아시아까지 아우르는 셀레우코스 제국을 세웠다.
- **외형 프롬프트**:

```
Portrait of Seleucus I Nicator, founder of the Seleucid Empire, Macedonian king in his 50s, strong Hellenistic face, short curly greying hair and beard, royal diadem, purple cloak over armor, victorious confident eyes, Hellenistic royal portrait painting, face centered
```

### 24. 소 아이아스 (Ajax the Lesser)

- **slug**: `ajax-the-lesser`
- **구분**: 신화/허구 / tier `fiction` / commander
- **수식어**: 로크리스의 전사
- **누구**: 그리스 신화 속 인물. 로크리스 출신의 날쌘 전사로, 오만함 때문에 신들의 노여움을 샀다.
- **외형 프롬프트**:

```
Portrait of Ajax the Lesser of Locris, smaller swift Greek warrior, lean athletic Greek man in his 30s, sharp face, short hair, light armor of a skirmisher, arrogant aggressive expression, Homeric painting, face centered
```

### 25. 수부타이 (Subutai)

- **slug**: `subutai`
- **구분**: 역사 / tier `light` / commander
- **생몰**: 1175 ~ 1248
- **수식어**: 몽골 명장
- **누구**: 우량카이족 대장장이의 아들로 칭기즈칸의 사대선봉 중 하나. 칼카강·모히 전투를 지휘하고 동유럽 원정을 이끌어 역사상 가장 넓은 영토를 정복한 몽골 최고의 명장.
- **외형 프롬프트**:

```
Portrait of Subutai, greatest Mongol general, elderly Mongol commander in his 60s, weather-beaten face, sparse grey beard, keen strategic eyes, simple practical Mongol warrior dress with bow case, calm deadly competence, historical steppe portrait, face centered
```

### 26. 스파르타쿠스 (Spartacus)

- **slug**: `spartacus`
- **구분**: 역사 / tier `light` / commander
- **생몰**: -111 ~ -71
- **수식어**: 검투사 반란
- **누구**: 트라키아 출신 검투사. 기원전 73년 카푸아에서 노예 반란을 일으켜 로마 공화정을 뒤흔들었다.
- **외형 프롬프트**:

```
Portrait of Spartacus, Thracian gladiator-rebel leader, muscular man in early 30s, short dark hair, short beard, scarred strong face, determined fierce eyes, simple gladiator subligaculum and leather straps or captured Roman armor fragments, raw physical power, classical historical painting, face centered
```

### 27. 시논 (Sinon)

- **slug**: `sinon`
- **구분**: 신화/허구 / tier `fiction` / other
- **수식어**: 목마 계략의 첩자
- **누구**: 그리스 신화 속 인물. 트로이 목마를 성 안으로 들이도록 트로이인을 속인 그리스의 첩자다.
- **외형 프롬프트**:

```
Portrait of Sinon, Greek spy who convinced Trojans to take the wooden horse, cunning Greek man in his 30s, thin clever face, deceptive earnest eyes, ragged captive clothing, classical painting, face centered
```

### 28. 아가멤논 (Agamemnon)

- **slug**: `agamemnon`
- **구분**: 신화/허구 / tier `fiction` / commander
- **수식어**: 그리스군 총사령관
- **누구**: 그리스 신화 속 인물. 미케네의 왕이자 트로이 전쟁에서 그리스 연합군을 이끈 총사령관이다.
- **외형 프롬프트**:

```
Portrait of Agamemnon, king of Mycenae and leader of the Greek army, middle-aged Greek high king, thick dark beard, proud imperious face, golden Mycenaean royal armor and lion imagery, commanding presence, Homeric epic portrait, face centered
```

### 29. 아레스 (Ares)

- **slug**: `ares`
- **구분**: 신화/허구 / tier `fiction` / other
- **수식어**: 전쟁의 신
- **누구**: 그리스 신화 속 존재. 전쟁과 살육의 신으로, 트로이 편에서 싸웠다.
- **외형 프롬프트**:

```
Portrait of Ares, Greek god of war, powerful adult male god, fierce handsome face, short dark hair and beard, bronze helmet pushed back, blood-red cloak over godly armor, violent restless eyes, classical mythological painting, face centered
```

### 30. 아이네이아스 (Aeneas)

- **slug**: `aeneas`
- **구분**: 신화/허구 / tier `fiction` / commander
- **수식어**: 트로이 영웅
- **누구**: 그리스 신화 속 인물. 트로이의 영웅으로, 함락 후 살아남아 훗날 로마의 시조가 됐다고 전한다.
- **외형 프롬프트**:

```
Portrait of Aeneas, Trojan hero and ancestor of Rome, noble Trojan warrior in his 30s-40s, pious serious face, short dark hair, Phrygian-Trojan armor and cloak, carrying sense of destiny (pius Aeneas), classical epic painting, face centered
```

### 31. 아킬레우스 (Achilles)

- **slug**: `achilles`
- **구분**: 신화/허구 / tier `fiction` / commander
- **수식어**: 그리스 최강 전사
- **누구**: 그리스 신화 속 인물. 트로이 전쟁 최고의 전사로, 발뒤꿈치가 유일한 약점이었다.
- **외형 프롬프트**:

```
Portrait of Achilles, greatest Greek warrior of the Iliad, young Greek hero early 20s, extraordinarily beautiful and fierce, long blond or light brown hair (Homeric blond), intense green-grey eyes, bronze divine armor of Thetis, wrathful pride, Homeric epic portrait, face centered
```

### 32. 아테나 (Athena)

- **slug**: `athena`
- **구분**: 신화/허구 / tier `fiction` / other
- **수식어**: 지혜의 여신
- **누구**: 그리스 신화 속 존재. 지혜와 전쟁의 여신으로, 그리스군 특히 오디세우스를 도왔다.
- **외형 프롬프트**:

```
Portrait of Athena, Greek goddess of wisdom and war, ageless woman in her apparent 30s, grey-eyed (glaukopis), calm intelligent beauty, classical Greek helmet pushed back on dark hair, aegis with gorgoneion, white peplos, serene martial wisdom, classical mythological painting, face centered
```

### 33. 아폴론 (Apollo)

- **slug**: `apollo`
- **구분**: 신화/허구 / tier `fiction` / other
- **수식어**: 태양·예언의 신
- **누구**: 그리스 신화 속 존재. 태양과 예언·활의 신으로, 트로이 편에 서서 그리스군에 역병을 내렸다.
- **외형 프롬프트**:

```
Portrait of Apollo, Greek god of sun, music and prophecy, eternally youthful beautiful male god, ideal classical Greek features, long golden hair, beardless, laurel wreath, lyre or bow, radiant calm expression, classical mythological painting, face centered
```

### 34. 아프로디테 (Aphrodite)

- **slug**: `aphrodite`
- **구분**: 신화/허구 / tier `fiction` / other
- **수식어**: 사랑의 여신
- **누구**: 그리스 신화 속 존재. 사랑과 미의 여신으로, 파리스에게 헬레네를 약속하며 전쟁의 원인이 됐다.
- **외형 프롬프트**:

```
Portrait of Aphrodite, Greek goddess of love, supremely beautiful woman, soft idealized features, golden hair, sea-born grace, classical drapery leaving shoulder bare, warm irresistible gaze, classical mythological painting, face centered
```

### 35. 안티고노스 1세 (Antigonus I Monophthalmus)

- **slug**: `antigonus-i-monophthalmus`
- **구분**: 역사 / tier `light` / commander
- **생몰**: -382 ~ -301
- **수식어**: 외눈
- **누구**: 마케도니아 출신 장군. 알렉산더 대왕 사후 후계 전쟁에서 최강 세력으로 올라서 왕을 칭했고, 안티고노스 왕조를 세웠다. 입소스 전투에서 81세로 전사했다.
- **외형 프롬프트**:

```
Portrait of Antigonus I Monophthalmus (One-Eyed), Diadochi king, elderly Macedonian general-king about 70-80, one eye missing or covered, thick grey beard and hair, massive powerful build, royal diadem and armor, grim commanding presence, Hellenistic portrait painting, face centered
```

### 36. 앙드레 마세나 (Andre Massena)

- **slug**: `andre-massena`
- **구분**: 역사 / tier `light` / commander
- **생몰**: 1758 ~ 1817
- **수식어**: 승리의 총아
- **누구**: 니스 출신 프랑스 제국 원수. 선원과 행상에서 몸을 일으켜 리볼리, 취리히, 제노바에서 승리했고 나폴레옹에게 '승리의 총아'로 불렸다.
- **외형 프롬프트**:

```
Portrait of André Masséna, Napoleonic marshal 'dear child of victory', French marshal in his 40s-50s, dark hair, sharp Mediterranean features from Nice, shrewd eyes, blue marshal uniform with gold embroidery, confident opportunistic expression, Empire oil portrait, face centered
```

### 37. 여불위 (Lu Buwei)

- **slug**: `lu-buwei`
- **구분**: 역사 / tier `light` / politician
- **생몰**: ? ~ -235
- **수식어**: 여씨춘추
- **누구**: 전국시대 위나라 출신의 거상. 조나라에 인질로 있던 진 공자 이인을 후원해 왕위에 올리고 진의 재상에 올랐다. 식객 삼천을 모아 『여씨춘추』를 편찬했다.
- **외형 프롬프트**:

```
Portrait of Lu Buwei (呂不韋), merchant-chancellor of Qin, Chinese statesman in his 50s, prosperous intelligent face, well-groomed beard, rich silk robes of a high minister rather than soldier, calculating calm eyes, traditional Chinese historical portrait, face centered
```

### 38. 오고타이 칸 (Ogedei Khan)

- **slug**: `ogedei-khan`
- **구분**: 역사 / tier `light` / commander
- **생몰**: 1186 ~ 1241-12-11
- **수식어**: 카라코룸
- **누구**: 몽골 제국 제2대 대칸. 칭기즈 칸의 셋째 아들로 처음 카간을 자칭했다. 카라코룸을 건설하고 역참과 조세 제도를 정비했으며 금나라와 유럽 원정을 추진했다.
- **외형 프롬프트**:

```
Portrait of Ögedei Khan, second Great Khan of the Mongol Empire, Mongol ruler in his 40s-50s, broad face, sparse mustache, dark eyes, imperial Mongol robes with gold and fur, genial yet absolute authority, historical portrait painting, face centered
```

### 39. 오디세우스 (Odysseus)

- **slug**: `odysseus`
- **구분**: 신화/허구 / tier `fiction` / commander
- **수식어**: 이타카 왕
- **누구**: 그리스 신화 속 인물. 이타카의 왕이자 지략의 영웅으로, 트로이 목마를 고안하고 오디세이아의 주인공으로 귀향한다.
- **외형 프롬프트**:

```
Portrait of Odysseus, king of Ithaca, Greek hero of cunning, man in his 40s, weathered intelligent face, short curly dark hair and beard, shrewd calculating eyes, simple traveler cloak over armor, Homeric epic portrait, face centered
```

### 40. 올림피아스 (Olympias)

- **slug**: `olympias`
- **구분**: 역사 / tier `light` / politician
- **생몰**: -375 ~ -316
- **수식어**: 뱀의 여사제
- **누구**: 에페이로스 왕가 출신으로 필리포스 2세의 왕비이자 알렉산드로스 대왕의 모후. 디오니소스 밀교에 심취했고, 디아도코이 전쟁기 손자의 왕위를 지키려 권력을 행사하다 카산드로스에게 처형됐다.
- **외형 프롬프트**:

```
Portrait of Olympias of Epirus, mother of Alexander the Great, Greek queen in her 40s, intense dark eyes, strong proud features, dark hair with royal diadem, rich Macedonian-Epirote dress, serpentine jewelry hinting at Dionysian cult, fierce maternal power, classical oil portrait, face centered
```

### 41. 왕전 (Wang Jian)

- **slug**: `wang-jian`
- **구분**: 역사 / tier `light` / commander
- **수식어**: 진 통일의 노장
- **누구**: 전국시대 진나라의 명장. 조·연·초를 정벌하고 60만 대군으로 초를 멸망시켜 진의 천하 통일에 결정적으로 기여했다. 병권을 쥔 뒤 전답을 청해 왕의 의심을 피한 처세로도 유명하다.
- **외형 프롬프트**:

```
Portrait of Wang Jian (王翦), veteran Qin general who unified China, elderly Chinese commander in his 60s-70s, white beard, calm experienced face, Qin armor or general's robes, patient strategic eyes, traditional Chinese historical portrait, face centered
```

### 42. 왕충 (Wang Chong)

- **slug**: `wang-chong`
- **구분**: 역사 / tier `full` / humanities_scholar
- **생몰**: 27 ~ 97
- **수식어**: 논형
- **누구**: 후한의 합리주의 사상가. 천인감응과 도참설을 정면 비판한 「논형」 85편으로 동아시아 회의주의의 정전을 세웠다.
- **외형 프롬프트**:

```
Portrait of Wang Chong (王充), Later Han rationalist philosopher, Chinese scholar in his 50s-60s, thin thoughtful face, sparse beard, Confucian scholar robes and cap of Eastern Han, skeptical clear eyes, traditional Chinese literati portrait, face centered
```

### 43. 유협 (Liu Xie)

- **slug**: `liu-xie`
- **구분**: 역사 / tier `full` / humanities_scholar
- **생몰**: 465 ~ 520
- **수식어**: 문심조룡
- **누구**: 남조 양나라의 문학 비평가. 50편의 「문심조룡」을 저술하여 동아시아 첫 체계적 문학 이론을 세웠다.
- **외형 프롬프트**:

```
Portrait of Liu Xie (劉勰), author of Wenxin Diaolong, Chinese literary critic of Southern Dynasties, middle-aged scholar-monk appearance, refined gentle face, Buddhist-influenced robes or literati dress of Liang dynasty, calm intellectual eyes, traditional Chinese portrait painting, face centered
```

### 44. 자무카 (Jamukha)

- **slug**: `jamukha`
- **구분**: 역사 / tier `light` / commander
- **생몰**: 1158 ~ 1206
- **수식어**: 구르 칸
- **누구**: 몽골 자다란 부족의 지도자. 테무진의 안다(의형제)였으나 초원의 패권을 두고 최대 라이벌로 돌아섰다. 1201년 구르 칸으로 추대돼 반테무진 연합을 이끌다 패해 처형됐다.
- **외형 프롬프트**:

```
Portrait of Jamukha, anda and rival of Temujin, Mongol tribal leader in his 30s-40s, sharp proud Mongol features, warrior braid, rival-khan presence, traditional Mongol armor and deel, fierce competitive eyes, historical steppe portrait, face centered
```

### 45. 장 란 (Jean Lannes)

- **slug**: `jean-lannes`
- **구분**: 역사 / tier `light` / commander
- **생몰**: 1769-04-10 ~ 1809-05-31
- **수식어**: 몬테벨로 공작
- **누구**: 프랑스 제1제국 원수. 염색공 도제 출신으로 독학해 나폴레옹 휘하 최정예 지휘관이 되었다. 몬테벨로 공작에 올랐고 아스페른에슬링 전투에서 포탄에 맞아 전사했다.
- **외형 프롬프트**:

```
Portrait of Jean Lannes, Napoleonic marshal Duke of Montebello, French marshal early 40s, energetic open face, dark hair, warm bold eyes, blue marshal uniform with gold lace, self-made soldier charisma, Empire oil portrait, face centered
```

### 46. 장드디외 술트 (Jean-de-Dieu Soult)

- **slug**: `jean-de-dieu-soult`
- **구분**: 역사 / tier `light` / commander
- **생몰**: 1769 ~ 1851
- **수식어**: 원수 겸 총리
- **누구**: 프랑스 남부 공증인의 아들. 나폴레옹 원수로 아우스터리츠에서 프라첸 고지를 돌파했고, 루이 필리프 정부에서 총리를 세 차례 지냈다. 스페인 점령기에 세비야 종교화를 대규모로 수집했다.
- **외형 프롬프트**:

```
Portrait of Jean-de-Dieu Soult, Napoleonic marshal and later prime minister, French marshal in his 40s, solid disciplined face, dark hair, blue marshal uniform, later also formal 19th-century statesman coat option, composed ambitious expression, Empire oil portrait, face centered
```

### 47. 장바티스트 베르나도트 (Jean-Baptiste Bernadotte)

- **slug**: `jean-baptiste-bernadotte`
- **구분**: 역사 / tier `light` / commander
- **생몰**: 1763 ~ 1844
- **수식어**: 스웨덴 국왕
- **누구**: 프랑스 남서부 포 출신의 군인. 혁명기 사병에서 원수까지 오른 뒤 스웨덴 왕세자로 선출되어 칼 14세 요한으로 즉위했고, 현 스웨덴 베르나도트 왕조를 열었다.
- **외형 프롬프트**:

```
Portrait of Jean-Baptiste Bernadotte (King Charles XIV John of Sweden), French marshal turned Swedish king, man in his 50s, long face, receding hairline, blue eyes, either French marshal uniform or Swedish royal regalia with orders, shrewd adaptable expression, early 19th century oil portrait, face centered
```

### 48. 제베 (Jebe)

- **slug**: `jebe`
- **구분**: 역사 / tier `light` / commander
- **생몰**: ? ~ 1225
- **수식어**: 칭기즈의 신궁
- **누구**: 타이치우드 출신 궁수로 칭기즈 칸에게 투항해 몽골 제국의 명장이 되었다. 쿠츨루크 정복과 호라즘 추격전을 지휘하고 수부타이와 함께 서방 원정을 이끌었다.
- **외형 프롬프트**:

```
Portrait of Jebe, Mongol general and archer of Genghis Khan, Mongol warrior in his 30s-40s, lean sharp face, keen archer's eyes, traditional Mongol armor with composite bow, silent deadly competence, historical steppe portrait, face centered
```

### 49. 제우스 (Zeus)

- **slug**: `zeus`
- **구분**: 신화/허구 / tier `fiction` / leader
- **수식어**: 신들의 왕
- **누구**: 그리스 신화 속 존재. 올림포스의 최고신이자 신들의 왕으로, 트로이 전쟁의 운명을 저울질했다.
- **외형 프롬프트**:

```
Portrait of Zeus, king of the Greek gods, mature powerful male god, full thick beard and hair of storm-cloud grey and dark, majestic stern face, royal himation, lightning bolt motif, absolute authority, classical mythological painting, face centered
```

### 50. 조고 (Zhao Gao)

- **slug**: `zhao-gao`
- **구분**: 역사 / tier `light` / politician
- **생몰**: ? ~ -207
- **수식어**: 지록위마의 권신
- **누구**: 진(秦)의 환관 출신 권신. 옥법에 밝아 시황제의 신임을 얻었고, 시황제 사후 조서를 위조해 호해를 2세 황제로 세운 뒤 국정을 농단하다 자영에게 주살됐다.
- **외형 프롬프트**:

```
Portrait of Zhao Gao (趙高), Qin eunuch power-broker, Chinese court official in his 50s, thin cunning face, no beard (eunuch), elaborate official robes and tall hat of Qin, cold calculating eyes, traditional Chinese historical portrait, face centered
```

### 51. 조아생 뮈라 (Joachim Murat)

- **slug**: `joachim-murat`
- **구분**: 역사 / tier `light` / commander
- **생몰**: 1767-03-25 ~ 1815-10-13
- **수식어**: 나폴리 국왕
- **누구**: 프랑스 여관집 아들로 태어나 나폴레옹 휘하에서 대육군 기병을 이끈 제국 원수. 화려한 돌격으로 이름을 떨쳤고 나폴리 국왕에 올랐으나 실각 뒤 총살당했다.
- **외형 프롬프트**:

```
Portrait of Joachim Murat, Napoleonic cavalry marshal and King of Naples, flamboyant French marshal in his 40s, curly dark hair, handsome theatrical face, extremely ornate cavalry uniform with plumes, gold, and bright colors, dashing reckless smile, Empire oil portrait, face centered
```

### 52. 조제프 푸셰 (Joseph Fouche)

- **slug**: `joseph-fouche`
- **구분**: 역사 / tier `light` / politician
- **생몰**: 1759-05-21 ~ 1820-12-26
- **수식어**: 경찰장관
- **누구**: 프랑스 정치가. 혁명·나폴레옹·왕정복고를 거치며 경찰장관을 지낸 근대 정보정치·비밀경찰의 원형.
- **외형 프롬프트**:

```
Portrait of Joseph Fouché, Napoleon's police minister, French politician in his 50s, thin pale face, cold eyes, thin lips, dark severe civilian coat of Empire era, aura of surveillance and calculation, neoclassical oil portrait, face centered
```

### 53. 조제핀 드 보아르네 (Josephine de Beauharnais)

- **slug**: `josephine-de-beauharnais`
- **구분**: 역사 / tier `light` / politician
- **생몰**: 1763-06-23 ~ 1814-05-29
- **수식어**: 나폴레옹 황후
- **누구**: 프랑스 제1제국 황후. 나폴레옹의 첫 부인. 말메종 저택에서 식물학과 장미 정원을 후원한 예술 후원자.
- **외형 프롬프트**:

```
Portrait of Joséphine de Beauharnais, first Empress of the French, Creole-born French woman in her 40s, elegant soft features, dark curly hair in Empire style, high-waisted white Empire dress with cashmere shawl, graceful refined expression, neoclassical oil portrait by style of Gérard or Isabey, face centered
```

### 54. 조치 (Jochi)

- **slug**: `jochi`
- **구분**: 역사 / tier `light` / commander
- **생몰**: 1182 ~ 1227
- **수식어**: 주치 울루스
- **누구**: 칭기즈칸의 장남. 몽골 서방 원정을 지휘해 호라즘 정벌에서 시르다리야 하류 도시들을 점령했다. 후손이 킵차크 칸국을 세운 주치 울루스의 시조.
- **외형 프롬프트**:

```
Portrait of Jochi, eldest son of Genghis Khan, Mongol prince-commander in his 30s-40s, strong steppe features, slight uncertainty of lineage reflected in complex expression, Mongol warrior-prince dress with fur and gold, historical portrait, face centered
```

### 55. 진수 (Chen Shou)

- **slug**: `chen-shou`
- **구분**: 역사 / tier `full` / humanities_scholar
- **생몰**: 233 ~ 297
- **수식어**: 「삼국지」
- **누구**: 서진의 사관. 정사 「삼국지」 65권을 저술해 위·촉·오 삼국의 역사를 기전체로 한데 묶었다. 사마천 「사기」의 체제를 잇는 평어(評曰) 문체로 동아시아 사학의 골격을 다졌다.
- **외형 프롬프트**:

```
Portrait of Chen Shou (陳壽), author of Records of the Three Kingdoms, Chinese historian of Western Jin in his 50s, scholarly thin face, neat beard, literati robes and cap, calm objective eyes of a historian, traditional Chinese portrait painting, face centered
```

### 56. 차가타이 (Chagatai Khan)

- **slug**: `chagatai-khan`
- **구분**: 역사 / tier `light` / politician
- **생몰**: 1183 ~ 1242
- **수식어**: 야사 수호자
- **누구**: 몽골 제국의 칸이자 칭기즈칸의 둘째 아들. 몽골 관습법 야사의 수호자로 재판과 법 집행을 주관했고, 차가타이 칸국을 세웠다.
- **외형 프롬프트**:

```
Portrait of Chagatai Khan, second son of Genghis Khan, Mongol prince known as guardian of the Yassa law, stern Mongol face in his 40s-50s, rigid upright bearing, traditional Mongol robes, severe law-keeper expression, historical portrait, face centered
```

### 57. 카산드라 (Cassandra)

- **slug**: `cassandra`
- **구분**: 신화/허구 / tier `fiction` / other
- **수식어**: 트로이 예언자
- **누구**: 그리스 신화 속 인물. 트로이의 공주이자 예언자로, 아무도 믿지 않는 예언의 저주를 받았다.
- **외형 프롬프트**:

```
Portrait of Cassandra of Troy, cursed prophetess, young Trojan princess late teens-20s, dark hair, haunted beautiful eyes that see doom, Trojan royal dress, tragic intensity, classical painting, face centered
```

### 58. 카산드로스 (Cassander)

- **slug**: `cassander`
- **구분**: 역사 / tier `light` / politician
- **생몰**: -355 ~ -297
- **수식어**: 테살로니카 창건
- **누구**: 마케도니아 섭정 안티파트로스의 장남. 디아도코이 전쟁에서 올림피아스를 처형하고 록사네와 알렉산드로스 4세를 제거한 뒤 왕위에 올랐으며, 테살로니카를 세웠다.
- **외형 프롬프트**:

```
Portrait of Cassander, king of Macedon, Diadochi ruler in his 40s-50s, hard Macedonian face, short hair and beard, royal diadem, purple cloak, ruthless political eyes, Hellenistic portrait painting, face centered
```

### 59. 카시우스 (Gaius Cassius Longinus)

- **slug**: `gaius-cassius-longinus`
- **구분**: 역사 / tier `light` / commander
- **생몰**: -86 ~ -42
- **수식어**: 카이사르 암살자
- **누구**: 로마 공화정 말기의 원로원 의원이자 장군. 카르헤 전투에서 패잔병을 구하고 시리아를 방어했으며, 카이사르 암살을 주도한 뒤 필리피에서 스스로 목숨을 끊었다. 후기에 에피쿠로스 철학을 받아들였다.
- **외형 프롬프트**:

```
Portrait of Gaius Cassius Longinus, Roman assassin of Caesar, lean Roman aristocrat mid-40s, sharp intense face, short hair, clean-shaven, lean body, white toga, cold determined eyes, classical Roman oil portrait, face centered
```

### 60. 칼립소 (Calypso)

- **slug**: `calypso`
- **구분**: 신화/허구 / tier `fiction` / other
- **수식어**: 오기기아의 님프
- **누구**: 그리스 신화 속 존재. 오기기아 섬의 님프로, 오디세우스를 7년간 붙잡아 두었다.
- **외형 프롬프트**:

```
Portrait of Calypso, nymph of Ogygia, eternally young beautiful goddess-nymph, long flowing hair, otherworldly beauty, island nature motifs in dress, lonely seductive expression, classical mythological painting, face centered
```

### 61. 크라수스 (Marcus Licinius Crassus)

- **slug**: `marcus-licinius-crassus`
- **구분**: 역사 / tier `light` / commander
- **생몰**: -115 ~ -53
- **수식어**: 로마 최고 부자
- **누구**: 로마 공화정 말기의 정치가이자 지휘관. 부동산과 광산으로 로마 최고의 부를 쌓았고 스파르타쿠스 반란을 진압했다. 삼두정치의 일원이었으나 카레 전투에서 파르티아에 패해 전사했다.
- **외형 프롬프트**:

```
Portrait of Marcus Licinius Crassus, richest man in Rome, Roman triumvir in his 50s-60s, fleshy prosperous face, receding hair, calculating eyes, rich toga and gold rings suggesting wealth, classical Roman portrait, face centered
```

### 62. 클레이토스 (Cleitus the Black)

- **slug**: `cleitus-the-black`
- **구분**: 역사 / tier `relation` / commander
- **생몰**: -375 ~ -328
- **수식어**: 흑클레이토스
- **누구**: 마케도니아의 기병 지휘관. 그라니코스 전투에서 알렉산드로스 대왕의 목숨을 구했으나, 훗날 연회에서 왕과 언쟁 끝에 그의 창에 죽었다.
- **외형 프롬프트**:

```
Portrait of Cleitus the Black, Macedonian cavalry officer who saved Alexander, robust Macedonian warrior in his 40s, dark hair and beard (epithet 'Black'), scarred soldier face, bronze armor and purple cloak, loyal fierce eyes, Hellenistic portrait, face centered
```

### 63. 키르케 (Circe)

- **slug**: `circe`
- **구분**: 신화/허구 / tier `fiction` / other
- **수식어**: 마녀 여신
- **누구**: 그리스 신화 속 존재. 아이아이에 섬의 마녀 여신으로, 오디세우스의 부하들을 돼지로 만들었다.
- **외형 프롬프트**:

```
Portrait of Circe, sorceress goddess of Aeaea, beautiful dangerous woman, dark hair with hints of wildness, knowing magical eyes, flowing robes with herbal motifs, wand or cup of potion, classical mythological painting, face centered
```

### 64. 텔레마코스 (Telemachus)

- **slug**: `telemachus`
- **구분**: 신화/허구 / tier `fiction` / other
- **수식어**: 오디세우스의 아들
- **누구**: 그리스 신화 속 인물. 오디세우스와 페넬로페의 아들로, 아버지를 찾아 나서며 성장한다.
- **외형 프롬프트**:

```
Portrait of Telemachus, son of Odysseus, young Greek prince late teens-early 20s, resemblance to Odysseus but younger and less weathered, earnest coming-of-age expression, simple Ithacan prince dress, Homeric painting, face centered
```

### 65. 툴루이 (Tolui)

- **slug**: `tolui`
- **구분**: 역사 / tier `light` / commander
- **생몰**: 1191 ~ 1232
- **수식어**: 예케 노얀
- **누구**: 칭기즈 칸과 보르테의 넷째 아들. 금나라와 호라즘 원정에서 활약한 몽골 제국 최고의 전사이자, 몽케 칸과 쿠빌라이 칸의 아버지.
- **외형 프롬프트**:

```
Portrait of Tolui, youngest son of Genghis Khan, Mongol prince and warrior in his 30s-40s, strong young Mongol features, warrior dress, intense eyes of the father of future Great Khans, historical steppe portrait, face centered
```

### 66. 파르메니온 (Parmenion)

- **slug**: `parmenion`
- **구분**: 역사 / tier `light` / commander
- **생몰**: -400 ~ -330
- **수식어**: 노장
- **누구**: 마케도니아의 장군. 필리포스 2세의 최측근이자 알렉산드로스 원정의 2인자로 좌익을 지휘했다. 신중한 전략가로 이름났으나 아들 필로타스의 반역 연루로 처형됐다.
- **외형 프롬프트**:

```
Portrait of Parmenion, senior Macedonian general under Philip and Alexander, elderly Greek general in his 60s-70s, grey hair and beard, experienced lined face, Macedonian armor, cautious wise veteran expression, Hellenistic portrait painting, face centered
```

### 67. 파리스 (Paris)

- **slug**: `paris`
- **구분**: 신화/허구 / tier `fiction` / other
- **수식어**: 트로이 왕자
- **누구**: 그리스 신화 속 인물. 트로이 왕자로, 헬레네를 데려가 전쟁을 일으켰고 아킬레우스를 활로 쏘아 죽였다.
- **외형 프롬프트**:

```
Portrait of Paris (Alexander) of Troy, Trojan prince who took Helen, handsome young man mid-20s, refined almost soft features, Phrygian cap or Trojan prince dress, bow of an archer, charming irresponsible beauty, classical epic painting, face centered
```

### 68. 파트로클로스 (Patroclus)

- **slug**: `patroclus`
- **구분**: 신화/허구 / tier `fiction` / commander
- **수식어**: 아킬레우스의 벗
- **누구**: 그리스 신화 속 인물. 아킬레우스의 절친한 동료로, 그의 갑옷을 입고 싸우다 헥토르에게 죽었다.
- **외형 프롬프트**:

```
Portrait of Patroclus, beloved companion of Achilles, Greek warrior in his 20s, gentle noble face compared to Achilles, short dark hair, armor of Achilles (slightly too great), loyal warm eyes, Homeric epic painting, face centered
```

### 69. 페넬로페 (Penelope)

- **slug**: `penelope`
- **구분**: 신화/허구 / tier `fiction` / other
- **수식어**: 이타카 왕비
- **누구**: 그리스 신화 속 인물. 오디세우스의 아내로, 20년을 기다리며 구혼자들을 지략으로 물리쳤다.
- **외형 프롬프트**:

```
Portrait of Penelope, queen of Ithaca, wife of Odysseus, Greek woman in her 30s-40s, intelligent patient beauty, dark hair modestly bound, weaving-related dignity, steadfast loyal eyes, Homeric painting, face centered
```

### 70. 펜테실레이아 (Penthesilea)

- **slug**: `penthesilea`
- **구분**: 신화/허구 / tier `fiction` / commander
- **수식어**: 아마존 여왕
- **누구**: 그리스 신화 속 인물. 아마존의 여왕으로, 트로이 편에서 싸우다 아킬레우스의 손에 죽었다.
- **외형 프롬프트**:

```
Portrait of Penthesilea, Amazon queen who fought at Troy, athletic warrior woman in her 20s-30s, fierce beautiful face, short or bound dark hair under helmet, Amazon armor and battle-axe or spear, tragic heroic pride, classical epic painting, face centered
```

### 71. 포세이돈 (Poseidon)

- **slug**: `poseidon`
- **구분**: 신화/허구 / tier `fiction` / other
- **수식어**: 바다의 신
- **누구**: 그리스 신화 속 존재. 바다의 신으로, 오디세우스의 귀향을 오래도록 방해했다.
- **외형 프롬프트**:

```
Portrait of Poseidon, Greek god of the sea, mature powerful male god, thick dark beard wet with sea spray, stormy blue-green eyes, trident, muscular sea-god physique, classical mythological painting, face centered
```

### 72. 폴리페모스 (Polyphemus)

- **slug**: `polyphemus`
- **구분**: 신화/허구 / tier `fiction` / other
- **수식어**: 외눈 거인
- **누구**: 그리스 신화 속 존재. 외눈박이 거인 키클롭스로, 오디세우스 일행을 가뒀다가 눈을 찔려 눈이 멀었다.
- **외형 프롬프트**:

```
Portrait of Polyphemus the Cyclops, giant one-eyed son of Poseidon, massive brutish male giant, single large eye in forehead, shaggy hair and beard, crude shepherd of sheep, Homeric monstrous portrait (still face-centered for avatar crop), classical painting
```

### 73. 폼페이우스 (Pompey the Great)

- **slug**: `pompey-the-great`
- **구분**: 역사 / tier `light` / commander
- **생몰**: -106 ~ -48
- **수식어**: 마그누스
- **누구**: 로마 공화정 말기의 지휘관. 지중해 해적을 소탕하고 동방을 재편했으며, 카이사르와 삼두정치를 이끌다 파르살루스에서 패해 이집트에서 암살당했다.
- **외형 프롬프트**:

```
Portrait of Pompey the Great (Gnaeus Pompeius Magnus), Roman general, Roman man in his 40s-50s, round face, distinctive swept-up hairstyle mimicking Alexander, clean-shaven, proud triumphant expression, military cloak over cuirass, classical Roman oil portrait, face centered
```

### 74. 프리아모스 (Priam)

- **slug**: `priam`
- **구분**: 신화/허구 / tier `fiction` / politician
- **수식어**: 트로이 왕
- **누구**: 그리스 신화 속 인물. 트로이의 늙은 왕으로, 아들 헥토르의 시신을 돌려받으러 아킬레우스를 찾아갔다.
- **외형 프롬프트**:

```
Portrait of Priam, aged king of Troy, elderly Trojan king, long white hair and beard, tragic dignified face, royal Trojan robes, eyes heavy with loss of sons, Homeric epic painting, face centered
```

### 75. 필리포스 2세 (Philip II of Macedon)

- **slug**: `philip-ii-of-macedon`
- **구분**: 역사 / tier `light` / commander
- **생몰**: -382 ~ -336
- **수식어**: 팔랑크스 개혁
- **누구**: 고대 마케도니아의 왕. 사리사 장창과 팔랑크스로 군을 개혁하고 카이로네이아 전투에서 그리스를 제압해 코린토스 동맹의 맹주가 되었다. 아들 알렉산드로스에게 정복의 토대를 물려줬다.
- **외형 프롬프트**:

```
Portrait of Philip II of Macedon, father of Alexander, Macedonian king in his 40s, one eye injured or scarred from siege, strong bearded face, royal diadem, tough reformer-king presence, Hellenistic royal portrait, face centered
```

### 76. 헤라 (Hera)

- **slug**: `hera`
- **구분**: 신화/허구 / tier `fiction` / other
- **수식어**: 신들의 여왕
- **누구**: 그리스 신화 속 존재. 제우스의 아내이자 신들의 여왕으로, 트로이를 미워해 그리스 편을 들었다.
- **외형 프롬프트**:

```
Portrait of Hera, queen of the Greek gods, mature majestic goddess, regal beauty with proud severe expression, elaborate classical Greek hairstyle and diadem, peacock motifs, white and gold peplos, classical mythological painting, face centered
```

### 77. 헤파이스티온 (Hephaestion)

- **slug**: `hephaestion`
- **구분**: 역사 / tier `light` / commander
- **생몰**: -356 ~ -324
- **수식어**: 킬리아르코스
- **누구**: 고대 마케도니아의 장군이자 알렉산드로스 대왕의 최측근. 제국 서열 2위 킬리아르코스로 기병 지휘와 병참, 도시 건설, 외교를 총괄했다.
- **외형 프롬프트**:

```
Portrait of Hephaestion, closest companion of Alexander the Great, handsome Macedonian officer in his 30s, youthful idealized features, short curly hair, clean-shaven or light beard, purple-trimmed cloak over armor, loyal intimate expression, Hellenistic portrait painting, face centered
```

### 78. 헥토르 (Hector)

- **slug**: `hector`
- **구분**: 신화/허구 / tier `fiction` / commander
- **수식어**: 트로이 왕자
- **누구**: 그리스 신화 속 인물. 트로이의 첫째 왕자이자 최고의 전사로, 조국을 지키다 아킬레우스에게 죽었다.
- **외형 프롬프트**:

```
Portrait of Hector, prince of Troy and greatest Trojan warrior, noble Trojan man in his 30s, strong honorable face, short dark hair and beard, bronze Trojan armor with horsehair helmet crest, protective duty-bound eyes, Homeric epic portrait, face centered
```

### 79. 호해 (Hu Hai)

- **slug**: `hu-hai`
- **구분**: 역사 / tier `light` / politician
- **생몰**: -230 ~ -207
- **수식어**: 이세황제
- **누구**: 진 시황제의 막내아들이자 진나라 2세 황제. 조고와 이사의 정변으로 형 부소를 제치고 즉위했으나, 향락과 조고의 전횡 속에 진나라를 급속히 무너뜨리고 22세에 자결했다.
- **외형 프롬프트**:

```
Portrait of Huhai (Qin Er Shi), second emperor of Qin, young Chinese emperor in early 20s, immature weak face, elaborate imperial robes and crown of Qin, fearful eyes under Zhao Gao's shadow, traditional Chinese historical portrait, face centered
```

### 80. 훌라구 (Hulagu Khan)

- **slug**: `hulagu-khan`
- **구분**: 역사 / tier `light` / commander
- **생몰**: 1218 ~ 1265
- **수식어**: 일칸국 창건자
- **누구**: 몽골 제국의 왕족이자 지휘관. 칭기즈 칸의 손자로 서아시아 원정을 이끌어 1258년 바그다드를 함락하고 일칸국을 세웠으며, 학자를 후원해 마라게 천문대를 건립했다.
- **외형 프롬프트**:

```
Portrait of Hulagu Khan, founder of the Ilkhanate, Mongol prince-commander destroyer of Baghdad, Mongol ruler in his 40s, stern high-cheekboned face, imperial Mongol dress with Persian influence emerging, cold conqueror eyes, historical portrait painting, face centered
```

---

## 2. 현대 인물 (설명만)

실사 사진 수집 가능. Wikimedia/공식/보도 사진으로 등록. AI 생성 금지 정책 유지.

### 1. T.S. 엘리엇 (T.S. Eliot)

- **slug**: `t.s.-eliot`
- **tier**: `full` / author / GB
- **생몰**: 1888-09-26 ~ 1965-01-04
- **수식어**: 황무지
- **누구**: 미국 출생 영국 시인이자 평론가. 모더니즘 시의 정점. 「황무지」와 「Four Quartets」로 20세기 영미시 지형을 바꿨고, 1948년 노벨문학상을 받았다.

### 2. 김경주 (Kim Kyung-ju)

- **slug**: `kim-kyung-ju`
- **tier**: `full` / author / KR
- **생몰**: 1976-04-04 ~ 생존
- **수식어**: 미래파의 토종 랭보
- **누구**: 전남 광주 출신의 한국 시인. 서강대 철학과를 졸업하고 2003년 신춘문예로 등단했다. 시집 '나는 이 세상에 없는 계절이다'로 주목받고 시집 '시차의 눈을 달랜다'로 김수영문학상을 받았으며, 시·시극·산문·록 밴드를 넘나든 2000년대 미래파의 핵심이다.

### 3. 김수영 (Kim Su-young)

- **slug**: `kim-su-young`
- **tier**: `full` / author / KR
- **생몰**: 1921-11-27 ~ 1968-06-16
- **수식어**: 「풀」
- **누구**: 한국 모더니즘 시의 정점. 일제·전쟁·혁명을 통과한 자유와 일상의 시인. 「풀」 「폭포」 「시여, 침을 뱉어라」로 한국 시론의 분수령을 세웠다.

### 4. 김영삼 (Young-sam Kim)

- **slug**: `young-sam-kim`
- **tier**: `light` / entrepreneur / KR
- **생몰**: 1966 ~ 생존
- **수식어**: 아이러브스쿨
- **누구**: 한국의 벤처기업가. 1999년 KAIST 재학 중 동창 찾기 사이트 아이러브스쿨을 창업해 1년 만에 회원 500만 명을 모았다. 지분 매각 분쟁으로 19년 소송 끝에 대법원에서 승소했다.

### 5. 김용현 (Yong-hyun Kim)

- **slug**: `yong-hyun-kim`
- **tier**: `light` / entrepreneur / KR
- **생몰**: 1978 ~ 생존
- **수식어**: 당근 창업자
- **누구**: 서울대 경제학부 출신으로 삼성물산·네이버·카카오를 거친 기업가. 2015년 지역 생활 커뮤니티 당근마켓을 공동 창업해 대표적인 동네 기반 플랫폼으로 키웠다.

### 6. 돔 호프먼 (Dom Hofmann)

- **slug**: `dom-hofmann`
- **tier**: `light` / entrepreneur / US
- **생몰**: 1986 ~ 생존
- **수식어**: 바인 창업자
- **누구**: 미국의 개발자이자 기업가. 6초 루프 영상 서비스 바인(Vine)을 공동 창업해 숏폼 영상 문화의 원형을 만들었다. 이후 바이트(Byte)와 NFT 프로젝트 루트(Loot)를 만들었다.

### 7. 라이언 피터슨 (Ryan Petersen)

- **slug**: `ryan-petersen`
- **tier**: `full` / entrepreneur / US
- **생몰**: 1980 ~ 생존
- **수식어**: 플렉스포트
- **누구**: 미국의 기업가. 디지털 물류 기업 플렉스포트를 창업해 글로벌 화물 운송을 소프트웨어로 통합했다.

### 8. 롭 퍼거스 (Rob Fergus)

- **slug**: `rob-fergus`
- **tier**: `light` / scientist / GB
- **수식어**: ZFNet
- **누구**: 영국 출신 컴퓨터과학자. NYU 쿠랑 연구소 교수이자 Meta FAIR 책임자로, CNN 시각화 기법(ZFNet)으로 딥러닝 해석 가능성을 개척했다.

### 9. 루카스 바이어 (Lucas Beyer)

- **slug**: `lucas-beyer`
- **tier**: `full` / scientist / BE
- **생몰**: 1990 ~ 생존
- **수식어**: ViT
- **누구**: 벨기에 출신 컴퓨터 비전 연구자. Vision Transformer(ViT), SigLIP, MLP-Mixer 등 현대 비전 AI의 핵심 논문을 공동 저술했으며, Google DeepMind에서 OpenAI 취리히를 거쳐 2025년 메타 슈퍼인텔리전스 팀에 합류했다.

### 10. 멕 휘트먼 (Meg Whitman)

- **slug**: `meg-whitman`
- **tier**: `light` / entrepreneur / US
- **생몰**: 1956-08-04 ~ 생존
- **수식어**: eBay 신화
- **누구**: 미국의 기업인. eBay CEO로 10년간 연매출 400만 달러 회사를 80억 달러 규모로 키웠다. 이후 HP CEO, 퀴비 CEO, 주케냐 미국대사를 지냈다.

### 11. 목시 말린스파이크 (Moxie Marlinspike)

- **slug**: `moxie-marlinspike`
- **tier**: `light` / entrepreneur / US
- **수식어**: 시그널 창시자
- **누구**: 미국의 암호학자·해커·기업가. 시그널 프로토콜을 공동 설계하고 암호화 메신저 시그널을 만들어 수십억 명의 대화에 종단간 암호화를 심었다.

### 12. 무하마드 알리 (Muhammad Ali)

- **slug**: `muhammad-ali`
- **tier**: `full` / athlete / US
- **생몰**: 1942-01-17 ~ 2016-06-03
- **수식어**: The Greatest
- **누구**: 미국 켄터키 루이빌 출신 헤비급 복서. 1960 로마 올림픽 금메달 이후 1964년 소니 리스턴을 꺾고 챔피언에 올랐고, 베트남전 징집 거부와 30여 년 파킨슨 투병을 거치며 「The Greatest」로 불렸다.

### 13. 문성욱 (Sung-uk Moon)

- **slug**: `sung-uk-moon`
- **tier**: `light` / entrepreneur / KR
- **생몰**: 1980 ~ 생존
- **수식어**: 블라인드 창업자
- **누구**: 직장인 익명 커뮤니티 블라인드를 만든 팀블라인드 창업자 겸 CEO. 윙버스를 창업해 네이버에 매각했고, 네이버와 티몬을 거쳐 2013년 블라인드를 출시해 글로벌 서비스로 키웠다.

### 14. 박경리 (Park Kyong-ni)

- **slug**: `park-kyong-ni`
- **tier**: `light` / author / KR
- **생몰**: 1926-12-02 ~ 2008-05-05
- **수식어**: 토지의 어머니
- **누구**: 경남 통영 출신 소설가. 1969년부터 25년에 걸쳐 5부 16권의 대하소설 「토지」를 완성하며 한국 현대 문학의 정점에 올랐다.

### 15. 박수만 (Park Soo-man)

- **slug**: `park-soo-man`
- **tier**: `relation` / entrepreneur / KR
- **수식어**: 미투데이 설립
- **누구**: 한국의 인터넷 기업가. 국내 첫 마이크로블로그 미투데이를 창업해 네이버에 매각했고, 이후 네이버 밴드 개발을 이끌었다.

### 16. 박완서 (Park Wan-suh)

- **slug**: `park-wan-suh`
- **tier**: `light` / author / KR
- **생몰**: 1931-10-20 ~ 2011-01-22
- **수식어**: 나목의 작가
- **누구**: 한국 현대 소설가. 40세에 장편 '나목'으로 등단해 전쟁의 상흔과 중산층 위선을 꿰뚫은 '한국 여성 소설의 어머니'로 불린다.

### 17. 박태훈 (Park Tae-hoon)

- **slug**: `park-tae-hoon`
- **tier**: `light` / entrepreneur / KR
- **생몰**: 1985 ~ 생존
- **수식어**: 왓챠 창업자
- **누구**: 카이스트 전산학과 출신 기업인. 2011년 프로그램스를 창업해 개인화 추천 서비스 왓챠피디아와 토종 OTT 왓챠를 만들었다.

### 18. 브라이언 싱어먼 (Brian Singerman)

- **slug**: `brian-singerman`
- **tier**: `full` / investor / US
- **생몰**: 1976 ~ 생존
- **수식어**: 파운더스 펀드
- **누구**: 미국의 벤처투자자. 파운더스 펀드의 간판 파트너로 에어비앤비·스트라이프 등 틸 생태계의 주요 투자를 이끌었다.

### 19. 비벡 라마스와미 (Vivek Ramaswamy)

- **slug**: `vivek-ramaswamy`
- **tier**: `full` / entrepreneur / US
- **생몰**: 1985-08-09 ~ 생존
- **수식어**: 스트라이브 창업
- **누구**: 미국의 기업가이자 정치인. 제약회사 로이반트와 자산운용사 스트라이브를 창업했고, 2024년 미국 대선 공화당 경선에 출마했다.

### 20. 샤오화 자이 (Xiaohua Zhai)

- **slug**: `xiaohua-zhai`
- **tier**: `light` / scientist / CN
- **수식어**: SigLIP
- **누구**: 중국 출신 컴퓨터 비전 연구자. 북경대 박사 출신으로 Google Brain·DeepMind를 거쳐 Vision Transformer 확장과 SigLIP 등 대규모 비전-언어 모델을 이끌었다.

### 21. 서수길 (Seo Su-gil)

- **slug**: `seo-su-gil`
- **tier**: `light` / entrepreneur / KR
- **생몰**: 1967-03-09 ~ 생존
- **수식어**: 별풍선 창시자
- **누구**: 서울대 항공우주공학과 출신 기업인. 2011년 나우콤을 인수해 아프리카TV로 바꾸고 별풍선 후원 모델로 한국 1인 미디어 생태계를 열었다.

### 22. 슈차오 비 (Shuchao Bi)

- **slug**: `shuchao-bi`
- **tier**: `light` / scientist / CN
- **수식어**: GPT-4o 창시자
- **누구**: UC 버클리 수학 박사 출신 중국계 AI 연구자. Google에서 YouTube Shorts를 공동 창업했고, OpenAI에서 GPT-4o 보이스 모드와 o4-mini를 공동 창시했으며, 2025년 메타 슈퍼인텔리전스 랩에 합류해 강화학습과 AI 에이전트 연구를 이끌고

### 23. 스티브 허프먼 (Steve Huffman)

- **slug**: `steve-huffman`
- **tier**: `light` / entrepreneur / US
- **생몰**: 1983-11-12 ~ 생존
- **수식어**: 레딧 창업자
- **누구**: 미국의 기업가. 2005년 대학 졸업 직후 레딧을 공동창업했다. 2006년 매각 후 회사를 떠났다가 2015년 CEO로 복귀해 2024년 상장까지 이끌었다.

### 24. 아흐메드 셰리프 (Ahmed Sherif)

- **slug**: `ahmed-sherif`
- **tier**: `light` / entrepreneur / ?
- **수식어**: BCI 경영인
- **누구**: Neuralink CEO. 임상시험 총괄과 사업 운영을 담당하며 머스크의 뇌-기계 인터페이스 프로젝트를 이끈다.

### 25. 알렉산더 콜레스니코프 (Alexander Kolesnikov)

- **slug**: `alexander-kolesnikov`
- **tier**: `light` / scientist / RU
- **수식어**: ViT 개발자
- **누구**: 러시아 출신의 컴퓨터 비전 연구자. 구글 딥마인드와 OpenAI를 거쳐 메타 슈퍼인텔리전스 랩에 합류했으며, 이미지를 인공지능에 입력하는 표준이 된 비전 트랜스포머(ViT) 연구를 주도한 '취리히 3인방' 중 한 명이다.

### 26. 알렉스 스파이로 (Alex Spiro)

- **slug**: `alex-spiro`
- **tier**: `relation` / other / US
- **수식어**: 머스크 변호사
- **누구**: 미국의 재판 변호사. 일론 머스크와 제이지 등 유명 인사의 소송을 전담하며, 트위터 인수 등 굵직한 사건의 법률 대응을 맡았다.

### 27. 애런 슈워츠 (Aaron Swartz)

- **slug**: `aaron-swartz`
- **tier**: `light` / leader / US
- **생몰**: 1986-11-08 ~ 2013-01-11
- **수식어**: 인터넷의 아들
- **누구**: 미국의 프로그래머이자 정보자유 운동가. 14세에 RSS 1.0 명세를 공동 저술하고 레딧을 공동 설립했다. 크리에이티브 커먼즈 초기 개발에 참여했고 오픈 액세스 운동을 이끌었다.

### 28. 앤드루 와인라이크 (Andrew Weinreich)

- **slug**: `andrew-weinreich`
- **tier**: `light` / entrepreneur / US
- **생몰**: 1968 ~ 생존
- **수식어**: SNS 창시자
- **누구**: 미국의 연쇄 창업가. 1997년 세계 최초의 소셜네트워크 SixDegrees를 만들고 소셜네트워킹 특허를 등록했다. 이후 7개 스타트업을 창업하며 위치기반 서비스 등 신기술 흐름을 앞서 개척했다.

### 29. 앤드루 털럭 (Andrew Tulloch)

- **slug**: `andrew-tulloch`
- **tier**: `light` / scientist / AU
- **생몰**: 1989 ~ 생존
- **수식어**: PyTorch 개척자
- **누구**: 호주 퍼스 출신 머신러닝 엔지니어. 시드니대 수학 최우등 졸업 후 Meta에서 10년간 PyTorch ML 인프라를 구축했고, OpenAI GPT-4o·o3 사전학습을 거쳐 Thinking Machines Lab을 공동 창업했다.

### 30. 앤서니 암스트롱 (Anthony Armstrong)

- **slug**: `anthony-armstrong`
- **tier**: `relation` / entrepreneur / US
- **수식어**: X CFO
- **누구**: 미국의 금융 전문가. 모건스탠리에서 일론 머스크의 트위터 인수 자문을 맡았고, 이후 xAI와 X의 CFO로 합류했다.

### 31. 얀 쿰 (Jan Koum)

- **slug**: `jan-koum`
- **tier**: `light` / entrepreneur / US
- **생몰**: 1976-02-24 ~ 생존
- **수식어**: 왓츠앱 창업자
- **누구**: 우크라이나 출신 미국 기업가. 16세에 이민해 야후 엔지니어로 일했고, 2009년 왓츠앱을 공동 창업해 2014년 페이스북에 190억 달러에 매각했다.

### 32. 에밋 시어 (Emmett Shear)

- **slug**: `emmett-shear`
- **tier**: `light` / entrepreneur / US
- **생몰**: 1983 ~ 생존
- **수식어**: 트위치 창업자
- **누구**: 미국의 기업가. 저스틴tv를 거쳐 트위치를 공동창업하고 CEO로 이끌었으며, 2023년 OpenAI 임시 CEO를 맡았다. 현재 AI 정렬 스타트업 소프트맥스를 이끈다.

### 33. 위 지아후이 (余家辉) (Jiahui Yu)

- **slug**: `jiahui-yu`
- **tier**: `light` / scientist / CN
- **수식어**: GPT-4o 인식
- **누구**: 중국 출신 AI 연구자. Google DeepMind에서 Gemini 멀티모달을 공동 주도했고, OpenAI에서 Perception 팀을 이끌며 GPT-4o·o3를 개발했다.

### 34. 이동형 (Lee Dong-hyung)

- **slug**: `lee-dong-hyung`
- **tier**: `light` / entrepreneur / KR
- **생몰**: 1965 ~ 생존
- **수식어**: 싸이월드
- **누구**: 한국의 기업가. 1999년 싸이월드를 공동 창업해 미니홈피와 일촌으로 한국 1세대 SNS 문화를 열었다. 이후 일본 싸이월드 대표와 경남창조경제혁신센터장을 지내며 창업 생태계를 지원한다.

### 35. 이재현 (Lee Jay-hyun)

- **slug**: `lee-jay-hyun`
- **tier**: `light` / entrepreneur / KR
- **생몰**: 1960-03-19 ~ 생존
- **수식어**: 문화보국
- **누구**: CJ그룹 회장. 1995년 드림웍스 투자로 문화사업에 뛰어들어 CJ ENM, CGV, 티빙 등 K콘텐츠 산업의 기반을 놓았다.

### 36. 장샤오룽 (Allen Zhang)

- **slug**: `allen-zhang`
- **tier**: `light` / entrepreneur / CN
- **생몰**: 1969-12-03 ~ 생존
- **수식어**: 위챗
- **누구**: 중국 후난성 출신 개발자이자 기업인. 이메일 프로그램 Foxmail을 혼자 개발했고, 텐센트에서 위챗을 만들어 10억 명이 넘게 쓰는 서비스로 키웠다.

### 37. 잭 가라베디언 (Jack Garabedian)

- **slug**: `jack-garabedian`
- **tier**: `light` / entrepreneur / US
- **수식어**: Grok 학습팀
- **누구**: 메릴랜드대 출신. SpaceX 스타링크 성장 엔지니어링 시니어 매니저를 역임하고 2026년 6월 xAI Grok 학습팀을 이끌기 시작했다.

### 38. 저우서우즈 (Shou Zi Chew)

- **slug**: `shou-zi-chew`
- **tier**: `light` / entrepreneur / SG
- **생몰**: 1983-01-01 ~ 생존
- **수식어**: 틱톡 CEO
- **누구**: 싱가포르 출신 기업가. 골드만삭스와 DST글로벌을 거쳐 샤오미 CFO를 지냈고, 2021년부터 틱톡 CEO로서 미 의회 청문회에서 데이터 안보 공세에 맞섰다.

### 39. 전제완 (Jeon Je-wan)

- **slug**: `jeon-je-wan`
- **tier**: `light` / entrepreneur / KR
- **생몰**: 1963 ~ 생존
- **수식어**: 프리챌 창업자
- **누구**: 강원 강릉 출신 기업가. 1999년 커뮤니티 포털 프리챌을 세워 회원 1000만 명을 모았으나 유료화 실패로 물러났고, 이후 유아짱 창업과 싸이월드 인수로 재도전했다.

### 40. 정유정 (Jeong You-jeong)

- **slug**: `jeong-you-jeong`
- **tier**: `full` / author / KR
- **생몰**: 1966-04-22 ~ 생존
- **수식어**: 7년의 밤
- **누구**: 전남 함평 출신 작가. 간호사·보험심사관을 거쳐 늦깎이 등단, 「7년의 밤」 「28」 「종의 기원」으로 한국 스릴러의 정점에 올랐다.

### 41. 제이 그레이버 (Jay Graber)

- **slug**: `jay-graber`
- **tier**: `light` / entrepreneur / US
- **생몰**: 1991 ~ 생존
- **수식어**: 블루스카이
- **누구**: 미국 오클라호마 털사 출신 소프트웨어 엔지니어이자 기업가. 탈중앙 소셜 네트워크 블루스카이의 초대 CEO로 서비스를 4천만 사용자 규모로 키웠다.

### 42. 제이지 (Jay-Z)

- **slug**: `jay-z`
- **tier**: `light` / musician / US
- **생몰**: 1969-12-04 ~ 생존
- **수식어**: 블루프린트
- **누구**: 미국 브루클린 출신 래퍼이자 기업가. 본명 숀 카터. 로카펠라 레코드를 세워 힙합을 이끌었고, 록네이션 설립과 타이달 인수를 거쳐 2019년 힙합 최초의 억만장자가 됐다.

### 43. 제프리 카첸버그 (Jeffrey Katzenberg)

- **slug**: `jeffrey-katzenberg`
- **tier**: `light` / entrepreneur / US
- **생몰**: 1950-12-21 ~ 생존
- **수식어**: 드림웍스 창업자
- **누구**: 미국의 영화 제작자이자 기업가. 디즈니 스튜디오 수장으로 라이온킹 등 르네상스를 이끌었고, 드림웍스를 공동 창업해 슈렉을 성공시켰다. 이후 숏폼 서비스 퀴비를 창업했다.

### 44. 조너선 에이브럼스 (Jonathan Abrams)

- **slug**: `jonathan-abrams`
- **tier**: `light` / entrepreneur / CA
- **생몰**: 1970 ~ 생존
- **수식어**: 프렌드스터
- **누구**: 캐나다 출신 기업가. 2002년 최초의 대중 소셜네트워크 프렌드스터를 창업해 소셜미디어 산업의 문을 열었고, 구글의 3천만 달러 인수 제의를 거절한 일화로 유명하다.

### 45. 존 페리 발로우 (John Perry Barlow)

- **slug**: `john-perry-barlow`
- **tier**: `light` / author / US
- **생몰**: 1947-10-03 ~ 2018-02-07
- **수식어**: 사이버 독립선언
- **누구**: 미국 와이오밍 출신 에세이스트이자 그레이트풀 데드 작사가. 「사이버스페이스 독립선언」을 쓰고 전자프런티어재단(EFF)을 공동 창립해 인터넷 자유 운동을 이끌었다.

### 46. 존 허링 (John Hering)

- **slug**: `john-hering`
- **tier**: `relation` / entrepreneur / US
- **수식어**: Lookout 창립자
- **누구**: 미국의 사이버보안 기업가. 모바일 보안 기업 Lookout을 공동 창업했으며, 일론 머스크의 xAI 초기 자금 조달과 인재 영입에 관여했다.

### 47. 첼시 매닝 (Chelsea Manning)

- **slug**: `chelsea-manning`
- **tier**: `light` / influencer / US
- **생몰**: 1987-12-17 ~ 생존
- **수식어**: 내부고발자
- **누구**: 미국 육군 정보분석병 출신 내부고발자. 2010년 이라크·아프가니스탄 전쟁 기록과 외교 전문 수십만 건을 위키리크스에 넘겨 미국사 최대 규모 기밀 유출을 일으켰다. 감형 석방 후 보안 컨설턴트이자 활동가로 일한다.

### 48. 케빈 시스트롬 (Kevin Systrom)

- **slug**: `kevin-systrom`
- **tier**: `light` / entrepreneur / US
- **생몰**: 1983-12-30 ~ 생존
- **수식어**: 인스타그램 창업자
- **누구**: 미국 출신 기업가. 2010년 마이크 크리거와 인스타그램을 공동 창업해 CEO로 이끌었고, 2012년 페이스북 인수 후에도 2018년까지 서비스를 월 10억 사용자 규모로 키웠다.

### 49. 크리스 파블로프스키 (Chris Pavlovski)

- **slug**: `chris-pavlovski`
- **tier**: `light` / entrepreneur / CA
- **생몰**: 1983 ~ 생존
- **수식어**: 럼블 창업
- **누구**: 캐나다의 기업가. 동영상 플랫폼 럼블을 창업해 표현의 자유를 내세운 유튜브 대항마로 키웠다.

### 50. 톰 앤더슨 (Tom Anderson)

- **slug**: `tom-anderson`
- **tier**: `light` / entrepreneur / US
- **생몰**: 1970-11-08 ~ 생존
- **수식어**: 마이스페이스
- **누구**: 미국의 기업가. 2003년 마이스페이스를 공동 창업해 모든 가입자의 첫 친구 'Tom'으로 알려졌다. 2005년 뉴스코프에 회사를 매각했고, 은퇴 후 여행 풍경 사진가로 활동한다.

### 51. 트라핏 반살 (Trapit Bansal)

- **slug**: `trapit-bansal`
- **tier**: `light` / scientist / IN
- **수식어**: o1 설계자
- **누구**: 인도 출신 AI 연구자. OpenAI에서 강화학습 기반 추론 모델 o1의 핵심 연구를 이끌었고, 2025년 메타 슈퍼인텔리전스 랩에 합류했다.

### 52. 트레이 스티븐스 (Trae Stephens)

- **slug**: `trae-stephens`
- **tier**: `full` / investor / US
- **생몰**: 1983 ~ 생존
- **수식어**: 안두릴 창업
- **누구**: 미국의 벤처투자자이자 기업가. 파운더스 펀드 파트너로 국방 기술에 투자하며, 방산 기업 안두릴을 공동 창업했다.

### 53. 파벨 두로프 (Pavel Durov)

- **slug**: `pavel-durov`
- **tier**: `light` / entrepreneur / RU
- **생몰**: 1984-10-10 ~ 생존
- **수식어**: 텔레그램 창업자
- **누구**: 러시아 출신 기업가. 러시아 최대 소셜네트워크 VK를 만들었고, 정보기관의 이용자 정보 요구를 거부한 뒤 러시아를 떠나 암호화 메신저 텔레그램을 세웠다.

### 54. 팔머 럭키 (Palmer Luckey)

- **slug**: `palmer-luckey`
- **tier**: `full` / entrepreneur / US
- **생몰**: 1992-09-19 ~ 생존
- **수식어**: 안두릴 창업
- **누구**: 미국의 기업가. 가상현실 헤드셋 오큘러스를 창업해 페이스북에 매각했고, 방위산업 스타트업 안두릴을 세워 자율 군사 기술을 개발한다.

### 55. 호리에 다카후미 (Takafumi Horie)

- **slug**: `takafumi-horie`
- **tier**: `full` / entrepreneur / JP
- **생몰**: 1972-10-29 ~ 생존
- **수식어**: 라이브도어 창업자
- **누구**: 일본의 기업가이자 인터넷 사업가. 라이브도어를 창업해 닷컴 버블기 일본 IT 거물로 부상했고, 후지TV 인수 시도와 분식회계 사건을 거쳐 출소 후 SNS·우주 사업으로 영역을 넓혔다.

### 56. 호안 톤-탓 (Hoan Ton-That)

- **slug**: `hoan-ton-that`
- **tier**: `full` / entrepreneur / AU
- **생몰**: 1988 ~ 생존
- **수식어**: 클리어뷰 AI
- **누구**: 호주 출신의 기업가. 안면인식 기업 클리어뷰 AI를 창업해 수십억 장의 얼굴 데이터를 수집했고, 사생활 침해 논란의 중심에 섰다.

### 57. 홍위 렌 (Hongyu Ren)

- **slug**: `hongyu-ren`
- **tier**: `light` / scientist / CN
- **수식어**: GPT-4o
- **누구**: 중국 출신 인공지능 연구자. 베이징대를 졸업하고 스탠퍼드대에서 박사학위를 받았다. OpenAI에서 GPT-4o와 o1 등 추론 모델의 사후학습을 이끌었고, 2025년 메타 슈퍼인텔리전스 랩에 합류했다.

### 58. 황지우 (Hwang Ji-u)

- **slug**: `hwang-ji-u`
- **tier**: `light` / author / KR
- **생몰**: 1952-01-15 ~ 생존
- **수식어**: 해체시의 정점
- **누구**: 전남 해남 태생, 한국 1980년대 해체시·모더니즘 시운동의 대표 시인. '새들도 세상을 뜨는구나'로 김수영문학상을 받았고 '겨울-나무로부터 봄-나무에로'와 '나는 너다'를 거쳐 한국예술종합학교 총장을 지냈다.

