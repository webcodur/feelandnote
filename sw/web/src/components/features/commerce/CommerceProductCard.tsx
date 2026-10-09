'use client'

import { useState, type ReactNode } from 'react'
import { ZoomIn } from 'lucide-react'
import ContentImage from '@/components/ui/ContentImage'
import ImageViewerModal from '@/components/ui/ImageViewerModal'

export default function CommerceProductCard({ href, affiliate, linkLabel, zoomLabel, imageUrl, name, collection, fallback, children }: {
  href: string
  affiliate: boolean
  linkLabel: string
  zoomLabel: string
  imageUrl?: string
  name: string
  collection: 'support' | 'shop'
  fallback: ReactNode
  children: ReactNode
}) {
  const [loadedImage, setLoadedImage] = useState<string | null>(null)
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const hasImage = Boolean(imageUrl && failedImage !== imageUrl)

  return (
    <div data-product-card className="group relative flex min-w-0 flex-1 flex-col rounded-card border border-line bg-bg-card p-2.5 hover:border-line-strong hover:bg-bg-raised active:bg-bg-stone-light lg:p-4">
      <a href={href} target="_blank" rel={`noopener noreferrer${affiliate ? ' sponsored' : ''}`} aria-label={linkLabel} className="absolute inset-0 z-10 rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg-main" />
      <div className={`relative mb-3 flex items-center justify-center overflow-hidden rounded-control lg:mb-4 ${hasImage ? `${collection === 'shop' ? 'aspect-[4/3]' : 'aspect-square'} bg-white` : 'h-12 bg-bg-raised text-text-secondary group-hover:text-text-primary lg:h-16'}`}>
        {hasImage ? <ContentImage src={imageUrl} alt={name} sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 240px" className="object-contain p-2" dissolve={false} onLoad={() => setLoadedImage(imageUrl!)} onError={() => { setFailedImage(imageUrl!); setLoadedImage(null) }} /> : fallback}
      </div>
      {imageUrl && loadedImage === imageUrl && (
        <button type="button" aria-label={zoomLabel} aria-haspopup="dialog" onClick={() => setPreviewOpen(true)} className="absolute right-3 top-3 z-20 flex size-11 items-center justify-center rounded-control bg-black/65 text-white hover:bg-black hover:text-accent active:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:right-5 lg:top-5">
          <ZoomIn className="size-4" aria-hidden="true" />
        </button>
      )}
      {children}
      {previewOpen && imageUrl && <ImageViewerModal src={imageUrl} alt={name} isOpen closeOnImageClick onClose={() => setPreviewOpen(false)} />}
    </div>
  )
}
