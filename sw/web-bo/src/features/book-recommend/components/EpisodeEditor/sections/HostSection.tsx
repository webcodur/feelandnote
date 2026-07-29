import { Section, TextField, FieldWithDuration } from '../fields'
import { LABEL_CLS, INPUT_CLS } from '../constants'
import type { useEpisodeEditor } from '../useEpisodeEditor'

type Ctx = ReturnType<typeof useEpisodeEditor>

export function HostSection({ ctx }: { ctx: Ctx }) {
  const { episode, openSections, toggle, setHost } = ctx
  return (
    <Section id="host" title="HOST" badge={episode.host.nickname} open={!!openSections.host} onToggle={toggle}>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="닉네임" value={episode.host.nickname} onChange={v => setHost('nickname', v)} />
        <TextField label="닉네임 (EN)" value={episode.host.nickname_en} onChange={v => setHost('nickname_en', v)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="직함" value={episode.host.title} onChange={v => setHost('title', v)} />
        <div>
          <label className={LABEL_CLS}>말투 (speech_tone)</label>
          <select value={episode.host.speech_tone} onChange={e => setHost('speech_tone', e.target.value)}
            className={INPUT_CLS}>
            {['bold', 'calm', 'warm', 'composed', 'firm', 'measured', 'eloquent', 'direct', 'reflective', 'authoritative'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      <FieldWithDuration label="대표 명언" value={episode.host.featuredQuote ?? ''} onChange={v => setHost('featuredQuote', v)}
        duration={episode.host.featuredQuoteDuration} rows={2} />
      <FieldWithDuration label="감상철학" value={episode.host.philosophy ?? ''} onChange={v => setHost('philosophy', v)}
        duration={episode.host.voiceDuration} rows={4} />
      <TextField label="아바타 URL" value={episode.host.avatar_url} readOnly />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="ElevenLabs Voice ID" value={episode.host.elevenlabsVoiceId ?? ''} onChange={v => setHost('elevenlabsVoiceId', v)} />
        <TextField label="Gemini Voice" value={episode.host.geminiVoice ?? ''} onChange={v => setHost('geminiVoice', v)} />
      </div>
    </Section>
  )
}
