import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd(), '../..')
const dir = resolve(root, 'data/celeb/relations-consolidation')
const prepared = JSON.parse(readFileSync(resolve(dir, 'candidates.json'), 'utf8'))
const decisions = {}

function pairMembers(candidate) {
  return new Set([candidate.from_name, candidate.to_name])
}

function findPair(a, b, relType) {
  const matches = prepared.candidates.filter((candidate) => {
    const names = pairMembers(candidate)
    return names.has(a) && names.has(b) && (!relType || candidate.rel_type === relType)
  })
  if (matches.length !== 1) {
    throw new Error(`Expected one candidate for ${a}/${b}/${relType ?? '*'}, found ${matches.length}`)
  }
  return matches[0]
}

function replace(a, b, relType, value) {
  const candidate = findPair(a, b, relType)
  decisions[candidate.fact_key] = { action: 'replace', ...value }
}

function drop(a, b, relType) {
  const candidate = findPair(a, b, relType)
  decisions[candidate.fact_key] = { action: 'drop' }
}

function hasFinalConsonant(value) {
  const code = value.codePointAt(value.length - 1)
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0
}

function joinedNames(a, b) {
  return `${a}${hasFinalConsonant(a) ? '과' : '와'} ${b}`
}

function colleagueTeam(candidate) {
  if (candidate.rel_type !== 'colleague') return null
  const text = candidate.note ?? candidate.old_rows[0]?.note ?? ''
  return text.match(/^<([^>]+)> 팀 동료$/)?.[1] ?? null
}

const teams = [
  { ko: 'GOT the beat', en: 'GOT the beat', members: ['보아', '태연', '효연', '슬기', '웬디', '카리나', '윈터'] },
  { ko: 'SuperM', en: 'SuperM', members: ['태민', '백현', '카이', '태용', '마크'] },
  { ko: 'IZ*ONE', en: 'IZ*ONE', members: ['사쿠라', '김채원', '안유진', '장원영'] },
  { ko: '티아라', en: 'T-ara', members: ['이아름', '류화영', '소연', '함은정', '효민', '박지연', '전보람', '큐리'] },
  { ko: 'UNI.T', en: 'UNI.T', members: ['윤조', '우희'] },
  { ko: '애프터스쿨', en: 'After School', members: ['유이', '레이나', '리지', '소영', '주연', '베카', '정아', '나나', '가희', '가은', '이영'] },
  { ko: '4Tomorrow', en: '4Tomorrow', members: ['가인', '유이', '한승연', '현아'] },
  { ko: '오소녀', en: 'Five Girls', members: ['유이', '유빈', '전효성'] },
  { ko: '참소녀', en: 'Chamsonyeo', members: ['허영지', '권소현', '리지'] },
  { ko: '포미닛', en: '4Minute', members: ['권소현', '현아', '전지윤', '허가윤', '남지현'] },
]

function reviewedTeamCandidates() {
  const teamsByProfile = new Map()
  for (const candidate of prepared.candidates) {
    const team = colleagueTeam(candidate)
    if (!team) continue
    for (const id of [candidate.from_id, candidate.to_id]) {
      const counts = teamsByProfile.get(id) ?? new Map()
      counts.set(team, (counts.get(team) ?? 0) + 1)
      teamsByProfile.set(id, counts)
    }
  }
  const dominantTeam = new Map(
    [...teamsByProfile].map(([id, counts]) => [
      id,
      [...counts].sort((a, b) => b[1] - a[1])[0],
    ]),
  )
  return prepared.candidates.filter((candidate) => {
    const team = colleagueTeam(candidate)
    return team && [candidate.from_id, candidate.to_id].some((id) => {
      const dominant = dominantTeam.get(id)
      return dominant && dominant[0] !== team && dominant[1] >= 2
    })
  })
}

for (const candidate of reviewedTeamCandidates()) {
  const names = pairMembers(candidate)
  if (names.has('티파니') && names.has('공민지')) {
    decisions[candidate.fact_key] = { action: 'drop' }
    continue
  }
  const shared = teams.find((team) => [...names].every((name) => team.members.includes(name)))
  if (!shared) {
    throw new Error(`No verified team for ${candidate.from_name}/${candidate.to_name}`)
  }
  const fromEn = candidate.from_name_en || candidate.from_name
  const toEn = candidate.to_name_en || candidate.to_name
  decisions[candidate.fact_key] = {
    action: 'replace',
    note: `${joinedNames(candidate.from_name, candidate.to_name)}는 ${shared.ko}에서 함께 활동했다.`,
    note_en: `${fromEn} and ${toEn} performed together in ${shared.en}.`,
  }
}

const teamNamesEn = {
  '세븐틴': 'SEVENTEEN',
  '나인뮤지스': 'Nine Muses',
  '슈퍼주니어': 'SUPER JUNIOR',
  '제로베이스원': 'ZEROBASEONE',
  '애프터스쿨': 'After School',
  '트와이스': 'TWICE',
  '소녀시대': "Girls' Generation",
  '카라': 'KARA',
  '비투비': 'BTOB',
  '헬로비너스': 'HELLOVENUS',
  '에이티즈': 'ATEEZ',
  '인피니트': 'INFINITE',
  '러블리즈': 'Lovelyz',
  '레인보우': 'Rainbow',
  '달샤벳': 'Dal Shabet',
  '갓세븐': 'GOT7',
  '티아라': 'T-ara',
  '엔믹스': 'NMIXX',
  '원더걸스': 'Wonder Girls',
  '스텔라': 'Stellar',
  '스트레이 키즈': 'Stray Kids',
  '에이핑크': 'Apink',
  '신화': 'Shinhwa',
  '걸스데이': "Girl's Day",
  '몬스타엑스': 'MONSTA X',
  'FT아일랜드': 'FTISLAND',
  '(여자)아이들': '(G)I-DLE',
  '베이비몬스터': 'BABYMONSTER',
  '방탄소년단': 'BTS',
  '보이넥스트도어': 'BOYNEXTDOOR',
  '동방신기': 'TVXQ!',
  '레드벨벳': 'Red Velvet',
  '르세라핌': 'LE SSERAFIM',
  '아이브': 'IVE',
  '라이즈': 'RIIZE',
  '뉴진스': 'NewJeans',
  '씨엔블루': 'CNBLUE',
  '투모로우바이투게더': 'TOMORROW X TOGETHER',
  '마마무': 'MAMAMOO',
  '블랙핑크': 'BLACKPINK',
  '미쓰에이': 'miss A',
  '브라운아이드걸스': 'Brown Eyed Girls',
  '에스파': 'aespa',
  '씨스타': 'SISTAR',
  '포미닛': '4Minute',
  '빅뱅': 'BIGBANG',
  '시크릿': 'Secret',
  '샤이니': 'SHINee',
  '비스트': 'BEAST',
}

for (const candidate of prepared.candidates) {
  const team = colleagueTeam(candidate)
  if (!team || decisions[candidate.fact_key] || !/[가-힣]/.test(candidate.note_en ?? '')) continue
  const teamEn = teamNamesEn[team]
  if (!teamEn) throw new Error(`English team name missing: ${team}`)
  const fromEn = candidate.from_name_en || candidate.from_name
  const toEn = candidate.to_name_en || candidate.to_name
  decisions[candidate.fact_key] = {
    action: 'replace',
    note: `${joinedNames(candidate.from_name, candidate.to_name)}는 ${team}에서 함께 활동했다.`,
    note_en: `${fromEn} and ${toEn} performed together in ${teamEn}.`,
  }
}

drop('영웅재중', '시아준수', 'cofounder')
drop('은혁', '동해', 'cofounder')
drop('믹키유천', '영웅재중', 'cofounder')
drop('이민우', '에릭', 'cofounder')
drop('신혜성', '에릭', 'cofounder')
drop('이민우', '김동완', 'cofounder')

replace('미스터비스트', '마크 로버', 'cofounder', {
  note: '미스터비스트와 마크 로버는 2019년 나무 심기 모금 운동 #TeamTrees를 함께 시작했고, 2021년에는 해양 쓰레기 제거 운동 #TeamSeas를 함께 이끌었다.',
  note_en: 'MrBeast and Mark Rober started the tree-planting fundraiser #TeamTrees together in 2019 and later led the ocean-cleanup campaign #TeamSeas together in 2021.',
})

replace('로건 폴', '미스터비스트', 'cofounder', {
  note: '로건 폴과 미스터비스트는 KSI와 함께 2024년 간편식 브랜드 Lunchly를 공동 창업했다.',
  note_en: 'Logan Paul and MrBeast co-founded the meal-kit brand Lunchly with KSI in 2024.',
})

drop('바진', '육손', 'friend')
drop('마초', '마등', 'influence')

replace('정이', '주희', 'cofounder', {
  from_id: findPair('정이', '주희', 'cofounder').to_id,
  to_id: findPair('정이', '주희', 'cofounder').from_id,
  rel_type: 'influence',
  rel_group: 'thought',
  note: '정이의 이기론과 수양론은 남송의 주희에게 중요한 토대가 되었고, 주희는 이를 다른 북송 유학자들의 사상과 종합해 성리학 체계를 세웠다.',
  note_en: "Cheng Yi's account of principle, material force, and self-cultivation became a major foundation for Zhu Xi, who synthesized it with other Northern Song thinkers into his Neo-Confucian system.",
})

replace('멜란티오스', '오디세우스', 'rival', {
  note: '멜란티오스는 거지로 변장한 오디세우스를 모욕하고 구혼자들을 도왔으며, 궁전 전투에서는 구혼자들에게 무기를 대주다가 붙잡혀 벌을 받았다.',
  note_en: 'Melanthius insulted Odysseus while he was disguised as a beggar and aided the suitors; during the battle in the hall, he supplied them with weapons before being captured and punished.',
})

replace('마초', '마등', 'father', {
  note: '마등은 마초의 아버지였다. 마초가 211년 조조에 맞서 거병하자 수도에 있던 마등과 일족은 이듬해 처형됐다.',
  note_en: "Ma Teng was Ma Chao's father. After Ma Chao rebelled against Cao Cao in 211, Ma Teng and members of his family in the capital were executed the following year.",
})

replace('에우리마코스', '오디세우스', 'rival', {
  note: '에우리마코스는 오디세우스의 집을 차지한 구혼자 가운데 한 명이었다. 오디세우스가 정체를 드러내자 안티노오스에게 책임을 돌리고 배상을 제안했지만, 곧 칼을 들고 덤볐다가 화살에 맞아 죽었다.',
  note_en: 'Eurymachus was one of the suitors occupying the house of Odysseus. After Odysseus revealed himself, Eurymachus blamed Antinous and offered restitution, then charged with a sword and was killed by an arrow.',
})

replace('조조', '도겸', 'rival', {
  note: '조조는 193년 아버지 조숭이 서주에서 피살되자 도겸에게 책임을 묻고 193~194년에 서주를 공격했다. 도겸은 침공에 맞섰고, 조조는 연주에서 여포의 반란이 일어나자 군을 돌렸다.',
  note_en: "After his father Cao Song was killed in Xu Province, Cao Cao held Tao Qian responsible and invaded Xu in 193 and 194. Tao Qian resisted, and Cao Cao withdrew when Lü Bu's revolt threatened Yan Province.",
})

replace('질 들뢰즈', '바뤼흐 스피노자', 'influence', {
  note: '질 들뢰즈는 《스피노자와 표현의 문제》와 《스피노자: 실천철학》에서 바뤼흐 스피노자를 집중적으로 해석했다. 스피노자의 내재성과 정동 개념은 들뢰즈가 차이와 욕망을 설명하는 데 중요한 토대가 됐다.',
  note_en: 'Gilles Deleuze examined Baruch Spinoza closely in Expressionism in Philosophy: Spinoza and Spinoza: Practical Philosophy. Spinoza\'s concepts of immanence and affect became major foundations for Deleuze\'s accounts of difference and desire.',
})

replace('제인 오스틴', '세뮤얼 존슨', 'influence', {
  note: '제인 오스틴은 세뮤얼 존슨의 도덕 수필과 산문을 즐겨 읽었다. 존슨의 윤리적 판단과 풍자적 문체는 오스틴의 소설에 영향을 주었다.',
  note_en: "Jane Austen read Samuel Johnson's moral essays and prose with admiration. Johnson's ethical judgment and satirical style influenced Austen's fiction.",
})

replace('아리스토텔레스', '소크라테스', 'influence', {
  note: '소크라테스가 제기한 덕과 좋은 삶의 문제는 플라톤을 거쳐 아리스토텔레스에게 이어졌다. 아리스토텔레스는 이 문제를 《니코마코스 윤리학》에서 체계적으로 논했다.',
  note_en: "Socrates' questions about virtue and the good life reached Aristotle through Plato. Aristotle developed those questions systematically in the Nicomachean Ethics.",
})

replace('텔레마코스', '안티노오스', 'rival', {
  note: '안티노오스는 텔레마코스가 이타카로 돌아오는 길을 매복해 죽이려 했다. 텔레마코스는 매복을 피한 뒤 귀환한 아버지 오디세우스와 함께 안티노오스를 비롯한 구혼자들과 맞섰다.',
  note_en: 'Antinous plotted an ambush to kill Telemachus on his return to Ithaca. After escaping it, Telemachus stood with his returned father Odysseus against Antinous and the other suitors.',
})

replace('손오공', '이랑신', 'rival', {
  note: '《서유기》에서 손오공과 이랑신은 서로 모습을 바꾸어 가며 신통력을 겨뤘다. 승부가 이어지던 중 태상노군이 금강탁으로 손오공을 쓰러뜨렸고, 이랑신 쪽 군사들이 그를 붙잡았다.',
  note_en: "In Journey to the West, Sun Wukong and Erlang Shen matched each other's transformations and supernatural powers. While their contest continued, Laozi struck Sun Wukong with his diamond snare, allowing Erlang Shen's forces to capture him.",
})

replace('헥토르', '아킬레우스', 'rival', {
  note: '헥토르는 전투에서 아킬레우스의 벗 파트로클로스를 죽였다. 복수를 위해 돌아온 아킬레우스는 트로이 성문 앞에서 헥토르와 결투해 그를 죽였다.',
  note_en: 'Hector killed Patroclus, the companion of Achilles, in battle. Achilles returned to avenge him and killed Hector in single combat before the gates of Troy.',
})

replace('원소', '조조', 'rival', {
  note: '원소와 조조는 북중국의 주도권을 두고 맞섰다. 200년 관도대전에서 조조가 원소의 오소 군량기지를 기습한 뒤 원소군을 무너뜨렸다.',
  note_en: "Yuan Shao and Cao Cao fought for control of northern China. At the Battle of Guandu in 200 CE, Cao Cao's raid on Yuan Shao's supply depot at Wuchao helped bring about Yuan Shao's defeat.",
})

replace('우금', '관우', 'rival', {
  note: '219년 번성을 구원하러 온 우금의 군대는 폭우로 한수가 범람하면서 고립됐다. 관우가 수군으로 포위하자 우금은 항복했고, 그의 군사들도 포로가 됐다.',
  note_en: "In 219, heavy rain flooded the Han River and isolated Yu Jin's relief army near Fancheng. Guan Yu surrounded it with naval forces, and Yu Jin surrendered with his troops.",
})

replace('텔레마코스', '에우리마코스', 'rival', {
  note: '에우리마코스는 텔레마코스의 집을 점거하고 재산을 소모한 구혼자 가운데 한 명이었다. 텔레마코스는 귀환한 오디세우스와 함께 구혼자들과 맞섰고, 궁전 전투에서 에우리마코스는 오디세우스에게 죽었다.',
  note_en: "Eurymachus was one of the suitors who occupied Telemachus' home and consumed his estate. Telemachus stood with the returned Odysseus against the suitors, and Eurymachus was killed by Odysseus in the battle in the hall.",
})

replace('리처드 그라소', '켄 랭곤', 'friend', {
  note: '켄 랭곤은 리처드 그라소가 이끌던 뉴욕증권거래소의 보수위원회 의장을 맡아 그라소의 보수를 심의했다. 2004년 뉴욕주 검찰총장은 그라소의 보수 문제로 두 사람을 상대로 소송을 냈다.',
  note_en: "Ken Langone chaired the New York Stock Exchange compensation committee that reviewed Richard Grasso's pay. In 2004, the New York attorney general sued both men over Grasso's compensation.",
})

replace('일리야 수츠케버', '안드레 카파시', 'cofounder', {
  rel_type: 'colleague',
  rel_group: 'career',
  note: '2015년 OpenAI 출범 당시 일리야 수츠케버는 연구 책임자였고 안드레 카파시는 창립 연구진으로 참여했다. 두 사람은 초기 생성 모델 연구에도 함께 이름을 올렸다.',
  note_en: 'At the launch of OpenAI in 2015, Ilya Sutskever served as research director and Andrej Karpathy joined as a founding researcher. They also worked together on early generative-model research.',
})

replace('앤서니 홉킨스', '조너선 프라이스', 'friend', {
  note: '앤서니 홉킨스와 조너선 프라이스는 2019년 영화 《두 교황》에서 함께 연기했다. 촬영표의 순서를 두고 시작한 농담은 촬영 뒤 이메일에서도 이어졌다.',
  note_en: 'Anthony Hopkins and Jonathan Pryce co-starred in the 2019 film The Two Popes. A joke about their call-sheet order continued in their emails after filming.',
})

replace('알버트 아인슈타인', '마하트마 간디', 'influence', {
  note: '알버트 아인슈타인은 1931년 마하트마 간디에게 편지를 보내 비폭력으로 폭력에 맞선 그의 실천을 높이 평가했다. 간디는 답장에서 아인슈타인의 지지에 감사를 표하고 직접 만나기를 바랐다.',
  note_en: 'In 1931 Albert Einstein wrote to Mahatma Gandhi praising his use of nonviolence against violence. Gandhi replied with thanks for Einstein\'s support and expressed the hope that they could meet.',
})

replace('주성치', '브루스 리', 'influence', {
  note: '주성치는 브루스 리(이소룡)의 영화를 보고 그의 무술을 따라 배우기 시작했다. 《쿵푸 허슬》에도 브루스 리의 자세와 무술 영화에 대한 오마주를 담았다.',
  note_en: "Stephen Chow began learning martial arts after watching Bruce Lee's films. He also placed tributes to Lee's poses and martial-arts cinema throughout Kung Fu Hustle.",
})

replace('마크 안드레센', '팀 버너스 리', 'influence', {
  note: '팀 버너스 리가 만든 웹의 규약을 바탕으로 마크 안드레센과 동료들은 1993년 모자이크 브라우저를 공개했다. 모자이크는 글과 이미지를 한 화면에서 쉽게 볼 수 있게 해 웹의 대중화를 도왔다.',
  note_en: 'Building on the web protocols created by Tim Berners-Lee, Marc Andreessen and his colleagues released the Mosaic browser in 1993. Its accessible display of text and images helped bring the web to a wider public.',
})

replace('닥 홀리데이', '와이어트 어프', 'friend', {
  note: '닥 홀리데이와 와이어트 어프는 1881년 오케이 코랄 총격에서 어프 형제들과 함께 싸웠다. 홀리데이는 이듬해 와이어트 어프가 이끈 복수 원정에도 동행했다.',
  note_en: 'Doc Holliday and Wyatt Earp fought alongside the Earp brothers in the 1881 gunfight near the O.K. Corral. Holliday also joined the vendetta ride led by Wyatt Earp the following year.',
})

replace('카르나', '아르주나', 'rival', {
  note: '카르나와 아르주나는 《마하바라타》에서 서로 맞선 궁수이자 이복형제였다. 쿠루크셰트라 전쟁에서 카르나의 전차 바퀴가 땅에 빠지자, 아르주나는 크리슈나의 재촉을 받고 화살을 쏘아 카르나를 죽였다.',
  note_en: 'Karna and Arjuna were rival archers and half-brothers in the Mahabharata. During the Kurukshetra war, when Karna\'s chariot wheel sank into the ground, Arjuna shot and killed him at Krishna\'s urging.',
})

replace('샤 루흐', '티무르 베그 구르카니', 'father', {
  note: '티무르 베그 구르카니는 샤 루흐의 아버지였다. 티무르가 1405년 죽은 뒤 샤 루흐는 호라산을 중심으로 권력을 굳히고 헤라트를 티무르 왕조의 학문과 예술 중심지로 키웠다.',
  note_en: 'Timur was the father of Shah Rukh. After Timur died in 1405, Shah Rukh consolidated power from Khurasan and developed Herat into a major Timurid center of scholarship and art.',
})

replace('셀렌 디온', '프레디 머큐리', 'influence', {
  note: '프레디 머큐리가 부른 퀸의 《The Show Must Go On》은 셀렌 디온이 남편을 떠나보낸 뒤 다시 무대에 설 때 고른 노래였다. 셀렌 디온은 2016년 빌보드 뮤직 어워즈에서 이 곡을 공연했다.',
  note_en: "Queen's The Show Must Go On, sung by Freddie Mercury, was the song Celine Dion chose as she returned to the stage after her husband's death. Dion performed it at the 2016 Billboard Music Awards.",
})

drop('육손', '왕충', 'influence')

replace('헤르만 헤세', '프리드리히 니체', 'influence', {
  note: '헤르만 헤세는 프리드리히 니체를 오랫동안 읽고 글과 편지에서 여러 차례 언급했다. 니체의 자기 극복과 기존 가치에 대한 비판은 《데미안》과 《황야의 이리》를 해석하는 중요한 사상적 배경이 됐다.',
  note_en: "Hermann Hesse read Friedrich Nietzsche over many years and referred to him repeatedly in essays and letters. Nietzsche's ideas of self-overcoming and the critique of inherited values form an important intellectual background to Demian and Steppenwolf.",
})

replace('킴벌 머스크', '일론 머스크', 'cofounder', {
  note: '킴벌 머스크와 일론 머스크는 1995년 그레그 쿠리와 함께 온라인 지역 정보 회사 Zip2의 전신을 창업했다. 1999년 컴팩이 Zip2를 인수하면서 두 사람은 첫 회사를 매각했다.',
  note_en: 'Kimbal Musk and Elon Musk co-founded the company that became Zip2 with Greg Kouri in 1995. Compaq acquired Zip2 in 1999, completing the sale of their first company.',
})

replace('다니엘라 아모데이', '샘 알트만', 'rival', {
  rel_type: 'colleague',
  rel_group: 'career',
  note: '다니엘라 아모데이는 샘 알트만이 이끌던 OpenAI에서 안전·정책 부문 부사장으로 일했다. OpenAI를 떠난 뒤 2021년 Anthropic을 공동 창업해 대표를 맡았다.',
  note_en: 'Daniela Amodei served as vice president of safety and policy at OpenAI while Sam Altman led the organization. After leaving OpenAI, she co-founded Anthropic in 2021 and became its president.',
})

replace('형가', '진시황', 'rival', {
  note: '기원전 227년 형가는 연나라의 사신으로 진시황을 찾아가 지도 속에 숨긴 비수로 암살을 시도했다. 진시황은 공격을 피했고, 형가는 붙잡혀 죽었다.',
  note_en: 'In 227 BCE, Jing Ke approached Qin Shi Huang as an envoy of Yan and attempted to assassinate him with a dagger hidden in a map. Qin Shi Huang escaped the attack, and Jing Ke was killed.',
})

replace('일론 머스크', '도널드 트럼프', 'rival', {
  rel_type: 'colleague',
  rel_group: 'career',
  note: '일론 머스크는 도널드 트럼프의 2024년 대선 운동을 지원하고 트럼프 행정부의 정부효율부 활동에 참여했다. 두 사람은 2025년 예산 법안을 두고 공개적으로 충돌했지만 이후 다시 연락을 주고받았다.',
  note_en: "Elon Musk supported Donald Trump's 2024 presidential campaign and took part in the Trump administration's government-efficiency effort. The two clashed publicly over a spending bill in 2025 but later resumed contact.",
})

replace('손책', '대교', 'spouse', {
  note: '손책은 199년 주유와 함께 완현을 점령한 뒤 대교와 혼인했다. 두 사람의 혼인은 손책이 이듬해 죽으면서 오래 이어지지 못했다.',
  note_en: 'After taking Wan County with Zhou Yu in 199, Sun Ce married Da Qiao. Their marriage was brief because Sun Ce died the following year.',
})

replace('헬레나', '아프로디테', 'influence', {
  note: '《일리아스》 3권에서 아프로디테는 헬레나(헬레네)를 파리스의 침실로 데려가려 했다. 헬레나가 거부하자 아프로디테는 그를 위협했고, 헬레나는 결국 파리스에게 갔다.',
  note_en: 'In Book 3 of the Iliad, Aphrodite tried to take Helen to the bedchamber of Paris. When Helen resisted, Aphrodite threatened her, and Helen eventually went to Paris.',
})

replace('주유', '소교', 'spouse', {
  note: '주유는 199년 손책과 함께 완현을 점령한 뒤 소교와 혼인했다. 같은 기록은 손책이 대교와 혼인했다고 전한다.',
  note_en: 'After taking Wan County with Sun Ce in 199, Zhou Yu married Xiao Qiao. The same account records that Sun Ce married her elder sister Da Qiao.',
})

replace('티모테 라크루아', '아르투르 멘쉬', 'cofounder', {
  note: '티모테 라크루아와 아르투르 멘쉬는 기욤 랑플과 함께 2023년 Mistral AI를 공동 창업했다. 멘쉬는 대표, 라크루아는 기술 책임자를 맡았다.',
  note_en: 'Timothee Lacroix and Arthur Mensch co-founded Mistral AI with Guillaume Lample in 2023. Mensch became CEO and Lacroix became CTO.',
})

replace('김유정', '이상', 'friend', {
  note: '김유정과 이상은 1930년대 구인회에서 함께 활동했고 두 사람 모두 폐결핵을 앓았다. 김유정이 1937년 3월 29일, 이상이 4월 17일 세상을 떠난 뒤 같은 해 5월 두 사람을 함께 기리는 추도회가 열렸다.',
  note_en: 'Kim Yu-jeong and Yi Sang were active in the Guinhoe literary circle in the 1930s, and both suffered from tuberculosis. Kim died on March 29, 1937, and Yi Sang on April 17; a joint memorial for them was held that May.',
})

replace('넬슨 만델라', '리처드 브랜슨', 'cofounder', {
  note: '리처드 브랜슨과 피터 가브리엘은 세계 원로 지도자 모임의 구상을 넬슨 만델라에게 제안했다. 만델라는 2007년 7월 18일 The Elders를 출범시켰고, 브랜슨은 창립 후원자로 참여했다.',
  note_en: 'Richard Branson and Peter Gabriel brought the idea of a group of global elders to Nelson Mandela. Mandela launched The Elders on July 18, 2007, and Branson supported it as a founder and funder.',
})

replace('게오르크 빌헬름 프리드리히 헤겔', '나폴레옹 보나파르트', 'influence', {
  note: '1806년 10월 13일 게오르크 빌헬름 프리드리히 헤겔은 예나를 지나는 나폴레옹 보나파르트를 보고 친구 니트함머에게 그를 ‘세계정신’이라고 적었다. 프랑스군의 진격은 헤겔이 역사 속 보편적 변화와 개인의 역할을 생각하는 구체적 장면이 됐다.',
  note_en: 'On October 13, 1806, Georg Wilhelm Friedrich Hegel saw Napoleon Bonaparte passing through Jena and described him to his friend Niethammer as the world spirit. The French advance gave Hegel a concrete scene through which to consider universal historical change and the role of an individual.',
})

replace('카림 압둘 자바', '브루스 리', 'teacher', {
  note: '카림 압둘 자바는 1960년대 후반 브루스 리에게 절권도를 배웠다. 두 사람은 이후 《사망유희》에서 사제 간 대결 장면을 함께 촬영했다.',
  note_en: 'Kareem Abdul-Jabbar studied Jeet Kune Do under Bruce Lee in the late 1960s. They later filmed a confrontation between teacher and student for The Game of Death.',
})

replace('김광현', '류현진', 'rival', {
  note: '김광현과 류현진은 오랫동안 한국을 대표하는 좌완 선발투수로 비교됐다. 2010년 예정된 첫 선발 맞대결은 비로 취소됐고, 2025년 7월 26일 대전에서 처음 성사된 맞대결은 김광현의 SSG가 9대3으로 이겼다.',
  note_en: 'Kim Kwang-hyun and Ryu Hyun-jin have long been compared as leading Korean left-handed starters. Their scheduled first matchup in 2010 was rained out; when they finally started against each other in Daejeon on July 26, 2025, Kim’s SSG won 9–3.',
})

const zisiMencius = findPair('자사', '맹자', 'teacher')
const zisiId = zisiMencius.from_name === '자사' ? zisiMencius.from_id : zisiMencius.to_id
const menciusId = zisiMencius.from_name === '맹자' ? zisiMencius.from_id : zisiMencius.to_id
decisions[zisiMencius.fact_key] = {
  action: 'replace',
  from_id: menciusId,
  to_id: zisiId,
  rel_type: 'influence',
  rel_group: 'thought',
  note: '맹자는 자사 본인에게 직접 배우지 않았고, 전승에서는 자사의 제자들에게 수학한 것으로 전해진다. 자사 계통의 유학은 맹자가 성선설과 왕도정치를 전개하는 사상적 배경이 됐다.',
  note_en: 'Mencius did not study directly under Zisi; tradition instead places him among students of Zisi’s disciples. The Confucian lineage associated with Zisi became an intellectual background for Mencius’s account of human nature and kingly government.',
}

replace('손책', '손상향', 'sibling', {
  note: '손책과 손상향은 손견의 자녀로, 손책이 오빠였다. 손상향은 훗날 손권이 유비와의 동맹을 위해 혼인시킨 누이로 기록됐다.',
  note_en: 'Sun Ce and Lady Sun, later known as Sun Shangxiang, were children of Sun Jian, with Sun Ce being her older brother. She was later recorded as the sister whom Sun Quan married to Liu Bei as part of an alliance.',
})

replace('엠버 허드', '일론 머스크', 'partner', {
  note: '엠버 허드와 일론 머스크는 2017년 연인 관계를 공개했고 그해 8월 결별을 알렸다. 이후 잠시 다시 만났지만 2018년 초 관계를 끝냈다.',
  note_en: 'Amber Heard and Elon Musk made their relationship public in 2017 and announced a breakup that August. They briefly reunited before ending the relationship again in early 2018.',
})

replace('유선', '감부인', 'mother', {
  note: '감부인은 유선의 생모였다. 208년 당양 장판에서 유비가 감부인과 어린 유선을 뒤에 남긴 채 달아났을 때 조운이 두 사람을 보호해 돌아왔다.',
  note_en: 'Lady Gan was Liu Shan’s mother. At Changban in 208, Liu Bei fled after leaving Lady Gan and the young Liu Shan behind, and Zhao Yun protected them and brought them back.',
})

replace('여포', '조조', 'rival', {
  note: '여포는 조조와 복양과 하비에서 싸웠다. 198년 하비가 함락된 뒤 여포는 부하들에게 붙잡혀 조조에게 넘겨졌고, 조조는 그를 교살했다.',
  note_en: 'Lü Bu fought Cao Cao at Puyang and Xiapi. After Xiapi fell in 198, Lü Bu was seized by his own men and handed to Cao Cao, who had him strangled.',
})

replace('샘 알트만', '안드레 카파시', 'cofounder', {
  note: 'OpenAI가 2015년 출범할 때 샘 알트만은 공동 의장을 맡았고 안드레 카파시는 연구자 창립 멤버로 참여했다. 카파시는 2017년까지 OpenAI에서 연구한 뒤 테슬라로 옮겼다.',
  note_en: 'When OpenAI launched in 2015, Sam Altman served as a co-chair and Andrej Karpathy joined as a founding research member. Karpathy conducted research at OpenAI until leaving for Tesla in 2017.',
})

const russellBoole = findPair('버트런드 러셀', '조지 부울', 'influence')
const russellId = russellBoole.from_name === '버트런드 러셀' ? russellBoole.from_id : russellBoole.to_id
const booleId = russellBoole.from_name === '조지 부울' ? russellBoole.from_id : russellBoole.to_id
decisions[russellBoole.fact_key] = {
  action: 'replace',
  from_id: booleId,
  to_id: russellId,
  rel_type: 'influence',
  rel_group: 'thought',
  note: '조지 부울이 논리를 대수로 다룬 작업은 버트런드 러셀의 수리논리학보다 앞선 토대였다. 러셀은 1901년 부울의 《사고의 법칙》을 두고 순수수학이 발견된 저작이라고 평가했다.',
  note_en: 'George Boole’s algebraic treatment of logic preceded Bertrand Russell’s work in mathematical logic. In 1901 Russell described Boole’s Laws of Thought as the work in which pure mathematics was discovered.',
}

const output = {
  source_sha256: prepared.source_sha256,
  decision_count: Object.keys(decisions).length,
  decisions,
}
writeFileSync(resolve(dir, 'review-decisions.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ decision_count: output.decision_count }, null, 2))
