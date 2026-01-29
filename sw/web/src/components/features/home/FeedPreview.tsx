import FeedSlider from "@/components/features/home/FeedSlider";
import { getCelebFeed } from "@/actions/home/getCelebFeed";

export default async function FeedPreview() {
  const { reviews } = await getCelebFeed({ limit: 8 });

  if (!reviews || reviews.length === 0) return null;

  return (
    <div className="w-full">
      <FeedSlider reviews={reviews} />
    </div>
  );
}
