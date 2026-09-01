/**
 * 사용자가 폐기·교체를 지시한 신화 인물 얼굴 후보만 Kiro GPT-5.6 Sol로 다시 캐스팅한다.
 *
 * - 현재 확정되지 않은 제안 원장만 수정한다.
 * - 이미 유지하기로 한 얼굴과 사용자가 거절한 얼굴은 새 후보 풀에서 제외한다.
 * - 사용자 지정 로컬 이미지와 오디세우스 팩션 REF는 그대로 연결한다.
 * - DB, R2, 정식 avatar/portrait에는 손대지 않는다.
 *
 * 실행: node scripts/photo/recast-myth-face-materials-kiro.mjs
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import sharp from 'sharp'
import { runKiro } from '../../../../.agents/skills/kiro-gpt/scripts/kiro-call.mjs'

const PROJECT_ROOT = path.resolve('C:\\project\\feelandnote')
const ROOT = path.resolve('D:\\remotion-assets\\celeb-mythology-face-candidates')
const MATERIALS_PATH = path.join(ROOT, 'materials-with-appearance.json')
const MATERIALS_RAW_PATH = path.join(ROOT, 'materials.json')
const APPEARANCES_PATH = path.join(ROOT, 'appearances.json')
const APPEARANCE_JSONL_PATH = path.join(ROOT, 'appearance.jsonl')
const TARGETS_PATH = path.join(ROOT, 'avatar-null-targets.json')
const PROPOSAL_PATH = path.join(ROOT, 'matching-proposal.json')
const CANDIDATES_PATH = path.join(ROOT, 'matching-candidates.json')
const WORK_ROOT = path.join(ROOT, '_recast-work-round2')
const SELECTED_INPUTS = path.join(ROOT, '_recast-selected-inputs-round2')
const MATCHING_CROPS = path.join(ROOT, 'matching-crops')
const MODEL = 'gpt-5.6-sol'
const KIRO_WORKERS = 1
const MIN_SCORE = 72
const MIN_POTENTIAL = 4
const MAX_ATTEMPTS = 2
const REVISION = 'user_recast_round2_2026-08-31'
const ROUND3_REVISION = 'user_recast_round3_2026-08-31'
const ROUND3_WORK_ROOT = path.join(ROOT, '_recast-work-round3')
const ROUND3_SELECTED_INPUTS = path.join(ROOT, '_recast-selected-inputs-round3')
const ROUND3_WEB_INPUTS = path.join(ROOT, '_recast-web-candidates-round3')
const ROUND3_PROVENANCE_ROOT = path.join(ROOT, '_수집기록', '실사교체-3차')
const GREEK_CASTING_GROUPS = new Set(['greek-origin', 'heracles', 'iliad', 'odyssey', 'atreus'])
const CROSS_GROUP_APPROVALS = new Map([
  ['laertes', 'MF-20260831-0440'],
])

const EXTERNAL = {
  prometheus: {
    id: 'OVR-prometheus',
    sourceType: 'user_local',
    source: 'D:\\image\\컨셉아트\\fantasy\\프로메테우스.png',
    sourceNote: '사용자 지정 프로메테우스 컨셉아트',
    reason: '사용자가 프로메테우스의 얼굴 기준으로 직접 지정한 컨셉아트를 사용한다.',
    regenerationDirection: '긴 흑발과 강한 눈썹·콧대·턱의 정체성을 유지하고, 불을 훔친 티탄의 고통과 신성을 확장한다.',
    appearance: {
      apparent_age_band: '30대 중후반',
      face_shape: '세로로 긴 각진 타원형',
      distinctive_visible_features: ['굵고 낮게 뻗은 눈썹과 깊은 눈매', '곧은 콧대와 단단한 턱, 짧게 정돈된 수염'],
    },
  },
  hippolyta: {
    id: 'OVR-hippolyta',
    sourceType: 'user_local',
    source: 'D:\\image\\컨셉아트\\fantasy\\히폴리테.jpg',
    sourceNote: '사용자 지정 히폴리테 컨셉아트',
    reason: '사용자가 히폴리테의 얼굴 기준으로 직접 지정한 아마존 여왕 컨셉아트를 사용한다.',
    regenerationDirection: '높은 광대와 또렷한 눈매·단단한 턱의 정체성을 유지하고 아마존 여왕의 전투 신성을 강화한다.',
    appearance: {
      apparent_age_band: '20대 후반~30대 초반',
      face_shape: '균형 잡힌 타원형에 단단한 턱선',
      distinctive_visible_features: ['높은 광대와 길고 또렷한 눈매', '선명한 눈썹과 곧은 콧대, 침착한 정면 응시'],
    },
  },
  anticlea: {
    id: 'OVR-anticlea',
    sourceType: 'faction_ref',
    source: path.join(PROJECT_ROOT, 'sw', 'remotion', 'public', 'factions', 'Homer-Odyssey', '02-homeward', '5-hell', 'anticleia-directed-v2.png'),
    sourceNote: '오디세우스 팩션의 안티클레이아 확정 연출본',
    reason: '오디세우스 팩션에서 이미 안티클레이아로 제작한 얼굴과 연속성을 유지한다.',
    regenerationDirection: '회백색 머리와 성숙한 얼굴 골격, 절제된 슬픔을 유지해 저승에서 아들을 만나는 장면의 정체성을 이어간다.',
    appearance: {
      apparent_age_band: '60대 전후',
      face_shape: '광대와 턱이 단단한 넓은 타원형',
      distinctive_visible_features: ['두꺼운 눈썹과 깊게 자리한 눈', '뚜렷한 광대와 이마·눈가의 자연스러운 연륜'],
    },
  },
  minos: {
    id: 'OVR-minos',
    sourceType: 'faction_ref',
    source: path.join(PROJECT_ROOT, 'sw', 'remotion', 'public', 'factions', 'Homer-Odyssey', '02-homeward', '5-hell', 'minos-directed-v2.png'),
    sourceNote: '오디세우스 팩션의 미노스 확정 연출본',
    reason: '오디세우스 팩션에서 이미 미노스로 제작한 얼굴과 연속성을 유지한다.',
    regenerationDirection: '굵은 눈썹과 곧은 코, 풍성한 회색 수염과 침착한 판관의 응시를 유지한다.',
    appearance: {
      apparent_age_band: '50대 후반~60대 초반',
      face_shape: '넓고 각진 타원형',
      distinctive_visible_features: ['굵고 선명한 눈썹과 깊은 눈매', '곧고 큰 코와 풍성한 회색 수염, 단단한 하관'],
    },
  },
}

const REQUESTS = {
  igraine: '기존 후보를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  'sir-agravain': '기존 후보를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  'sir-kay': '기존 후보를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  'uther-pendragon': '기존 후보를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  eros: '기존 후보를 폐기하고 젊은 사랑의 신으로서 생기와 매혹이 살아 있는 새 얼굴로 교체한다.',
  gaia: '기존 후보는 너무 늙었다. 노년을 피하고 생명력·풍요·모성이 느껴지는 장년 이하의 대지 여신 얼굴을 고른다.',
  hecate: '기존 이미지를 폐기한다. 살아 있는 피부와 신비로운 권위를 지닌 마법·경계의 여신 얼굴로 교체한다.',
  hestia: '기존 후보는 너무 늙었다. 노년을 피하고 따뜻하고 차분한 화로의 여신 얼굴을 고른다.',
  iris: '기존 후보를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  persephone: '기존 후보는 시체처럼 보인다. 젊고 건강한 생명감과 명계 왕비의 위엄이 함께 있는 얼굴을 고른다.',
  rhea: '예리한 인상이 아니라 푸근하고 포용적인 티탄 모신이어야 한다. 따뜻한 눈과 부드러운 얼굴선을 우선한다.',
  uranus: '기존 후보의 엄중함을 폐기한다. 평온하고 광대한 하늘의 아버지로 읽히는 침착한 얼굴을 고른다.',
  alcmene: '기존 후보는 너무 나이 들어 보인다. 헤라클레스를 낳은 성인 어머니이되 노년이 아닌 얼굴을 고른다.',
  andromache: '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  antilochus: '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  briseis: '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  hecuba: '기존 후보는 너무 늙었다. 성숙한 트로이 왕비이되 노년으로 보이지 않는 얼굴을 고른다.',
  meriones: '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  scamander: '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  ino: '기존 후보를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  laertes: '기존 후보보다 확실히 더 늙은 노년의 왕이자 아버지 얼굴을 고른다.',
  laodamas: '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  melantho: '기존 후보는 사용자가 고대 이타카 시녀의 시각 맥락과 어긋난다고 판정했다. 그리스권 인물군과 자연스럽게 이어지는 새 얼굴을 고른다.',
  aerope: '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  chrysothemis: '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  hippodamia: '기존 후보를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  'boyi-kao': '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  'huang-feihu': '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  'huang-tianhua': '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  'shen-gongbao': '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  'yunxiao-niangniang': '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  'golden-horned-king': '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  'yellow-robe-demon': '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  ptah: '기존 후보를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  'ame-no-tajikarao': '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  'ame-no-uzume': '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  futodama: '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  hoori: '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  iwanagahime: '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  'konohanasakuya-hime': '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  toyotamahime: '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  angrboda: '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
  grimhild: '기존 이미지를 폐기하고 얼굴 자체가 분명히 다른 새 후보로 교체한다.',
}

const ROUND2_REQUESTS = {
  andromache: '현재 후보를 폐기한다. 30대 전후 트로이 왕비이자 전쟁 미망인의 품위와 살아 있는 감정이 보이는 완전히 다른 얼굴을 고른다.',
  briseis: '현재 후보를 교체한다. 젊은 트로이 귀족 여성의 온기와 절제된 슬픔이 함께 보이고 현대 모델 같은 과장된 인상은 피한다.',
  meriones: '현재 후보를 폐기한다. 민첩하고 강건한 젊은 크레타 전사로 읽히는 완전히 다른 얼굴을 고른다.',
  scamander: '현재 후보를 폐기한다. 인간 병사보다 오래된 강의 신에 가까운 장중함과 격류 같은 힘이 느껴지는 완전히 다른 얼굴을 고른다.',
  igraine: '현재 얼굴은 다른 중년 왕비에게 재배정한다. 이그레인에는 30대 후반~40대 초반의 브리튼 귀부인으로서 모성과 궁정적 품위가 함께 보이는 새 얼굴을 고른다.',
  persephone: '현재 후보를 교체한다. 시체처럼 창백하거나 지나치게 엄격하지 않고, 살아 있는 젊음과 명계 왕비의 고요한 신성이 함께 보이는 새 얼굴을 고른다.',
  'boyi-kao': '현재 후보를 폐기한다. 온화한 젊은 왕자의 고결함과 비극적 운명이 보이는 완전히 다른 얼굴을 고른다.',
  'huang-feihu': '현재 후보를 폐기한다. 노련한 중년 장군의 강건함과 지휘력이 보이는 완전히 다른 얼굴을 고른다.',
  'huang-tianhua': '현재 후보를 폐기한다. 젊고 빠르며 호전적인 선봉장의 생기가 보이는 완전히 다른 얼굴을 고른다.',
  'shen-gongbao': '현재 후보를 폐기한다. 교활하고 설득력 있는 도사의 지성과 위험성이 함께 보이는 완전히 다른 얼굴을 고른다.',
  'yunxiao-niangniang': '현재 후보를 폐기한다. 성숙한 여선인의 침착한 권위와 강한 법력이 보이는 완전히 다른 얼굴을 고른다.',
  'yellow-robe-demon': '현재 후보를 폐기한다. 추방된 천계 장수의 위엄과 오래된 집착이 보이는 완전히 다른 중년 남성 얼굴을 고른다.',
  ptah: '현재 후보를 교체한다. 고요하고 기념비적인 창조신의 권위가 느껴지며 성숙하지만 쇠약하지 않은 완전히 다른 얼굴을 고른다.',
  'ame-no-tajikarao': '현재 후보를 폐기한다. 바위문을 들어 올릴 만큼 응축된 완력과 일본 신화의 힘의 신다운 선 굵은 생기가 보이는 완전히 다른 얼굴을 고른다.',
  hoori: '현재 후보를 폐기한다. 젊은 사냥꾼이자 왕자의 기민함과 품위가 함께 보이는 완전히 다른 얼굴을 고른다.',
  iwanagahime: '현재 후보를 폐기한다. 늙거나 흉측하지 않으면서 바위의 영원성과 단단한 자존심이 보이는 완전히 다른 여신 얼굴을 고른다.',
}

const ROUND2_REASSIGN = {
  hecuba: {
    fromSlug: 'igraine',
    fitScore: 96,
    reason: '이그레인에서 회수한 성숙한 얼굴은 또렷한 광대와 절제된 미소, 중년 왕비의 품위가 강해 트로이의 왕비 헤카베에 더 자연스럽게 맞는다.',
    regenerationDirection: '성숙한 얼굴 비례와 집중된 눈매를 보존하고 트로이 왕비의 무게, 많은 자녀를 지킨 모성, 전쟁이 남긴 피로를 절제해 더한다.',
    risk: '현대적으로 정돈된 인상을 과장하면 전쟁을 겪은 고대 왕비의 질감이 약해질 수 있다.',
  },
}

const ROUND2_EXTERNAL = {}

const ROUND2_MANUAL_SELECTIONS = {
  igraine: {
    materialId: 'MF-20260831-0036',
    score: 90,
    reason: '넓은 이마와 높은 광대, 크고 밝은 눈, 감정을 억제한 정면 응시가 새 이그레인에게 필요한 브리튼 귀부인의 품위와 복합적인 내면을 만든다.',
    regenerationDirection: '긴 얼굴 비례와 밝은 눈, 완만한 눈썹선을 보존하고 30대 후반의 자연스러운 연륜과 모성, 콘월 궁정의 절제된 위엄을 더한다.',
    risk: '눈과 입술을 과장하면 고대 귀부인보다 현대 패션 모델의 인상이 앞설 수 있다.',
  },
  persephone: {
    materialId: 'MF-20260831-0060',
    score: 95,
    reason: '따뜻한 피부 생기와 깊은 아몬드형 눈, 높은 광대와 단단한 턱선이 살아 있는 젊음과 명계 왕비의 신성을 동시에 보여 준다.',
    regenerationDirection: '짙은 눈썹과 깊은 눈, 높은 광대와 따뜻한 피부톤을 보존하고 봄의 생명광과 명계의 어두운 왕관을 균형 있게 더한다.',
    risk: '눈썹과 턱을 지나치게 날카롭게 만들면 고요한 왕비보다 냉혹한 악역처럼 보일 수 있다.',
  },
  andromache: {
    materialId: 'MF-20260831-0087',
    score: 94,
    reason: '성숙한 눈가와 길고 곧은 코, 부드러운 광대와 절제된 미소가 트로이 왕비의 품위와 전쟁을 견딘 내면의 무게를 함께 지닌다.',
    regenerationDirection: '중년 초입의 얼굴선과 큰 눈, 절제된 입매를 유지하고 트로이 왕실의 장중함과 헥토르를 잃을 불안을 눈가에 더한다.',
    risk: '미소가 강해지면 안드로마케의 비극적 긴장과 전쟁 속 피로가 약해질 수 있다.',
  },
  briseis: {
    materialId: 'MF-20260831-0136',
    score: 93,
    reason: '밝고 선명한 눈과 자연스러운 홍조, 선명한 광대와 감정을 참는 입매가 젊은 귀족 여성의 품위와 억눌린 슬픔을 설득력 있게 만든다.',
    regenerationDirection: '밝은 눈동자와 굵은 눈썹, 단단한 턱선을 보존하되 왕비처럼 무겁지 않게 하고 전쟁 포로가 된 젊은 여성의 경계심을 더한다.',
    risk: '표정을 지나치게 엄격하게 만들면 브리세이스의 연약한 처지보다 냉정한 통치자처럼 보일 수 있다.',
  },
  meriones: {
    materialId: 'MF-20260831-0085',
    score: 95,
    reason: '굵은 눈썹과 깊은 눈, 높은 광대와 선명한 하악선이 민첩하면서도 강건한 크레타 전사의 압력과 젊은 전투력을 분명하게 드러낸다.',
    regenerationDirection: '깊은 눈매와 곧은 코, 각진 턱을 보존하고 크레타식 청동 갑옷과 창, 전장에서 얻은 가벼운 상처를 더한다.',
    risk: '피부와 얼굴선을 지나치게 매끈하게 만들면 현대적인 미남형으로 평준화될 수 있다.',
  },
  scamander: {
    materialId: 'MF-20260831-0264',
    score: 94,
    reason: '깊게 자리한 눈과 굵은 눈썹, 주름이 쌓인 긴 얼굴과 단단한 턱이 인간 병사보다 오래된 자연신의 연륜과 억눌린 격류를 보여 준다.',
    regenerationDirection: '40대 후반 이상의 골격과 깊은 눈, 긴 코와 짧은 수염을 보존하고 피부에 젖은 강바닥의 질감과 청동빛 물결 광휘를 더한다.',
    risk: '노화를 과장하면 분노한 강의 신보다 쇠약한 노인처럼 보일 수 있다.',
  },
  'boyi-kao': {
    materialId: 'MF-20260831-0353',
    score: 92,
    reason: '맑고 긴 눈과 수염 없는 가는 하관, 아직 앳된 피부가 아버지를 구하러 조가에 간 젊은 왕자의 고결함과 비극성을 선명하게 만든다.',
    regenerationDirection: '젊은 얼굴 비례와 맑은 눈, 부드러운 턱선을 유지하고 주나라 왕자의 단정한 관과 절제된 귀족 복식을 더한다.',
    risk: '소년성을 너무 강조하면 문왕의 장남이 지닌 책임감과 왕자의 무게가 약해질 수 있다.',
  },
  'huang-feihu': {
    materialId: 'MF-20260831-0204',
    score: 91,
    reason: '넓은 이마와 단단한 중년 하관, 눈가의 연륜과 침착한 응시가 상나라 무성왕이자 주나라 개국 무장의 지휘력과 신뢰감을 만든다.',
    regenerationDirection: '넓은 얼굴 골격과 차분한 눈, 선명한 입매를 보존하고 나이 인상은 50대 전후로 조절해 노련한 장군의 체력과 위엄을 더한다.',
    risk: '주름과 흰머리를 그대로 과장하면 현역 무장보다 은퇴한 노장처럼 보일 수 있다.',
  },
  'huang-tianhua': {
    materialId: 'MF-20260831-0362',
    score: 93,
    reason: '길고 날카로운 눈과 높은 광대, 가늘지만 긴장된 하관이 황비호의 젊은 장남이자 주나라 선봉에게 필요한 속도와 공격성을 만든다.',
    regenerationDirection: '날렵한 눈매와 긴 얼굴축, 수염 없는 젊은 피부를 보존하고 도가 수련자의 머리 장식과 선봉장의 전투 흔적을 더한다.',
    risk: '얼굴을 지나치게 가늘게 만들면 선봉 무장의 체력보다 예민함만 남을 수 있다.',
  },
  'shen-gongbao': {
    materialId: 'MF-20260831-0347',
    score: 94,
    reason: '무거운 눈꺼풀과 비스듬한 시선, 길게 좁아지는 얼굴과 억제된 입매가 타인을 전쟁으로 끌어들이는 도사의 지략과 음험함을 보여 준다.',
    regenerationDirection: '깊은 눈과 긴 코, 좁은 하관을 보존하고 나이 인상을 30대 후반으로 높여 도관과 검은 수염, 설득하는 듯한 미세한 미소를 더한다.',
    risk: '피로한 눈매를 과장하면 교활한 도사보다 병약하거나 무기력한 인물처럼 보일 수 있다.',
  },
  'yunxiao-niangniang': {
    materialId: 'MF-20260831-0187',
    score: 94,
    reason: '성숙한 타원형 골격과 차분하게 모인 눈, 곧은 코와 절제된 입매가 삼소낭랑 맏이의 침착한 권위와 법력을 자연스럽게 만든다.',
    regenerationDirection: '30대 중후반의 얼굴 비례와 침착한 눈빛을 보존하고 도가 여선인의 관과 운문, 구곡황하진의 황금빛 법력을 더한다.',
    risk: '표정을 지나치게 부드럽게 만들면 여러 선인을 제압한 강한 결단력이 약해질 수 있다.',
  },
  'yellow-robe-demon': {
    materialId: 'MF-20260831-0215',
    score: 90,
    reason: '깊게 팬 눈과 긴 코, 마른 볼과 오래된 표정선이 천계에서 내려온 규목랑의 비인간적 연륜과 13년에 걸친 집착을 강하게 드러낸다.',
    regenerationDirection: '긴 얼굴축과 깊은 눈, 마른 하관을 보존하되 60대 인상으로 조절하고 황금 갑주와 늑대별의 어두운 광채를 더한다.',
    risk: '노년성을 과장하면 공주를 납치한 집요한 요괴보다 쇠약한 노인처럼 보일 수 있다.',
  },
  ptah: {
    materialId: 'MF-20260831-0261',
    score: 95,
    reason: '넓은 이마와 굵은 눈썹, 깊은 눈과 넓고 각진 턱이 생각과 말로 세계를 세운 창조신에게 필요한 고요하고 기념비적인 권위를 만든다.',
    regenerationDirection: '강한 눈썹과 깊은 눈, 곧은 코와 넓은 턱을 보존하고 머리카락은 프타의 밀착 두건으로 정리해 창조의 홀과 청금석 광휘를 더한다.',
    risk: '눈썹과 턱을 과도하게 강화하면 사려 깊은 창조신보다 전투신처럼 보일 수 있다.',
  },
  'ame-no-tajikarao': {
    materialId: 'MF-20260831-0346',
    score: 92,
    reason: '반듯한 이마와 높은 광대, 곧은 코와 긴장된 입매가 천암호를 열 힘을 안으로 응축한 젊은 남신의 단단한 집중력을 보여 준다.',
    regenerationDirection: '긴 눈과 높은 광대, 정면 대칭성을 보존하고 목과 턱의 근육감, 굵은 머리 묶음과 바위문을 들어 올리는 신성한 압력을 더한다.',
    risk: '하관을 그대로 가늘게 두면 힘의 신에게 필요한 육체적 중량감이 부족할 수 있다.',
  },
  hoori: {
    materialId: 'MF-20260831-0359',
    score: 94,
    reason: '크고 맑은 눈과 높은 대칭성, 곧은 콧대와 부드럽게 좁아지는 턱이 산의 사냥꾼이자 신성한 왕자의 젊음과 품위를 함께 만든다.',
    regenerationDirection: '젊고 정제된 얼굴 비례와 큰 눈을 보존하고 산사냥꾼의 머리 묶음, 활과 바다 궁전에서 얻은 조수의 푸른 광채를 더한다.',
    risk: '피부를 지나치게 매끈하게 만들면 사냥꾼의 생동감보다 궁정 미소년의 인상만 남을 수 있다.',
  },
  iwanagahime: {
    materialId: 'MF-20260831-0186',
    score: 94,
    reason: '높은 광대와 긴 눈, 곧은 코와 단단히 닫힌 입매가 늙거나 흉측하지 않으면서 바위의 영속성과 거절당한 여신의 자존심을 보여 준다.',
    regenerationDirection: '긴 타원형 골격과 차분한 눈, 피부의 작은 점을 보존하고 관자와 목 주변에 어두운 암석 결정과 오래된 이끼의 질감을 더한다.',
    risk: '광대와 눈썹을 지나치게 날카롭게 만들면 단단한 존엄보다 공격적인 악역 인상으로 기울 수 있다.',
  },
}

const ROUND3_MANUAL_SELECTIONS = {
  'boyi-kao': {
    materialId: 'MF-20260831-0504',
    sourceFile: 'boyi-kao-young-real.jpg',
    sourcePage: 'https://www.pexels.com/photo/portrait-of-a-young-man-14965340/',
    sourceImage: 'https://images.pexels.com/photos/14965340/pexels-photo-14965340.jpeg',
    photographer: '小 布',
    score: 94,
    reason: '실제 촬영된 젊은 남성의 가는 얼굴 골격과 맑지만 긴장된 눈, 감정을 누른 입매가 백읍고의 온화한 고결함과 예정된 비극을 함께 보여 준다.',
    regenerationDirection: '실제 얼굴의 좁은 타원형 골격과 맑은 눈, 수염 없는 젊은 피부를 보존하고 서주의 왕자다운 단정한 관과 예복, 절제된 슬픔을 더한다.',
    risk: '조명을 그대로 과장하면 신화 인물보다 현대 사진 스튜디오의 극적인 연출이 앞설 수 있다.',
    appearance: {
      face_visible: true,
      presentation: 'masculine',
      apparent_age_band: '20대 초중반으로 보이는 젊은 성인',
      visible_skin_tone: '중간 밝기의 따뜻한 피부톤',
      hair: '짧고 곧은 검은 머리',
      facial_hair: '눈에 띄는 수염 없음',
      face_shape: '세로로 긴 좁은 타원형',
      face_structure: '완만한 광대와 곧은 콧대, 가늘지만 단정한 턱선이 이어지는 젊은 얼굴',
      distinctive_visible_features: ['두껍지 않은 곧은 눈썹과 맑은 눈', '곧은 코와 감정을 억제한 입매'],
      expression_energy: '조용하고 진지하며 긴장과 슬픔을 안으로 누르는 인상',
      mythic_face_potential_score: 4,
      mythic_face_potential_reason: '정제된 젊은 골격과 흔들리지 않는 눈이 비극적 왕자형으로 확장하기 좋다.',
      best_archetypes: ['youth', 'sovereign', 'tragic'],
    },
  },
  'huang-feihu': {
    materialId: 'MF-20260831-0505',
    sourceFile: 'huang-feihu-middle-aged-real.jpg',
    sourcePage: 'https://www.pexels.com/photo/sad-middle-aged-man-thinking-4584068/',
    sourceImage: 'https://images.pexels.com/photos/4584068/pexels-photo-4584068.jpeg',
    photographer: 'Ketut Subiyanto',
    score: 95,
    reason: '실제 중년 남성의 넓은 이마와 굵은 눈썹, 자연스러운 눈가 주름과 단단한 하관이 전장을 오래 지휘한 황비호의 연륜과 현실적인 무게를 만든다.',
    regenerationDirection: '넓은 이마와 굵은 눈썹, 자연스러운 중년의 피부 질감과 단단한 턱을 보존하고 상나라 무성왕의 갑주와 흔들리지 않는 장군의 정면 응시를 더한다.',
    risk: '피로한 눈꺼풀과 주름을 과장하면 현역 장군보다 쇠약하거나 의기소침한 인상으로 기울 수 있다.',
    appearance: {
      face_visible: true,
      presentation: 'masculine',
      apparent_age_band: '40대 후반~50대 초반으로 보이는 중년',
      visible_skin_tone: '중간 밝기의 따뜻한 피부톤',
      hair: '짧고 곧은 검은 머리',
      facial_hair: '눈에 띄는 수염 없음',
      face_shape: '넓은 이마와 단단한 턱을 지닌 긴 타원형',
      face_structure: '넓은 이마, 굵은 눈썹, 곧은 코와 폭이 있는 하관이 안정적인 중량감을 만든다',
      distinctive_visible_features: ['굵고 선명한 눈썹과 깊은 눈꺼풀', '자연스러운 눈가 주름과 단단히 다문 입매'],
      expression_energy: '피로를 견디면서도 쉽게 흔들리지 않는 노련하고 현실적인 인상',
      mythic_face_potential_score: 4,
      mythic_face_potential_reason: '중년의 실제 질감과 무게 있는 골격이 장군·왕·가부장형 신화 인물에 강하다.',
      best_archetypes: ['warrior', 'sovereign', 'father'],
    },
  },
  'shen-gongbao': {
    materialId: 'MF-20260831-0506',
    sourceFile: 'shen-gongbao-fashion-real.jpg',
    sourcePage: 'https://www.pexels.com/photo/stylish-portrait-of-an-east-asian-male-model-31630003/',
    sourceImage: 'https://images.pexels.com/photos/31630003/pexels-photo-31630003.jpeg',
    photographer: 'Shima Nia',
    score: 96,
    reason: '실제 촬영된 남성의 길고 마른 얼굴, 비대칭적으로 넘긴 장발과 무표정한 눈이 신공표의 세련된 지성, 자기 연출, 속내를 드러내지 않는 위험성을 함께 만든다.',
    regenerationDirection: '길고 마른 얼굴과 낮게 가라앉은 눈, 높은 이마와 비대칭 장발을 보존하고 도사의 관과 검은 수염, 상대를 설득하는 미세한 냉소를 더한다.',
    risk: '현대 패션 요소를 남기거나 장발을 과장하면 도사보다 현대 예술가의 인상이 앞설 수 있다.',
    appearance: {
      face_visible: true,
      presentation: 'masculine',
      apparent_age_band: '30대 초중반으로 보이는 성인',
      visible_skin_tone: '밝은 편의 중성 피부톤',
      hair: '한쪽을 넘기고 뒤로 길게 내린 검은 장발',
      facial_hair: '눈에 띄는 수염 없음',
      face_shape: '세로로 길고 하관이 좁은 타원형',
      face_structure: '높은 이마와 완만한 광대, 곧은 코와 좁게 닫히는 턱이 지적이고 날렵한 인상을 만든다',
      distinctive_visible_features: ['낮게 가라앉은 긴 눈과 무표정한 응시', '비대칭 장발과 길고 마른 얼굴 비례'],
      expression_energy: '감정을 감추고 상대를 관찰하는 차갑고 계산적인 인상',
      mythic_face_potential_score: 5,
      mythic_face_potential_reason: '비대칭 장발과 길고 절제된 골격이 교활한 도사·책사·이단적 신격으로 확장하기 좋다.',
      best_archetypes: ['mystic', 'trickster', 'advisor'],
    },
  },
  hoori: {
    materialId: 'MF-20260831-0507',
    sourceFile: 'hoori-young-real.jpg',
    sourcePage: 'https://www.pexels.com/photo/dramatic-studio-portrait-of-young-asian-male-model-35514244/',
    sourceImage: 'https://images.pexels.com/photos/35514244/pexels-photo-35514244.jpeg',
    photographer: 'Thien Le Duy',
    score: 95,
    reason: '실제 촬영된 젊은 남성의 넓은 광대와 단단한 턱, 빠르게 모이는 눈이 호오리의 왕자다운 아름다움뿐 아니라 사냥꾼의 기민함과 체력까지 지탱한다.',
    regenerationDirection: '넓은 광대와 단단한 턱, 날렵한 눈과 젊은 얼굴 비례를 보존하고 일본 고대 왕자의 머리 묶음, 사냥 활과 바다 신궁의 푸른 신광을 더한다.',
    risk: '색조 조명과 매끈한 보정을 그대로 따르면 신화적 사냥꾼보다 현대 화보 모델처럼 보일 수 있다.',
    appearance: {
      face_visible: true,
      presentation: 'masculine',
      apparent_age_band: '20대 중후반으로 보이는 젊은 성인',
      visible_skin_tone: '중간 밝기의 따뜻한 피부톤',
      hair: '짧고 위로 정돈한 검은 머리',
      facial_hair: '눈에 띄는 수염 없음',
      face_shape: '광대와 턱의 폭이 균형 잡힌 각진 타원형',
      face_structure: '넓은 광대, 곧은 코와 선명한 하악선이 젊고 강건한 얼굴을 만든다',
      distinctive_visible_features: ['안쪽으로 빠르게 모이는 날렵한 눈', '넓은 광대와 또렷한 턱선'],
      expression_energy: '자신감이 강하고 즉시 행동할 듯 집중된 젊은 인상',
      mythic_face_potential_score: 5,
      mythic_face_potential_reason: '젊음과 단단한 골격이 왕자·사냥꾼·태양계 신손의 신성을 함께 받쳐 준다.',
      best_archetypes: ['youth', 'hunter', 'sovereign'],
    },
  },
  igraine: {
    materialId: 'MF-20260831-0508',
    sourceFile: 'igraine-alt-7316518.jpg',
    sourcePage: 'https://www.pexels.com/photo/portrait-of-a-beautiful-woman-with-brown-hair-looking-at-the-camera-7316518/',
    sourceImage: 'https://images.pexels.com/photos/7316518/pexels-photo-7316518.jpeg',
    photographer: 'behrouz sasani',
    score: 94,
    reason: '실제 촬영된 여성의 길고 단단한 얼굴 골격, 큰 눈과 선명한 눈썹, 곧은 코가 이그레인의 궁정적 존재감과 훗날 아서의 어머니가 되는 강한 혈통감을 만든다.',
    regenerationDirection: '긴 타원형 골격과 큰 눈, 선명한 눈썹과 곧은 코를 보존하고 나이는 30대 후반으로 올려 브리튼 귀부인의 모성, 절제된 위엄과 자연스러운 피부 연륜을 더한다.',
    risk: '화장과 눈 크기를 과장하면 중세 귀부인보다 현대 뷰티 화보의 인상이 앞설 수 있다.',
    appearance: {
      face_visible: true,
      presentation: 'feminine',
      apparent_age_band: '20대 후반으로 보이는 성인',
      visible_skin_tone: '밝은 편의 따뜻한 피부톤',
      hair: '길고 곧은 짙은 갈색 머리',
      facial_hair: '보이는 수염 없음',
      face_shape: '세로로 긴 타원형에 단단한 턱선',
      face_structure: '넓은 이마와 높은 광대, 곧은 코와 길게 닫히는 턱이 선명한 궁정형 골격을 만든다',
      distinctive_visible_features: ['크고 밝은 눈과 선명하게 뻗은 눈썹', '곧은 코와 길고 단단한 얼굴 비례'],
      expression_energy: '정면을 또렷하게 바라보는 자신감 있고 경계심 있는 인상',
      mythic_face_potential_score: 5,
      mythic_face_potential_reason: '큰 눈과 선명한 골격이 왕비·예언된 어머니·비극적 귀부인의 신성으로 확장하기 좋다.',
      best_archetypes: ['sovereign', 'maternal', 'tragic'],
    },
  },
}

const ROUND3_UNUSED_AI_EXCLUSIONS = new Set([
  'MF-20260831-0209',
  'MF-20260831-0210',
  'MF-20260831-0339',
  'MF-20260831-0357',
  'MF-20260831-0368',
  'MF-20260831-0372',
  'MF-20260831-0374',
])

const GROUPS = [
  {
    id: 'arthur',
    traditions: new Set(['arthur-round-table']),
  },
  {
    id: 'greek-origin',
    traditions: new Set(['argonauts', 'greek-roman-myth']),
  },
  {
    id: 'heracles',
    traditions: new Set(['heracles']),
  },
  {
    id: 'iliad',
    traditions: new Set(['homer-iliad']),
  },
  {
    id: 'odyssey',
    traditions: new Set(['homer-odyssey']),
  },
  {
    id: 'atreus',
    traditions: new Set(['house-of-atreus']),
  },
  {
    id: 'china',
    traditions: new Set(['myth-china-fengshen', 'myth-china-xiyou']),
  },
  {
    id: 'egypt',
    traditions: new Set(['myth-egypt']),
  },
  {
    id: 'japan',
    traditions: new Set(['myth-japan', 'myth-korea']),
  },
  {
    id: 'norse',
    traditions: new Set(['myth-norse']),
  },
]

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function registerRound3RealPhotos() {
  const rawRoot = readJson(MATERIALS_RAW_PATH)
  const appearanceRoot = readJson(APPEARANCES_PATH)
  const combinedRoot = readJson(MATERIALS_PATH)
  const rawMaterials = rawRoot.materials ?? rawRoot
  const appearances = appearanceRoot.appearances ?? appearanceRoot
  const combinedMaterials = combinedRoot.materials ?? combinedRoot
  const rawById = new Map(rawMaterials.map((row) => [row.material_id, row]))
  const appearanceById = new Map(appearances.map((row) => [row.material_id, row]))
  const combinedById = new Map(combinedMaterials.map((row) => [row.material_id, row]))
  const sourceRecords = []

  mkdirSync(path.join(ROOT, '재료'), { recursive: true })
  mkdirSync(ROUND3_PROVENANCE_ROOT, { recursive: true })

  for (const [slug, spec] of Object.entries(ROUND3_MANUAL_SELECTIONS)) {
    const source = path.join(ROUND3_WEB_INPUTS, spec.sourceFile)
    if (!existsSync(source)) throw new Error(`${slug}: 실사 원본 누락 ${source}`)
    const extension = path.extname(spec.sourceFile).toLowerCase()
    const filename = `${spec.materialId}${extension}`
    const destination = path.join(ROOT, '재료', filename)
    const sourceBuffer = readFileSync(source)
    const sourceSha256 = createHash('sha256').update(sourceBuffer).digest('hex')
    if (existsSync(destination)) {
      const destinationSha256 = createHash('sha256').update(readFileSync(destination)).digest('hex')
      if (destinationSha256 !== sourceSha256) throw new Error(`${slug}: 재료 ID 파일 충돌 ${destination}`)
    } else {
      copyFileSync(source, destination)
    }
    const metadata = await sharp(destination).metadata()
    const appearance = {
      material_id: spec.materialId,
      file: destination,
      ...spec.appearance,
      archetype_reasons: Object.fromEntries(spec.appearance.best_archetypes.map((name) => [name, '실제 촬영 얼굴의 골격과 표정이 해당 신화 원형으로 확장하기 좋다.'])),
      weak_fit_archetypes: [],
      regeneration_strengths: [
        '실제 촬영에서 확인되는 피부 질감과 얼굴 비대칭을 생성 기준으로 보존할 수 있다',
        '눈·코·광대·턱의 구조가 선명해 신화 복식과 광원을 더해도 얼굴 정체성이 유지된다',
      ],
      regeneration_risks: [spec.risk],
      uncertainty: 'Pexels 촬영 사진과 촬영자 표기를 확인했다. 조명·화장·후보정은 얼굴의 실제 피부색과 미세 질감 판단에 영향을 줄 수 있다.',
      classifier: {
        provider: 'codex-manual',
        model: 'gpt-5.6-sol',
        method: 'visual_audit_verified_stock_photo',
        completed_at: new Date().toISOString(),
      },
    }
    const material = {
      material_id: spec.materialId,
      filename,
      material_path: destination,
      material_relative_path: path.join('재료', filename),
      extension,
      sha256: sourceSha256,
      bytes: sourceBuffer.length,
      width: metadata.width,
      height: metadata.height,
      collection_record_path: ROUND3_PROVENANCE_ROOT,
      collection_provenance: {
        note: '사용자가 AI 생성 얼굴을 폐기해 실제 촬영 사진만 다시 확보한 3차 교체 재료다.',
        slug,
        primary_tradition: slug === 'hoori' ? 'myth-japan' : slug === 'igraine' ? 'arthur-round-table' : 'myth-china-fengshen',
        query: 'verified real portrait photograph for mythology face regeneration',
        source_type: 'pexels_real_photo',
        source_page_url: spec.sourcePage,
        image_url: spec.sourceImage,
        photographer: spec.photographer,
        license_note: 'Pexels 페이지에서 Free to use로 표시된 촬영 사진',
        identity_check: '스톡 사진 페이지의 촬영자와 사진 설명을 확인했으며 공인 신원으로 배정하지 않는다.',
        identity_risk: 'low',
        quality_note: '실제 인물을 촬영한 선명한 얼굴 사진이며 신화 인물 재생성용 골격·표정 기준으로 사용할 수 있다.',
        divine_presence_at_collection: 'regeneration-ready',
        photo_verification: {
          accepted_as_real_photo: true,
          evidence: 'Pexels 개별 사진 페이지, 촬영자 표기, Stock Photo/Free to use 표기와 원본의 자연스러운 피부·광학 질감을 함께 확인',
        },
      },
    }

    if (rawById.has(spec.materialId) && rawById.get(spec.materialId).sha256 !== sourceSha256) {
      throw new Error(`${slug}: materials.json ID 충돌 ${spec.materialId}`)
    }
    if (appearanceById.has(spec.materialId) && appearanceById.get(spec.materialId).file !== destination) {
      throw new Error(`${slug}: appearances.json ID 충돌 ${spec.materialId}`)
    }
    if (!rawById.has(spec.materialId)) {
      rawMaterials.push(material)
      rawById.set(spec.materialId, material)
    }
    if (!appearanceById.has(spec.materialId)) {
      appearances.push(appearance)
      appearanceById.set(spec.materialId, appearance)
    }
    if (!combinedById.has(spec.materialId)) {
      const combined = { ...material, appearance }
      combinedMaterials.push(combined)
      combinedById.set(spec.materialId, combined)
    }
    sourceRecords.push({
      target_slug: slug,
      material_id: spec.materialId,
      source_page_url: spec.sourcePage,
      source_image_url: spec.sourceImage,
      photographer: spec.photographer,
      local_material_path: destination,
      accepted_as_real_photo: true,
    })
  }

  const generatedAt = new Date().toISOString()
  rawMaterials.sort((a, b) => a.material_id.localeCompare(b.material_id))
  appearances.sort((a, b) => a.material_id.localeCompare(b.material_id))
  combinedMaterials.sort((a, b) => a.material_id.localeCompare(b.material_id))
  writeJson(MATERIALS_RAW_PATH, {
    ...rawRoot,
    generated_at: generatedAt,
    material_count: rawMaterials.length,
    materials: rawMaterials,
  })
  writeJson(APPEARANCES_PATH, {
    ...appearanceRoot,
    generated_at: generatedAt,
    material_count: appearances.length,
    classified_count: appearances.length,
    appearances,
  })
  writeFileSync(APPEARANCE_JSONL_PATH, `${appearances.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8')
  writeJson(MATERIALS_PATH, {
    ...combinedRoot,
    generated_at: generatedAt,
    material_count: combinedMaterials.length,
    materials: combinedMaterials,
  })
  writeJson(path.join(ROUND3_PROVENANCE_ROOT, 'sources.json'), {
    generated_at: generatedAt,
    purpose: 'AI 생성 얼굴 폐기 후 실제 촬영 사진으로 교체',
    sources: sourceRecords,
  })

  const readmePath = path.join(ROOT, 'README.md')
  const readme = readFileSync(readmePath, 'utf8')
    .replace(/\d+장의 미배정 얼굴 재료다\./u, `${rawMaterials.length}장의 미배정 얼굴 재료다.`)
    .replace(/은 \d+장 전부의 외형 분류다\./u, `은 ${rawMaterials.length}장 전부의 외형 분류다.`)
  writeFileSync(readmePath, readme, 'utf8')
  return { materialCount: rawMaterials.length, sourceRecords }
}

function stripAnsi(value) {
  return String(value ?? '').replace(/\u001B(?:[@-_][0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001B\\))/gu, '')
}

function jsonObjectsFromText(text) {
  const objects = []
  for (let start = 0; start < text.length; start += 1) {
    if (text[start] !== '{') continue
    let depth = 0
    let inString = false
    let escaped = false
    for (let index = start; index < text.length; index += 1) {
      const character = text[index]
      if (inString) {
        if (escaped) escaped = false
        else if (character === '\\') escaped = true
        else if (character === '"') inString = false
        continue
      }
      if (character === '"') inString = true
      else if (character === '{') depth += 1
      else if (character === '}') {
        depth -= 1
        if (depth === 0) {
          try { objects.push(JSON.parse(text.slice(start, index + 1))) } catch { /* 다음 객체를 본다. */ }
          start = index
          break
        }
      }
    }
  }
  return objects
}

function groupForTradition(tradition) {
  return GROUPS.find((group) => group.traditions.has(tradition))
}

function compatibleCastingPool(targetGroup, materialGroup) {
  if (targetGroup === materialGroup) return true
  return GREEK_CASTING_GROUPS.has(targetGroup) && GREEK_CASTING_GROUPS.has(materialGroup)
}

function allowedPresentation(target) {
  if (target.gender_label === 'female') return new Set(['feminine', 'androgynous', 'unclear'])
  if (target.gender_label === 'male') return new Set(['masculine', 'androgynous', 'unclear'])
  return new Set(['masculine', 'feminine', 'androgynous', 'unclear'])
}

function compactMaterial(row, castingPoolGroup = null) {
  const appearance = row.appearance
  return {
    material_id: row.material_id,
    pool_group: castingPoolGroup ?? groupForTradition(row.collection_provenance.primary_tradition)?.id,
    source_tradition: row.collection_provenance.primary_tradition,
    presentation: appearance.presentation,
    age: appearance.apparent_age_band,
    face_shape: appearance.face_shape,
    face_structure: appearance.face_structure,
    features: appearance.distinctive_visible_features,
    energy: appearance.expression_energy,
    archetypes: appearance.best_archetypes,
    potential: appearance.mythic_face_potential_score,
  }
}

function compactTarget(row) {
  return {
    target_id: row.id,
    target_slug: row.slug,
    name: row.nickname,
    name_en: row.nickname_en,
    gender: row.gender_label,
    title: row.title,
    bio: row.bio,
    tradition: row.traditions[0].slug,
    pool_group: groupForTradition(row.traditions[0].slug)?.id,
    user_direction: ROUND2_REQUESTS[row.slug],
  }
}

function xml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

async function buildContactSheets(lane, materials) {
  const columns = 5
  const rowsPerSheet = 5
  const cellWidth = 290
  const cellHeight = 310
  const headerHeight = 110
  const perSheet = columns * rowsPerSheet
  const files = []
  for (let offset = 0; offset < materials.length; offset += perSheet) {
    const chunk = materials.slice(offset, offset + perSheet)
    const width = columns * cellWidth
    const height = headerHeight + rowsPerSheet * cellHeight
    const page = Math.floor(offset / perSheet) + 1
    const overlays = [{
      input: Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ece9e2"/><text x="30" y="45" font-family="Arial, Malgun Gothic" font-size="28" font-weight="700">${xml(lane.id)} candidate faces ${page}</text><text x="30" y="80" font-family="Arial, Malgun Gothic" font-size="18">Material ID and visible face only; clothing/background are irrelevant</text></svg>`),
      left: 0,
      top: 0,
    }]
    for (const [index, material] of chunk.entries()) {
      const x = (index % columns) * cellWidth
      const y = headerHeight + Math.floor(index / columns) * cellHeight
      const face = await sharp(material.material_path)
        .rotate()
        .resize(250, 250, { fit: 'cover', position: 'attention' })
        .png()
        .toBuffer()
      overlays.push({ input: face, left: x + 20, top: y + 8 })
      const label = Buffer.from(`<svg width="${cellWidth}" height="52" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#171717"/><text x="12" y="24" font-family="Consolas, Arial" font-size="18" font-weight="700" fill="#fff">${xml(material.material_id)}</text><text x="12" y="45" font-family="Arial, Malgun Gothic" font-size="14" fill="#ddd">${xml(material.appearance.presentation)} · ${xml(material.appearance.apparent_age_band.slice(0, 22))}</text></svg>`)
      overlays.push({ input: label, left: x, top: y + 258 })
    }
    const file = path.join(WORK_ROOT, `${lane.id}-faces-${String(page).padStart(2, '0')}.jpg`)
    await sharp({ create: { width, height, channels: 3, background: '#ece9e2' } })
      .composite(overlays)
      .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
      .toFile(file)
    files.push(file)
  }
  return files
}

function promptFor(lane, inputPath, sheetPaths) {
  return `당신은 사용자 지적에 따라 잘못 뽑힌 신화 인물 얼굴 후보를 교체하는 Kiro-Sol 재캐스팅 워커다. ` +
    `이 작업은 직접 처리하고 내부 서브에이전트에 위임하지 마라. 재귀 위임도 금지한다. ` +
    `로컬 입력 ${inputPath} 을 처음부터 끝까지 읽고, 얼굴 후보 시트 ${sheetPaths.join(', ')} 를 모두 이미지로 직접 열어 보라. ` +
    `입력의 targets는 이번에 반드시 새 얼굴로 교체할 대상이고 candidates는 기존 확정 얼굴 및 사용자가 폐기한 얼굴을 제외한 미사용 재료다. ` +
    `각 target은 같은 pool_group 후보만 쓸 수 있고, 여성 target은 feminine/androgynous/unclear, 남성 target은 masculine/androgynous/unclear만 허용한다. ` +
    `파일명·수집 당시 인물명·의상·배경·워터마크는 배정 근거가 아니다. 시트에서 실제 얼굴을 보고 골격, 눈, 코, 입, 피부 생기, 나이 인상, 표정 에너지만 판단한다. ` +
    `특히 user_direction은 사용자의 반려 사유이므로 최우선 조건이다. 너무 늙음·시체 같음·푸근함·평온함·더 늙어야 함 같은 지시를 반대로 해석하지 마라. ` +
    `각 대상마다 서로 다른 얼굴을 최종 1순위로 만들 수 있도록 전체 배치를 조정하고, 72점 이상 후보를 최대 4개 제안한다. ` +
    `reason은 시트에서 확인한 구체적 얼굴 특징과 사용자 지시를 함께 한 문장으로 설명한다. regeneration_direction은 얼굴 정체성을 보존하면서 신화 요소를 어떻게 더할지 쓴다. risk는 어긋날 수 있는 핵심 한 가지다. ` +
    `실제 인물의 민족·국적·신원을 추정하지 말고, target의 전승권과 시각적 연결만 판단한다. ` +
    `응답은 설명·마크다운·코드펜스 없이 minified JSON 객체 하나다. 최상위 키는 lane_id와 results. lane_id는 ${lane.id}. ` +
    `results는 입력 target 순서 그대로 ${lane.targets.length}건이며 각 항목 키는 target_id, target_slug, ranked_candidates, no_match_reason. ` +
    `ranked_candidates 각 항목 키는 material_id, score, reason, regeneration_direction, risk. 파일을 쓰거나 수정하지 마라.`
}

function validateLane(result, lane, materialById) {
  if (result?.lane_id !== lane.id) throw new Error(`${lane.id}: lane_id 불일치`)
  if (!Array.isArray(result.results) || result.results.length !== lane.targets.length) {
    throw new Error(`${lane.id}: 결과 건수 불일치 ${result.results?.length}`)
  }
  const targetById = new Map(lane.targets.map((target) => [target.id, target]))
  const seenTargets = new Set()
  for (const row of result.results) {
    const target = targetById.get(row.target_id)
    if (!target || row.target_slug !== target.slug || seenTargets.has(row.target_id)) {
      throw new Error(`${lane.id}: 대상 불일치 또는 중복 ${row.target_slug}`)
    }
    seenTargets.add(row.target_id)
    if (!Array.isArray(row.ranked_candidates) || row.ranked_candidates.length > 4) {
      throw new Error(`${lane.id}: 후보 배열 오류 ${row.target_slug}`)
    }
    const seenMaterials = new Set()
    for (const candidate of row.ranked_candidates) {
      const material = materialById.get(candidate.material_id)
      if (!material || seenMaterials.has(candidate.material_id)) {
        throw new Error(`${lane.id}: 없는 후보 또는 중복 ${candidate.material_id}`)
      }
      seenMaterials.add(candidate.material_id)
      const targetGroup = groupForTradition(target.traditions[0].slug)?.id
      const materialGroup = groupForTradition(material.collection_provenance.primary_tradition)?.id
      const sameGroup = compatibleCastingPool(targetGroup, materialGroup)
      if (!sameGroup && CROSS_GROUP_APPROVALS.get(target.slug) !== candidate.material_id) {
        throw new Error(`${lane.id}: 전승 풀 위반 ${row.target_slug} -> ${candidate.material_id}`)
      }
      if (!allowedPresentation(target).has(material.appearance.presentation)) {
        throw new Error(`${lane.id}: 성별 표현 위반 ${row.target_slug} -> ${candidate.material_id}`)
      }
      if (!Number.isInteger(candidate.score) || candidate.score < MIN_SCORE || candidate.score > 100) {
        throw new Error(`${lane.id}: 점수 오류 ${row.target_slug}`)
      }
      for (const key of ['reason', 'regeneration_direction', 'risk']) {
        if (typeof candidate[key] !== 'string' || !candidate[key].trim()) {
          throw new Error(`${lane.id}: ${row.target_slug} ${key} 누락`)
        }
      }
    }
    if (typeof row.no_match_reason !== 'string') row.no_match_reason = ''
  }
  return result
}

async function runLane(lane, inputPath, sheetPaths, materialById, workerId) {
  let lastError
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const result = await runKiro(promptFor(lane, inputPath, sheetPaths), {
      cwd: PROJECT_ROOT,
      model: MODEL,
      effort: 'high',
      agentEngine: 'v3',
      trustTools: ['read'],
      timeoutMs: 30 * 60_000,
      maxOutputBytes: 8_000_000,
    })
    try {
      if (result.code !== 0 || result.timedOut || result.hardThrottle) {
        throw new Error(`Kiro exit=${result.code} timeout=${result.timedOut} throttle=${result.hardThrottle}: ${stripAnsi(result.stderr || result.stdout).slice(-2_000)}`)
      }
      const clean = stripAnsi(result.stdout)
      const parsed = jsonObjectsFromText(clean).find((row) => row?.lane_id === lane.id && Array.isArray(row?.results))
      if (!parsed) throw new Error(`응답에서 ${lane.id} JSON을 찾지 못했다.`)
      const validated = validateLane(parsed, lane, materialById)
      console.log(JSON.stringify({ event: 'lane_complete', lane: lane.id, worker: workerId, attempt, targets: lane.targets.length }))
      return { ...validated, worker: workerId, attempt }
    } catch (error) {
      lastError = error
      console.error(JSON.stringify({ event: 'lane_retry', lane: lane.id, worker: workerId, attempt, error: error.message.slice(0, 2_000) }))
    }
  }
  throw lastError
}

// n <= m 최소 비용 할당. 각 대상에 전용 dummy 열을 둔다.
function hungarian(cost) {
  const n = cost.length
  const m = cost[0].length
  const u = Array(n + 1).fill(0)
  const v = Array(m + 1).fill(0)
  const p = Array(m + 1).fill(0)
  const way = Array(m + 1).fill(0)
  for (let i = 1; i <= n; i += 1) {
    p[0] = i
    let j0 = 0
    const minv = Array(m + 1).fill(Number.POSITIVE_INFINITY)
    const used = Array(m + 1).fill(false)
    do {
      used[j0] = true
      const i0 = p[j0]
      let delta = Number.POSITIVE_INFINITY
      let j1 = 0
      for (let j = 1; j <= m; j += 1) {
        if (used[j]) continue
        const current = cost[i0 - 1][j - 1] - u[i0] - v[j]
        if (current < minv[j]) {
          minv[j] = current
          way[j] = j0
        }
        if (minv[j] < delta) {
          delta = minv[j]
          j1 = j
        }
      }
      for (let j = 0; j <= m; j += 1) {
        if (used[j]) {
          u[p[j]] += delta
          v[j] -= delta
        } else minv[j] -= delta
      }
      j0 = j1
    } while (p[j0] !== 0)
    do {
      const j1 = way[j0]
      p[j0] = p[j1]
      j0 = j1
    } while (j0 !== 0)
  }
  const assignment = Array(n).fill(-1)
  for (let j = 1; j <= m; j += 1) if (p[j] !== 0) assignment[p[j] - 1] = j - 1
  return assignment
}

function resolveLane(lane, result, materials) {
  const rawByTarget = new Map(result.results.map((row) => [row.target_id, row]))
  const materialIds = materials.map((row) => row.material_id)
  const materialIndex = new Map(materialIds.map((id, index) => [id, index]))
  const dummyOffset = materialIds.length
  const forbidden = 100_000
  const cost = lane.targets.map((target, targetIndex) => {
    const row = Array(materialIds.length + lane.targets.length).fill(forbidden)
    for (const candidate of rawByTarget.get(target.id)?.ranked_candidates ?? []) {
      const index = materialIndex.get(candidate.material_id)
      if (index != null) row[index] = 100 - candidate.score
    }
    row[dummyOffset + targetIndex] = 100
    return row
  })
  const assignment = hungarian(cost)
  return lane.targets.map((target, index) => {
    const column = assignment[index]
    if (column < 0 || column >= materialIds.length) {
      throw new Error(`${target.nickname}: 고유 새 후보를 배정하지 못했다.`)
    }
    const materialId = materialIds[column]
    const candidate = rawByTarget.get(target.id)?.ranked_candidates?.find((row) => row.material_id === materialId)
    if (!candidate) throw new Error(`${target.nickname}: 배정 후보 세부값 누락`)
    return {
      target_id: target.id,
      target_slug: target.slug,
      target_name: target.nickname,
      target_name_en: target.nickname_en,
      gender: target.gender_label,
      traditions: target.traditions.map((row) => row.slug),
      status: 'matched',
      material_id: candidate.material_id,
      fit_score: candidate.score,
      reason: candidate.reason,
      regeneration_direction: candidate.regeneration_direction,
      risk: candidate.risk,
      revision: REVISION,
    }
  })
}

function externalMatch(target, spec) {
  const extension = path.extname(spec.source)
  const staged = path.join(SELECTED_INPUTS, `${spec.id}${extension}`)
  const preview = path.join(MATCHING_CROPS, `${spec.id}_face.png`)
  copyFileSync(spec.source, staged)
  return {
    target_id: target.id,
    target_slug: target.slug,
    target_name: target.nickname,
    target_name_en: target.nickname_en,
    gender: target.gender_label,
    traditions: target.traditions.map((row) => row.slug),
    status: 'matched',
    material_id: spec.id,
    fit_score: 100,
    reason: spec.reason,
    regeneration_direction: spec.regenerationDirection,
    risk: '사용자 지정·기존 팩션 자산이므로 새 얼굴 후보로 대체하지 않는다.',
    source_type: spec.sourceType,
    source_path: spec.source,
    source_note: spec.sourceNote,
    preview_path: preview,
    appearance_override: spec.appearance,
    revision: REVISION,
  }
}

function reassignedMatch(target, sourceMatch, spec) {
  return {
    target_id: target.id,
    target_slug: target.slug,
    target_name: target.nickname,
    target_name_en: target.nickname_en,
    gender: target.gender_label,
    traditions: target.traditions.map((row) => row.slug),
    status: 'matched',
    material_id: sourceMatch.material_id,
    fit_score: spec.fitScore,
    reason: spec.reason,
    regeneration_direction: spec.regenerationDirection,
    risk: spec.risk,
    revision: REVISION,
    reassigned_from: spec.fromSlug,
  }
}

function manualMatch(target, spec, revision = REVISION, selectionMethod = 'manual_visual_audit') {
  return {
    target_id: target.id,
    target_slug: target.slug,
    target_name: target.nickname,
    target_name_en: target.nickname_en,
    gender: target.gender_label,
    traditions: target.traditions.map((row) => row.slug),
    status: 'matched',
    material_id: spec.materialId,
    fit_score: spec.score,
    reason: spec.reason,
    regeneration_direction: spec.regenerationDirection,
    risk: spec.risk,
    revision,
    selection_method: selectionMethod,
    ...(spec.sourcePage ? {
      source_type: 'verified_real_photo',
      source_note: `실제 촬영 사진 · ${spec.photographer} · Pexels 확인`,
      source_page_url: spec.sourcePage,
    } : {}),
  }
}

async function main() {
  const materialRoot = readJson(MATERIALS_PATH)
  const targetRoot = readJson(TARGETS_PATH)
  const proposal = readJson(PROPOSAL_PATH)
  const candidateRoot = readJson(CANDIDATES_PATH)
  const materials = materialRoot.materials ?? materialRoot
  const targets = targetRoot.targets ?? targetRoot
  const targetBySlug = new Map(targets.map((row) => [row.slug, row]))
  const materialById = new Map(materials.map((row) => [row.material_id, row]))
  const requestedSlugs = new Set([
    ...Object.keys(ROUND2_REQUESTS),
    ...Object.keys(ROUND2_REASSIGN),
    ...Object.keys(ROUND2_EXTERNAL),
  ])
  if (requestedSlugs.size !== 17) throw new Error(`2차 교체 대상이 17명이 아니다: ${requestedSlugs.size}`)
  for (const slug of requestedSlugs) if (!targetBySlug.has(slug)) throw new Error(`대상 slug 누락: ${slug}`)
  for (const [slug, spec] of Object.entries(ROUND2_EXTERNAL)) {
    if (!existsSync(spec.source)) throw new Error(`${slug} 지정 이미지 누락: ${spec.source}`)
  }

  const oldByTarget = new Map(proposal.matches.map((row) => [row.target_id, row]))
  const affectedTargetIds = new Set([...requestedSlugs].map((slug) => targetBySlug.get(slug).id))
  const reassignedSourceMaterialIds = new Set()
  for (const [slug, spec] of Object.entries(ROUND2_REASSIGN)) {
    const sourceTarget = targetBySlug.get(spec.fromSlug)
    const sourceMatch = oldByTarget.get(sourceTarget?.id)
    if (!sourceMatch?.material_id?.startsWith('MF-')) {
      throw new Error(`${slug}: 재배정 원본 ${spec.fromSlug} 얼굴을 찾지 못했다.`)
    }
    reassignedSourceMaterialIds.add(sourceMatch.material_id)
  }
  const historicallyRejectedMaterialIds = new Set([
    ...(candidateRoot.user_recast?.rejected_material_ids ?? []),
    ...(candidateRoot.user_recast_round2?.cumulative_rejected_material_ids ?? []),
  ])
  const rejectedMaterialIds = new Set(
    proposal.matches
      .filter((row) => affectedTargetIds.has(row.target_id) && row.status === 'matched' && row.material_id?.startsWith('MF-'))
      .filter((row) => !reassignedSourceMaterialIds.has(row.material_id))
      .map((row) => row.material_id),
  )
  const reservedMaterialIds = new Set(
    [
      ...proposal.matches
      .filter((row) => !affectedTargetIds.has(row.target_id) && row.status === 'matched' && row.material_id?.startsWith('MF-'))
      .map((row) => row.material_id),
      ...reassignedSourceMaterialIds,
    ],
  )
  const eligible = materials.filter((row) =>
    row.appearance.face_visible
    && row.appearance.mythic_face_potential_score >= MIN_POTENTIAL
    && groupForTradition(row.collection_provenance.primary_tradition)
    && !reservedMaterialIds.has(row.material_id)
    && !rejectedMaterialIds.has(row.material_id)
    && !historicallyRejectedMaterialIds.has(row.material_id))

  rmSync(SELECTED_INPUTS, { recursive: true, force: true })
  mkdirSync(WORK_ROOT, { recursive: true })
  mkdirSync(SELECTED_INPUTS, { recursive: true })
  mkdirSync(MATCHING_CROPS, { recursive: true })

  const recastTargets = Object.keys(ROUND2_REQUESTS).map((slug) => targetBySlug.get(slug))
  const lanes = []
  for (const group of GROUPS) {
    const groupTargets = recastTargets.filter((target) => group.id === groupForTradition(target.traditions[0].slug)?.id)
    if (groupTargets.length === 0) continue
    const allowedPresentations = new Set(groupTargets.flatMap((target) => [...allowedPresentation(target)]))
    const groupMaterials = eligible.filter((material) =>
      compatibleCastingPool(group.id, groupForTradition(material.collection_provenance.primary_tradition)?.id)
      && allowedPresentations.has(material.appearance.presentation))
    if (groupTargets.length <= 4) {
      lanes.push({ ...group, targets: groupTargets, materials: groupMaterials })
      continue
    }
    for (let offset = 0; offset < groupTargets.length; offset += 4) {
      lanes.push({
        ...group,
        id: `${group.id}-${String(Math.floor(offset / 4) + 1).padStart(2, '0')}`,
        poolGroup: group.id,
        targets: groupTargets.slice(offset, offset + 4),
        materials: groupMaterials,
      })
    }
  }
  if (lanes.reduce((sum, lane) => sum + lane.targets.length, 0) !== 16) {
    throw new Error(`Kiro 레인/대상 수 불일치: lanes=${lanes.length}, targets=${lanes.reduce((sum, lane) => sum + lane.targets.length, 0)}`)
  }

  console.log(JSON.stringify({
    event: 'start',
    model: MODEL,
    workers: KIRO_WORKERS,
    recast: recastTargets.length,
    external: Object.keys(ROUND2_EXTERNAL).length,
    rejected_old_materials: rejectedMaterialIds.size,
    lanes: lanes.map((lane) => ({ lane: lane.id, targets: lane.targets.length, candidates: lane.materials.length })),
  }))

  const laneJobs = []
  for (const lane of lanes) {
    const inputPath = path.join(WORK_ROOT, `${lane.id}-input.json`)
    writeJson(inputPath, {
      lane_id: lane.id,
      targets: lane.targets.map(compactTarget),
      candidates: lane.materials.map((material) => compactMaterial(material, lane.poolGroup ?? lane.id)),
    })
    const sheetPaths = await buildContactSheets(lane, lane.materials)
    laneJobs.push({ lane, inputPath, sheetPaths })
  }

  const laneResults = []
  for (const job of laneJobs) {
    const resultPath = path.join(WORK_ROOT, `${job.lane.id}-result.json`)
    let result = null
    if (existsSync(resultPath)) {
      try {
        result = validateLane(readJson(resultPath), job.lane, materialById)
        console.log(JSON.stringify({ event: 'lane_reused', lane: job.lane.id, targets: job.lane.targets.length }))
      } catch (error) {
        console.error(JSON.stringify({ event: 'lane_cache_rejected', lane: job.lane.id, error: error.message }))
      }
    }
    if (!result) {
      result = await runLane(job.lane, job.inputPath, job.sheetPaths, materialById, 1)
      writeJson(resultPath, result)
    }
    laneResults.push(result)
  }
  const recastMatches = resolveLane(
    { targets: recastTargets },
    { results: laneResults.flatMap((result) => result.results) },
    eligible,
  )
  const recastByTarget = new Map(recastMatches.map((row) => [row.target_id, row]))

  for (const row of recastMatches) {
    const source = materialById.get(row.material_id).material_path
    copyFileSync(source, path.join(SELECTED_INPUTS, path.basename(source)))
  }
  const reassignedMatches = Object.entries(ROUND2_REASSIGN).map(([slug, spec]) => {
    const sourceTarget = targetBySlug.get(spec.fromSlug)
    const sourceMatch = oldByTarget.get(sourceTarget.id)
    const match = reassignedMatch(targetBySlug.get(slug), sourceMatch, spec)
    const source = materialById.get(match.material_id).material_path
    copyFileSync(source, path.join(SELECTED_INPUTS, path.basename(source)))
    return match
  })
  for (const row of reassignedMatches) recastByTarget.set(row.target_id, row)
  const externalMatches = Object.entries(ROUND2_EXTERNAL).map(([slug, spec]) => externalMatch(targetBySlug.get(slug), spec))
  for (const row of externalMatches) recastByTarget.set(row.target_id, row)

  const matches = proposal.matches.map((row) => recastByTarget.get(row.target_id) ?? row)
  const matched = matches.filter((row) => row.status === 'matched')
  const uniqueIds = new Set(matched.map((row) => row.material_id))
  if (matched.length !== proposal.matched_count || uniqueIds.size !== matched.length) {
    throw new Error(`최종 고유 배정 불일치: matched=${matched.length}, unique=${uniqueIds.size}`)
  }
  for (const slug of Object.keys(ROUND2_REQUESTS)) {
    const target = targetBySlug.get(slug)
    const before = oldByTarget.get(target.id)
    const after = recastByTarget.get(target.id)
    if (!after || before?.material_id === after.material_id) throw new Error(`${slug}: 기존 후보가 그대로 남았다.`)
  }
  for (const [slug, spec] of Object.entries(ROUND2_REASSIGN)) {
    const target = targetBySlug.get(slug)
    const sourceTarget = targetBySlug.get(spec.fromSlug)
    const after = recastByTarget.get(target.id)
    const sourceBefore = oldByTarget.get(sourceTarget.id)
    if (!after || after.material_id !== sourceBefore?.material_id) {
      throw new Error(`${slug}: ${spec.fromSlug} 얼굴 재배정이 정확히 적용되지 않았다.`)
    }
  }

  writeJson(PROPOSAL_PATH, {
    ...proposal,
    generated_at: new Date().toISOString(),
    revision: REVISION,
    revision_count: requestedSlugs.size,
    applied_to_db_or_storage: false,
    matches,
  })
  writeJson(CANDIDATES_PATH, {
    ...candidateRoot,
    user_recast_round2: {
      generated_at: new Date().toISOString(),
      model: MODEL,
      workers: KIRO_WORKERS,
      requested: requestedSlugs.size,
      recast: recastMatches.length,
      reassigned: reassignedMatches.length,
      external: externalMatches.length,
      rejected_material_ids: [...rejectedMaterialIds].sort(),
      cumulative_rejected_material_ids: [...new Set([
        ...historicallyRejectedMaterialIds,
        ...rejectedMaterialIds,
      ])].sort(),
      lanes: laneResults,
    },
  })
  writeJson(path.join(WORK_ROOT, 'resolved.json'), {
    recast: recastMatches,
    reassigned: reassignedMatches,
    external: externalMatches,
  })
  console.log(JSON.stringify({
    event: 'finish',
    changed: requestedSlugs.size,
    recast: recastMatches.length,
    reassigned: reassignedMatches.length,
    external: externalMatches.length,
    selected_inputs: SELECTED_INPUTS,
    proposal: PROPOSAL_PATH,
  }))
}

async function manualMain() {
  const materialRoot = readJson(MATERIALS_PATH)
  const targetRoot = readJson(TARGETS_PATH)
  const proposal = readJson(PROPOSAL_PATH)
  const candidateRoot = readJson(CANDIDATES_PATH)
  const materials = materialRoot.materials ?? materialRoot
  const targets = targetRoot.targets ?? targetRoot
  const targetBySlug = new Map(targets.map((row) => [row.slug, row]))
  const materialById = new Map(materials.map((row) => [row.material_id, row]))
  const oldByTarget = new Map(proposal.matches.map((row) => [row.target_id, row]))
  const manualSlugs = Object.keys(ROUND2_MANUAL_SELECTIONS)
  const requestSlugs = Object.keys(ROUND2_REQUESTS)
  const reassignedSlugs = Object.keys(ROUND2_REASSIGN)
  const requestedSlugs = new Set([...manualSlugs, ...reassignedSlugs])

  if (manualSlugs.length !== 16 || requestedSlugs.size !== 17) {
    throw new Error(`수동 2차 교체 건수 불일치: manual=${manualSlugs.length}, total=${requestedSlugs.size}`)
  }
  if (requestSlugs.some((slug) => !ROUND2_MANUAL_SELECTIONS[slug]) || manualSlugs.some((slug) => !ROUND2_REQUESTS[slug])) {
    throw new Error('수동 배정 대상과 사용자 교체 대상이 일치하지 않는다.')
  }
  for (const slug of requestedSlugs) {
    if (!targetBySlug.has(slug)) throw new Error(`대상 slug 누락: ${slug}`)
  }

  const affectedTargetIds = new Set([...requestedSlugs].map((slug) => targetBySlug.get(slug).id))
  const reassignedSourceMaterialIds = new Set()
  for (const [slug, spec] of Object.entries(ROUND2_REASSIGN)) {
    const sourceTarget = targetBySlug.get(spec.fromSlug)
    const sourceMatch = oldByTarget.get(sourceTarget?.id)
    if (!sourceMatch?.material_id?.startsWith('MF-')) {
      throw new Error(`${slug}: 재배정 원본 ${spec.fromSlug} 얼굴을 찾지 못했다.`)
    }
    reassignedSourceMaterialIds.add(sourceMatch.material_id)
  }
  const historicallyRejectedMaterialIds = new Set([
    ...(candidateRoot.user_recast?.rejected_material_ids ?? []),
    ...(candidateRoot.user_recast_round2?.cumulative_rejected_material_ids ?? []),
  ])
  const rejectedMaterialIds = new Set(
    proposal.matches
      .filter((row) => affectedTargetIds.has(row.target_id) && row.status === 'matched' && row.material_id?.startsWith('MF-'))
      .filter((row) => !reassignedSourceMaterialIds.has(row.material_id))
      .map((row) => row.material_id),
  )
  const reservedMaterialIds = new Set([
    ...proposal.matches
      .filter((row) => !affectedTargetIds.has(row.target_id) && row.status === 'matched' && row.material_id?.startsWith('MF-'))
      .map((row) => row.material_id),
    ...reassignedSourceMaterialIds,
  ])

  const selectedMaterialIds = new Set()
  const recastMatches = manualSlugs.map((slug) => {
    const target = targetBySlug.get(slug)
    const spec = ROUND2_MANUAL_SELECTIONS[slug]
    const material = materialById.get(spec.materialId)
    if (!material?.appearance?.face_visible) throw new Error(`${slug}: 얼굴 재료 누락 ${spec.materialId}`)
    if (!allowedPresentation(target).has(material.appearance.presentation)) {
      throw new Error(`${slug}: 성별 표현 불일치 ${spec.materialId}`)
    }
    if (historicallyRejectedMaterialIds.has(spec.materialId) || rejectedMaterialIds.has(spec.materialId)) {
      throw new Error(`${slug}: 폐기 얼굴 재사용 ${spec.materialId}`)
    }
    if (reservedMaterialIds.has(spec.materialId)) throw new Error(`${slug}: 기존 확정 얼굴 중복 ${spec.materialId}`)
    if (selectedMaterialIds.has(spec.materialId)) throw new Error(`${slug}: 2차 배정 중복 ${spec.materialId}`)
    if (!Number.isInteger(spec.score) || spec.score < MIN_SCORE || spec.score > 100) {
      throw new Error(`${slug}: 점수 오류 ${spec.score}`)
    }
    selectedMaterialIds.add(spec.materialId)
    return manualMatch(target, spec)
  })

  const recastByTarget = new Map(recastMatches.map((row) => [row.target_id, row]))
  const reassignedMatches = Object.entries(ROUND2_REASSIGN).map(([slug, spec]) => {
    const sourceTarget = targetBySlug.get(spec.fromSlug)
    const sourceMatch = oldByTarget.get(sourceTarget.id)
    return reassignedMatch(targetBySlug.get(slug), sourceMatch, spec)
  })
  for (const row of reassignedMatches) recastByTarget.set(row.target_id, row)

  const matches = proposal.matches.map((row) => recastByTarget.get(row.target_id) ?? row)
  const matched = matches.filter((row) => row.status === 'matched')
  const uniqueMaterialIds = new Set(matched.map((row) => row.material_id))
  if (matched.length !== proposal.matched_count || uniqueMaterialIds.size !== matched.length) {
    throw new Error(`최종 고유 배정 불일치: matched=${matched.length}, unique=${uniqueMaterialIds.size}`)
  }
  for (const slug of manualSlugs) {
    const target = targetBySlug.get(slug)
    const before = oldByTarget.get(target.id)
    const after = recastByTarget.get(target.id)
    if (!after || before?.material_id === after.material_id) throw new Error(`${slug}: 기존 후보가 그대로 남았다.`)
  }

  mkdirSync(WORK_ROOT, { recursive: true })
  mkdirSync(SELECTED_INPUTS, { recursive: true })
  mkdirSync(MATCHING_CROPS, { recursive: true })
  for (const row of [...recastMatches, ...reassignedMatches]) {
    const source = materialById.get(row.material_id).material_path
    copyFileSync(source, path.join(SELECTED_INPUTS, path.basename(source)))
  }

  const cumulativeRejectedMaterialIds = [...new Set([
    ...historicallyRejectedMaterialIds,
    ...rejectedMaterialIds,
  ])].sort()
  writeJson(PROPOSAL_PATH, {
    ...proposal,
    generated_at: new Date().toISOString(),
    revision: REVISION,
    revision_count: requestedSlugs.size,
    applied_to_db_or_storage: false,
    matches,
  })
  writeJson(CANDIDATES_PATH, {
    ...candidateRoot,
    user_recast_round2: {
      generated_at: new Date().toISOString(),
      method: 'manual_visual_audit_after_kiro_exhausted',
      requested: requestedSlugs.size,
      recast: recastMatches.length,
      reassigned: reassignedMatches.length,
      external: 0,
      rejected_material_ids: [...rejectedMaterialIds].sort(),
      cumulative_rejected_material_ids: cumulativeRejectedMaterialIds,
      selections: recastMatches,
      reassignments: reassignedMatches,
    },
  })
  writeJson(path.join(WORK_ROOT, 'resolved.json'), {
    recast: recastMatches,
    reassigned: reassignedMatches,
    external: [],
  })
  console.log(JSON.stringify({
    event: 'finish_manual',
    changed: requestedSlugs.size,
    recast: recastMatches.length,
    reassigned: reassignedMatches.length,
    rejected_round2: rejectedMaterialIds.size,
    rejected_cumulative: cumulativeRejectedMaterialIds.length,
    selected_inputs: SELECTED_INPUTS,
    proposal: PROPOSAL_PATH,
  }))
}

async function manualRound3Main() {
  const registration = await registerRound3RealPhotos()
  const materialRoot = readJson(MATERIALS_PATH)
  const targetRoot = readJson(TARGETS_PATH)
  const proposal = readJson(PROPOSAL_PATH)
  const candidateRoot = readJson(CANDIDATES_PATH)
  const materials = materialRoot.materials ?? materialRoot
  const targets = targetRoot.targets ?? targetRoot
  const targetBySlug = new Map(targets.map((row) => [row.slug, row]))
  const materialById = new Map(materials.map((row) => [row.material_id, row]))
  const oldByTarget = new Map(proposal.matches.map((row) => [row.target_id, row]))
  const round3Slugs = Object.keys(ROUND3_MANUAL_SELECTIONS)
  if (round3Slugs.length !== 5) throw new Error(`3차 교체 대상 수량 불일치: ${round3Slugs.length}`)
  for (const slug of round3Slugs) {
    if (!targetBySlug.has(slug)) throw new Error(`대상 slug 누락: ${slug}`)
  }

  const affectedTargetIds = new Set(round3Slugs.map((slug) => targetBySlug.get(slug).id))
  const historicallyRejectedMaterialIds = new Set([
    ...(candidateRoot.user_recast?.rejected_material_ids ?? []),
    ...(candidateRoot.user_recast_round2?.cumulative_rejected_material_ids ?? []),
  ])
  const rejectedMaterialIds = new Set(
    proposal.matches
      .filter((row) => affectedTargetIds.has(row.target_id) && row.status === 'matched' && row.material_id?.startsWith('MF-'))
      .map((row) => row.material_id),
  )
  if (rejectedMaterialIds.size !== 5) throw new Error(`3차 폐기 얼굴 수량 불일치: ${rejectedMaterialIds.size}`)
  const reservedMaterialIds = new Set(
    proposal.matches
      .filter((row) => !affectedTargetIds.has(row.target_id) && row.status === 'matched' && row.material_id?.startsWith('MF-'))
      .map((row) => row.material_id),
  )
  for (const materialId of ROUND3_UNUSED_AI_EXCLUSIONS) {
    if (reservedMaterialIds.has(materialId)) throw new Error(`AI 의심 재료가 다른 인물에 이미 배정됨: ${materialId}`)
  }

  const selectedMaterialIds = new Set()
  const recastMatches = round3Slugs.map((slug) => {
    const target = targetBySlug.get(slug)
    const spec = ROUND3_MANUAL_SELECTIONS[slug]
    const material = materialById.get(spec.materialId)
    if (!material?.appearance?.face_visible) throw new Error(`${slug}: 실사 얼굴 재료 누락 ${spec.materialId}`)
    if (!material.collection_provenance?.photo_verification?.accepted_as_real_photo) {
      throw new Error(`${slug}: 실사 검증 표시 누락 ${spec.materialId}`)
    }
    if (!allowedPresentation(target).has(material.appearance.presentation)) {
      throw new Error(`${slug}: 성별 표현 불일치 ${spec.materialId}`)
    }
    if (historicallyRejectedMaterialIds.has(spec.materialId) || rejectedMaterialIds.has(spec.materialId) || ROUND3_UNUSED_AI_EXCLUSIONS.has(spec.materialId)) {
      throw new Error(`${slug}: 폐기 얼굴 재사용 ${spec.materialId}`)
    }
    if (reservedMaterialIds.has(spec.materialId)) throw new Error(`${slug}: 기존 확정 얼굴 중복 ${spec.materialId}`)
    if (selectedMaterialIds.has(spec.materialId)) throw new Error(`${slug}: 3차 배정 중복 ${spec.materialId}`)
    selectedMaterialIds.add(spec.materialId)
    return manualMatch(target, spec, ROUND3_REVISION, 'manual_web_verified_real_photo')
  })

  const recastByTarget = new Map(recastMatches.map((row) => [row.target_id, row]))
  const matches = proposal.matches.map((row) => recastByTarget.get(row.target_id) ?? row)
  const matched = matches.filter((row) => row.status === 'matched')
  const uniqueMaterialIds = new Set(matched.map((row) => row.material_id))
  if (matched.length !== proposal.matched_count || uniqueMaterialIds.size !== matched.length) {
    throw new Error(`최종 고유 배정 불일치: matched=${matched.length}, unique=${uniqueMaterialIds.size}`)
  }
  for (const slug of round3Slugs) {
    const target = targetBySlug.get(slug)
    const before = oldByTarget.get(target.id)
    const after = recastByTarget.get(target.id)
    if (!after || before?.material_id === after.material_id) throw new Error(`${slug}: 기존 후보가 그대로 남았다.`)
  }

  mkdirSync(ROUND3_WORK_ROOT, { recursive: true })
  mkdirSync(ROUND3_SELECTED_INPUTS, { recursive: true })
  mkdirSync(MATCHING_CROPS, { recursive: true })
  for (const row of recastMatches) {
    const source = materialById.get(row.material_id).material_path
    copyFileSync(source, path.join(ROUND3_SELECTED_INPUTS, path.basename(source)))
  }

  const cumulativeRejectedMaterialIds = [...new Set([
    ...historicallyRejectedMaterialIds,
    ...rejectedMaterialIds,
    ...ROUND3_UNUSED_AI_EXCLUSIONS,
  ])].sort()
  const generatedAt = new Date().toISOString()
  writeJson(PROPOSAL_PATH, {
    ...proposal,
    generated_at: generatedAt,
    revision: ROUND3_REVISION,
    revision_count: round3Slugs.length,
    applied_to_db_or_storage: false,
    matches,
  })
  writeJson(CANDIDATES_PATH, {
    ...candidateRoot,
    user_recast_round3: {
      generated_at: generatedAt,
      method: 'manual_visual_audit_verified_real_photos',
      requested: round3Slugs.length,
      recast: recastMatches.length,
      rejected_material_ids: [...rejectedMaterialIds].sort(),
      excluded_unused_ai_material_ids: [...ROUND3_UNUSED_AI_EXCLUSIONS].sort(),
      cumulative_rejected_material_ids: cumulativeRejectedMaterialIds,
      selections: recastMatches,
      sources: registration.sourceRecords,
    },
  })
  writeJson(path.join(ROUND3_WORK_ROOT, 'resolved.json'), {
    recast: recastMatches,
    rejected_material_ids: [...rejectedMaterialIds].sort(),
    excluded_unused_ai_material_ids: [...ROUND3_UNUSED_AI_EXCLUSIONS].sort(),
  })
  console.log(JSON.stringify({
    event: 'finish_manual_round3_real_photos',
    changed: round3Slugs.length,
    recast: recastMatches.length,
    rejected_round3: rejectedMaterialIds.size,
    rejected_cumulative: cumulativeRejectedMaterialIds.length,
    materials: registration.materialCount,
    selected_inputs: ROUND3_SELECTED_INPUTS,
    proposal: PROPOSAL_PATH,
  }))
}

manualRound3Main().catch((error) => {
  console.error(error)
  process.exit(1)
})
