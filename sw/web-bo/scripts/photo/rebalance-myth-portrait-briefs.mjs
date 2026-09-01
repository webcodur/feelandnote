/**
 * Repair the approved mythology portrait briefs after the first visual batch
 * exposed two prompt-level biases:
 *   1. crop geometry was being solved with extra shoulder clothing and clasps;
 *   2. Japanese figures were flattened into one generic Kofun reconstruction.
 *
 * This script does not generate, upload, register, or delete any image.
 */
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

const ROOT = 'D:\\remotion-assets\\celeb-mythology-face-candidates'
const PROMPT_ROOT = path.join(ROOT, '개인초상화-프롬프트')
const PROMPTS_PATH = path.join(PROMPT_ROOT, 'portrait-prompts.json')
const BY_TRADITION = path.join(PROMPT_ROOT, '전승별')
const JAPAN_REF_ROOT = path.join(PROMPT_ROOT, '일본-도상-ref')
const BACKUP_ROOT = path.join(ROOT, '_backup', '20260901-before-garment-rebalance')

const LOWER_EDGE_OLD = '- Below the chin or lower jaw, only a little neck, canonical fur or feathers, explicitly specified garment drape or armor edge, veil ties, or long hair may fill the remaining space. Do NOT pull the camera back to fit the shoulders.'
const LOWER_EDGE_INTERMEDIATE = '- At the lower edge, show the character-specific material described above in broad, quiet shapes. Ordinary garment fastening sits below the crop; only a named canonical ornament appears. An open neckline may continue below the crop. The face remains visually dominant.'
const LOWER_EDGE_NEW = '- At the lower edge, show only the character-specific material described above in broad, quiet shapes. A named canonical ornament may appear as a subordinate detail. An open neckline may continue below the crop. The face remains visually dominant.'
const CROP_OLD = '- The collarbone and chest are NOT visible, and the torso is never long. Follow only the neckline, closure, mantle, veil, headwear, jewelry, or armor explicitly specified above. Keep any exposed lower neckline below the tight crop instead of inventing a modern or unattested high collar.'
const CROP_INTERMEDIATE = '- The collarbone and chest stay outside the image because of the tight camera crop, and the torso is never long. Clothing does not rise or multiply merely to fill the lower frame.'
const CROP_NEW = '- The tight camera crop places the collarbone and chest outside the image and keeps the visible torso short while preserving the natural level of the described neckline.'

const WARM_ANCIENT_TRADITIONS = new Set([
  'argonauts',
  'greek-roman-myth',
  'heracles',
  'homer-iliad',
  'homer-odyssey',
  'house-of-atreus',
  'virgil-aeneid',
])

const IMPRESSION_OVERRIDES = {
  alcmene: 'A steadfast maternal presence radiating composed warmth, healthy adult vitality, quiet fortitude, and enduring devotion.',
}

const POSE_OVERRIDES = {
  laertes: 'Direct camera gaze with a left 15 degrees head rotation, showing a deeply experienced and enduring calm with a faint, poignant gentle smile.',
}

const GREEK_CORE = {
  argus: 'A single unbleached linen exomis leaves the working shoulder free, while one narrow brown wool strip falls behind the opposite shoulder and out of frame.',
  calais: 'A wind-light slate-blue linen chlamys sweeps diagonally behind the neck, its navy edge lifting loosely like the wake of the north wind.',
  hypsipyle: 'A saffron-and-terracotta fine-wool peplos forms one clean royal plane at the base of the neck, with a narrow cream linen edge appearing only on one side.',
  idas: 'A dark sleeveless combat chiton frames the neck, with one short deep-crimson wool fold thrown back from a shoulder.',
  lynceus: 'A light unbleached linen chiton leaves the neck clear, while a narrow deep-green seafarer cloth falls behind one shoulder.',
  pelias: 'A single Tyrian-purple wool himation with a restrained geometric border crosses one shoulder in a broad royal fold and leaves the neck open.',
  tiphys: 'A durable slate-grey linen seafarer chiton forms one salt-muted plane at the lower edge, with a narrow storm-dark cloth falling behind one shoulder.',
  zetes: 'A lightweight charcoal-and-slate linen chlamys sweeps behind one shoulder in a sharp wind-cut diagonal.',

  asclepius: 'A single ivory linen chiton frames the neck, with one loose cream himation edge resting low on a shoulder.',
  cronus: 'A charcoal wool himation crosses the lower frame in one deep diagonal fold, weighty but uncluttered around the neck.',
  eros: 'A thin saffron-gold linen chlamys alone forms an airy diagonal at the lower edge.',
  gaia: 'A terracotta wool peplos forms one broad earthen plane, with a raw peat-brown edge appearing only at one lower corner.',
  hecate: 'A midnight-blue fine-wool peplos forms one dark plane while a sheer charcoal veil falls behind the hair rather than around the neck.',
  hestia: 'A simple cream wool peplos forms a calm lower plane, with one warm saffron veil edge falling behind the hair.',
  iris: 'One translucent sky-blue and lavender pleated linen textile flows across the lower edge like a thin ribbon of rain-lit water.',
  pan: 'A rough moss-green wool strip crosses one shoulder while natural goat fur and the open neck remain visible at the lower edge.',
  persephone: 'A deep pomegranate-crimson wool peplos forms one clear lower plane, with a narrow charcoal veil descending behind the hair.',
  prometheus: 'A single coarse, timeworn strip of wool crosses one shoulder and falls out of frame, leaving the neck and upper shoulder line open and unencumbered.',
  rhea: 'A deep lapis-blue wool peplos with one broad ochre woven edge forms a warm, protective royal plane at the lower frame.',
  uranus: 'A midnight-navy wool plane threaded with sparse silver fibers falls away from the neck in one vast, quiet diagonal.',

  alcmene: 'A single saffron fine-wool peplos forms a youthful, clean lower plane, with only a thin cream linen edge visible.',
  amphitryon: 'A dark woven military tunic frames the neck while one short crimson chlamys fold falls behind a shoulder.',
  antaeus: 'One ochre sheepskin crosses a shoulder while the opposite side remains open, giving the earth-born giant a raw, unlayered silhouette.',
  atlas: 'A single rough slate-grey wool strip crosses one shoulder and falls out of frame with austere weight-bearing simplicity.',
  hippolyta: 'A supple tan deerskin tunic with a restrained Amazonian woven border frames the neck in one lean martial plane.',
  hylas: 'A single fine ivory-and-sea-blue linen chiton forms a light, youthful plane at the lower edge.',
  iphicles: 'A dark olive military chiton frames the neck, with one narrow green travel-cloth fold falling behind a shoulder.',
}

const SPECIAL_COSTUMES = {
  ...GREEK_CORE,

  'cumaean-sibyl': 'A deep-blue mantle-veil frames the head and falls once over one shoulder, with only a narrow pale tunic neckline visible.',
  'euryalus-of-troy': 'A deep-red late-antique tunic with a plain rounded neckline forms the lower edge.',
  evander: 'A grey-brown mantle wraps one shoulder in a single broad fold, with its plain edge resting below the neck.',
  lavinia: 'A warm yellow mantle-veil frames the hair and falls softly behind one shoulder above a pale cream neckline.',
  'nisus-of-troy': 'A dark olive late-antique soldier tunic with a clean rounded neckline forms the lower edge.',
  'pallas-of-arcadia': 'A rich purple late-antique mantle crosses one shoulder in a single clean fold, leaving a narrow light-cream neckline visible.',

  amun: 'A high flat-topped crown supports two tall vertical plumes, while only the upper arc of a restrained blue-green wesekh collar enters the lower edge.',
  khnum: 'A single finely pleated white linen wrap sits low around the ram neck and shoulders, leaving the head and horns visually dominant.',
  ptah: 'A close-fitting white mummiform shroud encloses the neck and shoulders, with its plain upper edge forming the only garment visible.',
  sobek: 'The upper arc of a restrained green-and-blue wesekh collar rests at the base of the crocodilian neck, while natural scales define the shoulder silhouette.',

  anu: 'A tiered horned divine tiara crowns the head, while a single dark-indigo flounced robe edge appears low at the neck and one shoulder.',
  dumuzi: 'A single cream fleeced shepherd wrap crosses one shoulder and sits low in the frame.',
  enlil: 'A three-tier horned divine crown rises above one storm-grey flounced wool robe edge at the lower frame.',
  ereshkigal: 'A two-tier horned black tiara crowns the underworld queen above one obsidian wool robe plane.',
  'ishkur-adad': 'A horned bronze storm cap and one deep-indigo fringed warrior mantle fold define the lower silhouette.',
  nabu: 'A tall horned polos rises above a plain ivory robe neckline, leaving the shoulders visually uncluttered.',
  namma: 'A subtle horned diadem accompanies a single sea-green flounced robe edge at the neckline.',
  'nanna-sin': 'A crescent-bearing horned tiara crowns the head above one midnight-blue fringed wool robe edge.',
  nergal: 'A horned martial cap rises above one burnt-ochre felted wool mantle fold at a shoulder.',
  nidaba: 'A small horned diadem crowns the grain goddess above one cream fringed linen robe plane and a single lapis-carnelian bead strand.',
  ningishzida: 'A dark horned bronze cap rises above one moss-green fringed wool fold crossing a shoulder.',
  ninlil: 'A twin-horned divine diadem crowns the head above one saffron-and-blue fringed robe draped at a single shoulder.',
  ninurta: 'A three-tier horned bronze warrior cap rises above one ochre-and-crimson battle-mantle fold.',
  'utu-shamash': 'A tiered horned tiara and restrained solar rays define the divine silhouette, while only a narrow white-and-gold flounced robe edge enters the lower frame.',

  abhimanyu: 'A single saffron uttariya crosses the left shoulder while the neck remains unadorned.',
  ashvatthama: 'The luminous forehead mani is the sole regalia, accompanied by a plain ash-grey uttariya resting low on one shoulder.',
  dhrishtadyumna: 'A tall cylindrical kirita-mukuta rises above one rich crimson uttariya fold at a shoulder.',
  ghatotkacha: 'A single deep olive tussar-silk wrap crosses low over the natural rakshasa shoulder line.',
  jayadratha: 'A restrained tiered royal crown rises above one deep peacock-teal uttariya fold at a shoulder.',
  kunti: 'A plain ivory uttariya covers the head and falls once over one shoulder, with the neckline left unadorned.',
  pandu: 'A slender engraved royal brow band accompanies one pale-gold and sage uttariya fold at a shoulder.',
  shikhandi: 'A single deep-indigo uttariya crosses one shoulder beneath a plain woven forehead band.',
  vidura: 'A plain cream uttariya rests on one shoulder, with the sacred thread barely entering the lower edge.',
  ahalya: 'A single unbleached tussar-silk hermitage wrap crosses one shoulder, with a pale lotus-pink edge at the neckline.',
  angada: 'A tiered Kishkindha crown is the sole regalia above the natural simian neck and shoulder fur.',
  dasharatha: 'A tall solar crown and one saffron uttariya over the left shoulder define the king while the neck remains unadorned.',
  kaikeyi: 'A low ardha-mukuta and a single deep-purple veil frame the face and one shoulder.',
  kausalya: 'An ivory veil-uttariya frames the head and falls softly over one shoulder.',
  mandodari: 'A tiered karanda-mukuta crowns the head above one midnight-blue uttariya crossing a single shoulder.',
  shatrughna: 'A modest gold coronet rises above one saffron-orange uttariya fold at a shoulder.',
  shurpanakha: 'A deep-crimson tussar-silk wrap crosses one shoulder beneath a pair of hammered copper earrings.',
  tara: 'A tiered Kishkindha queen crown with a restrained vermilion binding is the sole regalia above her natural simian neck and shoulder fur.',

  'elaine-of-corbenic': 'A pale ivory silk cotte with a modest rounded neckline sits beneath one silver-grey mantle fold, framed by a soft translucent veil around the neck and shoulders.',
  igraine: 'A deep plum wool noble cotte is framed by a crisp white linen barbette and wimple, with a slate-grey vair-lined mantle resting in broad winter folds.',
  'isolde-of-ireland': 'An emerald wool-and-silk bliaut with a gold-thread rounded neckline is framed by one dark forest-green mantle fold.',
  'king-mark-of-cornwall': 'A midnight-blue royal tunic sits beneath one broad ermine-lined wool mantle fold and an open trefoil gold crown.',
  'sir-agravain': 'A charcoal sleeveless surcoat lies over a riveted mail hauberk, with the folded mail coif forming the base of the neck.',
  'sir-bors-the-younger': 'An unbleached ash-grey surcoat lies over an iron mail hauberk, with a soft linen undertunic visible at the rounded neck opening.',
  'sir-gareth': 'A forest-green cyclas surcoat with a fine silver-cord neckline lies over an iron mail hauberk and a folded mail coif.',
  'sir-kay': 'A deep-crimson garde-corps robe with a rounded neck opening is framed by one weighty scarlet mantle fold.',
  'sir-palamedes': 'A deep indigo-black tiraz surcoat with geometric gold neckline embroidery lies over a riveted mail hauberk and an integral mail collar.',
  'uther-pendragon': 'A scarlet vair-lined royal mantle rests over a riveted mail hauberk beneath an open trefoil gold crown.',

  andromache: 'A rich purple Trojan wool robe forms one dignified lower plane while a natural cream linen veil falls behind the hair.',
  antilochus: 'A crimson wool warrior tunic with reinforced shoulder joins frames the neck, with one narrow dark mantle fold behind a shoulder.',
  astyanax: 'An ivory linen child tunic with a narrow purple woven edge forms a light, age-appropriate lower plane.',
  briseis: 'A saffron pleated linen robe forms one soft lower plane, with only a narrow slate-blue wool edge at one side.',
  calchas: 'An austere off-white priestly himation with a dark purple border crosses one shoulder in a single dry fold.',
  chryseis: 'An ivory pleated linen tunic forms the neckline while one deep-green wool fold falls behind a shoulder.',
  deiphobus: 'A conical hammered-bronze combat helmet with flared leather cheek guards rises above a crimson wool warrior tunic with reinforced shoulder borders.',
  dolon: 'A cured grey wolfskin cap continues as one rough pelt edge behind a shoulder above a simple dark wool tunic with an open rounded neckline.',
  glaucus: 'A single Tyrian-purple Anatolian wool tunic with restrained gold and ochre geometric borders forms the neckline and shoulder line.',
  hecuba: 'A midnight-indigo royal wool robe forms long vertical folds while a charcoal linen veil descends from the woven fillet behind the hair.',
  helenus: 'A cobalt-blue priestly wool mantle with a restrained geometric border crosses one shoulder over a narrow cream linen neckline.',
  idomeneus: 'A deep-crimson warrior tunic frames the neck while one sea-purple wool fold falls behind a shoulder.',
  machaon: 'A forest-green physician-warrior mantle crosses one shoulder above a narrow sand-colored wool tunic neckline.',
  meriones: 'A Mycenaean boar-tusk helmet of curved ivory plaques and leather cheek guards rises above a crimson wool warrior tunic.',
  pandarus: 'A single Anatolian wool tunic with ochre and rust-red geometric bands forms the full lower plane.',
  phoenix: 'A single coarse charcoal-grey wool mantle crosses one shoulder in a broad, age-worn fold.',
  polydamas: 'A dark-crimson officer tunic with simple border trim frames the neck, with one folded dark mantle edge behind a shoulder.',
  scamander: 'A deep algae-green coarse-wool mantle with raw selvedge edges flows across one shoulder like a riverbank textile.',
  teucer: 'A deep navy Salaminian warrior tunic with reinforced shoulder joins frames the neck, with one narrow dark wool fold behind a shoulder.',
  thetis: 'A single sea-foam and azure linen veil-mantle frames the head and shoulders in thin fluid pleats.',

  agelaus: 'A crimson wool chiton frames the neck while one narrow dark mantle fold falls behind a shoulder.',
  alcinous: 'A murex-purple royal himation crosses one shoulder in a broad noble fold above a narrow indigo linen neckline.',
  anticlea: 'An ash-grey mourning peplos forms one quiet plane while a delicate charcoal veil falls behind the hair.',
  arete: 'A saffron fine-linen chiton with a woven geometric border is framed by one ivory wool himation fold.',
  ctesippus: 'A cream linen chiton forms the neckline while one rich Tyrian-purple himation edge appears at a shoulder.',
  demodocus: 'An ivory wool chiton frames the neck while one grey himation fold rests low on a shoulder.',
  dolius: 'A single earth-brown homespun wool exomis leaves one working shoulder free.',
  halitherses: 'A storm-grey and muted-indigo himation crosses one shoulder in a broad prophetic fold above an ash linen neckline.',
  ino: 'A thin seafoam pleated linen robe forms one water-light plane while a translucent ivory veil streams behind one shoulder.',
  laertes: 'A coarse grey homespun chiton frames the neck while one dark rustic himation fold rests low on a shoulder.',
  laodamas: 'A bright saffron linen chiton forms a youthful athletic plane, with one narrow white wool edge behind a shoulder.',
  leiodes: 'A single plain white sacrificial himation crosses one shoulder above a narrow ritual linen neckline with an olive-leaf border.',
  medon: 'An ochre linen chiton frames the neck while one textured brown travel-cloth fold falls behind a shoulder.',
  melantho: 'A coral-red wool peplos with one saffron-trimmed edge forms the full lower plane.',
  minos: 'A dark-crimson and obsidian wool mantle with restrained spiral borders crosses one shoulder in a single judicial fold.',
  nausithous: 'A deep navy and sea-green wool himation crosses one shoulder in a broad seafaring fold above an ivory linen neckline.',
  peisistratus: 'A cream linen chiton frames the neck while one olive-and-saffron travel chlamys fold falls behind a shoulder.',
  perimedes: 'A single indigo wool seafarer exomis leaves one shoulder free in a practical rowing silhouette.',
  phemius: 'A fine ecru linen chiton forms one quiet lower plane, with a pale-blue himation edge resting low on a shoulder.',
  philoetius: 'A single tawny woven-wool herdsman tunic forms the broad practical lower plane.',

  aerope: 'A saffron linen robe forms the neckline while one terracotta-red wool mantle fold falls behind a shoulder.',
  aletes: 'A dark navy linen tunic frames the neck while one deep madder-red wool fold crosses a shoulder.',
  atreus: 'A purple royal wool mantle crosses one shoulder in a weighty fold above a narrow deep-crimson linen neckline.',
  chrysippus: 'A cream Aegean linen tunic with a sky-blue wave border forms the neckline, with one soft undyed wool edge behind a shoulder.',
  chrysothemis: 'A single pale sage-and-ivory wool robe forms gentle uninterrupted folds.',
  cilissa: 'A coarse grey-brown homespun shawl frames the head and falls behind the hair above a narrow undyed linen neckline.',
  erigone: 'A deep navy linen robe forms one spare lower plane while a charcoal mourning veil descends behind the hair.',
  hermione: 'A single saffron veil falls from the hair over one shoulder above a simple bleached-white robe neckline.',
  hippodamia: 'A deep-crimson wool robe with geometric borders forms the neckline while one saffron mantle fold falls behind a shoulder.',
  megapenthes: 'A forest-green wool mantle crosses one shoulder in a broad princely fold above a narrow cream linen neckline.',
  myrtilus: 'A dark-ochre working tunic with a saffron woven border forms one practical lower plane.',
  pelopia: 'A pure white linen priestess robe forms one clean lower plane, with one soft undyed wool edge behind a shoulder.',
  pelops: 'A saffron-and-deep-indigo royal mantle crosses one shoulder above a narrow fine-linen neckline.',
  pylades: 'A natural linen travel tunic frames the neck while one dark navy-and-slate wool fold falls behind a shoulder.',
  strophius: 'A walnut-brown and warm-amber wool mantle crosses one shoulder in a single paternal fold.',
  tisamenus: 'A crimson and lapis linen tunic with an Aegean rosette border frames the neck, with one narrow royal wool fold behind a shoulder.',

  angrboda: 'A charcoal woven tunic sits beneath one broad slate-grey wool cloak fold suited to the cold northern climate.',
  grimhild: 'A deep-blue woven dress is framed by one darker blue wool cloak fold around the shoulders.',
  hodr: 'A heavy grey woven tunic sits beneath one pale-grey wool cloak fold around the shoulders.',
  idunn: 'A pale woven underdress sits beneath a warm yellow wool strap dress, with the shoulder straps continuing below the crop and one simple bead strand between them.',
  mimir: 'A peat-brown woven tunic sits beneath one dark-grey wool cloak fold around the shoulders.',
  sif: 'A light woven underdress sits beneath a rich red wool strap dress, with the shoulder straps continuing below the crop.',
  signy: 'A charcoal woven tunic is framed by one dark-red wool cloak fold around the shoulders.',
  sigyn: 'A pale woven underdress sits beneath a soft-grey wool dress and one plain grey shawl fold around the shoulders.',
  sinfjotli: 'A dark-green woven tunic sits beneath one natural-grey wool cloak fold around the shoulders.',
  volsung: 'A crimson woven tunic with Mammen-style red-and-blue embroidery sits beneath one dark wool cloak fold.',

  orion: 'A dark raw-leather hunter wrap crosses one shoulder, with a narrow dark-wool exomis neckline visible.',
  thyestes: 'A dense madder-red and charcoal wool mantle crosses one shoulder in one broad, ominous fold.',
}

const JAPAN = {
  'ame-no-koyane': {
    source: 'https://jinjafan.jp/god/0084/',
    directionKo: '신성한 축문을 낭송하는 제의신의 권위를 쌍미즈라 머리와 풍성한 문양 예복, 층층의 의례용 구슬로 드러낸다.',
    qualityNoteKo: '도상의 높은 쌍미즈라와 어깨를 덮는 제관 실루엣을 따르고, 얼굴은 승인된 REF의 신원을 유지한다.',
    hair: 'Center-parted black hair rises into paired high archaic mizura loops above the ears, with short temple tassels and a neat straight length at the nape.',
    costume: 'A voluminous crossover ceremonial robe with restrained woven patterning covers the shoulders, with layered strands of large ritual beads resting at the base of the neck.',
    controls: 'the paired high mizura silhouette, voluminous patterned ceremonial robe, covered shoulders, layered ritual beads, and restrained officiant bearing',
    mythic: 'A quiet paper-white ritual glow separates the pale robe and dark hair with no halo object.',
  },
  'ame-no-tajikarao': {
    source: 'https://jinjafan.jp/god/0094/',
    directionKo: '천암호를 열어젖힌 힘의 신을 길게 풀린 거친 머리와 녹색 겉천·주홍색 안옷, 부분적으로 열린 어깨선으로 표현한다.',
    qualityNoteKo: '전투 갑주를 더하지 않고 도상에 보이는 움직이는 직물과 체격으로 괴력을 읽히게 한다.',
    hair: 'Long, thick dark hair hangs fully loose in heavy irregular waves around the face, ears, and nape.',
    costume: 'A muted green draped ritual-warrior wrap moves over a vermilion underlayer, open at the throat with one shoulder line partly exposed.',
    controls: 'the long fully loose hair, powerful partly exposed shoulder balance, muted green outer cloth, vermilion underlayer, and explosive cave-opening physicality',
    mythic: 'Warm cave light breaks into a narrow sunrise rim behind the hair and exposed shoulder line.',
  },
  'ame-no-uzume': {
    source: 'https://jinjafan.jp/god/0066/',
    directionKo: '태양을 불러낸 춤의 여신을 움직이는 긴 풀림머리와 담홍·백색의 넓은 소매, 선명한 주홍색 안옷으로 만든다.',
    qualityNoteKo: '정적인 무녀복 대신 도상의 춤 동작과 둥근 구슬, 열린 목선의 활기를 옮긴다.',
    hair: 'Long dark hair hangs loose in soft lively waves around the face and behind the shoulders, moving with the ritual dance.',
    costume: 'A pale blush and off-white wide-sleeved ritual dance robe moves over a vivid vermilion underlayer, with a simple strand of round beads and an open throat while both shoulders remain covered.',
    controls: 'the loose dancer hair, wide sleeves, pale blush and off-white upper robe, vivid vermilion underlayer, round beads, and sacred comic-dance energy',
    mythic: 'Warm dawn light flickers across the moving cloth while the face remains crisp and joyful.',
  },
  futodama: {
    source: 'https://jinjafan.jp/god/0857/',
    directionKo: '제의를 주관하는 후토다마를 귀 뒤의 쌍결발과 풍성한 주황색 문양 예복, 청록색 끈으로 구별한다.',
    qualityNoteKo: '무채색 섬유복과 큰 곡옥 공식을 버리고 도상에 실제로 보이는 주황·청록 실루엣을 따른다.',
    hair: 'Dark hair is gathered into paired compact side loops just above and behind the ears, with the remaining length drawn neatly toward the nape.',
    costume: 'A full orange patterned crossover ceremonial robe with broad sleeves and blue-green neck ties covers the neck and shoulders in a rounded ritual silhouette.',
    controls: 'the paired compact side loops, full orange patterned robe, broad sleeves, blue-green neck ties, and focused cave-rite posture',
    mythic: 'A narrow amber cave-light reflection rests on the ochre cloth and one cheek.',
  },
  futsunushi: {
    source: 'https://jinjafan.jp/god/0855/',
    directionKo: '지상을 평정한 무신을 측면이 넓게 벌어진 고대 투구와 목·어깨를 감싸는 층찰 갑주로 만든다.',
    qualityNoteKo: '미즈라나 장식 목가리개보다 도상의 투구와 겹친 어깨 갑주를 식별 표지로 쓴다.',
    hair: 'Dark hair is almost entirely concealed beneath an archaic helmet with broad flared side guards, with only a short natural length visible at the nape.',
    costume: 'Dark laced lamellar armor forms pronounced layered shoulder guards beneath an archaic flared-side helmet, enclosing the lower neck in a compact martial silhouette.',
    controls: 'the broad flared-side helmet, mostly concealed hair, layered lamellar shoulder silhouette, enclosed neck, and martial severity',
    mythic: 'Cool steel-blue side light gives the dark robe and martial edge a dry metallic clarity.',
  },
  hoderi: {
    source: 'https://jinjafan.jp/god/5557/',
    directionKo: '우미사치히코의 거친 자존심을 넓게 드러난 이마, 뒤의 작은 결발, 긴 콧수염과 뾰족한 턱수염, 소박한 어부 장포로 표현한다.',
    qualityNoteKo: '목걸이 대신 도상에 보이는 수염과 간결한 교임포가 인물을 구별한다.',
    hair: 'Dark hair exposes a broad high forehead and draws into a small rear knot, leaving the ears clear.',
    facialHair: 'A long dark moustache joins a narrow pointed beard descending from the chin.',
    costume: 'A plain pale crossover fisher-prince robe with generous sleeves and a narrow sash sits modestly open at the throat.',
    controls: 'the broad exposed forehead, small rear knot, long moustache and pointed beard, plain fisher-prince robe, and modest open throat',
    mythic: 'Copper sunset light and a faint salt-air rim separate the shore-worn silhouette.',
  },
  hoori: {
    source: 'https://jinjafan.jp/god/0866/',
    directionKo: '야마사치히코의 차분한 귀공자성을 어깨까지 풀린 머리와 목이 자연스럽게 열린 소박한 사냥꾼 장포로 만든다.',
    qualityNoteKo: '사슴가죽 깃과 구슬 장식을 덜고 도상의 자연 장발과 넓은 소매를 남긴다.',
    hair: 'Shoulder-length dark hair hangs loose with a soft central separation, curving naturally around the ears and nape.',
    costume: 'A plain light crossover hunter-prince robe falls loosely from an open throat while fully covering both shoulders.',
    controls: 'the loose shoulder-length hair, plain light hunter-prince robe, open throat, covered shoulders, and patient sea-quest composure',
    mythic: 'Soft sea-green reflected light lifts the lower edge while the face stays calm and dry.',
  },
  iwanagahime: {
    source: 'https://jinjafan.jp/god/0251/',
    directionKo: '바위 여신의 흔들리지 않는 존엄을 크고 둥근 옆·뒤 번과 세로로 길게 떨어지는 전면 띠의 단단한 실루엣으로 표현한다.',
    qualityNoteKo: '노화나 추한 인상을 만들지 않고, 도상의 머리 형태와 수직 복식 구조로 무게를 준다.',
    hair: 'Smooth dark hair sweeps into large rounded side-and-back buns behind the ears, forming a firm compact silhouette.',
    costume: 'An austere full-coverage robe forms a long cylindrical silhouette with a broad dark vertical front panel and one simple pendant strand.',
    controls: 'the large rounded side-and-back buns, full-coverage cylindrical robe, broad dark vertical panel, simple pendant, and grave stillness',
    mythic: 'Cool matte light gives the dark cloth the quiet density of ancient stone.',
  },
  'konohanasakuya-hime': {
    source: 'https://jinjafan.jp/god/0552/',
    directionKo: '꽃과 불의 여신을 길게 흐르는 흑발, 낮은 꽃띠, 청록·남색 꽃무늬가 촘촘한 넓은 소매 예복으로 만든다.',
    qualityNoteKo: '단순한 흰옷으로 줄이지 않고 도상에 보이는 꽃무늬 중층 예복을 이 인물만의 표지로 쓴다.',
    hair: 'Long straight dark hair flows behind the shoulders beneath a low floral circlet across the forehead, with small side tassels.',
    costume: 'A layered pale ceremonial robe with dense blue-green blossom motifs and broad sleeves forms a closed upper drape with several restrained bead strands.',
    controls: 'the long straight hair, low floral circlet and tassels, layered broad-sleeved robe, dense blue-green blossom motifs, and bright youthful sacred presence',
    mythic: 'A warm blossom-colored edge light makes the patterned cloth luminous without adding flowers or a halo to the scene.',
  },
  omoikane: {
    source: 'https://jinjafan.jp/god/0364/',
    directionKo: '천암호의 해법을 설계한 지혜의 신을 단정한 고대 상투와 소박한 머리띠, 넓고 무장식인 제관복으로 정돈한다.',
    qualityNoteKo: '과장된 관모나 장신구 없이 도상의 차분한 학자·제관 실루엣을 유지한다.',
    hair: 'Dark hair gathers into a neat archaic topknot beneath a simple narrow headband, with short lengths descending before the ears.',
    costume: 'A broad unadorned crossover scholar-priest robe with generous sleeves covers the shoulders in one calm plane.',
    controls: 'the neat archaic topknot and simple headband, broad unadorned scholar-priest robe, covered shoulders, and restrained intellectual authority',
    mythic: 'A quiet white-gold ritual light isolates the cap, eyes, and pale robe against a dark neutral field.',
  },
  sarutahiko: {
    source: 'https://jinjafan.jp/god/0598/',
    directionKo: '길을 여는 대신의 위풍을 관자와 정수리의 쌍고리 머리, 풍성한 수염, 큰 구름·소용돌이 문양 외투로 드러낸다.',
    qualityNoteKo: '도상의 과장된 코는 복사하지 않고 승인된 얼굴 골격을 유지하며, 머리와 외투로 신격을 구별한다.',
    hair: 'Thick dark hair forms paired rounded coils high at the temples and crown, with substantial natural volume at the nape.',
    costume: 'A voluminous cream-to-ochre outer mantle with bold cloud and spiral patterning covers the shoulders over a dark inner plane, finished by one restrained bead-and-tassel accent.',
    controls: 'the paired rounded hair coils, full beard, bold cloud-and-spiral mantle, covered shoulders, and road-opening ferocity while the face REF retains facial anatomy',
    mythic: 'A low red-sun haze rims the paired hair coils and patterned robe with dusty road light.',
  },
  takemikazuchi: {
    source: 'https://jinjafan.jp/god/0699/',
    directionKo: '번개의 무신을 둥근 주홍색 투구와 붉은 판찰 갑주, 흰 속옷, 푸른 끈, 풍성한 검은 수염으로 만든다.',
    qualityNoteKo: '흑동 목가리개 대신 도상의 주홍 갑주와 투구를 최우선 식별 표지로 쓴다.',
    hair: 'Dark hair is largely concealed beneath a rounded vermilion helmet with side guards, with only short natural locks visible at the nape.',
    facialHair: 'A dense full dark beard and thick moustache cover the lower face in a disciplined warrior shape.',
    costume: 'Vermilion-red laced lamellar armor forms layered shoulder guards over a white under-robe, edged with dark bindings and restrained blue cords.',
    controls: 'the rounded vermilion helmet, mostly concealed hair, dense beard, red laced plate armor, white under-robe, blue cords, and sea-facing commander authority',
    mythic: 'A thin blue-white lightning edge cuts across the vermilion armor while the face remains evenly readable.',
  },
  toyotamahime: {
    source: 'https://jinjafan.jp/god/0772/',
    directionKo: '바다 신궁의 왕녀를 꽃·구슬 머리장식과 물결·구름·꽃무늬가 조밀한 청록 계열 중층 궁정 예복으로 만든다.',
    qualityNoteKo: '이 인물은 도상의 풍성한 중층 복식이 고유 표지이므로 일반적인 간소화 대상에서 제외한다.',
    hair: 'Long dark hair draws back beneath a clustered floral-and-bead crown ornament, with smooth lengths falling behind the shoulders.',
    costume: 'A sumptuous layered court-princess robe with dense wave, cloud, and floral patterning uses restrained deep blue-green contrasts and several bead strands.',
    controls: 'the clustered floral-and-bead hair ornament, flowing long hair, layered court-princess silhouette, dense wave-cloud-flower patterning, and processional sea-princess bearing',
    mythic: 'Soft water-reflected light moves across the sea-green textile without adding a narrative seascape.',
  },
  ugayafukiaezu: {
    source: 'https://commons.wikimedia.org/wiki/File:Ugayafukiaezu_shinbutsu-zue.jpg',
    directionKo: '황통의 조상을 중앙이 갈린 중간 길이 풀림머리, 짧은 콧수염과 턱수염, 목을 부드럽게 감싸는 소박한 장포로 만든다.',
    qualityNoteKo: '곡옥과 깃털 자수를 더하지 않고 도상의 머리·수염·넓은 목주름으로 인물을 구별한다.',
    hair: 'Medium shoulder-length dark hair hangs loose with a central separation and outward-curving side locks around the cheeks and ears.',
    facialHair: 'A short neat dark moustache accompanies a small compact chin beard.',
    costume: 'A plain voluminous crossover robe forms a broad soft scarf-like fold around the base of the neck and covers the shoulders.',
    controls: 'the loose medium-length hair, short moustache and chin beard, broad scarf-like neck fold, voluminous plain robe, and unadorned ancestral calm',
    mythic: 'Muted dawn light gives the simple off-white robe a calm mist-softened edge.',
  },
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function backupCurrent() {
  if (existsSync(BACKUP_ROOT)) return
  mkdirSync(BACKUP_ROOT, { recursive: true })
  copyFileSync(PROMPTS_PATH, path.join(BACKUP_ROOT, 'portrait-prompts.json'))
  if (existsSync(path.join(PROMPT_ROOT, 'README.md'))) {
    copyFileSync(path.join(PROMPT_ROOT, 'README.md'), path.join(BACKUP_ROOT, 'README.md'))
  }
  if (existsSync(BY_TRADITION)) cpSync(BY_TRADITION, path.join(BACKUP_ROOT, '전승별'), { recursive: true })
}

function removeOrdinaryFastening(input) {
  return input
    .replace(/\b(?:is\s+)?(?:fastened|pinned|secured) at both shoulder points with [^,]+/giu, 'falls in uninterrupted vertical folds')
    .replace(/\b(?:is\s+)?(?:fastened|pinned|secured) at both shoulders with [^,]+/giu, 'falls in uninterrupted vertical folds')
    .replace(/\b(?:is\s+)?(?:fastened|pinned|secured) at the shoulders by [^,]+/giu, 'falls in uninterrupted vertical folds')
    .replace(/\b(?:is\s+)?(?:fastened|pinned|secured) at the shoulders with [^,]+/giu, 'falls in uninterrupted vertical folds')
    .replace(/\b(?:is\s+)?(?:fastened|pinned|secured) along the shoulders/giu, 'falls in fine uninterrupted pleats')
    .replace(/\b(?:is\s+)?(?:fastened|pinned|secured) at the (?:right|left) shoulder (?:with|by) [^,.]+/giu, 'falls away behind one shoulder')
    .replace(/\b(?:is\s+)?(?:fastened|pinned|secured) at the shoulder (?:with|by) [^,.]+/giu, 'falls away behind one shoulder')
    .replace(/\b(?:is\s+)?clasped at the shoulder (?:with|by) [^,.]+/giu, 'falls away behind one shoulder')
    .replace(/\b(?:is\s+)?(?:fastened|pinned|secured) at the neck (?:with|by) [^,.]+/giu, 'rests in broad natural folds')
    .replace(/\b(?:is\s+)?(?:fastened|pinned|secured) at the (?:right|left) shoulder/giu, 'falls away behind one shoulder')
    .replace(/\b(?:is\s+)?(?:fastened|pinned|secured) at the shoulder/giu, 'falls away behind one shoulder')
    .replace(/\b(?:is\s+)?fastened with soft drapery/giu, 'forms soft uninterrupted folds')
    .replace(/\b(?:is\s+)?fastened with a shoulder pin/giu, 'falls away behind one shoulder')
    .replace(/\b(?:is\s+)?closed at the right shoulder with [^,.]+/giu, 'rests in broad folds')
    .replace(/\b(?:is\s+)?closed with (?:one|a|an) [^,.]*brooch/giu, 'rests in broad folds')
    .replace(/\b(?:is\s+)?closed by (?:one|a|an) [^,.]*brooch/giu, 'rests in broad folds')
    .replace(/shoulder straps closed by paired [^,.]*brooches/giu, 'shoulder straps continuing below the crop')
    .replace(/\s+and (?:fastened|pinned|secured|closed) with [^,.]*(?:fibulae?|brooch(?:es)?|pins?|fastener(?:s)?)/giu, '')
    .replace(/(?:fastened|pinned|secured) with a (?:plain |restrained |small )?(?:bronze |silver |gold )?(?:disc |ring )?(?:fibula|brooch|pin|fastener)/giu, 'falling in natural folds')
    .replace(/\s+and rests in broad natural folds/giu, ', resting in broad natural folds')
    .replace(/\s+and rests in broad folds/giu, ', resting in broad folds')
    .replace(/\s+and falls away behind one shoulder/giu, ', falling away behind one shoulder')
    .replace(/\s+,/gu, ',')
    .replace(/\s{2,}/gu, ' ')
    .replace(/\b(?:a|an) falls\b/giu, 'falls')
    .trim()
}

function loosenWarmAncient(input) {
  return removeOrdinaryFastening(input)
    .replace(/\bheavyweight\b/giu, 'dense')
    .replace(/\bheavy\b/giu, 'weighty')
    .replace(/\bsubstantial\b/giu, 'broad')
    .replace(/\bdense, layered folds\b/giu, 'one deep diagonal fold')
    .replace(/\bdraped securely across the shoulders\b/giu, 'falling away behind one shoulder')
    .replace(/\bdraped broadly across the shoulders\b/giu, 'falling away behind one shoulder')
    .replace(/\bdraped naturally across the shoulders\b/giu, 'falling away behind one shoulder')
    .replace(/\bdraped softly across the shoulders\b/giu, 'falling softly behind one shoulder')
    .replace(/\bdraped across the shoulders\b/giu, 'falling away behind one shoulder')
    .replace(/\bdraped over the shoulders\b/giu, 'falling away behind one shoulder')
    .replace(/\bdraped around the head and over the shoulders\b/giu, 'falling from the head behind the hair')
    .replace(/\bover both shoulders\b/giu, 'behind the hair')
    .replace(/\bacross the shoulders\b/giu, 'behind one shoulder')
    .replace(/\bover the shoulders\b/giu, 'behind one shoulder')
    .replace(/\baround the shoulders and neck\b/giu, 'away behind one shoulder')
    .replace(/\baround the neck and over the left shoulder\b/giu, 'past one shoulder')
    .replace(/\bdraped across the left shoulder and around the nape\b/giu, 'crossing one shoulder and falling away from the nape')
    .replace(/\bdraped across the left shoulder\b/giu, 'crossing one shoulder')
    .replace(/\bdraped across one shoulder\b/giu, 'crossing one shoulder and falling out of frame')
    .replace(/\bdraped over the left shoulder\b/giu, 'crossing one shoulder and falling out of frame')
    .replace(/\bfolded across the shoulders\b/giu, 'appearing as one partial fold behind a shoulder')
    .replace(/\bthick folds across the shoulders\b/giu, 'one deep fold behind a shoulder')
    .replace(/\s+and rests in broad natural folds/giu, ', resting in broad natural folds')
    .replace(/\s+and rests in broad folds/giu, ', resting in broad folds')
    .replace(/\s+and falls away behind one shoulder/giu, ', falling away behind one shoulder')
    .replace(/resting across the shoulders, resting in broad folds/giu, 'resting in broad folds')
    .replace(/falling away behind one shoulder, falling away behind one shoulder/giu, 'falling away behind one shoulder')
    .replace(/\s{2,}/gu, ' ')
    .trim()
}

function updatedCostume(row) {
  if (SPECIAL_COSTUMES[row.slug]) return SPECIAL_COSTUMES[row.slug]
  if (JAPAN[row.slug]) return JAPAN[row.slug].costume
  const withoutHardware = removeOrdinaryFastening(row.art_direction.costume_en)
  return WARM_ANCIENT_TRADITIONS.has(row.tradition)
    ? loosenWarmAncient(withoutHardware)
    : withoutHardware
}

function referenceBlock(row) {
  const info = JAPAN[row.slug]
  if (!info) return ''
  return [
    'MYTH ICONOGRAPHY IMAGE — INDIVIDUAL DESIGN ONLY',
    `Use this exact second image as the myth-iconography reference: ${row.iconography_reference_image}`,
    `It controls ${info.controls}.`,
    'The facial-identity image still controls the face. This myth image does not control facial identity, crop, narrative composition, props, hands, extra figures, text, watermark, or background.',
  ].join('\n')
}

function updatePrompt(row, oldCostume, oldImpression, oldHair, oldFacialHair, oldPose, oldMythic) {
  let prompt = row.prompt
    .replace(/\n\nMYTH ICONOGRAPHY IMAGE — INDIVIDUAL DESIGN ONLY[\s\S]*?(?=\n\nIMPRESSION AND GROOMING)/u, '')
    .replace(oldCostume, row.art_direction.costume_en)
    .replace(LOWER_EDGE_OLD, LOWER_EDGE_NEW)
    .replace(LOWER_EDGE_INTERMEDIATE, LOWER_EDGE_NEW)
    .replace(CROP_OLD, CROP_NEW)
    .replace(CROP_INTERMEDIATE, CROP_NEW)
  if (oldImpression !== row.appearance_direction.impression_en) prompt = prompt.replace(oldImpression, row.appearance_direction.impression_en)
  if (oldHair !== row.appearance_direction.hair_en) prompt = prompt.replace(oldHair, row.appearance_direction.hair_en)
  if (oldFacialHair !== row.appearance_direction.facial_hair_en) prompt = prompt.replace(oldFacialHair, row.appearance_direction.facial_hair_en)
  if (oldPose !== row.art_direction.pose_expression_en) prompt = prompt.replace(oldPose, row.art_direction.pose_expression_en)
  if (oldMythic !== row.art_direction.mythic_treatment_en) prompt = prompt.replace(oldMythic, row.art_direction.mythic_treatment_en)
  const iconographyBlock = referenceBlock(row)
  if (iconographyBlock) {
    prompt = prompt.replace('\n\nIMPRESSION AND GROOMING', `\n\n${iconographyBlock}\n\nIMPRESSION AND GROOMING`)
  }
  return prompt
}

function updateHistoricalReview(row) {
  if (row.tradition === 'myth-japan') {
    return {
      ...row.historical_review,
      tradition_visual_frame_ko: '《고사기》와 《일본서기》의 인물 성격을 바탕으로 하되, 한 시대의 하니와 복식으로 전원을 통일하지 않는다. 각 인물에 연결한 역사적 신화 도상은 머리 실루엣·복식의 노출과 덮임·색·고유 표지를 정하고, 고대 물질문화 자료는 현대식 헤어와 근거 없는 판타지 장식을 막는 보조 기준으로 쓴다.',
      hair_beard_basis_ko: '얼굴 REF는 얼굴 골격과 인상만 보존한다. 머리와 수염은 인물별 신화 도상을 우선하며, 사루타히코의 긴 코처럼 정체성을 이루는 비인간적 표지는 도상 REF가 지시한다.',
      costume_armor_basis_ko: '일본 신화 인물마다 별도의 도상 REF를 붙여 그 이미지의 복식 실루엣·노출과 덮임·색을 사용한다. 그림의 얼굴·서사 장면·소품·문자·배경·워터마크는 옮기지 않으며, 도상에 없는 공통 스톨·구슬 목걸이·갑주를 습관적으로 추가하지 않는다.',
      change_note_ko: '공통 하니와 복식 공식을 걷어내고 얼굴 REF와 인물별 신화 도상 REF의 역할을 분리했다.',
      appearance_source_urls: [JAPAN[row.slug].source],
    }
  }
  if (WARM_ANCIENT_TRADITIONS.has(row.tradition)) {
    return {
      ...row.historical_review,
      costume_armor_basis_ko: '전승에 맞는 키톤·페플로스·히마티온·클라미스·튜닉·베일·갑주를 인물별로 고르되, 따뜻한 기후의 고대인을 주복식+망토+어깨 핀 공식으로 통일하지 않는다. 한 벌 또는 한쪽에 걸친 직물만으로 역할이 드러나면 거기서 멈추고, 일반 체결구는 크롭 아래에 둔다. 갑주·제사복·왕실 장식은 그 인물의 지위나 사건을 실제로 설명할 때만 보인다.',
      change_note_ko: '인물 고유의 재료와 색은 유지하면서 과도한 겹옷과 반복되는 어깨 체결구를 줄였다.',
    }
  }
  return row.historical_review
}

function markdownText(value) {
  return String(value ?? '').replace(/\r?\n/gu, ' ').trim()
}

function writeDocs(prompts) {
  mkdirSync(BY_TRADITION, { recursive: true })
  const files = new Map()
  for (const row of prompts) {
    const rows = files.get(row.tradition) ?? []
    rows.push(row)
    files.set(row.tradition, rows)
  }
  const index = [
    '# 신화 인물 개인 초상화 발주서',
    '',
    '- 얼굴 REF는 얼굴 골격·신원·연령·민족적 인상만 보존한다.',
    '- 일본 신화는 얼굴 REF 다음에 인물별 신화 도상 REF를 함께 넣는다. 도상은 머리·복식 실루엣·노출과 덮임·색·신성 표지만 맡는다.',
    '- 사용자가 제공한 이자나기 이미지는 도상 REF를 함께 넣는 방식의 기준 예시이며, 그 흰옷을 다른 일본 인물에게 복제하는 공통 템플릿이 아니다.',
    '- 따뜻한 기후의 고대인은 한 벌 또는 한쪽 직물만으로 충분하면 겹옷과 어깨 체결구를 더하지 않는다. 칼립소식 얇은 1.5겹은 물질형 신격을 설계하는 기준이며 전원 공통 템플릿이 아니다.',
    '- 이미지 생성·업로드·DB·R2 반영은 아직 하지 않았다.',
    '',
    '## 전승별 발주서',
    '',
  ]
  for (const [tradition, rows] of [...files.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const filename = `${tradition}.md`
    index.push(`- [${rows[0].tradition_name_ko} ${rows.length}명](./전승별/${filename})`)
    const lines = [`# ${rows[0].tradition_name_ko} 개인 초상화 프롬프트`, '']
    for (const row of rows) {
      lines.push(
        `## ${row.name_ko} · ${row.name_en}`,
        '',
        `- ID: \`${row.target_id}\``,
        `- 얼굴 REF: ${row.reference_image ? `\`${row.reference_image}\`` : '없음'}`,
      )
      if (row.iconography_reference_image) {
        lines.push(
          `- 신화 도상 REF: \`${row.iconography_reference_image}\``,
          `- 도상 출처: ${row.iconography_reference_url}`,
          `- 도상 담당: ${row.iconography_reference_controls_en}`,
        )
      }
      lines.push(
        `- 구상: ${markdownText(row.direction_ko)}`,
        `- 복식: ${markdownText(row.art_direction.costume_en)}`,
        '',
        '```text',
        row.prompt,
        '```',
        '',
      )
    }
    writeFileSync(path.join(BY_TRADITION, filename), `${lines.join('\n')}\n`, 'utf8')
  }
  writeFileSync(path.join(PROMPT_ROOT, 'README.md'), `${index.join('\n')}\n`, 'utf8')
}

function validate(document) {
  if (document.prompts.length !== 198) throw new Error(`인원 수 오류: ${document.prompts.length}`)
  for (const row of document.prompts) {
    if (!row.prompt.includes(LOWER_EDGE_NEW) || !row.prompt.includes(CROP_NEW)) {
      throw new Error(`${row.slug}: 새 크롭 문장 누락`)
    }
    if (/\b(?:fibulae?|brooch(?:es)?|shoulder pin|ring pin|disc pin|plain fastener)\b/iu.test(row.art_direction.costume_en)) {
      throw new Error(`${row.slug}: 일반 어깨 체결구 잔존: ${row.art_direction.costume_en}`)
    }
  }
  const japanese = document.prompts.filter((row) => row.tradition === 'myth-japan')
  if (japanese.length !== Object.keys(JAPAN).length) throw new Error(`일본 신화 수량 오류: ${japanese.length}`)
  for (const row of japanese) {
    if (!row.iconography_reference_image || !existsSync(row.iconography_reference_image)) {
      throw new Error(`${row.slug}: 도상 REF 파일 누락`)
    }
    if (!row.prompt.includes('MYTH ICONOGRAPHY IMAGE — INDIVIDUAL DESIGN ONLY')) {
      throw new Error(`${row.slug}: 도상 REF 프롬프트 블록 누락`)
    }
  }
}

function main() {
  const dryRun = process.argv.includes('--dry-run')
  const document = readJson(PROMPTS_PATH)
  const before = {
    fasteners: document.prompts.filter((row) => /\b(?:fibulae?|brooch(?:es)?|pins?|fastener(?:s)?)\b/iu.test(row.art_direction.costume_en)).length,
    shoulderFill: document.prompts.filter((row) => /(?:across|over) (?:both |the )?shoulders/iu.test(row.art_direction.costume_en)).length,
  }
  document.prompts = document.prompts.map((row) => {
    const oldCostume = row.art_direction.costume_en
    const oldImpression = row.appearance_direction.impression_en
    const oldHair = row.appearance_direction.hair_en
    const oldFacialHair = row.appearance_direction.facial_hair_en
    const oldPose = row.art_direction.pose_expression_en
    const oldMythic = row.art_direction.mythic_treatment_en
    const japan = JAPAN[row.slug]
    const next = {
      ...row,
      ...(japan ? {
        direction_ko: japan.directionKo,
        quality_note_ko: japan.qualityNoteKo,
        iconography_reference_image: path.join(JAPAN_REF_ROOT, `${row.slug}.jpg`),
        iconography_reference_url: japan.source,
        iconography_reference_controls_en: japan.controls,
      } : {}),
      appearance_direction: {
        ...row.appearance_direction,
        ...(IMPRESSION_OVERRIDES[row.slug] ? { impression_en: IMPRESSION_OVERRIDES[row.slug] } : {}),
        ...(japan ? { hair_en: japan.hair } : {}),
        ...(japan?.facialHair ? { facial_hair_en: japan.facialHair } : {}),
      },
      art_direction: {
        ...row.art_direction,
        costume_en: updatedCostume(row),
        ...(POSE_OVERRIDES[row.slug] ? { pose_expression_en: POSE_OVERRIDES[row.slug] } : {}),
        ...(japan ? { mythic_treatment_en: japan.mythic } : {}),
      },
      historical_review: updateHistoricalReview(row),
    }
    next.prompt = updatePrompt(next, oldCostume, oldImpression, oldHair, oldFacialHair, oldPose, oldMythic)
    return next
  })
  validate(document)
  const after = {
    fasteners: document.prompts.filter((row) => /\b(?:fibulae?|brooch(?:es)?|pins?|fastener(?:s)?)\b/iu.test(row.art_direction.costume_en)).length,
    fastenerSlugs: document.prompts.filter((row) => /\b(?:fibulae?|brooch(?:es)?|pins?|fastener(?:s)?)\b/iu.test(row.art_direction.costume_en)).map((row) => row.slug),
    shoulderFill: document.prompts.filter((row) => /(?:across|over) (?:both |the )?shoulders/iu.test(row.art_direction.costume_en)).length,
    japaneseIndividualRefs: document.prompts.filter((row) => row.iconography_reference_image).length,
  }
  if (!dryRun) {
    backupCurrent()
    writeFileSync(PROMPTS_PATH, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
    writeDocs(document.prompts)
  }
  console.log(JSON.stringify({ dryRun, before, after, promptFile: PROMPTS_PATH }, null, 2))
}

main()
