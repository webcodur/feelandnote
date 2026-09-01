/**
 * AGY 전승별 2·3차 결과 중 최선본을 합치고, 전수 검수에서 확인된 과장 복식과
 * 현대 헤어 표현을 최종 발주서용 결과로 교정한다. 이미지·DB·R2는 건드리지 않는다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-프롬프트')
const V2 = path.join(ROOT, '_agy-tradition-rework-v2')
const V3 = path.join(ROOT, '_agy-tradition-rework-v3')
const V4 = path.join(ROOT, '_agy-tradition-rework-v4')
const FINAL = path.join(ROOT, '_agy-tradition-rework-final')

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function resultFile(root, batch) {
  return path.join(root, `tradition-${String(batch).padStart(2, '0')}-result.json`)
}

const patches = {
  idas: {
    hair_en: 'Dense, tightly coiled dark curls arranged close around the ears and temples in an archaic athletic form, held by a broad plain bronze warrior band across the forehead.',
  },
  pan: {
    impression_en: 'Arcadian god of shepherds and the living wilderness, radiating magnetic natural charisma, shrewd earthy humor, and confident primal authority.',
    hair_en: 'Dense natural dark curls arranged in a full archaic mass around a pair of small ribbed goat horns rooted at the brow, held by a simple woven pine-and-ivy wreath.',
    costume_en: 'A natural moss-green wool mantle pinned at the shoulder with a plain bone toggle over an undyed flax tunic, framing the neck with substantial handwoven folds.',
  },
  igraine: {
    impression_en: 'Regal Cornish queen of commanding poise, solemn dignity, steadfast courage, and unmistakable royal authority.',
  },
  'sir-agravain': {
    hair_en: 'Naturally grown dark hair divided by a restrained central part, falling in soft high-medieval locks to the upper nape and curving behind the ears.',
  },
  'sir-bors-the-younger': {
    impression_en: 'Serene, spiritually luminous Grail knight radiating proven courage, compassionate strength, and unwavering sacred purpose.',
    hair_en: 'Deep brown naturally grown hair arranged in soft high-medieval waves, brushed back from the forehead and falling behind the ears to the upper nape.',
  },
  'sir-kay': {
    hair_en: 'Dark naturally grown hair divided by a restrained central part, arranged in orderly high-medieval courtly waves behind the ears and across the upper nape.',
  },
  'sir-palamedes': {
    impression_en: 'Dashing, formidable foreign-born knight of melancholic nobility, unyielding passion, and tireless resolve.',
  },
  prometheus: {
    costume_en: 'A weighty Greek mantle of coarse charcoal-brown wool pinned at the right shoulder with a plain iron pin, layered over a simple undyed linen chiton and framing the neck with natural folds.',
  },
  hecate: {
    hair_en: 'Lustrous natural dark hair divided by a central part, arranged in ordered Classical waves over the temples and gathered into a low coiled knot beneath a dark sheer veil and restrained silver stephane.',
  },
  thetis: {
    impression_en: 'Ethereal marine goddess and protective divine mother, radiating shimmering oceanic majesty, celestial poise, deep feeling, and immortal elegance.',
  },
  iris: {
    hair_en: 'Fine natural wavy hair divided by a central part, drawn back into a graceful low coiled knot beneath a slender woven fillet, with small ordered curls at the temples and nape.',
  },
  alcmene: {
    impression_en: 'Regal Theban princess and mother of Heracles, radiating noble maternal grace, serene courage, and assured royal composure.',
    hair_en: 'Dark hair divided by a clean central part, arranged in rippling Classical Greek waves past the temples and gathered into a low bound coil at the nape beneath a slender bronze fillet.',
    costume_en: 'A saffron-tinted fine wool Doric peplos with an overfold resting across the shoulders, fastened with restrained bronze disc pins over a natural-cream linen chiton; the neckline falls below the tight crop.',
  },
  antaeus: {
    impression_en: 'Magnetic earth-born giant embodying monumental strength, fierce chthonic intensity, and controlled primal confidence.',
    hair_en: 'Thick dark curls drawn back from the brow into a deliberate archaic mass, secured with a simple woven wool band and settling in ordered locks at the nape.',
    facial_hair_en: 'A full, deliberately groomed dark curling beard with a powerful connected moustache and cleanly defined edges.',
    costume_en: 'A substantial ochre-toned sheepskin mantle and coarse dark woven wool drape resting over one shoulder, secured with a plain bone pin while leaving the natural neck line clear.',
  },
  anticlea: {
    impression_en: 'Noble mother spirit radiating tender maternal yearning, profound emotional depth, ethereal composure, and solemn dignity.',
    hair_en: 'Dark wavy hair divided by an even central part, gathered into a graceful low coiled knot at the nape beneath a soft charcoal-grey mourning veil.',
  },
  alcinous: {
    hair_en: 'Rich dark wavy hair drawn back in disciplined archaic waves beneath a slender woven royal fillet and resting neatly at the nape.',
    facial_hair_en: 'A full, well-groomed dark beard with a balanced connected moustache and cleanly defined lower edge.',
    costume_en: 'A royal murex-purple wool himation draped in noble folds over an indigo linen chiton and secured at the shoulder with a restrained bronze fibula.',
  },
  dolius: {
    hair_en: 'Receding natural grey hair combed back from the brow and arranged in orderly age-softened locks around the ears and nape.',
    facial_hair_en: 'A full, deliberately combed grey beard with a thick groomed moustache and clean lower edge.',
    costume_en: 'An earth-brown homespun wool exomis fastened at the right shoulder with a plain bone pin beneath an undyed wool shoulder wrap.',
  },
  medon: {
    hair_en: 'Natural dark hair arranged in neat practical waves beneath a slim woven fillet and resting in an orderly line at the nape.',
    facial_hair_en: 'A modest, neatly trimmed dark beard with a balanced connected moustache.',
  },
  minos: {
    impression_en: 'Monumental judge of the underworld radiating austere incorruptible authority, imposing legal majesty, and timeless sovereign gravity.',
    facial_hair_en: 'A substantial, deliberately sculpted dark full beard with a balanced full moustache.',
    costume_en: 'A dark-crimson and obsidian woven wool mantle with restrained spiral borders, draped over an archaic chiton and secured at the shoulder with a plain bronze fibula.',
  },
  nausithous: {
    hair_en: 'Grand dark wavy hair drawn back from the brow in ordered archaic locks beneath a broad woven royal fillet and resting around the nape.',
    facial_hair_en: 'A broad, deliberately groomed dark full beard with a balanced connected moustache.',
    costume_en: 'A deep navy-blue and sea-green woven wool royal himation over an ivory linen chiton, secured at the shoulder with a restrained bronze fibula.',
  },
  orion: {
    impression_en: 'Titanic and magnetic giant huntsman radiating controlled intensity, legendary physical dominance, and enduring underworld majesty.',
    hair_en: 'Thick dark curls arranged into a deliberate archaic mane, drawn back from the brow by a plain woven leather band and falling in ordered locks around the ears and nape.',
    facial_hair_en: 'A dense, deliberately groomed dark full beard with a substantial connected moustache and defined edges.',
    costume_en: 'A dark woven wool hunter exomis fastened at the shoulder with a plain bone pin beneath a substantial natural-hide mantle resting across the shoulders.',
  },
  perimedes: {
    impression_en: 'Capable Homeric helmsman radiating steadfast resilience, vigilant focus, calm seamanship, and unwavering loyalty.',
    hair_en: 'Natural dark hair drawn back securely from the brow into a low seafarer binding, with orderly waves around the ears and nape.',
    facial_hair_en: 'A dense, deliberately groomed dark full beard with a practical connected moustache.',
    costume_en: 'An indigo woven wool seafarer exomis fastened at the shoulder with a plain bone toggle beneath a substantial dark wool shoulder wrap.',
  },
  philoetius: {
    hair_en: 'Dense dark hair arranged in natural ordered waves around the head, kept clear of the brow and settling around the ears and nape.',
    facial_hair_en: 'A full, deliberately groomed dark beard with a robust connected moustache.',
    costume_en: 'A substantial tawny woven wool herdsman tunic fastened at the shoulder with a plain bronze pin beneath a durable dark wool mantle.',
  },
  laertes: {
    impression_en: 'Very old former king with deep emotional gravitas, rekindled ancestral pride, and fierce resilient royal spirit.',
    hair_en: 'Thin natural white hair loosely parted and falling in sparse age-softened locks around the temples, ears, and nape.',
    facial_hair_en: 'A long, full natural white beard with a thick white moustache, kept plainly combed.',
    costume_en: 'A coarse grey homespun wool chiton beneath a dark rustic wool himation, pinned at the shoulder with a simple bronze pin.',
  },
  melantho: {
    hair_en: 'Glossy dark hair divided by a central part, shaped into ordered ancient Greek ringlets at the temples and gathered into a low coiled knot secured with a plain bronze hairpin.',
  },
  hecuba: {
    impression_en: 'Majestic and commanding queen mother of Troy, radiating royal composure, keen intelligence, and monumental sovereign presence.',
    hair_en: 'Rich natural dark hair divided by a symmetrical central part, arranged in disciplined temple waves and gathered into a thick braided coil at the back beneath a broad woven royal fillet.',
    costume_en: 'A heavy midnight-indigo woven wool royal robe fastened at the shoulders with restrained bronze pins, layered with a dark charcoal linen veil descending from the woven fillet over both shoulders.',
  },
  astyanax: {
    costume_en: 'A soft unbleached ivory linen child tunic with a restrained purple woven edge, fastened at the shoulders with small smooth bronze pins beneath a lightweight wool shoulder cloth.',
  },
  atreus: {
    impression_en: 'Formidable and majestic sovereign of Mycenae, radiating relentless willpower, monumental ancestral authority, and commanding royal presence.',
    hair_en: 'Heavy dark wavy hair drawn away from the forehead in disciplined archaic waves and gathered neatly at the nape beneath a broad woven royal fillet.',
    costume_en: 'A heavy purple woven wool mantle draped over the shoulders and secured with a plain bronze pin over a deep-crimson linen tunic with a restrained geometric border.',
  },
  aerope: {
    hair_en: 'Dark wavy hair divided by a central part, arranged in formal Aegean side locks and gathered behind the head beneath a narrow woven royal fillet.',
    costume_en: 'A saffron-yellow woven linen robe with restrained Aegean border patterns, layered beneath a terracotta-red wool mantle fastened at the shoulders with simple bronze pins.',
  },
  chrysothemis: {
    hair_en: 'Lustrous dark-brown hair divided by a central part, rolled into symmetrical temple waves and gathered into a plaited coil at the nape beneath a narrow woven fillet.',
  },
  hippodamia: {
    impression_en: 'Majestic and commanding ancestral queen mother, radiating monumental sovereign authority, enduring regal strength, and assured royal grandeur.',
    hair_en: 'Abundant dark hair arranged in formal archaic waves away from the brow, bound into thick structured plaits coiled around the head beneath a broad woven royal fillet.',
    costume_en: 'A deep crimson woven wool robe with geometric borders, layered beneath a substantial saffron-yellow wool mantle draped across the shoulders and fastened with a plain bronze disc pin.',
  },
  pelops: {
    impression_en: 'Commanding founder-king radiating visionary authority, sovereign strength, and monumental ancestral power.',
    hair_en: 'Thick dark hair drawn back from the forehead in disciplined archaic waves and gathered at the nape beneath a broad woven royal fillet.',
    facial_hair_en: 'A full, dignified dark beard with a neatly groomed connected moustache and defined edges.',
    costume_en: 'A saffron and deep-indigo woven wool mantle draped across the shoulders and secured with a plain bronze disc pin over a fine linen tunic with a restrained geometric border.',
  },
  strophius: {
    impression_en: 'Benevolent and steadfast sovereign patriarch radiating warm paternal authority, noble generosity, and calm regal wisdom.',
    facial_hair_en: 'A full, well-groomed dark beard with a neatly trimmed connected moustache.',
  },
  thyestes: {
    impression_en: 'Formidable and deeply resolute royal claimant radiating sovereign gravitas, fierce willpower, and profound tragic majesty.',
    facial_hair_en: 'A prominent, well-groomed dark beard with a full balanced moustache and cleanly defined edges.',
  },
  myrtilus: {
    costume_en: 'A sturdy dark-ochre woven wool tunic beneath a practical saffron-edged wool mantle, draped across the shoulders and pinned with a plain cast-bronze fibula.',
  },
  'boyi-kao': {
    hair_en: 'Dark hair divided by a central part and drawn into an orderly aristocratic topknot, secured with a plain Ming-style cap and horizontal hairpin while the side locks rest behind the ears.',
  },
  'huang-tianhua': {
    hair_en: 'Lustrous dark hair drawn upward into a high Daoist youth topknot, secured beneath a small cinnabar-lacquered crown with a plain horizontal hairpin.',
  },
  'shen-gongbao': {
    hair_en: 'Jet-black hair drawn upward into a high Daoist topknot beneath a tall black-lacquered scholar-adept crown, secured with a plain horizontal hairpin and orderly temple hair.',
  },
  'taiyi-zhenren': {
    hair_en: 'Natural dark hair drawn upward into a venerable Daoist topknot beneath a restrained lotus-shaped ritual cap, secured with a plain hairpin and falling neatly behind the ears.',
  },
  'zhao-gongming': {
    hair_en: 'Coarse jet-black hair drawn firmly upward into a martial adept topknot beneath a restrained dark Ming religious-painting crown, secured with a plain horizontal pin.',
  },
  'huang-feihu': {
    hair_en: 'Dense dark hair drawn firmly upward into a warrior topknot beneath a dark Ming martial cap, with natural ordered hair remaining at the temples and nape.',
  },
  'golden-horned-king': {
    costume_en: 'A rich vermilion Ming-style crossover martial robe with a restrained woven gold border, draped broadly across the shoulders over a plain cream inner collar.',
  },
  'silver-horned-king': {
    costume_en: 'A deep midnight-blue Ming-style crossover martial robe with a restrained pale border, draped broadly across the shoulders over a plain white inner collar.',
  },
  'yellow-robe-demon': {
    hair_en: 'Dark hair drawn upward into a firm premodern martial topknot beneath a plain ochre cloth binding, with orderly locks at the temples and nape.',
    costume_en: 'A substantial mustard-yellow Ming-style crossover martial robe with a dark woven border, draped broadly across the shoulders over a plain inner collar.',
  },
  'queen-mother-of-the-west': {
    hair_en: 'Lustrous dark hair drawn upward into a formal Ming celestial-goddess arrangement beneath a restrained phoenix-form ritual headdress, with orderly temple hair and the ears visible.',
    costume_en: 'A celestial empress robe of royal purple and emerald woven silk, arranged with a right-crossing lapel and restrained cloud patterning over a plain ivory inner collar.',
  },
  'king-yama': {
    impression_en: 'August and incorruptible sovereign judge of the underworld, radiating imposing judicial authority, solemn imperial majesty, and profound cosmic order.',
    costume_en: 'An imperial underworld judge robe of deep crimson and midnight-black woven silk with restrained cloud patterning, arranged in a wide right-crossing lapel over a plain white inner collar.',
  },
  ghatotkacha: {
    costume_en: 'A deep olive-green coarse tussar-silk wrap draped broadly across the shoulders, paired with a plain dark cloth brow band and an open natural neck line below the tight crop.',
  },
  ashvatthama: {
    hair_en: 'Thick dark ascetic locks gathered upward into a high knotted jata at the crown, with deliberate textured strands falling around the ears and nape and the central forehead exposed.',
  },
  shikhandi: {
    hair_en: 'Natural dark hair drawn upward from the brow and bound into a disciplined warrior topknot with a simple woven cord beneath a plain cloth forehead band.',
    costume_en: 'A deep indigo unstitched silk uttariya draped across the shoulders beneath a plain woven forehead band, with the natural neck line clear and the lower folds outside the tight crop.',
  },
  jayadratha: {
    hair_en: 'Dark hair drawn back into a formal royal topknot beneath a restrained tiered Gupta-period royal crown, with ordered side locks behind the ears.',
    costume_en: 'A restrained tiered Gupta-period royal crown paired with a deep peacock-teal silk mantle draped over the shoulders and a plain beaded necklace at the base of the neck.',
  },
  jatayu: {
    costume_en: 'Natural divine-vulture presentation formed entirely by dense golden-bronze crest, neck, and shoulder plumage, with layered feathers defining the full avian silhouette.',
  },
  maricha: {
    costume_en: 'Supernatural golden-stag anatomy with natural branching golden antlers rising from the brow, dense golden neck fur, and a clean unadorned cervid silhouette.',
  },
  sobek: {
    facial_hair_en: 'Canonical crocodilian muzzle scales, sensory integumentary pits, and firm leathery lip margins define the snout in place of human facial hair.',
  },
  dasharatha: {
    impression_en: 'Stately Suryavansha sovereign radiating profound patriarchal gravitas, aristocratic presence, solemn feeling, and assured royal majesty.',
    hair_en: 'Natural dark hair drawn upward beneath a tiered Pahari-manuscript royal crown, with ordered dark locks visible at the ears and nape.',
  },
  iwanagahime: {
    impression_en: 'Imposing mountain goddess radiating unshakeable primordial dignity, monumental strength, deep composure, and enduring sovereign gravitas.',
  },
  'ame-no-tajikarao': {
    hair_en: 'Thick textured dark hair drawn firmly upward into a high warrior topknot bound with a simple braided hemp cord, with natural ordered locks around the temples and nape.',
  },
  cheonjiwang: {
    hair_en: 'Dark hair drawn upward into a traditional Korean topknot, bound at the forehead beneath a finely woven black horsehair manggeon and covered by a documented black Joseon sovereign cap with paired rounded wings.',
    costume_en: 'Celestial sovereign robe of rich royal-purple woven silk with restrained cloud patterning, formed with a traditional rounded danryeong collar and a clean white dongjeong band around the neck.',
  },
  ereshkigal: {
    impression_en: 'Regal Queen of the Netherworld radiating profound subterranean sovereignty, dignified composure, austere beauty, and commanding presence.',
    costume_en: 'An Old Babylonian divine conical tiara framed by two pairs of curving bull horns above an obsidian-black layered wool mantle draped across the shoulders.',
  },
  nergal: {
    impression_en: 'Magnetic martial deity of pestilence and the underworld radiating smoldering power, fierce authority, and formidable resolve.',
    facial_hair_en: 'A thick, deliberately groomed full beard of layered crimped waves with a structured squared lower edge and substantial connected moustache.',
    costume_en: 'An Old Babylonian horned divine cap above a burnt-ochre and charcoal felted wool martial mantle draped across the shoulders.',
  },
  angrboda: {
    impression_en: 'Formidable jötunn mother radiating primordial authority, penetrating intelligence, and calm monumental majesty.',
    hair_en: 'Long coarse dark hair divided by a simple central part, with two narrow temple plaits joining a low binding at the back while the remaining natural length falls over the shoulders.',
    costume_en: 'A charcoal-grey woven wool tunic beneath a substantial slate-grey wool mantle draped across the shoulders and fastened with a plain iron ring pin.',
  },
  grimhild: {
    impression_en: 'Calculating aristocratic queen and sorceress of the Gjúking court, radiating controlled regal composure, enigmatic intellect, and magnetic authority.',
    hair_en: 'Dark hair divided by a central part and gathered into a compact low bun at the back of the head beneath a fine undyed linen veil.',
    costume_en: 'A deep-indigo wool dress beneath a royal-blue wool mantle, draped across the shoulders and fastened with a restrained cast-bronze disc brooch and narrow tablet-woven border.',
  },
  hodr: {
    impression_en: 'Introspective blind Aesir god radiating quiet strength, profound tragic dignity, and serene inward focus.',
    hair_en: 'Thick ash-brown waves divided by a natural central part, drawn behind the ears and gathered loosely at the upper nape in an unadorned Viking-age arrangement.',
  },
  idunn: {
    hair_en: 'Long golden-brown hair divided by a central part, drawn into a compact bun at the back of the head with two narrow temple plaits joining the binding.',
    costume_en: 'A sage-green linen underdress beneath a saffron-yellow wool apron dress supported by straps with a pair of cast-bronze oval brooches, finished with a plain wool shoulder wrap.',
  },
  mimir: {
    hair_en: 'Long natural silver-grey hair divided by a central part and gathered into a low binding at the nape, with the remaining age-softened waves falling behind the shoulders.',
    costume_en: 'A peat-brown heavy wool tunic beneath a charcoal-grey wool mantle draped across the shoulders and fastened with a plain cast-bronze disc brooch.',
  },
  sif: {
    hair_en: 'Canonical lustrous spun-gold hair divided by a central part, drawn into a full bun at the back of the head while two long ordered lengths fall over the shoulders.',
    costume_en: 'An ochre linen underdress beneath a deep-crimson wool apron dress supported by straps with a pair of cast-bronze oval brooches and a restrained woven shoulder wrap.',
  },
  signy: {
    impression_en: 'Iron-willed Volsung princess and avenging queen radiating unyielding determination, solemn nobility, and commanding tragic grandeur.',
    hair_en: 'Dark hair divided by a central part and gathered into a secure low bun at the back of the head beneath a dark madder-dyed woven wool veil.',
    costume_en: 'A charcoal-grey wool tunic beneath a dark madder-red wool mantle draped across the shoulders, fastened with a single cast-bronze trefoil brooch and paired with a plain wool veil.',
  },
  sigyn: {
    hair_en: 'Long pale-blonde hair divided by a central part and gathered into a low bound bun at the back, with two narrow side plaits tied into the same plain wool binding.',
    costume_en: 'An unbleached linen underdress beneath a pale heather-grey wool apron dress fastened by modest bronze disc brooches, with a soft grey wool wrap over the shoulders.',
  },
  sinfjotli: {
    impression_en: 'Fierce and magnetic Volsung warrior radiating controlled primal vigor, predatory vigilance, and focused heroic resolve.',
    hair_en: 'Long dark hair drawn back from the brow and bound firmly at the nape with a plain woven cord, leaving strong natural waves around the ears and upper shoulders.',
    facial_hair_en: 'A short, deliberately groomed dark warrior beard with a connected defined moustache.',
    costume_en: 'A forest-green woven wool tunic beneath a substantial natural-grey wool mantle draped across the shoulders and secured with a plain forged-iron ring pin.',
  },
  volsung: {
    impression_en: 'Legendary divine-blooded king radiating fearless martial majesty, ancestral authority, and commanding noble gravitas.',
    hair_en: 'Thick natural dark hair divided by a central part, drawn behind the ears and gathered at the upper nape with ordered waves remaining visible.',
    facial_hair_en: 'A full, deliberately combed dark beard with a substantial connected moustache and defined lower edge.',
    costume_en: 'A deep-crimson woven wool tunic with a restrained tablet-woven border beneath an iron-grey wool mantle fastened at the shoulder with a cast-bronze disc brooch.',
  },
  'cumaean-sibyl': {
    hair_en: 'Natural dark hair divided by a central part, arranged into braided rolls and secured in a low knot beneath a white wool ritual fillet and an ivory linen priestess veil.',
    costume_en: 'An ivory late-antique woven tunic beneath a deep-indigo wool palla, draped across the shoulders and fastened with small plain bronze pins.',
  },
  'euryalus-of-troy': {
    hair_en: 'Natural dark curls arranged close around the crown, temples, ears, and nape in the rounded form of late-antique manuscript figures, held by a narrow woven warrior fillet.',
    costume_en: 'A deep-scarlet late-antique woven tunic beneath a dark-indigo wool mantle, draped over one shoulder and secured with a plain bronze disc brooch.',
  },
  evander: {
    impression_en: 'Venerable and benevolent Arcadian founding king radiating patriarchal gravitas, quiet wisdom, and dignified warmth.',
    hair_en: 'Natural wavy hair divided at the crown, drawn back from the forehead and settling in orderly late-antique locks around the ears and nape.',
    costume_en: 'An unbleached late-antique wool tunic beneath a substantial undyed mantle draped over one shoulder and secured with a plain bronze disc brooch.',
  },
  lavinia: {
    hair_en: 'Dark hair divided by a central part, arranged in symmetrical late-antique side rolls and secured in a low knot beneath red-and-white wool fillets and a translucent saffron veil.',
    costume_en: 'A fine ivory late-antique woven tunic beneath a translucent saffron palla veil, draped over the head and shoulders and secured with restrained bronze pins.',
  },
  'nisus-of-troy': {
    hair_en: 'Dark natural waves arranged close around the crown, temples, ears, and nape in the rounded form shown on late-antique manuscript warriors.',
    costume_en: 'A dark-olive late-antique woven tunic beneath a deep-charcoal wool mantle, draped over the right shoulder and secured with a plain bronze disc brooch.',
  },
  'pallas-of-arcadia': {
    hair_en: 'Lustrous dark curls arranged symmetrically around the forehead, ears, and nape beneath a slender woven royal fillet in a late-antique manuscript form.',
    costume_en: 'A fine ivory late-antique woven tunic beneath a purple wool mantle, draped over the right shoulder and secured with a restrained bronze disc brooch.',
  },
}

const traditionPatches = {
  'myth-mesopotamia': {
    canonical_source_urls: [
      'https://etcsl.orinst.ox.ac.uk/section1/tr141.htm',
      'https://etcsl.orinst.ox.ac.uk/section1/tr162.htm',
    ],
  },
  'myth-norse': {
    visual_frame_ko: '북유럽 신화 인물군은 9~10세기 바이킹 시대 스칸디나비아 복식 유물과 국립박물관의 복원 연구를 단일 시각 준거로 삼는다. 인물 개인의 실재 복식이 아니라 직물·브로치·펜던트 도상에서 확인되는 구조를 역할별로 책임 있게 재구성하며, 후대 낭만주의와 현대 판타지식 땋은머리·왕관·가죽 갑주를 사용하지 않는다.',
    evidence_level: 'responsible_reconstruction',
    hair_beard_basis_ko: '덴마크 국립박물관이 소개하는 여성 펜던트 도상의 뒤통수 묶음머리와 고고학적으로 가능한 단순 결발을 기준으로 삼았다. 남성도 자연스럽게 기른 머리를 목덜미에서 묶거나 귀 뒤로 정리하며, 현대식 전사 브레이드와 미용실 헤어 용어를 제거했다. 수염은 인물의 나이와 역할에 따라 단정하게 결정하고 거칠게 보이기 위한 수단으로 쓰지 않았다.',
    costume_armor_basis_ko: '리넨 속옷, 모직 튜닉·망토·앞치마형 겉옷과 고고학적으로 확인되는 타원형·원반형·고리형 브로치를 중심으로 구성했다. 금관, 임의의 보석 장식, 모피 갑주와 판타지 가죽 장비는 삭제하고, 유물로 남기 어려운 직물의 색과 조합은 책임 있는 복원으로 한정했다.',
    canonical_source_urls: [
      'https://www.arnastofnun.is/en/news/new-electronic-edition-codex-regius-poetic-edda',
      'https://morrisarchive.lib.uiowa.edu/exhibits/show/translations/old-icelandic/storyofvolsungs/text-of-the-volsunga-saga',
    ],
    appearance_source_urls: [
      'https://en.natmus.dk/historical-knowledge/denmark/prehistoric-period-until-1050-ad/the-viking-age/the-people/clothes-and-jewellery/',
      'https://www.britishmuseum.org/collection/object/H_1883-0727-1',
      'https://www.britishmuseum.org/collection/object/H_1852-0329-158',
      'https://www.britishmuseum.org/collection/object/H_2017-8003-3',
    ],
  },
  'virgil-aeneid': {
    visual_frame_ko: '《아이네이스》 인물군은 바티칸 베르길리우스(Vat. lat. 3225)의 4세기 말 고대 후기 필사본 도상을 단일 시각 준거로 삼는다. 서사의 청동기·초기 라티움 배경을 고대 후기 수용 도상과 섞지 않고, 필사본의 튜닉·망토·베일·단순 관식으로 일관되게 재구성한다.',
    evidence_level: 'iconographic',
    hair_beard_basis_ko: '남녀 모두 바티칸 필사본 인물 도상의 정돈된 짧은 컬, 뒤로 묶은 머리, 낮은 매듭과 베일을 기본으로 삼았다. 현대식 상투와 이발 용어, 근거 없는 금관을 제거하고, 연장자와 젊은 전사의 수염을 인물별로 별도 결정했다.',
    costume_armor_basis_ko: '고대 후기의 직조 튜닉과 어깨에 걸친 망토·팔라, 단순한 필레트와 베일을 사용했다. 초기 철기시대 유물과 4세기 필사본을 한 인물 안에서 혼합하던 방식을 버리고, 가죽 어깨끈·고짓·흉갑·금제 장신구를 삭제했다.',
    canonical_source_urls: [
      'https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.02.0055',
      'https://digi.vatlib.it/mss/detail/Vat.lat.3225',
    ],
    appearance_source_urls: [
      'https://digi.vatlib.it/view/MSS_Vat.lat.3225/0040',
      'https://www.metmuseum.org/art/collection/search/547334',
      'https://www.metmuseum.org/art/collection/search/443300',
      'https://www.metmuseum.org/art/collection/search/447844',
    ],
  },
}

function normalizeReview(review, applyManualPatch = true) {
  const next = { ...review }
  if (applyManualPatch) Object.assign(next, patches[next.slug] ?? {})

  next.hair_en = next.hair_en
    .replace(/\bchignon\b/giu, 'low coiled knot')
    .replace(/\bsleek\b/giu, 'orderly')
    .replace(/\bslicked\b/giu, 'combed')
    .replace(/\bslick\b/giu, 'smooth')
    .replace(/\bface-framing\b/giu, 'temple-side')
    .replace(/\bjaw-level\b/giu, 'upper-nape')

  next.impression_en = next.impression_en
    .replace(/\bbattle-hardened\b/giu, 'battle-proven')
    .replace(/\bweathered\b/giu, 'steadfast')
    .replace(/\brugged\b/giu, 'formidable')
    .replace(/\bferal\b/giu, 'primal')
    .replace(/\buntamed\b/giu, 'commanding')
    .replace(/\bgrizzled\b/giu, 'seasoned')
    .replace(/\bsorrow-stricken\b/giu, 'solemn')

  next.costume_en = next.costume_en
    .replace(/\bweathered\b/giu, 'substantial')
    .replace(/\brugged\b/giu, 'durable')

  if (/clean-shaven/iu.test(next.facial_hair_en)) {
    next.facial_hair_en = 'Clean-shaven with no beard, moustache, or stubble.'
  } else if (/\bno (?:human )?facial hair\b/iu.test(next.facial_hair_en) && !/(fur|feather|plumage|scale|bristle|whisker|muzzle|beak)/iu.test(next.facial_hair_en)) {
    next.facial_hair_en = 'No facial hair.'
  } else {
    next.facial_hair_en = next.facial_hair_en
      .replace(/\byouthful\b/giu, '')
      .replace(/\belderly\b/giu, '')
      .replace(/\bskin\b/giu, '')
      .replace(/\bcomplexion\b/giu, '')
      .replace(/\bfacial structure\b/giu, '')
      .replace(/\bface shape\b/giu, '')
      .replace(/\bjawline\b/giu, 'jaw')
      .replace(/\s{2,}/gu, ' ')
      .trim()
  }
  next.facial_hair_en = next.facial_hair_en.replace(/No beard, moustache, or facial hair; smooth bare female\s*\./giu, 'No facial hair.')

  if (applyManualPatch && patches[next.slug]) {
    next.verdict = 'revise_for_accuracy'
    next.change_note_ko = '승인 얼굴의 인상과 나이는 보존하고, 현대적 머리 또는 근거가 약한 장신구·갑주 표현을 제거했다.'
  }
  return next
}

function alignHistoricalBasis(tradition, review, applyManualPatch = true) {
  if (!applyManualPatch) return review
  if (tradition === 'myth-norse') {
    return {
      ...review,
      evidence_level: 'responsible_reconstruction',
      historical_basis_ko: '9~10세기 바이킹 시대의 직물·결발 도상과 브로치 유물을 공통 준거로 삼았으며, 이 인물의 머리·수염·복식 조합은 역할에 맞춘 책임 있는 재구성이다.',
    }
  }
  if (tradition === 'virgil-aeneid') {
    return {
      ...review,
      evidence_level: 'iconographic',
      historical_basis_ko: '4세기 바티칸 베르길리우스의 고대 후기 인물 도상과 동시기 튜닉·망토·베일 자료를 적용했으며, 초기 철기시대 요소를 섞지 않은 수용사적 재구성이다.',
    }
  }
  return review
}

function main() {
  mkdirSync(FINAL, { recursive: true })
  let rows = 0
  const selected = []
  for (let batch = 1; batch <= 17; batch += 1) {
    const v4 = resultFile(V4, batch)
    const v3 = resultFile(V3, batch)
    const candidates = [
      { source: v4, pass: 4 },
      { source: v3, pass: 3 },
      { source: resultFile(V2, batch), pass: 2 },
    ]
    const chosen = candidates.find((candidate) => existsSync(candidate.source))
    const source = chosen?.source
    if (!source) throw new Error(`결과 누락: ${batch}`)
    const envelope = readJson(source)
    const applyManualPatch = chosen.pass < 4
    if (applyManualPatch) Object.assign(envelope.result, traditionPatches[envelope.result.tradition] ?? {})
    envelope.result.reviews = envelope.result.reviews
      .map((review) => normalizeReview(review, applyManualPatch))
      .map((review) => alignHistoricalBasis(envelope.result.tradition, review, applyManualPatch))
    envelope.generated_at = new Date().toISOString()
    envelope.finalized_from = source
    writeJson(resultFile(FINAL, batch), envelope)
    rows += envelope.result.reviews.length
    selected.push({ batch, tradition: envelope.result.tradition, pass: chosen.pass, rows: envelope.result.reviews.length })
  }
  if (rows !== 198) throw new Error(`최종 행 수 오류: ${rows}`)
  writeJson(path.join(FINAL, 'selection.json'), { generated_at: new Date().toISOString(), rows, selected })
  console.log(JSON.stringify({ event: 'final_results_prepared', rows, traditions: selected.length, output: FINAL }))
}

main()
