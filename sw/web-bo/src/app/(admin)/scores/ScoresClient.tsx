'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trophy, TrendingUp, Star, Clock, Crown, Medal, Award, Eye, Trash2 } from 'lucide-react'
import {
  PageHeader,
  Badge,
  Avatar,
  FilterChips,
  Pagination,
  Drawer,
  ConfirmDialog,
  ActionDropdown,
  EmptyState,
  Button,
} from '@/components/ui'

const SCORE_ACTION_CONFIG: Record<string, { label: string; color: 'info' | 'success' | 'purple' | 'warning' | 'danger' | 'pink' | 'orange' | 'cyan' }> = {
  content_add: { label: '콘텐츠 등록', color: 'success' },
  content_complete: { label: '콘텐츠 완료', color: 'info' },
  record_add: { label: '기록 작성', color: 'purple' },
  note_add: { label: '노트 작성', color: 'warning' },
  login_daily: { label: '일일 로그인', color: 'cyan' },
  follow: { label: '팔로우', color: 'pink' },
  title_unlock: { label: '칭호 해금', color: 'orange' },
}

interface Ranking {
  user_id: string
  activity_score: number
  title_bonus: number
  total_score: number
  user: { id: string; nickname: string | null; avatar_url: string | null; profile_type: string | null } | null
}

interface ScoreLog {
  id: string
  user_id: string
  type: string
  action: string
  amount: number
  created_at: string
  user: { id: string; nickname: string | null; avatar_url: string | null } | null
}

interface Props {
  rankings: Ranking[]
  recentLogs: ScoreLog[]
  tab: string
  page: number
  totalPages: number
  stats: { maxScore: number; avgScore: number; totalScore: number }
  tabOptions: { value: string; label: string; count?: number }[]
}

const PODIUM_ICONS = [Crown, Medal, Award]
const PODIUM_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600']

export default function ScoresClient({
  rankings,
  recentLogs,
  tab,
  page,
  totalPages,
  stats,
  tabOptions,
}: Props) {
  const [selectedRanking, setSelectedRanking] = useState<Ranking | null>(null)
  const [selectedLog, setSelectedLog] = useState<ScoreLog | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ScoreLog | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    await new Promise((r) => setTimeout(r, 500))
    setIsDeleting(false)
    setDeleteTarget(null)
  }

  const buildHref = (params: { page?: number; tab?: string }) => {
    const sp = new URLSearchParams()
    const t = params.tab ?? tab
    if (t && t !== 'ranking') sp.set('tab', t)
    if (params.page && params.page > 1) sp.set('page', String(params.page))
    const q = sp.toString()
    return `/scores${q ? `?${q}` : ''}`
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="점수 / 랭킹"
        description="사용자 점수 및 활동 로그 관리"
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-bg-card border border-border rounded-xl p-4 md:p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-sm text-text-secondary">최고 점수</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{stats.maxScore.toLocaleString()}점</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm text-text-secondary">평균 점수</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{stats.avgScore.toLocaleString()}점</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Star className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-sm text-text-secondary">총 점수</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{stats.totalScore.toLocaleString()}점</p>
        </div>
      </div>

      {/* 탭 */}
      <FilterChips options={tabOptions} value={tab} href={(v) => buildHref({ tab: v })} />

      {/* 랭킹 테이블 */}
      {tab === 'ranking' ? (
        rankings.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-xl">
            <EmptyState icon={Trophy} title="점수 데이터가 없습니다" />
          </div>
        ) : (
          <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-bg-secondary border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary w-16">순위</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">사용자</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">활동 점수</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">칭호 보너스</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">총점</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rankings.map((ranking, idx) => {
                  const rank = (page - 1) * 50 + idx + 1
                  const Icon = rank <= 3 ? PODIUM_ICONS[rank - 1] : null

                  return (
                    <tr
                      key={ranking.user_id}
                      className="hover:bg-bg-secondary/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedRanking(ranking)}
                    >
                      <td className="py-3 px-4">
                        {rank <= 3 ? (
                          <div className="flex items-center gap-1">
                            {Icon && <Icon className={`w-5 h-5 ${PODIUM_COLORS[rank - 1]}`} />}
                          </div>
                        ) : (
                          <span className="text-sm text-text-secondary">{rank}위</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/members/${ranking.user?.id}`}
                          className="flex items-center gap-3 hover:text-accent"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Avatar src={ranking.user?.avatar_url} name={ranking.user?.nickname} size="sm" />
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-text-primary">{ranking.user?.nickname || '알 수 없음'}</span>
                            {ranking.user?.profile_type === 'CELEB' && (
                              <Badge variant="purple" size="sm">셀럽</Badge>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm text-text-primary">{ranking.activity_score.toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm text-orange-400">+{ranking.title_bonus.toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm font-semibold text-yellow-400">{ranking.total_score.toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4">
                        <ActionDropdown
                          items={[
                            { key: 'view', label: '상세보기', icon: Eye, onClick: () => setSelectedRanking(ranking) },
                          ]}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* 점수 로그 테이블 */
        recentLogs.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-xl">
            <EmptyState icon={TrendingUp} title="점수 로그가 없습니다" />
          </div>
        ) : (
          <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-bg-secondary border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">사용자</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">타입</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">액션</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">점수</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">시간</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentLogs.map((log) => {
                  const actionConfig = SCORE_ACTION_CONFIG[log.action] || { label: log.action, color: 'default' as const }

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-bg-secondary/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`/members/${log.user?.id}`}
                          className="flex items-center gap-2 hover:text-accent"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Avatar src={log.user?.avatar_url} name={log.user?.nickname} size="sm" />
                          <span className="text-sm text-text-primary">{log.user?.nickname || '알 수 없음'}</span>
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={log.type === 'activity' ? 'info' : 'orange'} size="sm">
                          {log.type === 'activity' ? '활동' : '칭호'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={actionConfig.color} size="sm">{actionConfig.label}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`text-sm font-medium ${log.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {log.amount >= 0 ? '+' : ''}{log.amount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm text-text-secondary flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(log.created_at)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <ActionDropdown
                          items={[
                            { key: 'view', label: '상세보기', icon: Eye, onClick: () => setSelectedLog(log) },
                            { key: 'delete', label: '삭제', icon: Trash2, variant: 'danger', onClick: () => setDeleteTarget(log) },
                          ]}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      <Pagination page={page} totalPages={totalPages} href={(p) => buildHref({ page: p })} />

      {/* 랭킹 상세 Drawer */}
      <Drawer
        isOpen={!!selectedRanking}
        onClose={() => setSelectedRanking(null)}
        title="랭킹 상세"
        footer={<Button variant="secondary" onClick={() => setSelectedRanking(null)}>닫기</Button>}
      >
        {selectedRanking && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-bg-secondary rounded-xl">
              <Avatar src={selectedRanking.user?.avatar_url} name={selectedRanking.user?.nickname} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-text-primary">{selectedRanking.user?.nickname || '알 수 없음'}</p>
                  {selectedRanking.user?.profile_type === 'CELEB' && <Badge variant="purple">셀럽</Badge>}
                </div>
                <Link href={`/members/${selectedRanking.user?.id}`} className="text-sm text-accent hover:underline">
                  프로필 보기
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-bg-secondary rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-text-primary">{selectedRanking.activity_score.toLocaleString()}</p>
                <p className="text-xs text-text-secondary">활동 점수</p>
              </div>
              <div className="bg-bg-secondary rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-orange-400">+{selectedRanking.title_bonus.toLocaleString()}</p>
                <p className="text-xs text-text-secondary">칭호 보너스</p>
              </div>
              <div className="bg-bg-secondary rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-yellow-400">{selectedRanking.total_score.toLocaleString()}</p>
                <p className="text-xs text-text-secondary">총점</p>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* 로그 상세 Drawer */}
      <Drawer
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="점수 로그 상세"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedLog(null)}>닫기</Button>
            <Button variant="danger" onClick={() => { setDeleteTarget(selectedLog); setSelectedLog(null) }}>
              <Trash2 className="w-4 h-4" />삭제
            </Button>
          </>
        }
      >
        {selectedLog && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-bg-secondary rounded-xl">
              <Avatar src={selectedLog.user?.avatar_url} name={selectedLog.user?.nickname} size="lg" />
              <div>
                <p className="font-medium text-text-primary">{selectedLog.user?.nickname || '알 수 없음'}</p>
                <Link href={`/members/${selectedLog.user?.id}`} className="text-sm text-accent hover:underline">
                  프로필 보기
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-text-secondary mb-1 block">타입</label>
                <Badge variant={selectedLog.type === 'activity' ? 'info' : 'orange'}>
                  {selectedLog.type === 'activity' ? '활동' : '칭호'}
                </Badge>
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">액션</label>
                <Badge variant={SCORE_ACTION_CONFIG[selectedLog.action]?.color || 'default'}>
                  {SCORE_ACTION_CONFIG[selectedLog.action]?.label || selectedLog.action}
                </Badge>
              </div>
            </div>

            <div className="bg-bg-secondary rounded-xl p-4 text-center">
              <p className={`text-3xl font-bold ${selectedLog.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {selectedLog.amount >= 0 ? '+' : ''}{selectedLog.amount}
              </p>
              <p className="text-sm text-text-secondary">점수 변동</p>
            </div>

            <div>
              <label className="text-xs text-text-secondary mb-1 block">발생 시간</label>
              <p className="text-sm text-text-primary">{formatDateTime(selectedLog.created_at)}</p>
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="로그 삭제"
        description="이 점수 로그를 삭제하시겠습니까?"
        confirmLabel="삭제"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  )
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
