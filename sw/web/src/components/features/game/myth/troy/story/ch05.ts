/*
  파일명: components/features/game/myth/troy/story/ch05.ts
  기능: 트로이 전쟁 5장 「강의 분노」 이야기(한국어·영어)
  책임: 『일리아스』 18~21권(뒷일은 22권 1~95행)을 따라 싸움 전·중·뒤 장면을 적는다. 장 자료의 사건이 장면 id로 부른다.
        파트로클로스가 살아 있는 길이면 장 자료가 표지를 보고 intro 대신 scenes의 intro-alt를 부른다.
*/ // ------------------------------
import type { ChapterStoryBook, StoryLine } from "./types";

// intro와 intro-alt가 함께 쓰는 뒷부분 — 화해·브리세이스(19권), 강으로 몰아넣기(21권 1~16행)
const KO_MARCH: StoryLine[] = [
  { speaker: null, text: "아킬레우스가 바닷가를 따라 걸으며 크게 외쳐 아카이아 사람들을 불러 모았다." },
  { speaker: "achilles", text: "아트레우스의 아들이여, 여자 하나를 두고 다툰 일은 지난 일로 묻어 둡시다. 내 노여움은 여기서 거두겠소." },
  { speaker: "agamemnon", text: "제우스와 운명과 어둠 속을 걷는 에리니스가 내 눈을 가렸소. 약속한 선물은 모두 드리겠소." },
  { speaker: null, text: "선물과 함께 브리세이스도 아킬레우스의 막사로 돌아왔다." },
  { speaker: null, text: "싸움터로 나선 아킬레우스는 트로이군을 둘로 갈랐다. 절반은 성으로 달아났고, 절반은 스카만드로스 강으로 몰렸다." },
  { speaker: null, text: "트로이 병사들이 불길에 쫓긴 메뚜기 떼처럼 강물로 뛰어들었다." },
];

const EN_MARCH: StoryLine[] = [
  { speaker: null, text: "Achilles strode along the shore, shouting for the Achaeans to gather." },
  { speaker: "achilles", text: "Son of Atreus, all that quarreling over a girl, let it stay in the past. My anger ends here." },
  { speaker: "agamemnon", text: "Zeus, Fate, and the Fury who walks in darkness blinded me. You’ll have every gift I promised." },
  { speaker: null, text: "Along with the gifts, Briseis came back to Achilles’ hut." },
  { speaker: null, text: "Achilles took the field and split the Trojans in two. Half fled toward the city; the rest were driven into the Scamander." },
  { speaker: null, text: "The Trojans leapt into the river like locusts fleeing a grass fire." },
];

export const CH05: ChapterStoryBook = {
  // #region 한국어
  ko: {
    title: "강의 분노",
    source: "『일리아스』 18~21권",
    summary: "아킬레우스가 마침내 싸움터로 돌아온다. 트로이군을 스카만드로스 강으로 몰아넣자, 강의 신이 물을 일으켜 막아선다.",
    objective: "아킬레우스가 스카이아이 문 앞 벌판에 닿는다.",
    loss: "아킬레우스가 쓰러지거나 12차례가 지난다.",
    // 파트로클로스가 죽은 길 — 18권 22~126행, 19권 1~13행
    intro: { id: "intro", lines: [
      { speaker: null, text: "소식을 들은 아킬레우스가 두 손으로 검은 재를 움켜 머리에 뿌렸다. 그러고는 흙바닥에 쓰러져 울었다.", tone: "grief" },
      { speaker: null, text: "바다 깊은 곳에서 테티스가 아들의 울음을 듣고 올라왔다." },
      { speaker: "achilles", text: "어머니, 벗이 죽었습니다. 헥토르를 제 창으로 쓰러뜨리기 전에는 살 까닭이 없습니다.", tone: "grief" },
      { speaker: "thetis", text: "얘야, 네 말대로라면 너도 오래 못 산다. 헥토르가 죽으면 곧 네 차례다.", tone: "grief" },
      { speaker: "achilles", text: "그렇다면 당장 죽겠습니다. 벗이 죽을 때 곁을 지켜 주지 못했으니까요.", tone: "grief" },
      { speaker: null, text: "그날 밤 헤파이스토스가 새 방패와 갑옷을 벼렸다. 새벽에 테티스가 그 무구를 아들 앞에 내려놓았다." },
      ...KO_MARCH,
    ] },
    scenes: [
      // 파트로클로스가 살아 있는 길 — 호메로스와 다른 길. 첫머리만 다르다
      { id: "intro-alt", lines: [
        { speaker: null, text: "호메로스의 노래와 달리, 파트로클로스는 살아서 아킬레우스 곁에 있었다." },
        { speaker: null, text: "벗의 말을 듣고 분노를 거둔 아킬레우스는 날이 밝자 싸움에 나설 채비를 했다." },
        { speaker: "patroclus", text: "가게, 아킬레우스. 모두 자네를 기다리네.", tone: "calm" },
        ...KO_MARCH,
      ] },
      { id: "scamander-speaks", lines: [
        { speaker: null, text: "강의 신 스카만드로스가 사람의 모습으로 깊은 소용돌이에서 솟아올랐다.", tone: "awe" },
        { speaker: "scamander", text: "아킬레우스, 내 고운 물길이 주검으로 막혀 바다로 흐르지 못한다. 죽이려거든 나에게서 몰아내 들판에서 죽여라.", tone: "fierce" },
        { speaker: "achilles", text: "그리하겠소, 스카만드로스. 하지만 트로이군을 성안에 몰아넣고 헥토르와 겨뤄 보기 전에는 멈추지 않겠소.", tone: "fierce" },
        { speaker: null, text: "스카만드로스가 성난 물결을 일으켜 아킬레우스를 덮쳤다." },
      ] },
      { id: "achilles-prays", lines: [
        { speaker: null, text: "물결이 어깨를 내리치고 발밑의 흙을 쓸어 갔다. 아킬레우스가 하늘을 우러러 부르짖었다." },
        { speaker: "achilles", text: "제우스 아버지, 어느 신도 저를 이 강에서 건져 주지 않습니까. 차라리 헥토르 손에 죽는 편이 나았습니다.", tone: "grief" },
        { speaker: null, text: "포세이돈과 아테나가 사람의 모습으로 다가와 아킬레우스의 손을 잡았다." },
        { speaker: "poseidon", text: "펠레우스의 아들아, 떨지도 두려워하지도 마라. 너는 강에 꺾일 운명이 아니다.", tone: "calm" },
        { speaker: null, text: "아테나가 아킬레우스에게 큰 힘을 불어넣었다.", tone: "awe" },
      ] },
      { id: "hephaestus-fire", lines: [
        { speaker: "hera", text: "내 아들 헤파이스토스야, 어서 일어나라. 불길을 일으켜 강가를 태워라.", tone: "fierce" },
        { speaker: null, text: "헤파이스토스의 불이 들판을 말리고 주검을 태웠다. 강가의 느릅나무와 버드나무와 위성류도 불탔다." },
        { speaker: "scamander", text: "헤파이스토스, 어느 신도 그대와 겨룰 수 없소. 이 싸움을 멈추시오.", tone: "grief" },
        { speaker: "scamander", text: "헤라여, 맹세하겠소. 트로이가 온통 불길에 타는 날이 와도 다시는 트로이를 돕지 않겠소.", tone: "grief" },
        { speaker: null, text: "헤라의 말에 헤파이스토스가 불을 거두었다. 강물이 다시 제 물길로 흘렀다." },
      ] },
    ],
    // 21권 595~611행, 22권 1~95행
    outro: { id: "outro", lines: [
      { speaker: null, text: "아폴론이 아게노르의 모습으로 아킬레우스를 들판 멀리 꾀어냈다. 그사이 트로이군은 새끼 사슴처럼 성안으로 달아났다." },
      { speaker: null, text: "헥토르만은 운명에 묶여 스카이아이 문 앞에 남았다." },
      { speaker: "achilles", text: "멀리 쏘는 아폴론이여, 나를 속였소. 내게 힘만 있다면 반드시 갚아 주겠소.", tone: "fierce" },
      { speaker: null, text: "성벽 위에서 늙은 프리아모스가 가장 먼저 아킬레우스를 보았다. 가슴의 청동이 늦여름 밤 가장 밝은 별처럼 빛났다." },
      { speaker: "priam", text: "헥토르야, 저 사람을 혼자 기다리지 마라. 벌써 내 아들을 여럿 죽인 자다.", tone: "grief" },
      { speaker: "priam", text: "성안으로 들어오너라. 트로이의 남자와 여자들을 지켜야 하지 않느냐.", tone: "grief" },
      { speaker: null, text: "헤카베가 울면서 옷섶을 헤치고 젖을 물리던 가슴을 드러냈다." },
      { speaker: "hecuba", text: "헥토르야, 이 가슴을 보고 어미를 불쌍히 여겨라. 성벽 안에서 저자를 막아라.", tone: "grief" },
      { speaker: null, text: "헥토르는 꿈쩍하지 않았다. 굴 앞에서 사람을 기다리는 뱀처럼 아킬레우스를 기다렸다." },
    ] },
    defeat: { id: "defeat", lines: [
      { speaker: null, text: "아킬레우스는 끝내 스카이아이 문 앞에 닿지 못했다." },
      { speaker: "scamander", text: "그자의 힘도 고운 갑옷도 소용없다. 모두 진흙에 덮인 채 물 밑에 잠기리라.", tone: "fierce" },
      { speaker: null, text: "그사이 트로이군은 성안으로 무사히 달아났다." },
    ] },
  },
  // #endregion

  // #region 영어
  en: {
    title: "The River’s Wrath",
    source: "The Iliad, Books 18–21",
    summary: "Achilles returns to battle at last. He drives the Trojans into the Scamander, and the river god rises to stop him.",
    objective: "Bring Achilles to the plain before the Scaean Gates.",
    loss: "Achilles falls, or 12 turns pass.",
    intro: { id: "intro", lines: [
      { speaker: null, text: "At the news, Achilles scooped up black ash in both hands and poured it over his head. Then he threw himself down in the dust and wept.", tone: "grief" },
      { speaker: null, text: "Deep in the sea, Thetis heard her son’s cry and rose to him." },
      { speaker: "achilles", text: "Mother, my friend is dead. I have no reason to live unless Hector dies on my spear.", tone: "grief" },
      { speaker: "thetis", text: "Then your life will be short, my child. Your death waits close behind Hector’s.", tone: "grief" },
      { speaker: "achilles", text: "Then let me die now. I wasn’t there to help my friend when he was killed.", tone: "grief" },
      { speaker: null, text: "That night Hephaestus forged a new shield and armor. At dawn, Thetis laid them before her son." },
      ...EN_MARCH,
    ] },
    scenes: [
      { id: "intro-alt", lines: [
        { speaker: null, text: "Unlike in Homer’s song, Patroclus was alive and at Achilles’ side." },
        { speaker: null, text: "Having listened to his friend and let go of his anger, Achilles made ready for war at daybreak." },
        { speaker: "patroclus", text: "Go on, Achilles. Everyone is waiting for you.", tone: "calm" },
        ...EN_MARCH,
      ] },
      { id: "scamander-speaks", lines: [
        { speaker: null, text: "Scamander, god of the river, rose from a deep eddy in the shape of a man.", tone: "awe" },
        { speaker: "scamander", text: "Achilles, my lovely waters are so choked with corpses they can’t reach the sea. If you must kill, drive them out of me and do it on the plain.", tone: "fierce" },
        { speaker: "achilles", text: "As you wish, Scamander. But I won’t stop killing Trojans until I’ve penned them in their city and faced Hector.", tone: "fierce" },
        { speaker: null, text: "Scamander raised a furious wave and brought it crashing down on Achilles." },
      ] },
      { id: "achilles-prays", lines: [
        { speaker: null, text: "The flood pounded his shoulders and tore the ground from under his feet. Achilles looked to the sky and cried out." },
        { speaker: "achilles", text: "Father Zeus, will no god pity me and save me from this river? Better to have died at Hector’s hands.", tone: "grief" },
        { speaker: null, text: "Poseidon and Athena came to him in human form and took his hands in theirs." },
        { speaker: "poseidon", text: "Son of Peleus, don’t tremble, don’t be afraid. You are not fated to be beaten by a river.", tone: "calm" },
        { speaker: null, text: "Athena filled Achilles with great strength.", tone: "awe" },
      ] },
      { id: "hephaestus-fire", lines: [
        { speaker: "hera", text: "Up, Hephaestus, my son! Kindle your fire and burn the riverbanks.", tone: "fierce" },
        { speaker: null, text: "His fire swept the plain and burned the dead. The elms, willows, and tamarisks along the banks went up in flames." },
        { speaker: "scamander", text: "Hephaestus, no god can stand against you. End this fight.", tone: "grief" },
        { speaker: "scamander", text: "Hera, I swear it: I will never help the Trojans again, not even on the day all Troy burns.", tone: "grief" },
        { speaker: null, text: "At Hera’s word, Hephaestus called back his fire, and the river ran in its own bed once more." },
      ] },
    ],
    outro: { id: "outro", lines: [
      { speaker: null, text: "Disguised as Agenor, Apollo lured Achilles far across the plain. Meanwhile the Trojans fled into the city like frightened fawns." },
      { speaker: null, text: "Only Hector stayed outside the Scaean Gates, held there by fate." },
      { speaker: "achilles", text: "You tricked me, Apollo. If I had the power, I’d make you pay for it.", tone: "fierce" },
      { speaker: null, text: "From the wall, old Priam was the first to see Achilles coming. The bronze on his chest blazed like the brightest star of late summer." },
      { speaker: "priam", text: "Hector, my son, don’t face that man alone. He has already killed so many of my sons.", tone: "grief" },
      { speaker: "priam", text: "Come inside the walls. Save the men and women of Troy.", tone: "grief" },
      { speaker: null, text: "Weeping, Hecuba loosened her robe and bared the breast that had nursed him." },
      { speaker: "hecuba", text: "Hector, my child, look at this and pity your mother. Fight him from behind the walls.", tone: "grief" },
      { speaker: null, text: "Hector would not move. He waited for Achilles like a snake coiled at the mouth of its den." },
    ] },
    defeat: { id: "defeat", lines: [
      { speaker: null, text: "Achilles never reached the Scaean Gates." },
      { speaker: "scamander", text: "His strength won’t save him, nor that fine armor. It will all lie deep in my waters, buried in mud.", tone: "fierce" },
      { speaker: null, text: "Meanwhile the Trojans made it safely inside their walls." },
    ] },
  },
  // #endregion
};
