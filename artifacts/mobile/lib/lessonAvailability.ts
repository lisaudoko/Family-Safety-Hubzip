import { type Course, type Lesson } from "@/data/seed";
import { type UserProgress } from "@/context/FamilyContext";

/**
 * A lesson is available if it's the first lesson in the course (subject to the
 * premium-course lock), or if the previous lesson — and its quiz, if it has one —
 * has already been completed. Enforces sequential progression through a course.
 */
export function isLessonAvailable(
  course: Course,
  lesson: Lesson,
  progress: UserProgress,
  isPremiumLocked: boolean,
): boolean {
  const idx = course.lessons.findIndex(l => l.id === lesson.id);
  if (idx === -1) return false;
  if (isPremiumLocked && idx > 0) return false;

  const prevLesson = course.lessons[idx - 1];
  if (!prevLesson) return true;

  const prevQuiz = course.quizzes.find(q => q.lessonId === prevLesson.id);
  const prevDone =
    progress.completedLessons.includes(prevLesson.id) &&
    (!prevLesson.hasQuiz || !prevQuiz || progress.completedQuizzes.includes(prevLesson.id));

  return prevDone;
}
