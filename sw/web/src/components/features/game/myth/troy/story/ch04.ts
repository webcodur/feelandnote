/*
  파일명: components/features/game/myth/troy/story/ch04.ts
  기능: 트로이 전쟁 4장 「파트로클로스」 이야기(한국어·영어)
  책임: 『일리아스』 16권(뒷일은 17~18권)을 따라 싸움 전·중·뒤 장면을 적는다. 장 자료의 사건이 장면 id로 부른다.
        파트로클로스가 죽은 채 이기면 outro, 살아서 이기면 outroAlt(호메로스와 다른 길)를 쓴다.
*/ // ------------------------------
import type { ChapterStoryBook } from "./types";

export const CH04: ChapterStoryBook = {
  // #region 한국어
  ko: {
    title: "파트로클로스",
    source: "『일리아스』 16권",
    summary: "파트로클로스가 아킬레우스의 갑옷을 입고 미르미돈 병사를 이끈다. 배에서 트로이군을 몰아내되, 성벽까지 쫓아가서는 안 된다.",
    objective: "리키아의 왕 사르페돈을 쓰러뜨린다.",
    loss: "우리 편이 모두 쓰러지거나 14차례가 지난다.",
    intro: { id: "intro", lines: [
      { speaker: null, text: "헥토르가 큰 칼로 대 아이아스의 창끝을 베어 냈다. 아이아스가 물러서자 트로이군이 프로테실라오스의 배에 불을 던졌다." },
      { speaker: "achilles", text: "일어나게, 파트로클로스! 배에 불이 붙었으니 어서 무장하게, 병사는 내가 모으겠네.", tone: "fierce" },
      { speaker: null, text: "파트로클로스가 아킬레우스의 갑옷을 입었다. 물푸레나무 큰 창만은 두고 갔다." },
      { speaker: null, text: "그 창은 아킬레우스 말고는 아카이아 사람 누구도 휘두르지 못했다." },
      { speaker: null, text: "아우토메돈이 죽지 않는 말 크산토스와 발리오스를 전차에 맸다." },
      { speaker: null, text: "아킬레우스는 막사를 돌며 미르미돈 병사들을 불러 모았다." },
      { speaker: "achilles", text: "내가 노여워하는 동안 트로이군에게 큰소리치던 말을 잊지 마라. 너희가 바라던 싸움이 왔다." },
      { speaker: null, text: "아킬레우스가 잔에 포도주를 따르고 제우스에게 빌었다." },
      { speaker: "achilles", text: "제우스여, 제 벗에게 영광을 주십시오. 배에서 적을 몰아낸 뒤에는 무사히 돌아오게 해 주십시오.", tone: "calm" },
      { speaker: null, text: "제우스는 한 가지는 들어주고 한 가지는 들어주지 않았다.", tone: "grief" },
      { speaker: null, text: "미르미돈 병사들이 쏟아져 나갔다. 아이들이 건드려 성난 길가의 말벌 떼 같았다." },
      { speaker: "patroclus", text: "미르미돈 전사들이여, 사내답게 싸우자! 아킬레우스를 높이고, 아가멤논이 누구를 업신여겼는지 알게 하자.", tone: "fierce" },
    ] },
    scenes: [
      { id: "borrowed-armor", lines: [
        { speaker: null, text: "트로이군이 번쩍이는 갑옷을 보고 술렁였다. 아킬레우스가 분노를 거두고 돌아온 줄 알았다." },
        { speaker: "trojan-soldier", text: "아킬레우스다! 펠레우스의 아들이 돌아왔다!", tone: "awe" },
        { speaker: null, text: "트로이 병사들은 저마다 달아날 길을 찾아 두리번거렸다." },
        { speaker: "patroclus", text: "배에서 몰아내라! 불부터 꺼라!", tone: "fierce" },
      ] },
      { id: "achilles-warning", lines: [
        { speaker: null, text: "트로이 성벽이 눈앞에 다가오자, 파트로클로스는 떠나기 전에 들은 당부를 떠올렸다." },
        { speaker: "achilles", text: "배에서 적을 몰아내면 곧장 돌아오게. 나 없이 트로이군을 쫓아 성벽까지 가지 말게.", tone: "calm" },
        { speaker: "achilles", text: "올림포스의 어느 신이 자네를 막아설지 모르네. 멀리 쏘는 아폴론은 트로이를 몹시 아끼네.", tone: "calm" },
      ] },
      { id: "sarpedon-falls", lines: [
        { speaker: null, text: "제우스가 죽어 가는 아들을 기려 땅에 핏빛 빗방울을 뿌렸다.", tone: "awe" },
        { speaker: "sarpedon-of-lycia", text: "글라우코스, 내 벗이여. 리키아 장수들을 불러 내 주검을 지켜 주게.", tone: "grief" },
        { speaker: "sarpedon-of-lycia", text: "아카이아군이 내 무구를 벗겨 가면, 자네는 평생 그 부끄러움을 안고 살 걸세.", tone: "grief" },
        { speaker: null, text: "사르페돈은 그 말을 끝으로 숨을 거두었다." },
      ] },
      { id: "apollo-strikes", lines: [
        { speaker: null, text: "파트로클로스가 세 번 성벽 모서리를 올랐다. 그때마다 아폴론이 불사의 손으로 방패를 쳐 밀어냈다." },
        { speaker: "apollo", text: "물러서라, 파트로클로스. 트로이는 네 창에도, 너보다 훨씬 나은 아킬레우스의 창에도 무너질 운명이 아니다.", tone: "fierce" },
        { speaker: null, text: "네 번째로 달려들자, 아폴론이 짙은 안개에 싸인 채 뒤로 다가와 손바닥으로 등을 내리쳤다.", tone: "awe" },
        { speaker: null, text: "투구가 말발굽 아래로 굴렀고 창이 부러졌다. 방패가 떨어지고 가슴받이 끈이 풀렸다." },
        { speaker: null, text: "파트로클로스는 넋이 나간 채 멍하니 섰다." },
      ] },
      { id: "patroclus-falls", lines: [
        { speaker: "hector", text: "파트로클로스, 우리 성을 무너뜨리고 트로이 여인들을 배에 실어 갈 줄 알았더냐. 어리석은 놈.", tone: "fierce" },
        { speaker: "patroclus", text: "마음껏 뽐내라, 헥토르. 나를 쓰러뜨린 건 제우스와 아폴론이고, 너는 마지막에 창을 댔을 뿐이다.", tone: "grief" },
        { speaker: "patroclus", text: "이 말도 새겨 두어라. 너도 머지않아 아킬레우스의 손에 죽는다.", tone: "grief" },
        { speaker: null, text: "말을 마치자 죽음이 파트로클로스를 덮었다. 넋이 젊음과 힘을 뒤로한 채 제 운명을 슬퍼하며 하데스로 날아갔다.", tone: "grief" },
        { speaker: "hector", text: "어찌 내 죽음을 점치느냐. 아킬레우스가 먼저 내 창에 쓰러질지 누가 아느냐." },
      ] },
    ],
    // 파트로클로스가 죽은 길 — 『일리아스』 17권, 18권 1~21행
    outro: { id: "outro", lines: [
      { speaker: null, text: "파트로클로스가 쓰러진 자리에 메넬라오스가 먼저 달려와 섰다. 첫 송아지 곁을 떠나지 않는 어미 소 같았다." },
      { speaker: "menelaus", text: "아이아스, 이리 오게. 파트로클로스를 아킬레우스에게 데려가야 하네." },
      { speaker: null, text: "헥토르가 주검에서 아킬레우스의 갑옷을 벗겨 갔다." },
      { speaker: null, text: "대 아이아스가 넓은 방패로 주검을 덮고, 새끼를 지키는 사자처럼 버티고 섰다." },
      { speaker: null, text: "주검을 둘러싼 싸움이 온종일 이어졌다. 아킬레우스의 말들도 싸움터 한쪽에서 고개를 떨군 채 눈물을 흘렸다.", tone: "grief" },
      { speaker: "menelaus", text: "안틸로코스, 아킬레우스에게 달려가 알려 주게. 파트로클로스가 죽었다고." },
      { speaker: null, text: "안틸로코스는 눈물을 쏟으며 아킬레우스의 막사로 달렸다." },
      { speaker: null, text: "메넬라오스와 메리오네스가 주검을 높이 들어 올렸다. 두 아이아스가 뒤를 막아 트로이군을 붙잡아 두었다." },
      { speaker: "antilochus", text: "아킬레우스, 차라리 없었으면 좋았을 소식을 전하네. 파트로클로스가 쓰러졌네.", tone: "grief" },
      { speaker: "antilochus", text: "벌거벗은 주검을 두고 싸움이 한창이네. 갑옷은 헥토르가 가져갔네.", tone: "grief" },
    ] },
    // 파트로클로스가 살아서 이긴 길 — 호메로스와 다른 길
    outroAlt: { id: "outro-alt", lines: [
      { speaker: null, text: "호메로스는 파트로클로스가 트로이 성벽 아래에서 죽었다고 노래했다. 이 싸움에서는 다른 길이 열렸다." },
      { speaker: null, text: "아폴론이 사르페돈의 주검을 거두어 잠의 신과 죽음의 신에게 맡겼다. 쌍둥이 형제가 주검을 리키아로 데려갔다." },
      { speaker: null, text: "파트로클로스는 성벽을 뒤로하고 배로 돌아왔다." },
      { speaker: "achilles", text: "돌아왔군, 파트로클로스. 자네가 살아서 왔으면 됐네.", tone: "calm" },
      { speaker: "patroclus", text: "배는 지켰네. 하지만 아카이아 사람들은 아직 자네를 기다리고 있네." },
      { speaker: "patroclus", text: "자네 노여움이 아무리 깊어도, 벗들이 죽어 가는 걸 언제까지 보고만 있을 텐가." },
      { speaker: "achilles", text: "자네 말이 맞네. 지난 일은 가슴에 묻어 두지." },
      { speaker: "achilles", text: "이제 내가 싸움에 나서겠네.", tone: "fierce" },
      { speaker: null, text: "아킬레우스가 마침내 분노를 거두었다. 벗을 잃어서가 아니라 벗의 말을 들어서였다." },
    ] },
    defeat: { id: "defeat", lines: [
      { speaker: null, text: "파트로클로스의 무리는 끝내 트로이군을 몰아내지 못했다." },
      { speaker: "hector", text: "불을 가져와라! 다 함께 함성을 질러라!", tone: "fierce" },
      { speaker: null, text: "불길이 다시 아카이아의 배로 번졌다." },
    ] },
  },
  // #endregion

  // #region 영어
  en: {
    title: "Patroclus",
    source: "The Iliad, Book 16",
    summary: "Patroclus leads the Myrmidons out in Achilles’ armor. Drive the Trojans from the ships, but don’t chase them to the walls.",
    objective: "Defeat Sarpedon, king of Lycia.",
    loss: "All your units fall, or 14 turns pass.",
    intro: { id: "intro", lines: [
      { speaker: null, text: "Hector’s great sword sheared the bronze point off Ajax’s spear. Ajax fell back, and the Trojans hurled fire onto the ship of Protesilaus." },
      { speaker: "achilles", text: "Up, Patroclus, the ships are burning! Arm yourself, and I’ll rally the men.", tone: "fierce" },
      { speaker: null, text: "Patroclus put on the armor of Achilles. Only the great ash spear he left behind." },
      { speaker: null, text: "No Achaean but Achilles could wield that spear." },
      { speaker: null, text: "Automedon yoked the immortal horses, Xanthus and Balius." },
      { speaker: null, text: "Achilles went from hut to hut, calling out the Myrmidons." },
      { speaker: "achilles", text: "All through my anger you swore what you’d do to the Trojans. Well, here’s the fight you wanted." },
      { speaker: null, text: "Achilles poured wine from a cup and prayed to Zeus." },
      { speaker: "achilles", text: "Zeus, give my friend glory. And once he has cleared the ships, bring him back to me unharmed.", tone: "calm" },
      { speaker: null, text: "Zeus granted one prayer and refused the other.", tone: "grief" },
      { speaker: null, text: "The Myrmidons poured out like wasps from a roadside nest that boys have been poking." },
      { speaker: "patroclus", text: "Myrmidons, fight like men! Win glory for Achilles, and let Agamemnon see what he threw away.", tone: "fierce" },
    ] },
    scenes: [
      { id: "borrowed-armor", lines: [
        { speaker: null, text: "The Trojans saw the gleaming armor and faltered. They thought Achilles had given up his anger and come back." },
        { speaker: "trojan-soldier", text: "It’s Achilles! The son of Peleus is back!", tone: "awe" },
        { speaker: null, text: "Every Trojan looked around for a way out." },
        { speaker: "patroclus", text: "Drive them from the ships! Put out the fire!", tone: "fierce" },
      ] },
      { id: "achilles-warning", lines: [
        { speaker: null, text: "As the walls of Troy loomed ahead, Patroclus remembered what Achilles had told him." },
        { speaker: "achilles", text: "Once the ships are clear, come back. Don’t chase the Trojans to their city without me.", tone: "calm" },
        { speaker: "achilles", text: "Some god may come down from Olympus to stand in your way. Apollo the Far-Shooter loves the Trojans dearly.", tone: "calm" },
      ] },
      { id: "sarpedon-falls", lines: [
        { speaker: null, text: "Zeus let drops of blood fall upon the earth, honoring his dying son.", tone: "awe" },
        { speaker: "sarpedon-of-lycia", text: "Glaucus, my friend, rally the Lycian captains. Fight for my body.", tone: "grief" },
        { speaker: "sarpedon-of-lycia", text: "If the Achaeans strip my armor, you’ll carry the shame of it all your days.", tone: "grief" },
        { speaker: null, text: "With those words, Sarpedon died." },
      ] },
      { id: "apollo-strikes", lines: [
        { speaker: null, text: "Three times Patroclus scaled the angle of the wall. Three times Apollo struck his shield with an immortal hand and threw him back." },
        { speaker: "apollo", text: "Give way, Patroclus. Troy is not fated to fall to your spear, nor even to Achilles’, and he is far better than you.", tone: "fierce" },
        { speaker: null, text: "When he charged a fourth time, Apollo came up behind him, hidden in mist, and struck his back with the flat of his hand.", tone: "awe" },
        { speaker: null, text: "The helmet rolled beneath the horses’ hooves. The spear shattered, the shield fell, and the corselet came loose." },
        { speaker: null, text: "Patroclus stood there dazed, his mind gone dark." },
      ] },
      { id: "patroclus-falls", lines: [
        { speaker: "hector", text: "Patroclus, you thought you’d sack our city and carry off our women in your ships. You fool.", tone: "fierce" },
        { speaker: "patroclus", text: "Boast while you can, Hector. Zeus and Apollo brought me down; you only struck the last blow.", tone: "grief" },
        { speaker: "patroclus", text: "And remember this: you won’t live long. Death is already at your side, at the hands of Achilles.", tone: "grief" },
        { speaker: null, text: "As he spoke, death closed over him. His soul flew down to Hades, mourning its fate, leaving youth and strength behind.", tone: "grief" },
        { speaker: "hector", text: "Why prophesy my doom? Who knows if Achilles won’t fall to my spear first?" },
      ] },
    ],
    outro: { id: "outro", lines: [
      { speaker: null, text: "Menelaus reached the body first and stood over it like a cow over her first calf." },
      { speaker: "menelaus", text: "Ajax, over here! We have to bring Patroclus back to Achilles." },
      { speaker: null, text: "Hector stripped Achilles’ armor from the body." },
      { speaker: null, text: "Ajax the Great covered the body with his broad shield and stood over it like a lion guarding its cubs." },
      { speaker: null, text: "The fight over the body raged all day. Apart from the battle, Achilles’ horses stood with heads bowed, weeping.", tone: "grief" },
      { speaker: "menelaus", text: "Antilochus, run to Achilles. Tell him Patroclus is dead." },
      { speaker: null, text: "Antilochus ran for Achilles’ hut, tears streaming down his face." },
      { speaker: null, text: "Menelaus and Meriones lifted the body high, while the two Ajaxes held the Trojans off behind them." },
      { speaker: "antilochus", text: "Achilles, I bring news I wish I never had to tell. Patroclus has fallen.", tone: "grief" },
      { speaker: "antilochus", text: "They’re fighting over his naked body. Hector has the armor.", tone: "grief" },
    ] },
    outroAlt: { id: "outro-alt", lines: [
      { speaker: null, text: "Homer sang that Patroclus died beneath the walls of Troy. This battle took another road." },
      { speaker: null, text: "Apollo gathered up Sarpedon’s body and gave it to the twin brothers Sleep and Death, who carried it home to Lycia." },
      { speaker: null, text: "Patroclus turned his back on the walls and returned to the ships." },
      { speaker: "achilles", text: "You’re back, Patroclus. You came back alive, and that’s all that matters.", tone: "calm" },
      { speaker: "patroclus", text: "The ships are safe. But the Achaeans are still waiting for you." },
      { speaker: "patroclus", text: "However deep your anger runs, how long will you stand by and watch our friends die?" },
      { speaker: "achilles", text: "You’re right. What’s done is done, and I’ll put it behind me." },
      { speaker: "achilles", text: "Now I’ll go out and fight.", tone: "fierce" },
      { speaker: null, text: "At last Achilles let go of his anger. He hadn’t lost his friend; he had listened to him." },
    ] },
    defeat: { id: "defeat", lines: [
      { speaker: null, text: "Patroclus and his men could not drive the Trojans back." },
      { speaker: "hector", text: "Bring fire! All together now, raise the war cry!", tone: "fierce" },
      { speaker: null, text: "Flames spread once more among the Achaean ships." },
    ] },
  },
  // #endregion
};
