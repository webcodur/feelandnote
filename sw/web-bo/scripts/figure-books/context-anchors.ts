export type ContextAnchor = {
  key: string
  label: string
  patterns: RegExp[]
  profilePatterns?: RegExp[]
  bookPatterns?: RegExp[]
}

const anchor = (key: string, label: string, ...patterns: RegExp[]): ContextAnchor => ({
  key,
  label,
  patterns,
})

const splitAnchor = (
  key: string,
  label: string,
  profilePatterns: RegExp[],
  bookPatterns: RegExp[],
): ContextAnchor => ({
  key,
  label,
  patterns: [],
  profilePatterns,
  bookPatterns,
})

const KOREAN_ROLE_ENDING = String.raw`(?:로서|로|이며|이고|이자|였다|였고|이다|인|가|는|의|와|과)?(?=$|[^\p{L}\p{N}])`

/**
 * 프로필과 책 양쪽에 같은 항목이 나타날 때만 쓰는 구체 맥락 사전이다.
 * 직군명이나 성공·리더십 같은 일반어는 넣지 않는다.
 */
export const CONTEXT_ANCHORS: ContextAnchor[] = [
  // 스포츠
  anchor('football', '축구', /축구|풋볼|football|soccer|프리미어\s*리그|챔피언스\s*리그/iu),
  anchor('baseball', '야구', /야구|baseball|메이저\s*리그|메이저리그|MLB\b/iu),
  anchor('basketball', '농구', /농구|basketball|NBA\b/iu),
  anchor('tennis', '테니스', /테니스|tennis|윔블던/iu),
  anchor('golf', '골프', /골프|golf|PGA\b|LPGA\b/iu),
  anchor('boxing', '복싱', /복싱|권투|boxing|헤비급|라이트급|웰터급/iu),
  anchor('mma', '종합격투기', /종합\s*격투기|격투기|MMA\b|UFC\b/iu),
  anchor('swimming', '수영', /수영|swimming|자유형|배영|평영|접영/iu),
  anchor('athletics', '육상', /육상|단거리\s*(?:달리기|육상|경주|선수)|높이뛰기|멀리뛰기|athletics|track\s+and\s+field/iu),
  anchor('distance-running', '장거리 달리기', /마라톤|장거리\s*(?:달리기|육상|경주|주자)|marathon|distance\s+running/iu),
  anchor('gymnastics', '체조', /체조|gymnastics|도마|평행봉/iu),
  anchor('figure-skating', '피겨스케이팅', /피겨\s*스케이팅|figure\s*skat/iu),
  anchor('speed-skating', '스피드스케이팅', /스피드\s*스케이팅|speed\s*skat|쇼트트랙/iu),
  anchor('volleyball', '배구', /배구|volleyball/iu),
  anchor('badminton', '배드민턴', /배드민턴|badminton/iu),
  anchor('table-tennis', '탁구', /탁구|table\s*tennis|ping[ -]?pong/iu),
  splitAnchor(
    'cycling',
    '사이클',
    [/자전거\s*(?:경주|선수)|사이클\s*(?:선수|경기|레이서)|cycling|투르\s*드\s*프랑스/iu],
    [/자전거|사이클링|cycling|투르\s*드\s*프랑스/iu],
  ),
  anchor('cricket', '크리켓', /크리켓|cricket/iu),
  anchor('american-football', '미식축구', /미식\s*축구|american\s*football|NFL\b|슈퍼볼/iu),
  anchor('rugby', '럭비', /럭비|rugby/iu),
  anchor('motorsport', '모터스포츠', /모터\s*스포츠|포뮬러\s*원|formula\s*1|F1\b|레이싱/iu),
  anchor('esports', 'e스포츠', /e스포츠|이스포츠|esports|프로게이머|리그\s*오브\s*레전드/iu),
  anchor('league-of-legends', '리그 오브 레전드', /리그\s*오브\s*레전드|League\s*of\s*Legends|LoL\b/iu),
  anchor('chess', '체스', /(?<![\p{L}\p{N}])체스(?![\p{L}\p{N}])|\bchess\b/iu),
  anchor('olympics', '올림픽', /올림픽|olympic/iu),

  // 음악·공연
  anchor('jazz', '재즈', /재즈|jazz|비밥|bebop|스윙\s*재즈/iu),
  anchor('hiphop', '힙합', /힙합|hip[ -]?hop|래퍼|랩\s*음악|rap\s+music/iu),
  anchor('rock-music', '록 음악', /록\s*음악|록\s*밴드|로큰롤|rock\s*music|rock\s*band|rock[’']n[’']roll/iu),
  anchor('metal-music', '메탈 음악', /헤비\s*메탈|heavy\s*metal|메탈\s*밴드/iu),
  anchor('punk-music', '펑크 록', /펑크\s*록|punk\s*rock|펑크\s*밴드/iu),
  anchor('classical-music', '클래식 음악', /클래식\s*음악|고전\s*음악|classical\s*music|교향곡|협주곡/iu),
  anchor('opera', '오페라', /오페라|opera|소프라노|테너|바리톤/iu),
  anchor('musical-theatre', '뮤지컬', /뮤지컬|musical\s*theat/iu),
  anchor('country-music', '컨트리 음악', /컨트리\s*음악|country\s*music/iu),
  anchor('electronic-music', '전자음악', /전자\s*음악|일렉트로닉|electronic\s*music|테크노|하우스\s*뮤직/iu),
  anchor('kpop', 'K-pop', /K[ -]?pop|케이팝|아이돌(?:\s*그룹)?|보이\s*그룹|걸\s*그룹/iu),
  anchor('popular-music', '대중음악', /대중\s*음악|팝\s*(?:음악|가수)|싱어송라이터|음악\s*프로듀서|popular\s*music|pop\s*(?:music|singer)/iu),
  anchor('piano', '피아노', /피아노|piano|피아니스트/iu),
  anchor('violin', '바이올린', /바이올린|violin|바이올리니스트/iu),
  anchor('guitar', '기타', /기타리스트|기타\s*연주|guitar|acoustic\s*guitar/iu),
  anchor('drums', '드럼', /드러머|드럼\s*연주|drummer|drumming/iu),
  anchor('conducting', '지휘', /지휘자|오케스트라\s*지휘|conductor|conducting/iu),
  anchor('songwriting', '작곡·송라이팅', /작곡가|작곡법|송라이터|songwrit|composition/iu),
  anchor('ballet', '발레', /발레|ballet|발레리나/iu),
  anchor('dance', '무용·춤', /무용|안무|춤|choreograph|댄서|dancer/iu),

  // 자연과학·의학·기술
  anchor('physics', '물리학', /물리학|물리학자|physics/iu),
  anchor('quantum', '양자과학', /양자\s*(역학|물리|이론|컴퓨팅)|quantum/iu),
  anchor('relativity', '상대성이론', /상대성\s*(이론|원리)|relativity/iu),
  anchor('astronomy', '천문학', /천문학|천문학자|astronomy|천체\s*물리/iu),
  anchor('space-science', '우주과학', /우주\s*(과학|탐사|비행|개발)|space\s*(science|exploration|flight)|NASA\b/iu),
  anchor('chemistry', '화학', /화학|화학자|chemistry|유기\s*화학|무기\s*화학/iu),
  anchor('biology', '생물학', /생물학|생물학자|biology|분자\s*생물/iu),
  anchor('genetics', '유전학', /유전학|유전체|게놈|genetic|genome|DNA\b/iu),
  anchor('evolution', '진화론', /진화론|진화\s*생물|evolution|자연\s*선택/iu),
  anchor('ecology', '생태학', /생태학|생태계|ecology|ecosystem/iu),
  anchor('climate', '기후과학', /기후\s*(변화|과학|위기)|지구\s*온난화|climate\s*(change|science|crisis)/iu),
  anchor('geology', '지질학', /지질학|지질학자|geology|지구과학|판구조론/iu),
  splitAnchor(
    'medicine',
    '의학',
    [new RegExp(String.raw`(?<!교)의학|(?<![\p{L}\p{N}])의사${KOREAN_ROLE_ENDING}|임상\s*의학|medicine|medical|physician|doctor|외과|내과`, 'iu')],
    [/(?<!교)의학|임상\s*의학|medicine|medical|외과|내과|질병|치료|진단/iu],
  ),
  anchor('epidemiology', '역학·감염병', /역학\s*연구|감염병|전염병|epidemiolog|pandemic/iu),
  anchor('neuroscience', '신경과학', /신경\s*과학|뇌\s*과학|neuroscience|신경학/iu),
  anchor('psychology', '심리학', /심리학|심리학자|psychology|정신분석/iu),
  anchor('mathematics', '수학', /수학|수학자|mathematics|기하학|대수학|정수론/iu),
  anchor('statistics', '통계학', /통계학|통계\s*분석|statistics|확률론/iu),
  anchor('computer-science', '컴퓨터과학', /컴퓨터\s*과학|전산학|computer\s*science|소프트웨어\s*공학|프로그래밍/iu),
  anchor('artificial-intelligence', '인공지능', /인공\s*지능|AI\b|artificial\s*intelligence|머신\s*러닝|기계\s*학습|딥러닝/iu),
  anchor('cryptography', '암호학', /암호학|암호화|cryptograph|cryptology/iu),
  anchor('internet', '인터넷', /인터넷|월드\s*와이드\s*웹|world\s*wide\s*web|웹\s*브라우저/iu),
  anchor('semiconductor', '반도체', /반도체|집적\s*회로|마이크로칩|semiconductor|integrated\s*circuit/iu),
  anchor('robotics', '로봇공학', /로봇\s*공학|로보틱스|robotics/iu),
  anchor('aviation', '항공', /항공\s*(공학|산업|기술|역사)|비행기|aviation|aeronautic/iu),
  anchor('energy', '에너지 기술', /원자력|핵에너지|태양광|풍력\s*발전|재생\s*에너지|energy\s*technology/iu),

  // 인문·사회
  splitAnchor(
    'philosophy',
    '철학',
    [new RegExp(String.raw`(?<![\p{L}\p{N}])철학자${KOREAN_ROLE_ENDING}|철학\s*(?:연구|전공|교수)|철학을\s*(?:연구|전공)|\bphilosopher\b|professor\s+of\s+philosophy|형이상학|인식론|윤리학`, 'iu')],
    [/철학|철학자|philosophy|형이상학|인식론|윤리학/iu],
  ),
  anchor('existentialism', '실존주의', /실존주의|existentialis/iu),
  anchor('stoicism', '스토아 철학', /스토아|stoicis/iu),
  anchor('confucianism', '유교', /유교|유학자|성리학|confucian/iu),
  anchor('buddhism', '불교', /불교|불경|선불교|buddhis/iu),
  anchor('christianity', '기독교', /기독교|그리스도교|성서|신학|christian|theology/iu),
  anchor('islam', '이슬람', /이슬람|코란|꾸란|islam|quran|koran/iu),
  anchor('economics', '경제학', /경제학|경제학자|economics|거시경제|미시경제/iu),
  anchor('behavioral-economics', '행동경제학', /행동\s*경제학|behavioral\s*economics/iu),
  anchor('sociology', '사회학', /사회학|사회학자|sociology/iu),
  anchor('anthropology', '인류학', /인류학|인류학자|anthropology|민족지/iu),
  anchor('linguistics', '언어학', /언어학|언어학자|linguistics|문법학/iu),
  anchor('law', '법학', /법학|법률|헌법학|법철학|jurisprudence|legal\s*theory/iu),
  anchor('political-theory', '정치사상', /정치\s*(사상|철학|이론|학)|정치학|political\s*(thought|philosophy|theory|science)/iu),
  anchor('democracy', '민주주의', /민주주의|democracy|민주화/iu),
  anchor('communism', '공산주의', /공산주의|마르크스주의|communis|marxism/iu),
  anchor('feminism', '여성주의', /여성주의|페미니즘|feminis/iu),
  anchor('civil-rights', '민권운동', /민권\s*운동|인권\s*운동|civil\s*rights/iu),
  anchor('education', '교육학', /교육학|교육\s*철학|교육\s*개혁|pedagogy|education\s*theory/iu),
  anchor('archaeology', '고고학', /고고학|고고학자|archaeology|유적\s*발굴/iu),

  // 경영·금융·산업
  anchor('entrepreneurship', '창업', /창업|스타트업|벤처\s*기업|entrepreneurship|startup/iu),
  anchor('management', '경영', /경영학|경영\s*전략|기업\s*경영|management\s*(theory|strategy)/iu),
  anchor('marketing', '마케팅', /마케팅|브랜딩|marketing|branding/iu),
  anchor('investing', '투자', /투자자|투자\s*(원칙|전략|분석)|주식\s*투자|가치\s*투자|investing|investment\s*strategy/iu),
  anchor('finance', '금융', /금융|재무|월스트리트|finance|financial\s*market/iu),
  anchor('venture-capital', '벤처투자', /벤처\s*캐피털|벤처\s*투자|venture\s*capital/iu),
  anchor('advertising', '광고', /광고\s*(산업|기획|역사)|advertising/iu),
  anchor('fashion', '패션', /패션\s*(산업|디자인|디자이너|역사)|의류\s*디자이너|fashion\s*(industry|design|designer|history)/iu),
  anchor('automobile-industry', '자동차 산업', /자동차\s*(산업|경영|역사)|automotive\s*industry/iu),

  // 예술·미디어
  splitAnchor(
    'film',
    '영화',
    [/영화\s*(?:감독|연출|제작|산업|역사|이론|미학)|cinema|filmmaking|film\s*(?:director|history|theory)/iu],
    [/영화\s*(?:연출|제작|산업|역사|이론|미학)|영화를\s*만든다는\s*것|예술로서의\s*영화|시네마토그라프|cinema|filmmaking|film\s*(?:history|theory)/iu],
  ),
  splitAnchor(
    'acting',
    '연기',
    [new RegExp(String.raw`영화\s*배우|(?<![\p{L}\p{N}])배우${KOREAN_ROLE_ENDING}|연기자|연기\s*(?:이론|훈련|방법론|활동)|actor|acting`, 'iu')],
    [/스크린\s*연기|연기\s*(?:이론|훈련|방법론|기술|수업)|메소드\s*연기|acting\s*(?:theory|technique|method)/iu],
  ),
  anchor('theatre', '연극', /연극|희곡|극작|theatre|theater|dramaturg/iu),
  anchor('photography', '사진', /사진\s*(예술|역사|이론|촬영)|사진가|photograph/iu),
  splitAnchor(
    'painting',
    '회화',
    [new RegExp(String.raw`회화|(?<![\p{L}\p{N}])화가${KOREAN_ROLE_ENDING}|유화|수채화|painting|painter`, 'iu')],
    [/회화|미술\s*(?:사|이론|비평|감상)|그림\s*(?:의|을|읽)|유화|수채화|painting/iu],
  ),
  anchor('sculpture', '조각', /조각가|조각\s*예술|sculpture|sculptor/iu),
  splitAnchor(
    'architecture',
    '건축',
    [/건축가|건축\s*(?:설계|활동|사무소)|architecture|architect/iu],
    [/건축|건축가|architecture|architect/iu],
  ),
  splitAnchor(
    'design',
    '디자인',
    [/(?:그래픽|산업|제품|자동차|인터랙션)\s*(?:디자인|디자이너)|design\s*(?:history|theory|practice|designer)/iu],
    [/(?:그래픽|산업|제품|자동차|인터랙션)\s*디자인|디자인과\s*인간\s*심리|design\s*(?:history|theory|practice)/iu],
  ),
  anchor('animation', '애니메이션', /애니메이션|animation|애니메이터/iu),
  anchor('comics', '만화', /만화|그래픽\s*노블|코믹스|manga|comics|graphic\s*novel/iu),
  anchor('science-fiction', '과학소설', /과학\s*소설|SF\s*소설|science\s*fiction/iu),
  anchor('fantasy-literature', '판타지 문학', /판타지\s*(문학|소설)|fantasy\s*(literature|novel)/iu),
  anchor('detective-fiction', '추리문학', /추리\s*(문학|소설)|미스터리\s*소설|detective\s*fiction|mystery\s*novel/iu),
  anchor('poetry', '시·시학', /시인|시집|시학|poetry|poet/iu),
  splitAnchor(
    'writing',
    '글쓰기',
    [/소설가|산문가|에세이스트|극작가|시나리오\s*작가|기자|저널리스트|novelist|essayist|journalist|screenwriter/iu],
    [/글쓰기|작법|소설\s*쓰기|writing\s*(?:craft|practice)|creative\s*writing/iu],
  ),

  // 군사·역사적 맥락
  splitAnchor(
    'military-strategy',
    '군사전략',
    [/군사\s*전략|전쟁\s*전략|군사\s*이론가|군사\s*전략가|야전\s*지휘관|총사령관|사령관|제독|장군|military\s*strategist|\bcommander\b|\badmiral\b|\bgeneral\b/iu],
    [/군사\s*전략|전쟁\s*전략|전략론|손자병법|military\s*strategy/iu],
  ),
  anchor('naval-warfare', '해전·해군', /해전|해군|naval\s*warfare|navy\s*history/iu),
  anchor('air-warfare', '공중전', /공중전|공군|air\s*warfare|air\s*force/iu),
  anchor('guerrilla-warfare', '게릴라전', /게릴라|유격전|guerrilla\s*warfare/iu),
  anchor('world-war-one', '제1차 세계대전', /제\s*1차\s*세계\s*대전|1차\s*세계\s*대전|world\s*war\s*(i|one)\b/iu),
  anchor('world-war-two', '제2차 세계대전', /제\s*2차\s*세계\s*대전|2차\s*세계\s*대전|world\s*war\s*(ii|two)\b/iu),
  anchor('korean-war', '한국전쟁', /한국\s*전쟁|6[·.]25|korean\s*war/iu),
  anchor('vietnam-war', '베트남전쟁', /베트남\s*전쟁|vietnam\s*war/iu),
  anchor('cold-war', '냉전', /냉전|cold\s*war/iu),
  anchor('french-revolution', '프랑스혁명', /프랑스\s*혁명|french\s*revolution/iu),
  anchor('industrial-revolution', '산업혁명', /산업\s*혁명|industrial\s*revolution/iu),
  anchor('american-revolution', '미국독립혁명', /미국\s*독립\s*(전쟁|혁명)|american\s*revolution/iu),
  anchor('civil-war-us', '미국 남북전쟁', /미국\s*남북\s*전쟁|american\s*civil\s*war/iu),
  anchor('renaissance', '르네상스', /르네상스|renaissance/iu),
  anchor('ancient-greece', '고대 그리스', /고대\s*그리스|ancient\s*greece/iu),
  anchor('ancient-rome', '고대 로마', /고대\s*로마|로마\s*제국|ancient\s*rome|roman\s*empire/iu),
  anchor('three-kingdoms', '삼국지·삼국시대', /삼국지|삼국\s*시대|three\s*kingdoms/iu),
  anchor('mongol-empire', '몽골제국', /몽골\s*제국|mongol\s*empire/iu),
  anchor('napoleonic-wars', '나폴레옹전쟁', /나폴레옹\s*전쟁|napoleonic\s*wars?/iu),
  anchor('meiji-restoration', '메이지유신', /메이지\s*유신|meiji\s*restoration/iu),
  anchor('colonialism', '식민주의', /식민주의|제국주의|colonialis|imperialis/iu),
]

const PROFILE_ANCHOR_PROFESSIONS: Readonly<Record<string, readonly string[]>> = {
  football: ['athlete'],
  baseball: ['athlete'],
  basketball: ['athlete'],
  tennis: ['athlete'],
  golf: ['athlete'],
  boxing: ['athlete'],
  mma: ['athlete'],
  swimming: ['athlete'],
  athletics: ['athlete'],
  'distance-running': ['athlete'],
  gymnastics: ['athlete'],
  'figure-skating': ['athlete'],
  'speed-skating': ['athlete'],
  volleyball: ['athlete'],
  badminton: ['athlete'],
  'table-tennis': ['athlete'],
  cycling: ['athlete'],
  cricket: ['athlete'],
  'american-football': ['athlete'],
  rugby: ['athlete'],
  motorsport: ['athlete'],
  esports: ['athlete'],
  'league-of-legends': ['athlete'],
  chess: ['athlete'],
  olympics: ['athlete'],
  kpop: ['musician'],
  'popular-music': ['musician'],
  songwriting: ['musician'],
  film: ['actor', 'director'],
  acting: ['actor', 'director'],
  painting: ['visual_artist'],
  sculpture: ['visual_artist'],
  architecture: ['visual_artist'],
  writing: ['author'],
  'military-strategy': ['commander', 'politician', 'leader'],
}

export function profileContextText(value: string): string {
  return value
    .replace(/[「『“‘'"][^」』”’'"]{1,80}[」』”’'"]\s*(?:(?:이?라는|이란)\s*)?(?:별명|별칭|애칭)(?:으로)?/gu, '')
    .replace(/노벨\s*(?:물리학|화학|생리(?:학[·ㆍ/]?)?의학|경제학)상/gu, '노벨상')
    .replace(/(?:경영|통치|교육|인생)\s*철학/gu, '')
}

export function findContextAnchorKeys(
  text: string,
  surface: 'profile' | 'book',
  profession?: string | null,
): string[] {
  if (!text.trim()) return []
  return CONTEXT_ANCHORS
    .filter((item) => {
      const professions = PROFILE_ANCHOR_PROFESSIONS[item.key]
      if (surface === 'profile' && profession && professions && !professions.includes(profession)) {
        return false
      }
      const patterns = surface === 'profile'
        ? item.profilePatterns ?? item.patterns
        : item.bookPatterns ?? item.patterns
      return patterns.some((pattern) => pattern.test(text))
    })
    .map((item) => item.key)
}
