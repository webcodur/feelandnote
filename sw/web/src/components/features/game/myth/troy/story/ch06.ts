/*
  파일명: components/features/game/myth/troy/story/ch06.ts
  기능: 트로이 전쟁 6장 「헥토르」 이야기(한국어·영어)
  책임: 『일리아스』 22권과 24권 요약을 따라 싸움 전·중·뒤 장면을 적는다. 장 자료의 사건이 장면 id로 부른다.
        파트로클로스가 산 길과 죽은 길 모두에 쓰도록 파트로클로스의 죽음은 말하지 않는다.
*/ // ------------------------------
import type { ChapterStoryBook } from "./types";

export const CH06: ChapterStoryBook = {
  // #region 한국어
  ko: {
    title: "헥토르",
    source: "『일리아스』 22·24권",
    summary: "스카이아이 문 앞에 헥토르만 홀로 남는다. 이제 두 맞수, 아킬레우스와 헥토르의 싸움이다.",
    objective: "헥토르를 쓰러뜨린다.",
    loss: "아킬레우스가 쓰러진다.",
    // 22권 97~135행
    intro: { id: "intro", lines: [
      { speaker: null, text: "헥토르가 망대에 빛나는 방패를 기대 두고 홀로 속을 끓였다." },
      { speaker: "hector", text: "성안으로 들어가면 폴리다마스가 가장 먼저 나를 나무라겠지. 아킬레우스가 다시 일어선 그 밤, 군대를 성으로 물리자고 했으니까.", tone: "grief" },
      { speaker: "hector", text: "그 말을 들었어야 했다. 내 고집으로 군대를 잃었으니 트로이 사람들을 볼 낯이 없다.", tone: "grief" },
      { speaker: "hector", text: "나보다 못한 자들이 말하겠지. 「헥토르가 제 힘만 믿다가 군대를 망쳤다」고.", tone: "grief" },
      { speaker: "hector", text: "차라리 아킬레우스와 맞붙자. 이겨서 돌아가든, 성 앞에서 떳떳하게 죽든.", tone: "fierce" },
      { speaker: "hector", text: "아니면 방패와 투구를 내려놓고 저자를 찾아가 볼까. 헬레네도, 파리스가 배에 싣고 온 보물도 모두 돌려주겠다고.", tone: "calm" },
      { speaker: "hector", text: "아니다, 저자는 나를 불쌍히 여기지 않는다. 무기를 내려놓으면 여자처럼 맨몸으로 베일 뿐이다.", tone: "grief" },
      { speaker: "hector", text: "어서 싸우자. 올림포스의 신이 누구에게 영광을 줄지 보자.", tone: "fierce" },
      { speaker: null, text: "아킬레우스가 다가왔다. 오른쪽 어깨 위로 펠리온의 물푸레나무 창을 무섭게 휘둘렀다." },
      { speaker: null, text: "몸을 두른 청동이 타오르는 불처럼, 떠오르는 해처럼 번쩍였다.", tone: "awe" },
    ] },
    scenes: [
      { id: "chase", lines: [
        { speaker: null, text: "헥토르는 아킬레우스를 보자 몸이 떨려 더 버티지 못했다. 성문을 뒤로하고 달아나자 아킬레우스가 매처럼 뒤쫓았다." },
        { speaker: null, text: "둘은 망루와 바람 부는 무화과나무를 지나, 스카만드로스가 솟는 두 샘에 이르렀다." },
        { speaker: null, text: "한 샘에서는 연기처럼 김이 오르고, 다른 샘은 여름에도 얼음처럼 찼다." },
        { speaker: null, text: "샘 곁에는 전쟁 전에 트로이 여인들이 빨래하던 돌 빨래터가 있었다. 둘은 그 앞을 스쳐 달렸다." },
        { speaker: null, text: "상으로 소 한 마리를 건 달리기가 아니었다. 말을 길들이는 헥토르의 목숨을 건 달리기였다." },
      ] },
      { id: "scales", lines: [
        { speaker: "zeus", text: "아, 내가 아끼는 사람이 성벽을 돌며 쫓기는구나. 헥토르를 보니 마음이 아프다.", tone: "grief" },
        { speaker: null, text: "네 번째로 두 샘에 이르렀을 때, 제우스가 황금 저울을 들어 올렸다." },
        { speaker: null, text: "제우스는 아킬레우스와 헥토르의 죽음을 저울에 하나씩 올리고 가운데를 쥐어 들었다.", tone: "awe" },
        { speaker: null, text: "헥토르 쪽 접시가 하데스를 향해 내려앉았다. 포이보스 아폴론이 헥토르를 떠났다.", tone: "grief" },
      ] },
      { id: "athena-deceives", lines: [
        { speaker: null, text: "아테나가 데이포보스의 모습과 목소리를 빌려 헥토르 곁에 섰다." },
        { speaker: "athena", text: "형님, 아킬레우스가 몹시 몰아붙이는군요. 여기 버티고 서서 함께 막아 냅시다.", tone: "cunning" },
        { speaker: "hector", text: "데이포보스, 다들 성안에 숨었는데 너만 나를 위해 나와 주었구나." },
        { speaker: null, text: "헥토르가 아우에게 긴 창을 달라고 외치며 돌아보았다. 곁에는 아무도 없었다." },
        { speaker: "hector", text: "아테나가 나를 속였구나. 그래도 싸우지도 않고 이름 없이 죽지는 않겠다.", tone: "grief" },
      ] },
      { id: "hector-falls", lines: [
        { speaker: "hector", text: "네 무릎과 부모를 걸고 빈다. 내 주검을 개들에게 던지지 말고 집으로 돌려보내 다오.", tone: "grief" },
        { speaker: "achilles", text: "개 같은 놈, 무릎이니 부모니 들먹이지 마라. 네 몸무게만큼 황금을 달아 와도 너는 개와 새의 밥이 된다.", tone: "fierce" },
        { speaker: "hector", text: "네 마음이 무쇠인 줄 알았다. 하지만 파리스와 아폴론이 스카이아이 문에서 너를 죽이리라." },
        { speaker: null, text: "말을 마치자 죽음이 헥토르를 덮었다. 넋이 젊음과 힘을 뒤로한 채 제 운명을 슬퍼하며 하데스로 날아갔다.", tone: "grief" },
        { speaker: "achilles", text: "죽어라. 내 죽음은 제우스와 다른 신들이 보내는 날 받겠다.", tone: "calm" },
      ] },
    ],
    // 22권 395~476행, 24권 요약. 끝 줄은 24권 804행
    outro: { id: "outro", lines: [
      { speaker: null, text: "아킬레우스가 헥토르의 주검을 전차 뒤에 매달아 배로 끌고 갔다. 한때 곱던 머리가 흙먼지에 뒤덮였다." },
      { speaker: null, text: "성벽 위에서 헤카베가 머리칼을 쥐어뜯고 프리아모스가 울부짖었다. 안드로마케는 그 모습을 보고 정신을 잃었다.", tone: "grief" },
      { speaker: null, text: "열이틀이 지나 제우스가 뜻을 정했다. 프리아모스가 몸값을 수레에 싣고 밤길을 나섰다." },
      { speaker: null, text: "헤르메스가 길을 이끌었다. 파수꾼들을 잠재우고 프리아모스를 아킬레우스의 막사로 들였다." },
      { speaker: null, text: "프리아모스가 아킬레우스의 무릎을 끌어안고, 아들들을 죽인 그 무서운 손에 입을 맞추었다." },
      { speaker: "priam", text: "나처럼 늙은 그대 아버지를 생각하시오. 나는 세상 누구도 겪지 못한 일을 겪고 있소.", tone: "grief" },
      { speaker: null, text: "두 사람은 함께 울었다. 프리아모스는 헥토르를, 아킬레우스는 제 아버지를 생각했다.", tone: "grief" },
      { speaker: "achilles", text: "노인장, 앉으시오. 신들은 가엾은 사람들이 괴로움 속에 살도록 운명을 지어 놓았소.", tone: "calm" },
      { speaker: null, text: "아킬레우스는 트로이가 헥토르를 묻을 수 있도록 열하루 동안 싸움을 멈추겠다고 약속했다." },
      { speaker: "helen-of-troy", text: "헥토르, 이 성에 온 뒤로 당신에게서 모진 말 한마디 들은 적이 없어요.", tone: "grief" },
      { speaker: null, text: "트로이 사람들은 아흐레 동안 장작을 모았다. 열흘째 새벽, 헥토르를 불에 올렸다." },
      { speaker: null, text: "이렇게 트로이 사람들은 말을 길들이는 헥토르의 장례를 치렀다.", tone: "grief" },
    ] },
    defeat: { id: "defeat", lines: [
      { speaker: null, text: "아킬레우스가 쓰러졌다." },
      { speaker: "hector", text: "네가 죽었으니 트로이의 싸움도 한결 가벼워지겠구나. 너야말로 우리에게 가장 큰 재앙이었다.", tone: "fierce" },
      { speaker: null, text: "호메로스가 노래한 싸움은 이렇게 끝나지 않았다." },
    ] },
  },
  // #endregion

  // #region 영어
  en: {
    title: "Hector",
    source: "The Iliad, Books 22 and 24",
    summary: "Hector stands alone before the Scaean Gates. It comes down to two rivals: Achilles and Hector.",
    objective: "Defeat Hector.",
    loss: "Achilles falls.",
    intro: { id: "intro", lines: [
      { speaker: null, text: "Hector leaned his shining shield against a jutting tower and brooded alone." },
      { speaker: "hector", text: "If I go inside, Polydamas will be the first to shame me. He told me to lead the army back that night Achilles rose again.", tone: "grief" },
      { speaker: "hector", text: "I should have listened. My stubbornness cost us the army, and I can’t face the people of Troy.", tone: "grief" },
      { speaker: "hector", text: "Some lesser man will say, “Hector trusted his own strength and ruined us all.”", tone: "grief" },
      { speaker: "hector", text: "Better to face Achilles. Kill him and go home, or die with honor before the city.", tone: "fierce" },
      { speaker: "hector", text: "Or should I lay down my shield and helmet and go to him? Offer him Helen and all the treasure Paris brought?", tone: "calm" },
      { speaker: "hector", text: "No, he’d show me no pity. If I came to him unarmed, he’d cut me down like a woman.", tone: "grief" },
      { speaker: "hector", text: "Better to fight now. Let’s see which of us the Olympian gives the glory to.", tone: "fierce" },
      { speaker: null, text: "Achilles drew near, brandishing the dread Pelian ash spear above his right shoulder." },
      { speaker: null, text: "The bronze around him flashed like blazing fire, like the rising sun.", tone: "awe" },
    ] },
    scenes: [
      { id: "chase", lines: [
        { speaker: null, text: "At the sight of him, Hector’s nerve broke. He left the gates behind and ran, and Achilles swooped after him like a hawk." },
        { speaker: null, text: "They raced past the lookout and the windswept fig tree to the two springs where the Scamander rises." },
        { speaker: null, text: "One spring steams like smoke from a fire; the other runs cold as ice even in summer." },
        { speaker: null, text: "Beside them stood the stone troughs where Trojan women washed their clothes before the war. The two men ran straight past." },
        { speaker: null, text: "No ox or oxhide was the prize of this race. They ran for the life of Hector, tamer of horses." },
      ] },
      { id: "scales", lines: [
        { speaker: "zeus", text: "Ah, a man I love, hunted around the walls. My heart grieves for Hector.", tone: "grief" },
        { speaker: null, text: "When they reached the springs for the fourth time, Zeus lifted his golden scales." },
        { speaker: null, text: "He set two fates of death in the pans, one for Achilles and one for Hector, and held the beam by the middle.", tone: "awe" },
        { speaker: null, text: "Hector’s pan sank down toward Hades. And Phoebus Apollo left him.", tone: "grief" },
      ] },
      { id: "athena-deceives", lines: [
        { speaker: null, text: "Athena took on the shape and voice of Deiphobus and came to stand beside Hector." },
        { speaker: "athena", text: "Brother, Achilles is running you ragged. Let’s stand our ground here and fight him off together.", tone: "cunning" },
        { speaker: "hector", text: "Deiphobus! Everyone else stayed behind the walls, but you came out for me." },
        { speaker: null, text: "Hector turned and called to his brother for a long spear. There was no one there." },
        { speaker: "hector", text: "Athena tricked me. So be it, but I won’t die without a fight, or without glory.", tone: "grief" },
      ] },
      { id: "hector-falls", lines: [
        { speaker: "hector", text: "I beg you by your knees and your parents: don’t feed me to the dogs by your ships. Give my body back to my people.", tone: "grief" },
        { speaker: "achilles", text: "Don’t beg me by knees or parents, you dog. Even if Priam paid your weight in gold, the dogs and birds will have you.", tone: "fierce" },
        { speaker: "hector", text: "I knew your heart was iron. But Paris and Apollo will kill you at the Scaean Gates." },
        { speaker: null, text: "As he spoke, death closed over him. His soul flew down to Hades, mourning its fate, leaving youth and strength behind.", tone: "grief" },
        { speaker: "achilles", text: "Die. I’ll accept my own death whenever Zeus and the other gods choose to send it.", tone: "calm" },
      ] },
    ],
    outro: { id: "outro", lines: [
      { speaker: null, text: "Achilles tied Hector’s body behind his chariot and dragged it to the ships. The head that had been so handsome trailed in the dust." },
      { speaker: null, text: "On the walls, Hecuba tore her hair and Priam cried aloud. Andromache saw it and fainted.", tone: "grief" },
      { speaker: null, text: "Twelve days later, Zeus made his will known. Priam loaded a wagon with ransom and set out as night fell." },
      { speaker: null, text: "Hermes guided him. He put the sentries to sleep and brought Priam into the hut of Achilles." },
      { speaker: null, text: "Priam clasped Achilles’ knees and kissed the terrible hands that had killed so many of his sons." },
      { speaker: "priam", text: "Remember your father, Achilles, an old man like me. I have borne what no man on earth has ever borne.", tone: "grief" },
      { speaker: null, text: "The two men wept together, Priam for Hector and Achilles for his own father.", tone: "grief" },
      { speaker: "achilles", text: "Sit, old man. The gods have spun this fate for wretched mortals: to live in pain.", tone: "calm" },
      { speaker: null, text: "Achilles promised to hold off the war for eleven days while Troy buried its son." },
      { speaker: "helen-of-troy", text: "Hector, in all my years in this city, I never once heard a harsh word from you.", tone: "grief" },
      { speaker: null, text: "For nine days the Trojans gathered wood. At dawn on the tenth, they laid Hector on the pyre." },
      { speaker: null, text: "Such was the funeral of Hector, tamer of horses.", tone: "grief" },
    ] },
    defeat: { id: "defeat", lines: [
      { speaker: null, text: "Achilles fell." },
      { speaker: "hector", text: "With you dead, the war will go easier for Troy. You were our greatest curse.", tone: "fierce" },
      { speaker: null, text: "That is not how Homer’s song ends." },
    ] },
  },
  // #endregion
};
