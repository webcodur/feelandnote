# 팩션 「위대한 해커들」 3부작 — 조사·기획 자료

> 상태: 조사 완료 · 기획 확정(3편 + 종장, 해킹사 연도순) · 데이터 미작성. 작성일 2026-06-29.
> **09-디지털저항군과 인물 중복 0건.** 09 = 이념·프라이버시 철학(사이퍼펑크·자유소프트웨어·내부고발). 본 시리즈 = 실제 침투·익스플로잇·사이버전이라는 기술과 전장.
> 조사 원천: 해커 세계 10개 영역 병렬 웹 조사(후보 161건). 하단 「전체 후보 풀」이 원자료다. 재조사 전에 여기부터 본다.
> 관련 문서: `faction.md`(포맷·데이터 모델·제작 워크플로우), `faction-ideas.md`(아이디어 뱅크), 스킬 `faction-series-concept`.

---

## 1. 확정 기획 — 3부작 + 종장 (해킹의 역사 순서)

**전체 원리**: 시리즈는 해킹의 역사를 따라간다. 1편 여명·개인(얼굴) → 2편 집단·저항(가면) → 3편 국가·전쟁(군단) → 종장 현재의 수호자(다시 얼굴). 동기·정체성축으로 편을 가르되, 각 편 안에서 진영·인물을 모두 **연도순**으로 배치해 보는 사람이 시간을 따라 내려오게 한다.

> 정직한 단서: 1970~2000년대 초까지는 해킹이 개인의 단일 흐름이라 1편이 깔끔히 시간순으로 흐른다. 2000년대 이후는 핵티비스트·국가·범죄·수호자가 동시에 공존하는 병렬 시대다. 그래서 2·3편·종장은 '종류'로 가른 뒤 각 편 내부를 다시 연도순으로 정렬한다(편 사이 약간의 시대 겹침은 이 병렬성 때문이며 의도된 것).

**제작 순서**: 1편 먼저(가장 오래된 시대로 시리즈를 열고, 실존 인물 화보라 제작 검증에 적합) → 2편 → 3편 → 종장. 정치 민감한 3편은 파이프라인 검증 후.

**범죄 진영 정책**: 사이버크라임은 '현상수배 도감' 거리두기 톤으로만. 부의 동경이 아니라 범죄수익으로 못 박는다. 미화 금지.

**한국 직결 hook**: 평창 개막식 마비(샌드웜, 3편)·라자루스(한국 상시 표적, 3편), 이정훈(종장 한국인 챔피언)·한국계 CTF팀 Theori, 삼성 소스코드 유출(Lapsus$, 2편), ILOVEYOU 러브바이러스 국내 대보도(1편), 어나니머스 OpNorthKorea(2편).

### 이번에 확정한 결정 (2026-06-29 추가, 해킹사 연도순 반영)

- **연도순 적용**: 편 사이·편 내부 모두 과거→현재 흐름. 명단에 연도 표기.
- **1편에 '기원' 진영 신설**: 워즈&잡스 블루박스 듀오·존 드레이퍼·더 멘토·모리스 웜. 시리즈를 1971 블루박스에서 연다.
- **보안 수호자 → 종장으로 이동**: 현대 화이트햇(geohot·이정훈·밀러&발라섹·허친스)은 가장 최근이라, 1편이 아니라 역사 끝 종장 「다시, 얼굴」에 둔다. 시간 흐름이 '얼굴→가면→군단→다시 얼굴'로 닫히고 이정훈 한국 hook을 클라이맥스로. (유저가 1편에 넣었던 진영을 위치만 이동, 출연진은 그대로)
- **3편 국가편**: 7개 그룹을 국가별 4진영(미·이스라엘/중/러/북)으로 묶고, 한국 직결 북한을 클라이맥스로.
- **Lapsus$**: 핵티비스트 아닌 2편 사이버크라임 벤치 1순위(갈취형이나 삼성 hook 강함).
- **전면 제외**: 정치 극민감·테러연계(RedHack·Killnet·SEA·Predatory Sparrow·Cyber Partisans·TeaMp0isoN).
- **미정으로 남김**: 종장을 3편 코다로 둘지 독립 4편으로 승격할지(분량 보고), 각 국가편 옵션 그룹(코지베어·APT41) 추가 여부.

### 1편 「얼굴 있는 자들」 — 인물형 · 개인의 시대 (1971~2000)

해킹이 개인의 얼굴이던 시대. 전원 별세·전향·교수라 미화 부담 최저. 진영도 인물도 연도순.

**진영 1 — 기원: 프리킹과 첫 웜 (1971~1988)**
- **워즈니악 & 잡스** 블루박스 듀오 (1971): 2600Hz 블루박스 자작·판매가 애플 창업의 종잣돈. 잡스의 초대형 인지도가 시리즈 진입로를 연다(듀오 단체샷 1컷).
- **존 드레이퍼** (캡틴 크런치, 1971): 시리얼 경품 호루라기가 정확히 2600Hz, AT&T 장거리망 무료통화. 프리킹의 얼굴. 미화 부담은 사건 위주로 거리두기.
- **더 멘토** (로이드 블랭큰십, 1986): 체포 직후 '해커 선언문', "내 유일한 죄는 호기심이다". 얼굴보다 선언문 텍스트가 상징.
- **로버트 태판 모리스** (rtm, 1988): 최초의 인터넷 웜으로 인터넷 약 10% 마비, CFAA 첫 중범. 현 MIT 교수. 멀웨어 시대를 연 효시.

**진영 2 — 개인 무법자 전설 (1990~2000)**
- **케빈 폴슨** (Dark Dante, 1990): LA 라디오 KIIS-FM 전화 교환망 장악, 102번째 당첨자가 되어 포르쉐 944. 후일 Wired 탐사기자.
- **케빈 미트닉** (Condor, 1990s): 사회공학의 대명사, FBI 최다 수배 끝 1995 시모무라 역추적으로 체포. 2023 별세.
- **오넬 데 구즈만** (ILOVEYOU, 2000): 러브버그 웜, 열흘 만에 수천만 대 감염, 피해 100억 달러. 국내 '러브바이러스' 대보도.
- **마이클 칼스** (Mafiaboy, 2000): 15세에 야후·아마존·CNN·이베이 동시 DDoS 다운. 국내 보도된 글로벌 사건.
- 벤치: 게리 매키넌(UFO 동기 군사망 침입), 앨버트 곤잘레스(카드 1.7억건 절도, 2000s 후반).

### 2편 「가면 쓴 자들」 — 팀형 · 집단과 저항의 시대 (1996~2023)

전원 익명이라 초상권·실물 소스 부담 없음. 가면·신사 로고·후드 실루엣·수배 포스터. 진영·인물 연도순.

**진영 1 — 해커티비스트 (저항·폭로, 1996~2015)**
- **cDc (죽은 소의 교단, 1996~98)**: 'hacktivism' 용어 창안, Back Orifice 공개. 핵티비즘 원조.
- **어나니머스 (2003~)**: 가이 포크스 가면의 무지도 분산 집단. 채놀로지·위키리크스 보복 DDoS·2013 OpNorthKorea(북한 선전매체 변조).
- **LulzSec (2011)**: 실크햇 신사 로고. '50일의 lulz', 소니 픽처스·CIA 사이트 연쇄 공격, 리더 Sabu의 FBI 밀고로 자멸.
- **피니어스 피셔 (2014~15)**: 감시기업 Hacking Team 400GB 유출, '감시자를 감시한다'. 단독 후드 실루엣 카드.
- 벤치: CCC(유럽 최대 합법 단체, 1981~).

**진영 2 — 사이버크라임 (탐욕 · 현상수배 도감 톤, 2014~2023)**
- **Evil Corp** (막심 야쿠베츠, 2014~): Dridex로 1억 달러+, 'EVIL CORP' 번호판 람보르기니, 사상 최고 500만 달러 현상금.
- **LockBit** (드미트리 호로셰프 'LockBitSupp', 2019~24): 역대 최대 RaaS, 2500여 피해·약 5억 달러 갈취, 1천만 달러 현상금.
- **다크사이드 (2021)**: 콜로니얼 파이프라인 마비로 미 동부 연료 대란·국가비상사태.
- **스캐터드 스파이더** (노아 어반 'King Bob', 2023): MGM·시저스 카지노 마비, 헬프데스크 사칭·SIM 스와핑.
- 벤치: REvil(Kaseya 공급망·JBS, 2021), Lapsus$(삼성·엔비디아·GTA6 유출, 2022 — 삼성 한국 hook 강함).

### 3편 「국가의 군단」 — 팀형 · 사이버전의 시대 (2010~현재)

국가별 진영으로 깃발을 맞붙여 팀파이트 감각. 평창·라자루스로 한국 직접 연결. 무대사 단조를 막으려면 사건 비주얼(나탄즈 원심분리기·평창 무대·불타는 인프라)로 차별화 필수. 진영은 첫 충격 사건 연도순, 한국 직결 북한을 클라이맥스에 둔다. 단죄 아닌 '전장의 세력' 균형 톤.

**진영 1 — 미국·이스라엘 동맹 (2010~)**
- **스턱스넷 / 올림픽게임 작전** (NSA·CIA + 이스라엘 8200부대, 2010): 이란 나탄즈 원심분리기 약 1000기 물리 파괴. 최초의 실물 타격 사이버무기.
- **Equation Group** (NSA 연계 추정): 지워지지 않는 디스크 펌웨어 임플란트. '멀웨어 은하의 데스스타'.
- **Unit 8200** (이스라엘): 스타트업 사관학교. 스턱스넷과 묶거나 별도 카드.

**진영 2 — 중국 (2013 폭로)**
- **PLA 61398부대** (인민해방군, 왕둥 등 장교 5인): 2013 맨디언트 첫 실명 폭로, 2014 미국의 첫 국가 해커 기소. FBI 수배 포스터의 군복 장교 5인이라 익명 집단인데도 인물 컷이 선다.
- 옵션: APT41/Winnti.

**진영 3 — 러시아 (2016~2018)**
- **팬시 베어** (GRU 26165, 2016): 미 대선 DNC 서버 해킹·이메일 유출. 곰 엠블럼.
- **샌드웜** (GRU 74455, 2017~18): 낫페트야(100억 달러 피해), 2018 평창올림픽 개막식 전산 마비(올림픽 디스트로이어).
- 옵션: 코지 베어(SVR, SolarWinds 공급망, 2020).

**진영 4 — 북한 (2014~2025, 클라이맥스)**
- **라자루스** (정찰총국 121국): 2014 소니 해킹, 2016 방글라데시 중앙은행 8100만 달러, 2017 워너크라이, 2025 바이비트 15억 달러 탈취. 한국 상시 표적, 3편의 한국 직결 클라이맥스.

### 종장 「다시, 얼굴」 — 인물형 · 현재의 수호자 (2007~현재)

가면과 군단의 시대에 맞서 다시 얼굴을 드러낸 화이트햇. 역사의 현재 매듭이자 시리즈의 희망적 닫음. 한국인 이정훈을 클라이맥스에 둔다. 무대사 포맷상 국가 팀형(가면) 다음에 인물형(얼굴)이 와 시각 대비가 강하다.

- **조지 호츠** (geohot, 2007~): 17세 최초 아이폰 언락·PS3 루트키 공개, 이후 comma.ai. 이 분야 한국 대중 인지도 최상.
- **찰리 밀러 & 크리스 발라섹** (2015): 주행 중 지프 체로키 원격 장악(핸들·브레이크 무력화), 140만 대 리콜.
- **이정훈** (lokihardt, 2015): Pwn2Own에서 IE11·크롬·사파리 동시 격파, 단일 대회 최고 상금. 한국인 챔피언.
- **마커스 허친스** (MalwareTech, 2017): 워너크라이 킬스위치로 전 세계 확산 차단(흑→백 양면).
- 벤치: 바나비 잭(ATM 잭팟·심박기 해킹, 요절), 댄 카민스키(2008 DNS 결함), 머지(피터 자트코, 1998 상원 "30분 안에 인터넷 마비" 증언 — 시대상 1990s라 1편 진영1에 둘 수도).

> 종장 위치: 기본은 3편 말미 코다. 분량이 차면 독립 4편(「수호자」)으로 승격 가능. 유저가 고른 3편 골격은 유지하되, 수호자는 가장 현대라 종장으로 옮겨 '얼굴→가면→군단→다시 얼굴' 시간 흐름을 완성했다(원래 1편에 있던 자리에서 이동).

### 얼굴 없는 진영, 어떻게 보여주나 (표현 방침)

2·3편 진영은 1편처럼 개인 얼굴 화보로 못 채운다. 한 컷 = 한 집단이되, 집단마다 표현 수단이 갈린다.

- **진짜 익명** (어나니머스·다크사이드·피니어스 피셔): 가이 포크스 가면·엠블럼·후드 실루엣. 어나니머스의 초상 = 가면 군상 그 자체(세계에서 가장 유명한 해커 이미지). 한 컷 = 가면 군상 이미지 + 집단명 + 대표 작전 줄.
- **수배 사진 있음** (이블코프 막심 야쿠베츠·LockBit 드미트리 호로셰프·중국 61398 장교 5인·북한 박진혁·러 GRU 장교들): FBI·영국 NCA가 실명·얼굴 공개·현상수배. 그 **수배 포스터 얼굴**을 인물 컷으로. 머그샷·현상금 미학이 '현상수배 도감' 톤과 정확히 맞물린다.
- **시각 단조 보강**: 집단마다 가면·색 차별(어나니머스=가이포크스 그린 / LulzSec=실크햇 신사 / cDc=죽은 소 해골), + 작전 비주얼(불타는 로고·멈춘 전광판·유출 문서 더미).
- **선택 — 어나니머스 '벗겨진 가면'**: 잡혀 신상 드러난 Sabu(엑토르 몬세구르)·Topiary(제이크 데이비스) 얼굴 악센트 컷 가능. 단 익명 신비 손상·대부분 LulzSec계 → 기본은 가면 군상 유지.

---

## 2. 3개 기획안 비교 (채택 경위)

조사 후 동일 후보 풀로 서로 다른 구획 원리 3안을 경쟁시켰다. 채택: **C 동기축**을 골격으로 → 팩션 포맷(인물형/팀형) 분리 → 유저 결정으로 **3분할 확장 + 사이버크라임 진영 포함(현상수배 톤)**.

| 안 | 구획 원리 | 진영 | 치명 약점 |
|---|---|---|---|
| A. 빛과 그림자 | 도덕 스펙트럼 | 수호자→무법자전설→국가그림자→약탈자 (4) | 무게추가 어둠으로 쏠려 '범죄자 도감'이 메인이 될 위험. 빛 진영 인지도 약함 |
| B. 익스플로잇의 계보 | 시대 연대기 | 프리킹→수배전설→핵티비스트→국가부대→Pwn2Own (5) | 양 끝(1세대·현대 CTF)이 매니아 전용이라 hook 약함 |
| C. 왜 선을 넘었나 | 동기·정체성 | 해커티비스트/국가/개인전설/수호자/사이버크라임 (5) | 진영 정체성은 또렷하나 단일편 시 톤 충돌 심함 |

세 안 공통 약점: ① 해커는 대부분 익명 → 한국 대중이 아는 건 '사람'이 아니라 '사건'(러브바이러스·야후 다운·평창 마비·콜로니얼 연료 대란·삼성 유출). ② 한 편에 미화금지 범죄 + badass 영웅이 섞이면 톤 충돌. → **3편 분할로 편마다 톤 단일화하여 두 약점을 동시에 해소.**

(각 안의 시그니처 비주얼·전체 자기비판 전문은 조사 결과 JSON `concepts` 항목에 보존. 핵심만 위 표로 요약.)

---

## 3. 톤·미화·민감성 정책

- **범죄 진영(2편 B)**: 현상수배 도감 거리두기. 람보르기니·갈취액을 '부의 동경'이 아니라 범죄수익으로 못 박는다.
- **국가편(3편)**: 단죄 아닌 '전장의 세력' 균형. 북·러·중·미·이스라엘을 한쪽 편향 없이.
- **신중 인물**: 조너선 제임스(2008 자살)·카를 코흐(의문사)·게리 매키넌(아스퍼거·자살 우려) → 비극적 결말 신중. TriCk(Junaid Hussain, ISIS 가담 후 드론 폭사)·TeaMp0isoN → 테러 연계라 절대 미화·영웅화 금지, 채택 시 비판적 거리두기. RedHack·Killnet·SEA·Predatory Sparrow → 정치 극민감(편향 주의), 후순위.
- **갱생자 텍스처**: 미트닉·폴슨·모리스·geohot·허친스는 전향·갱생·교수. '전과자' 단정 대신 '추적과 갱생' 톤.

---

## 4. 전체 후보 풀 (조사 원자료 161건)

> 형식: **인물/집단** (핸들) · 시기 · 한국 인지도(high/medium/low) · 인물형/팀형 · [익명 여부]. ⚠ = 주의점. 🇰🇷 = 한국 관련성.

### 해커티비스트 집단(저항·폭로 운동형 해킹 집단) (16)

- **Anonymous (어나니머스)** · 2003-present (2008 부상) · 인지도 high · 팀형 · 익명
  - 2008 프로젝트 채놀로지(사이언톨로지 교회 공격)로 가면 시위 시작, 2010 오퍼레이션 페이백(위키리크스를 끊은 비자·마스터카드·페이팔 DDoS), 2011 아랍의 봄 튀니지 정부망 공격, 2022 러시아 침공 후 RT·러 정부 사이트 공격
  - 🇰🇷 2013 OpNorthKorea로 북한 선전매체 우리민족끼리·관련 트위터 계정 탈취 및 웹사이트 변조
  - ⚠ 가이 포크스 가면이 곧 핵티비즘 아이콘이라 시각 최강. 단 통일 조직이 아니라 누구나 이름을 쓰는 구조 → 작전마다 정의/범죄 편차 큼. DDoS·침입은 불법이고 일부는 단순 보복·트롤. 영웅화 주의.
  - 출처: https://en.wikipedia.org/wiki/Anonymous_(hacker_group) · https://en.wikipedia.org/wiki/Project_Chanology · https://www.britannica.com/topic/Anonymous-hacking-group
- **핵심 리더 Sabu = Hector Xavier Monsegur (멤버 6인) (LulzSec (Lulz Security))** · 2011 (약 50일 활동) · 인지도 low · 팀형
  - 2011 '50 days of lulz' 선언 후 해산. 소니 픽처스 침투(약 100만 계정 유출 주장 — 2,460만 건 유출은 별개의 Sony Online Entertainment 사건으로 LulzSec 소행 아님), CIA·미 상원·뉴스코퍼레이션 사이트 다운. 리더 Sabu가 FBI 정보원으로 전향해 동료들을 밀고
  - ⚠ 실크햇·모노클·턱시도 신사 로고가 강렬한 비주얼. 단 정치 명분보다 '재미(lulz)' 위주 파괴·과시형이고 실제 유저 개인정보 대량 유출 피해. Sabu의 동료 밀고는 미화하기 어려운 배신 코드. 씨앗의 AntiSec(LulzSec+Anonymous 합동 작전, 스트랫포·애리조나 경찰 유출)도 이 계열로 흡수 가능.
  - 출처: https://en.wikipedia.org/wiki/LulzSec · https://en.wikipedia.org/wiki/Hector_Monsegur · https://en.wikipedia.org/wiki/Operation_AntiSec
- **Cult of the Dead Cow (cDc)** · 1984-present (1990s-2000s 전성기) · 인지도 low · 팀형
  - 1996 멤버 Omega가 'hacktivism' 용어 창안, 1998 DEF CON에서 윈도 원격장악 도구 Back Orifice 공개, 멤버 Mudge(Peiter Zatko)가 2000년 클린턴 대통령에 인터넷 보안 브리핑. 멤버에 전 美 대선후보 베토 오로크
  - ⚠ 죽은 소 해골 로고·텍사스 도살장 창립 신화가 비주얼. 핵티비즘의 어원을 만든 원조라 서사 가치 큼. 단 한국 인지도 매우 낮음. Back Orifice는 보안연구이자 악성 침투도구 양면. 베토 오로크 멤버설은 美 정치 민감 소재.
  - 출처: https://en.wikipedia.org/wiki/Cult_of_the_Dead_Cow · https://cyber.tap.purdue.edu/blog/articles/hacktivism-the-cult-of-the-dead-cow/
- **공동창립 Wau Holland = Herwart Holland-Moritz (Chaos Computer Club (CCC))** · 1981-present · 인지도 low · 팀형
  - 1984 BTX 해킹(함부르크 저축은행 시스템 취약점 악용, 13.5만 마르크 이체 후 반환해 보안 결함 폭로), 유럽 최대 해커 단체(회원 7,700여명), 매년 카오스 커뮤니케이션 콩그레스 개최, 독일 정부 스파이웨어(국가 트로이목마) 분석·폭로
  - ⚠ 합법·윤리 노선이라 미화 위험 낮음. 단 초기 BTX 해킹은 당시 불법이었음. 한국 일반 인지도 낮아 hook 약함. 개인 카리스마보다 단체·콩그레스 군중샷 중심이라 인물 한 장 포맷엔 약함.
  - 출처: https://en.wikipedia.org/wiki/Chaos_Computer_Club · https://www.heise.de/en/news/40-years-ago-the-Btx-hack-celebrates-a-happy-birthday-10040281.html
- **핵심 멤버 Arion Kurtaj 등 영국 10대 (Lapsus$)** · 2021-2022 · 인지도 low · 팀형
  - 2022 엔비디아·삼성전자·마이크로소프트·옥타·우버·Rockstar(GTA6 영상) 잇단 침투·소스코드 유출. 영국 옥스퍼드 10대 주도, 갈취형. 멤버 Arion Kurtaj 런던 법원 유죄 평결
  - 🇰🇷 2022 삼성전자 내부 소스코드 약 190GB 유출(갤럭시 부트로더·생체인증 알고리즘 포함) — 한국 직접 피해
  - ⚠ 삼성 유출로 한국 시청자 hook 강함. 단 미성년 금전 갈취가 본질이고 정치 명분 없음 → '핵티비스트'보다 사이버 범죄집단에 가까움. 미화 금지, 실제 기업 피해 막대.
  - 출처: https://en.wikipedia.org/wiki/Lapsus$ · https://thehackernews.com/2023/08/two-lapsus-hackers-convicted-in-london.html
- **멤버 Julius Kivimäki(zeekill)·Zachary Buchta 등 (Lizard Squad)** · 2014-2016 · 인지도 low · 팀형
  - 2014 크리스마스 PSN·Xbox Live 동시 DDoS 다운(수천만 게이머 마비), DDoS 대여 서비스 LizardStresser 홍보용 범행. 소니 임원 탑승 여객기 폭탄협박(항공기 회항) 연루
  - 🇰🇷 PSN·Xbox 다운으로 한국 게이머도 크리스마스 접속 불가 피해
  - ⚠ 도마뱀 마스코트 로고가 시각적. 단 명분 없는 과시·범죄(스와팅·폭탄협박)라 미화 위험. 게이머 인지도는 있으나 일반 대중 낮음.
  - 출처: https://en.wikipedia.org/wiki/Lizard_Squad · https://www.welivesecurity.com/2014/12/31/xbox-psn-lizard-squad-ddos/
- **RedHack** · 1997-present · 인지도 low · 팀형 · 익명
  - 터키 마르크스-레닌주의 해커, 2012 앙카라 경찰망(POLNET) 침투해 경찰 밀고자 명단 대량 유출, 2016 에너지장관(에르도안 사위) 베라트 알바이라크 이메일 유출. 터키서 '사이버 테러조직' 지정
  - ⚠ 붉은 마스크·낫망치 상징으로 비주얼 가능. 단 터키서 테러조직 지정, 쿠르드·정부 갈등 등 정치적으로 매우 민감(한쪽 편향 주의). 한국 인지도 낮음.
  - 출처: https://en.wikipedia.org/wiki/RedHack · https://www.ibtimes.co.uk/redhack-hackers-turkey-police-informants-anonymous-363377
- **창립자 핸들 Killmilk (Killnet)** · 2022-present · 인지도 low · 팀형
  - 친러 핵티비스트, 2022 우크라 침공 후 미국·유럽·NATO 회원국 정부·공항·병원 사이트 DDoS. 2023 'FuckNATO' 작전으로 NATO 훈련 포털 침해 주장, 영국 왕실 사이트 공격
  - ⚠ 해골 엠블럼·군복 이미지로 선전 비주얼 강함. 단 실제 피해는 단기 DDoS로 과장된 측면, 크렘린 선전 도구 성격. 전쟁 프로파간다라 정치 민감, 미화 주의.
  - 출처: https://socradar.io/blog/dark-web-profile-killnet-russian-hacktivist-group/ · https://cloud.google.com/blog/topics/threat-intelligence/killnet-new-capabilities-older-tactics
- **Predatory Sparrow (Gonjeshke Darande / گنجشک درنده)** · 2021-present · 인지도 low · 팀형 · 익명
  - 반이란 그룹. 2021 이란 전국 주유소 결제망 마비, 2022 이란 제철소 산업제어시스템 장악해 용융 쇳물을 쏟고 화재 유발(물리 파괴), 2025 국영 뱅크 세파 마비·암호화폐거래소 Nobitex서 9천만 달러 탈취 후 소각
  - ⚠ 불타는 제철소·쏟아지는 쇳물 영상이 시각 임팩트 최강. 단 이스라엘 군·정부 연계 의혹 = 사실상 국가 사이버전이지 풀뿌리 핵티비즘 아님. 이란-이스라엘 분쟁 극도 민감. 물리 인프라 파괴는 전쟁행위 논쟁.
  - 출처: https://en.wikipedia.org/wiki/Predatory_Sparrow · https://techcrunch.com/2025/06/17/pro-israel-hacktivist-group-claims-responsibility-for-alleged-iranian-bank-hack/
- **분산 자원봉사(대변인 Peter Fein 등 일부 공개) (Telecomix)** · 2009-2013 (아랍의 봄 2011) · 인지도 low · 팀형
  - 인터넷자유 활동가, 2011 아랍의 봄 때 이집트·시리아 정부 인터넷 차단에 맞서 유럽 서버로 다이얼업 접속 제공(전화선으로 인터넷 부활), 시리아 정부의 美 Blue Coat 검열장비 사용 로그 폭로
  - ⚠ 파괴가 아닌 '연결을 살린' 인도적 핵티비즘이라 미화 위험 낮음. 단 가면·드라마 없이 모뎀·전화선 같은 장비 이미지에 기대야 해 비주얼 약함. 한국 인지도 낮음.
  - 출처: https://www.washingtonpost.com/lifestyle/style/the-hacktivists-of-telecomix-lend-a-hand-to-the-arab-spring/2011/12/05/gIQAAosraO_story.html · https://grokipedia.com/page/telecomix
- **리더 핸들 s1ege (Ghost Squad Hackers (GSH))** · 2015-present · 인지도 low · 팀형 · 익명
  - 어나니머스 계열, 2016 에티오피아 정부 시위 유혈진압 항의로 정부 사이트 변조, 2019 ISIS 텔레그램·운영자 신상 대량 폭로, 이스라엘 총리실·중앙은행 사이트 다운. 2016 BLM 공식 사이트 다운(역설적 행보)
  - ⚠ 익명·후드 비주얼 가능. 단 BLM 사이트 다운 등 정치적으로 양면적 행보, 명분 일관성 약함. 한국 인지도 낮음.
  - 출처: https://en.wikipedia.org/wiki/Ghost_Squad_Hackers · https://diyaruna.com/en_GB/articles/cnmi_di/features/2019/02/26/feature-03
- **Syrian Electronic Army (SEA)** · 2011-present (2013 정점) · 인지도 low · 팀형 · 익명
  - 친아사드 정권 해커, 2013 AP통신 트위터 탈취해 '백악관 폭발·오바마 부상' 가짜 속보 송출 → 다우지수 순간 1,360억 달러 증발, BBC·가디언·오바마 캠페인 등 서방 언론 계정 무더기 탈취
  - ⚠ AP 트위터 한 줄로 증시를 흔든 사건은 hook 강력. 단 독재정권 선전 목적, 친아사드라 정치 민감. 가짜뉴스로 시장 교란은 명백한 범죄.
  - 출처: https://foreignpolicy.com/2013/04/23/syrian-electronic-army-takes-credit-for-hacking-ap-twitter-account/ · https://gizmodo.com/everything-we-know-about-the-syrian-hackers-who-hijacke-1766375347
- **핵심 인물 TriCk = Junaid Hussain (영국 버밍엄 출신) (TeaMp0isoN)** · 2008-2012 · 인지도 low · 인물형
  - 친팔레스타인 10대 해커단, 2011 토니 블레어 전 총리 주소록 공개, UN·EDL·BNP DB 유출, 영 대테러 핫라인 전화 폭격. 리더 TriCk(Junaid Hussain)이 출소 후 시리아로 가 ISIS 사이버 핵심이 되었다가 2015 美 드론에 폭사
  - ⚠ TriCk의 '10대 해커→ISIS 전사→드론 폭사' 일대기는 서사 폭발력 최강이나 테러 연계라 극도로 민감, 절대 미화·영웅화 금지. 영상화 시 ISIS 가담은 비판적 거리두기 필수.
  - 출처: https://en.wikipedia.org/wiki/Junaid_Hussain · https://ctc.westpoint.edu/british-hacker-became-islamic-states-chief-terror-cybercoach-profile-junaid-hussain/
- **벨라루스 망명 활동가 약 30명 (Cyber Partisans (Кибер-Партизаны))** · 2020-present (2022 철도 공격) · 인지도 low · 팀형 · 익명
  - 반루카셴코 벨라루스 해커, 2020 부정선거 항의로 결성. 2022 러 침공 직전 벨라루스 철도 전산망을 랜섬웨어로 마비시켜 러군 병력·물자 이동 지연(여객열차는 의도적으로 보존), 내무부·KGB 데이터 탈취
  - ⚠ '철도를 멈춰 전쟁을 늦췄다'는 서사가 강력. 단 랜섬웨어 사용·벨라루스/러시아 정치 민감. 윤리적 해킹을 자처하나 국가 인프라 공격은 법적 회색지대.
  - 출처: https://en.wikipedia.org/wiki/Cyber_Partisans · https://cyberscoop.com/cyber-partisans-belarus-ukraine-russia/
- **NoName057(16)** · 2022-present · 인지도 low · 팀형 · 익명
  - 친러 핵티비스트, 2022 침공 직후 등장. 자원봉사 DDoS 도구 'DDoSia'로 우크라·프랑스·이탈리아·스웨덴 등 정부·공공기관 3,700여 호스트 공격(참여자에 암호화폐 보상). 2025 유럽 합동단속 'Operation Eastwood'로 다수 체포
  - ⚠ 수천 봉사자를 동원하는 크라우드형 DDoS 군대 컨셉은 흥미로우나 얼굴·드라마가 없어 비주얼 약함. 크렘린(CISM) 연계 추정, 전쟁 프로파간다라 민감. Killnet과 진영·기능 중복이라 둘 중 하나만 채택 권장.
  - 출처: https://www.recordedfuture.com/research/anatomy-of-ddosia · https://socradar.io/blog/noname05716-and-ddosia-project-analysis-russia/
- **Phineas Fisher (Phineas Phisher / Subcomandante Marcos)** · 2014-2019 · 인지도 low · 인물형 · 익명
  - 단독 익명 해커. 2014 감시기업 Gamma International(FinFisher 스파이웨어) 침투해 40GB 폭로, 2015 이탈리아 Hacking Team 침투·400GB 유출(전 세계 정부 감시도구 거래 폭로), 2019 케이맨 국립은행 침투해 역외 탈세 자료 공개·'부자를 털어라' 선언
  - ⚠ 후드·익명 단독 실루엣 + '감시기업을 감시한다'는 로빈후드 서사로 인물형 카리스마 강함. 단 은행 절도·기업 해킹은 명백한 범죄이고 현재 도주 중. 로빈후드 미화 위험 주의. 엄밀히는 집단이 아닌 개인이라 '집단' 영역에선 곁가지.
  - 출처: https://en.wikipedia.org/wiki/Phineas_Fisher · https://www.vice.com/en/article/offshore-bank-targeted-phineas-fisher-confirms-hack-cayman-national-bank/

### 전설의 개인 블랙/그레이햇 해커 (1980~2000년대 명성·악명) (15)

- **Kevin Mitnick (케빈 미트닉) (Condor (콘도르))** · 1980s-1990s · 인지도 medium · 인물형
  - 1980~90년대 모토로라·노키아·선마이크로시스템스 등 소스코드 탈취와 사회공학(전화 한 통으로 비밀번호 빼내기)의 대명사. 당대 FBI 최다 수배 해커로 1995년 보안연구원 쓰타무 시모무라의 역추적에 걸려 체포
  - 🇰🇷 저서 '기만의 예술'이 국내 번역 출간돼 보안업계 인지도 있음
  - ⚠ 2023년 별세. 출소 후 합법 보안 컨설턴트로 전향한 인물이라 범죄 미화보다 '추적과 체포' 서사로 다루는 편이 안전
  - 출처: https://en.wikipedia.org/wiki/Kevin_Mitnick
- **Kevin Poulsen (케빈 폴슨) (Dark Dante (다크 단테))** · 1980s-1990s · 인지도 low · 인물형
  - 1990년 LA 라디오 KIIS-FM 경품 행사의 전화 교환망을 장악해 102번째 당첨 전화를 독점, 포르쉐 944를 타냄. FBI 수배 중 TV 추적 프로그램 생방송에서 방송국 전화선까지 마비
  - ⚠ 출소 후 Wired 탐사기자로 전향(SecureDrop 공동개발). 미화 자제하고 전화망 장악 사건 자체에 집중
  - 출처: https://en.wikipedia.org/wiki/Kevin_Poulsen
- **Mark Abene (마크 아베네) (Phiber Optik (파이버 옵틱))** · 1980s-1990s · 인지도 low · 인물형
  - 해커 집단 Legion of Doom·Masters of Deception 핵심 멤버. 1990년대 초 전화망 침투로 기소돼 1994년 1년 복역. 미 최초로 법원 허가 도청이 해커 수사에 동원된 사건의 당사자
  - ⚠ 집단 활동 비중이 커 단일 결정사건은 다소 약함. 출소 환영파티 'Phiberphest'로 90년대 뉴욕 해커 문화 아이콘
  - 출처: https://en.wikipedia.org/wiki/Mark_Abene
- **Robert Tappan Morris (로버트 태판 모리스) (rtm)** · 1980s · 인지도 low · 인물형
  - 1988년 11월 인터넷 최초의 웜 '모리스 웜'을 풀어 당시 전체 인터넷의 약 10%(6천여 대)를 마비. 컴퓨터사기남용법(CFAA) 적용 사상 첫 중범죄 유죄 판결의 주인공
  - 🇰🇷 정보보안 교과서 단골 사례라 학계·전공자 인지도는 있음
  - ⚠ 고의 파괴 의도는 부인(크기 측정 실험이 폭주). 현재 MIT 교수·Y Combinator 공동창업자로 명망 높음 → '악마화'보다 '판도라의 상자를 연 효시'로 다룰 것
  - 출처: https://en.wikipedia.org/wiki/Robert_Tappan_Morris
- **Onel de Guzman (오넬 데 구즈만) (ILOVEYOU 제작자 (GRAMMERSoft))** · 2000s · 인지도 medium · 인물형
  - 2000년 5월 'I LOVE YOU' 제목의 러브버그 웜을 살포해 열흘 만에 전 세계 윈도 PC 수천만 대 감염, 피해 추정 100억 달러. 필리핀에 처벌법이 없어 기소 못 하고 풀려난 사건
  - 🇰🇷 '러브레터/아이러브유 바이러스'로 국내에서도 당시 대대적 보도, 대중 기억에 남은 사건
  - ⚠ 당시 처벌 근거법 부재로 미기소·무죄. '범죄자' 단정 표현 지양. 2020년 공개 인터뷰로 직접 자백한 인물
  - 출처: https://en.wikipedia.org/wiki/ILOVEYOU · https://en.wikipedia.org/wiki/Onel_de_Guzman
- **Vladimir Levin (블라디미르 레빈) ((별칭 미상))** · 1990s · 인지도 low · 인물형
  - 1994년 상트페테르부르크에서 시티은행 전산망에 침입해 약 1,070만 달러를 해외 계좌로 빼돌린 초기 사이버 은행강도. 인터폴 공조로 런던 히스로 공항에서 체포
  - ⚠ 실제 기술 주도자는 별도 그룹이고 레빈은 그 일부였다는 후일담 존재 → '천재 단독범' 과장 주의
  - 출처: https://en.wikipedia.org/wiki/Vladimir_Levin
- **Albert Gonzalez (앨버트 곤잘레스) (soupnazi / segvec)** · 2000s · 인지도 low · 인물형
  - TJX·하트랜드 페이먼트 등에서 약 1억 7천만 건 카드정보를 SQL 인젝션·와이파이 스니핑으로 절도한 사상 최대급 카드 도난. 2010년 징역 20년 선고
  - ⚠ 한때 비밀수사 협조자(정보원)였다가 이중행각 → 배신·전향 서브플롯 활용 가능. 현재 복역 중
  - 출처: https://en.wikipedia.org/wiki/Albert_Gonzalez
- **Gary McKinnon (게리 매키넌) (Solo (솔로))** · 2000s · 인지도 low · 인물형
  - 2001~2002년 미 육·해·공군과 NASA 등 군·정부 컴퓨터 97대에 침입(UFO·반중력 기술 자료 탐색이 동기). '사상 최대 군사망 침입' 규정, 미국의 송환 요구를 영국이 2012년 인도적 사유로 거부
  - 🇰🇷 송환 공방·UFO 동기가 국내에도 단신 보도됨
  - ⚠ 아스퍼거 진단으로 송환 면제된 인물 → 동정 여론과 자살 우려가 얽힌 민감 서사. 'UFO 찾던 해커'라는 기이한 동기는 영상적 매력
  - 출처: https://en.wikipedia.org/wiki/Gary_McKinnon
- **Ehud Tenenbaum (에후드 테넨바움) (The Analyzer (디 애널라이저))** · 1990s · 인지도 low · 인물형
  - 1998년 미 국방부·NASA·공군·해군 등 500여 시스템을 침투한 'Solar Sunrise' 작전의 배후. 미군이 이라크발 사이버전을 의심했으나 실체는 이스라엘 10대였던 충격적 반전
  - ⚠ 후일(2008~09) 캐나다·미국서 카드사기로 재차 검거된 전력 → 후반부 타락 서사 존재
  - 출처: https://en.wikipedia.org/wiki/Ehud_Tenenbaum
- **Jonathan James (조너선 제임스) (c0mrade (콤레이드))** · 1990s-2000s · 인지도 low · 인물형
  - 1999년 15세에 미 국방부 산하 DTRA와 NASA(국제우주정거장 생명유지 소스코드)에 침입해 미성년 해킹범 최초로 소년원 수감. 2008년 카드도난 수사 압박 속에 스스로 생을 마감
  - ⚠ 2008년 자살(곤잘레스 사건 연루 의심 부인하는 유서)로 비극적 결말 → 사망 다룰 때 신중. 미성년 최초 수감이라는 기록성이 핵심
  - 출처: https://en.wikipedia.org/wiki/Jonathan_James
- **Karl Koch (카를 코흐) (Hagbard (하그바드))** · 1980s · 인지도 low · 인물형
  - 1980년대 카오스컴퓨터클럽 일원으로 미군·연구소 전산망을 뚫어 자료를 소련 KGB에 팔아넘긴 냉전 사이버 첩보(클리퍼드 스톨의 '뻐꾸기 알' 추적 대상). 1989년 숲에서 불탄 시신으로 발견된 의문사
  - ⚠ 마약·환각·일루미나티 망상과 자살/타살 논란이 얽힌 매우 어두운 실화(영화 '23' 소재) → 무대사 실루엣·숲·불 이미지로 시네마틱 처리 적합하나 음모론 단정은 피할 것
  - 출처: https://en.wikipedia.org/wiki/Karl_Koch_(hacker)
- **ASTRA (아스트라)** · 2000s · 인지도 low · 인물형 · 익명
  - 약 5년간 프랑스 방산기업 다소항공(Dassault) 전산망에 잠입해 미라주 전투기 등 무기·항공기 설계 데이터를 빼내 다국에 판매. 2008년 그리스에서 검거됐으나 신원은 법적으로 비공개
  - ⚠ 그리스 법원이 실명·얼굴을 끝까지 공개하지 않음(58세 수학자로만 알려짐) → 신원 추측 금지. 후드 실루엣·핸들 'ASTRA' 엠블럼으로 살리는 익명 카드로 최적
  - 출처: https://en.wikipedia.org/wiki/Astra_(hacker)
- **Michael Calce (마이클 칼스) (Mafiaboy (마피아보이))** · 2000s · 인지도 medium · 인물형
  - 2000년 2월 'Project Rivolta'로 Yahoo·Amazon·CNN·eBay·Dell 등 당대 최대 사이트들을 분산서비스거부(DDoS)로 잇따라 다운시킨 15세 캐나다 소년. 전자상거래 취약성을 만천하에 드러낸 사건
  - 🇰🇷 야후·아마존·CNN 동시 다운은 2000년 당시 국내에도 비중 있게 보도된 글로벌 사건
  - ⚠ 미성년이라 청소년 구금형. 현재 보안 컨설턴트·저술가로 활동 → 사건의 충격(거대 닷컴들이 줄줄이 멈춤)에 집중
  - 출처: https://en.wikipedia.org/wiki/MafiaBoy
- **Adrian Lamo (에이드리언 라모) (the homeless hacker (노숙 해커))** · 2000s-2010s · 인지도 low · 인물형
  - 카페·도서관을 떠돌며 마이크로소프트·야후·뉴욕타임스 내부망에 침입(2002년 NYT 침입으로 유명). 2010년 위키리크스 제보자 첼시 매닝을 당국에 신고해 '밀고자'로 돌아선 논쟁적 인물
  - 🇰🇷 위키리크스·매닝 사건 보도 맥락에서 이름이 언급됨
  - ⚠ 매닝 신고로 해커 사회에서 배신자로 낙인, 2018년 별세 → 영웅/배신자 양극 평가 공존하는 민감 인물. 단죄·미화 어느 쪽도 단정 말 것
  - 출처: https://en.wikipedia.org/wiki/Adrian_Lamo
- **Hector Xavier Monsegur (엑토르 사비에르 몬세구르) (Sabu (사부))** · 2010s · 인지도 low · 인물형
  - 2011년 어나니머스 분파 LulzSec를 이끌며 소니·FBI 협력사·정부기관을 연쇄 공격. 체포 직후 FBI 정보원으로 전향해 동료들을 일망타진하게 한 '내부 붕괴' 사건의 핵심
  - 🇰🇷 어나니머스·LulzSec 활동이 국내 IT매체에 보도됨
  - ⚠ 시기가 2011년으로 '80~2000년대' 범위를 살짝 벗어남(어나니머스 계보로 편입 가능). 동료 밀고로 배신 서사가 강함 → 영웅화 부적합, 전향·붕괴 축으로 다룰 것
  - 출처: https://en.wikipedia.org/wiki/Hector_Monsegur

### 프리커·1세대·하드웨어 해커 (해킹 문화의 기원) (16)

- **John Thomas Draper (Captain Crunch (John Draper))** · 1970s · 인지도 low · 인물형
  - 1971년 Cap'n Crunch 시리얼 경품 호루라기가 정확히 2600Hz를 낸다는 걸 발견, 블루박스로 AT&T 장거리망 무료통화. 에스콰이어 '리틀 블루박스' 기사로 프리킹의 얼굴이 됨. 1974년 통신사기 유죄.
  - 🇰🇷 애플 창업 신화의 전사(워즈니악과 블루박스 협업)로 간접 인지
  - ⚠ 1974년 전화사기 유죄. 후년 다수의 부적절 신체접촉('에너지 운동') 의혹 — 영웅 미화에 부담. 동기는 호기심과 사익 혼재.
  - 출처: https://en.wikipedia.org/wiki/John_Draper · https://telephone-museum.org/telephone-collections/capn-crunch-bosun-whistle/ · https://www.atlasobscura.com/articles/capn-crunch-whistle
- **Stephen Wozniak, Steve Jobs (블루박스 듀오 (Steve Wozniak & Steve Jobs))** · 1971-1972 · 인지도 high · 팀형
  - 1971~72년 워즈니악이 블루박스를 설계하고 잡스와 함께 버클리 기숙사 문을 두드리며 1대 170달러에 40~100대 판매. 잡스 '블루박스가 없었다면 애플도 없었다' — 애플 창업의 종잣돈과 협업 원형.
  - 🇰🇷 잡스·애플은 한국 초대형 인지도. 단 프리킹 전력은 대중에 덜 알려져 반전 서사로 활용 가능.
  - ⚠ 셀럽 과노출, 해커보다 창업자 이미지로 굳어짐. 영상 초점을 '애플 이전 범법 시절'에 둬야 차별화. 실제 범죄성은 가벼움.
  - 출처: https://512pixels.net/2018/03/woz-blue-box/ · https://www.mentalfloss.com/posts/apple-phone-phreakers-history
- **Josef Carl Engressia Jr. (1991년 Joybubbles로 개명) (The Whistler (Joybubbles / Joe Engressia))** · 1950s-1970s · 인지도 low · 인물형
  - 선천적 시각장애와 절대음감으로 1957년 7세 때 공중전화에 2600Hz 휘파람을 불어 회선을 장악, '휘파람 부는 소년'. 블루박스 이전의 '인간 블루박스'로 프리킹 지하문화의 시조 중 하나.
  - ⚠ 아동기 학대 피해·시각장애 서사 민감. 동정·미화 균형 필요, 장애를 신비화하지 말 것.
  - 출처: https://en.wikipedia.org/wiki/Joybubbles · https://laughingsquid.com/joybubbles-a-documentary-about-a-legendary-blind-phone-hacker/
- **Robert Tappan Morris (Robert Tappan Morris)** · 1988 · 인지도 low · 인물형
  - 1988년 11월 코넬 대학원생 시절 '모리스 웜'을 MIT 회선을 통해 유포해 인터넷 컴퓨터 약 10%를 마비. 1990년 CFAA(컴퓨터사기남용법) 사상 첫 중범 유죄 판결.
  - 🇰🇷 보안업계 한정 인지
  - ⚠ 본인은 인터넷 규모 측정 의도였고 코딩 실수라 주장. 현재 MIT 교수이자 Y Combinator 공동창업자 — 단순 '범죄자' 프레임은 부적절.
  - 출처: https://en.wikipedia.org/wiki/Robert_Tappan_Morris · https://en.wikipedia.org/wiki/Morris_worm
- **Ian Arthur Murphy (Captain Zap (Ian Murphy))** · 1981 · 인지도 low · 인물형
  - 1981년 AT&T 내부 시계를 조작해 심야 할인요금을 한낮에 적용, 한낮 통화자에게 할인을 안기고 심야 통화자에게 정가를 물림. 사이버범죄로 기소된 최초의 인물로 회자(영화 Sneakers 모티프).
  - ⚠ 실제 기술 기여와 자기 과장 논란(attrition.org는 '사기꾼'으로 분류). 동기는 사익. '최초' 타이틀에 이견 존재.
  - 출처: https://attrition.org/errata/charlatan/ian_murphy/threat_profile/ · https://www.chaintech.network/blog/year-1981-the-fascinating-tale-of-ian-murphy-aka-captain-zap/
- **Loyd Blankenship (The Mentor (Loyd Blankenship))** · 1980s · 인지도 low · 인물형
  - 1986년 1월 체포 직후 '해커의 양심(해커 선언문)'을 Phrack 7호에 발표. '내 유일한 죄는 호기심이다' — 해커 문화의 경전이 된 짧은 에세이.
  - ⚠ 익명 핸들 기반, 얼굴보다 '선언문 텍스트'가 상징물. Legion of Doom 소속. 후일 게임 디자이너(GURPS Cyberpunk → 1990 Steve Jackson Games 압수 사건과 연결).
  - 출처: https://en.wikipedia.org/wiki/Hacker_Manifesto · https://www.historyofinformation.com/detail.php?id=1510
- **Mark Abene (Phiber Optik (Mark Abene))** · late 1980s-1994 · 인지도 low · 인물형
  - 10대에 LOD·MOD를 오가며 활동, 1990년대 초 뉴욕 전화망 침투. 1994년 1년 복역 후 출소 시 'Phiberphest '95'로 추앙받고, 타임지가 '정보화시대 최초의 언더그라운드 영웅·사이버 로빈후드'로 명명.
  - ⚠ 미성년 시작, 미국 최초로 법원 인가 도청 증거로 기소. '로빈후드' 영웅화 프레이밍은 과장 주의.
  - 출처: https://en.wikipedia.org/wiki/Mark_Abene · https://www.livinginternet.com/i/ia_hackers_abene.htm
- **Eric Gordon Corley (Emmanuel Goldstein (Eric Corley))** · 1984-present · 인지도 low · 인물형
  - 1984년 잡지 '2600: The Hacker Quarterly' 창간(주파수 2600Hz에서 이름 차용), 라디오 'Off the Hook'(1988~) 진행, 해커 컨퍼런스 HOPE 개최. 해커 문화의 출판·집회 구심점.
  - ⚠ 필명은 오웰 '1984'의 저항 지도자에서 차용. 2000년 DeCSS·DMCA 소송 등 정보자유 운동가 성격으로 정치적 함의 약간 있음.
  - 출처: https://en.wikipedia.org/wiki/Eric_Corley · https://en.wikipedia.org/wiki/2600:_The_Hacker_Quarterly
- **MOD vs LOD (Masters of Deception vs Legion of Doom)** · 1984-1993 (전쟁 1990-91) · 인지도 low · 팀형
  - 1990~91년 뉴욕 MOD와 텍사스 기반 전국조직 LOD가 전화망을 무대로 벌인 '대 해커 전쟁'. Erik Bloodaxe(Chris Goggans)가 Phrack에 MOD를 조롱한 글이 도화선. 1992년 FBI·비밀경호국 합동수사로 MOD 5명 기소.
  - ⚠ LOD 창립자 Lex Luthor, MOD 창립자 Acid Phreak(Elias Ladopoulos) 등 핸들 중심으로 일부만 얼굴 공개. 갱단식 대결 미화·실명 노출 민감.
  - 출처: https://en.wikipedia.org/wiki/Legion_of_Doom_(hacker_group) · https://en.wikipedia.org/wiki/Masters_of_Deception · https://en.wikipedia.org/wiki/Chris_Goggans
- **Kevin Poulsen (Dark Dante (Kevin Poulsen))** · 1980s-1991 · 인지도 low · 인물형
  - 1990년 LA 라디오 KIIS-FM 전화선을 전부 장악해 자신이 102번째 발신자가 되도록 만들어 포르쉐 944를 획득. 수배 중 'Unsolved Mysteries' 제보전화선까지 마비시킨 일화. 1994년 유죄(51개월).
  - 🇰🇷 보안업계 한정 인지
  - ⚠ 현재 정상 탐사보도 언론인(Wired 편집자, SecureDrop 공동개발) — 범죄 미화 금지, 갱생 서사로 다뤄야 함.
  - 출처: https://en.wikipedia.org/wiki/Kevin_Poulsen · https://phreak.fm/signals/kevin-poulsen-dark-dante
- **Craig Neidorf (Knight Lightning (Craig Neidorf))** · 1985-1990 · 인지도 low · 인물형
  - Phrack 공동창간, 1989년 BellSouth E911(긴급전화 911) 내부문서를 Phrack에 게재해 1990년 절도·기소(US v. Riggs). 문서가 13.5달러에 살 수 있는 자료로 드러나 재판 4일 만에 기각 — 전자프런티어재단(EFF) 창립의 직접 계기.
  - ⚠ 사건(Operation Sundevil·EFF 창립)이 본인보다 유명. 무죄로 종결, 본인 대중 인지도는 낮음.
  - 출처: https://en.wikipedia.org/wiki/Craig_Neidorf · https://en.wikipedia.org/wiki/United_States_v._Riggs
- **Susan Headley (Susan Thunder (Susan Headley))** · late 1970s-early 1980s · 인지도 low · 인물형
  - 1970년대 말~80년대 초 활동한 여성 프리커. '심리적 전복(소셜 엔지니어링)'으로 Pacific Bell 등을 침투, Kevin Mitnick·Roscoe(Lewis DePayne)와 협업. 1983년 미 상원에서 해커·프리커 실태를 증언.
  - ⚠ 초기 해커계에 드문 여성(다양성 가치). 동료(Mitnick 등)에게 불리하게 증언해 면책받은 이력으로 영웅화 어려움. 후일 행적 불투명. 유혹·선정 묘사 지양.
  - 출처: https://en.wikipedia.org/wiki/Susan_Headley · https://kottke.org/22/01/searching-for-susy-thunder
- **Abbie Hoffman, Al Bell (TAP / YIPL (Abbie Hoffman & Al Bell))** · 1971-1984 · 인지도 low · 장비형
  - 1971년 이피(Yippie) 운동가 Abbie Hoffman과 Al Bell이 '최초의 해커 뉴스레터' YIPL 창간, 1973년 TAP로 개편. AT&T 독점에 맞선 무료통화·프리킹 기법 공유의 시초이자 2600의 선조.
  - ⚠ Abbie Hoffman은 급진 반체제 정치활동가(시카고 7) — 정치색 강함. 영상은 인물보다 잡지 지면·운동 자체를 상징물로 다뤄야. 마지막 편집장 Cheshire Catalyst(Richard Cheshire)로 계보 연장 가능.
  - 출처: https://en.wikipedia.org/wiki/Phreaking · https://archive.org/details/yipltap
- **Lee Felsenstein (Lee Felsenstein)** · 1970s-1980s · 인지도 low · 인물형
  - 1975년 Homebrew Computer Club 진행자로 Altair 시대 '직접 만드는' 하드웨어 해커 계보의 중심. Sol-20, Osborne 1(최초 양산 휴대용 컴퓨터) 설계, 1973년 Community Memory(공개 게시판 시초) 개발.
  - ⚠ 범죄 아님 — 오픈·DIY 윤리의 '하드웨어 해커'(스티븐 레비 '해커' 2세대). 도메인의 '하드웨어 해커' 축 대표지만 대중 인지도는 매우 낮음. 카리스마 단일샷보다 기물·장비 배경 보강 필요.
  - 출처: https://en.wikipedia.org/wiki/Lee_Felsenstein · https://en.wikipedia.org/wiki/Homebrew_Computer_Club
- **블루박스 & Cap'n Crunch 호루라기 (상징 기물)** · 1960s-1980s · 인지도 low · 장비형 · 익명
  - 2600Hz 한 음으로 AT&T 장거리망을 여는 프리킹의 상징 기물. Cap'n Crunch 경품 호루라기와 워즈니악 수제 블루박스는 컴퓨터역사박물관·전화박물관(월섬)에 전시. red/black/beige box 등 '색깔 상자' 계보로 확장.
  - ⚠ 인물 없는 장비형 — 클로즈업·박물관 전시품 톤으로 중립 연출. 사기 도구 미화 경계. 인물 컷의 도입/연결 비주얼로 쓰기 좋음.
  - 출처: https://en.wikipedia.org/wiki/Blue_box · https://telephone-museum.org/telephone-collections/capn-crunch-bosun-whistle/
- **Kevin David Mitnick (Condor (Kevin Mitnick))** · late 1970s-1995 · 인지도 medium · 인물형
  - 10대에 LA 버스 환승권 펀치를 위조하고, 고교 시절 전화 프리킹에 입문해 1979년 DEC의 The Ark 시스템 침입. 이후 1990년대 '세계에서 가장 수배된 해커'로 비화.
  - 🇰🇷 저서 '기만의 기술'·'네트워크 속의 유령'이 국내 번역 출간, 보안 강연으로 인지된 편
  - ⚠ 별도 '지명수배·소셜엔지니어링' 에피소드와 중복 가능성 — 진영/에피소드 배치 조율 필요(여기서는 프리커 기원 측면만). 2023년 사망. 도메인 정원(8~15)을 맞춰야 하면 이 항목을 다른 에피소드로 이관 가능.
  - 출처: https://en.wikipedia.org/wiki/Kevin_Mitnick · https://www.cybereason.com/blog/malicious-life-podcast-kevin-mitnick-part-1

### 국가 사이버부대·작전 (미국·이스라엘·동맹) (15)

- **올림픽 게임 작전 (미국 NSA·CIA + 이스라엘 합작) (Stuxnet / Operation Olympic Games)** · 2006-2010 · 인지도 medium · 장비형 · 익명
  - 2009~2010년 이란 나탄즈 우라늄 농축시설 원심분리기 약 1,000기를 물리적으로 파괴한 세계 최초의 실물 타격 사이버무기. 지멘스 PLC를 표적해 회전수를 조작했고, 미국이 나탄즈 복제 시설로 코드를 검증했다.
  - 🇰🇷 스턱스넷 공개 후 한국 원전·산업제어시스템(SCADA) 보안 경각심을 촉발한 사례로 국내 보도됨.
  - ⚠ 미·이스라엘 모두 공식 책임 미시인. 국가 사이버무기의 시초이자 군비경쟁 촉발 사례 - 단죄가 아닌 '사이버 전장의 분수령'으로 프레임. 상징물은 원심분리기와 손상 코드.
  - 출처: https://en.wikipedia.org/wiki/Stuxnet · https://en.wikipedia.org/wiki/Operation_Olympic_Games
- **NSA 맞춤형 접근 작전팀 (S32 / Computer Network Operations) (NSA TAO (Tailored Access Operations))** · 1997-present · 인지도 low · 팀형 · 익명
  - 1997년경 창설된 NSA 최정예 침투부대. 라우터·방화벽·BIOS·USB(COTTONMOUTH)에 심는 하드웨어 임플란트 'ANT 카탈로그'(2008~09, 최대 25만 달러)와 QUANTUM/FOXACID 중간자 공격을 운용. 2013년 스노든·Der Spiegel 폭로로 노출.
  - ⚠ 대규모 감시 논란의 핵심. 요원 얼굴·실명 비공개. 시각화는 부대 코드명·하드웨어 임플란트(조작된 USB·라우터)와 NSA 엠블럼으로.
  - 출처: https://en.wikipedia.org/wiki/Tailored_Access_Operations · https://en.wikipedia.org/wiki/ANT_catalog
- **(카스퍼스키 명명, NSA 연계로 추정) (Equation Group)** · 2001-2015 (폭로) · 인지도 low · 팀형 · 익명
  - 시게이트·WD·삼성 등 십수 개 브랜드 하드디스크 펌웨어를 재프로그래밍해 포맷·OS 재설치로도 지워지지 않는 임플란트를 심은 사상 최정교 스파이 조직. 2015년 카스퍼스키가 '멀웨어 은하의 데스스타'로 폭로, 2001년부터 30여 개국 침투.
  - ⚠ 공식적으로 NSA 귀속 미확정(정황 분석). 익명 조직 - 엠블럼과 '지워지지 않는 디스크' 상징으로. Shadow Brokers 유출의 원소유주.
  - 출처: https://en.wikipedia.org/wiki/Equation_Group · https://securelist.com/equation-the-death-star-of-malware-galaxy/68750/
- **이스라엘 정보군단 8200부대 (Yehida Shmone-Matayim) (Unit 8200 (이스라엘 8200부대))** · 1950s-present · 인지도 low · 팀형
  - 이스라엘군 최대 규모 신호정보·사이버 부대(미 NSA 대응). 18~21세 영재를 선발하는 '스타트업 사관학교'로 Check Point·NSO 등 창업자 배출, 스턱스넷 기여, 2015년 카스퍼스키 해킹으로 러시아 해커 활동을 실시간 관찰.
  - 🇰🇷 8200 출신이 세운 NSO의 페가수스 스파이웨어 논란이 한국에서도 보도됨.
  - ⚠ 가자 분쟁 중 팔레스타인 안면인식 감시, NSO 페가수스 등 민간 감시산업 연결로 정치 민감. 부대원 익명이나 졸업생은 공개 - 부대 상징·실루엣으로.
  - 출처: https://en.wikipedia.org/wiki/Unit_8200 · https://www.jpost.com/israel-news/defense-news/article-820689
- **영국 정부통신본부 (Government Communications Headquarters) (GCHQ / Operation Socialist (Regin))** · 2010-2013 · 인지도 low · 팀형 · 익명
  - 2010~2013년 벨기에 최대 통신사 Belgacom 엔지니어를 가짜 링크드인 페이지(Quantum Insert)로 낚아 침투, 사상 최정교 스파이웨어 Regin을 심어 EU 우방의 로밍·통신망을 도청. 2014년 스노든 문서로 노출.
  - ⚠ 동맹·EU 우방 통신망 도청으로 프라이버시·외교 신뢰 논란. 요원 익명 - GCHQ 도넛 청사·엠블럼으로.
  - 출처: https://en.wikipedia.org/wiki/Operation_Socialist · https://theintercept.com/2014/12/13/belgacom-hack-gchq-inside-story/
- **CIA 사이버정보센터 (CCI) / 공학개발그룹(EDG) (CIA Vault 7 (Center for Cyber Intelligence))** · 2013-2017 · 인지도 low · 팀형 · 익명
  - 2017년 위키리크스가 폭로한 CIA 해킹툴 8,761건. 삼성 스마트TV를 도청기로 만드는 Weeping Angel, 차량·아이폰·안드로이드·윈도 장악 도구와 흔적 위장(Marble)·Hive 서버를 운용. 5,000여 사용자·1,000여 멀웨어 보유.
  - ⚠ 유출 자체가 기밀 누설(요원 조슈아 슐티 유죄). 시민 사생활 장악 도구 논란. 익명 - CIA 디지털혁신부 상징·스마트TV/차량 아이콘으로.
  - 출처: https://en.wikipedia.org/wiki/Vault_7 · https://wikileaks.org/ciav7p1/
- **(정체불명 집단, 러시아 배후설 등 추정) (Shadow Brokers / EternalBlue)** · 2016-2017 · 인지도 medium · 팀형 · 익명
  - 2016~2017년 NSA(이퀘이션 그룹)의 해킹툴을 탈취·공개한 정체불명 집단. 2017년 4월 EternalBlue 취약점을 공개했고, 한 달 뒤 워너크라이 랜섬웨어가 이를 악용해 150개국 20만 대를 감염(영국 NHS 응급실 마비).
  - 🇰🇷 워너크라이로 한국 CGV 상영관 광고서버·일부 기업이 감염되며 2017년 5월 국내 대형 보도됨.
  - ⚠ 국적·정체 불명, 국가부대가 아닌 누설자. 국가 사이버무기가 민간 재앙으로 번진 '변수' 세력으로 배치. 후드 실루엣·핸들·중개인 엠블럼으로.
  - 출처: https://en.wikipedia.org/wiki/The_Shadow_Brokers · https://en.wikipedia.org/wiki/EternalBlue
- **미 사이버사령부 / 합동기동부대 ARES (US Cyber Command / JTF-Ares (Glowing Symphony))** · 2016-2017 · 인지도 low · 팀형 · 익명
  - 2016년 11월 작전 Glowing Symphony로 ISIS 선전 네트워크 관리자 권한을 탈취, 계정·서버를 무력화해 7개월간 ISIS 웹사이트 90%를 영구 차단. 미국이 공식 인정한 첫 공세 사이버작전.
  - ⚠ 대테러 명분이나 작전 시 동맹 사전통보를 둘러싼 내부 논쟁 존재. 사령관은 공개되나 작전요원 익명 - USCYBERCOM 엠블럼으로.
  - 출처: https://nsarchive.gwu.edu/briefing-book/cyber-vault/2018-08-13/joint-task-force-ares-operation-glowing-symphony-cyber-commands-internet-war-against-isil · https://darknetdiaries.com/transcript/50/
- **(미 NSA·CIA + 이스라엘군 합작으로 보도) (Flame (Flamer / sKyWIper))** · 2007-2012 · 인지도 low · 장비형 · 익명
  - 2012년 발견된 중동 표적 초대형 스파이 멀웨어(20MB급). 마이크 오디오·스카이프 녹음, 화면캡처, 키로깅, 주변기기를 블루투스 비컨으로 변환. 스턱스넷의 자매로 미 NSA·CIA·이스라엘군이 합작했다고 워싱턴포스트가 보도.
  - ⚠ 국가 귀속은 정황·보도 기반(공식 미인정). 형제 멀웨어 Duqu(2011 정찰)·Gauss(2012 레바논 은행 표적)와 한 계보(Tilded 플랫폼). 멀웨어 - 불꽃·코드 상징으로.
  - 출처: https://en.wikipedia.org/wiki/Flame_(malware) · https://securelist.com/the-flame-questions-and-answers/34344/
- **프랑스 대외정보국(DGSE) 연계 APT (Animal Farm (Babar / Casper / Dino))** · 2007-2015 · 인지도 low · 장비형 · 익명
  - 프랑스 정보기관 연계 해킹조직. 동물 코드명 멀웨어 Babar(캐나다 CSEC 명명 '스노글로브')·Casper·Dino·EvilBunny로 스카이프·메신저 감청과 키로깅을 수행, 시리아·이란 등을 표적. 2015년 스노든·CSEC 문서로 프랑스 정부와 연결됨.
  - ⚠ 프랑스 정부 공식 미인정(정황 분석). 동물 만화 코드명(코끼리 Babar·유령 Casper)을 살린 시각화가 강점. 미국 진영 밖 동맹의 독자 공세 사례.
  - 출처: https://www.infosecinstitute.com/resources/threat-intelligence/animal-farm-apt-and-the-shadow-of-france-intelligence/ · https://www.welivesecurity.com/2015/03/05/casper-malware-babar-bunny-another-espionage-cartoon/
- **루비콘 작전 (CIA '미네르바' + 서독 BND '테사우루스/루비콘') (Operation Rubicon / Crypto AG)** · 1970-2018 · 인지도 low · 장비형 · 익명
  - 1970~2018년 CIA와 서독 BND가 스위스 암호장비社 Crypto AG를 비밀 소유, 조작된 암호기(CX-52)를 인도·파키스탄·이란 등 120여 개국에 팔아 수십 년간 외교·군사 암호를 해독. 2020년 워싱턴포스트·ZDF·SRF 폭로.
  - ⚠ 엄밀히는 사이버 이전 신호정보지만 '제품에 심은 백도어'의 직계 조상. 중립국·동맹까지 광범위 도청으로 외교 신뢰 논란. 조작된 암호기를 강한 상징물로.
  - 출처: https://en.wikipedia.org/wiki/Crypto_AG · https://en.wikipedia.org/wiki/Operation_Rubicon
- **니트로 제우스 (미국 대이란 사이버전 계획) (Nitro Zeus)** · 2010s (오바마 행정부) · 인지도 low · 장비형 · 익명
  - 전쟁 발발 시 이란 전력망·방공·통신을 마비시키려던 미국의 전면 사이버전 우발계획. 수천 명 인력과 수천만 달러가 투입돼 이란 망에 전자 임플란트를 미리 심어둔, 스턱스넷의 대형 후속판.
  - ⚠ 실행되지 않은 전쟁 우발계획(폭로·다큐 기반). 실제 타격은 없었음을 명시할 것. 'if war' 시나리오 - 잠복 임플란트·전력망 상징으로.
  - 출처: https://en.wikipedia.org/wiki/Nitro_Zeus · https://www.cybersecurityintelligence.com/blog/nitro-zeus-the-us-plan-to-launch-a-massive-cyber-attack-on-iran-1049.html
- **오차드(상자 밖) 작전 + Suter 공중 네트워크 공격체계 (Operation Orchard / Suter)** · 2007 · 인지도 low · 장비형 · 익명
  - 2007년 9월 이스라엘의 시리아 알키바르 원자로 공습. Suter 공중 네트워크 공격으로 시리아 방공레이더에 가짜 영상을 주입·무력화해 전투기가 무사 침투. 사이버·전자전과 물리 타격을 융합한 효시.
  - ⚠ 공습 자체는 군사작전, 핵심은 레이더를 속인 전자전 요소. 이스라엘은 2018년에야 시인. 같은 계보로 2019년 IDF의 하마스 사이버부대 청사 공습(사이버 공격에 대한 첫 물리 보복)도 묶을 수 있음.
  - 출처: https://en.wikipedia.org/wiki/Operation_Outside_the_Box · https://theaviationist.com/2012/09/10/op-orchard/
- **UKUSA 협정 5개국(미·영·캐·호·뉴) 신호정보 동맹 (Five Eyes / ECHELON)** · 1971-present · 인지도 medium · 팀형 · 익명
  - 미·영·캐나다·호주·뉴질랜드 5개국 신호정보 동맹. 1971년 가동된 ECHELON 글로벌 감청망으로 위성·통신을 전 세계적으로 수집, 호주 ASD 등은 공세 사이버작전 부서도 운용. 냉전기 소련 감시에서 출발.
  - 🇰🇷 한국이 파이브아이즈 확대(+한국·일본 등) 후보로 거론되며 국내 정보·안보 보도에서 다뤄짐.
  - ⚠ 동맹국 간 상호 감시·민간 통신 무차별 수집 논란. 추상적 동맹체 - '다섯 개의 눈' 엠블럼·5개국 깃발로 시각화.
  - 출처: https://en.wikipedia.org/wiki/Five_Eyes · https://en.wikipedia.org/wiki/ECHELON
- **NSA·GCHQ 합동 SIM 암호키 탈취 (JTRIG 등) (Great SIM Heist (Gemalto))** · 2010-2011 · 인지도 low · 장비형 · 익명
  - 2010~2011년 NSA·GCHQ가 세계 최대 SIM 제조사 Gemalto의 내부망에 멀웨어를 심어 암호키 수십억 개를 탈취. 통신사·정부 동의 없이 전 세계 휴대폰 음성·데이터를 도청할 잠재력을 확보. 2015년 인터셉트 폭로.
  - ⚠ 전 세계 민간 통신 무차별 감청 잠재로 프라이버시 침해 논란. Gemalto는 피해 규모를 축소 주장. 익명 합동부대 - SIM 칩·열쇠 상징으로.
  - 출처: https://theintercept.com/2015/02/19/great-sim-heist/ · https://www.schneier.com/blog/archives/2015/02/nsagchq_hacks_s.html

### 국가 사이버부대·APT (러시아·중국·북한·이란) (17)

- **러시아군 정보총국(GRU) 26165부대 (Fancy Bear (APT28))** · 2007-present · 인지도 medium · 팀형 · 익명
  - 2016년 미국 민주당전국위(DNC) 서버 해킹·이메일 유출로 대선에 개입, 세계반도핑기구(WADA) 선수 의료기록 해킹. 러시아군 정보총국(GRU) 26165부대로 지목
  - ⚠ 미 대선 개입 등 정치 민감 소재. 러시아 정부 공식 부인. 귀속은 미 정보기관·보안업체 발표 기반. '곰' 코드명·엠블럼이 시그니처라 무대사 영상에 강함
  - 출처: https://attack.mitre.org/groups/G0007/ · https://www.justice.gov/archives/opa/pr/six-russian-gru-officers-charged-connection-worldwide-deployment-destructive-malware-and
- **러시아 대외정보국(SVR) (Cozy Bear (APT29))** · 2008-present · 인지도 low · 팀형 · 익명
  - 2020년 솔라윈즈 소프트웨어 공급망 해킹으로 미 재무부·국토안보부 등 1만8천여 기관에 잠입, 2016년 DNC 동시 침투. 러시아 대외정보국(SVR) 소속으로 지목
  - ⚠ 솔라윈즈는 사상 최대급 공급망 해킹이나 일반 대중엔 그룹명 생소. 러시아 부인. 정치 민감
  - 출처: https://en.wikipedia.org/wiki/Cozy_Bear
- **러시아군 정보총국(GRU) 74455부대 (Sandworm (APT44))** · 2009-present · 인지도 low · 팀형 · 익명
  - 2015·2016년 우크라이나 전력망 해킹으로 23만명 정전, 2017년 낫페트야(NotPetya) 악성코드로 세계 100억 달러 피해, 2018년 평창동계올림픽 개막식 전산망 마비(올림픽 디스트로이어). GRU 74455부대, 2020년 장교 6명 기소
  - 🇰🇷 2018년 평창동계올림픽 개막식 IT 시스템을 마비시킨 '올림픽 디스트로이어' 공격의 배후로 지목
  - ⚠ 물리 파괴(정전)까지 일으킨 가장 공격적인 부대. 러시아 부인. 정치 민감하나 사건 자체는 법무부 기소·다국적 귀속으로 확립
  - 출처: https://en.wikipedia.org/wiki/Sandworm_(hacker_group) · https://www.justice.gov/archives/opa/pr/six-russian-gru-officers-charged-connection-worldwide-deployment-destructive-malware-and
- **러시아 연방보안국(FSB) 16센터 (Turla (Snake / Uroburos))** · 2004-present · 인지도 low · 팀형 · 익명
  - 2004년부터 50여개국 정부·외교·국방망을 20년 넘게 첩보, 위성 인터넷 통신을 가로채 추적을 따돌린 스네이크(Snake) 멀웨어. 러시아 연방보안국(FSB) 16센터로 지목
  - ⚠ 보안 매니아 전용. 화려한 사건보다 장기 은밀 첩보라 영상화 시 임팩트 약함. 위성 하이재킹 기법이 유일한 시각 후크
  - 출처: https://attack.mitre.org/groups/G0010/
- **중국 인민해방군 61398부대 (상하이 푸둥) (PLA Unit 61398 (APT1))** · 2006-2014 (노출) · 인지도 low · 팀형
  - 2013년 맨디언트 보고서가 상하이 푸둥의 12층 건물을 인민해방군 해킹부대로 최초 실명 폭로, 2014년 미국이 장교 5명(왕둥 등)을 웨스팅하우스·US스틸 영업비밀 절도로 기소(첫 국가 해커 기소)
  - ⚠ 국가 해킹을 세계에 처음 공개시킨 상징적 사건이라 서사 가치 높음. FBI 수배 포스터에 군복 차림 장교 5명 사진 공개(엠블럼·인물 모두 활용 가능). 중국 부인
  - 출처: https://en.wikipedia.org/wiki/PLA_Unit_61398 · https://www.csmonitor.com/World/Passcode/2014/0519/US-indicts-five-in-China-s-secret-Unit-61398-for-cyber-spying-on-US-firms
- **청두404(Chengdu 404), 국가안전부(MSS) 연계 청부조직 (APT41 (Winnti / Double Dragon))** · 2012-present · 인지도 low · 팀형
  - 국가 첩보와 동시에 게임사 해킹·게임머니 위조·암호화폐 탈취로 사익을 챙긴 이중성, 2020년 미국이 100여개사 침해로 청두404 소속 중국인 5명 기소
  - ⚠ '낮엔 국가요원, 밤엔 돈벌이' 이중성이 캐릭터 후크. 일부 기소자 사진 공개. 중국 부인. 청부조직이라 순수 국가부대와 결은 다름
  - 출처: https://www.justice.gov/archives/opa/pr/seven-international-cyber-defendants-including-apt41-actors-charged-connection-computer
- **화잉하이타이(Huaying Haitai), 국가안전부(MSS) 톈진 연계 (APT10 (Stone Panda))** · 2009-present · 인지도 low · 팀형 · 익명
  - 클라우드 호퍼(Cloud Hopper) 작전으로 IT 위탁관리(MSP) 업체를 뚫어 전세계 고객사를 연쇄 침투, 2018년 미·영 등이 공동 비난하고 중국인 2명 기소. 중국 국가안전부(MSS) 톈진 연계
  - ⚠ 공급망(위탁관리)을 통한 연쇄 침투의 교과서 사례지만 일반 인지도 낮음. 중국 부인
  - 출처: https://www.fireeye.com/blog/threat-research/2018/12/apt10-targeting-japanese-corporations-using-updated-ttps.html
- **중국 인민해방군(PLA) 연계 그룹 (Volt Typhoon)** · 2021-present · 인지도 low · 팀형 · 익명
  - 2023~2024년 미국 통신·전력·수도·교통 등 기반시설에 장기 잠복해 유사시 파괴용 거점을 사전 확보(데이터 절취 없이 잠복), 2024년 미 CISA 긴급 경보. 인민해방군 연계로 지목
  - 🇰🇷 기반시설 사전 거점화 전술은 한국 등 동맹국 인프라에도 동일 위협으로 거론
  - ⚠ 최신·중대 사례. '파괴는 안 했지만 스위치만 누르면 되는 상태로 잠복'이라는 컨셉이 긴장감 후크. 중국 부인
  - 출처: https://en.wikipedia.org/wiki/Volt_Typhoon · https://www.cyber.nj.gov/threat-landscape/nation-state-threat-analysis-reports/china-linked-cyber-operations-targeting-us-critical-infrastructure/salt-typhoon
- **중국 국가안전부(MSS) 연계 그룹 (Salt Typhoon)** · 2022-present · 인지도 low · 팀형 · 익명
  - 2024년 AT&T·버라이즌·T모바일 등 미국 9개 통신사를 뚫고 합법 감청망까지 장악해 고위 인사 통화·문자 메타데이터 탈취. 중국 국가안전부(MSS) 연계로 지목
  - ⚠ 2024년 최대급 통신사 해킹, 수사·감청 시스템까지 뚫은 점이 충격 후크. 그룹명 자체는 대중에 생소. 중국 부인
  - 출처: https://en.wikipedia.org/wiki/Salt_Typhoon · https://www.congress.gov/crs-product/IF12798
- **북한 정찰총국(RGB) 121국 (Lazarus Group)** · 2009-present · 인지도 high · 팀형 · 익명
  - 2014년 소니픽처스 해킹(영화 '인터뷰' 보복), 2016년 방글라데시 중앙은행 SWIFT 8100만 달러 절취, 2017년 워너크라이 랜섬웨어 세계 강타, 2025년 바이비트 거래소 15억 달러 암호화폐 탈취(역대 최대 거래소 도난). 정찰총국 121국
  - 🇰🇷 북한 사이버전의 핵심 조직으로 한국 정부·금융·방송도 상시 표적. 2013년 농협·신한·방송사 마비(다크서울)와도 계보 연결
  - ⚠ 이 영역 최강 인지도. 다만 핵·미사일 자금 조달이라 범죄 미화 주의(피해자 관점 유지). 북한 부인. 후드 실루엣+불사조(Lazarus=부활) 컨셉 활용 가능
  - 출처: https://en.wikipedia.org/wiki/Lazarus_Group · https://cyberflorida.org/north-korea-responsible-for-1-5-billion-bybit-hack/
- **북한 정찰총국(RGB), 라자루스 금융 분파 (APT38 (BlueNoroff))** · 2014-present · 인지도 low · 팀형 · 익명
  - SWIFT 국제송금망 위조 송금으로 13개국 16개 은행을 공격, 방글라데시 중앙은행 강도를 직접 실행한 라자루스의 금융 전담 분파, 암호화폐 거래소·핀테크 집중 탈취
  - 🇰🇷 한국 가상자산 거래소·금융권도 표적군에 포함
  - ⚠ 라자루스의 하위 분파라 단독 구분 인지도는 낮음. '국가가 운영하는 은행강도단' 컨셉이 후크. 북한 부인
  - 출처: https://en.wikipedia.org/wiki/Lazarus_Group
- **북한 정찰총국(RGB) (Kimsuky (APT43))** · 2012-present · 인지도 low · 팀형 · 익명
  - 한국의 외교·안보·통일·대북 전문가와 연구기관·언론인을 겨눈 스피어피싱 첩보, 2014년 한국수력원자력 침해 의혹, 최근 QR코드 피싱(퀴싱) 수법 사용. 정찰총국 소속
  - 🇰🇷 한국 대북·안보 전문가와 기관·기자를 직접·집중 표적으로 삼는 대남 첩보 조직
  - ⚠ 한국 표적 관련성이 가장 직접적이라 시리즈 의미 큼. 다만 일반 대중 인지도는 낮음. 북한 부인
  - 출처: https://www.cisa.gov/news-events/cybersecurity-advisories/aa20-301a · https://www.ic3.gov/CSA/2026/260108.pdf
- **북한 정찰총국(RGB), 라자루스 분파 (Andariel (Onyx Sleet))** · 2014-present · 인지도 low · 팀형 · 익명
  - 한국 국방·방산·원전 기밀을 노린 첩보와 병원·기업 랜섬웨어로 공작 자금을 조달, 2024년 미국이 조직원(림종혁)을 수배·기소
  - 🇰🇷 한국 국방·방산·원전 등 안보 핵심 인프라를 표적으로 삼는 대남 공작 분파
  - ⚠ 라자루스 하위 분파. 한국 방산 표적이라 의미 있으나 대중 인지도 낮음. 북한 부인
  - 출처: https://thehackernews.com/2025/07/us-sanctions-north-korean-andariel.html
- **박진혁 (Park Jin Hyok) (Park Jin Hyok (박진혁))** · 2010s (2018 기소) · 인지도 low · 인물형
  - 2018년 미 FBI가 라자루스 일원으로 최초 실명 수배·기소한 북한 해커. 소니픽처스 해킹·워너크라이·방글라데시 은행 강도 사건 기소장에 실명 적시
  - 🇰🇷 북한 해킹의 익명성을 깬 첫 실명 인물. 한국 대상 공작과 같은 조직 소속
  - ⚠ 익명 집단 속 유일하게 얼굴·실명이 공개된 인물이라 '인물형' 단독 후크로 유효(FBI 수배 사진 1장 보유). 본인은 부인. 북한 부인
  - 출처: https://www.fbi.gov/wanted/cyber/park-jin-hyok · https://en.wikipedia.org/wiki/Park_Jin_Hyok
- **이란 혁명수비대(IRGC) 연계 (APT33 (Refined Kitten / Elfin))** · 2013-present · 인지도 low · 팀형 · 익명
  - 2012년 사우디 아람코를 샤문(Shamoon) 와이퍼로 공격해 PC 3만대를 파괴(중동 첫 대규모 파괴형 공격), 항공·에너지·방산 첩보. 이란 혁명수비대(IRGC) 연계로 지목
  - ⚠ 아람코 3만대 파괴는 임팩트 강하나 그룹명 자체는 생소. 이란 부인. 정치 민감(중동 분쟁)
  - 출처: https://brandefense.io/blog/apt33-apt-2025/
- **이란 혁명수비대(IRGC) 연계 (Charming Kitten (APT35 / Phosphorus))** · 2014-present · 인지도 low · 팀형 · 익명
  - 언론인·반체제 인사·연구자·미 대선 캠프를 겨눈 정교한 가짜 페르소나·가짜 인터뷰 스피어피싱(사회공학). 이란 혁명수비대(IRGC) 연계로 지목
  - ⚠ 기술보다 가짜 신분극(사회공학)이 특기라 시각화 어려움. 인지도 낮음. 이란 부인
  - 출처: https://unit42.paloaltonetworks.com/threat-brief-iranian-linked-cyber-operations/
- **이란 혁명수비대(IRGC) 연계 (CyberAv3ngers)** · 2023-present · 인지도 low · 팀형 · 익명
  - 2023년 이스라엘제 제어장치(유니트로닉스 PLC)를 노려 미국·이스라엘 상수도 시설의 산업제어장비를 공격·변조, 화면에 반이스라엘 메시지 표출. 이란 혁명수비대(IRGC) 연계로 지목
  - ⚠ 상수도 등 생활 인프라 직접 공격이라 위협 체감 큼. 최신 사례. 정치 민감(이스라엘-이란). 이란 부인
  - 출처: https://www.cyber.nj.gov/threat-landscape/nation-state-threat-analysis-reports/iran-cyber-threat-operations

### 보안 연구자·화이트햇·익스플로잇 거장 (해킹을 직업·과학으로) (16)

- **Peiter Zatko (Mudge)** · 1990s-2020s · 인지도 low · 인물형
  - 1998년 미 상원 청문회에서 L0pht 동료들과 '우리 일곱이면 30분 안에 인터넷을 마비시킬 수 있다'고 증언. 해커집단 cDc·해킹랩 L0pht 출신으로 이후 DARPA·구글·스트라이프 보안을 거쳐 2022년 트위터 보안 내부고발.
  - 출처: https://en.wikipedia.org/wiki/Peiter_Zatko
- **H. D. Moore (HD Moore)** · 2000s-present · 인지도 low · 인물형
  - 2003년 침투 테스트 프레임워크 Metasploit를 만들어 공개. 익스플로잇을 누구나 모듈처럼 끼워 쓰는 표준 도구로 바꿔 공격·방어 양쪽의 산업 표준이 됨.
  - 출처: https://en.wikipedia.org/wiki/Metasploit_Project · https://en.wikipedia.org/wiki/HD_Moore
- **Dan Kaminsky (Dan Kaminsky)** · 2000s-2021 · 인지도 low · 인물형
  - 2008년 DNS 캐시 포이즈닝 치명 결함 발견. 공개 전 마이크로소프트·BIND 등 전 세계 벤더와 비밀 공조해 인터넷 DNS를 동시 패치. 2021년 당뇨 합병증으로 42세 요절, 인터넷 명예의 전당 헌액.
  - ⚠ 2021년 지병으로 사망(자연사). 추모 톤 권장, 죽음 자극적 활용 금지.
  - 출처: https://en.wikipedia.org/wiki/Dan_Kaminsky · https://www.internethalloffame.org/inductee/dan-kaminsky/
- **Charlie Miller, Chris Valasek (Charlie Miller & Chris Valasek)** · 2010s · 인지도 medium · 팀형
  - 2015년 주행 중인 지프 체로키를 인터넷으로 원격 장악해 엔진·브레이크·핸들을 무력화하는 시연. Wired 기자가 고속도로에서 차가 멎는 영상이 퍼져 140만 대 리콜. 밀러는 2007년 첫 아이폰 원격 해킹·2009년 SMS 공격도 시연.
  - 출처: https://en.wikipedia.org/wiki/Charlie_Miller_(security_researcher) · https://www.wired.com/2015/07/hackers-remotely-kill-jeep-highway/
- **Barnaby Michael Douglas Jack (Barnaby Jack)** · 2000s-2013 · 인지도 low · 인물형
  - 2010년 블랙햇 무대에서 ATM 두 대를 원격·물리 공격으로 현금을 토하게 만든 'ATM 잭팟' 시연. 이후 인슐린 펌프·심박조율기를 무선 해킹해 300피트 밖에서 치명적 전기충격을 보내는 실험 공개. 2013년 심장 임플란트 해킹 발표 직전 36세로 사망.
  - ⚠ 2013년 약물 과용으로 사망. 사인 미화 금지. 의료기기 '암살 시연' 소재는 자극적이라 신중히.
  - 출처: https://en.wikipedia.org/wiki/Barnaby_Jack
- **Marcus Hutchins (MalwareTech (Marcus Hutchins))** · 2010s-present · 인지도 medium · 인물형
  - 2017년 전 세계를 휩쓴 WannaCry 랜섬웨어를 분석하다 코드 속 미등록 도메인을 발견·등록해 확산을 멈춤(킬스위치). 영웅이 된 직후 과거 Kronos 뱅킹 멀웨어 제작 혐의로 FBI에 체포돼 유죄 인정.
  - ⚠ WannaCry 영웅이나 10대 시절 Kronos 뱅킹 멀웨어를 만든 과거로 FBI 체포·유죄 인정. 단순 영웅서사로 그리면 사실 왜곡. 흑→백 양면 명시 필요.
  - 출처: https://en.wikipedia.org/wiki/Marcus_Hutchins
- **Joanna Rutkowska (Joanna Rutkowska)** · 2000s-present · 인지도 low · 인물형
  - 2006년 블랙햇에서 OS 몰래 가상화 계층에 숨는 루트킷 'Blue Pill'을 공개해 '탐지 불가능 악성코드' 논쟁을 촉발. 이후 철저한 격리 구조의 보안 운영체제 Qubes OS를 창시.
  - 출처: https://en.wikipedia.org/wiki/Joanna_Rutkowska · https://en.wikipedia.org/wiki/Qubes_OS
- **Katie Moussouris (Katie Moussouris)** · 2000s-present · 인지도 low · 인물형
  - 마이크로소프트 최초의 버그바운티·취약점 연구 프로그램을 설계. 2016년 미 국방부 'Hack the Pentagon'(연방정부 첫 버그바운티)을 성사시켜 138건 결함 해결. 취약점 공개 국제표준 ISO 29147·30111 공동 저자.
  - 출처: https://en.wikipedia.org/wiki/Katie_Moussouris
- **George Hotz (geohot (George Hotz))** · 2000s-present · 인지도 medium · 인물형
  - 2007년 17세에 세계 최초로 아이폰 SIM 잠금을 해제. 2010년 PS3를 해킹하고 2011년 루트키를 공개해 소니에 피소·합의. 이후 자율주행 comma.ai 창업, 2022년 트위터 단기 인턴.
  - ⚠ PS3 키 공개로 소니의 DMCA 소송, 합의로 종결(탈옥은 법적 회색지대). 본인 발언·행보가 논쟁적이라 미화 주의.
  - 출처: https://en.wikipedia.org/wiki/George_Hotz · https://en.wikipedia.org/wiki/Sony_Computer_Entertainment_America,_Inc._v._Hotz
- **Jann Horn (Jann Horn)** · 2010s-present · 인지도 low · 인물형
  - 2017년 구글 프로젝트 제로 소속으로, 인텔·ARM CPU의 투기적 실행 결함 Spectre·Meltdown을 (다른 팀과 독립적으로) 사실상 단독 발견. 거의 모든 현대 프로세서를 뒤흔든 세기의 칩 결함.
  - ⚠ 노출을 꺼리는 인물이라 공개 사진이 드묾. 후드 실루엣·코드 화면 등 익명형 연출이 어울림.
  - 출처: https://en.wikipedia.org/wiki/Project_Zero · https://fortune.com/2018/01/17/jann-horn-big-chip-flaw-discovery/
- **Jung Hoon Lee (이정훈) (lokihardt (Jung Hoon Lee))** · 2010s-present · 인지도 low · 인물형
  - 2015년 Pwn2Own에서 크롬·IE11·사파리를 연달아 뚫어 단일 시연 최고액 11만 달러, 총 22만5천 달러를 획득(당시 사상 최대 상금). 한국을 대표하는 익스플로잇 챔피언.
  - 🇰🇷 한국인 화이트햇. 국내 보안 인재가 세계 정상에 오른 사례로, 한국 시청자 자긍심을 자극하는 진영의 얼굴마담으로 활용 가치 높음.
  - 출처: https://en.wikipedia.org/wiki/Pwn2Own · https://thehackernews.com/2015/03/browser-hacked-pwn2own.html
- **Karsten Nohl (Karsten Nohl)** · 2000s-present · 인지도 low · 인물형
  - 2009년 GSM 암호 A5/1 해독, 2013년 DES SIM 카드 원격 탈취 시연. 2016년 미 CBS '60분'에서 전화번호 하나로 SS7 통신망 결함을 이용해 현직 미 하원의원의 통화·문자·위치를 생중계로 도청.
  - 출처: https://en.wikipedia.org/wiki/Karsten_Nohl
- **Joe Grand (Kingpin (Joe Grand))** · 1990s-present · 인지도 low · 인물형
  - 전설적 해커랩 L0pht 멤버 출신 하드웨어 역공학 거장. 2022년 PIN을 잊은 주인의 Trezor 지갑을 전압 글리치 공격으로 뚫어 200만 달러 비트코인을 복구한 영상이 유튜브에서 화제.
  - 출처: https://en.wikipedia.org/wiki/Joe_Grand
- **Samy Kamkar (Samy Kamkar)** · 2000s-present · 인지도 low · 인물형
  - 2005년 마이스페이스에 작은 코드로 20시간 만에 100만 명을 감염시킨 사상 최速 웜 'Samy' 제작(비밀경호국 수사·중범죄 인정). 화이트햇 전향 후 드론 탈취 SkyJack, 차량 무선키 복제 장치, Evercookie 등을 시연.
  - ⚠ MySpace 웜으로 비밀경호국 수사·중범죄 유죄 인정 후 화이트햇으로 전향. 흑→백 전환 서사이므로 과거를 숨기지 말 것.
  - 출처: https://en.wikipedia.org/wiki/Samy_Kamkar · https://en.wikipedia.org/wiki/Samy_(computer_worm)
- **Ian Beer (Ian Beer)** · 2010s-present · 인지도 low · 인물형
  - 구글 프로젝트 제로의 아이폰 익스플로잇 대가. 2020년 손도 대지 않고 와이파이 전파만으로 주변 아이폰을 완전 장악하는 무클릭 원격 익스플로잇(AWDL, CVE-2020-3843)을 100달러 라즈베리파이로 시연·공개.
  - ⚠ 공개 사진이 적은 저노출 인물. 코드·전파 시각화 연출이 어울림.
  - 출처: https://projectzero.google/2020/12/an-ios-zero-click-radio-proximity.html
- **Chaouki Bekrar (Chaouki Bekrar)** · 2000s-present · 인지도 low · 인물형
  - 프랑스 VUPEN 창업자로 2011~2014 Pwn2Own에서 크롬·IE·파이어폭스를 연속 제패. 이후 제로데이 거래소 Zerodium을 세워 iOS 무클릭 익스플로잇에 250만 달러 등 사상 최고가 현상금을 내건 '제로데이의 상인'.
  - ⚠ 정부·정보기관에 제로데이를 판매하는 회색지대 인물. 순수 화이트햇과 구분 필요. '거장'으로 다루되 윤리 논쟁을 명시해 미화로 보이지 않게.
  - 출처: https://en.wikipedia.org/wiki/Vupen · https://thehackernews.com/search/label/Vupen

### 리버스 엔지니어링·탈옥·크래킹 씬 ("잠긴 것을 여는 자") (15)

- **George Hotz (George Hotz (geohot))** · 2007-present · 인지도 medium · 인물형
  - 2007년 17세에 세계 최초로 아이폰 SIM 잠금을 풀었고, 2010년 PS3 보안을 뚫어 루트키를 공개해 소니에 피소·합의했다. 이후 자율주행 comma.ai 창업.
  - ⚠ PS3 루트키 공개로 소니에 피소돼 소니 제품 해킹 영구금지 조건으로 합의. 합법 보안연구로 포장하지 말 것. 이 영역에서 한국 대중 인지도가 가장 높은 인물.
  - 출처: https://en.wikipedia.org/wiki/George_Hotz · https://www.theregister.com/2003/01/07/dvd_jon_is_free_official/
- **Jon Lech Johansen (Jon Lech Johansen (DVD Jon))** · 1999-2000s · 인지도 low · 인물형
  - 1999년 15세에 DVD 복제방지(CSS)를 깨는 DeCSS를 공개했고, 노르웨이 경제범죄수사청에 기소됐으나 2003년 최종 무죄 확정.
  - ⚠ 복제방지 우회·DMCA 논쟁의 상징. 노르웨이에선 무죄였으나 미국 기준 위법 소지. 저작권 우회 자체를 영웅화하면 미화 논란.
  - 출처: https://en.wikipedia.org/wiki/Jon_Lech_Johansen · https://en.wikipedia.org/wiki/DeCSS
- **Nicholas Allegra (Comex (Nicholas Allegra))** · 2010-2011 · 인지도 low · 인물형
  - 2010~2011년 웹사이트 접속만으로 아이폰을 탈옥시키는 JailbreakMe를 PDF 취약점으로 구현했고(손가락 한 번에 탈옥), 이후 애플 인턴으로 채용됐다.
  - ⚠ 탈옥은 회색지대지만 본인은 애플 등 정규 보안업계로 전향. 범죄자 프레임 금지.
  - 출처: https://www.macrumors.com/2012/10/19/nicholas-allegra-the-hacker-behind-jailbreakme-com-no-longer-working-at-apple/
- **Luca Todesco (Luca Todesco (qwertyoruiopz))** · 2014-2017 · 인지도 low · 인물형
  - 2016년 iOS 10용 yalu 탈옥을 공개했고, 부트롬 기반 checkra1n 탈옥 개발에도 참여한 이탈리아 해커.
  - ⚠ 이후 스파이웨어 업체 NSO Group을 연상시키는 트위터 핸들 사용 등 논란. 핸들·NSO 연계 표기 주의.
  - 출처: https://theapplewiki.com/wiki/User:Qwertyoruiop · https://www.theiphonewiki.com/wiki/Yalu
- **axi0mX** · 2019 · 인지도 low · 인물형 · 익명
  - 2019년 A5~A11 칩 아이폰(아이폰4S~X)의 부트롬을 뚫는 패치 불가 익스플로잇 checkm8을 공개했다. 읽기전용 부트롬 결함이라 소프트웨어로 막을 수 없음.
  - ⚠ 익명 인물(실명 비공개) → 핸들·후드 실루엣으로 연출. checkm8는 포렌식·탈옥 양면 도구이므로 범죄도구로 단정 금지.
  - 출처: https://cyberscoop.com/iphone-jailbreak-checkm8/ · https://www.securityweek.com/unpatchable-ios-bootrom-exploit-allows-jailbreaking-many-iphones/
- **Pangu Team (盘古越狱团队)** · 2014-present · 인지도 low · 팀형
  - 2014년부터 iOS 7~12 탈옥 도구 Pangu를 잇따라 공개했고, 톈푸컵·PwnFest 등 해킹 대회에서 아이폰을 원격으로 뚫은 중국 대표 화이트햇 팀.
  - ⚠ 치안신(Qi An Xin) 소속·i-SOON 익스플로잇 공유망 연계 의혹 등 국가연계 논란 보고됨. 백해커지만 국가정보 활용 가능성을 병기해야 균형.
  - 출처: https://en.wikipedia.org/wiki/Pangu_Team · https://www.nattothoughts.com/p/the-pangu-teamios-jailbreak-and-vulnerability
- **evad3rs (pod2g·MuscleNerd·planetbeing·pimskeks)** · 2013-2014 · 인지도 low · 팀형
  - 2013년 iOS 6용 첫 미구속(untethered) 탈옥 evasi0n, 같은 해 말 iOS 7용 evasi0n7을 공개한 탈옥 드림팀. 프랑스 pod2g가 중심.
  - ⚠ evasi0n7에 중국 해적 앱스토어 TaiG를 번들해 신뢰 타격. 광고·해적앱 번들 사건 병기 필요.
  - 출처: https://www.theiphonewiki.com/wiki/Evad3rs · https://www.idownloadblog.com/2013/01/24/new-jailbreak-crew-evad3rs/
- **fail0verflow** · 2010-present · 인지도 low · 팀형
  - 2010년 27C3에서 PS3의 ECDSA 서명 난수 고정 결함('Epic Fail')을 폭로해 루트키를 복원했고, 이후 닌텐도 스위치 부트롬까지 뚫었다. 멤버에 marcan(Hector Martin)·bushing 등.
  - ⚠ 소니에 피소(자진 취하). 저작권 우회 논쟁. 멤버 marcan은 현재 Apple Silicon용 Asahi Linux로 전향, bushing(Ben Byer)은 2018년 사망.
  - 출처: https://grokipedia.com/page/Hector_Martin_(hacker) · https://fahrplan.events.ccc.de/congress/2010/Fahrplan/attachments/1780_27c3_console_hacking_2010.pdf
- **Gary Bowser (Gary Bowser (Team Xecuter))** · 2010s-2020 · 인지도 low · 인물형
  - 닌텐도 스위치 등 콘솔 복제용 모드칩(SX OS 등)을 제작·판매한 Team Xecuter 핵심 인물로, 2020년 도미니카공화국에서 체포돼 2022년 징역 40개월을 선고받고 닌텐도에 거액 배상 의무를 졌다.
  - ⚠ 실제 수감·파산한 인물. 단순 영웅화 금지, 닌텐도 피해와 본인이 치른 대가(수감·평생 수입 일부 변제)를 반드시 병기. 비극적 '인간 비용' 서사로 활용 가능.
  - 출처: https://en.wikipedia.org/wiki/Team_Xecuter · https://www.videogameschronicle.com/news/switch-hacker-gary-bowser-released-from-jail-will-pay-nintendo-25-30-income-for-the-rest-of-his-life/
- **Christopher Tarnovsky (Chris Tarnovsky ("Big Gun"))** · 1990s-2010s · 인지도 low · 인물형
  - DirecTV 등 위성방송 스마트카드를 산(酸)으로 칩을 녹이고 미세 탐침을 꽂아 역설계해 무력화했고, 이후 칩 보안업체 Flylogic을 세워 데프콘에서 실리콘 해킹을 시연했다.
  - ⚠ 유료 위성방송 무단시청을 가능케 한 상업적 해적행위. NDS(머독 산하)와의 분쟁 등 법적 회색지대. 군 출신·NSA 위성암호 경력은 별개 맥락이라 혼동 주의.
  - 출처: https://en.wikipedia.org/wiki/Christopher_Tarnovsky · https://hackaday.com/2008/05/31/silicon-hacking/
- **Dmitry Sklyarov (Dmitry Sklyarov)** · 2001-2002 · 인지도 low · 인물형
  - ElcomSoft에서 어도비 전자책 DRM을 푸는 도구(Advanced eBook Processor)를 만들어, 2001년 데프콘 발표 직후 DMCA 위반 첫 형사 기소로 FBI에 체포됐다(2002년 무죄 평결).
  - ⚠ 러시아에선 합법이던 행위로 미국에서 체포된 DMCA 첫 형사기소 상징. 표현의 자유 대 저작권 대립 소재로, 단죄가 아닌 제도 논쟁 맥락으로 다룰 것.
  - 출처: https://en.wikipedia.org/wiki/United_States_v._Elcom_Ltd. · https://www.eff.org/cases/us-v-elcomsoft-sklyarov
- **Andrew Huang (Andrew "bunnie" Huang)** · 2002-present · 인지도 low · 인물형
  - 2002년 마이크로소프트 Xbox의 보안 버스를 하드웨어 역설계로 도청해 암호화 키를 뽑아냈고, MIT 압박 속에 'Hacking the Xbox' 책을 출간해 소비자 기기 역공학의 교본을 남겼다.
  - ⚠ MS의 법적 압박을 받았으나 연구·교육 성격이 강해 비교적 안전한 소재. MIT PhD·오픈하드웨어 옹호자로 합법 진영에 가깝게 묘사 가능.
  - 출처: https://en.wikipedia.org/wiki/Andrew_Huang_(hacker) · https://bunniefoo.com/nostarch/HackingTheXbox_Free.pdf
- **EMPRESS** · 2020-2021 · 인지도 low · 인물형 · 익명
  - 2020~2021년 고난도 Denuvo 보호 게임 크랙의 절반 이상을 단독으로 풀어낸 익명 크래커. 크라우드펀딩으로 깰 게임을 투표받는 방식과 잦은 설전으로 화제가 됐다.
  - ⚠ 명백한 불법복제. 자칭 러시아 여성이나 신원 불명, Voksi 동일인설 등 미확인 루머. '체포됐다'는 주장도 본인 발언이라 검증 불가. 익명 → 왕관 엠블럼·실루엣으로 연출.
  - 출처: https://en.wikipedia.org/wiki/Empress_(cracker) · https://torrentfreak.com/denuvo-cracker-empress-arrested-blames-repacker-fitgirl-reddit-for-witch-hunt-210224/
- **宿菲菲 (Su Feifei) (3DM (不死鸟 / 宿菲菲))** · 2004-2016 · 인지도 low · 팀형
  - 중국 최대 게임 크랙·한화(漢化) 사이트 3DM을 운영하며 Denuvo 적용 게임(드래곤 에이지·삼국지13 등)을 깼고, 2016년 코에이 측 법적 압박으로 단독게임 크랙 중단을 선언했다.
  - ⚠ 중국 내 대규모 게임 불법복제. 운영자 宿菲菲(불사조/鸟姐)는 청화대 출신 여성으로 방송도 진행하나, 미화 주의. 법적 압박으로 사실상 사업 전환.
  - 출처: https://zh.moegirl.org.cn/3DM · https://www.ifanr.com/1123020
- **Razor 1911 (RZR)** · 1985-present · 인지도 low · 팀형 · 익명
  - 1985년 노르웨이에서 결성된 현존 최고(最古)의 소프트웨어 크랙 그룹. C64·아미가·PC를 거치며 수많은 게임 복제방지를 뚫고 크랙트로(인트로)를 남겨 데모씬의 뿌리가 됐다.
  - ⚠ 소프트웨어 불법복제 그룹. 미 법무부가 '현존 최고(最古)'로 지목한 단속 대상. 멤버 다수 익명 → 로고·크랙트로 인트로 영상미로 연출. 미화 주의.
  - 출처: https://en.wikipedia.org/wiki/Razor_1911 · https://en.wikipedia.org/wiki/List_of_warez_groups

### 사이버크라임·랜섬웨어 신디케이트(현대 조직범죄형) (15)

- **드미트리 호로셰프(Dmitry Khoroshev), 운영자 핸들 'LockBitSupp' (LockBit (락빗))** · 2019-2024 · 인지도 medium · 팀형
  - 역대 최대 RaaS(서비스형 랜섬웨어). 2,500여 피해 기관·약 5억 달러 갈취. 2024년 2월 영국 NCA·FBI '오퍼레이션 크로노스'로 서버·다크웹 사이트 압수, 5월 운영자 호로셰프 신원 공개 및 미 국무부 1천만 달러 현상금
  - 🇰🇷 국내 보안업계에서 가장 빈번히 거론된 랜섬웨어 브랜드. 한국 기업·기관 피해 사례도 여러 차례 보도
  - ⚠ 범죄 조직. 현상수배·거리두기 프레임 필수. 운영자 호로셰프는 러시아 거주로 미체포. 미화 금지
  - 출처: https://en.wikipedia.org/wiki/LockBit · https://www.nationalcrimeagency.gov.uk/news/lockbit-leader-unmasked-and-sanctioned · https://thehackernews.com/2024/05/russian-hacker-dmitry-khoroshev.html
- **Conti (콘티)** · 2020-2022 · 인지도 low · 팀형 · 익명
  - 2022년 4~5월 코스타리카 정부 30여 기관 마비, 대통령이 국가비상사태 선포(랜섬웨어로 인한 사상 첫 국가 비상사태). 의료기관·아일랜드 보건당국(HSE) 공격. 우크라이나 전쟁 지지 표명 후 내부 채팅 대량 유출('Conti Leaks')로 와해, Royal·Black Basta 등으로 분화
  - ⚠ 익명 러시아어권 조직 → 엠블럼·해골로 표현. 미체포. 친러 정치 색채(정치 민감). 미화 금지
  - 출처: https://en.wikipedia.org/wiki/2022_Costa_Rican_ransomware_attack · https://www.bleepingcomputer.com/news/security/how-conti-ransomware-hacked-and-encrypted-the-costa-rican-government/
- **야로슬라우 바신스키(Yaroslav Vasinskyi) 등 일부 기소 (REvil / Sodinokibi (레빌))** · 2019-2022 · 인지도 low · 팀형
  - 2021년 7월 Kaseya 공급망 공격으로 1,500여 기업 연쇄 감염·7천만 달러 요구. 같은 해 세계 최대 정육업체 JBS서 1,100만 달러 갈취. 2022년 1월 러시아 FSB가 14명 체포·426백만 루블 등 압수
  - ⚠ 익명 조직 → 엠블럼. 일부만 체포·기소. 러시아 묵인 의혹(정치 민감). 미화 금지
  - 출처: https://en.wikipedia.org/wiki/REvil · https://www.justice.gov/archives/opa/pr/ukrainian-arrested-and-charged-ransomware-attack-kaseya
- **DarkSide (다크사이드)** · 2020-2021 · 인지도 medium · 팀형 · 익명
  - 2021년 5월 콜로니얼 파이프라인 공격으로 미 동부 연료 공급 마비·주유 대란, 바이든 국가비상사태 선포. 75비트코인(약 440만 달러) 갈취, FBI가 약 84% 회수. 이후 BlackMatter로 리브랜딩
  - ⚠ 익명 조직 → 엠블럼. 미체포. 핵심 기반시설 공격이라 미화 절대 금지, 피해 규모 중심 서술
  - 출처: https://en.wikipedia.org/wiki/Colonial_Pipeline_ransomware_attack · https://www.chainalysis.com/blog/darkside-colonial-pipeline-ransomware-seizure-case-study/
- **막심 야쿠베츠(Maksim Yakubets) (막심 야쿠베츠 (Evil Corp 'Aqua'))** · 2007-present(수배중) · 인지도 low · 인물형
  - Zeus·Dridex 뱅킹 트로이목마로 40여국서 1억 달러 이상 탈취한 Evil Corp(=Indrik Spider) 수괴. 'EVIL CORP' 번호판 람보르기니로 화제. 2019년 미 재무부 제재와 함께 사상 최고액 500만 달러 현상금. FSB 연계 의혹
  - ⚠ 러시아 거주·미체포, 정보기관 연계 의혹(정치 민감). 현상수배 포스터 프레임. 사치 과시를 동경 아닌 범죄수익으로 명시
  - 출처: https://grokipedia.com/page/Maksim_Yakubets · https://threatpost.com/feds-5m-reward-evil-corp-dridex-hacker/150858/ · https://socradar.io/blog/dark-web-profile-evil-corp/
- **예브게니 보가체프(Evgeniy Bogachev) (예브게니 보가체프 (GameOver Zeus 'slavik'))** · 2011-present(수배중) · 인지도 low · 인물형
  - GameOver Zeus 봇넷으로 100만대 이상 감염·1억 달러 이상 피해. CryptoLocker 랜섬웨어 배포. FBI 사이버 최고수배 등재, 사이버 범죄 사상 최고액 300만 달러 현상금. 러시아 도피
  - ⚠ 러시아 도피·미체포. 러 정보당국 정보수집 활용 의혹(정치 민감). 현상수배 포스터 프레임. 미화 금지
  - 출처: https://www.justice.gov/archives/opa/pr/reward-announced-cyber-fugitive · https://en.wikipedia.org/wiki/Gameover_ZeuS
- **미하일 마트베예프(Mikhail Pavlovich Matveev) (Wazawaka (미하일 마트베예프))** · 2020-2023(수배), 2024 러 기소 · 인지도 low · 인물형
  - Babuk·LockBit·Hive 가담 핵심 제휴사. 2021년 워싱턴DC 경찰국(MPD) 해킹. 4억 달러 이상 요구·2억 달러 갈취 추정. 미 국무부 1천만 달러 현상금. 도발적 셀프 인터뷰·자기 과시로 화제. 2024년 러시아 자국 기소
  - ⚠ 러시아 거주·미국 미인도. 본인 셀카 다수 공개. 도발 캐릭터를 매력화하지 말고 수배 대상으로 제시. 미화 금지
  - 출처: https://www.fbi.gov/wanted/cyber/mikhail-pavlovich-matveev · https://www.state.gov/mikhail-pavlovich-matveev · https://therecord.media/wazawaka-cyber-most-wanted-interview-click-here
- **페디르 흘라디르(Fedir Hladyr) 등 우크라이나인 다수 기소 (Carbanak / FIN7 (Cobalt))** · 2013-present · 인지도 low · 팀형
  - 전세계 은행 100여 곳에서 10억 유로 이상 절도(ATM 강제 출금·SWIFT 송금 조작). 위장 보안업체 'Combi Security'로 조직원 모집. 미 전역 3,600개 매장 POS에서 2천만 건 이상 카드정보 탈취. 우크라이나인 3명 체포, 간부 10년형
  - ⚠ 일부 체포·실형, 다수 미검거. 위장 회사로 합법 가장한 점이 핵심. 미화 금지
  - 출처: https://en.wikipedia.org/wiki/Carbanak · https://www.justice.gov/usao-wdwa/pr/high-level-organizer-notorious-hacking-group-fin7-sentenced-ten-years-prison-scheme · https://www.fbi.gov/contact-us/field-offices/seattle/news/stories/how-cyber-crime-group-fin7-attacked-and-stole-data-from-hundreds-of-us-companies
- **노아 어반(Noah Urban, 'King Bob') 등 영미권 10·20대 (Scattered Spider (UNC3944 / Oktapus))** · 2022-present · 인지도 medium · 팀형
  - 2023년 MGM·시저스 카지노 마비(MGM 1억 달러 손실, 시저스 1,500만 달러 몸값 지불). 헬프데스크에 직원 사칭 전화로 침투·다중인증 우회. SIM 스와핑 병행. 2024년 11월 5명 기소, 노아 어반 10년형·1,300만 달러 배상
  - ⚠ 미성년 가담자 포함, 신원 일부만 공개. 러시아계 아닌 영미권 청소년이라 거리두기 프레임 더 중요. 미화·영웅화 금지
  - 출처: https://en.wikipedia.org/wiki/Scattered_Spider · https://www.axios.com/2024/11/20/scattered-spider-us-arrests · https://krebsonsecurity.com/2025/08/sim-swapper-scattered-spider-hacker-gets-10-years/
- **율리우스 키비매키(Julius Kivimäki 'zeekill'), 재커리 부흐타(Zachary Buchta) 등 (Lizard Squad (리저드 스쿼드))** · 2014-2016 · 인지도 low · 팀형
  - 2014년 크리스마스 PSN·Xbox Live 동시 다운, 수백만 게이머 명절 마비. DDoS 대행 서비스 'LizardStresser' 판매. 키비매키 5만여 건 컴퓨터 범죄 유죄(2015)
  - ⚠ 당시 10대 위주. 관심끌기용 과시 범죄로 명시, 장난·치기로 미화 금지. 일부 실형
  - 출처: https://en.wikipedia.org/wiki/Lizard_Squad · https://krebsonsecurity.com/2014/12/cowards-attack-sony-playstation-microsoft-xbox-networks/comment-page-1/
- **BlackCat / ALPHV (알파브이)** · 2021-2024 · 인지도 low · 팀형 · 익명
  - 2024년 Change Healthcare 공격으로 미국민 약 1억 명 의료·금융정보 유출, 2,200만 달러 몸값 지불. Rust 언어로 작성된 첫 주요 랜섬웨어. FBI 압수 직후 부활했다가 제휴사 몫을 떼먹고 '엑시트 스캠'으로 잠적
  - ⚠ 익명 조직 → 검은 고양이 엠블럼. 제휴사까지 등쳐먹은 배신 서사가 거리두기 포인트. 미체포. 미화 금지
  - 출처: https://krebsonsecurity.com/2024/03/blackcat-ransomware-group-implodes-after-apparent-22m-ransom-payment-by-change-healthcare/ · https://thehackernews.com/2024/03/exit-scam-blackcat-ransomware-group.html
- **2021년 우크라이나서 일부 체포 (Cl0p / Clop (TA505))** · 2019-present · 인지도 low · 팀형
  - 2023년 MOVEit 파일전송 솔루션 제로데이(CVE-2023-34362) 대량 악용으로 전세계 8천여 기관(미국 3천+) 연쇄 데이터 유출. 앞서 Accellion·GoAnywhere도 같은 수법. '공급망 대량 갈취'의 대명사
  - ⚠ 익명 러시아어권 조직 → 엠블럼. 일부 체포, 핵심 미검거. 미화 금지
  - 출처: https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-158a · https://www.kroll.com/en/publications/cyber/clop-ransomware-moveit-transfer-vulnerability-cve-2023-34362
- **Maze (메이즈)** · 2019-2020 · 인지도 low · 팀형 · 익명
  - 2019년 '이중 갈취(데이터 탈취+암호화+공개 협박)' 기법을 처음 도입해 현대 랜섬웨어 표준을 만든 선구 조직. 전용 유출 사이트로 피해자 압박. 타 조직을 끌어모은 '메이즈 카르텔' 결성. 2020년 11월 은퇴 선언
  - ⚠ 익명 조직 → 엠블럼. '원조' 서사로 다루되 기법 혁신을 칭송 아닌 피해 확산 기점으로 서술. 미화 금지
  - 출처: https://research.checkpoint.com/2020/ransomware-evolved-double-extortion/ · https://therecord.media/maze-egregor-ransomware-cartel-estimated-to-have-made-75-million
- **Hive (하이브)** · 2021-2023 · 인지도 low · 팀형 · 익명
  - 80여국 1,500여 피해자에게서 1억 달러 이상 갈취. 2022~23년 FBI가 약 7개월간 서버에 잠입해 복호화키 1천여 개를 피해자에게 몰래 전달(1.3억 달러 지불 차단)한 뒤 2023년 1월 인프라 전격 압수
  - ⚠ 익명 조직 → 벌집 엠블럼. 'FBI가 해커를 거꾸로 해킹'한 반전이 거리두기 포인트. 미화 금지
  - 출처: https://en.wikipedia.org/wiki/Hive_(ransomware) · https://therecord.media/hive-ransomware-decryptors-fbi-bryan-smith-interview-click-here
- **Qilin (麒麟·킬린, 옛 Agenda)** · 2022-present · 인지도 low · 팀형 · 익명
  - 2024년 6월 영국 NHS 검사업체 Synnovis 공격으로 런던 병원 혈액검사 마비·O형 혈액 부족 사태. 수술 1,700여 건·외래 1만 건 취소, 환자 사망 1건과 연관. 5천만 달러 요구·400GB 환자정보 공개
  - ⚠ 익명 러시아어권 조직, 麒麟 엠블럼. 환자 사망 연관 의료 인프라 공격이라 미화 절대 금지, 인명 피해 중심 서술
  - 출처: https://hackread.com/qilin-ransomware-attack-nhs-causes-patient-death-uk/ · https://www.bleepingcomputer.com/news/security/synnovis-notifies-of-data-breach-after-2024-ransomware-attack/

### 해킹 도구·프라이버시 인프라 제작자 (무기 대장장이) (20)

- **Roger Dingledine, Nick Mathewson (Tor 창립 듀오 (Roger Dingledine · Nick Mathewson))** · 2002-present · 인지도 medium · 팀형
  - 2002년 9월 양파 라우팅 익명망 Tor 알파 공개, 2006년 Tor Project 비영리 설립. 미 해군연구소의 onion routing을 시민·언론인용 검열우회·익명망으로 전환
  - 🇰🇷 한국 다크웹 마약·아동성착취물 사건(웰컴투비디오 등) 보도에서 토르가 자주 언급되어 '토르=다크웹' 인지 존재
  - ⚠ 다크웹 범죄 악용 이미지가 강함. 영상에선 검열국가 언론인·활동가 보호라는 정당 용도로 프레임 필요. 미군 기원·미 정부 자금 지원 논쟁도 있음
  - 출처: https://www.torproject.org/about/history/ · https://en.wikipedia.org/wiki/Tor_(network) · https://en.wikipedia.org/wiki/Nick_Mathewson
- **Jacob Appelbaum (Jacob Appelbaum)** · 2008-2016 · 인지도 low · 인물형
  - Tor 대표 전도사이자 위키리크스 협력자, 2013년 슈피겔에서 스노든 NSA 문서 보도 참여. 2016년 성추문 의혹으로 Tor 사임
  - ⚠ 2016년 성추문·성폭력 의혹으로 Tor·CCC·죽은소의교단 등에서 전면 퇴출. 영웅화는 평판 리스크가 매우 큼. 사실상 출연 제외 권고
  - 출처: https://en.wikipedia.org/wiki/Jacob_Appelbaum · https://techcrunch.com/2016/06/04/tor-project-developer-steps-down-amid-sexual-mistreatment-allegations/
- **Matthew Rosenfeld (Moxie Marlinspike)** · 2010-present · 인지도 medium · 인물형
  - 2010년 Whisper Systems 창업(TextSecure·RedPhone), Signal 프로토콜 공동설계(WhatsApp·메신저 등 10억+ 적용), Signal 초대 CEO. 2017년 Levchin Prize
  - 🇰🇷 텔레그램 검열·압수수색 논란 때 '시그널로 갈아탄다'며 한국 뉴스에 대안 메신저로 자주 등장
  - ⚠ 본명 대신 핸들 사용 선호. 도레드락·요트 항해 '사이퍼펑크 해적' 이미지로 무대사 영상에 매우 적합. 암호 메신저가 범죄에 악용된다는 수사기관 비판은 존재
  - 출처: https://en.wikipedia.org/wiki/Moxie_Marlinspike · https://www.mexc.com/en-GB/news/moxie-marlinspike-the-cypherpunk-pirate-who-built-signal/115798
- **Gordon Lyon (Gordon Lyon 'Fyodor')** · 1997-present · 인지도 low · 인물형
  - 1997년 포트 스캐너 Nmap 공개. 2003년 영화 매트릭스2에서 트리니티가 Nmap으로 발전소 시스템에 침투하는 장면으로 대중에 각인
  - ⚠ 핸들은 도스토옙스키에서 따옴. 스캐닝은 침투 정찰의 첫 단계라 합법/불법 경계. 매트릭스 장면으로 대중적 후크 확보 가능
  - 출처: https://en.wikipedia.org/wiki/Nmap · https://insecure.org/fyodor/
- **Mati Aharoni (Mati Aharoni 'muts')** · 2004-2019 · 인지도 low · 인물형
  - Whoppix→BackTrack를 거쳐 2013년 3월 침투테스트 배포판 Kali Linux 공개. Offensive Security 창업·OSCP 자격증 창설
  - ⚠ Kali는 힌두 여신에서 딴 이름, 용 로고가 강렬한 상징. 공격 도구 모음이라 범죄 악용 우려 → 합법 침투테스트 직업·OSCP 교육 측면 강조
  - 출처: https://en.wikipedia.org/wiki/Kali_Linux · https://threatpicture.com/people/mati-aharoni/
- **Gerald Combs (Gerald Combs)** · 1998-present · 인지도 low · 인물형
  - 1998년 패킷 분석기 Ethereal 공개, 2006년 상표 문제로 Wireshark로 개명. 수천 달러짜리 상용 분석기를 무료 오픈소스로 대체해 네트워크 분석을 대중화
  - ⚠ 방어·분석 도구라 범죄 caveat는 적으나 도청 오해 가능. 인물 자체 카리스마·시각 임팩트는 약한 편(평범한 엔지니어 인상)
  - 출처: https://en.wikipedia.org/wiki/Wireshark · https://www.wireshark.org/docs/wsug_html_chunked/ChIntroHistory.html
- **H. D. Moore (HD Moore)** · 2003-present · 인지도 low · 인물형
  - 2003년 10월 침투 프레임워크 Metasploit 첫 공개(익스플로잇 11개), 2004년 Metasploit 2.0 전면 재작성. 익스플로잇 개발의 사실상 표준 플랫폼 구축
  - ⚠ 씨드의 '중복 가능' 지적대로 다른 해커 영역과 겹칠 수 있음. 익스플로잇 프레임워크라 공격성 직접적 → 합법 펜테스트 프레임 필요
  - 출처: https://en.wikipedia.org/wiki/H._D._Moore · https://www.oreilly.com/library/view/metasploit/9781593272883/pr04s03.html
- **Bruce Schneier (Bruce Schneier)** · 1993-present · 인지도 low · 인물형
  - 1993년 Blowfish, 1994년 명저 Applied Cryptography 출간, Twofish로 AES 결선 진출. '암호학의 구루'로 불리는 보안 사상가·칼럼니스트
  - ⚠ 씨드 지적대로 학술·사상가 비중이 커서 '실전 도구' 색이 옅음. 09-디지털저항군 사이퍼펑크와 톤이 겹칠 수 있음. 다만 백발·수염의 강한 초상 1장 카리스마는 우수
  - 출처: https://en.wikipedia.org/wiki/Bruce_Schneier · https://www.schneier.com/academic/blowfish/
- **Peiter Zatko (Peiter Zatko 'Mudge')** · 1990s-present · 인지도 low · 인물형
  - 1998년 L0pht 7인으로 미 상원에서 '30분 내 인터넷 마비 가능' 증언, Windows 암호크래커 L0phtCrack 개발. 2022년 트위터 보안 내부고발자로 의회 재증언
  - ⚠ 해커→정부 자문(DARPA)→내부고발자 서사가 매우 영화적. 단 트위터 내부고발은 머스크 인수전과 얽힌 정치적 민감 소재라 묘사 시 중립 유지 필요
  - 출처: https://www.washingtonpost.com/technology/2022/08/23/peiter-mudge-zatko-twitter-whistleblower/ · https://phreak.fm/signals/mudge-zatko-l0pht-to-twitter
- **Alexander Peslyak (Solar Designer)** · 1996-present · 인지도 low · 인물형
  - 1996년 암호 크래커 John the Ripper 공개. return-to-libc·최초의 일반화된 힙 오버플로 익스플로잇 기법 발표, Openwall 프로젝트 리더
  - ⚠ 'John the Ripper'라는 도구명 자체가 잭더리퍼 패러디로 강렬한 상징. 러시아 국적이라 현 지정학 맥락 민감. 본인은 비교적 사적이며 컨퍼런스 사진 위주로만 공개
  - 출처: https://en.wikipedia.org/wiki/Solar_Designer · https://openwall.info/wiki/people/solar/bio
- **Theo de Raadt (Theo de Raadt)** · 1995-present · 인지도 low · 인물형
  - 1995년 OpenBSD 창설, 1999년 OpenSSH 개발 주도. 보안 기본설정·코드 감사 철학으로 전 세계 서버 원격접속(SSH) 표준을 만듦
  - ⚠ 직설적 성격으로 오픈소스 커뮤니티 충돌 이력 다수. 방어·인프라 색이라 공격성은 낮음. 인물 시각 임팩트는 평범
  - 출처: https://en.wikipedia.org/wiki/Theo_de_Raadt · https://en.wikipedia.org/wiki/OpenSSH
- **Werner Koch (Werner Koch)** · 1997-present · 인지도 low · 인물형
  - 1997년 이메일 암호 GnuPG(GPG) 단독 개발. 2015년 ProPublica '전 세계 이메일 암호가 파산 직전인 한 사람에게 달렸다' 보도 후 후원 쇄도
  - ⚠ '세계 암호 인프라를 떠받친 무명·생활고 개발자' 서사가 무대사 영상에 강력. 시각 임팩트는 수수하나 사연이 보완. 09 사이퍼펑크와 겹칠 수 있으니 '도구 장인' 측면 강조
  - 출처: https://www.propublica.org/article/the-worlds-email-encryption-software-relies-on-one-guy-who-is-going-broke · https://en.wikipedia.org/wiki/Werner_Koch
- **Daniel Julius Bernstein (Daniel J. Bernstein 'djb')** · 1995-present · 인지도 low · 인물형
  - qmail·djbdns 개발, Curve25519·ChaCha20 암호 설계(OpenSSH·TLS 채택). 1990년대 암호 수출규제에 맞서 미 정부 상대 소송, '코드는 표현의 자유' 판결 이끔
  - ⚠ Bernstein v. United States(코드=수정헌법 1조 보호) 판결로 크립토 전쟁의 법적 영웅. 직설적·논쟁적 인물. 학술 비중 있으나 '정부와 싸운 도구 장인' 각도가 매력
  - 출처: https://en.wikipedia.org/wiki/Daniel_J._Bernstein · https://www.eff.org/cases/bernstein-v-us-dept-justice
- **John Matherly (John Matherly (Shodan))** · 2009-present · 인지도 low · 인물형
  - 2009년 DEFCON에서 인터넷 연결기기 검색엔진 Shodan 공개. 발전소·수처리장·웹캠 등 노출 기기를 드러내 '가장 무서운 검색엔진'으로 불림
  - ⚠ 이름은 게임 시스템쇼크의 악역 AI에서 따옴. 노출 기기 검색이 프라이버시·관제시스템 침해 논란 → 합법 보안 연구·관제망 점검 도구로 프레임 필요
  - 출처: https://en.wikipedia.org/wiki/Shodan_(website) · https://www.masterdc.com/blog/what-is-shodan-search-engine/
- **Darren Kitchen (Darren Kitchen (Hak5))** · 2005-present · 인지도 low · 장비형
  - 2005년 Hak5 창립. 키스트로크 주입 USB Rubber Ducky(2010), 중간자 공격 WiFi Pineapple 등 침투 하드웨어 설계. Mr.Robot 등 매체에 등장
  - ⚠ 장비 자체(USB·파인애플)가 강렬한 소품 → 무대사 영상에 장비형으로 적합. 실제 침투에 쓰이는 도구라 악용 우려 → 교육·레드팀 용도 강조
  - 출처: https://shop.hak5.org/pages/about · https://en.everybodywiki.com/Darren_Kitchen
- **Pavel Zhovner (Pavel Zhovner (Flipper Zero))** · 2020-present · 인지도 medium · 장비형
  - 2020년 해커용 멀티툴 Flipper Zero 킥스타터로 488만 달러 모금. RFID·NFC·적외선·라디오 신호를 읽고 복제하는 휴대 장치로 50만 대 이상 판매
  - 🇰🇷 한국 테크·IT 유튜버들이 다수 리뷰해 일반 시청자에게도 '장난감처럼 생긴 해킹 기기'로 어느 정도 알려짐
  - ⚠ 돌고래 캐릭터·아기자기한 외형이 강한 시각 후크. 단 차량키·출입카드 복제 악용 논란으로 캐나다 수입금지 시도·아마존 판매중단 사례. 모스크바 소재 회사라 지정학 민감
  - 출처: https://en.wikipedia.org/wiki/Flipper_Zero · https://strikesource.com/2023/01/17/flipper-zero-powerful-pentesting-tool-or-hackers-dream/
- **Philip Zimmermann (Phil Zimmermann (PGP))** · 1991-present · 인지도 low · 인물형
  - 1991년 공개키 암호 프로그램 PGP 무료 배포. 무기수출법 위반 형사수사(최대 5년형)를 받았고 1996년 무혐의 종결. 크립토 전쟁의 상징적 인물
  - ⚠ 09-디지털저항군의 사이퍼펑크와 정면으로 겹침(별도 표기 필요). 본 영역에선 'PGP라는 무기를 만들어 형사기소당한 장인' 측면으로 차별화. 소스코드를 책으로 출판해 수출규제 우회한 일화 활용
  - 출처: https://en.wikipedia.org/wiki/Phil_Zimmermann · https://www.internethalloffame.org/official-biography-philip-zimmermann/
- **Whitfield Diffie, Martin Hellman (Whitfield Diffie & Martin Hellman)** · 1976 · 인지도 low · 팀형
  - 1976년 논문 '암호학의 새 방향'으로 공개키 암호·디지털 서명 개념 창시(Diffie-Hellman 키교환). 2015년 ACM 튜링상 수상
  - ⚠ 씨드 지적대로 너무 학술적이라 '실전 해킹/방어 도구' 색이 거의 없음. 모든 보안 도구의 수학적 토대라는 '원조 대장장이' 상징으로만 표기 권고. 시각 임팩트 약함
  - 출처: https://www.acm.org/articles/bulletins/2016/march/turing-2015-diffie-hellman · https://en.wikipedia.org/wiki/Whitfield_Diffie
- **Renaud Deraison (Renaud Deraison (Nessus))** · 1998-present · 인지도 low · 인물형
  - 1998년 17세에 취약점 스캐너 Nessus 공개, 2002년 Tenable 공동창업. 전 세계 취약점 점검의 사실상 표준 도구를 만듦
  - ⚠ '17세 소년이 만든 도구가 업계 표준이 됨' 서사가 매력. 취약점 정찰 도구라 공격 정찰 성격 있음 → 방어·점검 측면 강조
  - 출처: https://www.tenable.com/profile/renaud-deraison · https://en.wikipedia.org/wiki/Tenable,_Inc.
- **Jens Steube (Jens Steube 'atom' (hashcat))** · 2009-present · 인지도 low · 인물형
  - 2009년 GPU 가속 암호 크래커 hashcat 공개, 2015년 오픈소스화. 2012년 Gauss 악성코드 해독용 GaussCrack로 카스퍼스키 분석 지원
  - ⚠ 핸들 'atom' 위주 활동으로 얼굴 노출 제한적. 비밀번호 깨는 도구라 악용 우려 → 패스워드 강도 감사·포렌식 측면 강조. 'John the Ripper'(Solar Designer)와 같은 진영이라 둘 중 택일 또는 라이벌 구도 활용 가능
  - 출처: https://www.helpnetsecurity.com/2016/06/13/hashcat-password-recovery/ · https://grokipedia.com/page/Hashcat

### 모던 엘리트 해커·CTF·버그바운티·Pwn2Own 챔피언 (16)

- **Jeff Moss (Jeff Moss (Dark Tangent))** · 1993-present · 인지도 low · 인물형
  - 1993년 DEF CON, 1997년 Black Hat을 창설한 해커 컨퍼런스 창건자. 2005년 Black Hat을 약 1390만 달러에 매각, 이후 ICANN 보안총괄·미 국토안보 자문위원
  - ⚠ 본인 이름 인지도는 낮으나 DEF CON·Black Hat 브랜드는 보안권에서 강력. 해킹 '성지'를 세운 원로로 카리스마 연출 용이. 범죄성·정치 논란 없음
  - 출처: https://en.wikipedia.org/wiki/Jeff_Moss_(hacker) · https://www.cnn.com/2011/TECH/web/08/03/jeff.moss.black.hat/index.html
- **George Hotz (geohot)** · 2007-present · 인지도 medium · 인물형
  - 2007년 17세에 최초의 아이폰 캐리어 언락 성공(워즈니악이 축전). 2010~2011년 PS3 루트키 공개로 소니에 피소·합의. 이후 자율주행 comma.ai·tinygrad 창업
  - ⚠ 현대 해커 중 대중 인지도 최상위. 소니 소송 합의(소니 제품 재해킹 금지 조건)·돌발 언행 등 일부 논란이나 미화 위험 낮음. 카리스마·서사 모두 강함
  - 출처: https://en.wikipedia.org/wiki/George_Hotz · https://www.cultofmac.com/news/meet-geohot-guy-who-unlocked-the-first-iphone-and-hacked-the-sony-ps3
- **Cheng-Da Tsai (蔡政達) (Orange Tsai)** · 2017-present · 인지도 low · 인물형
  - 2021년 ProxyLogon·ProxyShell 취약점 체인으로 MS Exchange 서버 무인증 원격장악 공개. Pwnie Award 'Best Server-Side Bug' 수상·Pwn2Own Master of Pwn, PortSwigger 웹해킹기법 1위 다회
  - ⚠ 대만 DEVCORE 소속 화이트햇. 단, 그가 공개한 ProxyLogon은 직후 중국계 국가조직(HAFNIUM)이 전 세계 Exchange 서버를 대규모 침해하는 데 악용됨 — 연구공개와 악용은 별개임을 분리 서술 필요
  - 출처: https://blog.orange.tw/about/ · https://portswigger.net/daily-swig/amp/a-whole-new-attack-surface-researcher-orange-tsai-documents-proxylogon-exploits-against-microsoft-exchange-server
- **JungHoon Lee (이정훈) (lokihardt)** · 2012-present · 인지도 low · 인물형
  - Pwn2Own 2015에서 혼자 IE11·크롬·사파리를 동시 격파해 단일 대회 최고 상금 22만5천 달러. 크롬 익스플로잇은 당시 단일 버그 사상 최대 상금. 이후 구글 Project Zero 합류
  - 🇰🇷 한국인 천재 해커. 영국 더레지스터가 '세계 최고 해커일 수 있다'고 보도, 18세부터 두각. 구글이 채용해 미국 이주. 한국 보안계 상징적 인물
  - ⚠ 범죄성·정치 논란 없음. 본인이 노출을 꺼려 사진 소스가 제한적이라 화보 발주 시 자료 확보 주의. 한국 보안계 자랑거리로 koreaAngle 강함
  - 출처: https://www.theregister.com/2016/11/11/worlds_best_hacker_ticks_chrome_windows_security_laughs_at_flash · https://www.securityweek.com/pwn2own-2016-hackers-earn-460000-21-new-flaws/
- **Santiago Lopez (try_to_hack)** · 2015-present · 인지도 low · 인물형
  - 2019년 19세에 HackerOne 버그바운티 누적 상금 100만 달러를 세계 최초로 돌파. 16세에 영화 '해커스'를 보고 독학 시작, 트위터·버라이즌 등에 1600여 건 취약점 제보
  - ⚠ 아르헨티나 출신 자수성가 서사가 강점. 단 '가난→백만장자' 식 거지코스프레 프레임은 피하고 독학·집념 위주로. 범죄성 없음
  - 출처: https://www.hackerone.com/press-release/teen-becomes-worlds-first-1-million-bug-bounty-hacker-hackerone · https://www.computerweekly.com/news/252458632/Teen-becomes-first-millionaire-through-HackerOne-bug-bounties
- **Jack Cable (Jack Cable)** · 2017-present · 인지도 low · 인물형
  - 2017년 17세에 미 국방부 'Hack the Air Force' 1위. 구글·페북·우버 등에 350여 취약점 보고, 랜섬웨어 피해금 회수, CISA 선거인프라 보안 기술자문. 2018 타임 '영향력 있는 10대 25인'
  - ⚠ 전형적 화이트햇·공익형 인물로 미화 위험 거의 없음. 정부협력 이력이 강해 깨끗한 '천재 소년→국가 방패' 서사 가능
  - 출처: https://en.wikipedia.org/wiki/Jack_Cable_(software_developer) · https://www.nextgov.com/cybersecurity/2017/09/meet-17-year-old-who-hacked-us-air-force/141187/
- **Charles Miller (Charlie Miller)** · 2007-present · 인지도 low · 인물형
  - 2015년 크리스 발라섹과 함께 지프 체로키를 16km 밖에서 원격 조종(핸들·브레이크·가속 장악) — 피아트크라이슬러 140만 대 리콜. 前 NSA, 2008 Pwn2Own 맥북에어 최초 격파
  - ⚠ 지프 해킹은 책임공개였으나 '차량 원격탈취' 영상이 충격적이라 비주얼 임팩트 큼. 名 인지도는 낮아도 사건 자체는 한국에도 보도됨. 범죄성 없음
  - 출처: https://en.wikipedia.org/wiki/Charlie_Miller_(security_researcher) · https://www.usenix.org/conference/vehiclesec25/presentation/miller-valasek-keynote
- **Manfred Paul (Manfred Paul)** · 2020s-present · 인지도 low · 인물형
  - Pwn2Own Vancouver 2024에서 크롬·엣지·사파리·파이어폭스 네 개 메이저 브라우저를 모두 단독 격파해 Master of Pwn. 브라우저 익스플로잇 단일 분야 최강자로 통함
  - ⚠ 독일 출신, 매니아 한정 인지도. 범죄성·정치 논란 없음. '브라우저 4종 솔로 클리어'라는 한 줄이 강렬해 직함카드 적합
  - 출처: https://hackread.com/pwn2own-2024-awards-hackers-pwn-tesla-browsers/ · https://www.thezdi.com/blog/2024/5/2/cve-2024-2887-a-pwn2own-winning-bug-in-google-chrome
- **Sina Kheirkhah (Sina Kheirkhah (Summoning Team))** · 2023-present · 인지도 low · 인물형
  - Pwn2Own Automotive 2025와 Ireland 2025 연속 Master of Pwn. EV 충전기·차량 인포테인먼트 등에서 다수 제로데이, 자동차편에서 30.5점으로 22만 달러 우승. 충전소를 릭롤시킨 퍼포먼스로 화제
  - ⚠ 이란계 신진 강자. 현재 Pwn2Own 최정상 현역이라 '신흥 챔피언' 포지션. 정치적으로 민감한 국가 배경은 직접 활동과 무관하니 사건 위주 서술
  - 출처: https://www.zerodayinitiative.com/blog/2025/1/23/pwn2own-automotive-2025-day-three-and-final-results · https://summoning.team/about/
- **Qixun Zhao (赵奇勋) (S0rryMybad)** · 2018-present · 인지도 low · 인물형
  - 2018년 Tianfu Cup에서 아이폰X를 사파리 방문만으로 원격 탈옥하는 'Chaos' 익스플로잇 체인을 시연해 20만 달러 1위. Qihoo 360 Vulcan Team 소속
  - ⚠ 민감도 최상. 그가 대회에서 만든 Chaos 익스플로잇이 중국 당국에 넘어가 위구르족 감시에 악용됐다는 보도(MIT Tech Review·애플 확인). 본인은 연구자지만 '국가가 무기화'한 사례라 인권·지정학 맥락 필수, 영웅화 금지·구도상 그림자 연출 권장
  - 출처: https://www.technologyreview.com/2021/05/06/1024621/china-apple-spy-uyghur-hacker-tianfu/ · https://threatpost.com/iphone-hack-spying-china-uyghurs/165950/
- **Tommy DeVoss (dawgyg)** · 1990s(블랙햇)·2016-present(바운티) · 인지도 low · 인물형
  - 10대 시절 블랙햇으로 한국 주둔 미군기지 침입·학교 폭파협박 등으로 4차례 수감. 출소 후 버그바운티로 전향, 2018년 하루 16건 제보로 16만 달러 등 누적 100만 달러+ 합법 수익
  - 🇰🇷 10대 때 한국 주둔 미군기지 네트워크에 침입한 이력(범죄 일화로만 등장, 미화 금지)
  - ⚠ 범죄 미화 강한 주의 필요. 과거 범죄(폭파협박·군기지 침입)를 무용담으로 띄우지 말고 '추락→갱생' 서사로만. 출연 가치는 높으나 톤 관리가 관건. 한국 주둔 미군기지 침입 이력은 한국 관련 디테일
  - 출처: https://www.beyondtrust.com/podcast/ep-83-the-bug-bounty-that-bought-a-mini-donkey-tommy-devoss-dawgyg · https://blog.criticalthinkingpodcast.io/p/hackernotes-ep-164-tommy-devoss-from-black-hat-to-bug-bounty-legend
- **Pinkie Pie** · 2012-2014 · 인지도 low · 인물형 · 익명
  - 2012~2013 구글 Pwnium 대회에서 크롬 샌드박스를 취약점 6개 체인으로 탈출, 매 대회 6만 달러 수령. 마이리틀포니 캐릭터에서 딴 핸들만 알려졌고 실명·얼굴 끝내 비공개
  - ⚠ 신원 완전 미상 — 후드 실루엣·핸들 텍스트·포니 모티프 엠블럼으로 연출하는 '익명 전설' 슬롯에 최적. 범죄성 없음(정식 대회 참가자)
  - 출처: https://thehackernews.com/2012/10/pinkie-pie-discovered-second-chrome.html · https://en.wikipedia.org/wiki/Pwn2Own
- **PPP (Plaid Parliament of Pwning)** · 2009-present · 인지도 low · 팀형
  - 카네기멜런대(CMU) 학생 팀. DEF CON CTF 최다 9회 우승(2025년 4연패 포함) — 해킹계 월드컵 최강 군단. 근년엔 Maple Bacon·Theori와 연합 'MMM'으로 출전
  - 🇰🇷 창립자 Brian Pak이 세운 Theori, 한국계 연구자들과 'MMM' 연합으로 함께 우승
  - ⚠ 트로피(블랙배지)와 단체 우승샷이 있어 팀형 연출 용이. 명문대 정예 이미지. 범죄성·정치 논란 없음
  - 출처: https://www.cmu.edu/news/stories/archives/2025/august/carnegie-mellons-hacking-team-wins-fourth-straight-record-ninth-overall-def-con-capture-the-flag · https://www.cylab.cmu.edu/news/2025/08/11-ppp-wins-ninth-defcon-title.html
- **Synacktiv** · 2021-present(대회 제패) · 인지도 low · 팀형
  - Pwn2Own 2023에서 테슬라 모델3를 게이트웨이·인포테인먼트 두 차례 완전장악, 차량 실물+53만 달러로 Master of Pwn. Pwn2Own Automotive 2024도 45만 달러로 제패한 프랑스 공격보안 기업
  - ⚠ 테슬라 실물을 상으로 끌고 나오는 단체샷이 강렬. 공격보안 전문기업(레드팀·정부 클라이언트)이라 '용병' 톤 가능하나 합법 활동. 정치 논란 없음
  - 출처: https://www.thestack.technology/synacktiv-researchers-pwn-2-own-masters-of-pwn-tesla/ · https://www.securityweek.com/tesla-hacked-twice-at-pwn2own-exploit-contest/
- **Pangu Team (盘古)** · 2014-present · 인지도 low · 팀형
  - 2014년부터 iOS 7·8·9·12 등 완전(언테더드) 탈옥툴을 잇따라 공개해 수천만 다운로드. 중국 최정상 탈옥·취약점연구 팀으로 PwnFest·Tianfu Cup에서도 활약
  - ⚠ 탈옥 문화 상징이라 아이폰 유저층엔 익숙. 단 i-SOON 유출에서 중국 당국 익스플로잇 공유망의 일원으로 거명된 정황 — 국가연계 의혹은 짚되 단정은 주의. 멤버 다수 비공개라 엠블럼·실루엣 연출
  - 출처: https://www.vice.com/en/article/chinese-hackers-pangu-jailbreak-ios-9/ · https://www.nattothoughts.com/p/the-pangu-teamios-jailbreak-and-vulnerability
- **Theori (The Duck)** · 2016-present · 인지도 low · 팀형
  - PPP 창립자 Brian Pak·Andrew Wesie가 세운 보안기업. CTF팀 'The Duck'으로 활동하며 CMU PPP·Maple Bacon과 연합 'MMM'으로 DEF CON CTF 다수 우승. DARPA AI 사이버챌린지에도 참여
  - 🇰🇷 한국계 미국인 Brian Pak이 창업, 한국 법인·한국 출신 연구자들이 핵심. CTF 강국 한국을 대표하는 기업형 군단으로 koreaAngle 명확
  - ⚠ 한국 관련성이 분명한 팀형 후보. 회사·CTF 정체성이 섞여 있어 '한국계 정예가 세운 해킹 군단' 프레임으로 정리 필요. 범죄성·정치 논란 없음
  - 출처: https://theori.io/about · https://www.mayhem.security/blog/mmm-wins-the-superbowl-of-hacking-but-just-who-is-mmm
