/**
 * 대표 사진 발주서의 공통 블록. hero-generate.mjs와 시험 러너가 함께 쓴다.
 *
 * 신원을 정하는 방식이 셋이라 앞머리만 갈아끼운다.
 *   photo        — 얼굴 사진 REF가 있다. 얼굴을 전부 REF에서 가져온다.
 *   illustration — 삽화·판화·만화가 REF다. 인상과 복식만 가져오고 그림체는 버린다.
 *   described    — REF가 없다. 얼굴 계통·나이·성별을 글로 지정한다.
 *
 * 나머지 블록(시선·물리·프레이밍·질감)은 어느 방식이든 같다.
 */
import { CELEB_HERO_PHOTO_SPEC } from '@feelandnote/shared/constants/celeb-hero-photo'

/** 생성 작업 원본 한 변. 16의 배수이고 픽셀 하한 655,360을 넘긴다 */
export const WORK_SIZE = 1024

const FINAL_ASPECT_LABEL = CELEB_HERO_PHOTO_SPEC.aspectLabel
const SAFE_WIDTH_PERCENT = Math.round(CELEB_HERO_PHOTO_SPEC.aspectRatio * 100)
const CARD_PX = CELEB_HERO_PHOTO_SPEC.desktopWidthPx

// 링컨 시험(26.07.31)에서 확정한 공통부. 이 문구를 빼면 회화체로 나온다.
// 2차 개편 — 재질·빛의 입자와 색 절제를 같은 블록에 박았다(화보 문법 4·6).
export const RENDERING = `RENDERING — THIS IS A PHOTOGRAPH, NOT A PAINTING
Ultra-photorealistic photograph, lit and finished like an editorial cover shoot. Real skin that holds its own fine texture while reading clear and well-lit on the face. Individual hair strands resolved. Fabric weave visible in the cloth.
85mm lens, full-frame DSLR look. Tack sharp focus on the eyes. Natural color grading, RAW photo quality. High dynamic range, realistic shadow falloff and highlight roll-off.
Extremely high detail, high-frequency texture preserved. Crisp edges and true camera optics throughout — lens falloff, natural depth of field, the grain of a real exposure.
Light lands on real surfaces and stays there: metal carries scratches, hammer marks, oxidation and the reflected shape of the light source; leather shows its grain. The heavy texture belongs to metal, leather, cloth and stone — the face keeps its own clean surface, and sweat or soot reaches it only when the person is at hot, dirty work. Where the moment makes particles — sparks, ash, dust — they hang in the air and catch the light.
The whole frame sits inside the colour palette the direction sheet names — every colour in the picture belongs to those two or three families.
Full colour throughout: rich, natural, lifelike hues with saturation intact.
Every surface carries pattern, grain, weave or plain worked material.`

/**
 * 사진 REF는 씨앗이다. 그 인물의 초상이 아니다.
 *
 * 26.09.06 유저 판단 — 재료 풀이 아무리 커도 인물마다 닮은 얼굴을 구하는 것은 불가능하다.
 * 성별·계통만 맞춰 아무 사람이나 붙이고, 나이·체구·풍상·차림새는 발주서가 바꾼다.
 * 그래서 "얼굴을 전부 REF에서 가져와라"를 버리고, 가져올 것(골격)과 덮어쓸 것(그 위의 전부)을 가른다.
 * 골격까지 놓으면 모델이 기본값 미남으로 돌아가 인물이 서로 구별되지 않는다 — 그래서 골격은 붙든다.
 */
export const IDENTITY_PHOTO = `IDENTITY — READ FIRST
The attached image is a SEED, not a portrait of this person. It is a photograph of a stranger, and it exists to give this person a face of their own instead of the same one you would draw every time.

TAKE FROM THE SEED — ONLY the bare architecture of the skull, so that the result is one specific irreplaceable human being: the proportions of skull and jaw, the set and spacing of the eyes, the bridge and tip of the nose, the width of the mouth, the shape of the ears and brow ridge. Everything that sits on top of that bone is built fresh below.

HAIR AND BEARD ARE DESIGNED HERE. Build them from scratch as part of the same costume as the clothes: the cut, the length, the parting, the braid, knot, topknot, shaved crown, oiled curls, ringlets or loose fall that this people, this century and this rank actually wore, and the beard — full, forked, plaited, clipped, waxed, or a clean-shaven face — that went with that dress. The hair reads as one piece with the WARDROBE below; a modern cut above ancient cloth is the single fastest way to ruin this photograph.

OVERWRITE EVERYTHING ELSE. The SUBJECT block below states who this man or woman actually is, and it outranks the seed on every point where the two disagree — ancestry, age, build, weight, hair, beard, grooming, expression, bearing.

ANCESTRY COMES FROM THE SUBJECT BLOCK. The seed is a stranger who may come from anywhere on earth; the people this photograph belongs to are named in the SUBJECT block, and the face must read as one of them. Take the seed's proportions as a starting armature and rebuild on it the skin tone, the eye shape and lid, the nose, the lips, the cheekbones, the hair texture and colour that the SUBJECT's ancestry gives. Where the two collide, the ancestry wins and the armature bends. What survives from the seed is the individuality — that this is one particular person with a face of their own — not where he came from.

AGE IS THE POINT THEY DISAGREE ON MOST, AND THE SUBJECT WINS, IN BOTH DIRECTIONS. If the seed is a smooth-skinned twenty-year-old and the SUBJECT calls for a man in his sixties, carry that skull forward forty years — hollow the cheeks, slacken the jaw and eyelids, grey and thin the hair, cut the lines in. If the seed is a weathered seventy-year-old and the SUBJECT calls for a man in his twenties, run it the other way — give him the young face that same skull carried: cheeks full and drawn taut, a sharp jawline, tight smooth skin, clear eyes, thick hair in its own colour. Take every year back off the same skull. Keep the skull and the features; change the decades on them.

EVERYTHING VISIBLE COMES FROM THE DIRECTIONS BELOW: the pose, the crop, the framing, the background, the lighting, the clothing, the grooming and the expression are all built fresh from this sheet, in the dress and manner of his own century.`

/**
 * 인물의 물성. REF가 더 이상 이걸 정하지 않으므로 여기서 못 박는다.
 * 나이·체구는 .tmp/age.json이 쥔다. 성별은 brief-targets.json의 gender다.
 */
/**
 * 얼굴 계통. 씨앗이 아니라 여기가 정한다 — 재고가 마르면 배정기가 버킷을 넘어가기 때문이다.
 * 인종 범주어 대신 지역·민족으로 적는다. 그쪽이 픽셀에 더 정확하고 모델이 덜 뭉갠다.
 */
const LINEAGE = {
  EastAsian: 'East Asian — Han Chinese, Korean, Japanese or Mongol stock',
  SEAsian: 'Southeast Asian — mainland or island: Khmer, Thai, Viet, Malay, Javanese, Filipino',
  Amerind: 'Indigenous American — Andean, Mesoamerican or North American, of the peoples who lived here before any European arrived',
  Indian: 'South Asian — of the Indian subcontinent',
  MiddleEastern: 'West Asian or North African — Levantine, Mesopotamian, Persian, Anatolian, Arabian or Berber',
  Black: 'Sub-Saharan African',
  'white-etc': 'European',
  'white-blonde': 'European',
  'white-red': 'European',
  Latino: 'Latin American',
  // 26.09.12 추가 — 이 셋은 위 계통 어디에도 안 맞아 엉뚱한 얼굴이 나가던 칸이다.
  Pacific: 'Pacific Islander — Polynesian, Melanesian or Micronesian: Maori, Hawaiian, Samoan, Tongan, Fijian or Rapa Nui stock',
  CentralAsian: 'Central Asian Turkic — Kazakh, Kyrgyz, Uyghur, Turkmen or the steppe Turk stock of the old khanates, not Han Chinese',
  Australian: 'Aboriginal Australian — of the peoples who lived on that continent before any European arrived',
}

export function subjectBlock({ sex, age, build, lineage }) {
  const who = sex === 'f' ? 'woman' : 'man'
  const decade = { '20s': 'twenties', '30s': 'thirties', '40s': 'forties', '50s': 'fifties', '60s': 'sixties', '70s': 'seventies', '80s': 'eighties' }[age] ?? 'forties'

  // 「보통」이라고만 하면 생성기가 아무 몸이나 냈고, heavy 둘이 전부 보통 체구로 나왔다(26.09 실측).
  // 고대인의 몸은 푸근함이 아니라 근육·골격의 선으로 읽혀야 한다 — 체구마다 보이는 선을 적는다.
  const BODY = {
    slight: 'Lean and wiry — a narrow frame, long muscle on the forearms, the tendons at the wrist and neck showing, little flesh over the bone.',
    average: 'A fit, defined build — muscle standing out along the shoulders, arms and chest, a flat waist, the collarbone and the line of the jaw clear; the body of a person who works with their hands.',
    heavy: 'Powerfully built and imposing — a thick corded neck, shoulders wide enough to crowd the frame, a deep chest and heavy muscled arms, the torso thick with muscle over a broad ribcage rather than soft with fat. The bulk is a weapon: he takes up more room than anyone else could, and the shadow deepens under the brow and along the jaw to say so.',
  }
  const body = BODY[build] ?? BODY.average

  // 나이별로 얼굴에 실제로 나타나는 것만 적는다. 한 문장을 전 연령에 돌려쓰면
  // 20대 인물에게 "세월이 당긴 늘어짐"이 붙어 씨앗의 노화가 그대로 남는다.
  // 부정형(없다)은 생성기가 못 따르고 오히려 그 개념을 불러온다 — 젊은 쪽은 있는 상태만 적는다.
  const SKIN = {
    '20s': 'Young skin drawn taut over full cheeks, a clean sharp jawline running into a tight neck, clear eyes, thick hair in its own colour. What the weather has done is colour and roughness, not age: burnt across the nose and cheekbones, chapped where the wind hits.',
    '30s': 'Skin still taut over full cheeks, the jawline sharp. The first fixed lines sit only where the face moves most — across the brow, at the outer corners of the eyes. Hair full and its own colour.',
    '40s': 'In full maturity and handsome with it: the bone structure at its clearest, firm lines set at the brow and the outer corners of the eyes, the jaw still strong, a little silver at the temples.',
    '50s': 'Distinguished and still formidable — strong bones under a settled face, deep lines that give the features authority, a firm jaw, grey coming through the hair.',
    '60s': 'A commanding older face: strong bone under weathered skin, deep lines earned and worn well, the gaze undimmed, hair mostly silver and still full.',
    '70s': 'Venerable and striking — spare flesh over fine bone, deep lines, a white beard or white hair kept well, the eyes clear and sharp.',
    '80s': 'Very old and dignified: skin thin over an elegant skull, the face spare and finely lined, hair white, the look still direct.',
  }
  const skin = SKIN[age] ?? SKIN['40s']

  // 씨앗의 머리·수염은 버리고 복식과 한 벌로 새로 짓는다. 한 줄짜리 지시로는 씨앗이 그대로 살아남았다(26.09.13).
  const hair = sex === 'f'
    ? `HAIR: designed for this century and this rank, not copied from the seed — the parting, the braids, coils, pins, veil or headcloth that this people actually wore, dressed as one piece with the clothes below.`
    : `HAIR AND BEARD: designed for this century and this rank, not copied from the seed — the cut, length, braid, knot, topknot or shaved crown this people actually wore, and the beard that went with it (full, forked, plaited, clipped, or clean-shaven), as one piece with the clothes below.`

  // 얼굴 골격은 몸과 한 몸이다 — 근육질 몸에 부드러운 얼굴이 붙던 문제를 막는다(26.09.13, 아비라자).
  const FACE_FOR_BUILD = {
    slight: 'The face matches that body: fine-boned and spare, the cheekbones and jaw clearly cut under the skin.',
    average: 'The face matches that body: firm and clean-lined, a defined jaw and solid cheekbones.',
    heavy: 'The face matches that body: a broad heavy skull, wide cheekbones, a thick jaw and a strong brow ridge — the head of someone built this way, the face as solid as the frame under it.',
  }
  const faceBuild = FACE_FOR_BUILD[build] ?? FACE_FOR_BUILD.average

  const anc = LINEAGE[lineage]
  return `SUBJECT — WHO IS ACTUALLY IN FRONT OF THE CAMERA
A ${who} in ${his(sex)} ${decade}. ${body} ${faceBuild}${anc ? `\nANCESTRY: ${anc}. Skin tone, eye shape and lid, nose, lips, cheekbones and hair texture are all this ancestry's, whatever the seed shows.` : ''}
${skin}
${hair}
What ${his(sex)} wears leaves the body's working visible — sleeves rolled or cut short, forearms and the neck bare where ${his(sex)} century's dress allows; the build above still reads through the cloth.
CAST THIS PERSON BEAUTIFUL. Fine bone structure, clean symmetry through the face, clear even skin, a strong well-drawn jaw and brow, expressive eyes — the kind of face a film would cast for this role and put on the poster. Keep one or two small irregularities so it stays a particular person rather than a mannequin, but the overall impression is beauty, not wear. A great portrait photographer got the best hour of this person's life — lit, composed and caught at their most compelling. The eyes and brow are set with intention — the face of a person mid-thought, carrying the expression the direction sheet names.`
}

const his = (sex) => (sex === 'f' ? 'her' : 'his')
const him = (sex) => (sex === 'f' ? 'her' : 'him')

// 판화·삽화·만화를 붙일 때. 사진 REF 문구를 그대로 쓰면 판화체가 그대로 나온다.
// 반대로 "참고만 하라"고 뭉개면 REF를 무시하고 기본값 얼굴로 돌아간다. 가져올 것과 버릴 것을 갈라 적는다.
export const IDENTITY_ILLUSTRATION = `IDENTITY — READ FIRST
The attached reference is a DRAWING (an engraving, illustration or comic panel), not a photograph. It is the only likeness of this person that exists, and it decides who he is.

TAKE FROM THE DRAWING: the shape and character of the face — the bone structure, the set of the eyes, the nose and brow, the age written into the face, the build of the body, the hair and beard, the shape and layering of the garments and headwear.

TAKE FROM THE DRAWING only the likeness — the face, the build, the dress it records. Render all of it as a full-colour photograph on real skin and real cloth, with the pose, crop, composition, background and lighting built fresh from the directions below.

Now photograph THAT MAN — a living human being with real skin, real hair and real cloth — in the scene described below. He must read as the same individual a viewer would recognise from the drawing, rendered as a modern colour photograph.`

/**
 * REF가 없을 때. 지정하지 않으면 모델이 서구 백인 20~30대 미남미녀를 기본값으로 낸다.
 * 권역별 얼굴 계통·나이·성별은 docs/todo/img/avatar-backlog.md가 쥔다.
 */
export function identityDescribed(faceSpec) {
  return `IDENTITY — READ FIRST
This sheet carries the whole likeness in words. Build the face from the description below and follow it exactly.

${faceSpec.trim()}

This is one specific human being, not a type. Give him an asymmetric, lived-in face with the marks his life and climate would leave on it — the face of his own people and his own age, this man's own irregular features, as far from a stock-photo face as the spec allows.`
}

// 화보형(정면 응시)과 본업 몰입형(일감 응시)은 섞이면 둘 다 죽는다.
// 책을 읽으면서 카메라를 보는 컷, 빈손으로 포즈만 잡았는데 작업 중이라는 컷이 그 실패다.
// 2차 개편 — 두 모드의 화보 문법(방향광·점정 동작·화면 안 광원)을 같은 블록에 박았다.
export const GAZE = `GAZE — IT MATCHES THE SHOT MODE DECLARED ABOVE
Each sheet runs one of two modes, and the whole picture follows that one.

POSED — the photographer's portrait. He has stopped what he was doing and turned at the sound of his name: a living face, mid-breath, looking straight down the lens. Head and torso sit three-quarter to the camera, a forearm resting on a knee or a table edge, a helmet or a tool of his trade tucked under the arm. The hands rest. The eyes hold the lens with intent — measuring, challenging, weighing the stranger behind it.

ABSORBED — the height of a working motion, his attention entirely on the work. The peak instant: the pour, the strike, the cut. The work's own light sits inside the frame — the forge, the torch, the molten metal — throwing upward onto him while the room behind sinks into darkness. Sweat, soot, sparks or dust hang at the edge of the moment. His eyes lock on the object named as the gaze target, his brow tightens, his head and shoulders turn to it.

THE HEAD STAYS UP AND THE WORK STAYS OUT. In ABSORBED the work happens away from the body and at chest height or above — out at arm's length, up on an anvil, a bench, a rail or a wall, held out into the light, raised overhead — and his head stays level with it. The chin turns; the face stays open to the camera, the eyes lit, the throat and jawline in view. The gaze target is a solid thing the viewer can see: a blade, an instrument, a joint of wood, the lip of a crucible.`


// 물건이 허공에 뜨거나 팔다리가 가구를 뚫는 컷을 막는다.
export const PHYSICALITY = `PHYSICALITY — GRAVITY AND ANATOMY HOLD
Every object in the frame is supported by something the viewer can see: gripped by a hand whose fingers actually close around it, resting on a surface, hanging from a fixture, or strapped to the body. Every object rests its weight on something visible.
The person's weight rests on something — feet planted on the floor, hips on the seat, a forearm on the table — and a contact shadow sits exactly where body meets surface.
Anatomy holds: five fingers on each hand with natural joints and believable grip, limbs bending only where real joints bend, both arms belonging to the same body at the same scale, neck and spine consistent with where the head turns. Clothing drapes over the body underneath and follows gravity.
Where the person meets furniture, the two touch at the surface — arm, leg and hand rest on the wood, stone or cloth.

A vehicle or machine in the frame must be a whole working object, not a few of its parts. If a chariot, cart, boat, carriage or engine appears at all, the parts that make it work are visible and joined: the floor the person stands on, the body that floor belongs to, the wheels or hull under that body, the pole or shaft that reaches the animals, and the harness that ties the animals to that pole. Draught animals stand AHEAD of the vehicle in line with its pole. Every rail, wheel and yoke joins the part beside it, and the person stands on a visible floor.

Weapons and tools obey the same law. A blade is held by its grip with the whole hand closed around it, and its weight pulls the wrist and shoulder the way that weight really would. A sheathed weapon hangs from a belt or baldric that visibly carries it. A spear, staff or standard either rests its butt on the ground or is carried at a balance point the arm could actually hold. Straps, buckles and scabbards connect to something. A weapon hangs from its strap or sits in a closed hand, and the fingers close on something solid.`

// 2차 개편 신설 — 「응답하는 사람」과 읽히는 배경이 기록사진을 만들었으므로
// 혼자·죽은 배경을 프레임 수준에서 못 박는다(화보 문법 1·2).
export const STAGE = `STAGE — ONE FIGURE, DEAD BACKGROUND
Exactly one person stands in the frame, and the whole picture belongs to him. His standing is carried by light, metal, material and the look in his eyes.
Behind him the place is reduced to atmosphere: either sunk into darkness so the figure alone catches the light, or dissolved by shallow depth of field into shapes and colours the viewer can only half-name. What lies back there reads as tone and shadow.
Objects that share the frame are his own — made by him, carried by him — set down where he stands.`

// 이 지시가 없으면 인물이 원경으로 작게 박힌다(다리우스 1세 실측, 26.07.31).
// 표시 비율과 폭은 공용 상수가 쥔다. 얼굴과 핵심 소품은 최종 중앙 세로 영역에 들어와야 한다.
// 2차 개편 — 무릎 위 고정 크롭을 풀고 허리~허벅지 크롭으로 올린다. 서비스에서
// 이 사진은 폭 100~240px 카드로 쓰이고, 무릎 위 프레임은 얼굴을 알아볼 수 없게 만든다.
export const FRAMING = `FRAMING — TIGHT PORTRAIT CROP, NON-NEGOTIABLE
This is a portrait of a person, not a landscape that happens to contain a person. On the service it is shown as a card ${CARD_PX}px wide at most, and often smaller — at that size the face must still read.

The final service image is a centered vertical ${FINAL_ASPECT_LABEL} crop of this working canvas. Keep the face, torso, both hands and every essential prop inside the CENTRAL ${SAFE_WIDTH_PERCENT} PERCENT of the canvas width. The outer left and right edges are expendable background and will be removed.

The crop is exactly this and nothing else:
- BOTTOM EDGE of the frame cuts the person anywhere between the WAIST LINE and MID-THIGH.
- TOP EDGE of the frame sits just above the top of the head, with only a small margin of headroom.
- The person fills the frame and the head is large — the face stays recognisable shrunk to card size.

If the person is seated, kneeling or leaning over work so the hips are hidden behind a desk, table or railing, keep the SAME apparent size: the bottom edge still falls at lap or desk height, and the head still nearly touches the top of the frame. Do NOT pull the camera back to reveal the legs — filling the height matters more than seeing them.
Measure the headroom: the crown of the head sits within the TOP 5 PERCENT of the frame height. A seated figure leaning over a desk still reaches that high — bring the camera closer instead of leaving empty wall above them.
If the setting described below is a wide place, move the camera IN CLOSE to the person and let the setting fall away behind them — out of focus or into darkness. The setting stays context behind the person; the person is the subject.`

/**
 * 발주서를 조립한다.
 *
 * @param {{slug: string, brief: string, faceSpec?: string}} row
 * @param {string|null} outPath 저장 경로. 비우면 codex에게 저장을 시키지 않고 세션 폴더에서 회수한다
 *   — 이 환경에서 codex 셸이 즉사해 저장을 시키면 건당 몇 분을 더 태운다(codex-gpt 스킬 실측).
 * @param {{identity?: 'photo'|'illustration'|'described', taskPrefix?: string}} [opts]
 */
export function buildHeroPrompt(row, outPath, opts = {}) {
  const identity = opts.identity ?? 'photo'
  const taskPrefix = opts.taskPrefix ?? 'HEROPHOTO'

  const opening = identity === 'described'
    ? 'Create a tightly framed portrait photograph of the person described below.'
    : 'Create a NEW tightly framed portrait photograph of the person in the attached reference image.'

  const identityBlock = identity === 'photo' ? IDENTITY_PHOTO
    : identity === 'illustration' ? IDENTITY_ILLUSTRATION
      : identityDescribed(row.faceSpec ?? '')

  // 씨앗 방식에서는 나이·체구를 발주서가 정한다. 없으면 REF가 그대로 나이를 결정해 버린다.
  const subject = row.age ? `\n${subjectBlock({ sex: row.sex, age: row.age, build: row.build, lineage: row.lineage })}\n` : ''

  return `TASK-ID: ${taskPrefix}-${row.slug}

${opening}

${identityBlock}
${subject}
${row.brief.trim()}

${GAZE}

${PHYSICALITY}

${STAGE}

${FRAMING}

${RENDERING}

${opts.vertical
    ? `Output a TALL VERTICAL image, ${FINAL_ASPECT_LABEL} (portrait orientation, clearly taller than it is wide).
Fill that tall frame with the person the way the FRAMING block above requires and nothing else: the crown of the head near the very top, the BOTTOM EDGE OF THE PICTURE CUTTING HIM BETWEEN THE WAIST AND MID-THIGH. Fill the height by bringing the camera CLOSER, so the frame ends at his hip and the face carries the picture.`
    : `Output a ${WORK_SIZE} x ${WORK_SIZE} working image. Compose its central ${FINAL_ASPECT_LABEL} safe area as the finished portrait; the pipeline crops away both sides.`}

${outPath
    ? `Generate the image with the image_gen tool, then save the resulting PNG to this exact path using python:\n${outPath.replace(/\\/g, '/')}\nReport only the saved path as your final message.`
    : 'Return the image. Do not run any shell command.'}
`
}
