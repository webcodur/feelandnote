"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui";
import type { CelebProfile } from "@/types/home";

interface CelebProfileCardProps {
  celeb: CelebProfile;
}

export default function CelebProfileCard({ celeb }: CelebProfileCardProps) {
  return (
    <Link href={`/archive/user/${celeb.id}`}>
      <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-bg-card hover:bg-white/5 w-[120px] md:w-[140px] shrink-0">
        <Avatar
          url={celeb.avatar_url}
          name={celeb.nickname}
          size="lg"
          verified={celeb.is_verified}
        />
        <span className="font-medium text-sm text-center truncate w-full">
          {celeb.nickname}
        </span>
        {celeb.profession && (
          <span className="text-xs text-text-secondary">{celeb.profession}</span>
        )}
      </div>
    </Link>
  );
}
