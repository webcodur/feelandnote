// 셀럽 프롬프트 - ai-services에서 re-export
import { buildInfluencePrompt } from '@feelnnote/ai-services/celeb-profile'

export {
  BO_BASIC_PROFILE_PROMPT as BASIC_PROFILE_JSON_PROMPT,
  PHILOSOPHY_PROMPT,
} from '@feelnnote/ai-services/prompts/celeb-profile-prompt'

export function getInfluenceJSONPrompt(name = '[인물명]', description = '[인물 설명]'): string {
  return buildInfluencePrompt({ name, description })
}
