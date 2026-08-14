import type { DialogueLines } from '@/actions/admin/dialogues'
import { DIALOGUE_TYPES } from '@/lib/voice-path'
import type { Locale } from './constants'

export type DialogueSource = {
  [key: string]: string[] | string | undefined
}

export interface DialogueDraft {
  ttsTexts: Record<string, string>
  dialogues: Record<string, string>
  quotes: Record<Locale, string>
  monologues: Record<Locale, string>
}

export interface TtsDraft {
  ttsTexts: Record<string, string>
  dialogues: Record<string, string>
  quotes: Record<Locale, string>
}

interface PrepareDialogueSaveInput extends DialogueDraft {
  linesKo: DialogueSource | null
  linesEn: DialogueSource | null
}

export type DialogueSavePlan =
  | { status: 'ready'; linesKo: DialogueLines; linesEn: DialogueLines }
  | { status: 'blocked'; overrideKeys: string[] }

function readText(lines: DialogueSource | null, key: 'quote' | 'monologue'): string {
  const value = lines?.[key]
  return typeof value === 'string' ? value : ''
}

export function buildInitialDialogueDraft(
  linesKo: DialogueSource | null,
  linesEn: DialogueSource | null,
): DialogueDraft {
  const ttsTexts: Record<string, string> = {}
  const dialogues: Record<string, string> = {}

  for (const loc of ['ko', 'en'] as const) {
    const lines = loc === 'ko' ? linesKo : linesEn
    for (const type of DIALOGUE_TYPES) {
      const values = lines?.[type]
      for (let index = 0; index < 3; index++) {
        const key = `${loc}/${type}-${index + 1}`
        const text = Array.isArray(values) ? values[index] || '' : ''
        dialogues[key] = text
        if (text.trim()) ttsTexts[key] = text
      }
    }

    const quote = readText(lines, 'quote')
    if (quote.trim()) ttsTexts[`${loc}/quote`] = quote
  }

  return {
    ttsTexts,
    dialogues,
    quotes: {
      ko: readText(linesKo, 'quote'),
      en: readText(linesEn, 'quote'),
    },
    monologues: {
      ko: readText(linesKo, 'monologue'),
      en: readText(linesEn, 'monologue'),
    },
  }
}

export function buildDialogueLines(
  existing: DialogueSource | null,
  loc: Locale,
  draft: Pick<DialogueDraft, 'dialogues' | 'quotes' | 'monologues'>,
): DialogueLines {
  const result: DialogueSource = { ...existing }

  for (const type of DIALOGUE_TYPES) {
    result[type] = [
      draft.dialogues[`${loc}/${type}-1`] || '',
      draft.dialogues[`${loc}/${type}-2`] || '',
      draft.dialogues[`${loc}/${type}-3`] || '',
    ]
  }
  result.quote = draft.quotes[loc] ?? ''

  const monologue = draft.monologues[loc] ?? ''
  if (monologue.trim() || existing?.monologue !== undefined) result.monologue = monologue

  return result as unknown as DialogueLines
}

export function findTtsOverrides(draft: TtsDraft): string[] {
  return Object.entries(draft.ttsTexts)
    .filter(([fullKey, value]) => {
      const [, key] = fullKey.split('/', 2)
      const storedValue = key === 'quote'
        ? draft.quotes[fullKey.startsWith('en/') ? 'en' : 'ko']
        : draft.dialogues[fullKey]
      return value !== (storedValue ?? '')
    })
    .map(([fullKey]) => fullKey)
}

export function applyTtsOverride(draft: TtsDraft, fullKey: string): TtsDraft {
  const value = draft.ttsTexts[fullKey] ?? ''
  const [loc, key] = fullKey.split('/', 2) as [Locale, string]

  if (key === 'quote') {
    return { ...draft, quotes: { ...draft.quotes, [loc]: value } }
  }

  return { ...draft, dialogues: { ...draft.dialogues, [fullKey]: value } }
}

export function prepareDialogueSave(input: PrepareDialogueSaveInput): DialogueSavePlan {
  const overrideKeys = findTtsOverrides(input)
  if (overrideKeys.length > 0) return { status: 'blocked', overrideKeys }

  return {
    status: 'ready',
    linesKo: buildDialogueLines(input.linesKo, 'ko', input),
    linesEn: buildDialogueLines(input.linesEn, 'en', input),
  }
}
