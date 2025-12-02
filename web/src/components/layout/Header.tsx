import { Search } from "lucide-react";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="top-header">
      <div className="hamburger" onClick={onMenuClick}>
        <div className="hamburger-icon">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      <div className="logo" style={{ cursor: "pointer" }}>
        Feel&Note
      </div>
      <div className="search-container">
        <div className="search-bar">
          <Search size={18} color="var(--text-secondary)" />
          <input type="text" placeholder="콘텐츠, 사용자, 태그 검색..." />
        </div>
      </div>
      <div className="user-section">
        <span style={{ fontWeight: 600, fontSize: "14px" }}>WebCoder</span>
        <div className="avatar"></div>
      </div>
    </header>
  );
}
