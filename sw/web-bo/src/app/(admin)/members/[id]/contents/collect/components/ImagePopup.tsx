
import Image from 'next/image'
import { X } from 'lucide-react'

interface ImagePopupProps {
  url: string | null
  onClose: () => void
}

export default function ImagePopup({ url, onClose }: ImagePopupProps) {
  if (!url) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:text-accent"
      >
        <X className="w-6 h-6" />
      </button>
      <div className="relative max-w-[90vw] max-h-[90vh]">
        <Image
          src={url}
          alt=""
          width={400}
          height={600}
          unoptimized
          className="object-contain max-h-[90vh] w-auto"
        />
      </div>
    </div>
  )
}
