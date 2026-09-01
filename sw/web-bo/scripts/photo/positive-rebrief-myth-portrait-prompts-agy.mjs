/**
 * 반복 장식·신분형으로 수렴한 신화 초상화만 골라 긍정형 최종 외형으로 다시 발주한다.
 * 승인된 얼굴 REF와 아바타 프레임·출력 블록은 유지하고 개별 외형·복식·빛만 교체한다.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { agyCall } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

const PROJECT_ROOT = path.resolve('C:\\project\\feelandnote')
const ROOT = path.resolve('D:\\remotion-assets\\celeb-mythology-face-candidates')
const PROMPT_ROOT = path.join(ROOT, '개인초상화-프롬프트')
const PROMPTS_PATH = path.join(PROMPT_ROOT, 'portrait-prompts.json')
const BY_TRADITION = path.join(PROMPT_ROOT, '전승별')
const WORK = path.join(PROMPT_ROOT, '_agy-positive-rebrief')
const BACKUP_ROOT = path.join(ROOT, '_backup', '20260901-before-positive-rebrief')
const MODEL = 'gemini-3.7-flash-high'

const BRIEFS = {
  argus: '정교한 조선술에 익숙한 실무 장인. 중앙 가르마의 굵은 암갈색 웨이브를 귀 뒤로 넘겨 목덜미의 낮은 매듭으로 묶고, 짧고 단정한 수염을 갖춘다. 무표백 리넨 엑소미스와 갈색 작업용 모직 망토, 따뜻한 목재색 반사광과 차분한 측광으로 완성한다.',
  calais: '북풍을 타는 빠르고 고결한 젊은 날개 영웅. 길고 가벼운 암갈색 머리에서 관자놀이의 가는 땋은 가닥 두 줄이 목덜미에서 합쳐지고 나머지 머리는 뒤로 흐른다. 매끈하게 면도한 얼굴, 청회색과 남색의 가벼운 클라미스, 차가운 반역광으로 날렵함을 살린다.',
  idas: '신과의 결투도 두려워하지 않는 육중한 메세네 전사. 짙고 촘촘한 고대식 곱슬머리가 이마와 귀 둘레에 단단한 덩어리를 이루고, 두꺼운 수염과 콧수염이 강한 하관을 따른다. 짙은 진홍색 모직 클라미스와 어두운 전사용 튜닉, 낮고 뜨거운 청동빛 측광을 쓴다.',
  lynceus: '어둠과 대지 너머를 꿰뚫는 아르고호 감시병. 짙은 웨이브 머리를 귀 뒤로 넘겨 목덜미에서 낮게 묶고 관자놀이에는 가는 자연 곱슬이 남는다. 정밀하게 다듬은 짧은 수염, 짙은 녹색 항해용 모직 망토와 무표백 리넨 키톤, 맑고 차가운 정면 측광을 쓴다.',
  tiphys: '별과 바람을 읽는 노련한 첫 조타수. 소금기와 바람을 오래 맞은 짙은 웨이브 머리를 뒤로 모아 목덜미의 낮은 매듭으로 정리하고, 풍성하지만 질서 있게 다듬은 수염을 갖춘다. 슬레이트 회색의 두꺼운 항해용 망토와 내구성 있는 아마 키톤, 흐린 바다빛의 부드러운 측광으로 안정감을 준다.',
  zetes: '하르피이아를 끝까지 추격하는 북풍의 젊은 날개 영웅. 두껍고 거센 짙은 웨이브가 이마에서 뒤쪽으로 크게 휘날리고 귀와 목덜미를 따라 굵은 갈래로 떨어진다. 매끈하게 면도한 얼굴, 숯빛 북부 에게해 모직 클라미스와 가벼운 아마 키토니스코스, 강한 은청색 테두리광으로 박진감을 만든다.',

  asclepius: '질병과 죽음의 고통을 다루는 자애로운 의술의 신. 중앙에서 갈라진 두껍고 깊은 물결의 짙은 머리가 관자놀이와 귀 뒤를 풍성하게 감싸고, 굵고 부드러운 완전한 수염과 콧수염이 성숙한 지혜를 드러낸다. 상아색 모직 히마티온과 무표백 리넨 키톤, 피부와 눈을 편안하게 살리는 따뜻한 확산광을 쓴다.',
  cronus: '황금시대를 다스리고 전복의 운명을 두려워한 태초의 티탄 왕. 무겁고 긴 검은 웨이브 머리가 중앙에서 갈라져 귀 뒤와 목덜미로 내려오며, 길고 밀도 높은 고대식 수염과 굵은 콧수염이 깊은 시간감을 만든다. 숯빛의 두꺼운 고대 모직 망토와 어두운 키톤, 낮은 호박빛 측광으로 침묵과 압박을 드러낸다.',
  eros: '신과 인간의 마음을 움직이는 태초의 사랑과 매혹. 윤기 있고 탄력 있는 짙은 곱슬머리가 관자놀이와 귀 둘레에 자유로운 고리 모양으로 모이고 목덜미에서 가볍게 끝난다. 매끈하게 면도한 젊은 얼굴, 사프란 금빛의 얇은 리넨 클라미스와 상아색 키톤, 생기 있는 장밋빛 금빛 조명을 쓴다.',
  hecate: '세 갈래 길과 밤의 경계를 지키는 헤카테. 중앙 가르마의 짙은 머리에서 두 줄의 굵은 꼬임 땋기가 귀 뒤로 이어져 낮은 매듭을 만들고, 반투명한 먹빛 베일이 정수리 뒤에서 어깨로 내려온다. 매끈한 얼굴, 깊은 남색 모직 페플로스와 슬레이트 회색 망토, 보랏빛과 달빛이 교차하는 절제된 측광을 쓴다.',
  hestia: '모든 가정과 신전의 성스러운 온기를 지키는 화로의 여신. 중앙에서 가지런히 나뉜 머리를 귀 뒤로 넘겨 낮은 땋은 코일로 정리하고 따뜻한 사프란색 베일이 머리 뒤와 어깨를 감싼다. 매끈한 얼굴, 크림빛과 테라코타색의 단정한 모직 페플로스, 흔들림이 적은 부드러운 황금빛 화로 조명을 쓴다.',
  iris: '하늘과 땅을 잇는 신속하고 청명한 무지개 전령. 가는 물결의 머리를 관자놀이에서 뒤로 꼬아 날렵한 낮은 매듭으로 모으고 귀와 목덜미에 작은 곱슬 가닥을 남긴다. 매끈한 얼굴, 하늘빛 주름 리넨 이오니아식 키톤과 연보라 모직 클라미스, 백색광에 미세한 색 분광이 번지는 맑은 조명을 쓴다.',
  prometheus: '신성하면서도 거칠게 추방된 문명의 시조. 인간에게 불과 문명을 건넨 지성과 꺾이지 않는 의지가 얼굴에 함께 드러난다. 바람과 고난에 거칠어진 고대의 긴 짙은 머리, 자연스럽고 강인하게 자란 중간 길이의 수염, 오래 입어 해진 고대 그리스식 천과 무거운 망토, 얼굴 한쪽과 눈을 밝히는 불의 따뜻한 측광으로 완성한다.',
  uranus: '별이 가득한 무한한 하늘 그 자체인 원초신. 길고 풍성한 짙은 물결 머리가 중앙에서 갈라져 관자놀이와 귀 뒤, 목덜미까지 큰 흐름으로 이어지고, 폭넓고 길게 흐르는 완전한 수염과 콧수염이 광대한 시간감을 만든다. 자정빛 남색의 장대한 모직 히마티온과 어두운 리넨 키톤, 차가운 천공의 테두리광과 깊은 청색 측광을 쓴다.',

  alcmene: '헤라클레스를 낳고 수많은 시련을 견딘 테베의 강인한 어머니. 중앙 가르마의 짙은 물결 머리를 관자놀이에서 두 갈래로 꼬아 목덜미의 낮은 땋은 코일로 모은다. 매끈한 얼굴, 사프란색 고운 모직 페플로스와 크림색 리넨 키톤, 차분한 온기와 결단력을 함께 살리는 부드러운 창가빛을 쓴다.',
  amphitryon: '전장을 지휘하고 가족을 지킨 테베의 노련한 장수. 짙은 갈색의 촘촘한 곱슬머리를 이마에서 뒤로 빗어 귀와 목덜미를 또렷하게 드러내고, 각이 선 중간 길이의 수염과 콧수염을 단정하게 다듬는다. 짙은 진홍색 군용 클라미스와 어두운 모직 튜닉, 청동빛이 섞인 굳센 측광을 쓴다.',
  antaeus: '대지에 닿을 때마다 힘을 얻는 리비아의 거인. 두껍고 거친 짙은 곱슬머리가 이마와 귀 주위에 큰 고대식 덩어리를 이루고, 굵고 짧은 수염과 넓은 콧수염이 원초적인 힘을 더한다. 황토색 양가죽 망토와 거친 암갈색 모직 드레이프, 땅에서 반사된 듯한 낮은 적갈색 측광을 쓴다.',
  atlas: '하늘의 무게를 영원히 견디는 태초의 티탄. 굵고 긴 짙은 머리가 중앙에서 갈라져 뒤로 밀리고 귀와 목덜미에 무거운 물결로 떨어지며, 깊고 풍성한 완전한 수염이 턱과 목선을 채운다. 두꺼운 슬레이트 회색 고대 모직 히마티온, 위에서 내려오는 차가운 빛과 얼굴 아래의 약한 따뜻한 반사광으로 압도적인 인내를 드러낸다.',
  hylas: '헤라클레스와 함께 원정에 나선 맑고 우아한 젊은 동료. 금갈색의 부드러운 에페보스식 곱슬머리가 관자놀이와 귀, 목덜미에 섬세한 고리를 이루며 자연스럽게 내려온다. 매끈하게 면도한 얼굴, 고운 상아색 아마 키톤과 옅은 청색 모직 망토, 시원하고 투명한 확산광을 쓴다.',
  iphicles: '신의 피를 타고난 형제 곁에서 자신의 용기로 싸우는 필멸의 쌍둥이. 짧고 층진 짙은 전사형 곱슬머리가 이마와 귀 둘레를 단정하게 감싸고, 짧고 가벼운 수염과 콧수염이 젊은 성숙함을 드러낸다. 짙은 올리브색 군용 튜닉과 녹색 모직 클라미스, 열려 있고 단단한 인상을 주는 중성 측광을 쓴다.',

  andromache: '트로이의 몰락 속에서도 가족과 존엄을 지킨 헥토르의 아내. 중앙에서 가른 긴 짙은 머리를 양옆의 단정한 땋기로 만들어 목덜미의 낮은 묶음으로 합치고, 고운 리넨 베일이 머리 뒤와 어깨로 내려온다. 매끈한 얼굴, 자주색 트로이식 모직 로브와 자연색 베일, 따뜻하고 깊은 정면 측광을 쓴다.',
  astyanax: '트로이의 미래를 상징하는 어린 왕손. 부드러운 금갈색 아이의 곱슬머리가 이마와 관자놀이, 귀 둘레에 자연스럽게 내려오고 목덜미에서 짧게 끝난다. 매끈한 어린 얼굴, 자주색 직조 가장자리가 있는 상아색 리넨 아동 튜닉과 가벼운 모직 어깨천, 맑고 부드러운 자연광을 쓴다.',
  briseis: '전쟁의 전리품이 되었으나 내면의 존엄을 잃지 않은 아나톨리아 귀족 여성. 중앙 가르마의 윤기 있는 짙은 머리를 양옆의 길고 단단한 땋기로 내려 귀 뒤에서 목덜미의 넓은 땋은 묶음으로 합친다. 매끈한 얼굴, 사프란색 주름 리넨 튜닉과 슬레이트 청색 모직 망토, 고요한 힘을 살리는 부드러운 측광을 쓴다.',
  chryseis: '아폴론 사제의 딸로서 전쟁 한복판에 놓인 밝고 경건한 젊은 여성. 짙은 갈색 머리를 중앙에서 갈라 관자놀이의 매끈한 물결 뒤로 두 개의 긴 땋은 가닥을 만들고 목덜미에서 가지런히 모은다. 매끈한 얼굴, 상아색 주름 리넨 튜닉과 깊은 녹색 모직 망토, 맑은 신전 낮빛처럼 정결한 조명을 쓴다.',
  idomeneus: '오랜 전장에서 군대를 이끄는 크레타의 노련한 전사왕. 두껍고 짙은 갈색 웨이브 머리를 귀 뒤로 넘겨 목덜미의 낮은 묶음으로 모으고, 풍성하고 단정한 수염과 콧수염이 지휘관의 무게를 만든다. 짙은 진홍색 모직 전사 튜닉과 바다빛 자주색 망토, 단단한 청동빛 측광을 쓴다.',
  pandarus: '명궁의 자부심과 치명적인 선택을 함께 지닌 트로이의 아나톨리아 궁수. 윤기 있는 검은 머리를 중앙에서 갈라 양옆의 가는 땋기로 만들고 귀 뒤에서 하나의 낮은 묶음으로 합친다. 짧고 밀도 높은 수염과 자연스러운 콧수염, 황토색과 녹슨 적색 기하문양의 아나톨리아 모직 튜닉, 날카로운 냉색 측광을 쓴다.',

  agelaus: '구혼자 무리의 전투를 이끄는 단호하고 위험한 전사. 짙은 웨이브 머리를 이마에서 뒤로 쓸어 귀와 목덜미에 굵은 고대식 물결로 정리하고, 짧고 강하게 다듬은 수염과 콧수염을 갖춘다. 진홍색 모직 키톤과 어두운 망토, 얼굴의 긴장과 계산을 드러내는 강한 측광을 쓴다.',
  ctesippus: '부와 오만을 과시하는 사메의 젊은 구혼자. 풍성한 짙은 곱슬머리를 이마에서 뒤로 넘겨 귀 둘레와 목덜미에 화려한 고리를 남기고, 세심하게 다듬은 짧은 수염과 콧수염을 갖춘다. 티리언 퍼플 모직 히마티온과 크림색 리넨 키톤, 따뜻하지만 날카로운 상부 측광을 쓴다.',
  demodocus: '보이지 않는 눈으로 영웅들의 기억을 노래하는 파이아케스의 늙은 음유시인. 긴 은백색 머리가 중앙에서 느슨하게 갈라져 귀와 목덜미로 부드럽게 내려오고, 풍성한 은백색 수염과 콧수염이 노래의 연륜을 드러낸다. 무표백 상아색 모직 키톤과 두꺼운 회색 히마티온, 얼굴을 고르게 감싸는 잔잔한 확산광을 쓴다.',
  ino: '필멸의 고통을 지나 난파자를 구하는 바다의 여신이 된 이노. 길고 짙은 머리가 젖은 듯한 큰 물결을 이루며 관자놀이와 귀 뒤, 어깨 쪽으로 자유롭게 흐른다. 매끈한 얼굴, 해포석빛 청록색 주름 리넨 페플로스와 어깨에 놓인 반투명 상아색 베일 망토, 차가운 수면 반사광을 쓴다.',
  laodamas: '손님을 존중하며 경기를 제안하는 파이아케스의 밝고 운동적인 왕자. 짙은 머리가 짧고 탄력 있는 고대식 곱슬로 이마와 귀 주위를 감싸고 목덜미에서 가볍게 끝난다. 매끈하게 면도한 얼굴, 밝은 사프란색 리넨 키톤과 접어 두른 흰 모직 망토, 투명하고 건강한 낮빛을 쓴다.',
  medon: '궁정의 소식을 전달하며 마지막까지 살아남는 현실적인 전령. 짙은 머리를 짧고 실용적인 물결로 정리해 귀 뒤로 넘기고 목덜미에 가지런히 붙인다. 짧고 부드럽게 다듬은 수염과 콧수염, 황토색 리넨 전령용 키톤과 갈색 모직 여행 망토, 중립적인 낮의 측광을 쓴다.',
  nausithous: '바다의 위협을 넘어 파이아케스의 터전을 세운 선대 군주. 성숙한 짙은 머리를 중앙에서 갈라 귀 뒤로 넘기고 목덜미에 긴 물결로 정돈하며, 폭넓고 풍성한 수염과 콧수염을 갖춘다. 짙은 남색과 해록색의 모직 히마티온과 상아색 리넨 키톤, 차분한 해양색 측광으로 건국자의 안정감을 준다.',
  orion: '밤하늘과 저승까지 이름을 남긴 거대한 사냥꾼. 두껍고 짙은 곱슬머리가 이마와 귀 둘레에 큰 갈기 같은 고대식 덩어리를 이루고, 풍성하고 거친 완전한 수염과 콧수염이 육체적 위압을 더한다. 짙은 모직 사냥용 엑소미스와 천연 가죽 망토, 차가운 달빛 측광으로 통제된 힘을 드러낸다.',
  peisistratus: '낯선 이를 환대하며 길을 함께하는 네스토르의 젊은 아들. 윤기 있는 짙은 갈색 웨이브가 이마에서 부드럽게 갈라져 귀와 목덜미에 자연스러운 고리로 내려온다. 매끈하게 면도한 얼굴, 올리브색과 사프란색 모직 여행용 클라미스와 크림색 리넨 키톤, 따뜻하고 열린 낮빛을 쓴다.',
  phemius: '강요된 노래 속에서도 자신의 목숨과 예술을 지킨 이타카의 궁정 음유시인. 부드러운 짙은 갈색 머리가 관자놀이와 귀, 목덜미에 우아한 고대식 고리로 내려오고, 짧고 섬세하게 다듬은 수염과 콧수염이 차분한 성숙함을 더한다. 고운 에크루색 리넨 키톤과 옅은 청색 모직 히마티온, 따뜻하고 절제된 정면 측광을 쓴다.',

  aerope: '크레타에서 미케네로 건너와 왕가의 파국 한가운데 선 왕비. 중앙 가르마의 짙은 물결 머리를 관자놀이의 넓은 롤과 목덜미의 층진 낮은 땋은 코일로 정리한다. 매끈한 얼굴, 사프란색 리넨 로브와 테라코타 적색 모직 망토, 차갑고 수수께끼 같은 측광을 쓴다.',
  aletes: '복수의 공백을 타고 미케네의 권력을 차지한 젊은 찬탈자. 두껍고 짙은 갈색 머리를 이마에서 뒤로 밀어 귀와 목덜미에 단정한 고대식 물결로 떨어뜨린다. 매끈하게 면도한 얼굴, 짙은 꼭두서니색 모직 망토와 남색 리넨 튜닉, 예리하고 비대칭적인 측광으로 경계심과 야심을 드러낸다.',
  chrysothemis: '비극적인 왕가에서 생존과 평온을 선택한 엘렉트라의 자매. 윤기 있는 짙은 갈색 머리를 중앙에서 갈라 관자놀이의 대칭 롤과 목덜미의 낮은 땋은 코일로 정리한다. 매끈한 얼굴, 연한 세이지색과 상아색의 모직 로브, 부드럽고 고른 창가빛으로 차분함을 살린다.',
  erigone: '아버지의 죽음과 왕가의 복수 앞에서 엄정한 판단을 내리는 아이기스토스의 딸. 중앙 가르마의 짙은 머리를 양옆의 단단한 땋기로 만들어 목덜미의 낮은 묶음으로 합치고, 먹빛 상복 베일이 머리 뒤에서 어깨로 내려온다. 매끈한 얼굴, 숯회색 모직 상복 망토와 남색 리넨 로브, 절제된 차가운 측광을 쓴다.',
  megapenthes: '혼인과 왕가의 재건을 맞이하는 젊고 활기찬 스파르타 왕자. 두껍고 짙은 웨이브 머리가 귀 길이의 탄력 있는 고대식 고리로 정리되고 목덜미에서 깔끔하게 끝난다. 매끈하게 면도한 얼굴, 숲빛 녹색 모직 망토와 크림색 리넨 튜닉, 밝고 따뜻한 축제의 낮빛을 쓴다.',
  myrtilus: '왕의 전차와 경주의 승패를 다루는 예민하고 뛰어난 마부. 촘촘한 짙은 갈색 머리를 짧은 운동형 고대식 곱슬로 정리해 이마와 귀를 또렷이 드러내고, 짧고 실용적으로 다듬은 수염과 콧수염을 갖춘다. 짙은 황토색 모직 튜닉과 사프란색 가장자리의 작업 망토, 빠른 판단을 살리는 단단한 측광을 쓴다.',
  pylades: '오레스테스의 곁을 끝까지 지키는 냉정하고 충실한 동료. 짙은 갈색 웨이브 머리를 중앙에서 갈라 귀 뒤로 넘기고 목덜미의 낮은 묶음으로 정돈한다. 매끈하게 면도한 얼굴, 짙은 남색과 슬레이트 회색의 모직 여행 망토와 자연색 리넨 튜닉, 차갑고 흔들림 없는 측광을 쓴다.',
  strophius: '박해받는 아이를 받아 길러 복수의 토대를 마련한 포키스의 보호자 왕. 짙은 머리에 관자놀이의 은빛이 섞이고, 부드러운 고대식 물결이 귀 뒤와 목덜미로 정리되며, 풍성하고 잘 다듬은 성숙한 수염과 콧수염이 온화한 권위를 만든다. 호두색과 호박색의 두꺼운 모직 망토, 따뜻한 부성적 측광을 쓴다.',
  thyestes: '왕좌를 두고 형제와 맞서며 아트레우스 가문의 파국을 키운 비극적 경쟁자. 무겁고 짙은 웨이브 머리가 중앙에서 갈라져 귀와 목덜미로 내려오고, 두껍고 풍성한 완전한 수염과 콧수염이 집요한 의지를 드러낸다. 짙은 꼭두서니색과 숯빛의 모직 망토, 낮고 어두운 적색 측광으로 비극의 무게를 준다.',
}

const OUTPUT_FIELDS = [
  'impression_en',
  'hair_en',
  'facial_hair_en',
  'costume_en',
  'lighting_background_en',
  'pose_expression_en',
  'mythic_treatment_en',
]
const HEAD_ORNAMENT = /\b(band|headband|fillet|circlet|diadem|stephane|wreath|tiara|polos|headpiece|headdress|head ribbon|(?:gold|silver|bronze|metal|royal|jeweled|jewelled) crown|crowned with)\b/iu
const NEGATIVE_DIRECTION = /\b(no|not|never|without|avoid|exclude|remove|replace|reject|instead|rather than|free of|do not|don't)\b/iu
const MODERN_HAIR = /\b(fade|high-and-tight|undercut|pompadour|crew cut|buzz cut|pixie|bob|wolf cut|mullet|salon|streetwear|face-framing|modern side part|contemporary fringe|slick-back|blowout)\b/iu
const PROSE_NOISE = /\b(Project Gutenberg|Gutenberg|source URL|historical source|literary prose|symboli[sz]es|represents the|metaphor)\b/iu
const BAD_COSTUME = /\b(gorget|pectoral|epaulets?|pauldrons?|neck[- ]guard|collar plate|chestplate|breastplate|chest protector|chest harness|upper chest|across the chest|over the chest|collarbones?|torso|high[- ]neck(?:ed)?|high collar|tailored|tailoring|leather jerkin|plate armor|fantasy armor)\b/iu
const CROP_MECHANIC = /\b(crop|frame|framing|46|81|percent|collarbones?|chest|torso|around the base of the neck|close(?:ly)? around the neck|wrapped around the neck)\b/iu

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function extractJsonObject(text) {
  const cleaned = String(text ?? '').trim().replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('AGY 응답에서 JSON 객체를 찾지 못했다.')
  return JSON.parse(cleaned.slice(start, end + 1))
}

function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9가-힣]+/gu, ' ').replace(/\s+/gu, ' ').trim()
}

function rowsFromCurrent(current) {
  const promptBySlug = new Map(current.prompts.map((item) => [item.slug, item]))
  const missing = Object.keys(BRIEFS).filter((slug) => !promptBySlug.has(slug))
  if (missing.length > 0) throw new Error(`개편 인물 누락: ${missing.join(', ')}`)
  return Object.entries(BRIEFS).map(([slug, final_visual_direction_ko]) => {
    const currentPrompt = promptBySlug.get(slug)
    return {
      target_id: currentPrompt.target_id,
      slug,
      name_ko: currentPrompt.name_ko,
      name_en: currentPrompt.name_en,
      title_ko: currentPrompt.title_ko,
      title_en: currentPrompt.title_en,
      tradition: currentPrompt.tradition,
      tradition_name_ko: currentPrompt.tradition_name_ko,
      reference_kind: currentPrompt.reference_kind,
      reference_image: currentPrompt.reference_image,
      character_archetype_ko: currentPrompt.direction_ko,
      final_visual_direction_ko,
      tradition_context: {
        visual_frame_ko: currentPrompt.historical_review?.tradition_visual_frame_ko,
        hair_beard_basis_ko: currentPrompt.historical_review?.hair_beard_basis_ko,
        costume_armor_basis_ko: currentPrompt.historical_review?.costume_armor_basis_ko,
      },
      currentPrompt,
    }
  })
}

function inputFile(row) {
  return path.join(WORK, `${row.slug}-input.json`)
}

function responseFile(row) {
  return path.join(WORK, `${row.slug}-response.txt`)
}

function resultFile(row) {
  return path.join(WORK, `${row.slug}-result.json`)
}

function compactInput(row) {
  return {
    target_id: row.target_id,
    slug: row.slug,
    name_ko: row.name_ko,
    name_en: row.name_en,
    title_ko: row.title_ko,
    title_en: row.title_en,
    tradition: row.tradition,
    tradition_name_ko: row.tradition_name_ko,
    reference_kind: row.reference_kind,
    character_archetype_ko: row.character_archetype_ko,
    final_visual_direction_ko: row.final_visual_direction_ko,
    tradition_context: row.tradition_context,
  }
}

function buildPrompt(row, inFile) {
  return `
You are converting one approved mythology portrait art direction into concise English image-generation fields.
Read this exact UTF-8 JSON file: ${inFile}

The JSON contains the character's name, role, positive character archetype, final visible appearance, and already-reviewed tradition context. The final_visual_direction_ko is the complete desired replacement. Do not ask what changed and do not reconstruct an old prompt.

Return ONLY one valid JSON object with exactly these keys:
{
  "target_id": "exact input target_id",
  "slug": "exact input slug",
  "impression_en": "visible character-specific impression",
  "hair_en": "complete visible scalp-hair arrangement",
  "facial_hair_en": "complete visible facial-hair state; Clean-shaven. is sufficient",
  "costume_en": "complete visible historically coherent garment instruction",
  "lighting_background_en": "character-specific photographic light on a clean separated background",
  "pose_expression_en": "tight avatar portrait posture, expression, and direct camera gaze",
  "mythic_treatment_en": "one restrained physically visible atmospheric treatment unique to this character"
}

Rules:
1. Translate the positive final visual direction faithfully. Mention only elements that will be visible in the finished image.
2. Use positive present-tense generation language. Every output field must describe the desired result directly. Omit corrections, rejected alternatives, prohibitions, comparison with an old image, and editing history.
3. The approved reference owns facial identity, bone structure, ethnicity and apparent age. Describe expression and presence, not a replacement face.
4. Use exactly the hairstyle and facial-hair state in final_visual_direction_ko. Add no head ornament or hair accessory. A veil explicitly present in the Korean direction remains a veil.
5. Keep costume culturally and chronologically coherent with tradition_context. Use the named garment silhouette and material. Add no weapon, tool, held object, hand, companion, extra person, narrative scene, readable text, modern tailoring, fantasy armor or costume-shop detail.
6. The portrait is a square tight avatar with eyes near 46% and chin near 81%, face centered, and camera gaze. Camera crop—not extra clothing—keeps the collarbone, chest, and long torso outside the frame. Hair and the character-specific material at the lower edge remain large enough for the face to read at 32 pixels.
7. Do not include sources, URLs, Project Gutenberg, literary prose, symbolism, explanation, labels, markdown, or commentary.
8. Keep all seven prose fields distinct and specific to ${row.name_en}. Do not reuse stock phrases such as regal dignity, noble presence, sovereign majesty, piercing gaze, historically accurate, cinematic portrait, or ethereal beauty.
`.trim()
}

function validateResult(row, result) {
  if (result?.target_id !== row.target_id || result?.slug !== row.slug) {
    throw new Error(`${row.slug}: AGY 결과 신원 오류`)
  }
  for (const field of OUTPUT_FIELDS) {
    if (typeof result[field] !== 'string' || !result[field].trim()) throw new Error(`${row.slug}: 빈 필드 ${field}`)
    if (NEGATIVE_DIRECTION.test(result[field])) throw new Error(`${row.slug}: 부정형 지시 ${field}: ${result[field]}`)
    if (PROSE_NOISE.test(result[field])) throw new Error(`${row.slug}: 산문·출처 노이즈 ${field}`)
  }
  if (MODERN_HAIR.test(result.hair_en)) throw new Error(`${row.slug}: 현대 헤어 표현 ${result.hair_en}`)
  if (HEAD_ORNAMENT.test(`${result.hair_en} ${result.costume_en}`)) {
    throw new Error(`${row.slug}: 개편 대상에 머리 장식 재삽입 ${result.hair_en}`)
  }
  if (!/\b(clean-shaven|beard|moustache|mustache|facial hair)\b/iu.test(result.facial_hair_en)) {
    throw new Error(`${row.slug}: 수염 상태 누락 ${result.facial_hair_en}`)
  }
  if (/https?:\/\//iu.test(JSON.stringify(result))) throw new Error(`${row.slug}: URL 출력`)
}

async function runRow(row, index, total) {
  const inFile = inputFile(row)
  const rawFile = responseFile(row)
  const outFile = resultFile(row)
  writeJson(inFile, compactInput(row))
  if (existsSync(outFile)) {
    const saved = readJson(outFile)
    validateResult(row, saved.result)
    console.log(JSON.stringify({ event: 'resume', index: index + 1, total, slug: row.slug }))
    return saved.result
  }
  console.log(JSON.stringify({ event: 'start', index: index + 1, total, slug: row.slug }))
  let result
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await agyCall(buildPrompt(row, inFile), {
        repoRoot: PROJECT_ROOT,
        docs: [
          'docs/project/production/image-generation.md',
          'docs/project/celeb/celeb-avatar-spec.md',
          inFile,
        ],
        timeoutMs: 900_000,
      })
      writeFileSync(rawFile, `${response}\n`, 'utf8')
      result = extractJsonObject(response)
      validateResult(row, result)
      break
    } catch (error) {
      if (attempt === 2) throw error
      console.log(JSON.stringify({ event: 'retry', index: index + 1, total, slug: row.slug, error: error.message }))
    }
  }
  writeJson(outFile, {
    generated_at: new Date().toISOString(),
    provider: 'agy-antigravity',
    model: MODEL,
    result,
  })
  console.log(JSON.stringify({ event: 'finish', index: index + 1, total, slug: row.slug }))
  return result
}

function polishInputFile(tradition) {
  return path.join(WORK, `polish-${tradition}-input.json`)
}

function polishResponseFile(tradition) {
  return path.join(WORK, `polish-${tradition}-response.txt`)
}

function polishResultFile(tradition) {
  return path.join(WORK, `polish-${tradition}-result.json`)
}

function buildPolishPrompt(batch, inFile) {
  return `
You are the final production editor for a small set of approved mythology avatar directions.
Read this exact UTF-8 JSON file: ${inFile}

Every row already contains a new positive character direction and approved appearance fields. Rewrite only costume_en and pose_expression_en so each field carries one responsibility.

Return ONLY one valid JSON object:
{
  "tradition": "${batch.tradition}",
  "reviews": [
    {
      "slug": "exact input slug",
      "costume_en": "one positive sentence containing only the character-specific garment or body covering, materials, colors, silhouette, and exposed-versus-covered balance",
      "pose_expression_en": "one positive sentence containing only centered head orientation, direct camera gaze, and the character-specific expression"
    }
  ]
}

Rules:
1. Preserve the character-defining garment choices and colors in final_visual_direction_ko. State the finished visible design directly, but do not preserve an extra layer merely because the draft named it.
2. Choose garment density for this individual. Warm-climate ancient figures often need one main garment plane or one partial drape; elemental or nature divinities may use one unusually light, fluid, rough, furred, feathered, or otherwise character-specific material; armor, priestly regalia, cold-weather layers, and culturally inherent robe layers appear only where they explain this exact role.
3. Ordinary garment fastening sits below the crop. A pin, fibula, brooch, clasp, torc, collar, or gorget is visible only when it is a canonical marker of this exact character rather than a device for filling the lower frame. Keep avatar geometry, crop percentages, collarbone, chest, and camera instructions outside costume_en.
4. Keep the result culturally coherent and materially believable. Do not create a high collar, neck guard, fantasy armor, modern tailoring, head ornament, weapon, tool, hand, prop, extra subject, text, or scene.
5. pose_expression_en contains direct camera gaze and a distinct expression suited to the named archetype. Keep eye and chin percentages, crop mechanics, costume, and lighting outside this field.
6. Output positive desired appearance only. Omit corrections, prohibitions, old text, explanations, sources, URLs, markdown, and commentary.
7. Preserve exact input order and count: ${batch.rows.length} rows.
`.trim()
}

function validatePolishBatch(batch, result) {
  if (result?.tradition !== batch.tradition) throw new Error(`${batch.tradition}: 다듬기 전승 오류`)
  if (!Array.isArray(result.reviews) || result.reviews.length !== batch.rows.length) {
    throw new Error(`${batch.tradition}: 다듬기 수량 오류 ${result.reviews?.length}/${batch.rows.length}`)
  }
  for (const [index, review] of result.reviews.entries()) {
    const row = batch.rows[index].row
    if (review.slug !== row.slug) throw new Error(`${batch.tradition}: 다듬기 순서 오류 ${row.slug}/${review.slug}`)
    for (const field of ['costume_en', 'pose_expression_en']) {
      if (typeof review[field] !== 'string' || !review[field].trim()) throw new Error(`${row.slug}: 다듬기 빈 필드 ${field}`)
      if (NEGATIVE_DIRECTION.test(review[field])) throw new Error(`${row.slug}: 다듬기 부정형 ${field}`)
      if (PROSE_NOISE.test(review[field])) throw new Error(`${row.slug}: 다듬기 산문 노이즈 ${field}`)
    }
    if (HEAD_ORNAMENT.test(review.costume_en)) throw new Error(`${row.slug}: 다듬기 머리 장식 재삽입`)
    if (BAD_COSTUME.test(review.costume_en) || CROP_MECHANIC.test(review.costume_en)) {
      throw new Error(`${row.slug}: 복식에 크롭·가짜 목선 혼입 ${review.costume_en}`)
    }
    if (CROP_MECHANIC.test(review.pose_expression_en)) {
      throw new Error(`${row.slug}: 포즈에 공통 기하 혼입 ${review.pose_expression_en}`)
    }
    if (!/\b(direct|camera|lens)\b/iu.test(review.pose_expression_en)) {
      throw new Error(`${row.slug}: 포즈에 카메라 응시 누락`)
    }
  }
}

async function runPolishBatch(batch, index, total) {
  const inFile = polishInputFile(batch.tradition)
  const rawFile = polishResponseFile(batch.tradition)
  const outFile = polishResultFile(batch.tradition)
  writeJson(inFile, {
    tradition: batch.tradition,
    tradition_name_ko: batch.rows[0].row.tradition_name_ko,
    rows: batch.rows.map(({ row, result }) => ({
      slug: row.slug,
      name_ko: row.name_ko,
      name_en: row.name_en,
      title_ko: row.title_ko,
      character_archetype_ko: row.character_archetype_ko,
      final_visual_direction_ko: row.final_visual_direction_ko,
      costume_en: result.costume_en,
      pose_expression_en: result.pose_expression_en,
    })),
  })
  if (existsSync(outFile)) {
    const saved = readJson(outFile)
    validatePolishBatch(batch, saved.result)
    console.log(JSON.stringify({ event: 'polish_resume', index: index + 1, total, tradition: batch.tradition }))
    return saved.result
  }
  console.log(JSON.stringify({ event: 'polish_start', index: index + 1, total, tradition: batch.tradition, rows: batch.rows.length }))
  let result
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await agyCall(buildPolishPrompt(batch, inFile), {
        repoRoot: PROJECT_ROOT,
        docs: [
          'docs/project/production/image-generation.md',
          'docs/project/celeb/celeb-avatar-spec.md',
          inFile,
        ],
        timeoutMs: 900_000,
      })
      writeFileSync(rawFile, `${response}\n`, 'utf8')
      result = extractJsonObject(response)
      validatePolishBatch(batch, result)
      break
    } catch (error) {
      if (attempt === 2) throw error
      console.log(JSON.stringify({ event: 'polish_retry', index: index + 1, total, tradition: batch.tradition, error: error.message }))
    }
  }
  writeJson(outFile, {
    generated_at: new Date().toISOString(),
    provider: 'agy-antigravity',
    model: MODEL,
    result,
  })
  console.log(JSON.stringify({ event: 'polish_finish', index: index + 1, total, tradition: batch.tradition }))
  return result
}

function normalizeImpressionLanguage(result) {
  const normalized = { ...result }
  for (const field of OUTPUT_FIELDS) {
    normalized[field] = normalized[field]
      .replace(/wind-weathered/giu, 'wind-tossed')
      .replace(/weathered martial resolve/giu, 'seasoned martial resolve')
      .replace(/weathered endurance/giu, 'long-tested endurance')
      .replace(/weathered gravity/giu, 'seasoned gravity')
      .replace(/weathered, unyielding resolve/giu, 'long-tested, unyielding resolve')
      .replace(/\bweathered\b/giu, 'timeworn')
      .replace(/\brugged\b/giu, 'strong-textured')
      .replace(/\bsleek\b/giu, 'neatly drawn')
  }
  return normalized
}

async function polishResults(rows, results) {
  const byTradition = new Map()
  for (const [index, row] of rows.entries()) {
    const batch = byTradition.get(row.tradition) ?? { tradition: row.tradition, rows: [] }
    batch.rows.push({ row, result: results[index] })
    byTradition.set(row.tradition, batch)
  }
  const batches = [...byTradition.values()]
  const reviewBySlug = new Map()
  for (const [index, batch] of batches.entries()) {
    const polished = await runPolishBatch(batch, index, batches.length)
    for (const review of polished.reviews) reviewBySlug.set(review.slug, review)
  }
  return rows.map((row, index) => normalizeImpressionLanguage({
    ...results[index],
    costume_en: reviewBySlug.get(row.slug).costume_en,
    pose_expression_en: reviewBySlug.get(row.slug).pose_expression_en,
  }))
}

function compilePrompt(row, result) {
  const currentText = row.currentPrompt.prompt
  const appearanceStart = currentText.indexOf('IMPRESSION AND GROOMING')
  const framingStart = currentText.indexOf('FRAMING —')
  if (appearanceStart < 0 || framingStart < 0 || framingStart <= appearanceStart) {
    throw new Error(`${row.slug}: 기존 고정 블록 경계 누락`)
  }
  const identityBlocks = currentText.slice(0, appearanceStart).trim()
  const fixedTail = currentText.slice(framingStart).trim()
    .replace(
      '- Below the chin or lower jaw, only a little neck, canonical fur or feathers, explicitly specified garment drape or armor edge, veil ties, or long hair may fill the remaining space. Do NOT pull the camera back to fit the shoulders.',
      '- At the lower edge, show only the character-specific material described above in broad, quiet shapes. A named canonical ornament may appear as a subordinate detail. An open neckline may continue below the crop. The face remains visually dominant.',
    )
    .replace(
      '- At the lower edge, show the character-specific material described above in broad, quiet shapes. Ordinary garment fastening sits below the crop; only a named canonical ornament appears. An open neckline may continue below the crop. The face remains visually dominant.',
      '- At the lower edge, show only the character-specific material described above in broad, quiet shapes. A named canonical ornament may appear as a subordinate detail. An open neckline may continue below the crop. The face remains visually dominant.',
    )
    .replace(
      '- The collarbone and chest are NOT visible, and the torso is never long. Follow only the neckline, closure, mantle, veil, headwear, jewelry, or armor explicitly specified above. Keep any exposed lower neckline below the tight crop instead of inventing a modern or unattested high collar.',
      '- The tight camera crop places the collarbone and chest outside the image and keeps the visible torso short while preserving the natural level of the described neckline.',
    )
    .replace(
      '- The collarbone and chest stay outside the image because of the tight camera crop, and the torso is never long. Clothing does not rise or multiply merely to fill the lower frame.',
      '- The tight camera crop places the collarbone and chest outside the image and keeps the visible torso short while preserving the natural level of the described neckline.',
    )
  return [
    identityBlocks,
    `IMPRESSION AND GROOMING\nIMPRESSION: ${result.impression_en}\nHAIR: ${result.hair_en}\nFACIAL HAIR: ${result.facial_hair_en}`,
    `INDIVIDUAL ART DIRECTION\n${result.costume_en}\n${result.lighting_background_en}\n${result.pose_expression_en}\n${result.mythic_treatment_en}`,
    fixedTail,
  ].join('\n\n')
}

function assertDistinct(current, rows, results) {
  const selected = new Set(rows.map((row) => row.slug))
  const all = current.prompts.map((item) => {
    const index = rows.findIndex((row) => row.slug === item.slug)
    const result = index >= 0 ? results[index] : null
    return {
      slug: item.slug,
      impression_en: result?.impression_en ?? item.appearance_direction?.impression_en,
      hair_en: result?.hair_en ?? item.appearance_direction?.hair_en,
      facial_hair_en: result?.facial_hair_en ?? item.appearance_direction?.facial_hair_en,
      costume_en: result?.costume_en ?? item.art_direction?.costume_en,
    }
  })
  for (const field of ['impression_en', 'hair_en', 'costume_en']) {
    const seen = new Map()
    for (const item of all) {
      const value = normalize(item[field])
      if (seen.has(value)) throw new Error(`${field} 완전 중복: ${seen.get(value)} / ${item.slug}`)
      seen.set(value, item.slug)
    }
  }
  const selectedOrnaments = all.filter((item) => selected.has(item.slug) && HEAD_ORNAMENT.test(`${item.hair_en} ${item.costume_en}`))
  if (selectedOrnaments.length > 0) throw new Error(`개편 대상 머리 장식 잔존: ${selectedOrnaments.map((item) => item.slug).join(', ')}`)
}

function backupCurrent() {
  mkdirSync(BACKUP_ROOT, { recursive: true })
  const files = [PROMPTS_PATH, path.join(PROMPT_ROOT, 'README.md')]
  for (const file of files) {
    const target = path.join(BACKUP_ROOT, path.basename(file))
    if (!existsSync(target)) copyFileSync(file, target)
  }
  for (const file of ['argonauts.md', 'greek-roman-myth.md', 'heracles.md', 'homer-iliad.md', 'homer-odyssey.md', 'house-of-atreus.md']) {
    const source = path.join(BY_TRADITION, file)
    const target = path.join(BACKUP_ROOT, file)
    if (!existsSync(target)) copyFileSync(source, target)
  }
}

function markdownText(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\r', ' ').replaceAll('\n', ' ').trim()
}

function writeTraditionDocs(prompts) {
  const traditions = [...new Set(prompts.map((prompt) => prompt.tradition))]
  const indexLines = [
    '# 신화 인물 개인 초상화 프롬프트',
    '',
    `AGY \`${MODEL}\` 초안을 바탕으로 198명 전원을 검수하고, 반복 장식과 신분형으로 수렴한 ${Object.keys(BRIEFS).length}명은 인물별 긍정형 최종 외형으로 다시 쓴 이미지 생성 발주서다.`,
    '',
    '- 얼굴 REF는 얼굴 골격과 신원만 보존하며, 헤어와 수염은 인물별 발주 지시가 우선한다.',
    '- 인물의 최종 군상·머리·수염·복식·빛만 생성 문장에 남기고 수정 경위와 출처 산문은 넣지 않았다.',
    '- 이미지 생성·DB·R2 반영은 하지 않았다.',
    '- 기계용 전체 데이터: `portrait-prompts.json`',
    '',
    '## 전승별 발주서',
    '',
  ]
  for (const tradition of traditions) {
    const traditionRows = prompts.filter((prompt) => prompt.tradition === tradition)
    indexLines.push(`- [${traditionRows[0].tradition_name_ko ?? tradition} ${traditionRows.length}명](./전승별/${tradition}.md)`)
    const review = traditionRows[0].historical_review
    const lines = [
      `# ${traditionRows[0].tradition_name_ko ?? tradition} 개인 초상화 프롬프트`,
      '',
      `- 시각 기준: ${markdownText(review.tradition_visual_frame_ko)}`,
      `- 헤어·수염 기준: ${markdownText(review.hair_beard_basis_ko)}`,
      `- 복식·갑주 기준: ${markdownText(review.costume_armor_basis_ko)}`,
      '- 정본·도상 출처:',
      ...(review.canonical_source_urls ?? []).map((url) => `  - ${url}`),
      '- 외형 고증 출처:',
      ...(review.appearance_source_urls ?? []).map((url) => `  - ${url}`),
      '',
    ]
    for (const prompt of traditionRows) {
      lines.push(
        `## ${prompt.name_ko} · ${prompt.name_en}`,
        '',
        `- ID: \`${prompt.target_id}\``,
        `- REF: ${prompt.reference_image ? `\`${prompt.reference_image}\`` : '없음 — 정본에 맞춰 자율 설계'}`,
        `- 구상: ${markdownText(prompt.direction_ko)}`,
        `- 개편: ${markdownText(prompt.historical_review.change_note_ko)}`,
        `- 인물별 근거: ${markdownText(prompt.historical_review.historical_basis_ko)}`,
        '',
        '```text',
        prompt.prompt,
        '```',
        '',
      )
    }
    writeFileSync(path.join(BY_TRADITION, `${tradition}.md`), `${lines.join('\n')}\n`, 'utf8')
  }
  writeFileSync(path.join(PROMPT_ROOT, 'README.md'), `${indexLines.join('\n')}\n`, 'utf8')
}

function applyResults(current, rows, results) {
  backupCurrent()
  const resultBySlug = new Map(rows.map((row, index) => [row.slug, results[index]]))
  const rowBySlug = new Map(rows.map((row) => [row.slug, row]))
  const prompts = current.prompts.map((item) => {
    const result = resultBySlug.get(item.slug)
    if (!result) return item
    const row = rowBySlug.get(item.slug)
    return {
      ...item,
      appearance_direction: {
        impression_en: result.impression_en,
        hair_en: result.hair_en,
        facial_hair_en: result.facial_hair_en,
      },
      art_direction: {
        ...item.art_direction,
        costume_en: result.costume_en,
        lighting_background_en: result.lighting_background_en,
        pose_expression_en: result.pose_expression_en,
        mythic_treatment_en: result.mythic_treatment_en,
      },
      historical_review: {
        ...item.historical_review,
        change_note_ko: '승인된 얼굴과 아바타 기하를 유지하고 인물 고유 군상에 맞는 긍정형 최종 외형으로 다시 썼다.',
      },
      prompt: compilePrompt(row, result),
    }
  })
  const output = {
    ...current,
    generated_at: new Date().toISOString(),
    provider: 'agy-antigravity+codex-art-direction',
    model: MODEL,
    appearance_revision: {
      completed: true,
      method: 'positive_character_rebrief',
      revised_count: rows.length,
      preserved_count: prompts.length - rows.length,
      criteria: ['character_specific_archetype', 'positive_visible_direction', 'premodern_hair', 'individual_facial_hair', 'role_specific_costume_and_light'],
    },
    prompts,
  }
  writeJson(PROMPTS_PATH, output)
  writeTraditionDocs(prompts)
  return output
}

async function main() {
  mkdirSync(WORK, { recursive: true })
  const current = readJson(PROMPTS_PATH)
  if (current.prompts?.length !== 198) throw new Error(`현재 프롬프트 수량 오류: ${current.prompts?.length}`)
  const rows = rowsFromCurrent(current)
  writeJson(path.join(WORK, 'selection.json'), {
    created_at: new Date().toISOString(),
    count: rows.length,
    selection_basis: '반복 머리 장식 또는 신분형이 인물의 실제 역할보다 앞선 그리스계 초상화',
    rows: rows.map(compactInput),
  })
  if (process.argv.includes('--prepare')) {
    console.log(JSON.stringify({ event: 'prepared', count: rows.length, slugs: rows.map((row) => row.slug), work: WORK }, null, 2))
    return
  }
  const drafts = []
  for (const [index, row] of rows.entries()) drafts.push(await runRow(row, index, rows.length))
  const results = await polishResults(rows, drafts)
  assertDistinct(current, rows, results)
  const output = applyResults(current, rows, results)
  writeJson(path.join(WORK, 'final-audit.json'), {
    checked_at: new Date().toISOString(),
    total_prompts: output.prompts.length,
    revised: rows.length,
    preserved: output.prompts.length - rows.length,
    selected_head_ornaments_remaining: 0,
    exact_duplicate_impression_hair_costume: 0,
    usable: true,
  })
  console.log(JSON.stringify({ event: 'complete', total: output.prompts.length, revised: rows.length, output: PROMPTS_PATH }))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
