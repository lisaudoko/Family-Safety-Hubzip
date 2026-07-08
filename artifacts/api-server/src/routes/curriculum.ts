import { Router } from "express";
import { db } from "@workspace/db";
import {
  coursesTable,
  lessonsTable,
  quizzesTable,
  quizQuestionsTable,
  badgesTable,
  weeklyTipsTable,
} from "@workspace/db";
import { and, asc, eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware.js";

const router = Router();
router.use(requireAuth as any);

// ── Full curriculum (aggregate, for client bootstrap) ────────────────────────

// GET /api/curriculum — full nested courses+lessons+quizzes+badges in one call
router.get("/curriculum", async (req: AuthRequest, res, next) => {
  try {
    const [courses, lessons, quizzes, questions, badges] = await Promise.all([
      db
        .select()
        .from(coursesTable)
        .where(eq(coursesTable.is_published, true))
        .orderBy(asc(coursesTable.sort_order)),
      db.select().from(lessonsTable).orderBy(asc(lessonsTable.sort_order)),
      db.select().from(quizzesTable),
      db.select().from(quizQuestionsTable).orderBy(asc(quizQuestionsTable.sort_order)),
      db.select().from(badgesTable),
    ]);

    const questionsByQuiz = new Map<string, typeof questions>();
    for (const q of questions) {
      const arr = questionsByQuiz.get(q.quiz_id) ?? [];
      arr.push(q);
      questionsByQuiz.set(q.quiz_id, arr);
    }

    const quizByLesson = new Map<string, (typeof quizzes)[number]>();
    for (const q of quizzes) quizByLesson.set(q.lesson_id, q);

    const lessonsByCourse = new Map<string, typeof lessons>();
    for (const l of lessons) {
      const arr = lessonsByCourse.get(l.course_id) ?? [];
      arr.push(l);
      lessonsByCourse.set(l.course_id, arr);
    }

    res.json({
      courses: courses.map((c) => {
        const courseLessons = lessonsByCourse.get(c.id) ?? [];
        return {
          id: c.id,
          title: c.title,
          category: c.category,
          description: c.description,
          duration: c.duration,
          level: c.level,
          iconName: c.icon_name,
          color: c.color,
          isPremium: c.is_premium,
          audience: c.audience,
          lessons: courseLessons.map((l) => ({
            id: l.id,
            courseId: l.course_id,
            title: l.title,
            module: l.module,
            audience: l.audience,
            ageRange: l.age_range,
            difficulty: l.difficulty,
            learningObjectives: l.learning_objectives,
            content: l.content,
            duration: `${l.estimated_minutes} min`,
            sections: l.sections,
            interactiveActivity: l.interactive_activity,
            scenarios: l.scenarios,
            parentDiscussionPrompts: l.parent_discussion_prompts,
            actionSteps: l.action_steps,
            completionCriteria: l.completion_criteria,
            badgeId: l.badge_id,
            estimatedMinutes: l.estimated_minutes,
            keyTakeaways: l.key_takeaways,
            hasQuiz: l.has_quiz,
          })),
          quizzes: courseLessons
            .filter((l) => quizByLesson.has(l.id))
            .map((l) => {
              const quiz = quizByLesson.get(l.id)!;
              const qs = questionsByQuiz.get(quiz.id) ?? [];
              return {
                lessonId: l.id,
                questions: qs.map((q) => ({
                  id: q.id,
                  question: q.question,
                  options: q.options,
                  correctIndex: q.correct_index,
                  explanation: q.explanation,
                })),
              };
            }),
        };
      }),
      badges: badges.map((b) => ({
        id: b.id,
        title: b.title,
        description: b.description,
        iconName: b.icon_name,
        color: b.color,
        condition: b.condition,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── Courses ───────────────────────────────────────────────────────────────────

// GET /api/courses?audience=&category=
router.get("/courses", async (req: AuthRequest, res, next) => {
  try {
    const { audience, category } = req.query as {
      audience?: string;
      category?: string;
    };

    const conditions = [eq(coursesTable.is_published, true)];
    if (audience) conditions.push(eq(coursesTable.audience, audience));
    if (category) conditions.push(eq(coursesTable.category, category));

    const courses = await db
      .select()
      .from(coursesTable)
      .where(and(...conditions))
      .orderBy(asc(coursesTable.sort_order));

    const lessons = await db
      .select({
        id: lessonsTable.id,
        course_id: lessonsTable.course_id,
        has_quiz: lessonsTable.has_quiz,
      })
      .from(lessonsTable);

    const lessonsByCourse = new Map<string, typeof lessons>();
    for (const l of lessons) {
      const arr = lessonsByCourse.get(l.course_id) ?? [];
      arr.push(l);
      lessonsByCourse.set(l.course_id, arr);
    }

    res.json({
      courses: courses.map((c) => {
        const courseLessons = lessonsByCourse.get(c.id) ?? [];
        return {
          id: c.id,
          title: c.title,
          category: c.category,
          description: c.description,
          duration: c.duration,
          level: c.level,
          iconName: c.icon_name,
          color: c.color,
          isPremium: c.is_premium,
          audience: c.audience,
          lessonCount: courseLessons.length,
          hasQuizCount: courseLessons.filter((l) => l.has_quiz).length,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/courses/:courseId
router.get("/courses/:courseId", async (req: AuthRequest, res, next) => {
  try {
    const courseId = String(req.params.courseId);

    const [course] = await db
      .select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .limit(1);

    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    const lessons = await db
      .select({
        id: lessonsTable.id,
        title: lessonsTable.title,
        estimated_minutes: lessonsTable.estimated_minutes,
        has_quiz: lessonsTable.has_quiz,
        sort_order: lessonsTable.sort_order,
        audience: lessonsTable.audience,
        age_range: lessonsTable.age_range,
        difficulty: lessonsTable.difficulty,
      })
      .from(lessonsTable)
      .where(eq(lessonsTable.course_id, courseId))
      .orderBy(asc(lessonsTable.sort_order));

    res.json({
      course: {
        id: course.id,
        title: course.title,
        category: course.category,
        description: course.description,
        duration: course.duration,
        level: course.level,
        iconName: course.icon_name,
        color: course.color,
        isPremium: course.is_premium,
        audience: course.audience,
        lessons: lessons.map((l) => ({
          id: l.id,
          title: l.title,
          estimatedMinutes: l.estimated_minutes,
          hasQuiz: l.has_quiz,
          audience: l.audience,
          ageRange: l.age_range,
          difficulty: l.difficulty,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── Lessons ───────────────────────────────────────────────────────────────────

// GET /api/lessons/:lessonId
router.get("/lessons/:lessonId", async (req: AuthRequest, res, next) => {
  try {
    const lessonId = String(req.params.lessonId);

    const [lesson] = await db
      .select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, lessonId))
      .limit(1);

    if (!lesson) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    res.json({
      lesson: {
        id: lesson.id,
        courseId: lesson.course_id,
        title: lesson.title,
        module: lesson.module,
        audience: lesson.audience,
        ageRange: lesson.age_range,
        difficulty: lesson.difficulty,
        learningObjectives: lesson.learning_objectives,
        content: lesson.content,
        sections: lesson.sections,
        interactiveActivity: lesson.interactive_activity,
        scenarios: lesson.scenarios,
        parentDiscussionPrompts: lesson.parent_discussion_prompts,
        actionSteps: lesson.action_steps,
        completionCriteria: lesson.completion_criteria,
        badgeId: lesson.badge_id,
        estimatedMinutes: lesson.estimated_minutes,
        keyTakeaways: lesson.key_takeaways,
        hasQuiz: lesson.has_quiz,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/lessons/:lessonId/quiz
router.get("/lessons/:lessonId/quiz", async (req: AuthRequest, res, next) => {
  try {
    const lessonId = String(req.params.lessonId);

    const [quiz] = await db
      .select()
      .from(quizzesTable)
      .where(eq(quizzesTable.lesson_id, lessonId))
      .limit(1);

    if (!quiz) {
      res.status(404).json({ error: "Quiz not found" });
      return;
    }

    const questions = await db
      .select()
      .from(quizQuestionsTable)
      .where(eq(quizQuestionsTable.quiz_id, quiz.id))
      .orderBy(asc(quizQuestionsTable.sort_order));

    res.json({
      quiz: {
        id: quiz.id,
        lessonId: quiz.lesson_id,
        questions: questions.map((q) => ({
          id: q.id,
          question: q.question,
          options: q.options,
          correctIndex: q.correct_index,
          explanation: q.explanation,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── Badges ────────────────────────────────────────────────────────────────────

// GET /api/badges
router.get("/badges", async (req: AuthRequest, res, next) => {
  try {
    const badges = await db.select().from(badgesTable);

    res.json({
      badges: badges.map((b) => ({
        id: b.id,
        title: b.title,
        description: b.description,
        iconName: b.icon_name,
        color: b.color,
        condition: b.condition,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── Weekly tips ───────────────────────────────────────────────────────────────

// GET /api/tips
router.get("/tips", async (req: AuthRequest, res, next) => {
  try {
    const tips = await db.select().from(weeklyTipsTable).orderBy(asc(weeklyTipsTable.sort_order));

    res.json({
      tips: tips.map((t) => ({
        id: t.id,
        title: t.title,
        content: t.content,
        category: t.category,
        iconName: t.icon_name,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
