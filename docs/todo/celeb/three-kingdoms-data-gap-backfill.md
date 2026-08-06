# 서비스 삼국지 인물 52명 데이터 백필

> **상태: 조사·백필 설계 완료, DB 미반영** — 현재 실행 환경에 `SUPABASE_SERVICE_ROLE_KEY`가 없어 공개 DB 전수 조회만 수행했다.
> **최종 실측 체크: 26.07.31** — 공개 DB `profiles` 2,106명 전량 페이징 조회 후 후한 말·삼국 인물 등록 배치와 관련 테이블 대조

## 1. 정정

처음에는 영상 제작용 `THREE_KINGDOMS_MEMBERS` 22명을 서비스 전체 명단으로 잘못 보았다. 그 배열은 서재 탐방 영상 그룹일 뿐 서비스 DB 전체 범위가 아니다.

실 DB를 다시 추적한 결과, **2026-07-30 12:18~14:00 UTC에 삼국지 인물 52명이 연속 등록**됐다. 52명은 모두 `light`·`inactive`이며 기존 활성 22명과 겹치지 않는다. 사용자 예시인 동탁도 이 배치에 속한다.

- 기존 활성 비교군: 22명
- 신규 미완성 백필 대상: 52명
- DB에서 확인한 관련 인물 합계: 74명
- 이 문서의 실제 작업 큐: **신규 비활성 52명**

나관중·이문열처럼 삼국지를 쓴 후대 작가, 한국 삼국시대 인물, 춘추전국 인물은 이 큐에서 제외한다.

## 2. 백필 대상 52명

### 촉한·유비 계열 13명

`zhang-fei` 장비 · `pang-tong` 방통 · `zhao-yun` 조운 · `ma-chao` 마초 · `huang-zhong` 황충 · `lady-gan` 감부인 · `meng-huo` 맹획 · `guan-ping` 관평 · `ma-dai` 마대 · `ma-su` 마속 · `liao-hua` 요화 · `wei-yan` 위연 · `liu-shan` 유선

### 조조·조위 계열 8명

`guo-jia` 곽가 · `jia-xu` 가후 · `zhang-liao` 장료 · `zhang-he` 장합 · `xu-huang` 서황 · `yu-jin` 우금 · `yue-jin` 악진 · `xiahou-dun` 하후돈

### 손씨·동오 계열 11명

`sun-jian` 손견 · `sun-ce` 손책 · `taishi-ci` 태사자 · `gan-ning` 감녕 · `zhou-tai` 주태 · `huang-gai` 황개 · `ling-tong` 능통 · `zhang-hong` 장굉 · `cheng-pu` 정보 · `da-qiao` 대교 · `xiao-qiao` 소교

### 군벌·연합·기타 20명

`gongsun-zan` 공손찬 · `lu-bu` 여포 · `yan-liang` 안량 · `liu-qi` 유기 · `liu-zhang` 유장 · `liu-biao` 유표 · `tian-yu` 전예 · `guo-tu` 곽도 · `ji-ling` 기령 · `wen-chou` 문추 · `shen-pei` 심배 · `yang-hong` 양홍 · `yuan-shu` 원술 · `zhang-xun` 장훈 · `ju-shou` 저수 · `chen-gong` 진궁 · `xu-you` 허유 · `guo-si` 곽사 · `dong-zhuo` 동탁 · `li-jue` 이각

## 3. 실 DB 결손

### 3.1 신규 52명 공통

| 데이터 | 결손 | 판정 |
|---|---:|---|
| `speech_tone` | 52/52 | 전원 없음 |
| 감상철학 KO·EN | 52/52 | 전원 없음. 경력을 감상철학으로 꾸미지 말 것 |
| 감상 여정 KO·EN | 52/52 | 전원 없음. 콘텐츠 조사와 별개로 근거 필요 |
| 가상 독백 KO·EN | 52/52 | 전원 없음. 원전 검토 절차 필요 |
| 영향력 행 | 52/52 | 전원 없음 |
| 페르소나 행 | 52/52 | 전원 없음 |
| 웹·게임 대사 행 | 52/52 | 전원 없음. 한·영 각 21줄+한마디 필요 |
| 삼국지 태그 배정 | 52/52 | 전원 없음 |
| 콘텐츠 | 52/52 | 0건. `light/open`이므로 자동 결함은 아님 |
| 연표 | 52/52 | 0건. 영향력 50점 이상 확정자만 후속 대상 |

### 3.2 기본 프로필 결손

| 데이터 | 결손 | 처리 원칙 |
|---|---:|---|
| title/title_en | 15명 | 아래 백필안 사용 |
| bio/bio_en | 15명 | 아래 백필안 사용 |
| birth_date | 40명 | 정사에 없으면 null 유지. Wikidata 임의 연도 금지 |
| death_date | 24명 | 정사에 없으면 null 유지 |
| avatar_url | 26명 | 명명 도상·권위 재구성 근거 없으면 비운다 |
| wikidata_qid | 2명 | 양홍·장훈은 일치 항목을 찾지 못함. null 유지 |

나머지 37명은 한·영 제목·소개까지 이미 들어 있다. 생몰년 공란은 상당수가 사료 부재이므로 빈칸 수만 보고 추정 연도를 넣지 않는다.

## 4. 동탁 포함 기본 프로필 공란 15명 백필안

아래 소개는 정사 『후한서』·『삼국지』가 확인하는 범위만 쓴다. 『삼국지연의』의 일기토·책략·가족 설정은 넣지 않는다.

### 4.1 진궁 `chen-gong`

- QID: `Q703273` (`P31=Q5`, 여포의 모사로 신원 일치)
- title / title_en: `여포의 모사` / `Lü Bu's Adviser`
- birth_date: null
- death_date: `199`
- speech_tone 후보: `composed`
- bio: `후한 말의 관리이자 모사. 194년 장막과 함께 조조에게 반기를 들고 여포를 연주로 불러들였으며, 하비 패전 뒤인 199년 조조에게 처형됐다.`
- bio_en: `A late Han official and adviser. In 194 he joined Zhang Miao's revolt against Cao Cao and helped bring Lü Bu into Yan Province; Cao Cao executed him after the defeat at Xiapi in 199.`

### 4.2 대교 `da-qiao`

- QID: `Q3011551` (`P31=Q5`, 교공의 두 딸 중 언니)
- title / title_en: `손책의 부인` / `Wife of Sun Ce`
- birth_date / death_date: null
- speech_tone 후보: `composed`
- bio: `후한 말 교공의 두 딸 가운데 언니로 전하는 인물. 손책이 환성을 점령한 뒤 맞아들였다는 정사 기록만 남아 있으며, 이름·생몰년·이후 행적은 전하지 않는다.`
- bio_en: `The elder of Lord Qiao's two daughters in the late Han. The histories record only that Sun Ce took her as his wife after capturing Wan; her personal name, dates, and later life are unknown.`

### 4.3 동탁 `dong-zhuo`

- QID: `Q334081` (`P31=Q5`, 후한 말 군벌)
- title / title_en: `태사` / `Grand Preceptor`
- birth_date: null. Wikidata의 139년은 정사에서 확정할 수 없어 채택하지 않는다.
- death_date: `192`
- speech_tone 후보: `bold`
- bio: `후한 말의 장군이자 군벌. 189년 낙양의 정권을 장악해 소제를 폐위하고 헌제를 세웠으며, 장안을 천도한 뒤 192년 왕윤과 여포의 모의로 살해됐다.`
- bio_en: `A late Han general and warlord. He seized the court in 189, deposed Emperor Shao in favor of Emperor Xian, moved the capital to Chang'an, and was killed in 192 through a plot led by Wang Yun and Lü Bu.`

### 4.4 곽사 `guo-si`

- QID: `Q740891` (`P31=Q5`, 동탁 휘하 장군)
- title / title_en: `장안 군벌` / `Warlord of Chang'an`
- birth_date: null
- death_date: `197`
- speech_tone 후보: `bold`
- bio: `동탁 휘하의 장군. 동탁 사후 이각과 함께 장안을 점령하고 헌제를 장악했으나, 이각과의 내전으로 세력이 무너진 뒤 197년 부하에게 살해됐다.`
- bio_en: `A general under Dong Zhuo. After Dong's death he joined Li Jue in taking Chang'an and controlling Emperor Xian, but their civil war destroyed their power; one of his own men killed him in 197.`

### 4.5 곽도 `guo-tu`

- QID: `Q1327598` (`P31=Q5`, 원소·원담의 모사)
- title / title_en: `원소의 모사` / `Yuan Shao's Adviser`
- birth_date: null. Wikidata의 101년은 근거 없는 자리값으로 보아 채택하지 않는다.
- death_date: `205`
- speech_tone 후보: `composed`
- bio: `후한 말 원소와 원담을 섬긴 모사. 원소 사후 원담을 지지해 원상과의 분열에 가담했고, 205년 남피가 함락될 때 조조군에게 처형됐다.`
- bio_en: `A late Han adviser to Yuan Shao and Yuan Tan. After Yuan Shao's death he backed Yuan Tan in the succession struggle against Yuan Shang, and was executed when Cao Cao captured Nanpi in 205.`

### 4.6 기령 `ji-ling`

- QID: `Q1323201` (`P31=Q5`, 원술 휘하 장군)
- title / title_en: `원술의 장군` / `Yuan Shu's General`
- birth_date / death_date: null. Wikidata의 101~220은 정사 근거가 없어 채택하지 않는다.
- speech_tone 후보: `bold`
- bio: `후한 말 원술 휘하의 장군. 유비를 공격하려 군을 이끌고 소패로 진군했으나, 여포가 원문에서 활을 쏘아 양군을 중재한 뒤 철수했다. 이후 행적과 생몰년은 전하지 않는다.`
- bio_en: `A late Han general serving Yuan Shu. He advanced on Xiaopei to attack Liu Bei but withdrew after Lü Bu mediated between the armies with his celebrated archery display; his later career and dates are unknown.`

### 4.7 저수 `ju-shou`

- QID: `Q1325048` (`P31=Q5`, 원소의 모사)
- title / title_en: `원소의 감군` / `Yuan Shao's Supervisor`
- birth_date: null
- death_date: `200`
- speech_tone 후보: `loyal`
- bio: `후한 말 원소의 모사이자 감군. 헌제를 맞아 명분을 선점하고 조조와의 장기전을 준비하라고 진언했으나 받아들여지지 않았고, 관도 패전 뒤 붙잡혀 죽었다.`
- bio_en: `A late Han adviser and army supervisor under Yuan Shao. He urged Yuan to receive Emperor Xian and prepare for a protracted contest with Cao Cao, but his counsel was rejected; he was captured and killed after Guandu.`

### 4.8 이각 `li-jue`

- QID: `Q740905` (`P31=Q5`, 동탁 휘하 장군)
- title / title_en: `장안을 장악한 군벌` / `Warlord Who Seized Chang'an`
- birth_date: null. Wikidata의 출생 200년·사망 197년은 명백한 역전 오류다.
- death_date: `198`
- speech_tone 후보: `bold`
- bio: `동탁 휘하의 장군. 동탁 사후 곽사 등과 장안을 탈환해 헌제를 장악했으며, 내전과 헌제의 탈출로 몰락한 뒤 198년 관중에서 토벌됐다.`
- bio_en: `A general under Dong Zhuo. After Dong's death he retook Chang'an with Guo Si and others and controlled Emperor Xian; civil war and the emperor's escape broke his power, and he was killed in Guanzhong in 198.`

### 4.9 심배 `shen-pei`

- QID: `Q1193569` (`P31=Q5`, 원소 휘하 관리)
- title / title_en: `업성의 수비자` / `Defender of Ye`
- birth_date: null. Wikidata의 101년은 채택하지 않는다.
- death_date: `204`
- speech_tone 후보: `loyal`
- bio: `후한 말 원소 휘하의 관리이자 모사. 원소 사후 원상을 지지해 업성을 지켰으며, 204년 성이 함락된 뒤 조조에게 굴복하지 않고 처형됐다.`
- bio_en: `A late Han official and adviser under Yuan Shao. He supported Yuan Shang after the succession split and defended Ye; when the city fell in 204, he refused to submit to Cao Cao and was executed.`

### 4.10 문추 `wen-chou`

- QID: `Q1376046` (`P31=Q5`, 원소 휘하 장군)
- title / title_en: `원소의 장군` / `Yuan Shao's General`
- birth_date: null. Wikidata의 101년은 채택하지 않는다.
- death_date: `200`
- speech_tone 후보: `bold`
- bio: `후한 말 원소 휘하의 장군. 200년 관도 전역 초반 연진에서 조조군을 추격하다 대열이 무너진 가운데 전사했다. 정사는 그를 죽인 개인을 특정하지 않는다.`
- bio_en: `A late Han general under Yuan Shao. During the opening phase of the Guandu campaign in 200, he pursued Cao Cao's army at Yan Ford and was killed when his formation collapsed; the histories do not name an individual slayer.`

### 4.11 소교 `xiao-qiao`

- QID: `Q5025350` (`P31=Q5`, 교공의 두 딸 중 동생)
- title / title_en: `주유의 부인` / `Wife of Zhou Yu`
- birth_date / death_date: null
- speech_tone 후보: `composed`
- bio: `후한 말 교공의 두 딸 가운데 동생으로 전하는 인물. 손책이 환성을 점령했을 때 주유가 맞아들였다는 정사 기록만 남아 있으며, 이름·생몰년·이후 행적은 전하지 않는다.`
- bio_en: `The younger of Lord Qiao's two daughters in the late Han. The histories record only that Zhou Yu took her as his wife after the capture of Wan; her personal name, dates, and later life are unknown.`

### 4.12 허유 `xu-you`

- QID: `Q425762` (`P31=Q5`, 원소·조조의 모사)
- title / title_en: `오소를 연 변절자` / `Defector Who Exposed Wuchao`
- birth_date: null. Wikidata의 101년은 채택하지 않는다.
- death_date: `204`
- speech_tone 후보: `free`
- bio: `후한 말 원소의 모사. 관도 전투 중 조조에게 투항해 오소의 군량 기지를 알려 승패를 뒤집었으나, 공을 과시하며 조조를 업신여기다 204년 살해됐다.`
- bio_en: `A late Han adviser to Yuan Shao. During Guandu he defected to Cao Cao and revealed the supply depot at Wuchao, helping reverse the campaign; after boasting of his service and slighting Cao, he was killed in 204.`

### 4.13 양홍 `yang-hong`

- QID: null. Wikidata의 동명 후보들은 수·당·명대 인물로 모두 불일치한다.
- title / title_en: `원술의 장사` / `Yuan Shu's Chief Clerk`
- birth_date / death_date: null
- speech_tone 후보: `composed`
- bio: `후한 말 원술의 장사. 원술이 죽은 뒤 대장 장훈과 함께 무리를 이끌고 손책에게 귀순하려 했으나, 여강태수 유훈의 공격을 받아 붙잡혔다. 이후 행적은 전하지 않는다.`
- bio_en: `Chief Clerk under Yuan Shu in the late Han. After Yuan Shu's death he and the general Zhang Xun led their followers toward Sun Ce, but Lujiang administrator Liu Xun intercepted and captured them; his later fate is unknown.`

### 4.14 원술 `yuan-shu`

- QID: `Q450370` (`P31=Q5`, 후한 말 군벌)
- title / title_en: `중씨 황제` / `Emperor of Zhong`
- birth_date: null. Wikidata의 155년은 정사에서 확정하기 어려워 채택하지 않는다.
- death_date: `199`
- speech_tone 후보: `bold`
- bio: `후한 말 원씨 명문 출신 군벌. 회남을 기반으로 세력을 넓혀 197년 황제를 자칭했으나 각 세력의 공격과 이탈로 몰락해 199년 수춘을 떠난 뒤 병사했다.`
- bio_en: `A late Han warlord from the eminent Yuan clan. From his base in Huainan he expanded his power and declared himself emperor in 197, but defections and enemy attacks destroyed his regime; he died after abandoning Shouchun in 199.`

### 4.15 장훈 `zhang-xun`

- QID: null. Wikidata의 `Zhang Xun` 후보들은 청말·당·송·명 인물로 원술 휘하 장훈과 일치하지 않는다.
- title / title_en: `원술의 대장` / `Yuan Shu's General`
- birth_date / death_date: null
- speech_tone 후보: `bold`
- bio: `후한 말 원술 휘하의 대장. 손책의 재능을 일찍 높이 평가했으며, 원술 사후 장사 양홍과 함께 손책에게 귀순하려다 여강태수 유훈에게 붙잡혔다. 이후 행적은 전하지 않는다.`
- bio_en: `A senior general under Yuan Shu in the late Han who recognized Sun Ce's ability early. After Yuan Shu's death he and Chief Clerk Yang Hong tried to join Sun Ce but were captured by Lujiang administrator Liu Xun; his later fate is unknown.`

## 5. 나머지 37명 기본 프로필 보존 원칙

아래 37명은 title·title_en·bio·bio_en이 이미 존재하므로 기존 문안을 보존하고, 공통 결손 트랙만 백필한다.

장비 · 방통 · 조운 · 마초 · 황충 · 감부인 · 맹획 · 관평 · 마대 · 마속 · 요화 · 위연 · 유선 · 곽가 · 가후 · 장료 · 장합 · 서황 · 우금 · 악진 · 하후돈 · 손견 · 손책 · 태사자 · 감녕 · 주태 · 황개 · 능통 · 장굉 · 정보 · 공손찬 · 여포 · 안량 · 유기 · 유장 · 유표 · 전예

§3.2의 생년 40명·사망년 24명 결손은 **백필 전 DB 전수 집계값**이다. §4의 날짜는 15명에게 새로 넣을 후보값이므로 이 집계에서 역산해 현재 보유값을 단정하지 않는다. 적용 직전에 52명의 날짜를 다시 조회하고, 정사에서 확정할 수 없는 공란은 그대로 둔다. `c. 220`, `c. 223`처럼 이미 들어간 추정값도 출처 재검토 전 기계적으로 정수화하지 않는다.

## 6. Wikidata 신원 감사

- 기본 공란 15명 중 13명은 QID가 있으며 전원 `P31=Q5`다.
- 양홍·장훈은 일치 QID가 없으므로 비운다.
- **Wikidata 생몰 claims를 자동 복사하면 안 된다.** 곽도·기령·심배·문추·허유의 출생 101년은 반복 자리값으로 보이며, 이각은 출생 200년·사망 197년으로 시간 순서가 뒤집혀 있다.
- QID는 신원 식별 보조값이며, 생몰·행적의 최종 근거는 정사 원문이다.

## 7. 52명 후속 백필 순서

### Phase A. 기본 프로필 15명

이 문서 §4의 title·bio 한영, 확인 가능한 사망년, speech tone 후보를 현재값 null 조건으로 반영한다. 생몰 미상은 null을 유지한다.

### Phase B. 영향력·페르소나 52명

- 영향력: 7축 점수와 한영 설명을 정사 행적에 따라 작성한다.
- 페르소나: 16축 점수·한영 근거·종합 해설을 작성한다.
- 연의의 무력 수치나 캐릭터성을 정사 행적으로 둔갑시키지 않는다.
- 배치 안 동일 점수 금지 규칙을 지키며 진영별 상대 비교 후 확정한다.

권장 배치:

1. 촉한 13명
2. 조위 8명
3. 동오 11명
4. 군벌·연합 10명씩 2회

### Phase C. Speech 52명

- speech tone 확정
- 한마디는 정사에 본인 직접 발언이 있을 때만 채택한다. 없으면 검증 부재 자리표시를 사용한다.
- 웹·게임 대사는 7상황×3변형, 한국어 21줄을 먼저 확정한 뒤 영어 21줄을 별도로 쓴다.
- 신규 ELE 발화 지시는 만들지 않는다.
- 유튜브 공개 팩션 대사와 `celeb_dialogues`를 혼용하지 않는다.

### Phase D. 감상 데이터

52명 모두 콘텐츠 0건이며 `light/open`이다. 전쟁·정치 경력을 감상철학처럼 꾸미지 않는다.

1. BOOK·VIDEO·GAME·MUSIC 네 범위 조사 장부를 연다.
2. 실제 소비 기록이 확인되면 콘텐츠를 연결한다.
3. 없으면 네 범위 완료 뒤에만 `confirmed_empty`로 닫는다.
4. 감상철학·감상 여정은 독서·예술·기록 접촉 근거가 있는 인물만 작성한다.

### Phase E. 가상 독백 52명

실존 인물 독백 규격과 정사 근거 묶음을 거쳐 작성한다. 소개문을 1인칭으로 바꾼 문장은 금지한다. 한국어 게시 검토 뒤 영문을 별도 산문으로 작성한다.

### Phase F. 삼국지 태그·활성화

- 현재 신규 52명의 `celeb_tag_assignments`는 0건이다.
- 기본 프로필·영향력·페르소나·대사·한영 데이터가 완성된 인물만 `three-kingdoms` 태그에 배정한다.
- 태그 배정 시 `short_desc`, `short_desc_en`, `long_desc`, `long_desc_en`을 함께 채운다.
- **26.08.05 정책 변경:** 아바타도 활성화 필수 조건이다. 특정 인물 근거 없는 임의 얼굴은
  여전히 등록하지 않으며, 신원 근거를 확보하지 못하면 inactive로 둔다.
- 모든 검증을 통과한 뒤에만 `inactive → active`로 바꾼다.

## 8. 기존 활성 22명 비교군의 잔여

- 조식 `speech_tone` 1건이 null이다. 기존 대사 어조와 작가 직군에 맞는 `composed`가 후보값이다.
- 공융·진수 아바타는 신원 근거 부재로 의도적으로 제거했으므로 채우지 않는다.
- 기존 22명의 영향력·페르소나·한영 대사·감상 본문·독백은 완비다.
- 기존 영상용 22명과 신규 52명을 같은 코드 배열에 즉시 합치지 않는다. 서비스 태그와 영상 제작 그룹은 목적이 다르다.

## 9. 근거 묶음

기본 프로필 백필의 우선 사료:

- 범엽 『후한서』 동탁열전·원술열전·여포열전 등: <https://zh.wikisource.org/wiki/後漢書>
- 진수 『삼국지』 위서 원소·여포 관련 열전, 오서 손책·주유 관련 열전: <https://zh.wikisource.org/wiki/三國志>
- 배송지 주는 인용 사료명을 함께 기록하고 진수 본문과 층위를 구분한다.
- Wikidata 공식 API는 QID·P31 신원 대조에만 사용했다: <https://www.wikidata.org/w/api.php>

원칙:

- 정사에 없는 생몰년은 비운다.
- 연의의 창작을 기본 프로필 사실로 넣지 않는다.
- 대교·소교는 후대 통칭이며 개인 이름처럼 단정하지 않는다.
- 문추를 관우가 죽였다고 단정하지 않는다.
- 양홍·장훈에게 동명이인 QID를 붙이지 않는다.

## 10. DB 반영·검증 게이트

현재 문서는 DB에 반영되지 않았다. 쓰기 권한이 확보되면 다음 순서를 따른다.

1. 현재값 해시·null 조건으로 Phase A 15명을 조건부 반영
2. 재실행 전원 `SKIP` 확인
3. 각 후속 Phase를 5명 단위로 조사·독립 검토·조건부 반영
4. 신규 52명의 필수 결손 재집계
5. 공개 전 활성화 대상만 한영 HTML 200·본문 일치 확인
6. 기존 활성 22명의 변경이 조식 말투 외 0건인지 역검증

공개 anon 키로는 RLS 때문에 UPDATE 반환 행이 0개다. 서비스 키를 문서나 채팅에 기록하지 않고 실행 환경으로만 주입해야 한다.
