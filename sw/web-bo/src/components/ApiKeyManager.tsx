'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Key, Trash2, Edit2, Check, AlertCircle, Clock, BarChart3 } from 'lucide-react'
import Button from '@/components/ui/Button'
import {
  getApiKeys,
  createApiKey,
  updateApiKey,
  deleteApiKey,
  getApiKeyUsage,
  type ApiKeyWithStats,
  type ApiKeyUsage,
} from '@/actions/admin/api-keys'

interface Props {
  isOpen: boolean
  onClose: () => void
  selectedKeyId: string | null
  onSelectKey: (keyId: string | null) => void
}

export default function ApiKeyManager({ isOpen, onClose, selectedKeyId, onSelectKey }: Props) {
  const [keys, setKeys] = useState<ApiKeyWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 폼 상태
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    api_key: '',
    google_id: '',
    memo: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // 사용 기록 뷰
  const [usageKeyId, setUsageKeyId] = useState<string | null>(null)
  const [usageData, setUsageData] = useState<ApiKeyUsage[]>([])
  const [usageLoading, setUsageLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadKeys()
    }
  }, [isOpen])

  async function loadKeys() {
    setLoading(true)
    setError(null)
    const result = await getApiKeys()
    if (result.success && result.data) {
      setKeys(result.data)
    } else {
      setError(result.error || '키를 불러올 수 없습니다.')
    }
    setLoading(false)
  }

  async function handleSubmit() {
    if (!formData.title.trim() || !formData.api_key.trim()) return

    setSubmitting(true)
    setError(null)

    const result = editingId
      ? await updateApiKey(editingId, formData)
      : await createApiKey(formData)

    if (result.success) {
      await loadKeys()
      resetForm()
    } else {
      setError(result.error || '저장에 실패했습니다.')
    }
    setSubmitting(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('이 API 키를 삭제하시겠습니까?')) return

    const result = await deleteApiKey(id)
    if (result.success) {
      if (selectedKeyId === id) {
        onSelectKey(null)
      }
      await loadKeys()
    } else {
      setError(result.error || '삭제에 실패했습니다.')
    }
  }

  function startEdit(key: ApiKeyWithStats) {
    setEditingId(key.id)
    setFormData({
      title: key.title,
      api_key: key.api_key,
      google_id: key.google_id || '',
      memo: key.memo || '',
    })
    setShowForm(true)
  }

  function resetForm() {
    setShowForm(false)
    setEditingId(null)
    setFormData({ title: '', api_key: '', google_id: '', memo: '' })
  }

  async function loadUsage(keyId: string) {
    setUsageKeyId(keyId)
    setUsageLoading(true)
    const result = await getApiKeyUsage(keyId)
    if (result.success && result.data) {
      setUsageData(result.data)
    }
    setUsageLoading(false)
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">API 키 관리</h2>
          </div>
          <Button unstyled onClick={onClose} className="p-2 text-text-secondary hover:text-text-primary rounded">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* 사용 기록 뷰 */}
          {usageKeyId && (
            <div className="bg-bg-secondary rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  사용 기록
                </h3>
                <Button
                  unstyled
                  onClick={() => setUsageKeyId(null)}
                  className="text-xs text-text-secondary hover:text-text-primary"
                >
                  닫기
                </Button>
              </div>

              {usageLoading ? (
                <p className="text-sm text-text-secondary">로딩 중...</p>
              ) : usageData.length === 0 ? (
                <p className="text-sm text-text-secondary">사용 기록이 없습니다.</p>
              ) : (
                <div className="max-h-48 overflow-auto space-y-1">
                  {usageData.map((u) => (
                    <div
                      key={u.id}
                      className={`flex items-center justify-between text-xs py-1.5 px-2 rounded ${
                        u.success ? 'bg-green-500/10' : 'bg-red-500/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={u.success ? 'text-green-400' : 'text-red-400'}>
                          {u.success ? '✓' : '✗'}
                        </span>
                        <span className="text-text-primary">{u.action_type}</span>
                        {u.error_code && (
                          <span className="text-red-400">({u.error_code})</span>
                        )}
                      </div>
                      <span className="text-text-secondary">{formatTime(u.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 키 추가/수정 폼 */}
          {showForm && (
            <div className="bg-bg-secondary rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-text-primary">
                {editingId ? '키 수정' : '새 키 추가'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">타이틀 *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="테스트 키 1"
                    className="w-full px-3 py-2 bg-bg-card border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Google ID</label>
                  <input
                    type="text"
                    value={formData.google_id}
                    onChange={(e) => setFormData({ ...formData, google_id: e.target.value })}
                    placeholder="example@gmail.com"
                    className="w-full px-3 py-2 bg-bg-card border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">API 키 *</label>
                <input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder="AIza..."
                  className="w-full px-3 py-2 bg-bg-card border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">메모</label>
                <input
                  type="text"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  placeholder="자유 메모"
                  className="w-full px-3 py-2 bg-bg-card border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={resetForm}>
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={submitting || !formData.title.trim() || !formData.api_key.trim()}
                >
                  {submitting ? '저장 중...' : editingId ? '수정' : '추가'}
                </Button>
              </div>
            </div>
          )}

          {/* 키 목록 */}
          {loading ? (
            <p className="text-center text-text-secondary py-8">로딩 중...</p>
          ) : keys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-50" />
              <p className="text-text-secondary">등록된 API 키가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {keys.map((key) => {
                const isSelected = selectedKeyId === key.id
                const has429 = key.today_429_count > 0

                return (
                  <div
                    key={key.id}
                    className={`border rounded-lg p-3 ${
                      isSelected
                        ? 'border-accent bg-accent/5'
                        : has429
                          ? 'border-yellow-500/50 bg-yellow-500/5'
                          : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* 선택 라디오 */}
                        <Button
                          unstyled
                          onClick={() => onSelectKey(isSelected ? null : key.id)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-accent bg-accent'
                              : 'border-border hover:border-accent'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </Button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-text-primary">{key.title}</span>
                            {has429 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                                429 x{key.today_429_count}
                              </span>
                            )}
                          </div>
                          {key.google_id && (
                            <p className="text-xs text-text-secondary">{key.google_id}</p>
                          )}
                          {key.memo && (
                            <p className="text-xs text-text-secondary italic">{key.memo}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* 오늘 사용량 */}
                        <span className="text-xs text-text-secondary mr-2">
                          오늘: {key.today_success}회
                        </span>

                        <Button
                          unstyled
                          onClick={() => loadUsage(key.id)}
                          className="p-1.5 text-text-secondary hover:text-accent rounded"
                          title="사용 기록"
                        >
                          <Clock className="w-4 h-4" />
                        </Button>
                        <Button
                          unstyled
                          onClick={() => startEdit(key)}
                          className="p-1.5 text-text-secondary hover:text-accent rounded"
                          title="수정"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          unstyled
                          onClick={() => handleDelete(key.id)}
                          className="p-1.5 text-text-secondary hover:text-red-400 rounded"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <p className="text-xs text-text-secondary">
            {selectedKeyId
              ? `선택된 키: ${keys.find(k => k.id === selectedKeyId)?.title || '알 수 없음'}`
              : '자동 선택 모드 (가장 여유 있는 키 사용)'}
          </p>
          <div className="flex items-center gap-2">
            {!showForm && (
              <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4" />
                키 추가
              </Button>
            )}
            <Button size="sm" onClick={onClose}>
              닫기
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
