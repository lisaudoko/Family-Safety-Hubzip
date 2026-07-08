# Education System

## Content Inventory (snapshot of mobile `data/seed.ts`, 2026-07-08 — DB counts may differ; re-count before relying on these)

- **9 courses** (categories: Safety, Digital Wellbeing, Privacy, Security; levels from beginner)
- **64 lessons** (text and structured `LessonSection` formats, with learning objectives, interactive activities, scenarios)
- **13 quizzes** (multiple-choice, `options` + `correct_index`)
- **8 family challenges** (e.g., "Phone-Free Dinner", "Privacy Audit") with step tracking
- **10 assessment questions** (Social Media Readiness Assessment)
- **22 badges** (e.g., "First Lesson", "Safety Pro", "Challenge Master")
- **Weekly tips** (categorized, ordered by `sort_order`)

## Content Sources (important)

Content exists in **two places**:
1. **Database** — `courses`, `lessons`, `quizzes`, `quiz_questions`, `badges`, `weekly_tips` tables served via `/api/curriculum` and related endpoints. Premium lesson content is redacted server-side for free users.
2. **Static seed** — `artifacts/mobile/data/seed.ts` (courses, lessons, quizzes, challenges, assessment questions, badges).

Consolidation is a pending decision; keep both in sync if editing content.

## Modules / Courses

- Course fields: title, category, level, `is_premium`, `is_published`. Learn tab browses by category; premium courses show a lock for free users.

## Lessons

- Belong to a course; sequential availability enforced client-side by `lib/lessonAvailability.ts` (course prerequisites + premium status).
- Lesson may reference a `badge_id` awarded on completion.

## Quizzes

- One quiz per lesson (`quizzes.lesson_id` unique); questions fetched via `GET /api/lessons/:lessonId/quiz`. Taken at `app/quiz/[id].tsx`.

## Progress Tracking

- `user_progress` table (one row per user): `completed_lessons` text array, `course_progress` jsonb, `weekly_tip_index`.
- Mobile: `FamilyContext` tracks lessons, quizzes, challenges, badges; writes AsyncStorage first, syncs via `GET/PUT /api/progress`.

## Badges

- Definitions in `badges` table / seed: title, description, icon_name, color, condition. Awarded for milestones (lesson/course/challenge completion).

## Learning Paths

- No formal learning-path engine exists. Ordering is: course → ordered lessons → quiz, with sequential unlocking via `lessonAvailability.ts`. The Assessment (10 questions, per-category scoring: categories must match `CATEGORY_ICONS`/`CATEGORY_RECOMMENDATIONS` in the assess screen) produces personalized recommendations but does not gate content.
