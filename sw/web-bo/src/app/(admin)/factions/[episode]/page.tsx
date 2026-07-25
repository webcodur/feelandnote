import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Layers, Users } from 'lucide-react'
import { loadFactionScript } from '@/actions/admin/factions/script'

/**
 * 세력도 편집 화면 — **아직 옮겨오는 중**이다.
 *
 * 이 단계(4a)는 데이터·파일 계약만 완성했다. 편집 화면 본체(세력·인물 패널, 사진 고르기,
 * 대사·음성, 미리보기)는 다음 단계에서 이 자리에 얹힌다. 그때 이 파일이 편집기 뼈대가 된다.
 *
 * 지금도 불러오기는 실제로 동작하므로, 아래 숫자가 맞게 보이면 데이터층이 제대로 붙은 것이다.
 */
export default async function FactionEpisodePage({
  params,
}: {
  params: Promise<{ episode: string }>
}) {
  const { episode } = await params
  const folder = decodeURIComponent(episode)

  let loaded: Awaited<ReturnType<typeof loadFactionScript>>
  try {
    loaded = await loadFactionScript(folder)
  } catch {
    notFound()
  }

  const groups = (loaded.script.groups ?? []) as { clusters?: { people?: unknown[] }[] }[]
  const clusterCount = groups.reduce((s, g) => s + (g.clusters?.length ?? 0), 0)
  const personCount = groups.reduce(
    (s, g) => s + (g.clusters ?? []).reduce((x, c) => x + (c.people?.length ?? 0), 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/factions"
          className="rounded-lg p-2 text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-text-primary">
            {String(loaded.script.title ?? folder).split('\n')[0]}
          </h1>
          <p className="font-mono text-xs text-text-secondary">{folder}</p>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-accent/50 bg-accent/5 p-6">
        <p className="text-sm font-semibold text-accent">편집 화면을 옮겨오는 중입니다</p>
        <p className="mt-2 text-sm text-text-secondary">
          세력·인물·대사를 고치는 화면은 아직 영상 관리 대시보드에 있습니다.
          이 자리에는 그 화면이 그대로 들어옵니다. 지금은 데이터가 제대로 읽히는지만 확인할 수 있습니다.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={<Layers className="h-4 w-4" />} label="세력" value={groups.length} />
        <Stat icon={<Layers className="h-4 w-4" />} label="묶음" value={clusterCount} />
        <Stat icon={<Users className="h-4 w-4" />} label="인물" value={personCount} />
      </div>

      <dl className="rounded-xl border border-border bg-bg-secondary p-4 text-sm">
        <Row label="진행 상태" value={loaded.status} />
        <Row label="편성" value={loaded.registered ? `등록 (${loaded.sortOrder}번)` : '미등록'} />
        <Row label="마지막 저장" value={new Date(loaded.updatedAt).toLocaleString('ko-KR')} />
      </dl>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <div className="flex items-center gap-1.5 text-xs text-text-secondary">{icon}{label}</div>
      <div className="mt-1 text-2xl font-bold text-text-primary">{value}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-2 last:border-b-0">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="text-text-primary">{value}</dd>
    </div>
  )
}
