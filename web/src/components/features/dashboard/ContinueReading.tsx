import Link from "next/link";
import { READING_LIST } from "@/lib/mock-data";

export default function ContinueReading() {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">📖 계속 보기</div>
        <div className="card-action">더보기 →</div>
      </div>
      <div className="reading-grid">
        {READING_LIST.map((item) => (
          <Link href={`/archive/${item.id}`} key={item.id}>
            <div className="reading-card">
              <div
                className="reading-card-cover"
                style={{ background: item.coverColor }}
              >
                <div className="reading-card-type">{item.type}</div>
              </div>
              <div className="reading-card-info">
                <div className="reading-card-title">{item.title}</div>
                <div className="reading-card-progress">{item.progress}</div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
