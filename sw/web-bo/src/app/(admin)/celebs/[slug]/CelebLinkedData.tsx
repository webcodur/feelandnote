'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { CelebLinkedData } from '@/actions/admin/celeb-linked-data'

/* 인물 상세의 연결 데이터 읽기 전용 구획 — 원전·등장 작품, 인물 관계, 연표.
   수정은 각 담당 화면에서 하며 여기는 보여주기만 한다. */

const REL_TYPE_LABELS: Record<string, string> = {
  father: '부',
  mother: '모',
  parent: '부모',
  child: '자녀',
  spouse: '배우자',
  partner: '동반자',
  sibling: '형제자매',
  relative: '친족',
  counterpart: '대응인물',
  teacher: '스승',
  student: '제자',
  influence: '영향',
  influenced: '영향받음',
  cofounder: '공동창업',
  colleague: '동료',
  friend: '지기',
  rival: '맞수',
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  appearance: '등장',
  related: '연관',
}

function Section({ title, count, linkHref, linkLabel, defaultOpen = false, children }: {
  title: string
  count: number
  linkHref: string
  linkLabel: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full p-4 flex items-center justify-between hover:bg-white/5">
        <h2 className="text-base font-semibold text-text-primary">
          {title} <span className="text-xs font-normal text-text-secondary">{count}건</span>
        </h2>
        <div className="flex items-center gap-3">
          {open ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {children}
          <div className="pt-1">
            <Link href={linkHref} className="text-xs text-accent hover:underline">
              {linkLabel} →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CelebLinkedData({ data, slug }: { data: CelebLinkedData; slug: string }) {
  return (
    <div className="space-y-4">
      <Section title="원전 · 등장 작품" count={data.sources.length} linkHref="/figure-books" linkLabel="인물 도서에서 편집">
        {data.sources.length === 0 && (
          <p className="text-xs text-text-secondary">연결된 작품이 없다.</p>
        )}
        {data.sources.map((source) => (
          <div key={source.content_id} className="p-3 bg-bg-secondary/50 border border-border rounded-lg space-y-1">
            <p className="text-sm font-medium text-text-primary">
              {source.title_ko ?? source.content_id}
              <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                {SOURCE_TYPE_LABELS[source.relation_type] ?? source.relation_type}
              </span>
            </p>
            {source.description && (
              <p className="text-xs text-text-secondary leading-relaxed">{source.description}</p>
            )}
          </div>
        ))}
      </Section>

      <Section title="인물 관계" count={data.relations.length} linkHref="/celebs" linkLabel="인물 목록으로">
        {data.relations.length === 0 && (
          <p className="text-xs text-text-secondary">연결된 관계가 없다.</p>
        )}
        {data.relations.map((relation) => (
          <div key={`${relation.counterpart_id}-${relation.rel_type}`} className="p-3 bg-bg-secondary/50 border border-border rounded-lg space-y-1">
            <p className="text-sm font-medium text-text-primary">
              {relation.counterpart_slug ? (
                <Link href={`/celebs/${relation.counterpart_slug}`} className="hover:underline">
                  {relation.counterpart_nickname}
                </Link>
              ) : relation.external && relation.qid ? (
                <a
                  href={`https://www.wikidata.org/wiki/${relation.qid}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  {relation.counterpart_nickname}
                </a>
              ) : (
                relation.counterpart_nickname
              )}
              <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                {REL_TYPE_LABELS[relation.rel_type] ?? relation.rel_type}
              </span>
              {relation.external && (
                <span className="ml-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                  명단 밖 · {relation.qid}
                </span>
              )}
            </p>
            {relation.note && (
              <p className="text-xs text-text-secondary leading-relaxed">{relation.note}</p>
            )}
          </div>
        ))}
      </Section>

      <Section title="연표" count={data.timeline.length} linkHref={`/celebs/timeline/${slug}`} linkLabel="연표 편집기에서 편집" defaultOpen>
        {data.timeline.length === 0 && (
          <p className="text-xs text-text-secondary">등록된 사건이 없다.</p>
        )}
        {data.timeline.map((event) => (
          <div key={event.id} className="p-3 bg-bg-secondary/50 border border-border rounded-lg space-y-1">
            <p className="text-[11px] text-text-tertiary">
              {event.sequence_label ?? (event.year != null ? String(event.year) : '시기 미상')}
            </p>
            <p className="text-sm font-medium text-text-primary">{event.title}</p>
            {event.description && (
              <p className="text-xs text-text-secondary leading-relaxed">{event.description}</p>
            )}
          </div>
        ))}
      </Section>
    </div>
  )
}
