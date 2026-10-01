/*
  파일명: components/features/game/myth/troy/story/ch07.ts
  기능: 트로이 전쟁 7장 「아마존의 여왕」 이야기(한국어·영어)
  책임: 『아이티오피스』(프로클로스 요약)·아폴로도로스 요약편 5.1·퀸투스 『호메로스 이후』 1권을 따라 싸움 전·중·뒤 장면을 적는다.
        파트로클로스가 산 길과 죽은 길 모두에 쓰도록 파트로클로스는 말하지 않는다. 다툼의 뒷일(레스보스의 정화)은 8장 첫머리가 잇는다.
*/ // ------------------------------
import type { ChapterStoryBook } from "./types";

export const CH07: ChapterStoryBook = {
  // #region 한국어
  ko: {
    title: "아마존의 여왕",
    source: "『아이티오피스』, 아폴로도로스 요약편 5.1, 퀸투스 『호메로스 이후』 1권",
    summary: "헥토르를 잃은 트로이에 아레스의 딸 펜테실레이아가 아마존 전사들을 이끌고 온다. 트로이 사람들이 다시 성문을 연다.",
    objective: "펜테실레이아를 쓰러뜨린다.",
    loss: "아킬레우스가 쓰러진다.",
    // 요약편 5.1(오트레레와 아레스의 딸, 히폴리테를 죽이고 프리아모스에게 정화받음), 퀸투스 1.93~114(여왕의 장담, 안드로마케의 탄식)
    intro: { id: "intro", lines: [
      { speaker: null, text: "헥토르를 묻은 트로이는 슬픔에 잠겼다. 누구도 성벽 밖으로 나서려 하지 않았다.", tone: "grief" },
      { speaker: null, text: "그때 트라키아 쪽에서 말발굽 소리가 울렸다. 아레스와 오트레레의 딸, 아마존의 여왕 펜테실레이아였다." },
      { speaker: null, text: "여왕은 사냥하다 뜻하지 않게 자매 히폴리테를 죽였다. 프리아모스가 그 죄를 씻어 주었다." },
      { speaker: "priam", text: "여왕이여, 잘 와 주었소. 헥토르를 잃은 이 성에 다시 빛이 드는구려.", tone: "calm" },
      { speaker: "penthesilea", text: "내일 아킬레우스를 쓰러뜨리고 아카이아의 배를 모두 불태우겠습니다.", tone: "fierce" },
      { speaker: null, text: "안드로마케는 그 말을 듣고 속으로 탄식했다. 헥토르도 끝내 해내지 못한 일이었다.", tone: "grief" },
      { speaker: null, text: "새벽, 여왕이 아마존 전사들과 트로이 군사를 이끌고 들판으로 나섰다." },
      { speaker: "achaean-soldier", text: "말 탄 여전사들이 온다! 대열을 다시 세워라!", tone: "fierce" },
      { speaker: "ajax-the-great", text: "아킬레우스, 저 여왕이 우리 병사들을 휩쓸고 있네. 우리 둘이 나가세.", tone: "fierce" },
      { speaker: "achilles", text: "가세. 아레스의 딸이라도 이 창은 피하지 못할 걸세.", tone: "fierce" },
    ] },
    scenes: [
      // 퀸투스 1권 — 도끼와 두 자루 창, 여왕의 장담. 아마존의 외침은 이음 대사
      { id: "penthesilea-charge", lines: [
        { speaker: null, text: "펜테실레이아가 말을 달려 대열 한가운데로 뛰어들었다. 도끼와 창이 번갈아 번쩍였다.", tone: "fierce" },
        { speaker: "penthesilea", text: "오늘 너희 가운데 누가 살아서 배로 돌아가겠느냐!", tone: "fierce" },
        { speaker: "amazon", text: "여왕을 따르라! 아카이아의 배까지 달려라!", tone: "fierce" },
      ] },
      // 퀸투스 1.594~674(말과 함께 꿰뚫은 창, 투구를 벗긴 아킬레우스의 뉘우침), 1.722~747(테르시테스의 조롱과 죽음), 프로클로스 요약
      { id: "penthesilea-falls", lines: [
        { speaker: null, text: "아킬레우스의 창이 여왕과 말을 함께 꿰뚫었다.", tone: "fierce" },
        { speaker: null, text: "아킬레우스가 쓰러진 여왕의 투구를 벗겼다. 흙먼지 속에서도 그 얼굴이 빛났다.", tone: "grief" },
        { speaker: null, text: "아킬레우스는 한동안 여왕 곁을 떠나지 못했다. 이 사람을 죽인 것을 뉘우쳤다.", tone: "grief" },
        { speaker: null, text: "테르시테스가 다가와 여자에게 넋을 뺏겼다며 비웃었다. 아킬레우스가 주먹을 휘두르자 테르시테스는 그 자리에서 숨졌다." },
      ] },
    ],
    // 퀸투스 1.767~810(디오메데스의 노여움, 여왕의 장례), 프로클로스 요약(테르시테스 일로 아카이아 사람들 사이에 다툼이 남)
    outro: { id: "outro", lines: [
      { speaker: null, text: "여왕을 잃은 아마존과 트로이군이 성으로 물러났다." },
      { speaker: null, text: "아카이아 사람들은 여왕의 주검을 트로이로 돌려보냈다. 트로이 사람들은 여왕을 불에 태우고 그 뼈를 정성껏 묻었다.", tone: "grief" },
      { speaker: null, text: "진영에서는 테르시테스의 죽음을 두고 말이 많았다. 테르시테스와 한 집안인 디오메데스가 크게 노했다." },
      { speaker: "diomedes", text: "우리 핏줄을 죽이다니. 아킬레우스, 이 일은 그냥 넘어가지 않겠네.", tone: "fierce" },
      { speaker: "odysseus", text: "둘 다 창을 거두게. 트로이 성벽 앞에서 우리끼리 피를 볼 셈인가.", tone: "cunning" },
      { speaker: null, text: "그 무렵 동쪽 끝에서 소문이 들려왔다. 새벽의 여신의 아들이 군대를 이끌고 트로이로 온다는 것이었다.", tone: "awe" },
    ] },
    defeat: { id: "defeat", lines: [
      { speaker: null, text: "아카이아 대열이 무너졌다. 아마존 기병들이 배 쪽으로 내달렸다." },
      { speaker: "penthesilea", text: "아킬레우스도 별것 아니구나! 배를 불태워라!", tone: "fierce" },
    ] },
  },
  // #endregion

  // #region 영어
  en: {
    title: "Queen of the Amazons",
    source: "The Aethiopis; Apollodorus, Epitome 5.1; Quintus Smyrnaeus, Posthomerica 1",
    summary: "Troy has lost Hector, but Penthesilea, daughter of Ares, arrives with her Amazons. The Trojans open their gates once more.",
    objective: "Defeat Penthesilea.",
    loss: "Achilles falls.",
    intro: { id: "intro", lines: [
      { speaker: null, text: "Troy buried Hector and sank into grief. No one would set foot outside the walls.", tone: "grief" },
      { speaker: null, text: "Then hoofbeats sounded from the direction of Thrace. It was Penthesilea, queen of the Amazons, daughter of Ares and Otrere." },
      { speaker: null, text: "While hunting, she had killed her sister Hippolyte by accident. Priam purified her of the blood." },
      { speaker: "priam", text: "Welcome, my queen. With Hector gone, you bring light back to this city.", tone: "calm" },
      { speaker: "penthesilea", text: "Tomorrow I will kill Achilles and burn every Achaean ship.", tone: "fierce" },
      { speaker: null, text: "Andromache heard her and sighed to herself. Not even Hector had managed that.", tone: "grief" },
      { speaker: null, text: "At dawn the queen rode out onto the plain with her Amazons and the Trojan army." },
      { speaker: "achaean-soldier", text: "Horsewomen, coming fast! Re-form the line!", tone: "fierce" },
      { speaker: "ajax-the-great", text: "Achilles, that queen is cutting through our men. Let the two of us go out.", tone: "fierce" },
      { speaker: "achilles", text: "Come on, then. Daughter of Ares or not, she won't dodge this spear.", tone: "fierce" },
    ] },
    scenes: [
      { id: "penthesilea-charge", lines: [
        { speaker: null, text: "Penthesilea spurred her horse into the thick of the line, axe and spear flashing by turns.", tone: "fierce" },
        { speaker: "penthesilea", text: "Which of you will live to see your ships again today?", tone: "fierce" },
        { speaker: "amazon", text: "Follow the queen! Ride for the Achaean ships!", tone: "fierce" },
      ] },
      { id: "penthesilea-falls", lines: [
        { speaker: null, text: "Achilles' spear drove through the queen and her horse together.", tone: "fierce" },
        { speaker: null, text: "He pulled the helmet from her head. Even in the dust, her face shone.", tone: "grief" },
        { speaker: null, text: "For a long while Achilles could not leave her side. He regretted killing her.", tone: "grief" },
        { speaker: null, text: "Thersites came up and jeered that a woman had stolen his wits. Achilles struck him with his fist, and Thersites died where he fell." },
      ] },
    ],
    outro: { id: "outro", lines: [
      { speaker: null, text: "Without their queen, the Amazons and the Trojans fell back to the city." },
      { speaker: null, text: "The Achaeans returned her body to Troy. The Trojans burned it on a pyre and buried her bones with care.", tone: "grief" },
      { speaker: null, text: "In camp, the death of Thersites set tongues wagging. Diomedes, his kinsman, was furious." },
      { speaker: "diomedes", text: "You killed my own blood. I won't let this pass, Achilles.", tone: "fierce" },
      { speaker: "odysseus", text: "Lower your spears, both of you. Will we spill each other's blood in front of Troy?", tone: "cunning" },
      { speaker: null, text: "Around that time a rumor came from the far east: the son of the Dawn was marching on Troy with an army.", tone: "awe" },
    ] },
    defeat: { id: "defeat", lines: [
      { speaker: null, text: "The Achaean line broke, and the Amazon riders raced toward the ships." },
      { speaker: "penthesilea", text: "So much for Achilles! Burn the ships!", tone: "fierce" },
    ] },
  },
  // #endregion
};
