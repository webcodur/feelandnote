"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import AnimatedHeight from "./AnimatedHeight";

interface AccordionItemProps {
    title?: ReactNode;
    icon?: ReactNode;
    children: ReactNode;
    rightElement?: ReactNode; // 헤더 우측에 배치될 요소 (버튼 등)
    defaultOpen?: boolean;
    className?: string;
    headerClassName?: string;
    contentClassName?: string;
}

export function AccordionItem({
    title,
    icon,
    children,
    rightElement,
    defaultOpen = false,
    className = "",
    headerClassName = "",
    contentClassName = ""
}: AccordionItemProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={`border border-white/10 rounded-2xl overflow-hidden shadow-xl bg-bg-card/50 backdrop-blur-md transition-all duration-300 ${className}`}>
            {/* Header */}
            <div 
                className={`px-4 py-3 border-b border-white/5 bg-white/2 flex items-center justify-between shadow-sm cursor-pointer hover:bg-white/5 transition-colors select-none min-h-[52px] ${headerClassName}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {/* Left: Icon & Title */}
                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    <button 
                        className={`p-1 rounded-full transition-transform duration-300 ${isOpen ? "rotate-180 bg-white/10" : "rotate-0 text-text-tertiary"}`}
                    >
                        <ChevronDown size={18} />
                    </button>
                    
                    <div className="flex items-center gap-2 text-white overflow-hidden">
                        {icon && <span className="text-accent shrink-0">{icon}</span>}
                        {title && (
                            typeof title === 'string' 
                            ? <span className="text-sm font-bold uppercase tracking-wider truncate">{title}</span>
                            : title
                        )}
                    </div>
                </div>

                {/* Right: Custom Actions */}
                {rightElement && (
                    <div 
                        className="flex items-center justify-end pl-4" 
                        onClick={(e) => e.stopPropagation()} // 우측 요소 클릭 시 아코디언 토글 방지
                    >
                        {rightElement}
                    </div>
                )}
            </div>

            {/* Content */}
            <AnimatedHeight duration={300}>
                {isOpen && (
                    <div className={`border-t border-white/5 ${contentClassName}`}>
                        {children}
                    </div>
                )}
            </AnimatedHeight>
        </div>
    );
}

interface AccordionProps {
    children: ReactNode;
    className?: string;
}

export default function Accordion({ children, className = "" }: AccordionProps) {
    return (
        <div className={`flex flex-col gap-4 ${className}`}>
            {children}
        </div>
    );
}
