import { RECENT_CREATIONS } from "@/lib/mock-data";

export default function CreationSection() {
  return (
    <div className="card" style={{ marginBottom: "32px" }}>
      <div className="card-header">
        <div className="card-title">💭 최근 창작</div>
        <div className="card-action">모두보기 →</div>
      </div>
      <div className="creation-items">
        {RECENT_CREATIONS.map((item) => (
          <div key={item.id} className="creation-card">
            <div className="creation-type">{item.type}</div>
            <div className="creation-title">{item.title}</div>
            <div className="creation-preview">{item.preview}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
