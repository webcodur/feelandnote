/*
  파일명: components/features/game/myth/troy/story/ch02.en.ts
  기능: 트로이 전쟁 2장 「깨진 휴전」 영어 이야기
  책임: ch02.ko.ts와 같은 장면을 영어로 따로 쓴다(한국어 직역이 아니다). ch02.ts가 한국어와 묶는다.
*/ // ------------------------------
import type { ChapterStory } from "./types";

export const CH02_EN: ChapterStory = {
  title: "The Broken Truce",
  source: "Iliad, Books 3–9",
  summary: "Pandarus's arrow has broken the truce. Strengthened by Athena, Diomedes leads the attack.",
  objective: "Defeat Pandarus.",
  loss: "Diomedes or Menelaus falls.",
  intro: { id: "intro", lines: [
    { speaker: null, text: "The two armies faced each other on the plain. Paris and Menelaus, rivals for Helen, agreed to settle it man to man." },
    { speaker: null, text: "Both sides swore oaths over the sacrifice. The winner would take Helen and her treasure, and the war would end." },
    { speaker: "menelaus", text: "Lord Zeus, let me punish the man who wronged me first, and with my own hands.", tone: "fierce" },
    { speaker: null, text: "Menelaus's sword shattered on Paris's helmet. He seized the horsehair crest and dragged Paris off." },
    { speaker: null, text: "Aphrodite snapped the chinstrap and hid Paris in thick mist. She set him down in his own bedroom inside the city.", tone: "awe" },
    { speaker: "menelaus", text: "Paris! Where have you gone?", tone: "fierce" },
    { speaker: "agamemnon", text: "The victory belongs to Menelaus. Give back Helen and her treasure!", tone: "fierce" },
    { speaker: null, text: "But Hera wanted Troy destroyed. With Zeus's leave, Athena disguised herself as the Trojan Laodocus and sought out the archer Pandarus." },
    { speaker: "athena", text: "Shoot Menelaus. Prince Paris will reward you richly.", tone: "cunning" },
    { speaker: null, text: "Athena flicked Pandarus's arrow aside, as a mother shoos a fly from her sleeping child. It pierced the belt and just grazed the skin." },
    { speaker: "menelaus", text: "Don't worry, brother. The belt caught it before it hit anything vital.", tone: "calm" },
    { speaker: null, text: "Machaon pulled out the arrow, sucked the wound clean, and spread on a salve that Chiron had given his father Asclepius." },
    { speaker: null, text: "The oaths were broken. With Achilles still in his hut, the armies crashed together once more." },
  ] },
  scenes: [
    { id: "athena-diomedes", lines: [
      { speaker: null, text: "Athena filled Diomedes with his father Tydeus's strength. Fire blazed from his helmet and shield like the star of late summer.", tone: "awe" },
      { speaker: "athena", text: "I have lifted the mist from your eyes. Now you can tell gods from men.", tone: "calm" },
      { speaker: "athena", text: "Do not fight the other gods. But if Aphrodite enters the battle, strike her with sharp bronze.", tone: "fierce" },
      { speaker: "diomedes", text: "Goddess, when a god stands in my way, I will call on your blessing.", tone: "calm" },
    ] },
    { id: "aphrodite-arrives", lines: [
      { speaker: null, text: "Aphrodite came down to the battlefield: the goddess who bore Aeneas to Anchises as he herded cattle.", tone: "awe" },
      { speaker: null, text: "She wrapped her white arms around her son and spread her shining robe before him to turn away the spears." },
      { speaker: "diomedes", text: "Aphrodite. Athena said she is the one god I may strike.", tone: "fierce" },
    ] },
    { id: "aphrodite-wounded", lines: [
      { speaker: null, text: "Diomedes's spear pierced Aphrodite's wrist. Ichor, the blood of the gods, ran out, and she cried aloud.", tone: "awe" },
      { speaker: "diomedes", text: "Daughter of Zeus, keep out of war! Isn't it enough to lead weak women astray?", tone: "fierce" },
      { speaker: null, text: "Leaning on Iris, Aphrodite fled to Olympus." },
    ] },
    { id: "ares-arrives", lines: [
      { speaker: null, text: "Ares took the shape of a man and stood before the Trojans, swinging a huge spear as he ranged along their ranks.", tone: "awe" },
      { speaker: "diomedes", text: "Fall back, but keep your faces to the enemy! That is no man, that is Ares.", tone: "awe" },
      { speaker: "athena", text: "Do not fear Ares, for I am at your side. Charge that madman and strike.", tone: "fierce" },
    ] },
    { id: "ares-wounded", lines: [
      { speaker: null, text: "Diomedes thrust, and Athena drove the spear deep into Ares's belly.", tone: "awe" },
      { speaker: null, text: "Ares roared like nine or ten thousand men shouting in battle. Greeks and Trojans alike shook with fear.", tone: "awe" },
      { speaker: null, text: "Then he rose into the sky like a dark storm cloud and fled to Olympus." },
    ] },
    { id: "glaucus-truce", lines: [
      { speaker: "diomedes", text: "Who are you, friend? I've never seen your face on this field.", tone: "calm" },
      { speaker: "glaucus", text: "Why ask my lineage? The generations of men are like leaves: they fall, and in spring they grow again.", tone: "calm" },
      { speaker: "glaucus", text: "I am Glaucus, son of Hippolochus and grandson of Bellerophon.", tone: "calm" },
      { speaker: "diomedes", text: "My grandfather Oeneus once hosted Bellerophon for twenty days. We are guest-friends by inheritance, so let's trade armor.", tone: "calm" },
      { speaker: null, text: "They clasped hands and exchanged armor. Glaucus gave gold worth a hundred oxen for bronze worth nine." },
    ] },
    { id: "aeneas-rescued", lines: [
      { speaker: null, text: "Aeneas sank to his knees, and Apollo wrapped him in a dark cloud.", tone: "awe" },
      { speaker: "apollo", text: "Stand back. Mortals do not fight gods.", tone: "fierce" },
      { speaker: null, text: "Apollo carried Aeneas to his temple on Pergamus, where Leto and Artemis healed his wounds." },
    ] },
    { id: "pandarus-falls", lines: [
      { speaker: null, text: "Pandarus fell, and his bright armor clanged against the ground." },
      { speaker: null, text: "He died where he lay. So ended the archer who broke the truce." },
      { speaker: "menelaus", text: "Oath-breakers always pay in the end.", tone: "fierce" },
    ] },
  ],
  outro: { id: "outro", lines: [
    { speaker: null, text: "Hector slipped back into the city for a while. At the Scaean Gates he met his wife Andromache and their baby son Astyanax." },
    { speaker: "andromache", text: "Your courage will be the death of you. You are my father and my mother, my brother and my husband.", tone: "grief" },
    { speaker: "hector", text: "I think of all that too, my wife. But I could never face the Trojans if I shrank from battle like a coward.", tone: "calm" },
    { speaker: null, text: "The baby shrieked at his father's gleaming helmet, and his parents laughed. Hector set the helmet down and lifted up his son." },
    { speaker: "hector", text: "Zeus, let people say of this boy one day: he is far better than his father.", tone: "calm" },
    { speaker: null, text: "Hector put his helmet back on and returned to the battle. Andromache kept turning back to look, weeping as she went.", tone: "grief" },
    { speaker: null, text: "The Greeks built a wall and dug a trench to guard their ships. Days later Zeus thundered from Ida and drove them back behind it." },
    { speaker: null, text: "That night the Trojans lit a thousand fires across the plain and waited for dawn." },
    { speaker: null, text: "Agamemnon sent Odysseus, Ajax the Great, and Phoenix to Achilles, offering to return Briseis with a fortune in gifts." },
    { speaker: null, text: "They found Achilles playing the lyre, singing of the glorious deeds of men." },
    { speaker: "achilles", text: "Pile the gifts as high as the sand, and my heart won't turn. I fight when Hector fires the Myrmidon ships, not before.", tone: "fierce" },
    { speaker: null, text: "The envoys went back empty-handed." },
  ] },
  defeat: { id: "defeat", lines: [
    { speaker: null, text: "The Greek line gave way, and the Trojans surged toward the ships with a roar." },
    { speaker: "agamemnon", text: "Fall back! We re-form at the ships!", tone: "fierce" },
  ] },
};
