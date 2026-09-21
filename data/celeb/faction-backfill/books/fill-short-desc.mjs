// 빈 short_desc/short_desc_en 채우기 — 세력·그룹 맥락 + 국적·직업으로 사실적 한 줄 생성.
// node --env-file=sw/web-bo/.env data/celeb/faction-backfill/books/fill-short-desc.mjs [--apply]
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { restAll } from './_rest.mjs'

const PLAN_PATH = new URL('./fill-desc-plan.json', import.meta.url)
const oldPlan = existsSync(PLAN_PATH) ? JSON.parse(readFileSync(PLAN_PATH, 'utf8')) : []
const oldById = new Map(oldPlan.map((p) => [p.id, p.ko]))

const APPLY = process.argv.includes('--apply')
const BASE = () => `${process.env.NEXT_PUBLIC_DB_API_URL}/rest/v1`
const KEY = () => process.env.DB_SECRET_KEY
const H = () => ({ apikey: KEY(), Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json' })

const NAT = {
  US:['미국','American'], IN:['인도','Indian'], FR:['프랑스','French'], GB:['영국','British'],
  DE:['독일','German'], CN:['중국','Chinese'], SE:['스웨덴','Swedish'], CA:['캐나다','Canadian'],
  JP:['일본','Japanese'], IT:['이탈리아','Italian'], IL:['이스라엘','Israeli'], RU:['러시아','Russian'],
  NO:['노르웨이','Norwegian'], DK:['덴마크','Danish'], IE:['아일랜드','Irish'], KR:['한국','South Korean'],
  SU:['소련','Soviet'], PK:['파키스탄','Pakistani'], NL:['네덜란드','Dutch'], BE:['벨기에','Belgian'],
  EG:['이집트','Egyptian'], IQ:['이라크','Iraqi'], AU:['호주','Australian'], HU:['헝가리','Hungarian'],
  BG:['불가리아','Bulgarian'], ET:['에티오피아','Ethiopian'], GR:['그리스','Greek'], BR:['브라질','Brazilian'],
  NG:['나이지리아','Nigerian'], TR:['튀르키예','Turkish'], ZA:['남아공','South African'],
  CS:['체코슬로바키아','Czechoslovak'], IR:['이란','Iranian'], ID:['인도네시아','Indonesian'],
  MY:['말레이시아','Malaysian'], MX:['멕시코','Mexican'], CH:['스위스','Swiss'], PT:['포르투갈','Portuguese'],
  FI:['핀란드','Finnish'], ES:['스페인','Spanish'], PL:['폴란드','Polish'], AT:['오스트리아','Austrian'],
  CZ:['체코','Czech'], UA:['우크라이나','Ukrainian'], RO:['루마니아','Romanian'], HR:['크로아티아','Croatian'],
  RS:['세르비아','Serbian'], BA:['보스니아','Bosnian'], AL:['알바니아','Albanian'], MK:['북마케도니아','North Macedonian'],
  ME:['몬테네그로','Montenegrin'], GE:['조지아','Georgian'], AM:['아르메니아','Armenian'], AZ:['아제르바이잔','Azerbaijani'],
  KZ:['카자흐스탄','Kazakh'], UZ:['우즈베키스탄','Uzbek'], TM:['투르크메니스탄','Turkmen'], TJ:['타지키스탄','Tajik'],
  KG:['키르기스스탄','Kyrgyz'], MN:['몽골','Mongolian'], NP:['네팔','Nepalese'], BT:['부탄','Bhutanese'],
  LK:['스리랑카','Sri Lankan'], BD:['방글라데시','Bangladeshi'], MV:['몰디브','Maldivian'], TH:['태국','Thai'],
  VN:['베트남','Vietnamese'], PH:['필리핀','Filipino'], KH:['캄보디아','Cambodian'], LA:['라오스','Lao'],
  MM:['미얀마','Burmese'], TW:['대만','Taiwanese'], HK:['홍콩','Hong Kong'], SG:['싱가포르','Singaporean'],
  IS:['아이슬란드','Icelandic'], EE:['에스토니아','Estonian'], LV:['라트비아','Latvian'], LT:['리투아니아','Lithuanian'],
  SK:['슬로바키아','Slovak'], SI:['슬로베니아','Slovenian'], LU:['룩셈부르크','Luxembourgish'], MT:['몰타','Maltese'],
  CY:['키프로스','Cypriot'], CL:['칠레','Chilean'], AR:['아르헨티나','Argentine'], CO:['콜롬비아','Colombian'],
  PE:['페루','Peruvian'], VE:['베네수엘라','Venezuelan'], CU:['쿠바','Cuban'], JM:['자메이카','Jamaican'],
  SD:['수단','Sudanese'], KE:['케냐','Kenyan'], GH:['가나','Ghanaian'], CM:['카메룬','Cameroonian'],
  CD:['콩고 민주 공화국','Congolese'], MZ:['모잠비크','Mozambican'], ZW:['짐바브웨','Zimbabwean'],
  SA:['사우디아라비아','Saudi'], AE:['아랍에미리트','Emirati'], QA:['카타르','Qatari'], JO:['요르단','Jordanian'],
  LB:['레바논','Lebanese'], SY:['시리아','Syrian'], YE:['예멘','Yemeni'], AF:['아프가니스탄','Afghan'],
  NZ:['뉴질랜드','New Zealander'], PG:['파푸아뉴기니','Papua New Guinean'], FJ:['피지','Fijian'],
  PS:['팔레스타인','Palestinian'], KW:['쿠웨이트','Kuwaiti'], BH:['바레인','Bahraini'], OM:['오만','Omani'],
  LY:['리비아','Libyan'], TN:['튀니지','Tunisian'], DZ:['알제리','Algerian'], MA:['모로코','Moroccan'],
  MR:['모리타니','Mauritanian'], ML:['말리','Malian'], SN:['세네갈','Senegalese'], CI:['코트디부아르','Ivorian'],
  GA:['가봉','Gabonese'], CG:['콩고 공화국','Congolese'], AO:['앙골라','Angolan'], MW:['말라위','Malawian'],
  ZM:['잠비아','Zambian'], LS:['레소토','Basotho'], SZ:['에스와티니','Swazi'], MU:['모리셔스','Mauritian'],
  SC:['세이셸','Seychellois'], KM:['코모로','Comorian'], MG:['마다가스카르','Malagasy'], RW:['르완다','Rwandan'],
  UG:['우간다','Ugandan'], TZ:['탄자니아','Tanzanian'], SL:['시에라리온','Sierra Leonean'], GN:['기니','Guinean'],
  LR:['라이베리아','Liberian'], TG:['토고','Togolese'], BJ:['베냉','Beninese'], BF:['부르키나파소','Burkinabé'],
  SR:['수리남','Surinamese'], GY:['가이아나','Guyanese'], BZ:['벨리즈','Belizean'], TT:['트리니다드 토바고','Trinidadian'],
  BB:['바베이도스','Barbadian'], BS:['바하마','Bahamian'], SV:['엘살바도르','Salvadoran'], GT:['과테말라','Guatemalan'],
  HN:['온두라스','Honduran'], NI:['니카라과','Nicaraguan'], CR:['코스타리카','Costa Rican'], PA:['파나마','Panamanian'],
  DO:['도미니카 공화국','Dominican'], HT:['아이티','Haitian'], PR:['푸에르토리코','Puerto Rican'],
  BY:['벨라루스','Belarusian'], MD:['몰도바','Moldovan'], VA:['바티칸','Vatican'], AD:['안도라','Andorran'],
  MC:['모나코','Monégasque'], SM:['산마리노','Sammarinese'], LI:['리히텐슈타인','Liechtensteiner'],
  MH:['마셜 제도','Marshallese'], FM:['미크로네시아','Micronesian'], PW:['팔라우','Palauan'], KI:['키리바시','I-Kiribati'],
  TO:['통가','Tongan'], WS:['사모아','Samoan'], VU:['바누아투','Ni-Vanuatu'], SB:['솔로몬 제도','Solomon Islander'],
  TV:['투발루','Tuvaluan'], NR:['나우루','Nauruan'], KN:['세인트키츠 네비스','Kittitian'], LC:['세인트루시아','Saint Lucian'],
  VC:['세인트빈센트 그레나딘','Vincentian'], GD:['그레나다','Grenadian'], AG:['앤티가 바부다','Antiguan'],
  DM:['도미니카 연방','Dominican'], DY:['',''],
}

// lv3 그룹명 → 역할 [ko, en]
const GROLE = {
  '스크린의 배우들': ['영화 배우','film actor'], '텔레비전의 배우들': ['텔레비전 배우','television actor'],
  '토크쇼의 진행자들': ['토크쇼 진행자','talk show host'], '스탠드업 코미디언': ['스탠드업 코미디언','stand-up comedian'],
  '코미디 배우들': ['코미디 배우','comedy actor'], '카메라 뒤의 사람들': ['영화 감독·제작자','film director and producer'],
  '유럽': ['정치인','political leader'], '아시아': ['정치인','political leader'],
  '중동과 북아프리카': ['정치인','political leader'], '아프리카': ['정치인','political leader'],
  '아메리카': ['정치인','political leader'], '오세아니아': ['정치인','political leader'],
  '국제기구': ['국제기구 수장','head of an international organization'],
  '민주당': ['민주당 정치인','Democratic politician'], '공화당': ['공화당 정치인','Republican politician'],
  '사법과 법조계': ['법조인','jurist'], '군사·안보·외교': ['군사·외교 관료','defense and foreign policy official'],
  '언론과 논평가': ['정치 평론가','political commentator'],
  '발리우드의 스타들': ['영화 배우','film actor'], '발리우드의 황금기': ['영화 배우','film actor'],
  '남인도 영화': ['남인도 영화 배우','South Indian film actor'], '스크린의 목소리들': ['플레이백 가수','playback singer'],
  '좌파': ['좌파 사상가','left-wing thinker'], '우파': ['우파 사상가','right-wing thinker'],
  '어느 편도 아닌 이들': ['사상가·저술가','thinker and writer'],
}

// lv2 slug → 역할(그룹 없을 때) [ko, en]
const FROLE = {
  'hollywood': ['영화계 인물','film industry figure'],
  'world-politics': ['정치인','political leader'], 'us-politics': ['정치인','politician'],
  'european-cinema': ['영화인','film industry figure'], 'indian-cinema': ['영화인','film industry figure'],
  'left-and-right': ['사상가·저술가','thinker and writer'], 'scientists': ['과학자','scientist'],
  'electronic-dance-music': ['DJ·프로듀서','DJ and producer'], 'credit-and-central-banks': ['중앙은행가·경제 관료','central banker'],
  'ww2-axis-europe': ['제2차 세계대전 추축국 인물','WWII Axis figure'], 'ww2-britain-free-france': ['제2차 세계대전 인물','WWII figure'],
  'ww2-asia-pacific': ['제2차 세계대전 인물','WWII figure'],
  'ww2-united-states': ['제2차 세계대전 인물','WWII figure'], 'ww2-soviet-union': ['제2차 세계대전 인물','WWII figure'],
  'fashion-models': ['패션 모델','fashion model'], 'asset-management-empires': ['자산운용가·투자자','asset manager and investor'],
  'economists': ['경제학자','economist'], 'sns-stars': ['SNS 스타·인플루언서','social media star'],
  'business-leaders': ['기업인·경영자','business leader'], 'nonviolent-resistance': ['민주화·인권 운동가','pro-democracy and rights activist'],
  'social-media': ['소셜미디어 기업가','social media entrepreneur'], 'messengers': ['메신저 서비스 기업가','messaging service founder'],
  'software-legends': ['소프트웨어 개척자','software pioneer'], 'spymasters': ['정보기관 수장','intelligence chief'],
  'community-platforms': ['온라인 커뮤니티 창업자','online community founder'], 'great-explorers': ['탐험가','explorer'],
  'south-asian-music': ['가수·음악가','singer and musician'], 'native-americans': ['아메리카 원주민 인물','Native American figure'],
  'crusades': ['십자군 시대의 인물','Crusades-era figure'], 'silla-dynasty': ['신라의 인물','figure of Silla'],
  'hip-hop-and-rnb': ['힙합·R&B 아티스트','hip-hop and R&B artist'], 'digital-resistance': ['디지털 권리 운동가','digital rights activist'],
  'modern-management-thinkers': ['경영 사상가','management thinker'], 'great-inventors': ['발명가','inventor'],
  'european-monarchs': ['유럽의 군주','European monarch'], 'silicon-empire': ['기술 기업가','tech entrepreneur'],
  'south-korean-presidents': ['대한민국 대통령','President of South Korea'], 'us-presidents': ['미국 대통령','President of the United States'],
  'luxury-empire': ['명품 산업의 기업가','luxury industry entrepreneur'], 'literary-masters': ['작가','writer'],
  'home-computer-wars': ['컴퓨터 개척자','computing pioneer'], 'pop-stars-21c': ['팝스타','pop star'],
  'soldiers-of-fortune': ['용병·모험가','soldier of fortune'], 'computing-pioneers': ['컴퓨터 개척자','computing pioneer'],
  'energy-cartel': ['에너지 업계 인물','energy industry figure'], 'christian-thought': ['기독교 인물','Christian figure'],
  'beauty-creators': ['뷰티 크리에이터','beauty creator'], 'myth-hindu-lineage': ['인도 신화의 인물','figure of Hindu myth'],
  'youtube-stars': ['유튜버','YouTuber'], 'revolutionaries': ['혁명가','revolutionary'],
  'aircraft-makers': ['항공기 제작자','aircraft maker'], 'fast-food-empire': ['패스트푸드 기업가','fast-food entrepreneur'],
  'founding-monarchs': ['개국 군주','founding monarch'],
}

// 직접 작성 — 성서·건국 군주·특별 인물 [ko, en]
const HAND = {
  'abraham': ['세 믿음이 공유하는 족장의 아버지','Patriarch shared by three faiths'],
  'solomon': ['지혜로 성전을 세운 이스라엘의 왕','The wise king who built the Temple'],
  'peter': ['예수의 수제자, 교회의 반석',"Jesus' chief disciple, the rock of the church"],
  'isaac': ['번제 위기에서 살아남은 아브라함의 아들',"Abraham's son, spared from the altar"],
  'aaron': ['이스라엘의 첫 대제사장','The first high priest of Israel'],
  'samuel': ['왕을 세우고 헌 마지막 사사','The last judge, who made and unmade kings'],
  'judas-iscariot': ['예수를 판 제자','The disciple who betrayed Jesus'],
  'noah': ['대홍수에서 살아남은 방주의 건조자','Builder of the ark, survivor of the Flood'],
  'isaiah': ['메시아를 예언한 예언자','The prophet who foretold the Messiah'],
  'john-the-baptist': ['광야에서 세례를 준 예언자','The prophet who baptized in the wilderness'],
  'esther': ['민족을 구한 페르시아의 왕비','The Persian queen who saved her people'],
  'elijah': ['불수레로 하늘에 오른 예언자','The prophet taken up in a chariot of fire'],
  'saul': ['이스라엘의 첫 왕','The first king of Israel'],
  'jonathan': ['다윗과 맹약한 사울의 아들',"Saul's son, David's sworn friend"],
  'bathsheba': ['다윗의 아내, 솔로몬의 어머니',"David's wife, Solomon's mother"],
  'joseph': ['형제에게 팔려 애굽의 총리가 된 아들','Sold by his brothers, risen to rule Egypt'],
  'moses': ['이스라엘을 애굽에서 이끌어낸 지도자','The leader who brought Israel out of Egypt'],
  'jonah': ['큰 물고기 뱃속에서 살아돌아온 예언자','The prophet who came back from the great fish'],
  'daniel': ['사자 굴에서 살아남은 바벨론의 관리','The exile who survived the lions’ den'],
  'jacob': ['이스라엘이라 불리게 된 열두 지파의 아버지','Father of the twelve tribes, renamed Israel'],
  'mary-magdalene': ['부활을 처음 목격한 제자','First witness of the resurrection'],
  'mary': ['예수의 어머니','Mother of Jesus'],
  'david': ['골리앗을 쓰러뜨린 목동 왕','The shepherd king who felled Goliath'],
  'job': ['고난 끝까지 믿음을 지킨 의인','The righteous man who endured'],
  'goliath': ['다윗에게 쓰러진 블레셋의 거인','The Philistine giant felled by David'],
  'battus-i': ['키레네를 세운 그리스의 식민 왕','Greek colonist-king who founded Cyrene'],
  'istami': ['돌궐의 서쪽을 다스린 카간','Khagan who ruled the western Göktürks'],
  'zhu-yuanzhang': ['거지 승려에서 명나라 태조가 된 홍무제','A beggar monk who became Ming Hongwu Emperor'],
  'arpad': ['마자르족을 이끌고 헝가리를 세운 족장','Chieftain who led the Magyars into Hungary'],
  'sho-hashi': ['류큐 삼산을 통일한 왕','The king who unified the three Ryukyu kingdoms'],
  'ur-nammu': ['우르 제3왕조를 세운 수메르의 왕','Sumerian king who founded the Third Dynasty of Ur'],
  'kenneth-macalpin': ['스코틀랜드 왕국을 처음 세운 왕','First king of a united Scotland'],
  'tang-of-shang': ['하나라를 무너뜨리고 상나라를 세운 왕','The king who overthrew Xia and founded Shang'],
  'narmer': ['상·하 이집트를 통일한 최초의 파라오','First pharaoh of a united Egypt'],
  'asparuh': ['제1차 불가리아 제국을 세운 칸','Khan who founded the First Bulgarian Empire'],
  'raden-wijaya': ['마자파힛 제국을 세운 왕','Founder of the Majapahit Empire'],
  'wanyan-aguda': ['금나라를 세운 여진족 추장','Jurchen chieftain who founded the Jin dynasty'],
  'harald-fairhair': ['노르웨이를 처음 통일한 왕','First king to unify Norway'],
  'songtsen-gampo': ['티베트 제국을 세운 왕','Founder of the Tibetan Empire'],
  'jayavarman-ii': ['크메르 제국을 선포한 왕','The king who proclaimed the Khmer Empire'],
  'bumin-qaghan': ['돌궐 제1카간국의 시조','Founder of the First Turkic Khaganate'],
  'ly-cong-uẩn': ['베트남 리 왕조를 세운 왕','Founder of Vietnam’s Lý dynasty'],
  'dae-joyeong': ['발해를 세운 고구려 유민의 왕','Goguryeo refugee who founded Balhae'],
  'parameswara': ['말라카 술탄국을 세운 왕','Founder of the Malacca Sultanate'],
  'mongke-temur': ['누르하치의 조상인 여진 추장','Jurchen chieftain, ancestor of Nurhaci'],
  "k'inich-yax-k'uk'-mo'": ['마야 코판 왕조의 건국 왕','Founder-king of the Maya Copán dynasty'],
  'osei-tutu': ['아샨티 왕국을 세운 왕','Founder of the Ashanti kingdom'],
  'yekuno-amlak': ['에티오피아 솔로몬 왕조를 연 왕','Restorer of Ethiopia’s Solomonic dynasty'],
  'acamapichtli': ['테노치티틀란의 첫 아즈텍 왕','First tlatoani of Aztec Tenochtitlan'],
  'anawrahta': ['파간 왕조를 세운 미얀마의 왕','Founder of the Pagan kingdom in Burma'],
  'sargon-of-akkad': ['역사상 첫 제국을 세운 아카드의 왕','King of Akkad, builder of the first empire'],
  'ardashir-i': ['사산조 페르시아를 세운 왕','Founder of the Sasanian Empire'],
  'shaka-kasenzangakhona': ['줄루를 군사 강국으로 만든 왕','The king who forged the Zulu into a military nation'],
  'kubrat': ['대불가리아를 세운 칸','Khan who founded Old Great Bulgaria'],
  'archias': ['시라쿠사를 세운 코린토스의 식민 지도자','Corinthian who founded Syracuse'],
  'clovis-i': ['프랑크를 통일한 메로베우스 왕조의 왕','Merovingian king who unified the Franks'],
  'wu-zetian': ['스스로 황제에 오른 무주의 여제','The woman who made herself emperor'],
  'nurhaci': ['청나라의 뿌리 후금을 세운 카간','Founder of Later Jin, root of the Qing'],
  'yi-seong-gye': ['조선을 세운 태조','Taejo, founder of Joseon'],
  'minamoto-no-yoritomo': ['가마쿠라 막부를 연 무가의 쇼군','Shogun who opened the Kamakura shogunate'],
  'bogd-khan': ['몽골 독립을 선언한 불교 국왕','Buddhist theocrat who declared Mongolian independence'],
  'chandragupta-maurya': ['마우리아 제국을 세운 왕','Founder of the Maurya Empire'],
  'zhao-kuangyin': ['송나라를 세운 태조','Emperor Taizu, founder of the Song'],
  'zog-i-of-albania': ['알바니아의 처음이자 마지막 국왕','Albania’s first and only king'],
  'milan-i-of-serbia': ['세르비아 왕국의 첫 왕','First king of modern Serbia'],
  'queen-seondeok': ['신라의 첫 여왕','The first reigning queen of Silla'],
  'king-seongdeok': ['신라 전성기를 연 왕','The king of Silla’s golden age'],
  'leo-xiv': ['첫 미국 출신 교황','The first American pope'],
  'agastya': ['남인도에 베다 지식을 전한 현자','The sage who carried Vedic learning to the South'],
  'saladin': ['십자군에게 예루살렘을 되찾은 아이유브 술탄','Ayyubid sultan who retook Jerusalem'],
  'richard-i': ['십자군의 사자심왕','Richard the Lionheart, crusader king'],
  'al-kamil': ['십자군과 협상한 아이유브 술탄','Ayyubid sultan who treated with the Crusaders'],
  'kim-yu-sin': ['삼국 통일을 이끈 신라의 명장','The general who unified the Three Kingdoms for Silla'],
  'dardenne-brothers': ['벨기에의 다르덴 형제 감독','The Dardenne brothers, Belgian filmmakers'],
  'narendra-modi': ['인도의 총리','Prime Minister of India'],
  'mishal-al-ahmad-al-jaber-al-sabah': ['쿠웨이트의 군주(에미르)','Emir of Kuwait'],
  'duma-boko': ['보츠와나의 대통령','President of Botswana'],
  'hassan-sheikh-mohamud': ['소말리아의 대통령','President of Somalia'],
  'netumbo-nandi-ndaitwah': ['나미비아의 첫 여성 대통령',"Namibia's first female president"],
  'mokgweetsi-masisi': ['보츠와나의 대통령','President of Botswana'],
  'umaro-sissoco-embalo': ['기니비사우의 대통령','President of Guinea-Bissau'],
  'vjosa-osmani': ['코소보의 대통령','President of Kosovo'],
  'salva-kiir-mayardit': ['남수단의 대통령','President of South Sudan'],
  'teodoro-obiang': ['적도 기니의 대통령','President of Equatorial Guinea'],
  'albin-kurti': ['코소보의 총리','Prime Minister of Kosovo'],
  'serhii-plokhy': ['우크라이나의 역사학자','Ukrainian historian'],
  'alan-walker': ['노르웨이의 DJ·프로듀서','Norwegian DJ and producer'],
  'dimitri-vegas-&-like-mike': ['벨기에의 DJ 듀오','Belgian DJ duo'],
  'swedish-house-mafia': ['스웨덴의 DJ 트리오','Swedish DJ trio'],
  'melinda-gates': ['미국의 자선가·기업인','American philanthropist and businesswoman'],
  'behati-prinsloo': ['나미비아의 패션 모델','Namibian fashion model'],
  'mahamat-deby': ['차드의 대통령','President of Chad'],
  'alexandre-banza': ['중앙아프리카 공화국의 정치인','Central African politician'],
  'navarana-mequpaluk': ['그린란드의 이누이트 탐험가','Greenlandic Inuit explorer'],
  'anauakaq': ['그린란드의 이누이트 인물','Greenlandic Inuit figure'],
  'sechele': ['리빙스턴에게 개종한 보츠와나의 추장',"Bakwena chief, Livingstone's first convert"],
  'mehmet-oz': ['텔레비전 의사 출신의 공화당 정치인','TV doctor turned Republican politician'],
  'gerard-depardieu': ['프랑스의 배우','French actor'],
  'tedros-adhanom-ghebreyesus': ['WHO 사무총장','Director-General of the WHO'],
  'russo-brothers': ['미국의 감독 형제, 루소 브라더스','The Russo brothers, American directors'],
}

const [members, l2s, l3s, celebs] = await Promise.all([
  restAll('faction_members', { select: 'id,celeb_id,lv2_id,lv3_id,short_desc' }),
  restAll('faction_lv2', { select: 'id,slug' }),
  restAll('faction_lv3', { select: 'id,lv2_id,name' }),
  restAll('celebs', { select: 'id,slug,nickname,nationality,profession' }),
])
const l2m = new Map(l2s.map((f) => [f.id, f.slug]))
const l3m = new Map(l3s.map((g) => [g.id, g.name]))
const cm = new Map(celebs.map((c) => [c.id, c]))

const EU_KO = { FR:'프랑스', GB:'영국', IE:'아일랜드', DE:'독일', AT:'오스트리아', CH:'스위스', LU:'룩셈부르크',
  SE:'스웨덴', NO:'노르웨이', DK:'덴마크', FI:'핀란드', IS:'아이슬란드', IT:'이탈리아' }

const plan = []
const misses = []
for (const m of members) {
  // 비어있거나, 우리가 직전에 채운 값 그대로인 행만 재생성 대상(손으로 고친 값은 보존)
  if (m.short_desc && oldById.get(m.id) !== m.short_desc) continue
  const c = cm.get(m.celeb_id)
  if (!c) continue
  const fslug = l2m.get(m.lv2_id)
  const gname = m.lv3_id ? l3m.get(m.lv3_id) : null
  let ko = null, en = null

  if (HAND[c.slug]) { [ko, en] = HAND[c.slug] }
  else {
    // 역할 결정: lv3 우선, 없으면 lv2
    let role = gname ? GROLE[gname] : null
    if (!role) role = FROLE[fslug]
    if (fslug === 'european-cinema') role = c.profession === 'actor' ? ['영화 배우','film actor'] : c.profession === 'director' ? ['영화 감독','film director'] : role
    if (!role) { misses.push({ slug: c.slug, fslug, gname }); continue }
    // 국적: european-cinema는 그룹=국가라 국적 생략 가능 — 코드가 있으면 쓴다
    const nat = NAT[c.nationality]
    if (fslug === 'european-cinema' && !nat) { misses.push({ slug: c.slug, fslug, gname, why: 'no-nat' }); continue }
    ko = nat ? `${nat[0]}의 ${role[0]}` : role[0]
    en = nat ? `${nat[1]} ${role[1]}` : `A ${role[1]}`
  }
  plan.push({ id: m.id, slug: c.slug, ko, en })
}

console.log('생성 계획:', plan.length, '건 / 미해결:', misses.length)
if (misses.length) console.log('미해결 샘플:', misses.slice(0, 30))
const changed = plan.filter((p) => oldById.get(p.id) !== p.ko)
console.log('이전 생성본과 다른 행:', changed.length, '건')
// 샘플 출력
for (const p of changed.slice(0, 15)) console.log(' ', p.slug, '→', p.ko, '//', p.en)

if (!APPLY) { console.log('dry-run — --apply로 반영'); process.exit(0) }
writeFileSync(PLAN_PATH, JSON.stringify(plan, null, 1))
let ok = 0, err = 0
for (const p of changed) {
  const res = await fetch(`${BASE()}/faction_members?id=eq.${p.id}`, {
    method: 'PATCH', headers: { ...H(), Prefer: 'return=minimal' },
    body: JSON.stringify({ short_desc: p.ko, short_desc_en: p.en }),
  })
  if (res.ok) ok++; else { err++; console.log('ERR', p.slug, res.status, (await res.text()).slice(0, 150)) }
}
console.log(`반영 ${ok} / 오류 ${err}`)
