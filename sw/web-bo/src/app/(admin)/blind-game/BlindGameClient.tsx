'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Gamepad2, Trophy, Flame, Target, Crown, Medal, Award, Trash2, Eye } from 'lucide-react'
import {
  PageHeader,
  Badge,
  Avatar,
  Pagination,
  Drawer,
  ConfirmDialog,
  ActionDropdown,
  EmptyState,
  Button,
} from '@/components/ui'

interface Score {
  id: string
  user_id: string
  score: number
  streak: number
  played_at: string
  user: { id: string; nickname: string | null; avatar_url: string | null } | null
}

interface TopPlayer {
  user_id: string
  score: number
  user: { id: string; nickname: string | null; avatar_url: string | null } | null
}

interface Props {
  scores: Score[]
  total: number
  page: number
  totalPages: number
  stats: { maxScore: number; maxStreak: number; avgScore: number }
  topPlayers: TopPlayer[]
}

const PODIUM_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600']
const PODIUM_ICONS = [Crown, Medal, Award]

export default function BlindGameClient({
  scores,
  total,
  page,
  totalPages,
  stats,
  topPlayers,
}: Props) {
  const router = useRouter()
  const [selectedScore, setSelectedScore] = useState<Score | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Score | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    await new Promise((r) => setTimeout(r, 500))
    setIsDeleting(false)
    setDeleteTarget(null)
    router.refresh()
  }

  const buildHref = (p: number) => {
    if (p <= 1) return '/blind-game'
    return `/blind-game?page=${p}`
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="블라인드 게임"
        description={`총 ${total.toLocaleString()}개의 게임 기록`}
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Trophy className="w-5 h-5 text-accent" />
            </div>
            <span className="text-sm text-text-secondary">최고 점수</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{stats.maxScore.toLocaleString()}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-sm text-text-secondary">최장 연속</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{stats.maxStreak}연속</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Target className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-sm text-text-secondary">평균 점수</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{stats.avgScore.toLocaleString()}</p>
        </div>
      </div>

      {/* 상위 플레이어 */}
      {topPlayers.length > 0 && (
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            TOP 3 플레이어
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topPlayers.map((player, idx) => {
              const Icon = PODIUM_ICONS[idx]
              return (
                <Link
                  key={player.user_id}
                  href={`/members/${player.user?.id}`}
                  className="flex items-center gap-3 p-4 bg-bg-secondary rounded-xl hover:bg-bg-secondary/80 transition-colors"
                >
                  <div className="relative">
                    <Avatar src={player.user?.avatar_url} name={player.user?.nickname} size="lg" />
                    <div className={`absolute -top-1 -right-1 ${PODIUM_COLORS[idx]}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">
                      {player.user?.nickname || '알 수 없음'}
                    </p>
                    <p className="text-sm text-accent font-semibold">
                      {player.score.toLocaleString()}점
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* 전체 기록 테이블 */}
      {scores.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl">
          <EmptyState icon={Gamepad2} title="게임 기록이 없습니다" />
        </div>
      ) : (
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-bg-secondary border-b border-border">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">순위</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">플레이어</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">점수</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">연속</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">플레이 일시</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {scores.map((score, idx) => {
                const rank = (page - 1) * 30 + idx + 1
                return (
                  <tr
                    key={score.id}
                    className="hover:bg-bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedScore(score)}
                  >
                    <td className="py-3 px-4">
                      {rank <= 3 ? (
                        <Badge variant={rank === 1 ? 'warning' : rank === 2 ? 'default' : 'orange'}>
                          {rank}위
                        </Badge>
                      ) : (
                        <span className="text-sm text-text-secondary">{rank}위</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/members/${score.user?.id}`}
                        className="flex items-center gap-2 hover:text-accent"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Avatar src={score.user?.avatar_url} name={score.user?.nickname} size="sm" />
                        <span className="text-sm text-text-primary">
                          {score.user?.nickname || '알 수 없음'}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-semibold text-accent">
                        {score.score.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-text-primary flex items-center gap-1">
                        <Flame className="w-4 h-4 text-orange-500" />
                        {score.streak}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-text-secondary">{formatDateTime(score.played_at)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <ActionDropdown
                        items={[
                          { key: 'view', label: '상세보기', icon: Eye, onClick: () => setSelectedScore(score) },
                          { key: 'delete', label: '삭제', icon: Trash2, variant: 'danger', onClick: () => setDeleteTarget(score) },
                        ]}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} href={buildHref} />

      {/* 상세 Drawer */}
      <Drawer
        isOpen={!!selectedScore}
        onClose={() => setSelectedScore(null)}
        title="게임 기록 상세"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedScore(null)}>닫기</Button>
            <Button
              variant="danger"
              onClick={() => {
                setDeleteTarget(selectedScore)
                setSelectedScore(null)
              }}
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </Button>
          </>
        }
      >
        {selectedScore && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-bg-secondary rounded-xl">
              <Avatar src={selectedScore.user?.avatar_url} name={selectedScore.user?.nickname} size="lg" />
              <div>
                <p className="font-medium text-text-primary">
                  {selectedScore.user?.nickname || '알 수 없음'}
                </p>
                <Link href={`/members/${selectedScore.user?.id}`} className="text-sm text-accent hover:underline">
                  프로필 보기
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-bg-secondary rounded-xl p-4 text-center">
                <Trophy className="w-8 h-8 text-accent mx-auto mb-2" />
                <p className="text-2xl font-bold text-text-primary">{selectedScore.score.toLocaleString()}</p>
                <p className="text-sm text-text-secondary">점수</p>
              </div>
              <div className="bg-bg-secondary rounded-xl p-4 text-center">
                <Flame className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-text-primary">{selectedScore.streak}</p>
                <p className="text-sm text-text-secondary">연속 정답</p>
              </div>
            </div>

            <div>
              <label className="text-xs text-text-secondary mb-1 block">플레이 일시</label>
              <p className="text-sm text-text-primary">{formatDateTime(selectedScore.played_at)}</p>
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="기록 삭제"
        description="이 게임 기록을 삭제하시겠습니까?"
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
