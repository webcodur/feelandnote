"use client";

import Link from "next/link";
import { BookOpen, Users } from "lucide-react";
import { Avatar } from "@/components/ui";
import type { UserProfile } from "@/actions/user/getProfile";

interface HomeRecordHeaderProps {
    profile?: UserProfile | null;
    contentCount: number;
}

export function HomeRecordHeader({ profile, contentCount }: HomeRecordHeaderProps) {
    return (
        <div className="text-center mb-6 md:mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium mb-2">
                <BookOpen size={12} />
                <span>나만의 빠른 기록</span>
            </div>
            <p className="text-sm text-text-tertiary mb-4">
                영감을 빠르게 기록하고 관리해보세요
            </p>

            {/* User Profile or Login Prompt */}
            {profile ? (
                <>
                    <Link
                        href={`/${profile.id}`}
                        className="group relative inline-flex flex-col items-center gap-5 mb-0 py-6 px-10 rounded-2xl transition-all duration-500 hover:bg-gradient-to-b hover:from-white/5 hover:to-transparent"
                    >
                        <div className="relative">
                            <Avatar
                                url={profile.avatar_url}
                                name={profile.nickname}
                                size="2xl"
                                className="ring-2 ring-white/10 group-hover:ring-accent/50 group-hover:shadow-[0_0_30px_rgba(212,175,55,0.2)] transition-all duration-500"
                            />
                            {/* 콘텐츠 개수 뱃지 */}
                            <div className="absolute -top-1 -right-1 z-20 min-w-[24px] h-[24px] px-1.5 flex items-center justify-center bg-accent text-black text-[10px] font-bold rounded-full border-2 border-[#121212] shadow-lg">
                                {contentCount}
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl md:text-4xl font-serif font-bold text-text-primary group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-accent group-hover:via-amber-200 group-hover:to-accent transition-all duration-500">
                                {profile.nickname}
                            </h2>
                            {profile.selected_title && (
                                <div className="flex items-center justify-center gap-3">
                                    <span className="text-sm text-text-secondary font-medium px-2 py-0.5 rounded bg-white/5 border border-white/5">
                                        {profile.selected_title.name}
                                    </span>
                                </div>
                            )}
                        </div>
                    </Link>

                    {/* 간단한 소개글 */}
                    {profile.quotes && (
                        <p className="text-center text-sm text-text-secondary max-w-xl mx-auto mb-4 line-clamp-2 mt-2 px-4 break-keep">
                            &ldquo;{profile.quotes}&rdquo;
                        </p>
                    )}
                </>
            ) : (
                <>
                    <Link
                        href="/login"
                        className="group relative inline-flex flex-col items-center gap-5 mb-0 py-6 px-10 rounded-2xl transition-all duration-500 hover:bg-gradient-to-b hover:from-white/5 hover:to-transparent"
                    >
                        <div className="relative">
                            <div className="w-[100px] h-[100px] rounded-full bg-white/5 flex items-center justify-center border-2 border-white/10 group-hover:border-accent/50 group-hover:shadow-[0_0_30px_rgba(212,175,55,0.2)] transition-all duration-500">
                                <Users size={40} className="text-text-tertiary group-hover:text-accent transition-colors" />
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl md:text-4xl font-serif font-bold text-text-primary group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-accent group-hover:via-amber-200 group-hover:to-accent transition-all duration-500">
                                나만의 서재
                            </h2>
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-sm text-text-secondary font-medium px-2 py-0.5 rounded bg-white/5 border border-white/5">
                                    로그인이 필요합니다
                                </span>
                            </div>
                        </div>
                    </Link>

                    {/* 간단한 소개글 */}
                    <p className="text-center text-sm text-text-secondary max-w-xl mx-auto mb-4 line-clamp-2 mt-2 px-4 break-keep">
                        &ldquo;나만의 서재를 만들어보세요&rdquo;
                    </p>
                </>
            )}
        </div>
    );
}
