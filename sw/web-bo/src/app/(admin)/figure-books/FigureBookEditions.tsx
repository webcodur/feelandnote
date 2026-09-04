'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Link2, Loader2, PackageX, Plus } from 'lucide-react'
import {
  deactivateFigureBookProduct,
  replaceFigureBookProduct,
  saveFigureBookEdition,
  type FigureBookEditionAdminItem,
} from '@/actions/admin/figure-books'

interface FigureBookEditionsProps {
  contentId: string
  sourceTitle: string
  editions: FigureBookEditionAdminItem[]
}

type EditionForm = {
  editionId?: number
  locale: 'ko' | 'en'
  title: string
  creator: string
  description: string
  isbn: string
  publisher: string
  thumbnailUrl: string
  releaseDate: string
  editionKind: string
  textScope: string
  sortOrder: number
  verified: boolean
}

type ProductForm = {
  platform: 'coupang' | 'amazon'
  productId: string
  productUrl: string
  affiliateUrl: string
  evidence: string
}

function toEditionForm(edition?: FigureBookEditionAdminItem): EditionForm {
  return edition
    ? {
        editionId: edition.id,
        locale: edition.locale,
        title: edition.title,
        creator: edition.creator ?? '',
        description: edition.description ?? '',
        isbn: edition.isbn ?? '',
        publisher: edition.publisher ?? '',
        thumbnailUrl: edition.thumbnailUrl ?? '',
        releaseDate: edition.releaseDate ?? '',
        editionKind: edition.editionKind ?? '',
        textScope: edition.textScope ?? '',
        sortOrder: edition.sortOrder,
        verified: edition.verified ?? false,
      }
    : {
        locale: 'ko',
        title: '',
        creator: '',
        description: '',
        isbn: '',
        publisher: '',
        thumbnailUrl: '',
        releaseDate: '',
        editionKind: '',
        textScope: '',
        sortOrder: 0,
        verified: false,
      }
}

function toProductForm(
  edition: FigureBookEditionAdminItem | undefined,
  platform: 'coupang' | 'amazon',
): ProductForm {
  const active = edition?.products.find((product) => (
    product.isActive && product.platform === platform
  ))
  return {
    platform,
    productId: active?.productId ?? '',
    productUrl: active?.productUrl ?? '',
    affiliateUrl: active?.affiliateUrl ?? '',
    evidence: active?.qualityEvidence.join('\n') ?? '',
  }
}

const fieldClass = 'w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none'
const labelClass = 'space-y-1 text-xs font-semibold text-text-secondary'

export default function FigureBookEditions({
  contentId,
  sourceTitle,
  editions,
}: FigureBookEditionsProps) {
  const router = useRouter()
  const initial = editions[0]
  const [selectedEditionId, setSelectedEditionId] = useState<number | null>(initial?.id ?? null)
  const [editionForm, setEditionForm] = useState<EditionForm>(() => toEditionForm(initial))
  const [productForm, setProductForm] = useState<ProductForm>(() => (
    toProductForm(initial, initial?.locale === 'en' ? 'amazon' : 'coupang')
  ))
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedEdition = editions.find((edition) => edition.id === selectedEditionId)
  const activeProduct = selectedEdition?.products.find((product) => (
    product.isActive && product.platform === productForm.platform
  ))

  const selectEdition = (edition: FigureBookEditionAdminItem) => {
    const platform = edition.locale === 'en' ? 'amazon' : 'coupang'
    setSelectedEditionId(edition.id)
    setEditionForm(toEditionForm(edition))
    setProductForm(toProductForm(edition, platform))
    setMessage(null)
  }

  const startNewEdition = () => {
    setSelectedEditionId(null)
    setEditionForm({ ...toEditionForm(), sortOrder: editions.length })
    setProductForm(toProductForm(undefined, 'coupang'))
    setMessage('판본을 먼저 저장한 뒤 그 판본에 판매 상품을 연결하세요.')
  }

  const saveEdition = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    startTransition(async () => {
      try {
        await saveFigureBookEdition({
          ...editionForm,
          contentId,
        })
        setMessage(editionForm.editionId ? '판본 정보를 수정했습니다.' : '새 판본을 추가했습니다.')
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '판본 저장에 실패했습니다.')
      }
    })
  }

  const saveProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedEdition) return
    setMessage(null)
    startTransition(async () => {
      try {
        await replaceFigureBookProduct({
          editionId: selectedEdition.id,
          platform: productForm.platform,
          productId: productForm.productId,
          productUrl: productForm.productUrl,
          affiliateUrl: productForm.affiliateUrl,
          qualityEvidence: productForm.evidence.split('\n'),
        })
        setMessage('활성 판매 상품을 교체했습니다. 이전 상품은 이력으로 남습니다.')
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '상품 저장에 실패했습니다.')
      }
    })
  }

  const deactivateProduct = () => {
    if (!selectedEdition || !activeProduct) return
    if (!window.confirm(`${selectedEdition.title}의 ${productForm.platform} 상품을 비활성화할까요?`)) return
    setMessage(null)
    startTransition(async () => {
      try {
        await deactivateFigureBookProduct({
          editionId: selectedEdition.id,
          platform: productForm.platform,
        })
        setProductForm(toProductForm(undefined, productForm.platform))
        setMessage('판매 상품을 비활성화했습니다. 판본과 작품 관계는 그대로 남습니다.')
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '상품 해제에 실패했습니다.')
      }
    })
  }

  return (
    <section className="border-b border-border p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">판본과 판매 상품</h2>
          <p className="mt-1 text-xs leading-relaxed text-text-tertiary">
            《{sourceTitle}》의 인물 관계는 작품에 한 번만 둡니다. ISBN이 달라지면 새 판본이고,
            판매처 상품만 바뀌면 현재 판본의 상품을 교체합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={startNewEdition}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-accent/50 bg-accent/10 px-3 text-xs font-bold text-accent hover:border-accent hover:bg-accent/20 active:bg-accent/25"
        >
          <Plus size={14} />
          판본 추가
        </button>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {editions.map((edition) => {
          const activeCount = edition.products.filter((product) => product.isActive).length
          const active = edition.id === selectedEditionId
          return (
            <button
              key={edition.id}
              type="button"
              aria-pressed={active}
              onClick={() => selectEdition(edition)}
              className={`min-w-52 rounded-lg border px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                active
                  ? 'border-accent bg-accent/10'
                  : 'border-border bg-bg-secondary/50 hover:border-accent/60 hover:bg-accent/[0.06]'
              }`}
            >
              <span className="line-clamp-2 text-sm font-semibold text-text-primary">{edition.title}</span>
              <span className="mt-1 block font-mono text-[10px] text-text-tertiary">
                {edition.locale} · {edition.isbn ?? 'ISBN 없음'} · active:{activeCount}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 2xl:grid-cols-2">
        <form onSubmit={saveEdition} className="rounded-xl border border-border bg-bg-secondary/35 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold text-text-primary">
              {editionForm.editionId ? `판본 #${editionForm.editionId}` : '새 판본'}
            </h3>
            {editionForm.editionId ? (
              <span className="text-[10px] text-text-tertiary">작품·언어·ISBN 변경 불가</span>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              언어
              <select
                value={editionForm.locale}
                disabled={Boolean(editionForm.editionId)}
                onChange={(event) => setEditionForm((current) => ({
                  ...current,
                  locale: event.target.value as 'ko' | 'en',
                }))}
                className={fieldClass}
              >
                <option value="ko">ko</option>
                <option value="en">en</option>
              </select>
            </label>
            <label className={labelClass}>
              ISBN
              <input
                value={editionForm.isbn}
                disabled={Boolean(editionForm.editionId)}
                onChange={(event) => setEditionForm((current) => ({ ...current, isbn: event.target.value }))}
                className={fieldClass}
                placeholder="ISBN-13"
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              판본 제목
              <input
                value={editionForm.title}
                onChange={(event) => setEditionForm((current) => ({ ...current, title: event.target.value }))}
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              지은이·옮긴이
              <input
                value={editionForm.creator}
                onChange={(event) => setEditionForm((current) => ({ ...current, creator: event.target.value }))}
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              출판사
              <input
                value={editionForm.publisher}
                onChange={(event) => setEditionForm((current) => ({ ...current, publisher: event.target.value }))}
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              출간일
              <input
                type="date"
                value={editionForm.releaseDate}
                onChange={(event) => setEditionForm((current) => ({ ...current, releaseDate: event.target.value }))}
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              노출 순서
              <input
                type="number"
                min={0}
                value={editionForm.sortOrder}
                onChange={(event) => setEditionForm((current) => ({
                  ...current,
                  sortOrder: Number(event.target.value),
                }))}
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              판본 성격
              <select
                value={editionForm.editionKind}
                onChange={(event) => setEditionForm((current) => ({ ...current, editionKind: event.target.value }))}
                className={fieldClass}
              >
                <option value="">미분류</option>
                <option value="full">완역·완질</option>
                <option value="volume">분권</option>
                <option value="selection">선집</option>
                <option value="abridged">축약</option>
                <option value="retelling">재화</option>
                <option value="adaptation">각색</option>
              </select>
            </label>
            <label className={labelClass}>
              수록 범위 키
              <input
                value={editionForm.textScope}
                onChange={(event) => setEditionForm((current) => ({ ...current, textScope: event.target.value }))}
                className={fieldClass}
                placeholder="complete 또는 실제 범위"
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              표지 URL
              <input
                value={editionForm.thumbnailUrl}
                onChange={(event) => setEditionForm((current) => ({ ...current, thumbnailUrl: event.target.value }))}
                className={fieldClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              작품 소개
              <textarea
                rows={5}
                value={editionForm.description}
                onChange={(event) => setEditionForm((current) => ({ ...current, description: event.target.value }))}
                className={fieldClass}
              />
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={editionForm.verified}
                onChange={(event) => setEditionForm((current) => ({ ...current, verified: event.target.checked }))}
              />
              메타데이터 검증됨
            </label>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-accent bg-accent px-4 text-xs font-bold text-bg-primary hover:bg-accent/80 active:bg-accent/70 disabled:opacity-40"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              판본 저장
            </button>
          </div>
        </form>

        <form onSubmit={saveProduct} className="rounded-xl border border-border bg-bg-secondary/35 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold text-text-primary">활성 판매 상품</h3>
            {selectedEdition ? (
              <span className={`rounded border px-2 py-1 font-mono text-[10px] ${
                activeProduct
                  ? 'border-emerald-400/40 text-emerald-300'
                  : 'border-border text-text-tertiary'
              }`}>
                {activeProduct ? 'ACTIVE' : 'NO PRODUCT'}
              </span>
            ) : null}
          </div>
          {!selectedEdition ? (
            <p className="rounded-lg border border-border bg-bg-card px-4 py-8 text-center text-sm text-text-tertiary">
              새 판본을 저장한 뒤 상품을 연결할 수 있습니다.
            </p>
          ) : (
            <>
              <div className="grid gap-3">
                <label className={labelClass}>
                  판매처
                  <select
                    value={productForm.platform}
                    disabled
                    className={fieldClass}
                  >
                    <option value={productForm.platform}>{productForm.platform}</option>
                  </select>
                </label>
                <label className={labelClass}>
                  상품 ID
                  <input
                    value={productForm.productId}
                    onChange={(event) => setProductForm((current) => ({ ...current, productId: event.target.value }))}
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  상품 상세 URL
                  <input
                    value={productForm.productUrl}
                    onChange={(event) => setProductForm((current) => ({ ...current, productUrl: event.target.value }))}
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  제휴 URL
                  <input
                    value={productForm.affiliateUrl}
                    onChange={(event) => setProductForm((current) => ({ ...current, affiliateUrl: event.target.value }))}
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  확인 근거 · 한 줄에 하나
                  <textarea
                    rows={5}
                    value={productForm.evidence}
                    onChange={(event) => setProductForm((current) => ({ ...current, evidence: event.target.value }))}
                    className={fieldClass}
                    placeholder={'정확한 ISBN\n로켓배송 배지\n상품평 120개'}
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                {activeProduct ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={deactivateProduct}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-400/40 px-3 text-xs font-bold text-red-300 hover:border-red-300 hover:bg-red-400/10 active:bg-red-400/15 disabled:opacity-40"
                  >
                    <PackageX size={14} />
                    상품 비활성화
                  </button>
                ) : null}
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-accent bg-accent px-4 text-xs font-bold text-bg-primary hover:bg-accent/80 active:bg-accent/70 disabled:opacity-40"
                >
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                  {activeProduct ? '상품 교체' : '상품 연결'}
                </button>
              </div>
              {selectedEdition.products.length > 1 ? (
                <p className="mt-3 text-[10px] text-text-tertiary">
                  비활성 이력 {selectedEdition.products.filter((product) => !product.isActive).length}건 보존 중
                </p>
              ) : null}
            </>
          )}
        </form>
      </div>

      {message ? (
        <p className="mt-4 rounded-lg border border-border bg-bg-card px-4 py-3 text-sm text-text-secondary">
          {message}
        </p>
      ) : null}
    </section>
  )
}
