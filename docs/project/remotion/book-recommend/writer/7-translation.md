# 7. 영문본 원전 보존 검증·교정 (Translation Audit)

## 핵심 원리 세 기둥

번역 작업은 세 개의 함정을 동시에 피해야 한다.

### 기둥 1 — 번역이지만, 원문은 번역하지 마라 (역번역 차단)

> **함정**: KO에는 이미 영문 원전(링컨 연설, 셰익스피어 대사, 성경 구절, 영시 등)을 한국어로 옮긴 텍스트가 들어 있다. 이를 그대로 영어로 옮기면 **역번역(back-translation)** 이 되어 원전과 다른 문장이 만들어진다.

원전이 영어로 존재한다면, 번역하지 않고 **원전을 찾아 그대로 가져와 박는다**. 번역 스킬이지만 핵심 작업의 절반은 "어디까지 번역하지 않을지"를 판별하는 것이다.

### 기둥 2 — 1:1 매핑 금지, 중심축만 보존하고 목표 언어 리듬으로 재구성

> **함정**: KO와 EN은 문장 호흡과 문단 단위가 다르다. KO 문장·문단을 EN에서 1:1로 매핑하면, 의미는 통하지만 EN으로 읽었을 때 끊어지거나 늘어지거나 잡음 가득한 글이 된다. 반대 방향(en→ko)도 동일.

**원칙**: 중심축(의미·인과·순서·강조점·감정 곡선)만 보존하고, 문장 분절과 문단 호흡은 **목표 언어 리듬에 맞게 다시 짠다**. 인용문 본체(quotePairs[].quote)는 이 원칙의 예외 — 기둥 1에 따라 변형 금지.

#### 한→영 재구성 패턴

| KO 특성 | 1:1 매핑 시 EN 부작용 | 재구성 방향 |
|---|---|---|
| 짧은 호흡용 단문 분할 | 끊어진 듯 미숙한 인상 | 종속절·세미콜론·em dash로 연결, 1~2문장으로 합성 |
| "그러나"·"한편"·"이러한" 연결어 | 잡음, 과도한 transition | 자연스러운 흐름으로 흡수 (생략 또는 ", and"·"yet"·"meanwhile") |
| 토픽-끝 강조 (저는 ~했습니다) | 어순 부자연 | 주어 앞으로, 강조는 도치·수식절·it-cleft 활용 |
| 주어 생략·반복 | 모호함, 대명사 폭주 | 주어 명시, 반복 시 동의어·대명사로 다양화 |
| 짧은 문단 다발 (감정 휴지) | 단편적 인상 | 의미 단위로 묶어 문단 통합 (단 결정적 휴지는 보존) |

#### 영→한 재구성 패턴

| EN 특성 | 1:1 매핑 시 KO 부작용 | 재구성 방향 |
|---|---|---|
| 긴 복문 (세미콜론·em dash 다중 연결) | 숨이 막히는 한 줄 | 의미 단위로 분할, 마침표 늘려 호흡 만들기 |
| 부수절 다겹 (which·that·whose) | 끝없이 늘어지는 수식 | 별도 문장으로 분리, 연결어로 이어 받기 |
| 명시적 정관사·소유격 (the, his, this) | 군더더기 한국어 | 자연스럽게 생략, 문맥으로 처리 |
| 능동·수동 혼용 | 어색한 직역 수동태 | 한국어는 능동 우선 |
| 한 문단=긴 단락 | 가독성 붕괴 | 호흡 단위 문단 분할 |

#### 재구성 예시 (한→영)

KO: "스물여섯에 링컨은 첫 약혼녀 앤 러틀리지를 장티푸스로 잃었습니다. 그는 슬프고 힘든 순간마다 바이런의 시를 입으로 읊었는데, 그중 특히 좋아한 시가 「꿈」이었습니다."

- ❌ **1:1 BAD**: "At twenty-six, Lincoln lost his first fiancée Ann Rutledge to typhoid. He would recite Byron's poems whenever he was sad and struggling. Among them, his favorite poem was 'The Dream.'"
  - 세 문장이 따로 노는 미숙한 인상, "Among them" transition 잡음
- ✓ **재구성 GOOD**: "At twenty-six, Lincoln lost his fiancée Ann Rutledge to typhoid fever, and from then on he murmured Byron's verses through every spell of grief — most often, 'The Dream.'"
  - 한 문장으로 응축, em dash로 강조점 이동, 시간축("from then on")으로 인과 명시

#### 재구성 예시 (영→한)

EN: "If we shall suppose that American slavery is one of those offenses which, in the providence of God, must needs come, but which, having continued through His appointed time, He now wills to remove, and that He gives to both North and South this terrible war, as the woe due to those by whom the offense came..."

- ❌ **1:1 BAD**: "만약 우리가 미국의 노예제가 신의 섭리 안에서 필연적으로 와야 했지만, 그분이 정하신 시간 동안 지속되었으나 이제 그분이 제거하시고자 하는 그러한 범죄들 중 하나라고 가정한다면..."
  - 한 호흡으로 옮긴 직역, 한국어로 읽기 불가능
- ✓ **재구성 GOOD**: "노예제는 언젠가 신이 거두시려던 죄악입니다. 시간이 이르러, 함께 죄진 모두가 끔찍한 전쟁을 맞이했습니다."
  - 두 문장으로 분할, 부수절을 분리해 인과로 재배치

**중심축 검증 질문**: 재구성 후 원문과 다음이 동일한가?
1. 사실 정보 (인물·날짜·장소·사건)
2. 인과 관계
3. 시간 순서
4. 강조점 (어떤 단어·구절을 시청자가 가장 무겁게 받아야 하는가)
5. 감정 곡선 (각 문단이 만드는 감정 흐름)

이 5가지가 같으면 문장 분절·문단 호흡은 자유.

### 기둥 3 — 문체 등가성: 정보 번역 ≠ 맛 번역

> **함정**: 한문 원전·사극체·시조·교지·격언·군명·서간문 등은 한국어/한문에만 존재하고 영문 원전이 없다. 기둥 1은 적용 불가, 기둥 2는 구조만 다룬다. 이때 정보만 평이한 영어로 옮기면 **압축·대구·운율·격조·시대감이 모두 증발**해 정보 자막처럼 읽힌다.

**원칙**: 같은 무게의 영문 register/style을 찾아 입힌다. 압축·대구·평행·archaic register 같은 형식적 자질을 영어 안에서 등가물로 재현한다.

#### Register 매칭 매트릭스

| 원문 register | EN 매칭 register | 단서 |
|---|---|---|
| 한문 어록 (논어·맹자·도덕경류) | KJV·classical literary English | "Let X be Y", "He who...", 도치·간결 |
| 군왕 명령·교지·윤음 | royal proclamation register | "It is Our will that...", "We hereby...", formal subjunctive |
| 신하의 상소·읍소·고백 | formal humble English | "this servant", "humbly", "Your Majesty" |
| 사극체 평민·무사 발화 | period vernacular (avoid modern slang) | 단단한 어휘, 현대 구어 회피 |
| 시조·가사·고려가요 | English verse with meter awareness | "Wilt thou", "thee/thou" 또는 운율 살린 자유시 |
| 격언·사자성어 | English aphorism (Bacon·Franklin 류) | chiasmus, antithesis, paradox |
| 일기·서간문 (한국 인물) | period letter-style English | "I write to you...", 반정형 산문 |
| 한시 (오언·칠언) | English verse, 한 행=한 행 매핑 시도 | imagery 보존, 압축 우선 |

#### 형식 자질 보존 체크리스트

flat 번역 → 등가 번역으로 끌어올릴 때 다음 자질을 살린다.

- **압축 (Compression)**: 한문 사자성어·시조의 짧은 호흡 → 영어에서도 단음절 위주, 형용사·부사 절제
- **대구 (Parallelism)**: A則B 형, 君君臣臣 식 → 영어 평행구조 ("Resolve to die... cling to life...")
- **반대 (Antithesis)**: 生死·君臣·新舊 같은 대립 → 영어 antithesis 명시
- **chiasmus (교차 대구)**: A-B-B-A → 영어에도 동일 chiasmus 시도
- **archaic register**: 한문·고문 → KJV English, "thee/thou", "wilt", "shall not", "lest"
- **운율 (Meter)**: 한시·시조 음수 → 영어 iambic·trochaic 흉내 가능 시 시도
- **서약·맹세 톤**: 군왕·장수·종교적 발화 → 영어의 oath register ("I do swear...", "by my troth")
- **간투사·감탄 자제**: KO 1인칭 발화의 "이는 정녕..." 같은 강조 표현 → 영어 직역 시 과장됨, 흡수

#### 적용 예시

**한문 어록 (이순신)**

원문: 必死則生 必生則死
- ❌ flat: "If you must die, you will live; if you must live, you will die." (정보만)
- ✓ 등가: "Resolve to die, and you will live; cling to life, and you will die." (chiasmus·command·life-or-death paradox 보존)

**사극체 군왕 발화 (이순신 → 선조)**

원문: 신에게는 아직 열두 척의 배가 남아 있사옵니다.
- ❌ flat: "I still have twelve ships."
- ✓ 등가: "Sire, this servant still has twelve ships." 또는 "Twelve ships yet remain to me, Your Majesty."

**고전 격언 (논어)**

원문: 君君臣臣父父子子
- ❌ flat: "A king is a king, a minister is a minister, a father is a father, a son is a son."
- ✓ 등가: "Let the ruler be a ruler, the minister a minister, the father a father, the son a son." (subjunctive·rhythm 보존)

**고려가요 / 시조**

원문: 가시리 가시리잇고 / 보리고 가시리잇고
- ❌ flat: "Are you leaving? Are you leaving and abandoning me?"
- ✓ 등가: "Wilt thou be going, wilt thou be going? / Wilt thou leave me and be gone?" (archaic register·반복·운율)

**한시 (한 행 = 한 행 매핑)**

원문 (예: 윤동주 「서시」 첫 행): 죽는 날까지 하늘을 우러러
- ❌ flat: "Until the day I die, I look up at the sky"
- ✓ 등가: "Until the day I die, my eyes upon the sky" (압축·운율)

#### 맛 검증 질문

번역 후 다음을 묻는다.

1. 같은 **무게**로 들리는가? (가벼워지지 않았는가)
2. 같은 **시대 격**이 살아 있는가? (현대 구어로 미끄러지지 않았는가)
3. **압축·대구**가 살아 있는가? (단어 수 폭증 없이)
4. **칼날 같은 압축미**가 평이한 산문으로 풀어지지 않았는가?
5. 한자어·고유어의 **문화 무게**가 영어 어휘에 옮겨졌는가?

이 5가지가 충족되면 통과. 한두 개라도 빠지면 register를 한 단계 올려 재시도.

#### 함정과 회피

- **과도한 archaicism**: thee/thou 남발 시 가짜 셰익스피어 인상 → 인물 시대·격에 맞춰 절제
- **현대 구어 누출**: "you know", "kind of", "really" 같은 어휘는 사극체에서 즉시 추방
- **각주식 풀이**: "Sa Ja Sung Eo (a four-character idiom meaning...)" 식 메타 설명 금지. 등가 영문 표현 안에 녹여라
- **한자 병기**: feedback_no_raw_classical_chinese에 따라 영문 본문에 한자 직접 노출 금지. 필요 시 quoteSource에만 표기 가능
- **문체 일관성**: 같은 인물 발화는 하나의 register로 통일. 한 quote 안에서 archaic↔modern 혼용 금지

### 역번역 안티패턴 (실제 사례)

링컨 에피소드 검수에서 발견된 역번역 사례:

| KO 원문 (한국어 번역본) | 역번역 (BAD) | 영문 원전 (GOOD) |
|---|---|---|
| "양측 모두 같은 성경을 읽고, 같은 신에게 기도하며, 각자 상대에 맞서 신의 도움을 구합니다." | "Both read the same Bible and pray to the same God, and each invokes His aid against the other." | "Both read the same Bible, **and** pray to the same God; **and** each invokes His aid against the other." (Second Inaugural 원문 세미콜론 보존) |
| "살해된 왕은 무덤에 있소. 격렬했던 삶의 아픔을 앓고 난 뒤, 그는 이제 편안히 잠들어 있소." | "Duncan is in his grave, and after life's fitful fever he sleeps well — treason cannot touch him further." (두 행 임의 합성) | "Duncan is in his grave; after life's fitful fever he sleeps well; treason has done his worst." (Macbeth 3.2 원문 행 단위) |
| "여러분, 강해서 옳은 게 아니라, 옳기에 강한 것입니다." | "It is not that being strong makes us right, but that being right makes us strong." (재번역) | "Let us have faith that right makes might." (Cooper Union 원문) |

BAD 컬럼은 **문법적으로 멀쩡하고 의미도 통하지만, 원전과 다른 문장**이다. 시청자가 검색·대조하는 순간 어긋남이 드러난다.

### 의사결정 흐름

ko 항목을 만날 때마다 다음 질문을 던진다:

```
[1] 이 텍스트의 원래 출처가 영어로 작성되었는가?
    │
    ├─ YES (링컨 연설, 셰익스피어, 성경, 영시, 영어 회고록 등)
    │   │
    │   ├─ [2] 영문 원전을 신뢰 자료원에서 확인할 수 있는가?
    │   │   │
    │   │   ├─ YES → 원전 verbatim 사용 (기둥 1, R1·R4)
    │   │   └─ NO  → 작업 보류, 사용자에게 보고 (추측 금지)
    │   │
    │   └─ apocryphal 격언인가?
    │       └─ YES → 통용 영문 표준형 사용 (R3)
    │
    └─ NO
        │
        ├─ [3] 한문/한국어 1차 사료인가? (인물 어록·시조·교지·격언·사극체 발화·서간문)
        │   │
        │   └─ YES → 기둥 2 + 기둥 3 적용 (R2-B)
        │            Register 매칭 → 형식 자질 보존 → 맛 5질문 검증
        │
        └─ NO (한국어 작가 산문, narrator 서술 등)
            └─ 기둥 2 적용 (R2-A): 중심축 보존 자유 재구성
```

## 목적

ko.json을 en.json으로 번역하는 과정에서 **영문 1차 사료가 존재하는 인용은 한국어 재번역이 아닌 원문 그대로** 들어가도록 검증·교정한다. 한→영→한 왕복으로 발생하는 의역·재번역을 차단하고, 시청자가 영어권 원전과 직접 대조 가능하도록 보장한다.

## 적용 대상 파일

- `episodes/live/<slug>/en.json` (longform)
- `episodes/live/<slug>/shorts/en-*.json` (shorts 1~N)

## 적용 대상 필드

| 위치 | 검사 포인트 |
|---|---|
| `host.featuredQuote` | KO featuredQuote의 영문 원본이 있다면 원문 사용 |
| `host.philosophy` | 1인칭 발화 안에 인용된 사료·격언은 원문 |
| `books[].quotePairs[].quote` | 인용 본체. 가장 핵심 |
| `books[].quotePairs[].after` | 본문 안에 다시 인용된 한 줄(예: 성경 구절)이 있으면 원문 |
| `books[].contextMain` | 산문 안에 끼어 있는 직접인용은 원문 |
| `narrator.celebIntro/outro` | 인용 끼어 있을 시 원문 |
| `shorts segments[].text` | 동일 원칙 적용 |

## 핵심 규칙

### R1. 영문 원전 존재 시 원문 그대로 + KO quotePair 보존

다음 분류는 무조건 영문 원본 verbatim 사용. 한국어 표현을 그대로 영어로 옮기지 않는다.

- **인물의 영어 발화·문헌**: 링컨 연설(Gettysburg, Cooper Union, Second Inaugural, Baltimore Sanitary Fair 등), 편지, 자서전, Fragment 메모
- **영문학 원전**: 셰익스피어 희곡, 영시(Poe, Byron, Whitman 등), 영문 소설(Bunyan, Defoe 등의 원문 인용)
- **영문 성경**: KJV·NIV 등 정전 번역. 인물의 시대·종파에 맞는 번역본 우선 (링컨=KJV)
- **영어로 기록된 회고록·증언**: Herndon's Lincoln, Chambrun Memoir 영문 출판본 등

ko.json의 `quotePairs`가 영문 원전이 명확한 사료라면 en.json에서도 동일 위치에 quotePair를 둔다. 산문으로 흡수해 사라지게 하지 않는다.

검증 자료원: Collected Works of Abraham Lincoln (Roy P. Basler 편) / Library of Congress Manuscripts / Folger Shakespeare Library / Poetry Foundation / Project Gutenberg / 해당 인물의 공인 아카이브

### R2. 영문 원전이 없는 경우 — 중심축 보존 + 문체 등가 재구성

다음은 KO를 자연스러운 영어로 옮긴다. 단 **1:1 매핑 금지**. 기둥 2에 따라 중심축(의미·인과·순서·강조점·감정 곡선)을 보존하고 EN 리듬으로 다시 짠다. **추가로 기둥 3을 적용**할 항목은 register 매칭과 형식 자질 보존을 함께 수행한다.

#### R2-A. 일반 산문 (기둥 2만)

- 한국어로 작성된 에피소드 작가의 산문 (contextMain 본문, after 해설부)
- narrator 멘트 (인용 없는 일반 서술)

→ 자연스러운 EN 산문으로 재구성. 5축(사실·인과·순서·강조·감정) 검증.

#### R2-B. 문체 등가 필요 (기둥 2 + 기둥 3)

- 한국 인물의 한국어/한문 어록·발화 (이순신, 정약용, 세종, 정조 등)
- 사극체 발화 (군왕 교지·신하 상소·사극체 인용)
- 시조·가사·고려가요·한시·민요
- 사자성어·격언·금언
- 일기·서간문 (인물 1인칭 사료)
- 외국 인물이지만 한국어·기타 언어 원전 → 학술 표준 영역본 우선, 없으면 R2-B 자체 재구성

→ Register 매칭 매트릭스로 register 결정 → 형식 자질 보존 체크리스트 적용 → 맛 검증 5질문 통과 시 채택.

**검증**: 재구성 후 5축(사실·인과·순서·강조·감정) + 맛 5질문(무게·시대격·압축대구·칼날압축미·문화무게) 모두 통과.

### R3. apocryphal 격언 처리

KO 본문이 "실제 인물 발언이 아니다"라고 명시한 격언(예: 링컨의 도끼 격언)은:

- KO에 그대로 둔다
- EN에서는 통용 영문 표준형을 사용한다 (예: "Give me six hours to chop down a tree and I will spend the first four sharpening the axe.")
- philosophy 1인칭 발화로 흡수할 때는 시제·인칭 변형 허용

### R4. 부분 인용 시 자르되 변형 금지

긴 원문을 일부만 쓰는 것은 허용. 단, 자르는 위치는 원문 문장 경계여야 하고 단어·구두점은 변형하지 않는다.

- ✓ "Duncan is in his grave; after life's fitful fever he sleeps well; treason has done his worst." (3.2 원문 전 5행 중 처음 3절 컷)
- ✗ "Duncan is in his grave, and after life's fitful fever he sleeps well — treason cannot touch him further." (서로 다른 행을 합성·구두점 변형)

### R5. 인용 출처 표기 정규화 (quoteSource)

| KO 표기 | EN 표기 |
|---|---|
| 게티즈버그 연설 (1863.11.19) | Gettysburg Address (Nov. 19, 1863) |
| 제2차 취임연설 (1865) | Second Inaugural Address (Mar. 4, 1865) |
| 쿠퍼 유니언 연설 (1860.2.27) | Cooper Union Address (Feb. 27, 1860) |
| 볼티모어 시민 박람회 연설 (1864.4.18) | Address at a Sanitary Fair, Baltimore (Apr. 18, 1864) |
| 노예제에 관한 단편 (1854) | Fragment on Slavery (1854) — Collected Works of Abraham Lincoln, Vol. II |
| 스크립스 자서전 (1860) | Autobiography for Scripps (1860) |
| 맥베스 3막 2장 | Macbeth, Act 3 Scene 2 |
| 마태복음 7장 1절 | Matthew 7:1 |
| 마르키 드 샹브룅 회고록 (1865) | Marquis de Chambrun Memoir (1865) |

원칙: 단체·문서명 영문 정식 명칭 / 날짜 영문 약식(MMM. DD, YYYY) / 권·장·절 표기는 해당 영어권 표준 형식.

### R6. 음역 밀도 상한

영문 본문에 한국어/한문 음역을 박을 때 다음 상한을 지킨다. 학술 출판물에서 음역 dense block은 일반 영미 독자에게 즉시 거부감으로 작용한다.

- **단락당 음역 ≤ 2개**: 한 문단(`\n\n`로 구분)에 음역어가 3개 이상 등장하면 dense block. 인용부호+영문 풀이로 전환한다.
- **인물(book) 단위 음역 unique ≤ 5개**: 같은 음역이 여러 번 나오면 1개로 카운트.
- **dense 처리 패턴**: 음역 대신 인용부호 안에 영문 풀이를 박는다.

#### BAD (yi-sun-sin 초기 사례)

> He reversed `jipi-jigi` (know the enemy, know yourself) into `jigi-jipi` (know yourself, know the enemy). He changed `baekjeon-bultae` (a hundred battles without peril) into `baekjeon-baekseung` (a hundred battles, a hundred victories).

→ 음역 4개. 영미 독자가 멈추고 다시 읽음.

#### GOOD

> He reversed Sun Tzu's order — 'know the enemy and know yourself' — into 'know yourself first, and then your enemy.' He turned 'a hundred battles without peril' into 'a hundred battles, a hundred victories.'

→ 음역 zero. 인용부호로 두 phrase 강조. 즉발 가독.

**예외**: 음역이 핵심 사료 키워드(예: 이순신의 『난중일기』 = `Nanjung Ilgi`)이고 본문에서 반복 호명이 필요한 경우 R7 minimal gloss로 처리한다.

### R7. 첫 등장 minimal gloss

영미권 일반 독자가 한국사 사전 없이 읽을 수 있어야 한다. 한국 고유 용어는 episode 내 **첫 등장 시** 짧은 영문 부연을 매끄럽게 박는다(em dash·괄호·동격절).

| 카테고리 | 첫 등장 형식 | 예 |
|---|---|---|
| 60갑자 연호 | (서기 연도) 부연 | `the year of Imjin (1592)`, `Gabo year (1594)` |
| 한국 행정구역 | em dash 또는 동격절 | `Hoseo and Honam — the western and southern provinces` |
| 한국 사료명 | 음역 + 영문 풀이 | `Nanjung Ilgi` (이미 widely known)는 그대로, 덜 알려진 사료는 `Yi Chungmugong Jeonseo (Complete Works of Admiral Yi)` 형식 |
| 직책 풀어쓰기 | 첫 등장 풀어쓰기 → 이후 단축 | `Supreme Naval Commander of the Three Provinces` (첫) → `Supreme Naval Commander` (단축) |
| 지명 | 음역 + 영문 단위 | `Hansan Island`, `the strait of Uldolmok`, `Byeokpajin` (직접 음역만 — 단위 부연 어려운 경우) |

원칙: gloss는 **인용 본체에 inline**으로 박는다. quote 본체 변형이라도 학술 출판 표준은 inline gloss를 허용한다(원문 사료에 없던 부연이지만 번역 측 가독성 책임).

### R8. 표기 단일원천 (Lexicon)

같은 인물·지명·직책·사료명이 episode 전체에서 **단일 영문 표기**로 통일되어야 한다. episode당 작업 첫 머리에 lexicon을 만들어 두고, 이후 등장 시 동일 표기 사용.

#### lexicon 정의 항목

- 인물명 (Yi Sun-sin / Won Gyun / Kim Eung-ham / An Wi / Kato Kiyomasa)
- 지명 (Hansan Island / Uldolmok / Byeokpajin / Boseong / Yeolseonru)
- 직책 (Supreme Naval Commander of the Three Provinces / Commander of the Center)
- 사료명 (Nanjung Ilgi / Yi Chungmugong Jeonseo / Cheonggu Yeongeon)
- 책명 (The Art of War / Wuzi / Classic of Poetry / Romance of the Three Kingdoms / New Tales Told by Lamplight)
- 전투명 (Battle of Myeongnyang / Battle of Hansan / Chilcheonryang)

같은 직책의 풀어쓰기/단축은 양쪽 모두 lexicon에 기재(첫 등장에 풀어쓰기, 이후 단축).

**금지**: `Hansando` vs `Hansan Isle` vs `Hansan Island` 같은 episode 내 변종 표기.

### R9. Register Tier 일관성

한 인물의 발화는 **동일 tier**로 통일한다. 같은 인물이 같은 상황에서 archaic↔modern을 오가면 영문 비평가는 즉시 지적함.

#### Register tier 정의

| Tier | 격식 등급 | 사용처 | 어휘 표지 |
|---|---|---|---|
| **Tier A** | KJV / royal proclamation | 군왕 교지·신하 상소·서약문 | "thy servant", "Yet... there remain", "shall not", "behold" |
| **Tier B** | Semi-archaic aphoristic | 격언·군 명령·일기·논어풍 | "he who...", "shall live", "lest", "let no...", "These words speak of us" |
| **Tier C** | Modern dramatic | 분노 호령·즉발 외침·전장 호명 | "Do you wish to...", "How can you...", "your head", em dash 강조 |
| **Tier D** | Modern neutral | 일반 narrator·해설부·1인칭 산문 | 평이한 현대 영어 |

#### 적용 원칙

- **같은 인물·같은 상황 = 동일 tier**: 9월 16일 명량 호령 둘(안위·김응함)은 둘 다 Tier C로 통일.
- **같은 인물·다른 상황 = tier 차이 OK**: 8월 장계(Tier A) vs 9월 명령 연설(Tier B) vs 9월 분노 호령(Tier C)은 상황 차이로 정당화 가능.
- **혼용 금지 케이스**: 한 quote 안에서 `thou`/`you` 혼용, `hath`/`has` 혼용, `wilt`/`will` 혼용.

#### 안티패턴 (yi-sun-sin 초기 사례)

같은 9월 16일 명량 호령에서 한쪽은 `Do you wish to die` (Tier C), 다른 한쪽은 `I would have thy head` (Tier A) → 같은 분노 같은 날인데 4세기 떨어진 register. 영문학 비평가 즉시 지적.

→ 둘 다 Tier C `your head`로 통일.

## 워크플로우

### Step 0 — 사전 자료 확인

작업 시작 전 다음을 Read tool로 읽는다.
- `episodes/live/<slug>/ko.json` — 한국어 원본
- `episodes/live/<slug>/en.json` — 검증 대상 longform
- `episodes/live/<slug>/shorts/ko-*.json` 전체
- `episodes/live/<slug>/shorts/en-*.json` 전체
- 본 문서(7-translation.md)
- 0-draft.md (필드 정의 참조)

### Step 1 — 인용·발화 분류

ko.json·shorts/ko-*.json에서 다음을 모두 추출한다.

1. 모든 `quotePairs[].quote` (KO 인용)
2. `host.featuredQuote`
3. `host.philosophy` 안의 인용·격언
4. `contextMain`·`after`·`celebIntro`·`outro` 안에 직접인용으로 끼어 있는 한 줄
5. shorts segments[].text 중 role=celeb 또는 quoteSource 포함 segment

각 항목에 대해 분류:
- A. 인물의 영어 발화/문헌 → 기둥 1, 영문 원본 필수
- B. 영문학 원전(시·희곡·소설) → 기둥 1, 원문 필수
- C. 영문 성경 → 기둥 1, KJV/시대본 필수
- D. 영어 회고록·증언 → 기둥 1, 영문 출판본 원문 필수
- E. 한국어/한문 1차 사료 (어록·시조·교지·서간·격언) → **기둥 3 적용**, R2-B 처리
- F. 한국어 작가 산문·narrator 서술 → 기둥 2 적용, R2-A 처리
- G. apocryphal/작가 창작 → R3 또는 KO 의역 OK

### Step 2 — 원전 텍스트 수집

A·B·C·D 항목은 신뢰 자료원에서 정확한 영문 원문을 가져온다. **추측 금지**. 출처를 메모해 두고, 원문이 확인되지 않으면 작업하지 않고 사용자에게 보고한다.

WebSearch·WebFetch로 다음 우선순위로 검증:
1. 공인 아카이브(LoC, Folger, Poetry Foundation, Gutenberg)
2. 학술 출판물·Collected Works
3. 박물관·재단 공식 사이트

### Step 3 — en.json 대조

각 ko 항목에 대해 en.json·shorts/en-*.json의 해당 위치를 찾아 다음을 검사:

- ❌ **누락**: KO에 있는 quotePair가 EN에서 통째로 사라짐 → 원문으로 추가
- ❌ **재번역**: EN이 KO의 한→영 직역으로 보임 → 원문으로 교체
- ⚠ **paraphrase**: 원문 어순·단어가 변형됨 → 원문에 일치
- ⚠ **구두점 변형**: 세미콜론·콤마·em dash 변형 → 원문 복원
- ⚠ **출처 표기 비표준**: quoteSource가 한글 잔존·표기 비표준 → R5 정규화
- ✓ **원문 일치**: 통과

### Step 4 — 교정 적용

Edit tool로 en.json·shorts/en-*.json을 직접 수정한다. 분류별로 처리:

1. **A~D 분류** (기둥 1): 정확한 영문 원문으로 quote 본체 교체/추가, 누락 시 신규 quotePair 생성
2. **E 분류** (기둥 3 + 기둥 2 = R2-B): Register 매칭 → 형식 자질 보존 → 5축 + 맛 5질문 검증 후 채택
3. **F 분류** (기둥 2 = R2-A): KO 문장·문단을 1:1로 옮기지 않고 중심축만 보존한 채 EN 리듬으로 재구성
4. **G 분류** (apocryphal): R3에 따라 통용 영문 표준형 사용
5. quoteSource는 모두 R5에 따라 정규화
6. 인용 안에 끼어 있는 한 줄(after·contextMain 산문 안의 직접인용 1행)도 분류 적용

**최종 검증**:
- A~D: 원문 verbatim 일치
- E: 5축(사실·인과·순서·강조·감정) + 맛 5질문(무게·시대격·압축대구·칼날압축미·문화무게)
- F: 5축만

### Step 5 — 영미권 출판 게이트 (Publication Gate)

영문 단행본·학술지·박물관 도록 등 **영문 출판물 등급**을 목표로 할 때 통과해야 하는 12개 항목. 한 항목이라도 ❌이면 출판 불가, 정정 후 재검증.

#### 자동 검증 (스크립트로 가능, 7개)

| # | 항목 | 검증 방법 | 통과 기준 |
|---|---|---|---|
| 1 | quotePair 출처 결락 | 모든 `books[].quotePairs[].quoteSource` 존재 확인 | 누락 quote 0건 |
| 2 | JSON 파싱 | `JSON.parse` | 4개 파일(ko/en longform, ko/en shorts) 모두 OK |
| 3 | image anchor 정합 | 각 image의 `text`가 본문에 존재 | NOT FOUND 0건 (longform images + shorts imageChangeAt) |
| 4 | 한자 본문 노출 | `[一-鿿]` 정규식 검사 (quote 본체·contextMain·after·summary·narrator·philosophy) | 한자 0건. quoteSource·tts.replace는 예외 허용. 메모리 `feedback_no_raw_classical_chinese` 적용 |
| 5 | 음역 dense | 한 단락(`\n\n` 분리) 내 음역 토큰 수 카운트. 일반 영문 합성어(twenty-six·well-known 등) 블랙리스트 제외 | ≤ 2개/단락 |
| 6 | shorts↔longform 동일 인용 일치 | 같은 quote가 양쪽에 등장 시 wording 비교 | 1자도 다르지 않음 (공백 정규화 후) |
| 7 | 50단어 초과 문장 | **필드별로** 분할(summary/contextMain/quote/after) 후 문장 단위 단어 수 검사 | 한 문장 ≤ 50단어 (필드 경계 합치지 말 것) |

#### 수동 검증 (영문 검수자 1회 패스, 5개)

| # | 항목 | 점검 포인트 | 통과 기준 |
|---|---|---|---|
| 8 | minimal gloss 누락 | 첫 등장 한국 고유 용어(60갑자·행정구역·직책·사료) 부연 여부 | R7 매트릭스 모든 카테고리 충족 |
| 9 | lexicon 일관성 | 같은 인물·지명·직책·사료의 episode 전체 단일 표기 | 변종 표기 0건. R8 lexicon 일치 |
| 10 | register tier 일관성 | 같은 인물 같은 상황 발화의 tier 통일 | 한 quote 안 혼용 0건. 같은 상황 quote 묶음 단일 tier (R9) |
| 11 | 격언·시구 wording | 영문 격언 표준(antithesis·chiasmus·meter) 부합 | 맛 5질문(무게·시대격·압축대구·칼날압축미·문화무게) 모두 충족 |
| 12 | 일반 영미 독자 가독성 | 한국사 사전 없이 1회 통독 시 이해 가능 | 모르는 용어가 부연 없이 등장 0건 |

#### 검증 스크립트 (실사용)

자동 검증 1~7번을 한 번에 돌리는 Python 스크립트:

```
python scripts/remotion/publication-gate.py <stage> <slug>
# 예: python scripts/remotion/publication-gate.py live abraham-lincoln
# 7/7 PASS → 자동 게이트 통과 / 그 외 → 결함 위치 출력
```

**스크립트 경로**: `scripts/remotion/publication-gate.py`

다음 7개 항목을 자동 검사한다:
1. quotePair·celeb segment의 `quoteSource` 결락
2. JSON 파싱 (4개 파일)
3. image anchor `text` 본문 매칭 (longform `images` + shorts `imageChangeAt`)
4. 한자 본문 노출 (quote·after·contextMain·summary·narrator·philosophy·segments[].text)
5. 음역 dense (단락당 ≤ 2 — 영문 합성어 blacklist 적용)
6. shorts↔longform 동일 인용 wording 일치 (정규화 후 substring 비교)
7. 50단어 초과 문장 (필드별 정밀 분할, 인용 본체 verbatim은 면제)

**확장 시**: 인물 episode의 새 음역어가 false positive로 잡히면 스크립트 내 `blacklist` set에 추가한다.

### Step 6 — 보고

두 표로 보고한다.

**(1) 교정 내역**: 위치 / 분류 / 처리 전 / 처리 후 / 출처·규칙

**(2) Publication Gate 결과**: Step 5의 12개 항목을 ✅/❌ 비고와 함께 표로

**12/12 ✅**: "Publication-grade. 영문 출판물 등급 인증." 보고.
**❌ 1건 이상**: 정정 후 재검증, 모든 항목 ✅까지 반복.

## 주의 사항

- **번역하지 말 것**: A~D 분류 항목은 원전을 가져오는 것이지 KO를 번역하는 게 아니다. 영문 검색 실패 시 작업 보류·보고.
- **E 분류는 정보 번역 금지**: 한문/한국어 1차 사료는 평이한 정보 영어로 옮기지 말 것. 반드시 register 매칭과 형식 자질 보존을 거친다. 맛 5질문 통과 못하면 register 한 단계 올려 재시도.
- **한자·한문 영문 노출 금지**: en.json·shorts/en-*.json 본문(quote·after·contextMain 등)에 한자 직접 노출 금지. quoteSource 메타 표기에서만 인물명 영문 표기와 함께 보조적으로 가능.
- **인물 이름·고유명사 표기**: 영문권 인물·기관·장소는 영문 정식 표기. 한국어 음차를 그대로 옮기지 않는다.
- **시대 일치 성경 번역**: 19세기 미국 인물 → KJV. 16세기 영국 인물 → Geneva Bible/Tyndale 등. 인물 시대에 맞춘다.
- **셰익스피어 인용**: 행 단위(line)와 구두점은 First Folio 또는 표준 학술판(Arden, Oxford, Folger) 표기 따른다.
- **부분 컷 표기**: 긴 인용을 자를 때 ellipsis(…) 대신 문장 경계에서 자연스럽게 절단. ellipsis 남발 금지.
- **번역 후 작업과의 충돌 방지**: 본 작업은 영문본 변경을 동반하므로 사전에 사용자 승인 필요한 영역. 한 에피소드 단위로 묶어 처리한다.

## 트리거 조건

- "영문본 검토", "en 번역 상태 체크", "영문 원전 보존 확인" 류 명시 요청
- "/remo-write-7-translation <에피소드명>"
- ko.json 변경 후 en.json 동기화가 필요한 시점 (사용자 명시 요청 시)

## 본 작업 외 사항

- ko.json은 손대지 않는다 (영문 원전 보존은 EN 측 책임)
- 이미지·음성·타이밍 파일은 손대지 않는다
- 새 quotePair 추가 시 images 배열 동기화는 별도 작업으로 분리
