import fs from 'node:fs'
import path from 'node:path'

const root = path.join(process.cwd(), 'public', 'rankings')

const episodes = {
  'mafia-top10': {
    logline: '마피아를 조직으로 세어 본다.',
    category: '조직',
    entries: [
      { rank: 1, name: '럭키 루치아노', celebSlug: 'lucky-luciano', line: '마세라아와 마란자노를 치운 뒤 보스 위원회를 세우고 뉴욕을 다섯 가문으로 나눴다.', note: '위원회' },
      { rank: 2, name: '조니 토리오', celebSlug: 'johnny-torrio', line: '시카고 밀주를 구역으로 나눈 뒤 조직을 카포네에게 넘기고 물러났다.', note: '구역' },
      { rank: 3, name: '마이어 랜스키', celebSlug: 'meyer-lansky', line: '루치아노 조직의 돈을 맡았고 하바나에 카지노를 열었다.', note: '장부' },
      { rank: 4, name: '알 카포네', celebSlug: 'al-capone', line: '토리오에게 조직을 물려받아 시카고를 금주법 아래 한 손으로 쥐었다.', note: '밀주' },
      { rank: 5, name: '카를로 감비노', celebSlug: 'carlo-gambino', line: '아나스타시아가 죽은 뒤 가문을 이어받아 미국 최대 조직으로 키웠다.', note: '가문' },
      { rank: 6, name: '비토 제노베제', celebSlug: 'vito-genovese', line: '루치아노가 추방된 뒤 가문을 빼앗고 1957년 아파라친에 전미 보스를 소집했다.', note: '소집' },
      { rank: 7, name: '벅시 시겔', celebSlug: 'bugsy-siegel', line: '라스베이거스 사막에 플라밍고 호텔을 열었다.', note: '호텔' },
      { rank: 8, name: '존 고티', celebSlug: 'john-gotti', line: '1985년 스파크 스테이크하우스 앞에서 카스텔라노를 쏘고 감비노 가문 보스가 됐다.', note: '암살' },
      { rank: 9, name: '스테파니 세인트 클레어', celebSlug: 'stephanie-st.-clair', line: '할렘 숫자도박을 자기 조직으로 돌렸고 더치 슐츠의 침투를 거부했다.', note: '숫자' },
      { rank: 10, name: '범피 존슨', celebSlug: 'bumpy-johnson', line: '세인트 클레어 밑에서 할렘을 지키다 그 구역 조직을 수십 년 이끌었다.', note: '할렘' },
    ],
  },
  'pirates-top10': {
    logline: '해적을 악명으로 세어 본다.',
    category: '악명',
    entries: [
      { rank: 1, name: '에드워드 티치', celebSlug: 'blackbeard', line: '퀸 앤스 리벤지를 타고 찰스턴 항구를 막았다. 수염에 도화선을 꽂고 배에 올랐다.', note: '화약' },
      { rank: 2, name: '바솔로뮤 로버츠', celebSlug: 'bartholomew-roberts', line: '상선 400여 척을 나포했다.', note: '나포' },
      { rank: 3, name: '정일수', celebSlug: 'ching-shih', line: '홍기방 함대를 이끌고 남중국해를 장악했다. 청나라와 조건을 달고 내려왔다.', note: '함대' },
      { rank: 4, name: '헨리 모건', celebSlug: 'henry-morgan', line: '1671년 파나마를 약탈했다. 나중에 자메이카 부총독 자리에 앉았다.', note: '파나마' },
      { rank: 5, name: '프랜시스 드레이크', celebSlug: 'francis-drake', line: '스페인 은선을 털고 세계를 한 바퀴 돌아 잉글랜드로 왔다.', note: '은선' },
      { rank: 6, name: '앤 보니', celebSlug: 'anne-bonny', line: '캘리코 잭의 배에서 남자 옷을 입고 칼과 권총을 들고 싸웠다.', note: '선상' },
    ],
  },
  'wild-west-top10': {
    logline: '서부 총잡이를 사격으로 세어 본다.',
    category: '사격',
    entries: [
      { rank: 1, name: '애니 오클리', celebSlug: 'annie-oakley', line: '서부쇼 무대에서 날아가는 동전을 맞히고 카드 가장자리를 갈랐다.', note: '명중' },
      { rank: 2, name: '와일드 빌 히콕', celebSlug: 'wild-bill-hickok', line: '1865년 스프링필드 광장에서 데이비스 터트를 한 발로 쏘아 죽였다.', note: '결투' },
      { rank: 3, name: '닥 홀리데이', celebSlug: 'doc-holliday', line: '툼스톤 OK 목장에서 샷건을 들고 클랜튼 일당을 쐈다.', note: '샷건' },
      { rank: 4, name: '와이어트 어프', celebSlug: 'wyatt-earp', line: '1881년 툼스톤에서 동생들과 홀리데이를 데리고 OK 목장 앞에서 30초를 싸웠다.', note: '툼스톤' },
      { rank: 5, name: '빌리 더 키드', celebSlug: 'billy-the-kid', line: '링컨 카운티 감옥에서 간수 둘을 쏘고 달아났다.', note: '탈옥' },
      { rank: 6, name: '제시 제임스', celebSlug: 'jesse-james', line: '중서부 은행과 열차를 털었다. 노스필드에서 총격전을 벌이다 달아났다.', note: '열차' },
    ],
  },
  'hackers-top10': {
    logline: '해커를 파괴로 세어 본다.',
    category: '파괴',
    entries: [
      { rank: 1, name: '오넬 데 구즈만', celebSlug: 'onel-de-guzman', line: '2000년 ILOVEYOU 웜을 메일로 퍼뜨려 회사 컴퓨터 수천만 대를 멈췄다.', note: '감염' },
      { rank: 2, name: '로버트 모리스', celebSlug: 'robert-tappan-morris', line: '1988년 웜을 인터넷에 풀어 기계 수천 대를 멈췄다.', note: '마비' },
      { rank: 3, name: '마이클 칼스', celebSlug: 'michael-calce', line: '열다섯에 야후를 멈췄다. 이베이와 CNN 사이트도 같은 주에 다운시켰다.', note: '다운' },
      { rank: 4, name: '케빈 폴슨', celebSlug: 'kevin-poulsen', line: '1990년 라디오 교환망을 장악해 102번째 통화로 포르쉐를 가져갔다.', note: '교환' },
      { rank: 5, name: '케빈 미트닉', celebSlug: 'kevin-mitnick', line: '전화와 말로 회사 안에 들어가 소스코드를 빼냈다. FBI가 그를 2년 쫓았다.', note: '추적' },
      { rank: 6, name: '로이드 블랭큰십', celebSlug: 'loyd-blankenship', line: '1986년 감옥에서 해커 선언문을 썼다. 리전 오브 둠에서 시스템을 뚫었다.', note: '선언' },
      { rank: 7, name: '존 드레이퍼', celebSlug: 'john-draper', line: '시리얼 상자 호루라기로 AT&T 장거리 신호를 열고 무료 전화를 걸었다.', note: '호각' },
      { rank: 8, name: '스티브 잡스', celebSlug: 'steve-jobs', line: '워즈니악과 블루박스를 만들어 팔았다. 장거리 전화를 공짜로 걸었다.', note: '블루' },
    ],
  },
  'spies-top10': {
    logline: '정보기관을 침투로 세어 본다.',
    category: '침투',
    entries: [
      { rank: 1, name: '엘리 코헨', celebSlug: 'eli-cohen', line: '시리아로 들어가 고위층에 붙었다. 다마스쿠스에서 전보를 이스라엘로 보냈다.', note: '위장' },
      { rank: 2, name: '토니 멘데즈', celebSlug: 'tony-mendez', line: '테헤란에서 캐나다 영화팀으로 위장해 미국 외교관 여섯을 비행기에 태웠다.', note: '영화' },
      { rank: 3, name: '이세르 하렐', celebSlug: 'isser-harel', line: '1960년 아르헨티나에서 아이히만을 잡아 이스라엘로 데려왔다.', note: '체포' },
      { rank: 4, name: '메이르 다간', celebSlug: 'meir-dagan', line: '모사드 국장으로 이란 핵 시설을 겨냥한 작전을 지휘했다.', note: '이란' },
      { rank: 5, name: '윌리엄 도너번', celebSlug: 'william-j-donovan', line: '전략사무국을 세우고 점령지 유럽에 요원을 넣었다.', note: '파견' },
      { rank: 6, name: '레우벤 실로아흐', celebSlug: 'reuven-shiloah', line: '이스라엘 모사드를 창설하고 초대 국장을 맡았다.', note: '창설' },
      { rank: 7, name: '스튜어트 멘지스', celebSlug: 'stewart-menzies', line: 'MI6를 이끌고 점령지 유럽에 요원을 넣었다. 블레츨리 파크의 해독을 작전에 썼다.', note: '암호' },
      { rank: 8, name: '맨스필드 스미스커밍', celebSlug: 'mansfield-smith-cumming', line: '해외 비밀정보국을 열어 MI6의 초대 수장이 됐다.', note: '개국' },
    ],
  },
  'special-forces-top10': {
    logline: '특수부대를 침투로 세어 본다.',
    category: '침투',
    entries: [
      { rank: 1, name: '윌리엄 맥레이븐', celebSlug: 'william-mcraven', line: '합동특수작전사령관을 맡아 빈 라덴이 숨은 아보타바드 집을 급습하는 작전을 짰다.', note: '급습' },
      { rank: 2, name: '데이비드 스털링', celebSlug: 'david-stirling', line: '북아프리카 사막에서 SAS를 세우고 독일 후방 비행장을 습격했다.', note: '사막' },
      { rank: 3, name: '리처드 마신코', celebSlug: 'richard-marcinko', line: 'SEAL 6팀을 창설했다. 레드 셀을 만들어 미 해군 기지를 몰래 뚫고 들어갔다.', note: '침투' },
      { rank: 4, name: '울리히 베게너', celebSlug: 'ulrich-wegener', line: '1977년 모가디슈 공항에서 납치기를 기습해 인질 86명을 빼냈다.', note: '기습' },
      { rank: 5, name: '크리스티앙 프루토', celebSlug: 'christian-prouteau', line: '프랑스 헌병 특공대 GIGN을 창설했다. 지부티에서 납치된 통학버스를 탈환했다.', note: '탈환' },
      { rank: 6, name: '찰리 벡위드', celebSlug: 'charles-beckwith', line: '영국 SAS를 보고 델타포스를 세웠다. 테헤란 인질을 빼내려 이란 사막에 들어갔다.', note: '델타' },
      { rank: 7, name: '조영주', celebSlug: 'cho-young-joo', line: '청해부대를 이끌고 소말리아 해역에서 삼호주얼리호에 잠입해 선원 21명을 구했다.', note: '구출' },
      { rank: 8, name: '백문오', celebSlug: 'baek-mun-oh', line: '특전사의 모체가 된 제1전투단을 창설했다.', note: '특전' },
      { rank: 9, name: '장인표', celebSlug: 'jang-in-pyo', line: '1955년 대위로서 해군 수중파괴대를 세우고 초대 대장을 맡았다.', note: '수중' },
    ],
  },
  'logistics-top10': {
    logline: '물류 제국을 속도로 세어 본다.',
    category: '속도',
    entries: [
      { rank: 1, name: '프레드 스미스', celebSlug: 'frederick-w-smith', line: '1973년 멤피스에서 비행기로 다음날 물건을 보내는 일을 시작했다.', note: '익일' },
      { rank: 2, name: '짐 케이시', celebSlug: 'james-e-casey', line: '1907년 시애틀에서 심부름 회사를 열고 나중에 미국 전역을 트럭으로 이었다.', note: '전국' },
      { rank: 3, name: '에이드리언 달시', celebSlug: 'adrian-dalsey', line: '1969년 샌프란시스코에서 호놀룰루로 서류를 비행기에 실어 DHL을 열었다.', note: '서류' },
      { rank: 4, name: '래리 힐블롬', celebSlug: 'larry-hillblom', line: '달시, 린과 항공특송을 열어 태평양 건너 서류를 다음날 넣었다.', note: '태평양' },
      { rank: 5, name: '로버트 린', celebSlug: 'robert-lynn', line: '달시, 힐블롬과 DHL을 열어 국제 서류를 비행기로 날렸다.', note: '국제' },
      { rank: 6, name: '마이클 배시', celebSlug: 'michael-d-basch', line: '페덱스 멤피스 거점을 세우고 화물에 바코드를 붙여 위치를 추적했다.', note: '바코드' },
      { rank: 7, name: '켄트 넬슨', celebSlug: 'kent-c-nelson', line: 'UPS에 휴대 스캐너를 넣어 기사가 화물 위치를 그 자리에서 찍게 했다.', note: '스캐너' },
      { rank: 8, name: '마이클 에스큐', celebSlug: 'michael-eskew', line: 'UPS 회장으로 세계 항공 허브와 해외 배송망을 넓혔다.', note: '항공' },
      { rank: 9, name: '클로드 라이언', celebSlug: 'claude-ryan', line: '시애틀에서 케이시와 함께 심부름 회사를 열어 UPS의 첫 파트너가 됐다.', note: '동업' },
      { rank: 10, name: '조지 케이시', celebSlug: 'george-washington-casey', line: '열네 살에 배달을 시작했고 나중에 UPS 태평양 연안 사업을 맡았다.', note: '연안' },
    ],
  },
  'payment-top10': {
    logline: '카드망을 수수료로 세어 본다.',
    category: '수수료',
    entries: [
      { rank: 1, name: '디 호크', celebSlug: 'dee-hock', line: '뱅크아메리카드를 은행 공동망으로 바꿔 비자를 세웠다.', note: '비자' },
      { rank: 2, name: '프랭크 맥너마라', celebSlug: 'frank-x-mcnamara', line: '1950년 다이너스 클럽을 열어 식당 계산을 카드로 받았다.', note: '다이너스' },
      { rank: 3, name: '조지프 윌리엄스', celebSlug: 'joseph-p-williams', line: '1958년 뱅크오브아메리카에서 뱅크아메리카드를 뿌렸다. 외상 잔액을 다음 달로 넘겼다.', note: '외상' },
      { rank: 4, name: '칼 힌케', celebSlug: 'karl-hinke', line: '1966년 버팔로에 은행들을 모아 인터뱅크를 만들었다. 이 망이 마스터카드가 됐다.', note: '마스터' },
      { rank: 5, name: '아제이 방가', celebSlug: 'ajay-banga', line: '마스터카드 회장으로 카드망을 신흥국까지 넓혔다.', note: '확장' },
      { rank: 6, name: '랠프 리드', celebSlug: 'ralph-t-reed', line: '1958년 아메리칸 익스프레스 카드를 냈다. 가맹점에서 수수료를 떼고 대금을 지급했다.', note: '아멕스' },
      { rank: 7, name: '마셀러스 베리', celebSlug: 'marcellus-berry', line: '1891년 아멕스 여행자 수표를 만들었다. 서명 두 번으로 현금을 바꿨다.', note: '수표' },
      { rank: 8, name: '헨리 웰스', celebSlug: 'henry-wells', line: '버터필드, 파고와 아메리칸 익스프레스를 열었다. 뒤에 파고와 웰스파고도 세웠다.', note: '특송' },
      { rank: 9, name: '윌리엄 파고', celebSlug: 'william-fargo', line: '웰스와 함께 특송회사를 열어 금과 어음을 대륙 너머로 날렸다.', note: '금송' },
      { rank: 10, name: '아마데오 지아니니', celebSlug: 'amadeo-giannini', line: '샌프란시스코에 은행을 열어 노동자에게 대출했다. 1906년 지진 다음 날 부두에서 금을 내줬다.', note: '부두' },
    ],
  },
}

for (const [folder, spec] of Object.entries(episodes)) {
  const file = path.join(root, folder, 'ranking-data.json')
  const prev = JSON.parse(fs.readFileSync(file, 'utf8'))
  const next = {
    title: prev.title,
    logline: spec.logline,
    themeSlug: prev.themeSlug,
    categories: [
      {
        name: spec.category,
        entries: spec.entries,
      },
    ],
  }
  if (prev.music) next.music = prev.music
  if (prev.musicVolume != null) next.musicVolume = prev.musicVolume
  fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
}

const report = Object.entries(episodes).map(([folder, spec]) => {
  const n = spec.entries.length
  const lines = spec.entries.filter((e) => e.line && e.line.trim()).length
  const top = spec.entries.slice(0, 3).map((e) => `${e.rank}. ${e.name} — ${e.line}`)
  return { folder, category: spec.category, n, lines, top }
})
console.log(JSON.stringify(report, null, 2))
