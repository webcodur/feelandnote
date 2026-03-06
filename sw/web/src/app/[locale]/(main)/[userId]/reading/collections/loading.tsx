export default function Loading() {
  return (
    <div className="p-6 md:p-10">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-[#141414] border border-white/[0.06] rounded-lg overflow-hidden animate-pulse"
          >
            <div className="aspect-square bg-[#0a0a0a]" />
            <div className="p-3 md:p-4 space-y-2">
              <div className="w-8 h-px bg-white/[0.06]" />
              <div className="h-4 bg-white/[0.06] rounded w-3/4" />
              <div className="h-3 bg-white/[0.06] rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
