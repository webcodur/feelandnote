'use client'

import { ArrowRight, Link2 } from 'lucide-react'
import { useState } from 'react'
import type { AudioJob } from '@/lib/types'

export function NewJobForm({ onCreated }: { onCreated: (job: AudioJob) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(formData: FormData) {
    setBusy(true)
    setError('')
    const payload = { name: String(formData.get('name')), sourceUrl: String(formData.get('sourceUrl')), speaker: String(formData.get('speaker')) }
    const response = await fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const result = await response.json() as AudioJob | { message: string }
    if (response.ok) onCreated(result as AudioJob)
    if (!response.ok) setError('message' in result ? result.message : '작업을 만들지 못했습니다.')
    setBusy(false)
  }

  return <form action={submit} className="border border-line bg-panel p-5 shadow-2xl shadow-black/30"><div className="mb-5 flex items-center gap-3"><span className="grid size-9 place-items-center border border-signal text-signal"><Link2 size={17} /></span><div><p className="text-sm text-signal">새 영상 가져오기</p><h2 className="font-display text-xl">작업 만들기</h2></div></div><div className="grid gap-3"><Field name="name" label="작업 이름" placeholder="공항 인터뷰" /><Field name="speaker" label="저장 이름" placeholder="park" pattern="[A-Za-z0-9-]+" /><Field name="sourceUrl" label="유튜브 주소" placeholder="https://youtube.com/watch?v=..." type="url" /></div><p className="mt-3 text-sm leading-6 text-muted">시간을 계산할 필요가 없습니다. 영상을 가져온 뒤 재생 화면에서 사용할 부분을 고릅니다.</p><button type="submit" disabled={busy} className="mt-5 flex w-full items-center justify-between bg-signal px-4 py-3 text-sm font-semibold text-ink disabled:opacity-50">{busy ? '작업 만드는 중' : '영상 작업 만들기'} <ArrowRight size={17} /></button>{error && <p role="alert" className="mt-3 border-s-2 border-danger ps-3 text-sm leading-6 text-danger">{error}</p>}</form>
}

type FieldProps = { name: string; label: string; placeholder: string; type?: string; pattern?: string }
function Field({ name, label, placeholder, type = 'text', pattern }: FieldProps) {
  return <label className="block"><span className="mb-1.5 block text-sm text-muted">{label}</span><input required name={name} type={type} pattern={pattern} placeholder={placeholder} className="w-full border border-line bg-ink px-3 py-2.5 text-base outline-none focus:border-signal" /></label>
}
