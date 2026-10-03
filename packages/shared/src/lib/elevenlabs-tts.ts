import defaults from '../bo/voice-utils/elevenlabs-defaults.json'

export type ElevenlabsSpeechSettings = Partial<Omit<typeof defaults, 'modelId'>>

/** Shared request contract for previews and production synthesis. */
export function elevenlabsSpeechBody(text: string, settings: ElevenlabsSpeechSettings = {}, modelId = defaults.modelId) {
  const values = {
    stability: settings?.stability ?? defaults.stability,
    similarity_boost: settings?.similarity_boost ?? defaults.similarity_boost,
    speed: settings?.speed ?? defaults.speed,
    style: settings?.style ?? defaults.style,
  }
  return {
    text,
    model_id: modelId,
    voice_settings: {
      stability: values.stability,
      similarity_boost: values.similarity_boost,
      speed: values.speed,
      // GET /v1/models reports that v4 cannot use style or speaker boost.
      ...(modelId.startsWith('eleven_v4') ? {} : { style: values.style }),
    },
  }
}

export function fetchElevenlabsSpeech(apiKey: string, voiceId: string, text: string, settings?: ElevenlabsSpeechSettings) {
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    cache: 'no-store',
    body: JSON.stringify(elevenlabsSpeechBody(text, settings)),
  })
}
