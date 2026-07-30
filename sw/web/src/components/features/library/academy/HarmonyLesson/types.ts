import type { LessonSection } from "@/constants/libraryMuseum";
import type { AcademyLessonProgress } from "@/types/academy";

export interface HarmonyLessonProps {
  data: LessonSection[];
  categoryId: string;
  courseId: string;
  isSignedIn: boolean;
  progressByLessonId: Record<string, AcademyLessonProgress>;
  onProgressChange: (progress: AcademyLessonProgress) => void;
}
