# AI Word Bank

Use this file as a candidate list, not as proof that a text is AI-written. A single word is weak evidence. Treat these items as prompts to check context, repetition, and register fit.

This word bank is an original SDS working list built from public research signals and Korean editing judgment.

**These lists are detection priors, not banned words.** A precise everyday word (`효율적`, `효과적`, `강력한`) standing alone is normal human writing — flag it only when the same family clusters densely or repeats mechanically. When replacing repeated hits, rotate among different substitutes instead of converging on one; if the flagged word is the most accurate term in context, keeping it is the correct edit.

## Research Basis

- Large-scale PubMed studies found an abrupt rise in style words after ChatGPT became widely used. The strongest signal is a cluster of repeated style words, not one isolated word.
- Later lexical-overrepresentation research highlights English words such as `delve`, `intricate`, and `underscore` as unusually frequent in scientific English after LLM adoption.
- AI-detection guidance repeatedly warns that one phrase is not decisive; many weak signals, repetition, lack of specific evidence, and overly smooth neutral voice matter together.
- Korean AI-writing guidance commonly points to repeated paragraph shapes, repeated transitions such as conclusion markers, generic claims, and a lack of concrete perspective.

Source links used for this bank:

- https://arxiv.org/html/2406.07016v1
- https://arxiv.org/abs/2412.11385
- https://www.pangram.com/blog/how-to-create-evidence-for-an-ai-detection-case
- https://editnow.uk/blog/chatgpt-report-detection-ko
- https://kr.linkedin.com/pulse/how-tell-copy-written-ai-nik-hewitt-1mhie?tl=ko

## W-1 Label And Transition Markers

Check when these appear at paragraph starts, repeat across sections, or announce logic that the sentence already shows.

Candidates:

- `결론적으로`, `요약하면`, `정리하자면`
- `중요한 점은`, `주목할 만한 점은`, `본질적으로`, `궁극적으로`
- `이러한 맥락에서`, `이를 통해`, `더 나아가`
- repeated `또한`, `따라서`, `그러나`, `즉`
- whole-sentence markers that announce the next sentence's function:
  `정리하면 이렇습니다`, `검토에 옮기면 이렇게 됩니다`, `여기서부터 …이 필요합니다`,
  `결론은 이렇게 갈랐습니다`, `배운 건 분명합니다`

Repair direction:

- Delete the label if the paragraph already concludes.
- Merge the transition into the claim.
- Use a concrete noun or verb from the surrounding sentence instead of a generic signpost.
- **Do not delete needed logical connectives.** A `그래서`/`그러나`/`그리고` that marks a real
  result/contrast/addition between two sentences is a human signal (see F. Flow Break in
  `signal-taxonomy.md`) — W-1 covers decorative announcements and mechanical repetition, not logic.

## W-2 Hollow Importance And Praise

Check when the word intensifies a weak claim without adding evidence.

Candidates:

- `혁신적`, `획기적`, `강력한`, `효과적`, `효율적`
- `핵심적`, `중추적`, `중요한`, `유의미한`, `의미 있는`
- `포괄적`, `종합적`, `다각적`, `다양한`, `풍부한`
- `빠르게 변화하는`, `끊임없이 변화하는`, `지속가능한`

Repair direction:

- Replace the adjective with the actual reason if the reason exists.
- If no reason exists, lower the sentence to a plain claim.
- Keep the word when it is a defined domain term or supported metric.

## W-3 Translated English LLM Cliches

Check when English-like metaphors appear in Korean without local idiom value.

| English family | Korean candidates | Repair direction |
|---|---|---|
| delve / deep dive | `깊이 파고들다`, `심층적으로 탐구하다` | `살펴보다`, `분석하다`, or name the exact action |
| intricate / complex interplay | `복잡한 상호작용`, `정교한 관계망` | describe the relation directly |
| underscore / highlight | `강조하다`, `잘 보여준다` | keep only when it states who stresses what |
| landscape / realm | `디지털 환경`, `생태계`, `영역` | use the concrete market, system, group, or document |
| tapestry / web | `촘촘히 얽힌`, `거미줄 같은`, `복합적인` | say which factors connect |
| pivotal / crucial | `중요한`, `결정적인`, `핵심적인` | state the consequence |
| robust / seamless | `견고한`, `강력한`, `매끄러운` | name the failure handled or friction removed |
| comprehensive / holistic | `포괄적인`, `종합적인`, `총체적인` | list the included scope or reduce the claim |
| leverage / harness | `활용하다`, `이용하다` | use `쓰다`, `적용하다`, `기반으로 삼다`, or a domain verb |
| unlock / open up | `가능성을 열다`, `잠재력을 끌어내다` | state the concrete new action |
| navigate | `탐색하다`, `헤쳐나가다` | use `검토하다`, `처리하다`, `대응하다` |

## W-4 Over-Smooth Structure

Check for surface regularity rather than a specific word.

Signals:

- Every paragraph starts with a transition.
- Consecutive bullets share the same grammar.
- A short answer is split into many labelled sections.
- The text explains obvious background before the real point.

Repair direction:

- Keep headings only when they help scanning.
- Vary only the parts that feel mechanical.
- Remove basic explanations when the target reader already knows them.

## W-5 Safety Fog

Check when caution words stack until the stance disappears.

Candidates:

- repeated `가능성이 있습니다`, `할 수 있습니다`, `필요가 있습니다`
- `신중하게`, `균형 있게`, `양쪽 모두`, `종합적으로 고려`
- `일반적으로`, `대체로`, `상대적으로`, `어느 정도`

Repair direction:

- Keep uncertainty when the source is uncertain.
- Remove duplicate hedging.
- If the source supports it, state the position directly.

## W-6 Marketing And Tech Hype

Check when the text sounds like generic SaaS copy or press-release language.

Candidates:

- `최첨단`, `차세대`, `게임 체인저`, `시너지`
- `혁신적인 솔루션`, `확장 가능한 솔루션`, `엔드투엔드`
- `원활한 경험`, `사용자 중심`, `디지털 전환`
- `새로운 지평`, `미래를 선도`, `경쟁력을 강화`

Repair direction:

- Replace hype with the actual feature, result, or constraint.
- Keep product terms only when they are official naming.

## W-7 Academic And Report Fillers

Check when report-style endings sound complete but add no information.

Candidates:

- `시사하는 바가 크다`
- `향후 연구가 필요하다`
- `중요한 과제로 남아 있다`
- `긍정적인 영향을 미칠 것으로 기대된다`
- `다양한 이해관계자와의 협력이 필요하다`

Repair direction:

- Name the implication, future task, stakeholder, or expected effect.
- If the source lacks that information, shorten the sentence instead of inventing detail.

## Application Rules

1. Do not run blind find-and-replace.
2. Check repetition first. Two or three repeated signals matter more than one normal word.
3. Preserve domain terms, official product names, security terms, and quoted text.
4. Prefer concrete nouns and verbs already present in the source.
5. Do not make official writing casual merely to remove AI tone.
