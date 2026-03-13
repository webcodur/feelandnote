/*
  파일명: lib/game/voice/defaultLines.ts
  기능: 톤별 범용 대사 (defaultLines)
  책임: DB 개인화 불필요한 부수적 인터랙션에서 speech_tone 기반으로 사용한다.
*/

import type { SpeechTone } from "./types";

/**
 * 상황 키 → 톤별 대사 배열.
 * dialogueLines(7종)과 별도로, 게임 고유 상황에서 사용한다.
 */
const defaultLines: Record<'ko' | 'en', Record<string, Record<SpeechTone, string[]>>> = {
  ko: {
    /** 범용 greeting 폴백 — 개인 대사(dialogueLines)가 없는 인물용 */
    greeting: {
      loyal: ["부르셨습니까.", "충성을 다하겠습니다.", "명을 기다리고 있었습니다."],
      composed: ["만나게 되어 반갑습니다.", "무엇이든 물어보십시오.", "준비되어 있습니다."],
      bold: ["나를 불렀군.", "왔다.", "기다리게 했군."],
      humble: ["불러주셔서 감사합니다.", "미력하나마 돕겠습니다.", "찾아주셔서 영광입니다."],
      gentle: ["안녕하세요.", "만나서 반가워요.", "좋은 만남이 되길 바랍니다."],
      free: ["왔어.", "부른 거지?", "뭐, 여기 있지."],
    },

    /** 미궁: O/X 클릭 직후 — 등용·확인 대상이 된 즉각 반응 */
    accused: {
      loyal: ["저를 찾고 계셨습니까.", "면담이라면 응하겠습니다.", "어떤 분을 찾고 계신지요."],
      composed: ["근거가 있으시겠지요.", "흥미로운 판단이군요.", "어디 확인해 보시지요."],
      bold: ["나를 찾으시오?", "안목이 있으시군.", "좋소, 살펴보시오."],
      humble: ["저인가요...", "겸허히 응하겠습니다.", "제가 맞기를 바랍니다."],
      gentle: ["저를요...?", "그렇게 보이셨나요.", "괜찮아요, 확인해 보세요."],
      free: ["나를 찾으시오?", "흥미로운 안목이시군.", "한번 확인해 보시오."],
    },

    /** 미궁: X → 확인 완료 — 이 분이 아님을 확인, 찾는 인물에 대한 조언 */
    cleared: {
      loyal: ["찾으시는 분이 저 쪽에 계신 듯합니다.", "반드시 찾으실 수 있을 것입니다.", "미력하나마 도움이 되었기를."],
      composed: ["조금만 더 살펴보시면 될 겁니다.", "범위가 좁혀지고 있군요.", "올바른 방향입니다."],
      bold: ["가까이 오셨소. 감이 좋으시군.", "저 쪽을 한번 살펴보시오.", "눈이 좋으신데, 조금만 더."],
      humble: ["조금만 더 찾아보시지요.", "제가 아니라 아쉽지만, 분명 계실 겁니다.", "찾는 길에 보탬이 되었으면 합니다."],
      gentle: ["저는 아닌가 봐요. 하지만 가까이 계실 거예요.", "조금만 더 둘러보세요.", "분명 찾으실 거예요."],
      free: ["나는 아니오. 다른 데 알아보시오.", "찾고 계신 분을 찾기를 바라겠소.", "뭐, 힌트는 드렸으니."],
    },

    /** 여명: 보드 카드 클릭 — 게임 안내 팁 */
    dawn_guide: {
      loyal: ["잘 모르면 힌트를 보시오.", "시간의 눈이 답을 보여줄 것이오.", "횃불이 남아있다면 활용하시오."],
      composed: ["힌트를 쓰면 범위를 좁힐 수 있습니다.", "시간의 눈으로 위치를 가늠해 보십시오.", "확신이 없으면 서두르지 마십시오."],
      bold: ["모르면 횃불을 써라.", "시간의 눈이 있잖은가.", "고민하지 말고 직감을 믿어라."],
      humble: ["힌트가 도움이 될 겁니다.", "시간의 눈을 활용해 보세요.", "천천히 생각해 보셔도 됩니다."],
      gentle: ["힌트를 보시면 좋을 거예요.", "시간의 눈이 길을 보여줄 거예요.", "급하지 않으니 천천히 하세요."],
      free: ["모르면 횃불 태워봐.", "시간의 눈이란 것도 있다네.", "감이 안 오면 힌트를 써."],
    },

    /** 일기토: 충전 — 살기를 응축하는 순간 */
    duel_charge: {
      loyal: ["아직... 벨 칼이 덜 갈렸다.", "한 수만 더 읽겠다.", "끝을 볼 때까지 참는다."],
      composed: ["서두를 이유가 없다.", "칼은 뽑을 때를 안다.", "상대의 호흡이 보인다."],
      bold: ["떨려라, 곧 끝이다.", "더 모아야 재밌지.", "이 정도론 아직 부족하다."],
      humble: ["아직은 제 차례가 아닙니다.", "좀 더 지켜보겠습니다.", "서두르면 놓치는 법이지요."],
      gentle: ["조금만 기다려주세요.", "때가 오고 있어요.", "아직은 참을 수 있어요."],
      free: ["좀만 더, 거의 왔어.", "아직 칼맛이 안 나는데.", "참는 맛도 있지."],
    },

    /** 일기토: 공격 — 일격의 순간 */
    duel_strike: {
      loyal: ["이 목을 바치듯, 받아라!", "충의의 칼이다!", "여기서 끝내겠다!"],
      composed: ["계산 끝이다.", "빈틈이 보였다.", "지금이 정확히 그때다."],
      bold: ["씹어먹어주마!", "내 앞에서 버티겠다고?", "부서져라!"],
      humble: ["용서하십시오, 멈출 수 없습니다!", "이것이 제가 할 수 있는 전부입니다!", "피할 수 없는 한 수입니다!"],
      gentle: ["미안해요, 봐줄 수 없어요!", "여기서 결판이에요!", "아프겠지만, 갑니다!"],
      free: ["가자, 한방!", "이거나 먹어!", "재밌어지겠는데!"],
    },

    /** 일기토: 방어 — 일격을 튕겨내는 담력 */
    duel_brace: {
      loyal: ["이 몸이 방패다.", "주군을 위해서라면 이까짓 것.", "무릎은 꿇지 않는다."],
      composed: ["그 정도로는 흔들리지 않는다.", "구멍이 없는 진을 치고 있다.", "아직 균열은 없다."],
      bold: ["그게 최선이냐?", "내 갑옷에 긁힌 것뿐이다!", "웃기는군, 한 번 더 해봐라."],
      humble: ["이 정도는 감당합니다.", "괜찮습니다, 걱정 마십시오.", "맞아도 쓰러지진 않습니다."],
      gentle: ["괜찮아요, 저 튼튼해요.", "이 정도면 견딜 수 있어요.", "아프긴 한데... 괜찮아요."],
      free: ["에이, 안 아파.", "이걸 공격이라고?", "간지럽다, 좀 세게 쳐봐."],
    },

    /** 일기토(책략): 고민 — 논리의 칼을 버리는 시간 */
    duel_debate_charge: {
      loyal: ["허점을 찾고 있다... 반드시 있다.", "전제를 뒤집을 한 수를 구상 중이다.", "상대의 논리 끝에 절벽이 보인다."],
      composed: ["모든 주장에는 균열이 있다.", "삼단논법의 두 번째 전제를 의심한다.", "결론부터 역추적하겠다."],
      bold: ["그래, 어디 끝까지 가보자.", "곧 네 말이 네 목을 조를 것이다.", "이미 함정은 파놨다."],
      humble: ["조금만 더 생각할 시간을 주십시오.", "아직 반론의 실마리가 모자랍니다.", "진리는 서두르면 놓치는 법이지요."],
      gentle: ["잠시만요, 정리하고 있어요.", "뭔가 이상한 점이 보이는 것 같아요.", "생각을 좀 모아야 해요."],
      free: ["잠깐, 뭔가 걸리는데...", "네 말에 구멍이 있어, 찾는 중이야.", "아, 거의 잡았다."],
    },

    /** 일기토(책략): 논파 — 상대 논리의 급소를 찌르는 일격 */
    duel_debate_strike: {
      loyal: ["그 논리, 출발점부터 거짓이다!", "모순을 증명하겠다, 들어라!", "한 가지만 묻겠다. 그럼 왜 결론이 달라지는가!"],
      composed: ["전제가 참이면 결론은 거짓이어야 한다. 증명 끝이다.", "귀류법 한 줄이면 충분하다.", "인과가 뒤집혀 있다. 원인과 결과를 바꿔놨군."],
      bold: ["그 입을 닥칠 근거가 여기 있다!", "네 말 전부, 한 문장으로 부순다!", "논리로 이길 수 없으니 말장난을 하는 거지!"],
      humble: ["실례지만, 그 전제 자체에 결함이 있습니다.", "조심스럽지만 반례를 하나 들겠습니다.", "한 가지 여쭤도 될까요? 그러면 이것은 어떻게 설명하십니까?"],
      gentle: ["저기, 이건 좀 다른 것 같아요.", "한 가지만 물어볼게요. 그러면 이건요?", "그 말대로라면, 이것도 맞아야 하지 않을까요?"],
      free: ["그 논리대로면 네가 틀린 거잖아.", "방금 자기가 한 말 기억해? 모순이야.", "아, 됐고. 한마디로 끝내줄게."],
    },

    /** 일기토(책략): 궤변 — 논점을 비틀고 뒤집는 언어의 마술 */
    duel_debate_brace: {
      loyal: ["내가 틀린 게 아니라, 진실이 아직 세상에 도착하지 않은 것이다.", "패배가 아니다. 승리를 유보한 것뿐이다.", "논점이 다르다. 그쪽이 묻고 있는 것은 질문이 아니라 함정이다."],
      composed: ["그것은 반박이 아니라 감상이다.", "전제가 다르니 결론이 같을 수 없다. 틀린 건 내가 아니라 문제 자체다.", "귀류법은 양쪽에 적용된다. 당신의 결론도 불가능하다."],
      bold: ["나를 공격한 게 아니라, 네 말이 나한테 부딪혀서 깨진 것이다.", "틀렸다고? 세상이 내 답과 다른 방향으로 흘러가고 있을 뿐이다.", "그건 논파가 아니라 큰소리일 뿐이야."],
      humble: ["제가 틀린 것이 아니라, 아직 제 말이 이해받지 못한 것이겠지요.", "다른 해석이 가능합니다. 반드시 하나만 옳은 것은 아닙니다.", "틀렸다기보다... 우리가 서로 다른 언어로 같은 것을 말하고 있는 겁니다."],
      gentle: ["그렇게 볼 수도 있지만, 반대로 보면 제 말이 맞아요.", "오류가 아니라 관점의 차이예요. 둘 다 맞을 수 있어요.", "공격당한 게 아니에요, 제가 비켜선 거예요."],
      free: ["그건 반론이 아니라 네 감정이지.", "내가 틀린 게 아니라 네가 이해를 못 한 거야.", "논점을 바꾼 적 없어. 네가 따라오지 못한 거지."],
    },

    /** 미궁: 등용 성공 — 찾던 현자를 발견하여 등용했을 때 */
    recruited: {
      loyal: ["찾아주셨군요. 충성을 다하겠습니다.", "부름에 응하겠습니다.", "기꺼이 따르겠습니다."],
      composed: ["결국 찾아내셨군요. 예상보다 빠르셨습니다.", "좋은 안목이십니다.", "숨어 있을 곳이 없었군요."],
      bold: ["나를 찾아내다니, 대단하군.", "좋소, 인정하겠소.", "이 정도면 따를 만하오."],
      humble: ["저를 찾아주셔서 감사합니다.", "부족하지만 힘을 보태겠습니다.", "이렇게 만나게 되다니 영광입니다."],
      gentle: ["찾아주셨네요. 기다리고 있었어요.", "반가워요, 함께하게 되어 기쁘네요.", "좋은 인연이 되었으면 해요."],
      free: ["결국 찾았군. 대단한데.", "뭐, 잡혔으니 따르지.", "숨는 것도 이제 질렸어."],
    },

    /** 여명: 오답 배치 — 잘못된 자리에 놓였을 때 */
    dawn_wrong: {
      loyal: ["아직 때가 아닙니다.", "제 자리가 아닌 듯합니다.", "다시 살펴주시오."],
      composed: ["이 위치는 맞지 않습니다.", "다시 생각해 보십시오.", "시간의 흐름을 짚어보십시오."],
      bold: ["여기가 아니다.", "다시 해라.", "흐름을 다시 봐라."],
      humble: ["제 자리가 아닌 것 같습니다.", "다시 한번 생각해 주세요.", "조금 더 살펴보셔야 할 것 같습니다."],
      gentle: ["여기는 제 자리가 아닌 것 같아요.", "괜찮아요, 다시 해보세요.", "시간을 다시 따져보시겠어요?"],
      free: ["여긴 아닌데.", "다시 해봐.", "흐름이 좀 어긋났네."],
    },
  },
  en: {
    greeting: {
      loyal: ["Did you call for me?", "I pledge my loyalty.", "I have been awaiting your orders."],
      composed: ["It is a pleasure to meet you.", "Ask me anything.", "I am prepared."],
      bold: ["You called me.", "I am here.", "Did I keep you waiting?"],
      humble: ["Thank you for summoning me.", "I will help as best I can.", "It is an honor to be called."],
      gentle: ["Hello.", "Nice to meet you.", "I hope this is a good encounter."],
      free: ["I'm here.", "You called, right?", "Well, here I am."],
    },
    accused: {
      loyal: ["Were you looking for me?", "If it is an audience, I shall oblige.", "Who is it you seek?"],
      composed: ["You must have your reasons.", "An interesting judgment.", "Let us verify it then."],
      bold: ["You seek me?", "You have good taste.", "Very well, take a closer look."],
      humble: ["Is it me...", "I humbly oblige.", "I hope I am the one you seek."],
      gentle: ["Me...?", "Did it look that way to you?", "It's alright, go ahead and check."],
      free: ["You seek me?", "An interesting eye you have.", "Go ahead and verify."],
    },
    cleared: {
      loyal: ["The one you seek seems to be over there.", "You will surely find them.", "I hope I was of some help."],
      composed: ["Just a little more searching and you will find them.", "The scope is narrowing.", "You are on the right path."],
      bold: ["You are close. Good instincts.", "Try looking over there.", "Sharp eyes, just a little more."],
      humble: ["Please search a little further.", "It is not me, but they are surely here.", "I hope I have been of help on your journey."],
      gentle: ["It seems it is not me. But they must be close.", "Look around a little more.", "You will surely find them."],
      free: ["It is not I. Try elsewhere.", "I wish you well in finding the one you seek.", "Well, I have given you a hint."],
    },
    dawn_guide: {
      loyal: ["Use a hint if you do not know.", "The Eye of Time will show the answer.", "Use the torch if you have it."],
      composed: ["Hints can narrow the scope.", "Gauge the position with the Eye of Time.", "Do not rush if you are unsure."],
      bold: ["Burn a torch if you don't know.", "You have the Eye of Time, don't you?", "Trust your gut instead of worrying."],
      humble: ["Hints will be helpful.", "Try using the Eye of Time.", "You can take your time to think."],
      gentle: ["It would be good to see a hint.", "The Eye of Time will show the way.", "There's no rush, take your time."],
      free: ["Just burn a torch if you don't know.", "There's also that Eye of Time thing.", "Use a hint if you can't guess."],
    },
    duel_charge: {
      loyal: ["Not yet... the blade is not sharp enough.", "I will read one more move.", "I will wait until I see the end."],
      composed: ["There is no reason to rush.", "A blade knows when to be drawn.", "I can see the opponent's breathing."],
      bold: ["Tremble, the end is near.", "It's more fun when it gathers.", "This is not enough yet."],
      humble: ["It is not my turn yet.", "I will watch a little longer.", "Haste makes waste."],
      gentle: ["Please wait a little longer.", "The time is coming.", "I can hold it in for now."],
      free: ["Just a bit more, almost there.", "Doesn't taste like steel yet.", "There's joy in waiting too."],
    },
    duel_strike: {
      loyal: ["As if offering my life, take this!", "This is a blade of loyalty!", "I will end it here!"],
      composed: ["Calculations complete.", "I saw the opening.", "Now is the exact moment."],
      bold: ["I'll chew you up!", "You think you can stand before me?", "Shatter!"],
      humble: ["Forgive me, I cannot stop!", "This is all I can do!", "An unavoidable move!"],
      gentle: ["I'm sorry, I can't hold back!", "It ends here!", "It will hurt, here I go!"],
      free: ["Let's go, one strike!", "Eat this!", "This is getting fun!"],
    },
    duel_brace: {
      loyal: ["My body is a shield.", "This is nothing if it's for my lord.", "I do not kneel."],
      composed: ["I will not be shaken by that.", "I hold an impenetrable formation.", "There are no cracks yet."],
      bold: ["Is that your best?", "It just scratched my armor!", "How amusing, try again."],
      humble: ["I can endure this much.", "It is fine, please do not worry.", "Being hit will not bring me down."],
      gentle: ["It's alright, I'm sturdy.", "I can endure this much.", "It hurts... but I'm fine."],
      free: ["Hey, that doesn't hurt.", "You call this an attack?", "That tickles, hit me harder."],
    },
    duel_debate_charge: {
      loyal: ["Looking for a flaw... there must be one.", "I am devising a move to overturn the premise.", "I see a cliff at the end of their logic."],
      composed: ["Every argument has a crack.", "I doubt the second premise of that syllogism.", "I will trace back from the conclusion."],
      bold: ["Alright, let's see how far this goes.", "Your words will soon choke you.", "The trap is already set."],
      humble: ["Please give me a little more time to think.", "I still lack a clue for a rebuttal.", "Truth escapes those in haste."],
      gentle: ["One moment, I am organizing my thoughts.", "I think I see something strange.", "I need to gather my thoughts."],
      free: ["Wait, something's catching...", "There's a hole in your words, I'm finding it.", "Ah, almost got it."],
    },
    duel_debate_strike: {
      loyal: ["That logic is false from the start!", "I will prove the contradiction, listen!", "I will ask you one thing. Then why is the conclusion different!"],
      composed: ["If the premise is true, the conclusion must be false. Proof complete.", "One line of reductio ad absurdum is enough.", "The causality is reversed. You swapped cause and effect."],
      bold: ["The ground to silence that mouth is right here!", "I will shatter all your words with one sentence!", "You're playing with words because you can't win with logic!"],
      humble: ["Excuse me, but the premise itself is flawed.", "I will cautiously provide a counterexample.", "May I ask one thing? Then how do you explain this?"],
      gentle: ["Excuse me, I think this is a little different.", "Let me ask one thing. Then what about this?", "If that's true, shouldn't this be true as well?"],
      free: ["By that logic, you're the one who's wrong.", "Do you remember what you just said? It's a contradiction.", "Ah, whatever. I'll end it with one word."],
    },
    duel_debate_brace: {
      loyal: ["I am not wrong, the truth has simply not arrived yet.", "This is not defeat. I merely suspended victory.", "The point is different. What you are asking is a trap, not a question."],
      composed: ["That is an impression, not a rebuttal.", "Conclusions differ if premises differ. The problem is wrong, not me.", "Reductio ad absurdum applies both ways. Your conclusion is also impossible."],
      bold: ["You didn't attack me, your words shattered against mine.", "Wrong? The world is just flowing in a different direction from my answer.", "That's not a rebuttal, that's just shouting."],
      humble: ["It is not that I am wrong, but my words are not yet understood.", "Other interpretations are possible. It does not have to be just one right answer.", "Rather than being wrong... we are speaking of the same thing in different languages."],
      gentle: ["You could see it that way, but conversely, I am right.", "It is a difference in perspective, not an error. Both can be right.", "I wasn't attacked, I stepped aside."],
      free: ["That's your emotion, not a counterargument.", "I'm not wrong, you just didn't understand.", "I never changed the subject. You just failed to keep up."],
    },
    recruited: {
      loyal: ["You have found me. I shall serve faithfully.", "I answer the call.", "I will gladly follow."],
      composed: ["You found me at last. Quicker than I expected.", "You have a keen eye.", "There was nowhere left to hide."],
      bold: ["You found me. Impressive.", "Very well, I concede.", "You have earned my respect."],
      humble: ["Thank you for finding me.", "I am humble, but I will lend my strength.", "It is an honor to be found."],
      gentle: ["You found me. I was waiting.", "How nice, I am glad to join you.", "I hope this is a wonderful connection."],
      free: ["You found me. Not bad.", "Well, I've been caught, so I'll follow.", "I was tired of hiding anyway."],
    },
    dawn_wrong: {
      loyal: ["It is not yet the time.", "It seems this is not my place.", "Please look again."],
      composed: ["This position is incorrect.", "Please reconsider.", "Trace the flow of time."],
      bold: ["Not here.", "Do it again.", "Look at the flow again."],
      humble: ["I don't think this is my place.", "Please think again.", "You may need to look closer."],
      gentle: ["This doesn't seem to be my place.", "It's alright, try again.", "Would you re-examine the time?"],
      free: ["Not here.", "Try again.", "The flow is a bit off."],
    },
  }
};

export default defaultLines;
