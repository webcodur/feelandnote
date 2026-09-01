/** Write the three individually researched mythology avatar prompts requested after the 198-person batch. */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const OUTPUT =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-프롬프트\\추가-3명-초상화-프롬프트.json'

const shared = `
FRAMING AND CAMERA
Square 1:1 head-and-shoulders avatar photograph. Show the complete natural skull, complete hairstyle, both ears or their anatomical equivalents, neck, both shoulder tops, and only a modest upper-chest edge. Leave 7 to 10 percent of the square height as visible background above the highest required natural hair or compact headwear. Both outer shoulder slopes enter the lower corners. Keep the face large and centered, with its vertical center line at 50 percent of the frame. The eyes sit near 44 to 47 percent of frame height and the chin near 78 to 82 percent. The subject faces the camera directly or turns no more than ten degrees and looks into the lens. The composition remains readable in a circular mask and in a narrow center crop that removes the outer 12 percent from each side.

Exactly one subject. A calm portrait posture with no hands in frame and no weapons, tools, books, musical instruments, animals, or narrative props. The historically appropriate neckline stays simple and open; the portrait uses camera crop rather than added collars, clasps, torcs, gorgets, or shoulder ornaments to fill the lower edge.

RENDERING
An ultra-photorealistic color photograph of a physically living mythological person, shot on a modern full-frame camera with lifelike skin, hair, fur and handwoven textile texture. Natural pores, weathering and small asymmetries remain visible. The result reads as a specific ancient character rather than a modern actor, fashion model, fantasy cosplayer, painting, sculpture, illustration, CGI render, wax figure, beauty-filtered face, or monochrome image. Clean softly blurred background, no text, symbols, watermark, border, or frame.

OUTPUT
Exactly one square image, at least 1024 x 1024 pixels.`

const prompts = [
  {
    target_id: '84266743-b224-4425-a477-393126b5a910',
    slug: 'diomedes-of-thrace',
    name_ko: '트라키아의 디오메데스',
    name_en: 'Diomedes of Thrace',
    tradition: 'heracles',
    prompt: `CHARACTER — DIOMEDES OF THRACE
Create an original portrait of Diomedes of Thrace, the Bistonian horse-king, son of Ares and savage master of the man-eating mares. This is not Diomedes of Argos.

He is a powerfully built Thracian ruler in his early forties, with a broad high-cheekboned face, deep-set dark amber eyes, a once-broken aquiline nose, wind-burned bronze skin, and a controlled predatory stare. His menace comes from human command and appetite rather than supernatural deformity. Thick dark-auburn hair falls in coarse waves to the nape. A dense Thracian moustache joins a short, strong, slightly pointed beard; both are naturally grown and weathered rather than sharply barbered.

He wears a compact alopekis of dark weathered fox hide, based on ancient Thracian dress: the soft fox ears lie back with the contour instead of rising like fantasy horns, and the entire cap and the natural hair beneath it fit inside the frame. A single broad fold of heavy Thracian zeira crosses one shoulder, handwoven in deep oxblood, burnt ochre and charcoal geometric bands over a plain flax chiton. The textile is rich because he is a king, but rugged and pre-Hellenistic, with no metal shoulder fastener visible.

Cold blue dawn light shapes one side of his face while a low copper stable glow catches the beard and cap edge. The background is a clean, dark, softly blurred Thracian steppe atmosphere with only faint earthy haze. His expression is still, proprietary and merciless: a horse-lord who expects every living thing before him to obey.
${shared}`,
  },
  {
    target_id: '7cb8d96f-947c-49d4-9ea8-fde105619ce5',
    slug: 'chiron',
    name_ko: '케이론',
    name_en: 'Chiron',
    tradition: 'greek-roman-myth',
    prompt: `CHARACTER — CHIRON
Create an original portrait of Chiron, the wise and civilised centaur of Mount Pelion, healer and teacher of Achilles, Asclepius and other heroes.

He has the face of a vigorous man in his early sixties rather than a frail wizard: a long weathered Thessalian face, broad thoughtful brow, steady hazel-green eyes, sun-browned skin, a strong slightly crooked nose, and deep lines earned by outdoor teaching and patient attention. His expression joins intellectual calm, physical authority and quiet kindness. Coarse chestnut hair heavily streaked with iron grey grows to the shoulders in loose ancient waves, with a modest mane-like ridge at the crown. A full medium-length grey-brown beard is clean but naturally uneven.

Chiron's nonhuman nature is legible through two restrained anatomical details drawn from early Greek centaur iconography: small mobile equine ears emerge naturally through the hair above and behind the human ears, and the hair along the nape has the coarse density of a horse's mane. The ears are living anatomy, modest in scale and fully inside the frame. His face remains human, wise and dignified, with no horns, antlers or satyr features.

He wears an undyed warm-stone wool chiton with a single soft olive-brown cloak fold resting low on one shoulder, simple clothing appropriate to a civilised Pelion teacher. No jewelry or ceremonial fastener is visible. Diffuse mountain morning light filters through leaves, softly separating grey hair and beard from a deep moss-green, clean blurred forest background. A faint warm reflected light from pale rock gives the face a healing, grounded presence.
${shared}`,
  },
  {
    target_id: 'b39d6cb1-d2fa-4146-aa3c-4099e071c42a',
    slug: 'phoenix',
    name_ko: '포이닉스',
    name_en: 'Phoenix',
    tradition: 'homer-iliad',
    prompt: `CHARACTER — PHOENIX, SON OF AMYNTOR
Create an original portrait of Phoenix, son of Amyntor: the elderly Myrmidon commander, foster father and tutor of Achilles, and impassioned speaker of the embassy in Iliad Book 9. This is a mortal Greek elder, not the fire-bird.

He is in his late sixties, visibly old yet still built like a veteran who can lead a company. His face has a wide lined forehead, prominent bent nose, high weathered cheekbones, deep moist dark-grey eyes, and a firm mouth made for long counsel. The expression holds restrained paternal grief and moral urgency without open crying: he has spent a lifetime teaching Achilles to speak and act, and still expects his words to matter. Long white hair with a few iron-grey strands is drawn into a low practical tie at the back, as in ancient embassy imagery, with loose wind-touched waves at the temples. A full white beard reaches the upper chest edge, broad and naturally combed, with a substantial moustache.

He wears a plain smoke-red wool chlamys in one low diagonal fold over an undyed linen chiton. The clothes belong to a Myrmidon elder in a wartime camp rather than a king, priest or court noble. The fastening sits below the crop, leaving no brooch or shoulder ring in view. Soft dusk firelight warms one cheek and the white beard while cool Aegean evening light holds the other side. The background is a clean, dark slate-and-umber camp atmosphere with no visible tent, shield or weapon.
${shared}`,
  },
]

mkdirSync(path.dirname(OUTPUT), { recursive: true })
writeFileSync(
  OUTPUT,
  `${JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      applied_to_db_or_storage: false,
      source_basis: [
        'Theoi: Diomedes Thrakios classical source excerpts',
        'British Museum 1847,0806.57: Thracian alopekis, patterned zeira and chiton',
        'Royal College of Physicians of Edinburgh: early Chiron dress and civilised teacher iconography',
        'Iliad Book 9 and Attic embassy iconography: Phoenix as white-haired elder and Achilles tutor',
      ],
      prompts,
    },
    null,
    2,
  )}\n`,
  'utf8',
)

console.log(JSON.stringify({ prompts: prompts.length, output: OUTPUT }, null, 2))
