import Avatar from "@/components/ui/Avatar";
import BlurDissolve from "@/components/ui/BlurDissolve";
import type { FeaturedCeleb } from "@/actions/home";

interface FaceStackProps {
  people: FeaturedCeleb[];
  limit?: number;
}

export default function FaceStack({ people, limit = 6 }: FaceStackProps) {
  const visible = people.slice(0, limit);
  if (visible.length === 0) return null;

  return (
    <div
      className="flex -space-x-2"
      role="img"
      aria-label={visible.map((person) => person.nickname).join(", ")}
    >
      {visible.map((person, index) => (
        <span key={person.id} className="relative" style={{ zIndex: visible.length - index }}>
          <BlurDissolve className="inline-block">
            <Avatar
              url={person.avatar_url}
              name={person.nickname}
              size="sm"
              className="bg-bg-secondary ring-bg-main"
            />
          </BlurDissolve>
        </span>
      ))}
    </div>
  );
}
