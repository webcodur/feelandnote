interface ContentCardProps {
  item: {
    id: number;
    title: string;
    type: string;
    coverColor: string;
    status?: string;
    rating?: number;
    date?: string;
    progress?: string;
    percentage?: number;
  };
}

const statusStyles = {
  watching: {
    class: "text-green-400 border border-green-600",
    text: "보는 중",
  },
  reading: {
    class: "text-green-400 border border-green-600",
    text: "읽는 중",
  },
  completed: {
    class: "text-purple-400 border border-purple-600",
    text: "완료",
  },
  wish: {
    class: "text-yellow-300 border border-yellow-600",
    text: "관심",
  },
};

export default function ContentCard({ item }: ContentCardProps) {
  const status = item.status ? statusStyles[item.status as keyof typeof statusStyles] : null;
  const statusText =
    item.status === "reading" || item.status === "watching"
      ? item.type === "도서"
        ? "읽는 중"
        : "보는 중"
      : status?.text || "";

  const progressPercent = item.percentage ?? (item.status === "completed" ? 100 : 45);

  return (
    <div className="bg-bg-card rounded-xl overflow-hidden transition-all duration-200 cursor-pointer border border-transparent relative hover:-translate-y-1 hover:shadow-2xl hover:border-border">
      <div
        className="w-full aspect-[2/3] bg-[#2a3038] relative"
        style={{ background: item.coverColor }}
      >
        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm py-1 px-2 rounded-md text-[11px] font-semibold text-white">
          {item.type}
        </div>
        {status && (
          <div
            className={`absolute top-2 right-2 py-1 px-2 rounded-md text-[11px] font-bold bg-black/70 backdrop-blur-sm ${status.class}`}
          >
            {statusText}
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="font-semibold text-sm mb-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
          {item.title}
        </div>
        {item.progress && (
          <div className="text-xs text-text-secondary mb-2">{item.progress}</div>
        )}
        <div className="h-1 bg-white/10 rounded-sm overflow-hidden">
          <div
            className="h-full bg-accent"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {(item.rating !== undefined || item.date) && (
          <div className="flex justify-between text-xs text-text-secondary mt-2">
            {item.rating !== undefined && <span>★ {item.rating}</span>}
            {item.date && <span>{item.date}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
