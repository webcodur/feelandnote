'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Check, Plus, Trash2, BookOpen } from 'lucide-react'
import {
  getDeepProfile,
  saveDeepProfile,
  type DeepProfile,
  type DeepAnecdote,
} from '@/actions/admin/deep-profile'
import { useToast } from '@/contexts/ToastContext'

interface Props {
  celebId: string
  slug: string
}

const EMPTY_ANECDOTE: DeepAnecdote = { title: '', body: '', source: '', period: '' }

export default function DeepProfileSection({ celebId, slug }: Props) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [bioTitle, setBioTitle] = useState('')
  const [bioBody, setBioBody] = useState('')
  const [anecdotes, setAnecdotes] = useState<DeepAnecdote[]>([])
  const [exists, setExists] = useState(false)

  useEffect(() => {
    getDeepProfile(celebId).then((data) => {
      if (data) {
        setBioTitle(data.biography.title)
        setBioBody(data.biography.body)
        setAnecdotes(data.anecdotes)
        setExists(true)
      }
      setLoading(false)
    })
  }, [celebId])

  const updateAnecdote = useCallback(
    (index: number, field: keyof DeepAnecdote, value: string) => {
      setAnecdotes((prev) =>
        prev.map((a, i) => (i === index ? { ...a, [field]: value } : a))
      )
    },
    []
  )

  const addAnecdote = () => setAnecdotes((prev) => [...prev, { ...EMPTY_ANECDOTE }])
  const removeAnecdote = (index: number) =>
    setAnecdotes((prev) => prev.filter((_, i) => i !== index))

  async function handleSave() {
    if (!bioTitle.trim() || !bioBody.trim()) {
      showToast('error', '열전 제목과 본문을 입력해주세요.')
      return
    }
    setSaving(true)
    try {
      const data: DeepProfile = {
        version: 1,
        celeb_id: celebId,
        slug,
        locale: 'ko',
        biography: { title: bioTitle.trim(), body: bioBody.trim() },
        anecdotes: anecdotes.filter((a) => a.title.trim() && a.body.trim()),
      }
      await saveDeepProfile(data)
      setExists(true)
      showToast('success', '심화 열전이 저장되었습니다.')
    } catch {
      showToast('error', '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-text-secondary">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Status */}
      {exists && (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <BookOpen className="w-3.5 h-3.5" />
          R2에 등록됨
        </div>
      )}

      {/* Biography */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-text-secondary">열전 제목</p>
        <input
          type="text"
          value={bioTitle}
          onChange={(e) => setBioTitle(e.target.value)}
          placeholder="예: 르네상스의 만능인, 레오나르도 다 빈치"
          className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-text-secondary">
          열전 본문 <span className="text-text-tertiary">({bioBody.length}자)</span>
        </p>
        <textarea
          value={bioBody}
          onChange={(e) => setBioBody(e.target.value)}
          placeholder="A4 1장 분량의 심화 열전 (약 2,000자)"
          rows={12}
          className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-y leading-relaxed"
        />
      </div>

      {/* Anecdotes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-text-secondary">
            일화 ({anecdotes.length}건)
          </p>
          <button
            type="button"
            onClick={addAnecdote}
            className="flex items-center gap-1 px-2 py-1 text-xs text-accent hover:bg-accent/10 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            추가
          </button>
        </div>

        {anecdotes.map((anecdote, i) => (
          <div
            key={i}
            className="p-3 bg-bg-secondary/50 border border-border rounded-lg space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-text-tertiary">
                #{i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeAnecdote(i)}
                className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <input
              type="text"
              value={anecdote.title}
              onChange={(e) => updateAnecdote(i, 'title', e.target.value)}
              placeholder="일화 제목"
              className="w-full px-2 py-1.5 text-sm bg-bg-secondary border border-border rounded text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
            />
            <textarea
              value={anecdote.body}
              onChange={(e) => updateAnecdote(i, 'body', e.target.value)}
              placeholder="일화 내용"
              rows={4}
              className="w-full px-2 py-1.5 text-sm bg-bg-secondary border border-border rounded text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-y leading-relaxed"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={anecdote.source}
                onChange={(e) => updateAnecdote(i, 'source', e.target.value)}
                placeholder="출처"
                className="flex-1 px-2 py-1.5 text-xs bg-bg-secondary border border-border rounded text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
              />
              <input
                type="text"
                value={anecdote.period}
                onChange={(e) => updateAnecdote(i, 'period', e.target.value)}
                placeholder="시기 (예: 1480s)"
                className="w-32 px-2 py-1.5 text-xs bg-bg-secondary border border-border rounded text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2 border-t border-border">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          {exists ? '업데이트' : '저장'}
        </button>
      </div>
    </div>
  )
}
