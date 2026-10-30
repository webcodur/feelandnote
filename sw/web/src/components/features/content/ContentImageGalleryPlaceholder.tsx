export default function ContentImageGalleryPlaceholder() {
  return <div className="space-y-3 border-t border-line pt-4" data-media-gallery-placeholder aria-hidden="true">
    <div className="h-11" />
    <div className="mx-auto aspect-video w-full max-w-4xl rounded-lg border border-line bg-bg-card" />
    <div className="flex gap-2 overflow-hidden p-1">
      {[0, 1, 2, 3].map(index => <div key={index} className="aspect-video w-20 shrink-0 rounded border-2 border-line bg-bg-card sm:w-28" />)}
    </div>
  </div>
}
