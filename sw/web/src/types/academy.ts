export interface AcademyLessonProgress {
  id: string;
  userId: string;
  categoryId: string;
  courseId: string;
  lessonId: string;
  isCompleted: boolean;
  completedAt: string | null;
  lastStudiedAt: string;
  createdAt: string;
  updatedAt: string;
}
