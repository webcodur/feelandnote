# 정형원(Hyung Won Chung) 발언 조사

AI 연구자. 한국계. Google Brain → OpenAI(o1·o1-preview 핵심 기여, Deep Research, Codex mini 학습 주도) → 2025년 7월 Meta Superintelligence Lab 합류(동료 Jason Wei와 동반 이직). MIT 박사. 대표 강연 "Don't teach. Incentivize."(MIT EI seminar)로 유명. 대사화 가능한 발언 정리. verbatim(원문 그대로)만 채택, 동명이인·타인 발언 제외, 추측·창작 없음. 한국어 1차 소스(한국어 매체·정리글)까지 함께 확인했다.

조사일: 2026-06-25

---

## 인물 확정

- Hyung Won Chung(정형원). AI 연구자. 한국 출신, MIT 박사.
- 경력: Google Brain(스케일링 병목 해결 담당) → OpenAI(o1·o1-preview·Deep Research 기여, OpenAI o1의 유일한 한국인 기여자로 보도됨) → 2025년 7월 Meta Superintelligence Lab 합류.
- 강연자로 유명. MIT EI seminar "Don't teach. Incentivize: Scale-first view of Large Language Models", Stanford CS25 V4, 서울대(SNU GSDS) 세미나, NYU CSCI 2590 등.
- 핵심 사상: 스케일 우선(scale-first) 관점, 비터 레슨(bitter lesson) 계열의 "구조를 덜 부여하고 연산을 더 쓴다", "가르치지 말고 인센티브를 줘라(Don't teach. Incentivize)", "yet의 관점"·끊임없는 언러닝(unlearning).

## 1차 소스(핵심)

- **MIT EI seminar "Don't teach. Incentivize." 슬라이드 본문 전문**(PDF 전사). 본인 작성 발표 자료로, 아래 슬라이드 인용은 그 문구 그대로다. 강연 영상: youtube.com/watch?v=kYWUEV_e2ss
- 슬라이드는 본인이 쓴 1인칭 발표문이므로 verbatim 어록으로 채택. 영상 음성에서 즉흥으로 덧붙인 구어 발화는 자막 직접 전사를 못 해 제외했다(아래 미확보 영역 참조).

## 검증 주의 (오귀속·패러프레이즈 경계)

- 한국어 정리글(maily.so, 링크드인 등)에 도는 "Show the model the taste of fish, then keep it hungry. Then AI will learn essential abilities like patience and choosing good bait through trial and error." / "Human intelligence and machine intelligence are different. Rather than teaching machines by human standards..." 류 → **정리자가 해설·재작문한 문장**으로 의심됨. 슬라이드 원문은 "Teach him the taste of fish and make him hungry"(아래 8번)이다. 재작문 의심 문구는 제외.
- 36kr 영문 기사의 인용 일부는 중→영 재번역을 거친 것이라 단어 단위 verbatim 보장이 약하다. 해당 항목(아래 9·10번)은 "재번역 주의"로 표시한다.
- 2차 요약 사이트(getrecall 등)의 "the dominant driving force is the exponential decrease in compute costs" 류는 **요약자 서술**이라 verbatim 아님. 슬라이드 원문 "Compute cost is decreasing exponentially"(아래 6번)로 대체.

---

## 주제별 발언

### 🧠 가르치지 말고 인센티브를 줘라 (정체성의 핵심)

**1. 인센티브를 줘라, 직접 가르치지 말고** — 대사화 1순위
> "More generally, we should incentivize models instead of directly teaching specific skills."

"더 일반적으로 말하면, 우리는 모델에게 특정 기술을 직접 가르치기보다 인센티브를 줘야 한다."
- 출처: MIT EI seminar "Don't teach. Incentivize." 슬라이드(Closing)
- 태그: 철학·인센티브

**2. 능력은 가르쳐서가 아니라 인센티브로 창발한다** — 사상 요약
> "In order for abilities to emerge, they should be incentivized as opposed to being directly taught."

"능력이 창발하려면, 그것은 직접 가르쳐지는 게 아니라 인센티브로 유도되어야 한다."
- 출처: MIT EI seminar 슬라이드(Massive multitask learning hypothesis)
- 태그: 철학·창발

**3. 약하게 인센티브를 주는 쪽이 더 잘 확장된다**
> "Weakly incentivizing the model requires a lot more compute, i.e. it is a more scalable teaching strategy."

"모델에 약하게 인센티브를 주는 방식은 훨씬 더 많은 연산을 요구한다. 다시 말해 그쪽이 더 잘 확장되는 가르침 전략이다."
- 출처: MIT EI seminar 슬라이드
- 태그: 인센티브·스케일링

### 📈 비터 레슨·스케일 우선 (사상의 골격)

**4. 인간이 구조를 더 부여할수록 덜 확장된다** — 비터 레슨 한 줄
> "The more structure imposed by humans, the less scalable the method is."

"인간이 구조를 더 부여할수록, 그 방법은 덜 확장된다."
- 출처: MIT EI seminar 슬라이드
- 태그: 비터레슨·스케일링

**5. 장기에 좋은 것은 단기엔 거의 반드시 나빠 보인다** — 짧은 한 방
> "What is good in the long run almost necessarily looks bad in the short term."

"장기적으로 좋은 것은, 단기에는 거의 반드시 나빠 보인다."
- 출처: MIT EI seminar 슬라이드(Sobering observation)
- 태그: 통찰·장기관점

**6. 연산은 우리가 연구자로 나아지는 속도보다 빠르게 싸진다** — 핵심 통찰
> "Compute is getting cheaper faster than we are becoming better researchers."

"연산은 우리가 더 나은 연구자가 되는 속도보다 더 빠르게 싸지고 있다."
- 출처: MIT EI seminar 슬라이드(Sobering observation)
- 태그: 연산·스케일링

**7. 기계에 더 많은 자유도를 줘라, 스스로 배우게 하라** — 대사화 강력
> "Give machines more degrees of freedom. Let them choose how they learn."

"기계에 더 많은 자유도를 줘라. 어떻게 배울지는 그들이 고르게 하라."
- 출처: MIT EI seminar 슬라이드(Sobering observation)
- 태그: 철학·자율

**8. 물고기 맛을 알려주고 배고프게 하라** — 비유, 화제성
> "Teach him the taste of fish and make him hungry."

"그에게 물고기 맛을 알려주고, 그를 배고프게 하라."
- 출처: MIT EI seminar 슬라이드(Loose analogy. "물고기를 주면 하루, 잡는 법을 가르치면 평생"이라는 속담을 한 단계 더 밀어붙인 표현)
- 태그: 비유·인센티브

**9. 영리한 구조는 확장하면 결국 병목이 된다**
> "Clever structures posed by human researchers typically become the bottleneck when scaled up."

"인간 연구자가 세운 영리한 구조는 규모를 키우면 대개 병목이 된다."
- 출처: MIT EI seminar 슬라이드(Sobering observation)
- 태그: 비터레슨·병목

**10. 스케일링은 병목 가정을 찾아 더 확장 가능한 것으로 갈아끼우는 일** — 본인 정의
> "Scaling implicitly involves identifying the modeling assumption that bottlenecks further scaling and replacing it with a more scalable one."

"스케일링이란, 더 큰 확장을 가로막는 모델링 가정을 찾아내 더 잘 확장되는 가정으로 갈아끼우는 일을 암묵적으로 포함한다."
- 출처: MIT EI seminar 슬라이드(HWC's definition of scaling. 통념인 "같은 일을 더 많은 기계로 하는 것"과 구분지어 본인 정의로 제시)
- 태그: 스케일링·정의

### 🔄 'yet'의 관점·언러닝 (변화의 속도)

**11. "안 된다"가 아니라 "아직 안 된다"** — 관점 전환, 대사화 좋음
> "This idea doesn't work yet."

"이 아이디어는 아직 안 되는 것이다."
- 출처: MIT EI seminar 슬라이드(Perspective of "yet". "This idea doesn't work"를 "...yet"으로 바꿔 보는 관점)
- 태그: 관점·낙관

**12. 끊임없이 언러닝해야 한다**
> "We need to constantly unlearn intuitions built on such invalidated ideas."

"우리는 그렇게 무효가 된 아이디어 위에 쌓인 직관을 끊임없이 버려야(언러닝해야) 한다."
- 출처: MIT EI seminar 슬라이드(Need for constant unlearning. 규모가 커지면 많은 아이디어가 낡아 무효가 된다는 맥락)
- 태그: 언러닝·변화

**13. 버릴 게 적은 신참이 베테랑보다 유리할 수 있다** — 통찰
> "With less to unlearn, newcomers can have advantages over more experienced ones."

"버릴 것이 더 적기에, 신참이 더 경험 많은 사람보다 유리할 수 있다."
- 출처: MIT EI seminar 슬라이드(Need for constant unlearning)
- 태그: 언러닝·역설

### ⚡ AI 변화의 속도 (OpenAI 퇴사 후 발언, 재번역 주의)

**14. 입력의 작은 변화가 출력의 거대한 변화를 부른다** — 재번역 주의
> "Through a certain mechanism, a small or even zero change in input can bring about a large or even huge change in output."

"어떤 메커니즘을 통해, 입력의 작은 변화 혹은 변화가 거의 없는 상태조차 출력에 크거나 심지어 거대한 변화를 일으킬 수 있다."
- 출처: 36kr(영문판) "O1 핵심 기여자의 OpenAI 퇴사 후 첫 공개 발언" 기사 인용. AI를 '지렛대(leverage)'로 본 발언. **중→영 재번역 경유라 단어 단위 verbatim 보장 약함**
- 태그: AI지렛대·통찰

**15. 역사상 가장 빠른 기술이지만, 단위는 분·시간이 아니라 해·수십 년** — 재번역 주의
> "Artificial intelligence may be the fastest-developing technology in history, but its development is not measured in minutes or hours, but in years or even decades."

"인공지능은 역사상 가장 빠르게 발전하는 기술일지 모르나, 그 발전은 분이나 시간이 아니라 해, 심지어 수십 년 단위로 측정된다."
- 출처: 36kr(영문판) 기사 인용. AI 변화의 속도 체감에 대한 발언. **재번역 경유라 verbatim 보장 약함**
- 태그: AI속도·통찰

---

## 대사화 우선순위

| 용도 | 추천 발언 |
|------|-----------|
| 대표 1줄 | 1번(인센티브를 줘라, 직접 가르치지 말고) |
| 짧은 한 방 | 5번(장기에 좋은 것은 단기엔 나빠 보인다) / 11번("아직" 안 된다) |
| 사상 골격 | 4번(구조를 더 부여할수록 덜 확장) + 6번(연산이 우리보다 빠르게 싸진다) |
| 비유·화제성 | 8번(물고기 맛을 알려주고 배고프게 하라) |
| 자율·철학 | 7번(기계에 더 많은 자유도를) |
| 변화의 속도 | 13번(버릴 게 적은 신참이 유리) / 15번(분·시간이 아닌 해·수십 년 단위) |

## 미확보·주의 영역

- 위 1~13번은 본인 작성 MIT 슬라이드 본문 전문에서 직접 채취해 1차 출처가 견고하다. 다만 강연 음성에서 즉흥으로 덧붙인 구어 발화는 자막 직접 전사를 하지 못해 제외했다(YouTube 봇 차단). 추후 영상 자막 전사 시 보강 가치 있음.
- 14·15번은 OpenAI 퇴사 후 발언으로 화제성은 높으나, 영문 기사가 중국어를 거쳐 재번역된 인용이라 단어 단위 verbatim 신뢰도가 떨어진다. 원 발화(영어 강연·인터뷰) 직접 확보 시 교체 권장.
- Stanford CS25 V4, 서울대(SNU GSDS), NYU 강연 영상 존재. 슬라이드·자막 직접 전사는 미완(봇 차단). 다수 2차 요약은 verbatim이 아니라 채택하지 않음.
- 본인 X(@hwchung27) 어록성 게시물은 표본이 작다. 개인 사이트(hwchung2.github.io)에는 인용 가능한 철학 문장이 별도로 없고 약력 중심이다.
- 한국어 1차 발화(한국어 강연·인터뷰)는 "정형원" 키워드로 탐색했으나, 확인된 것은 대부분 영어 MIT 강연을 한국어로 요약·해설한 2차 정리글이었다. 한국어 verbatim 직접 발화는 미확보. 추후 서울대 세미나 영상 한국어 발화 전사 시 보강 가치 있음.
