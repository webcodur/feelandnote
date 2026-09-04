'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, Star, ExternalLink } from 'lucide-react'
import CopyButton from './CopyButton'
import { LangModeSwitch } from '@/contexts/LangModeContext'

interface CelebDetailHeaderProps {
  slug: string
  nickname: string
  title?: string | null
  headline?: string | null
  headlineEn?: string | null
  celebId: string
  claimedBy: string | null | undefined
  createdAt: string
  isVerified: boolean
  status: 'active' | 'inactive'
  tier: 'full' | 'light'
  reality: 'REAL' | 'BOTH' | 'FICTION'
  contentCount?: number
  onVerified: (value: boolean) => void
  onStatus: (value: 'active' | 'inactive') => void
  onTier: (value: 'full' | 'light') => void
  onReality: (value: 'REAL' | 'BOTH' | 'FICTION') => void
}

export default function CelebDetailHeader({
  slug,
  nickname,
  title,
  headline,
  headlineEn,
  celebId,
  claimedBy,
  createdAt,
  isVerified,
  status,
  tier,
  reality,
  contentCount = 0,
  onVerified,
  onStatus,
  onTier,
  onReality,
}: CelebDetailHeaderProps) {
  const webBaseUrl =
    process.env.NEXT_PUBLIC_WEB_URL ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : 'https://feelandnote.com')

  return (
    <header className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-3">
      <Link
        href="/celebs"
        className="mt-0.5 p-2 hover:bg-bg-secondary rounded-lg active:scale-95 transition-transform"
      >
        <ArrowLeft className="w-5 h-5 text-text-secondary" />
      </Link>

      <div className="min-w-0 space-y-2.5">
        {/* Title row & Nav tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-text-primary">{nickname || '이름 없음'}</h1>
              {title && (
                <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                  {title}
                </span>
              )}
            </div>

            {/* Quick nav tabs */}
            {slug && (
              <nav className="flex flex-wrap items-center gap-1.5 pl-2 border-l border-border/80">
                <span className="rounded-lg border border-accent/40 bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent">
                  상세·열전
                </span>
                <Link
                  href={`/celebs/${slug}/contents`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-card px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-bg-secondary hover:text-text-primary active:scale-95 transition-transform"
                >
                  <span>콘텐츠</span>
                  <span className="rounded-full bg-bg-secondary px-1.5 py-0.2 text-[11px] font-mono text-text-primary">
                    {contentCount}
                  </span>
                </Link>
                <Link
                  href={`/celebs/timeline/${slug}`}
                  className="rounded-lg border border-border bg-bg-card px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-bg-secondary hover:text-text-primary active:scale-95 transition-transform"
                >
                  연표·타임라인
                </Link>
                <Link
                  href={`/celebs/voice-gen/${slug}`}
                  className="rounded-lg border border-border bg-bg-card px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-bg-secondary hover:text-text-primary active:scale-95 transition-transform"
                >
                  음성 작업실
                </Link>
                <a
                  href={`${webBaseUrl}/ko/celeb/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/20 active:scale-95 transition-transform"
                >
                  <span>웹에서 보기</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </nav>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Field label="lang">
              <LangModeSwitch />
            </Field>
          </div>
        </div>

        {/* Headline block */}
        {(headline || headlineEn) && (
          <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm bg-bg-secondary/40 border border-border/60 rounded-lg px-3 py-1.5 w-fit">
            <span className="font-medium text-text-primary">{headline || '한 줄 정의 없음'}</span>
            {headlineEn && (
              <span className="text-xs text-text-tertiary border-l border-border pl-2">
                {headlineEn}
              </span>
            )}
          </div>
        )}

        {/* Status toggles */}
        <div className="flex flex-wrap items-center gap-4">
          <Field label="is_verified">
            <button
              type="button"
              onClick={() => onVerified(!isVerified)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium active:scale-95 transition-transform ${
                isVerified
                  ? 'border-blue-400/30 bg-blue-500/10 text-blue-400'
                  : 'border-border bg-bg-card text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
              }`}
            >
              <Star className="w-3 h-3" />
              {isVerified ? '인증됨' : '미인증'}
            </button>
          </Field>
          <Field label="status">
            <ChoiceGroup
              value={status}
              onChange={onStatus}
              options={[
                { value: 'active', label: '활성' },
                { value: 'inactive', label: '비공개' },
              ]}
            />
          </Field>
          <Field label="celeb_tier">
            <ChoiceGroup
              value={tier}
              onChange={onTier}
              options={[
                { value: 'full', label: 'full' },
                { value: 'light', label: 'light', className: 'bg-orange-500/15 text-orange-400' },
              ]}
            />
          </Field>
          {/* 실존 축은 티어와 독립이다. 목록 노출과 상세의 [사실]·[가상] 칩을 이 값이 가른다 */}
          <Field label="celeb_reality">
            <ChoiceGroup
              value={reality}
              onChange={onReality}
              options={[
                { value: 'REAL', label: '사실' },
                { value: 'BOTH', label: '사실+가상', className: 'bg-amber-500/15 text-amber-400' },
                { value: 'FICTION', label: '가상', className: 'bg-purple-500/15 text-purple-400' },
              ]}
            />
          </Field>
        </div>

        {/* Metadata info */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Field label="claimed_by">
            <span className="text-xs text-text-primary">{claimedBy ? '됨' : '안 됨'}</span>
          </Field>
          <Field label="created_at">
            <span className="text-xs text-text-primary">{new Date(createdAt).toLocaleDateString('ko-KR')}</span>
          </Field>
          <Field label="id">
            <span className="flex items-center gap-1 text-[11px] font-mono text-text-tertiary select-all">
              {celebId}
              <CopyButton text={celebId} />
            </span>
          </Field>
          {slug && (
            <Field label="slug">
              <span className="flex items-center gap-1 text-[11px] font-mono text-text-tertiary select-all">
                /{slug}
                <CopyButton text={slug} />
              </span>
            </Field>
          )}
        </div>
      </div>
    </header>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 font-mono text-[11px] text-text-secondary">{label}</span>
      {children}
    </div>
  )
}

function ChoiceGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; className?: string }[]
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-border">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 text-xs font-medium active:scale-95 transition-transform ${
            value === opt.value
              ? (opt.className ?? 'bg-accent/20 text-accent')
              : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
