"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink, Loader2, Globe, BookOpen, LayoutTemplate } from "lucide-react";
import { Z_INDEX } from "@/constants/zIndex";
import { useSound } from "@/contexts/SoundContext";
import { fetchUrlContent } from "@/actions/search/fetchUrlContent";

interface LinkPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string;
}

export default function LinkPreviewModal({
  isOpen,
  onClose,
  url,
  title
}: LinkPreviewModalProps) {
  const { playSound } = useSound();
  const [mode, setMode] = useState<'READER' | 'ORIGINAL'>('READER');
  const [isLoading, setIsLoading] = useState(true);
  const [readerContent, setReaderContent] = useState<{title?: string, content?: string, error?: string} | null>(null);
  const [iframeError, setIframeError] = useState(false);

  // Sound effects & Reset state
  useEffect(() => {
    if (isOpen) {
      playSound("modalOpen");
      setMode('READER'); // Default to Reader Mode
      setReaderContent(null);
      setIframeError(false);
      setIsLoading(true);
      document.body.style.overflow = "hidden";
      
      // Fetch for Reader Mode immediately
      fetchUrlContent(url).then(data => {
          setReaderContent(data);
          setIsLoading(false);
      }).catch(err => {
          console.error(err);
          setReaderContent({ error: "Failed to load content" });
          setIsLoading(false);
      });

    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, url, playSound]);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{ zIndex: Z_INDEX.modal + 10 }} // Ensure it's above other modals
      onClick={onClose}
    >
      <div 
        className="w-full max-w-5xl h-[85vh] bg-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl flex flex-col border border-white/10 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#121212] select-none shrink-0">
          <div className="flex items-center gap-3 overflow-hidden mr-4">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
               {mode === 'READER' ? <BookOpen size={16} className="text-accent" /> : <Globe size={16} className="text-text-secondary" />}
            </div>
            <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-text-primary truncate">{title || readerContent?.title || "웹 페이지"}</span>
                <span className="text-[10px] text-text-tertiary truncate max-w-[300px]">{url}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-white/5 rounded-lg p-1 mr-2 border border-white/5">
                <button
                    onClick={() => setMode('READER')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${mode === 'READER' ? 'bg-accent text-neutral-900 shadow-sm' : 'text-text-tertiary hover:text-text-primary'}`}
                >
                    읽기
                </button>
                <button
                    onClick={() => setMode('ORIGINAL')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${mode === 'ORIGINAL' ? 'bg-white/20 text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-primary'}`}
                >
                     원본
                </button>
            </div>

            <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-colors"
                title="브라우저로 열기"
            >
                <ExternalLink size={16} />
            </a>
            <button 
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-colors"
                title="닫기 (ESC)"
            >
                <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative bg-white overflow-hidden">
            {/* Loader */}
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-primary z-20 space-y-3">
                    <Loader2 className="animate-spin text-accent" size={32} />
                    <p className="text-text-secondary text-sm">페이지 내용을 불러오고 있습니다...</p>
                </div>
            )}
            
            {/* 1. READER MODE */}
            <div className={`w-full h-full overflow-y-auto custom-scrollbar bg-[#1a1a1a] text-text-primary p-6 md:p-12 transition-opacity duration-300 ${mode === 'READER' ? 'opacity-100 z-10' : 'opacity-0 z-0 absolute inset-0 pointer-events-none'}`}>
                 {readerContent?.content ? (
                     <div className="max-w-3xl mx-auto pb-20">
                         <h1 className="text-2xl md:text-4xl font-serif font-bold mb-8 leading-tight border-b border-white/10 pb-6 text-text-primary">
                             {readerContent.title || title}
                         </h1>
                         <div 
                            className={`
                                font-sans text-base md:text-lg leading-relaxed text-text-secondary/90
                                [&_p]:mb-6 [&_p]:text-justify
                                [&_h1]:text-2xl [&_h1]:font-serif [&_h1]:font-bold [&_h1]:text-accent [&_h1]:mt-10 [&_h1]:mb-4
                                [&_h2]:text-xl [&_h2]:font-serif [&_h2]:font-bold [&_h2]:text-text-primary [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:border-l-4 [&_h2]:border-accent [&_h2]:pl-3
                                [&_h3]:text-lg [&_h3]:font-serif [&_h3]:font-bold [&_h3]:text-text-primary/90 [&_h3]:mt-6 [&_h3]:mb-3
                                [&_img]:rounded-lg [&_img]:shadow-lg [&_img]:mx-auto [&_img]:my-8 [&_img]:max-w-full [&_img]:border [&_img]:border-white/5
                                [&_blockquote]:border-l-4 [&_blockquote]:border-white/20 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-text-tertiary [&_blockquote]:my-6
                                [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_a]:transition-colors hover:[&_a]:text-accent-hover
                                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-6 [&_ul]:marker:text-accent
                                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-6 [&_ol]:marker:text-accent
                                [&_strong]:text-text-primary [&_strong]:font-bold
                                [&_b]:text-text-primary [&_b]:font-bold
                                [&_div]:mb-4
                            `}
                            dangerouslySetInnerHTML={{ __html: readerContent.content }}
                         />
                     </div>
                 ) : !isLoading && (
                     <div className="flex flex-col items-center justify-center h-full text-text-tertiary space-y-4">
                         <BookOpen size={48} className="opacity-20" />
                         <p>읽기 모드를 사용할 수 없는 페이지입니다.</p>
                         <button 
                            onClick={() => setMode('ORIGINAL')}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-text-secondary rounded-lg text-sm font-medium transition-colors border border-white/5"
                         >
                             원본 보기로 전환
                         </button>
                     </div>
                 )}
            </div>

            {/* 2. ORIGINAL MODE (iframe) */}
            <div className={`w-full h-full bg-white transition-opacity duration-300 ${mode === 'ORIGINAL' ? 'opacity-100 z-10' : 'opacity-0 z-0 absolute inset-0 pointer-events-none'}`}>
                {iframeError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-primary p-6 text-center space-y-4">
                         <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                             <ExternalLink size={32} className="text-red-400" />
                         </div>
                         <h3 className="text-lg font-bold text-text-primary">연결이 거부되었습니다.</h3>
                         <p className="text-text-secondary text-sm max-w-md break-keep">
                             이 사이트({new URL(url).hostname})에서는 보안 정책(X-Frame-Options)으로 인해 미리보기를 허용하지 않습니다.
                         </p>
                         <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-6 py-2.5 bg-accent text-neutral-900 rounded-lg font-bold hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
                        >
                            새 창에서 열기
                        </a>
                    </div>
                ) : (
                    <iframe
                        src={url}
                        className="w-full h-full border-0 bg-white"
                        onError={() => setIframeError(true)}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
                )}
            </div>
            
        </div>
        
        {/* Footer */}
        <div className="h-8 bg-[#121212] border-t border-white/5 flex items-center justify-center text-[10px] text-text-tertiary shrink-0">
            {mode === 'READER' 
                ? <span>읽기 모드는 텍스트와 이미지 위주로 내용을 보여줍니다.</span>
                : <span>화면이 보이지 않으면 '브라우저로 열기'를 눌러주세요.</span>
            }
        </div>
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(modalContent, document.body);
}
