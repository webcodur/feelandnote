import { Card } from "@/components/ui";
import { RECENT_CREATIONS } from "@/lib/mock-data";
import { MessageCircle, Film, Lightbulb } from "lucide-react";

function getCreationIcon(type: string) {
  switch (type) {
    case "what-if":
      return <Lightbulb size={14} />;
    case "media":
      return <Film size={14} />;
    default:
      return <MessageCircle size={14} />;
  }
}

export default function CreationSection() {
  return (
    <Card className="mb-8">
      <div className="flex justify-between items-center mb-5">
        <div className="text-lg font-bold flex items-center gap-2">
          <Lightbulb size={18} className="text-accent" /> 최근 창작
        </div>
        <div className="text-accent text-sm cursor-pointer font-semibold">모두보기 →</div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
        {RECENT_CREATIONS.map((item) => (
          <div
            key={item.id}
            className="bg-white/[0.03] p-6 rounded-2xl border border-white/5 cursor-pointer transition-all duration-300 hover:border-accent hover:bg-accent/5 hover:-translate-y-1 hover:shadow-2xl"
          >
            <div className="text-[13px] text-accent mb-3 font-semibold uppercase tracking-wide flex items-center gap-1">
              {getCreationIcon(item.type)} {item.typeLabel}
            </div>
            <div className="text-lg font-bold mb-3">{item.title}</div>
            <div className="text-sm text-text-secondary leading-relaxed">{item.preview}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
