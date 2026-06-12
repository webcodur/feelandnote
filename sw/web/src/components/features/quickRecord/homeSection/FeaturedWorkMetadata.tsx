import { User, Calendar, Building2, Film, Users, Music, Disc, Gamepad2, Award, Briefcase, Code, List } from "lucide-react";
import { type QuickRecordTarget } from "@/contexts/QuickRecordContext";
import type { ContentMetadata } from "@/types/content";

interface FeaturedWorkMetadataProps {
    targetContent: QuickRecordTarget;
    metadata: ContentMetadata | undefined;
    releaseDate: string | null | undefined;
}

export default function FeaturedWorkMetadata({ targetContent, metadata, releaseDate }: FeaturedWorkMetadataProps) {
    return (
        <div className="mx-auto w-fit">
            <div className="grid grid-cols-[auto_auto] gap-x-4 gap-y-2.5 text-sm">
                {/* Creator (항상 표시) */}
                <span className="text-text-tertiary flex items-center justify-center">
                    <User size={16} className="opacity-70" />
                </span>
                <span className="text-text-primary text-center">{targetContent.creator || 'Unknown'}</span>

                {/* BOOK */}
                {targetContent.type === 'BOOK' && (
                    <>
                        {metadata?.publisher && (
                            <>
                                <span className="text-text-tertiary flex items-center justify-center">
                                    <Building2 size={16} className="opacity-70" />
                                </span>
                                <span className="text-text-primary text-center">{metadata.publisher}</span>
                            </>
                        )}
                        {metadata?.publishDate && (
                            <>
                                <span className="text-text-tertiary flex items-center justify-center">
                                    <Calendar size={16} className="opacity-70" />
                                </span>
                                <span className="text-text-primary text-center">{metadata.publishDate}</span>
                            </>
                        )}
                    </>
                )}

                {/* VIDEO */}
                {targetContent.type === 'VIDEO' && (
                    <>
                        {metadata?.director && (
                            <>
                                <span className="text-text-tertiary flex items-center justify-center">
                                    <Film size={16} className="opacity-70" />
                                </span>
                                <span className="text-text-primary text-center">{metadata.director}</span>
                            </>
                        )}
                        {metadata?.cast?.[0] && (
                            <>
                                <span className="text-text-tertiary flex items-center justify-center">
                                    <Users size={16} className="opacity-70" />
                                </span>
                                <span className="text-text-primary text-center">{metadata.cast[0].name}</span>
                            </>
                        )}
                        {releaseDate && (
                            <>
                                <span className="text-text-tertiary flex items-center justify-center">
                                    <Calendar size={16} className="opacity-70" />
                                </span>
                                <span className="text-text-primary text-center">{releaseDate}</span>
                            </>
                        )}
                    </>
                )}

                {/* MUSIC */}
                {targetContent.type === 'MUSIC' && (
                    <>
                        {metadata?.albumType && (
                            <>
                                <span className="text-text-tertiary flex items-center justify-center">
                                    <Disc size={16} className="opacity-70" />
                                </span>
                                <span className="text-text-primary text-center capitalize">{metadata.albumType}</span>
                            </>
                        )}
                        {metadata?.totalTracks && (
                            <>
                                <span className="text-text-tertiary flex items-center justify-center">
                                    <Music size={16} className="opacity-70" />
                                </span>
                                <span className="text-text-primary text-center">{metadata.totalTracks} Tracks</span>
                            </>
                        )}
                        {metadata?.label && (
                            <>
                                <span className="text-text-tertiary flex items-center">
                                    <Building2 size={16} className="opacity-70" />
                                </span>
                                <span className="text-text-primary">{metadata.label}</span>
                            </>
                        )}
                        {releaseDate && (
                            <>
                                <span className="text-text-tertiary flex items-center justify-center">
                                    <Calendar size={16} className="opacity-70" />
                                </span>
                                <span className="text-text-primary text-center">{releaseDate}</span>
                            </>
                        )}
                    </>
                )}

                {/* GAME */}
                {targetContent.type === 'GAME' && (
                    <>
                        {metadata?.developer && (
                            <>
                                <span className="text-text-tertiary flex items-center justify-center">
                                    <Code size={16} className="opacity-70" />
                                </span>
                                <span className="text-text-primary text-center">{metadata.developer}</span>
                            </>
                        )}
                        {metadata?.platforms && metadata.platforms.length > 0 && (
                            <>
                                <span className="text-text-tertiary flex items-center justify-center">
                                    <Gamepad2 size={16} className="opacity-70" />
                                </span>
                                <span className="text-text-primary text-center">{metadata.platforms.slice(0, 3).join(', ')}</span>
                            </>
                        )}
                        {releaseDate && (
                            <>
                                <span className="text-text-tertiary flex items-center justify-center">
                                    <Calendar size={16} className="opacity-70" />
                                </span>
                                <span className="text-text-primary text-center">{releaseDate}</span>
                            </>
                        )}
                    </>
                )}

                {/* CERTIFICATE */}
                {targetContent.type === 'CERTIFICATE' && (
                    <>
                        {metadata?.qualificationType && (
                            <>
                                <span className="text-text-tertiary flex items-center justify-center">
                                    <Award size={16} className="opacity-70" />
                                </span>
                                <span className="text-text-primary text-center">{metadata.qualificationType}</span>
                            </>
                        )}
                        {metadata?.majorField && (
                            <>
                                <span className="text-text-tertiary flex items-center justify-center">
                                    <Briefcase size={16} className="opacity-70" />
                                </span>
                                <span className="text-text-primary text-center">{metadata.majorField}</span>
                            </>
                        )}
                        {metadata?.series && (
                            <>
                                <span className="text-text-tertiary flex items-center justify-center">
                                    <List size={16} className="opacity-70" />
                                </span>
                                <span className="text-text-primary text-center">{metadata.series}</span>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
