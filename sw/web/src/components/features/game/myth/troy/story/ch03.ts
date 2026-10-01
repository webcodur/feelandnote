/*
  파일명: components/features/game/myth/troy/story/ch03.ts
  기능: 트로이 전쟁 3장 「함선 앞에서」 이야기
  책임: 배 앞 방벽을 지키는 버티기 싸움의 대화와 서술을 한국어·영어로 쥔다. 장면 id는 장 자료(campaign/ch03)가 부른다.
        출전: 『일리아스』 11~15권, 16권 1~129행. 누가 헥토르를 치든·어느 배가 먼저 타든 맞게 쓴다.
*/ // ------------------------------
import type { ChapterStory, ChapterStoryBook } from "./types";

// #region 한국어
const KO: ChapterStory = {
  title: "함선 앞에서",
  source: "『일리아스』 11~16권",
  summary: "아킬레우스 없는 그리스군이 배 앞 방벽까지 밀렸다. 대 아이아스가 앞장서 배를 지킨다.",
  objective: "8차례를 버틴다.",
  loss: "대 아이아스가 쓰러지거나 배 세 척이 불탄다.",
  // 11권(아가멤논·디오메데스·오디세우스·마카온이 다침, 네스토르의 한탄), 12.50~107(도랑과 폴리다마스의 말), 12.397~399, 14.379~382, 15.504~505
  intro: { id: "intro", lines: [
    { speaker: null, text: "새벽, 아가멤논이 앞장서 트로이군을 몰아붙였다. 그러나 팔을 창에 찔려 물러났다." },
    { speaker: null, text: "파리스의 화살이 디오메데스의 오른발을 꿰뚫었다. 오디세우스는 옆구리를 찔렸다." },
    { speaker: null, text: "마카온도 파리스의 화살에 어깨를 맞았다. 그리스군은 배 앞 방벽 뒤로 물러났다." },
    { speaker: "nestor", text: "가장 뛰어난 이들이 다쳐서 배 곁에 누웠네. 아킬레우스는 이걸 보고도 가만있는가.", tone: "grief" },
    { speaker: null, text: "트로이군이 도랑 앞에 이르렀다. 도랑은 깊었고 날카로운 말뚝이 촘촘히 박혀 있었다." },
    { speaker: "polydamas", text: "헥토르, 전차로는 이 도랑을 못 건너네. 말은 여기 두고 걸어서 넘어가세.", tone: "cunning" },
    { speaker: null, text: "헥토르가 그 말을 따랐다. 트로이군은 전차에서 내려 다섯 무리로 나뉘어 방벽으로 몰려왔다." },
    { speaker: null, text: "사르페돈이 방벽 위 흉벽을 두 손으로 잡아 뜯었다. 여럿이 넘어갈 길이 열렸다." },
    { speaker: null, text: "다친 디오메데스와 오디세우스, 아가멤논도 배 곁에서 다시 군사를 세웠다." },
    { speaker: null, text: "아킬레우스는 여전히 막사에서 나오지 않았다." },
    { speaker: "ajax-the-great", text: "배를 잃으면 걸어서 집에 갈 텐가? 여기서 버틴다!", tone: "fierce" },
  ] },
  scenes: [
    // 시작. 12.445~471(끝이 뾰족한 돌, 부서진 문, 밤 같은 얼굴), 12.440~441(배에 불을)
    { id: "wall-broken", lines: [
      { speaker: null, text: "헥토르가 끝이 뾰족한 큰 돌을 들어 올렸다. 제우스가 그 돌을 가볍게 해 주었다.", tone: "awe" },
      { speaker: null, text: "돌이 문 한가운데를 때렸다. 빗장이 부러지고 문짝이 떨어져 나갔다." },
      { speaker: null, text: "헥토르가 한밤처럼 어두운 얼굴로 뛰어들었다. 두 눈에서 불이 번쩍였다.", tone: "fierce" },
      { speaker: "hector", text: "트로이 사람들아, 방벽을 넘어라! 배에 불을 던져라!", tone: "fierce" },
    ] },
    // 3차례. 13.43~80(칼카스로 꾸민 포세이돈, 지팡이, 소 아이아스가 걸음걸이로 알아봄, 대 아이아스의 대답)
    { id: "poseidon-aid", lines: [
      { speaker: null, text: "포세이돈이 칼카스의 모습을 하고 두 아이아스 앞에 섰다.", tone: "awe" },
      { speaker: "poseidon", text: "두 아이아스여, 너희가 버티면 아카이아군이 산다. 헥토르가 불길처럼 날뛰는 이곳이 가장 두렵구나.", tone: "fierce" },
      { speaker: null, text: "포세이돈이 지팡이로 두 사람을 치자 팔다리가 가벼워졌다. 신은 매처럼 날아올랐다.", tone: "awe" },
      { speaker: null, text: "소 아이아스가 떠나는 걸음걸이를 보고 먼저 알아챘다. 칼카스가 아니라 신이었다." },
      { speaker: "ajax-the-great", text: "나도 창 쥔 손이 근질거리네. 헥토르와 혼자라도 붙어 보고 싶군.", tone: "fierce" },
    ] },
    // 5차례. 14.188~223(아프로디테의 띠), 14.231~353(힙노스, 이다산, 황금 구름), 14.354~387(포세이돈이 드러내 놓고 이끎)
    { id: "hera-zeus", lines: [
      { speaker: null, text: "헤라가 아프로디테에게서 사랑과 그리움, 달콤한 꾐이 깃든 띠를 빌려 가슴에 품었다." },
      { speaker: null, text: "헤라는 잠의 신 힙노스를 데리고 이다산 꼭대기로 제우스를 찾아갔다." },
      { speaker: null, text: "제우스는 헤라를 품에 안고 황금 구름 속에서 잠들었다.", tone: "awe" },
      { speaker: null, text: "힙노스가 포세이돈에게 달려가 알렸다. 바다의 신은 이제 드러내 놓고 그리스군을 이끌었다." },
      { speaker: "poseidon", text: "또 헥토르에게 배를 내주겠느냐? 가장 좋은 방패를 들고 나를 따르라!", tone: "fierce" },
    ] },
    // 헥토르가 물러날 때. 14.408~441 — 원전에서도 물러서던 헥토르가 배를 괴던 돌에 맞는다. 병사의 외침은 이음 대사
    { id: "hector-struck", lines: [
      { speaker: null, text: "대 아이아스가 배를 괴던 돌 하나를 들어, 물러서는 맞수 헥토르의 가슴을 쳤다." },
      { speaker: null, text: "헥토르는 팽이처럼 돌다가 벼락 맞은 참나무처럼 쓰러졌다. 창이 손에서 떨어졌다.", tone: "awe" },
      { speaker: "trojan-soldier", text: "헥토르가 쓰러졌다! 방패로 가려라!", tone: "fierce" },
      { speaker: null, text: "동료들이 헥토르를 싸움터 밖으로 실어 냈다. 스카만드로스 강여울에서 물을 끼얹자 검은 피를 토하고 다시 까무러쳤다.", tone: "grief" },
      { speaker: null, text: "헥토르가 실려 가자 그리스군이 더 거세게 몰아붙였다." },
    ] },
    // 7차례. 15.4~13(깨어난 제우스), 15.157~262(포세이돈을 물리고 아폴론을 보냄), 15.263~268(고삐 끊은 말), 15.355~366(모래성)
    { id: "apollo-revives", lines: [
      { speaker: null, text: "제우스가 깨어났다. 트로이군이 쫓기는 것을 보고 크게 노했다.", tone: "awe" },
      { speaker: null, text: "제우스는 포세이돈을 싸움에서 물러나게 하고 아폴론을 헥토르에게 보냈다." },
      { speaker: "apollo", text: "헥토르, 기운을 내라. 내가 앞장서 배까지 길을 닦아 주겠다.", tone: "fierce" },
      { speaker: null, text: "마구간에 매인 말이 고삐를 끊고 들판을 내달리듯, 헥토르가 달려 나갔다.", tone: "fierce" },
      { speaker: null, text: "아폴론이 도랑 둑을 발로 허물어 길을 냈다. 바닷가에서 아이가 모래성을 흩뜨리듯 방벽을 무너뜨렸다.", tone: "awe" },
    ] },
    // 처음 배가 탈 때. 15.674~746(배 싸움 장대, 이 배 저 배로 건너뜀, 「더 튼튼한 방벽이 있느냐」). 첫 줄은 판 사건을 잇는 서술
    { id: "ship-fire", lines: [
      { speaker: null, text: "트로이군이 던진 불이 배 한 척에 옮겨붙었다." },
      { speaker: null, text: "대 아이아스가 배 싸움에 쓰는 긴 장대를 들고 이 배 저 배 갑판을 성큼성큼 건너뛰었다." },
      { speaker: "ajax-the-great", text: "우리 뒤에 도와줄 군사가 있느냐, 더 튼튼한 방벽이 있느냐? 살길은 우리 손에 있다!", tone: "fierce" },
      { speaker: null, text: "아이아스는 불을 들고 배로 다가오는 트로이 병사를 장대로 찔러 떨어뜨렸다." },
    ] },
  ],
  // 16.1~100(샘물 같은 눈물, 어린 여자아이, 갑옷을 빌려 달라는 청, 「곧장 돌아오라·성벽까지 쫓지 마라」), 16.114~129(창끝이 잘리고 배가 탐)
  outro: { id: "outro", lines: [
    { speaker: null, text: "그리스군은 배 앞에서 버티고 또 버텼다. 그래도 트로이군은 물러날 기색이 없었다." },
    { speaker: null, text: "파트로클로스가 바위를 타고 흐르는 검은 샘물처럼 눈물을 쏟으며 아킬레우스를 찾아갔다.", tone: "grief" },
    { speaker: "achilles", text: "왜 우느냐, 파트로클로스? 엄마 옷자락을 붙잡고 안아 달라 조르는 어린 여자아이 같구나.", tone: "calm" },
    { speaker: "patroclus", text: "가장 뛰어난 이들이 다 다쳐서 배 곁에 누웠어. 너는 어쩌면 그렇게 모질어?", tone: "grief" },
    { speaker: "patroclus", text: "싸우지 않을 거면 나를 보내 줘. 네 갑옷을 빌려주면 트로이군이 나를 너로 알고 물러설 거야.", tone: "grief" },
    { speaker: null, text: "파트로클로스는 제 죽음을 청하는 줄 몰랐다.", tone: "grief" },
    { speaker: "achilles", text: "좋다, 내 갑옷을 입고 미르미돈을 이끌어라. 배에서 적을 몰아내면 곧장 돌아와.", tone: "calm" },
    { speaker: "achilles", text: "성벽까지 쫓지 마라. 아폴론이 트로이를 아끼니 어느 신이 끼어들지 모른다.", tone: "calm" },
    { speaker: null, text: "그때 헥토르가 대 아이아스의 창끝을 칼로 베어 냈다. 배 한 척에 불길이 치솟았다." },
    { speaker: "achilles", text: "일어나라, 파트로클로스! 배에 불이 붙었다.", tone: "fierce" },
  ] },
  defeat: { id: "defeat", lines: [
    { speaker: null, text: "그리스군이 배 앞에서 무너졌다. 트로이군이 불을 들고 함대로 몰려들었다." },
    { speaker: "nestor", text: "배를 잃으면 돌아갈 길도 없네. 다시 모여 버티세!", tone: "grief" },
  ] },
};
// #endregion

// #region English
const EN: ChapterStory = {
  title: "Before the Ships",
  source: "Iliad, Books 11–16",
  summary: "Without Achilles, the Greeks have been driven back to the wall before their ships. Ajax the Great must hold the line.",
  objective: "Hold out for 8 turns.",
  loss: "Ajax the Great falls, or three ships burn.",
  intro: { id: "intro", lines: [
    { speaker: null, text: "At dawn Agamemnon led the charge and drove the Trojans back. Then a spear pierced his arm, and he had to withdraw." },
    { speaker: null, text: "An arrow from Paris went clean through Diomedes's right foot. Odysseus took a spear in the side." },
    { speaker: null, text: "Paris struck Machaon in the shoulder, too. The Greeks fell back behind the wall that guarded their ships." },
    { speaker: "nestor", text: "Our best men lie wounded by the ships. Can Achilles see this and do nothing?", tone: "grief" },
    { speaker: null, text: "The Trojans reached the trench. It was deep, and bristling with sharp stakes." },
    { speaker: "polydamas", text: "Hector, chariots will never cross this. Leave the horses here, and we'll go over on foot.", tone: "cunning" },
    { speaker: null, text: "Hector took his advice. The Trojans left their chariots and came at the wall in five columns." },
    { speaker: null, text: "Sarpedon grabbed the battlements with both hands and tore them down, opening a way over the wall." },
    { speaker: null, text: "Wounded as they were, Diomedes, Odysseus, and Agamemnon rallied the troops by the ships." },
    { speaker: null, text: "Achilles still did not leave his hut." },
    { speaker: "ajax-the-great", text: "If Hector takes the ships, are you planning to walk home? We hold here!", tone: "fierce" },
  ] },
  scenes: [
    { id: "wall-broken", lines: [
      { speaker: null, text: "Hector heaved up a huge stone, broad at the base and sharp at the tip. Zeus made it light in his hands.", tone: "awe" },
      { speaker: null, text: "It struck the gates dead center. The bars snapped and the doors burst apart." },
      { speaker: null, text: "Hector sprang through, his face dark as sudden night, fire flashing in his eyes.", tone: "fierce" },
      { speaker: "hector", text: "Trojans, over the wall! Throw fire on the ships!", tone: "fierce" },
    ] },
    { id: "poseidon-aid", lines: [
      { speaker: null, text: "Poseidon took on the shape of Calchas and stood before the two Ajaxes.", tone: "awe" },
      { speaker: "poseidon", text: "You two can save the Achaean army if you hold. It is here I fear most, where Hector rages like fire.", tone: "fierce" },
      { speaker: null, text: "He struck them both with his staff, and their limbs grew light. Then he darted away like a hawk.", tone: "awe" },
      { speaker: null, text: "Ajax the Lesser caught the way he walked as he left and knew at once: that was no Calchas, but a god." },
      { speaker: "ajax-the-great", text: "My hands are itching on my spear too. I'd take on Hector alone.", tone: "fierce" },
    ] },
    { id: "hera-zeus", lines: [
      { speaker: null, text: "Hera borrowed from Aphrodite the embroidered band that holds love, longing, and sweet persuasion, and tucked it at her breast." },
      { speaker: null, text: "Bringing Hypnos, the god of sleep, she climbed to the peak of Ida to find Zeus." },
      { speaker: null, text: "Zeus took Hera in his arms and fell asleep inside a golden cloud.", tone: "awe" },
      { speaker: null, text: "Hypnos raced to tell Poseidon. Now the sea god led the Greeks openly." },
      { speaker: "poseidon", text: "Will you hand Hector the ships again? Take up the best shields and follow me!", tone: "fierce" },
    ] },
    { id: "hector-struck", lines: [
      { speaker: null, text: "As Hector drew back, his rival Ajax the Great hefted a stone used to prop the ships and struck him in the chest." },
      { speaker: null, text: "Hector spun like a top and went down like an oak struck by lightning. The spear fell from his hand.", tone: "awe" },
      { speaker: "trojan-soldier", text: "Hector's down! Shields over him!", tone: "fierce" },
      { speaker: null, text: "His comrades carried him off. At the Scamander ford they splashed water on him; he coughed up dark blood and passed out again.", tone: "grief" },
      { speaker: null, text: "With Hector gone, the Greeks pressed the Trojans harder than ever." },
    ] },
    { id: "apollo-revives", lines: [
      { speaker: null, text: "Zeus woke. When he saw the Trojans in flight, his anger flared.", tone: "awe" },
      { speaker: null, text: "He ordered Poseidon out of the fighting and sent Apollo down to Hector." },
      { speaker: "apollo", text: "Take heart, Hector. I will go ahead of you and clear the way to the ships.", tone: "fierce" },
      { speaker: null, text: "Like a stabled horse that snaps its tether and gallops across the plain, Hector charged.", tone: "fierce" },
      { speaker: null, text: "Apollo kicked in the trench banks to make a road, then flattened the wall like a child kicking over a sandcastle.", tone: "awe" },
    ] },
    { id: "ship-fire", lines: [
      { speaker: null, text: "Trojan fire caught hold of a ship." },
      { speaker: null, text: "Ajax the Great took up a long boarding pike and strode from deck to deck, leaping from ship to ship." },
      { speaker: "ajax-the-great", text: "Are there fresh troops behind us, or a stronger wall? Our only hope is in our own hands!", tone: "fierce" },
      { speaker: null, text: "Any Trojan who came at the ships with fire, Ajax speared and sent tumbling." },
    ] },
  ],
  outro: { id: "outro", lines: [
    { speaker: null, text: "The Greeks held at the ships, and held again. But the Trojans showed no sign of pulling back." },
    { speaker: null, text: "Patroclus went to Achilles in tears, weeping like a dark spring spilling down a sheer rock.", tone: "grief" },
    { speaker: "achilles", text: "Why the tears, Patroclus? You're like a little girl tugging at her mother's dress, begging to be picked up.", tone: "calm" },
    { speaker: "patroclus", text: "Our best men lie wounded by the ships. How can you be so hard?", tone: "grief" },
    { speaker: "patroclus", text: "If you won't fight, send me. Lend me your armor, and the Trojans may take me for you and fall back.", tone: "grief" },
    { speaker: null, text: "He did not know he was begging for his own death.", tone: "grief" },
    { speaker: "achilles", text: "All right, wear my armor and lead the Myrmidons. But once you drive them from the ships, come straight back.", tone: "calm" },
    { speaker: "achilles", text: "Don't chase them to the walls. Apollo loves Troy, and some god may step in.", tone: "calm" },
    { speaker: null, text: "Just then Hector hacked the point off Ajax's spear with his sword, and flames leapt up from a ship." },
    { speaker: "achilles", text: "Up, Patroclus! The ships are on fire!", tone: "fierce" },
  ] },
  defeat: { id: "defeat", lines: [
    { speaker: null, text: "The Greeks broke at the ships, and the Trojans swarmed the fleet with fire." },
    { speaker: "nestor", text: "Lose the ships and there's no way home. Rally, and hold!", tone: "grief" },
  ] },
};
// #endregion

export const CH03: ChapterStoryBook = { ko: KO, en: EN };
