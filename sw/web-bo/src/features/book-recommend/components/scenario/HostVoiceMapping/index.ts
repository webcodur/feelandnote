export { HostVoiceMapping } from './HostVoiceMapping'
export { isVoiceMismatch } from './utils'
export type { SaveScope, HostVoiceApply } from './types'

// 부모가 HostVoiceMapping 외부에서도 SpeakerEngine 타입을 쓸 수 있게 재export (필요 시).
export type { SpeakerEngine } from '../SpeakerPanel'
