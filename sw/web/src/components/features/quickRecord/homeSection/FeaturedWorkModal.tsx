import { useRef } from "react";
import { X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import InfoPanel from "../InfoPanel";
import ExternalResourceSearch, { type ExternalResourceSearchHandle } from "../ExternalResourceSearch";
import { type QuickRecordTarget } from "@/contexts/QuickRecordContext";
import { HomeSuggestions } from "./HomeSuggestions";
import { HomeArchiveArea } from "./HomeArchiveArea";
import type { SuggestionProps, ArchiveProps } from "./HomeEditorArea";

export type ModalType = 'DETAIL' | 'REVIEW_CELEB' | 'REVIEW_NORMAL' | 'EXTERNAL' | 'SELECT_CONTENT' | null;
export type SelectionTab = 'SUGGESTION' | 'ARCHIVE';

interface FeaturedWorkModalProps {
    type: ModalType;
    onClose: () => void;
    title: string;
    icon: LucideIcon;
    targetContent: QuickRecordTarget;
    suggestionProps: SuggestionProps;
    archiveProps: ArchiveProps;
    selectionTab: SelectionTab;
    setSelectionTab: (tab: SelectionTab) => void;
}

export default function FeaturedWorkModal({ type, onClose, title, icon: Icon, targetContent, suggestionProps, archiveProps, selectionTab, setSelectionTab }: FeaturedWorkModalProps) {
    const t = useTranslations("quickRecord.home");
    const searchRef = useRef<ExternalResourceSearchHandle>(null);

    if (!type) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="w-full max-w-4xl h-[80vh] bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                    <h3 className="text-lg font-serif font-bold text-text-primary flex items-center gap-2">
                        <Icon size={20} className="text-accent" />
                        {title}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-tertiary hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden bg-bg-secondary/30 relative">
                    {type === 'EXTERNAL' ? (
                        <div className="bg-bg-main/30 h-full overflow-y-auto custom-scrollbar p-6">
                            <ExternalResourceSearch
                                ref={searchRef}
                                title={targetContent.title}
                                creator={targetContent.creator}
                                type={targetContent.type}
                                className="border-0 shadow-none rounded-none bg-transparent"
                                hideHeader={true}
                            />
                        </div>
                    ) : type === 'SELECT_CONTENT' ? (
                        <div className="flex flex-col h-full bg-bg-main/30">
                            {/* Tabs */}
                            <div className="flex border-b border-white/10 shrink-0">
                                <button
                                    onClick={() => setSelectionTab('SUGGESTION')}
                                    className={`flex-1 py-4 text-sm font-bold transition-all ${selectionTab === 'SUGGESTION' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-text-tertiary hover:text-text-primary'}`}
                                >
                                    {t("celebRecommendations")}
                                </button>
                                <button
                                    onClick={() => setSelectionTab('ARCHIVE')}
                                    className={`flex-1 py-4 text-sm font-bold transition-all ${selectionTab === 'ARCHIVE' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-text-tertiary hover:text-text-primary'}`}
                                >
                                    {t("archiveTab")}
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                                {selectionTab === 'SUGGESTION' ? (
                                    <HomeSuggestions {...suggestionProps} />
                                ) : (
                                    <HomeArchiveArea {...archiveProps} />
                                )}
                            </div>
                        </div>
                    ) : (
                        <InfoPanel
                            content={{
                                id: targetContent.id,
                                contentId: targetContent.contentId || targetContent.id,
                                title: targetContent.title,
                                type: targetContent.type,
                                thumbnailUrl: targetContent.thumbnailUrl,
                                creator: targetContent.creator
                            }}
                            initialTab={
                                type === 'DETAIL' ? 'DETAIL' :
                                type === 'REVIEW_CELEB' ? 'REVIEW_CELEB' :
                                'REVIEW_NORMAL'
                            }
                            hideTabs={true}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
