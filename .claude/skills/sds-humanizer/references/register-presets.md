# Register Presets

Use these presets to keep endings and distance consistent.

**Preservation default**: the target register is the source's own register (diagnosed in the Source
Profile) unless the user explicitly chooses a switch. Removing AI tells never requires changing
register — a stiff `~습니다` document becomes a natural `~습니다` document, not a `~해요` one.

**Blog / essay / 회고 (any register, including `~습니다`)**: naturalness = fewer function markers +
merged parallel sentences + concrete closes + restored logical connectives
(`rewriting-playbook.md` Pass 5.5). That is machine-trace removal, not a register change — needed
logical connectives (`그래서`/`그러나`/`그리고`) are kept, only decorative repeated markers go.

## formal-polite

Aliases: 격식체, 하십시오체, ㅂ니다체, B니다, `~습니다`.

Use for reports, notices, proposals, formal emails, executive summaries.

Endings:

- `~합니다`, `~입니다`, `~되었습니다`, `~확인했습니다`

Avoid:

- sudden `~해요`
- slang
- inflated slogans
- overly literary phrasing

## polite-conversational

Aliases: 경어체, 해요체, 부드러운 존댓말.

Use for email, help text, user-facing explanations, friendly summaries.

Endings:

- `~해요`, `~이에요`, `~드릴게요`, `~확인해 주세요`

Avoid:

- excessive apology
- vague cushion words in every sentence
- business-report stiffness

## plain-analytical

Aliases: 평서체, 한다체, 분석체.

Use for analysis, research notes, technical commentary, columns.

Endings:

- `~다`, `~한다`, `~볼 수 있다` only when uncertainty is real

Avoid:

- lecture-like formulas
- closing slogans
- unnecessary signposting

## casual

Aliases: 구어체, 친근한 말투.

Use for blog/SNS/community/internal writing when the user wants a natural human voice.

Allowed:

- shorter sentences
- light contractions
- selective first person

Avoid:

- forced jokes
- unnatural youth slang
- changing the writer's stance

## agent-interpreter

Use for agent reports, logs, tool results, build/test summaries.

Tone:

- easy Korean
- concise explanation
- verified/unverified separation

Keep:

- raw IDs, hashes, commands, paths, PR/issue numbers
- error names and test names

## Ambiguous "경서체"

Treat "경서체" as likely typo or shorthand. If context is formal writing, map to formal-polite. If context is direct user-facing conversation, ask whether the user meant 경어체 or 격식체.
