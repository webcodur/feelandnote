import { ARCHIVE_ITEMS } from "@/lib/mock-data";

interface ContentCardProps {
  item: typeof ARCHIVE_ITEMS[0];
}

export default function ContentCard({ item }: ContentCardProps) {
  let statusClass = "";
  let statusText = "";

  switch (item.status) {
    case "reading":
    case "watching":
      statusClass = "status-watching";
      statusText = item.type === "도서" ? "읽는 중" : "보는 중";
      break;
    case "completed":
      statusClass = "status-completed";
      statusText = "완료";
      break;
    case "wish":
      statusClass = "status-wish";
      statusText = "관심";
      break;
    default:
      statusClass = "";
      statusText = "";
  }

  return (
    <div className="content-card">
      <div
        className="card-poster"
        style={{ background: item.coverColor }}
      >
        <div className={`card-status ${statusClass}`}>{statusText}</div>
      </div>
      <div className="card-info">
        <div className="card-title">{item.title}</div>
        <div className="card-meta">{item.type}</div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: item.status === "completed" ? "100%" : "45%" }}
          ></div>
        </div>
        <div className="card-footer">
          <span>★ {item.rating}</span>
          <span>{item.date}</span>
        </div>
      </div>
    </div>
  );
}
