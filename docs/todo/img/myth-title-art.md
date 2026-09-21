# 신화 전승 제목 그림 — 이미지 발주서

**왼쪽에서 전승의 핵심 장면이 읽히고, 오른쪽에는 카드·아바타·설명 등 화면 요소가 올라올 수 있는 배경이 이어진다.**
아직 그림이 없는 전승 18개의 생성 프롬프트다. 서비스 등록 인물 이미지가 준비된 전승을 사용자의 생성 지시에 따라 제작한다.

## 공통 구성

- 3:2 가로, 1536×1024. 실사 영화의 한 장면 같은 질감. 이미지 자체에 글자·로고·UI를 그리지 않는다.
- 주요 얼굴·행동·식별 상징은 왼쪽 절반부터 중앙 직전까지 모은다. 오른쪽 약 45%는 같은 장소의 하늘·안개·물·벽면 등이 낮은 대비로 이어지는 여백이다. 화면 요소가 덮어도 핵심이 가려지지 않아야 한다. 좌우를 선이나 검은 판으로 나누지 않는다.
- **1~3명은 권장일 뿐 인원 제한이 아니다.** 단독 장면, 동물 중심 장면, 여러 동료·군중이 필요한 장면 모두 허용한다. 주인공은 충분히 크게, 조연은 역할에 따라 거리·높이·크기를 달리한다. 전원을 같은 크기의 허리 위 초상으로 맞추지 않는다.
- 행동하는 장면과 여러 신·시조를 모은 상징 표지를 구별한다. 서로 다른 시대의 인물을 한 사건의 동행자로 만들지 않는다. 신의 현현과 인간과의 만남은 해당 전승에 맞게 표현한다.
- 대표 상징을 핵심 장면에 집중한다. 연관된 유물·동물·건축을 모두 늘어놓지 않는다. 오른쪽 여백에는 식별에 꼭 필요한 상징을 숨기지 않는다.
- **인물 REF는 현재 서비스에 등록된 `portrait_url`·`avatar_url` 이미지만 쓴다.** 등록 URL에서 내려받은 로컬 사본은 허용하되, 작업 폴더의 미등록 이미지·개선 중인 후보는 쓰지 않는다. 필요한 인물의 등록 이미지가 없으면 그 전승의 생성을 보류하고 출연을 임의로 줄이지 않는다. 등록 이미지의 얼굴 정체성과 외형을 유지하며 자세·표정·복식은 장면에 맞춘다. 도구별 실행은 [`faction-image`](../../../.agents/skills/faction-image/SKILL.md)를 따른다.
- 얼굴을 보여주려고 행동·시선을 비틀지 않는다. 상대를 제대로 마주보는 옆모습·뒷모습도 허용한다. 발주문 외형과 서비스 캐릭터가 충돌하면 등록 이미지의 외형을 따른다.

유지할 실물 기준은 [일리아스](../../../sw/web/public/images/myth-atlas/title-art/homer-iliad.png), [오디세이아](../../../sw/web/public/images/myth-atlas/title-art/homer-odyssey.png), [그리스 신화](../../../sw/web/public/images/myth-atlas/title-art/myth-greek-roman.png)다. 각각 대치의 긴장, 항해와 신의 압박, 신들의 위계와 공간 깊이를 참고한다. 세 장은 재생성하지 않는다.

## 새로 만들 그림

### 로마 신화 — `myth-roman.png`

출연: 암늑대·어린 로물루스와 레무스. 로마의 기원을 그리스 신들의 집합과 구별한다.

```text
Create a 1536x1024 horizontal 3:2 live-action mythic film still, with lifelike faces, tangible materials, coherent light and subtle film grain. No text, logos or interface graphics.

At ground level in the left foreground, a SHE-WOLF lies protectively beside the twin infants Romulus and Remus at a shallow riverbank shelter. The twins nestle safely against her belly on pale cloth and reeds. One reaches toward her fur; the other sleeps. Her alert head is raised, turned toward a sound beyond the frame. Make wolf and children large and close, framed by the cave opening and a few fig roots on the left. This is a living encounter with convincing anatomy, not a bronze statue.

The right opens onto muted Tiber water and unbuilt hills in dawn mist. Soft light grazes the wolf's face and the infants' cloth while the shelter stays shaded. The landscape belongs to the time before monumental Rome. Broad quiet water provides room for later overlays.

COMPOSITION: Keep all essential faces, actions and identifying symbols within the left 55%. Reserve the right 45% as a continuous, low-contrast extension of this setting for later screen overlays. Do not render the overlays. Let depth and atmosphere create the quiet area naturally, without a dividing line or a blank panel.
```

### 중국 상고 신화 — `myth-china-ancient.png`

출연: 여와. 무너진 하늘을 오색돌로 메우는 보천 신화.

```text
Create a 1536x1024 horizontal 3:2 live-action mythic film still, with lifelike faces, tangible materials, coherent light and subtle film grain. No text, logos or interface graphics.

NÜWA dominates the left: a human-faced goddess in flowing ancient cloth, her long serpentine lower body coiled around a broken rocky pinnacle. She raises a fused, five-coloured mineral mass toward a low torn edge of the sky immediately above and beside her. Her face, working hands, stones and the glowing seam being repaired stay left of centre. Her posture shows concentration and effort. Treat the repair as tangible mythic action: the cloud-vault knits together where mineral light touches it. A strip of flooded ground below gives scale.

Across the right, the storm settles into broad blue-grey cloud and subdued water haze. The strongest colour and light remain at her hands; the distant world stays muted. Skin, mineral, wet rock and cloud share one coherent photographic atmosphere.

COMPOSITION: Keep all essential faces, actions and identifying symbols within the left 55%. Reserve the right 45% as a continuous, low-contrast extension of this setting for later screen overlays. Do not render the overlays. Let depth and atmosphere create the quiet area naturally, without a dividing line or a blank panel.
```

### 초원 건국 신화 — `myth-steppe.png`

출연: 알란 고아와 다섯 아들. 화살 묶음으로 결속을 가르치는 몽골 시조 전승. [전승](https://www.cambridge.org/core/books/women-and-the-making-of-the-mongol-empire/women-in-steppe-society/54D209BF0981631624EACF70D82C124A)

```text
Create a 1536x1024 horizontal 3:2 live-action mythic film still, with lifelike faces, tangible materials, coherent light and subtle film grain. No text, logos or interface graphics.

Inside a spacious felt tent, ALAN QO'A sits large in the left foreground with a tightly bound bundle of five arrow shafts across her lap. One of her five sons kneels close to examine it; another holds a broken single shaft. The other three listen at different depths behind them, seated or crouched, with varied ages, faces and clothing. Gather all six on the left, the mother clearly dominant. Their attention converges on her hands and face. This is a family receiving a lesson about remaining united.

The right continues through the quiet felt wall toward a modest doorway showing steppe haze. Daylight from the smoke-hole reaches the mother's face and hands; diffuse light reveals the sons. The wall and distant landscape stay subdued. Felt, weathered wood and wool make the intimate setting tangible.

COMPOSITION: Keep all essential faces, actions and identifying symbols within the left 55%. Reserve the right 45% as a continuous, low-contrast extension of this setting for later screen overlays. Do not render the overlays. Let depth and atmosphere create the quiet area naturally, without a dividing line or a blank panel.
```

### 아프리카 건국 신화 — `myth-africa.png`

출연: 디아베 시세·비다. 소닌케의 와가두 건국과 수호 뱀의 약속을 대표 장면으로 선택한다. [전승](https://api.pageplace.de/preview/DT0400.9782296425644_A24235031/preview-9782296425644_A24235031.pdf)

```text
Create a 1536x1024 horizontal 3:2 live-action mythic film still, with lifelike faces, tangible materials, coherent light and subtle film grain. No text, logos or interface graphics.

DYABE CISSE stands large on the left at an old waterhole, a West African founder in a woven mantle and travel-worn clothing. He leans slightly toward BIDA, a formidable sacred python whose head rises from the water beside him. Keep the man's attentive face, the serpent's watchful eye and waterhole left of centre. His open, lowered hand conveys a cautious approach; the serpent remains still. Heavy coils lie partly submerged. This is an encounter with the guardian on whom Wagadu's prosperity will depend.

Quiet Sahel grassland and dusty evening haze extend across the right, with settlement forms barely visible in the distance. Low amber light catches skin and the python's wet head while the waterhole stays dark. The background remains spacious and subdued. Keep the imagery within the Soninke Wagadu tradition.

COMPOSITION: Keep all essential faces, actions and identifying symbols within the left 55%. Reserve the right 45% as a continuous, low-contrast extension of this setting for later screen overlays. Do not render the overlays. Let depth and atmosphere create the quiet area naturally, without a dividing line or a blank panel.
```

### 켈트·브리튼 전승 — `myth-celtic.png`

출연: 쿠 훌린. 아일랜드 얼스터 전승의 여울목 방어로 아서왕 표지와 구별한다. [전승](https://www.yorku.ca/inpar/tain_faraday.pdf)

```text
Create a 1536x1024 horizontal 3:2 live-action mythic film still, with lifelike faces, tangible materials, coherent light and subtle film grain. No text, logos or interface graphics.

CÚ CHULAINN stands large on the left at a shallow Irish ford, his body angled across the river passage. A heavy cloak has fallen back from his sword arm; he holds a spear upright and a round shield low. His face turns toward a soft cluster of approaching warriors on the far bank, visible beyond his left shoulder. The hero, spear and readable crossing remain left of centre. Show fatigue and resolve rather than triumph. Dark rocks and the current establish that one man is holding a passage.

The river flows across the right into low cloud, grass banks and distant hills. Cold overcast light breaks into pale sidelight on his cheek and wet shield. Keep the distance subdued. Soaked wool, leather and iron belong to a windswept earthly setting rather than an Arthurian castle.

COMPOSITION: Keep all essential faces, actions and identifying symbols within the left 55%. Reserve the right 45% as a continuous, low-contrast extension of this setting for later screen overlays. Do not render the overlays. Let depth and atmosphere create the quiet area naturally, without a dividing line or a blank panel.
```

### 게르만 건국 신화 — `myth-germanic.png`

출연: 보단·프리그, 멀리 모인 부족민. 대륙 게르만의 성스러운 숲을 무대로 한 신들의 상징 표지.

```text
Create a 1536x1024 horizontal 3:2 live-action mythic film still, with lifelike faces, tangible materials, coherent light and subtle film grain. No text, logos or interface graphics.

WODAN stands nearest on the left at a sacred oak grove, one eye visible beneath a travelling hat, spear grounded beside him. Frigg sits behind on a low timber seat, wrapped in deep blue wool, studying a gathering beyond the trees. Their different heights feel natural and authoritative. A few members of a tribal assembly stand deeper on the left, unevenly spaced, with distinct silhouettes and softly resolved faces. Treat the gods as a timeless image of guardianship over the grove rather than a historical meeting.

The right is an open shaded clearing with ground mist beneath a broad dark canopy. Soft green daylight reaches the faces and oak trunk. The rest stays quiet. Convey the intimacy of a continental woodland rather than a cosmic world-tree panorama, with real bark, wool and iron.

COMPOSITION: Keep all essential faces, actions and identifying symbols within the left 55%. Reserve the right 45% as a continuous, low-contrast extension of this setting for later screen overlays. Do not render the overlays. Let depth and atmosphere create the quiet area naturally, without a dividing line or a blank panel.
```

### 가야 신화 — `myth-korea-gaya.png`

출연: 수로왕·허황옥. 바다를 건너온 왕비를 맞이하는 가야의 시작.

```text
Create a 1536x1024 horizontal 3:2 live-action mythic film still, with lifelike faces, tangible materials, coherent light and subtle film grain. No text, logos or interface graphics.

King SURO waits large on the left above a landing beach as HEO HWANG-OK approaches from the shore. He opens one hand in welcome; she pauses a step below him, cloak moved by the wind, meeting his gaze with composed dignity. Distinguish a local early Korean ruler and a princess arriving from a distant land through modest ornaments and travel-worn cloth rather than elaborate late-dynastic court dress. A complete small vessel with a lowered red sail lies at anchor behind her in the left middle distance. Keep faces, welcome and ship on the left.

Open estuary water and green hills fade into sea haze on the right. Clear morning light reflected from the water reveals their faces. The meeting of two journeys is the focus; the distant coast stays spacious and low in contrast.

COMPOSITION: Keep all essential faces, actions and identifying symbols within the left 55%. Reserve the right 45% as a continuous, low-contrast extension of this setting for later screen overlays. Do not render the overlays. Let depth and atmosphere create the quiet area naturally, without a dividing line or a blank panel.
```

### 신라 신화 — `myth-korea-silla.png`

출연: 박혁거세·알영. 나정 주변의 성스러운 숲에 시조 부부를 세운 상징 표지. 김알지의 계림 탄생은 섞지 않는다.

```text
Create a 1536x1024 horizontal 3:2 live-action mythic film still, with lifelike faces, tangible materials, coherent light and subtle film grain. No text, logos or interface graphics.

PAK HYEOKGEOSE stands nearest on the left beside the spring of Najeong, a youthful founder in pale woven clothing and modest early Korean ornaments. Lady ALYEONG stands deeper on raised ground, partly turned toward him, an equal presence. His upper body is prominent; her different depth gives the pair space. A white horse stands beyond the spring under the left-hand trees, a restrained echo of Hyeokgeose's birth legend. This is a timeless portrait of the adult founders, not a simultaneous birth scene. Keep faces, spring and horse left of centre.

The right becomes softly illuminated woodland mist and receding trunks. Cool shade surrounds the pair; gentle early sun reaches their faces through the canopy. Let this continuation of the sacred grove remain spacious and low in contrast.

COMPOSITION: Keep all essential faces, actions and identifying symbols within the left 55%. Reserve the right 45% as a continuous, low-contrast extension of this setting for later screen overlays. Do not render the overlays. Let depth and atmosphere create the quiet area naturally, without a dividing line or a blank panel.
```

### 고려세계 신화 — `myth-korea-goryeo.png`

출연: 작제건·용녀, 용왕의 기척. 왕건의 선조가 서해 용궁과 맺은 인연. [전승](https://koreanstudiesaa.wordpress.com/wp-content/uploads/2012/05/ksaa04-2005.pdf)

```text
Create a 1536x1024 horizontal 3:2 live-action mythic film still, with lifelike faces, tangible materials, coherent light and subtle film grain. No text, logos or interface graphics.

JAKJEGEON stands large on the left at a sea cavern, a young traveller in plain early Korean clothing, his bow resting along his back. The dragon daughter stands deeper on a wet rock ledge, fully human, her blue-green robe catching reflected sea light. They look toward one another with quiet recognition. Behind her on the left, the head and whiskers of an East Asian sea dragon are partly visible in cavern shade, establishing the lineage of the meeting. Keep the faces and recognisable dragon presence left of centre.

The cavern opens onto broad misty tidal water across the right. Reflected light joins rock, cloth and skin into one place; supernatural radiance stays restrained. The water remains quiet. This ancestral encounter concerns Jakjegeon, not a royal portrait of Wang Geon.

COMPOSITION: Keep all essential faces, actions and identifying symbols within the left 55%. Reserve the right 45% as a continuous, low-contrast extension of this setting for later screen overlays. Do not render the overlays. Let depth and atmosphere create the quiet area naturally, without a dividing line or a blank panel.
```

### 탐라 신화 — `myth-korea-tamna.png`

출연: 고을나·양을나·부을나. 삼성혈에서 솟아난 세 신인이 처음 땅을 살핀다.

```text
Create a 1536x1024 horizontal 3:2 live-action mythic film still, with lifelike faces, tangible materials, coherent light and subtle film grain. No text, logos or interface graphics.

At SAMSEONGHYEOL on Jeju, GO EUL-NA has just risen to stand nearest on the left, soil on his hand and rough clothing, looking over unfamiliar land. YANG EUL-NA is half-risen beside a second opening, steadying himself on its solid rim. BU EUL-NA crouches beside the third, touching fresh earth. All bodies are whole and supported, with different heights and depths. The nearest founder is large and clear; openings and other faces stay left of centre. Capture the moment after emergence, with wonder rather than combat readiness.

The land extends toward volcanic slopes and maritime haze across the right. Grass and sky remain subdued. Cool dawn touches wet soil and skin. The sacred openings identify the community's birth; the image does not depend on royal buildings or ceremonial props.

COMPOSITION: Keep all essential faces, actions and identifying symbols within the left 55%. Reserve the right 45% as a continuous, low-contrast extension of this setting for later screen overlays. Do not render the overlays. Let depth and atmosphere create the quiet area naturally, without a dividing line or a blank panel.
```

### 백제 신화 — `myth-korea-baekje.png`

출연: 소서노·온조·비류. 남하한 가족이 새 터전을 마주하는 건국 표지. [인물 관계](https://world.kbs.co.kr/service/contents_view.htm?board_seq=61200&menu_cate=history&page=18)

```text
Create a 1536x1024 horizontal 3:2 live-action mythic film still, with lifelike faces, tangible materials, coherent light and subtle film grain. No text, logos or interface graphics.

SOSEONO occupies the left foreground, a mature leader in a weathered deep-red mantle, one palm on a rocky ledge as she studies the valley. Her adult sons stay close at different depths: ONJO stands lower, following her gaze; BIRYU kneels to examine the soil. They are a travelling family preparing a new home, in early Korean clothing rather than court splendour. Faces and relationship remain together on the left. Small followers with bundled belongings wait behind on the path. Treat this as a symbolic founding scene.

The Han River plain opens across the right as muted water and wooded hills in morning haze. The promise of settlement lies in open land, not a completed capital. Soft sidelight gives the mother the clearest presence; the distant plain stays quiet.

COMPOSITION: Keep all essential faces, actions and identifying symbols within the left 55%. Reserve the right 45% as a continuous, low-contrast extension of this setting for later screen overlays. Do not render the overlays. Let depth and atmosphere create the quiet area naturally, without a dividing line or a blank panel.
```

### 인도 왕조 전승 — `myth-india-dynasty.png`

출연: 마누·마츠야. 인류와 왕조의 시조가 홍수를 살아남는 전승을 대표 장면으로 잡는다.

```text
Create a 1536x1024 horizontal 3:2 live-action mythic film still, with lifelike faces, tangible materials, coherent light and subtle film grain. No text, logos or interface graphics.

MANU kneels large on the left on the first exposed mountain ledge after the flood, one hand on newly uncovered earth. He looks toward MATSYA, the divine fish whose head rises beside him, a single horn clearly visible and its eye calm. A modest wooden boat floats behind Manu on the left, its whole hull visible with covered provisions. A thick mooring runs slack from prow to horn, resting on the water; nobody grips a fine line. Keep Manu, fish, horn and boat left of centre.

Floodwater extends across the right as broad grey-blue water and ridges emerging through mist. Pale morning light touches soaked cloth, skin and rock after the storm. The distance stays quiet. Relief and a new beginning are expressed through his hand on solid ground.

COMPOSITION: Keep all essential faces, actions and identifying symbols within the left 55%. Reserve the right 45% as a continuous, low-contrast extension of this setting for later screen overlays. Do not render the overlays. Let depth and atmosphere create the quiet area naturally, without a dividing line or a blank panel.
```

### 동남아 건국 신화 — `myth-sea-founding.png`

출연: 락롱권·어우꺼, 멀리 떠나는 자녀들. 베트남의 바다와 산으로 갈라지는 시조 전승. 알의 탄생은 같은 장면에 겹치지 않는다.

```text
Create a 1536x1024 horizontal 3:2 live-action mythic film still, with lifelike faces, tangible materials, coherent light and subtle film grain. No text, logos or interface graphics.

LẠC LONG QUÂN and ÂU CƠ stand large on the left at the parting of sea and mountain. He is nearest the water in indigo cloth with restrained scale-like texture; she stands uphill in pale woven clothing. Their bodies begin turning in different directions, but their faces remain turned toward each other in quiet farewell. Small groups of their children begin separate journeys in the left middle distance, one toward shore and another up a wooded path. Suggest the larger family through receding silhouettes. The parents' shared gaze is the emotional centre.

Coastal water and green ridges under humid haze extend across the right, with no competing figures. Cloud-filtered morning light joins parents and land. The background stays quiet. The separation is tender and purposeful, with paths secondary to the faces.

COMPOSITION: Keep all essential faces, actions and identifying symbols within the left 55%. Reserve the right 45% as a continuous, low-contrast extension of this setting for later screen overlays. Do not render the overlays. Let depth and atmosphere create the quiet area naturally, without a dividing line or a blank panel.
```

### 페르시아 신화 — `myth-persia.png`

출연: 페레이둔·자하크. 소머리 철퇴로 폭군을 제압한 순간. [도상·전승](https://www.si.edu/object/folio-shahnama-book-kings-firdawsi-recto-text-faridun-captures-zahhak-verso-faridun-strikes-zahhak%3Afsg_F1996.2)

```text
Create a 1536x1024 horizontal 3:2 live-action mythic film still, with lifelike faces, tangible materials, coherent light and subtle film grain. No text, logos or interface graphics.

FEREYDUN stands large in the left foreground after subduing ZAHHAK, the recognisable BULL-HEADED MACE lowered in one hand. He watches the tyrant rather than the camera. Zahhak is lower and deeper beside the palace steps, alive, royal cloth disordered and expression defiant. Two distinct serpents emerge from his shoulders, their heads close and readable against dark fabric. Keep both faces, mace head and shoulder serpents left of centre. Unequal postures establish the reversal of power. The scene has no gore.

A quiet Iranian palace arcade recedes across the right into cool dust-filled shadow. Daylight from the left picks out the victor's face, forged mace and tyrant's crown. The distant architecture stays subdued. Real textiles, skin and metal ground the mythic confrontation.

COMPOSITION: Keep all essential faces, actions and identifying symbols within the left 55%. Reserve the right 45% as a continuous, low-contrast extension of this setting for later screen overlays. Do not render the overlays. Let depth and atmosphere create the quiet area naturally, without a dividing line or a blank panel.
```

### 서아시아 건국 신화 — `myth-westasia-founding.png`

출연: 아브라함. 별의 약속을 받는 족장 전승을 대표 장면으로 선택한다.

```text
Create a 1536x1024 horizontal 3:2 live-action mythic film still, with lifelike faces, tangible materials, coherent light and subtle film grain. No text, logos or interface graphics.

ABRAHAM stands large on the left outside a low dark tent, staff resting beside him. His body is still, but his aged face tilts toward the star-filled opening above his left shoulder with wonder and grave attention. A banked campfire behind him reveals cheek, hands and heavy wool robe. Keep face, tent opening and the densest visible stars left of centre. This is one patriarch receiving the promise of descendants as numerous as the stars; divine presence is conveyed by the sky.

The right opens into subdued night sky and low hill silhouettes. Sparse stars continue there, but contrast stays gentle, without a bright celestial centre competing with overlays. Cool sky fill balances the small fire. The darkness is photographic and spacious rather than a flat black panel.

COMPOSITION: Keep all essential faces, actions and identifying symbols within the left 55%. Reserve the right 45% as a continuous, low-contrast extension of this setting for later screen overlays. Do not render the overlays. Let depth and atmosphere create the quiet area naturally, without a dividing line or a blank panel.
```

### 슬라브·동유럽 전승 — `myth-slavic.png`

출연: 레흐·체흐·루스. 흰 독수리의 징조와 세 형제의 갈림길.

```text
Create a 1536x1024 horizontal 3:2 live-action mythic film still, with lifelike faces, tangible materials, coherent light and subtle film grain. No text, logos or interface graphics.

LECH stands nearest on the left beneath a great tree, watching a WHITE EAGLE at its nest on a low bough above him. CZECH sits behind on a fallen trunk, fastening his cloak before departure. RUS has risen beside his pack and turns toward the branching path, looking back at his brothers. Keep the three faces and bright eagle left of centre, at differing heights and depths. Their postures suggest a journey about to divide. The eagle is a clear omen, large enough to recognise.

Grassland, a faint path and river mist extend across the right. Cold dawn catches white feathers and the brothers' faces while the tree grounds them in shade. The distance stays subdued. Worn wool, leather and bark make the scene tactile; additional heraldic emblems are unnecessary.

COMPOSITION: Keep all essential faces, actions and identifying symbols within the left 55%. Reserve the right 45% as a continuous, low-contrast extension of this setting for later screen overlays. Do not render the overlays. Let depth and atmosphere create the quiet area naturally, without a dividing line or a blank panel.
```

### 아메리카 건국 신화 — `myth-americas-founding.png`

출연: 테노치·독수리. 멕시카의 테노치티틀란 건국 징조를 대표 장면으로 선택한다.

```text
Create a 1536x1024 horizontal 3:2 live-action mythic film still, with lifelike faces, tangible materials, coherent light and subtle film grain. No text, logos or interface graphics.

TENOCH stands large on the left on a reed island in Lake Texcoco, an elder priest in a cotton mantle and restrained jade ornaments, staff still at his side. He looks at an EAGLE perched on a PRICKLY-PEAR CACTUS a few paces away in the left middle ground. The bird holds a serpent in its beak. Show the whole eagle, cactus top and attentive face together left of centre. A complete small dugout canoe rests behind him. Human response and unmistakable omen form an intimate discovery.

Open lake water and layered mountain haze fill the right. Sunrise from the left touches eagle and priest while cool reflections spread across the water. Keep that distance quiet. The marsh island is still unbuilt, without a finished city panorama.

COMPOSITION: Keep all essential faces, actions and identifying symbols within the left 55%. Reserve the right 45% as a continuous, low-contrast extension of this setting for later screen overlays. Do not render the overlays. Let depth and atmosphere create the quiet area naturally, without a dividing line or a blank panel.
```

### 오세아니아 건국 신화 — `myth-oceania-founding.png`

출연: 마우이와 두 형제. 마오리의 섬 낚기 전승을 대표로 선택한다. 쿠페·펠레를 동행시키지 않는다. [전승](https://collections.tepapa.govt.nz/topic/3196)

```text
Create a 1536x1024 horizontal 3:2 live-action mythic film still, with lifelike faces, tangible materials, coherent light and subtle film grain. No text, logos or interface graphics.

MĀUI is large in the left foreground, braced inside a substantial fishing waka. One hand rests on the gunwale as he looks at dark land rising from water just beyond the canoe, left of centre. Two brothers occupy different depths behind him: one steadies the craft with a paddle; another leans forward in astonishment. A thick fishing rope secured around a structural crossbeam leads into disturbed water. A pale bone hook is visible where the taut rope meets the emerging mass. Nobody manipulates a fine line. Show hull and supported footing as one convincing vessel. Keep faces, hook and rising land together on the left.

Broad ocean swells and dawn cloud continue across the right. Cool spray and a warm cloud break illuminate flax, timber and skin together. The spectacle is land rising from sea, without volcanic fire or unrelated gods.

COMPOSITION: Keep all essential faces, actions and identifying symbols within the left 55%. Reserve the right 45% as a continuous, low-contrast extension of this setting for later screen overlays. Do not render the overlays. Let depth and atmosphere create the quiet area naturally, without a dividing line or a blank panel.
```

## 생성 후 배치

후보는 `sw/web/public/images/myth-atlas/title-art/_staging/<파일명>`에 보존한다. 실제 생성 도구가 다른 경로에 저장하면 원본도 남긴다. 실물에서 왼쪽 장면의 식별력·오른쪽 배경의 여유·인물과 소품의 연결을 확인하고, 사용자가 승인한 그림만 정식 경로로 옮긴다. 기존 이미지 교체 전 추적 여부를 확인하고 `_backup`에 원본을 복사한다.

정식 경로는 `sw/web/public/images/myth-atlas/title-art/<파일명>`이다. 연결은 `sw/web/src/actions/home/getMythData.ts`의 `TITLE_ART_BY_SLUG`·`TITLE_ART_BY_NAME`에서 기존 전승의 slug 또는 이름을 확인해 반영한다. 파일명으로 DB slug를 추측하지 않는다.
