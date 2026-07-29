'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const SERIES = 'book-recommend'

type CelebResult = {
  id: string
  slug: string
  nickname: string
  nickname_en: string
  title: string | null
  profession: string | null
  avatar_url: string | null
  has_voice: boolean
  voice_id_ko: string | null
  celeb_tier: string | null
  birth_date: string | null
  death_date: string | null
  existingEpisode: string | null
}

const PROFESSIONS = [
  '', '정치/군사', '철학/사상', '과학/기술', '예술/문학', '경제/경영',
  '종교/영성', '탐험/모험', '사회/운동', '교육/학술', '연예/스포츠',
]

export default function SearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  useEffect(() => { document.title = '새 에피소드 — Feel & Note BO' }, [])
  const [profession, setProfession] = useState('')
  const [hasVoice, setHasVoice] = useState(false)
  const [results, setResults] = useState<CelebResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const search = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (profession) params.set('profession', profession)
      if (hasVoice) params.set('hasVoice', 'true')
      params.set('limit', '50')

      const [celebRes, episodeRes] = await Promise.all([
        fetch(`/api/celebs/search?${params}`),
        fetch(`/api/${SERIES}/episodes`),
      ])
      if (!celebRes.ok) throw new Error('셀럽 검색에 실패했습니다.')
      if (!episodeRes.ok) throw new Error('로컬 에피소드 목록을 읽지 못했습니다.')

      const celebData = await celebRes.json() as { celebs?: CelebResult[] }
      const episodeData = await episodeRes.json() as Array<{ name: string }>
      const episodeNames = new Set(episodeData.map(episode => episode.name.replace(/-en$/, '')))
      setResults((celebData.celebs ?? []).map(celeb => ({
        ...celeb,
        existingEpisode: episodeNames.has(celeb.slug) ? SERIES : null,
      })))
    } catch (reason) {
      setResults([])
      setError(reason instanceof Error ? reason.message : '검색에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [query, profession, hasVoice])

  const scaffold = async (slug: string) => {
    if (!confirm(`${slug}의 서재 탐방 에피소드를 생성하시겠습니까?`)) return
    try {
      const res = await fetch(`/api/${SERIES}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      if (res.ok) {
        router.push(`/${SERIES}/${slug}`)
      } else {
        const err = await res.json()
        alert('실패: ' + (err.error ?? '알 수 없는 오류'))
      }
    } catch {
      alert('네트워크 오류')
    }
  }

  const eraLabel = (birth: string | null, death: string | null) => {
    if (!birth) return ''
    const y = new Date(birth).getFullYear()
    return death ? `${y}–${new Date(death).getFullYear()}` : `${y}–`
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold mb-1">새 에피소드</h1>
          <p className="text-sm text-text-secondary">본 서비스의 셀럽과 콘텐츠로 서재 탐방 작업 폴더를 생성합니다.</p>
        </div>
        <Link href="/book-recommend" className="text-sm font-semibold text-accent hover:text-accent-hover">
          제작 현황으로
        </Link>
      </div>

      {/* 검색 바 */}
      <div className="flex flex-wrap gap-2 mb-6">
        <input
          type="text"
          placeholder="이름 검색..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          className="bg-bg-card border border-border rounded-md px-3 py-2 text-sm w-64 focus:outline-none focus:border-accent"
        />
        <select value={profession} onChange={e => setProfession(e.target.value)}
          className="bg-bg-card border border-border rounded-md px-2 py-2 text-sm">
          <option value="">전체 직군</option>
          {PROFESSIONS.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={hasVoice} onChange={e => setHasVoice(e.target.checked)} />
          음성 보유
        </label>
        <button onClick={search}
          className="bg-accent text-bg-main px-4 py-2 rounded-md text-sm font-semibold hover:bg-accent-hover">
          검색
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* 결과 */}
      {loading ? (
        <div className="text-text-dim text-sm py-8">검색 중...</div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-card text-left text-xs text-text-secondary">
                <th className="px-3 py-2">인물</th>
                <th className="px-3 py-2">직군</th>
                <th className="px-3 py-2">시대</th>
                <th className="px-3 py-2">티어</th>
                <th className="px-3 py-2">음성</th>
                <th className="px-3 py-2">에피소드</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {results.map(c => (
                <tr key={c.id} className="border-t border-border hover:bg-bg-hover">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {c.avatar_url && (
                        <img src={c.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      )}
                      <div>
                        <div className="font-semibold">{c.nickname}</div>
                        <div className="text-[10px] text-text-dim">{c.nickname_en}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-text-secondary">{c.profession ?? '–'}</td>
                  <td className="px-3 py-2.5 text-text-secondary text-xs">{eraLabel(c.birth_date, c.death_date)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] px-1.5 py-px rounded ${
                      c.celeb_tier === 'full' ? 'bg-success text-success-text' : 'bg-bg-card text-text-dim'
                    }`}>{c.celeb_tier ?? '–'}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {c.has_voice
                      ? <span className="text-success-text text-xs">● 있음</span>
                      : <span className="text-text-dim text-xs">없음</span>
                    }
                  </td>
                  <td className="px-3 py-2.5">
                    {c.existingEpisode ? (
                      <Link href={`/${c.existingEpisode}/${c.slug}`}
                        className="text-accent hover:text-accent-hover text-xs">
                        {c.existingEpisode} →
                      </Link>
                    ) : (
                      <span className="text-text-dim text-xs">없음</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {!c.existingEpisode && (
                      <button onClick={() => scaffold(c.slug)}
                        className="text-[11px] bg-bg-card border border-border px-2 py-1 rounded hover:bg-bg-hover">
                        스캐폴딩
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-text-dim py-8 text-sm">
                    검색어를 입력하거나 필터를 선택하세요
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
