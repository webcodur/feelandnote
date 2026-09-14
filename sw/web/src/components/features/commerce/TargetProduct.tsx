/*
  파일명: /components/features/commerce/TargetProduct.tsx
  기능: 박물관 콘텐츠 이름에 이어지는 상품 링크
  책임: 본문에서 다룬 기기·앨범·작품의 실제 상품과 판본을 작은 단위로 보여준다.
*/

import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import type { TargetProductData } from './targetProducts'

const VARIANTS = {
  inline: 'h-12 w-16',
  caption: 'size-14',
  compact: 'h-14 w-10',
} as const

export default function TargetProduct({ label, product }: {
  label: string
  product: TargetProductData
}) {
  const variant = VARIANTS[product.variant]

  return (
    <a
      id={`product-${product.id}`}
      data-commerce-target={product.id}
      href={product.productUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={product.name}
      aria-label={`${label} · ${product.name} · ${product.format} 쿠팡에서 보기 (새 창)`}
      className="group grid w-full scroll-mt-72 grid-cols-[64px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-b border-border py-3 text-text-primary outline-none hover:bg-bg-card hover:text-accent active:bg-bg-stone-light focus-visible:ring-2 focus-visible:ring-accent lg:grid-cols-[64px_minmax(0,1fr)_auto]"
    >
      <span className="row-span-2 flex w-16 items-center justify-center lg:row-span-1">
        <span className={`block shrink-0 overflow-hidden rounded-sm bg-text-primary ${variant}`}>
          <Image
            src={product.imageUrl}
            alt=""
            width={80}
            height={80}
            unoptimized
            className="h-full w-full object-contain"
          />
        </span>
      </span>
      <span className="min-w-0 text-sm leading-snug">
        <span className="block break-words font-semibold">{label}</span>
        <span className="mt-1 block text-text-secondary">{product.format}</span>
      </span>
      <span className="col-start-2 flex items-center gap-1 text-sm font-medium text-accent lg:col-start-3 lg:row-start-1">
        쿠팡에서 보기 <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />
      </span>
    </a>
  )
}
