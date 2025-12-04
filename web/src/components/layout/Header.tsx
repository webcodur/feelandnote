import { Search, Menu } from "lucide-react";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="w-full h-16 bg-bg-secondary border-b border-border flex items-center px-6 gap-6 fixed top-0 left-0 z-[100]">
      <button
        className="w-10 h-10 flex items-center justify-center cursor-pointer rounded-lg transition-colors duration-200 hover:bg-white/5"
        onClick={onMenuClick}
      >
        <Menu size={24} className="text-text-primary" />
      </button>
      <div className="text-xl font-extrabold bg-gradient-to-br from-white to-neutral-400 bg-clip-text text-transparent cursor-pointer">
        Feel&Note
      </div>
      <div className="flex-1 max-w-[600px] mx-auto">
        <div className="w-full bg-bg-main border border-border rounded-3xl py-2.5 px-5 flex items-center gap-3 transition-colors duration-200 focus-within:border-accent">
          <Search size={18} className="text-text-secondary" />
          <input
            type="text"
            placeholder="콘텐츠, 사용자, 태그 검색..."
            className="flex-1 bg-transparent border-none text-text-primary outline-none text-[15px] placeholder:text-text-secondary"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold text-sm">WebCoder</span>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500"></div>
      </div>
    </header>
  );
}
