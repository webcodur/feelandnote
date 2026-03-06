export interface AcademyLessonProgress {
  id: string;
  userId: string;
  categoryId: string;
  subCategoryId: string;
  lessonId: string;
  isCompleted: boolean;
  completedAt: string | null;
  lastStudiedAt: string;
  createdAt: string;
  updatedAt: string;
}
