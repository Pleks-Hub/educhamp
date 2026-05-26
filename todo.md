# EduChamp — Algebra I Todo

## Phase 2: Database Schema & Global Styles
- [x] Define full database schema (units, lessons, skills, mastery, quiz questions, diagnostic, sessions, notifications)
- [x] Generate and apply database migrations
- [x] Seed 12-unit curriculum data (units, lessons, skill tags, quiz questions, diagnostic questions)
- [x] Configure global CSS: color palette, typography (Inter + Lora fonts), design tokens
- [x] Set up AIChatBox component review and adaptation

## Phase 3: Dashboard & Navigation
- [x] DashboardLayout with sidebar: logo, nav items (Dashboard, Curriculum, AI Tutor, Diagnostic, Progress, Skill Index)
- [x] Student profile card with name, greeting, and avatar
- [x] Course progress overview card (units completed, current unit, overall mastery)
- [x] Unit mastery grid showing all 12 units with mastery level badges
- [x] Learning path navigation with adaptive unlock logic
- [x] Recommended next steps panel

## Phase 4: Curriculum Browser
- [x] Unit list page with 12 units, mastery badges, and progress indicators
- [x] Unit detail page with lessons list and overview
- [x] Lesson viewer with explanation, TEKS alignment, worked examples
- [x] Guided practice problems with hints (reveal on demand)
- [x] Independent practice problems with solution reveal
- [x] Common misconceptions section per lesson
- [x] Lesson completion tracking

## Phase 5: AI Tutor Chat
- [x] AI Tutor page with mode selector (Teach, Practice, Quiz, Exam Review, Remediation, Parent Summary)
- [x] Streaming token-by-token LLM responses via SSE endpoint
- [x] Context injection: mastery scores, current unit/lesson, mode in system prompt
- [x] Mode-specific system prompt behavior (all 6 modes)
- [x] Session history persistence (last 10 turns)
- [x] Mastery-aware behavior (skip mastered content, flag prerequisite gaps)

## Phase 6: Diagnostic Assessment
- [x] 30-question diagnostic assessment page (6 pre-algebra + 24 unit questions)
- [x] Multiple-choice and short-answer question rendering
- [x] Timer and progress indicator
- [x] Scoring logic: both correct → likely mastered, one correct → partial, both wrong → needs instruction
- [x] Prerequisite threshold: 4+ correct → proceed, <4 → flag gaps
- [x] Placement results page with unit-by-unit recommendations
- [x] Save diagnostic results to database and update mastery scores

## Phase 7: Quiz Engine
- [x] Unit quiz page with 15 questions (5 easy, 5 medium, 3 hard, 2 challenge)
- [x] Multiple-choice and short-answer rendering with difficulty badges
- [x] Quiz submission and scoring
- [x] Automatic mastery score update after quiz completion
- [x] Adaptive path unlock logic (below 60 → reteach, 60–74 → guided practice, 75–89 → unlock quiz, 90+ → challenge)
- [x] Quiz history and score tracking

## Phase 8: Mastery & Progress Dashboard
- [x] Skill-level mastery chart (bar chart per unit)
- [x] Unit completion status timeline
- [x] Mastery level labels: Beginner, Developing, Approaching, Mastered, Advanced
- [x] Skill index page: all ALG1-U[N]-S[N] IDs with names, prerequisites, unit
- [x] Recommended next steps based on mastery scores
- [x] Progress overview with recharts

## Phase 9: Notifications, Tests & Polish
- [x] Guardian notifications: quiz completion, skill mastery achieved, remediation threshold
- [x] Parent Summary mode triggers owner notification
- [x] Vitest tests: 26 tests across mastery logic, adaptive path, skill ID format, tutor prompts, auth
- [x] Loading skeletons and empty states on all pages
- [x] Micro-interactions and smooth transitions (page-enter animations)
- [x] SSE streaming AI tutor endpoint (/api/tutor/stream)
- [x] Final checkpoint and delivery

## Tutor UX & Context Improvements (Round 2)
- [x] Fix AI Tutor chat scroll — auto-scroll to bottom on new messages, scrollable message area with fixed input bar
- [x] Improve conversational UX — cleaner message bubbles, typing indicator, better mode selector layout
- [x] Make Practice/Quiz/Exam Review prompts context-aware — inject student's placement score, unit mastery, and current learning objective into system prompt
- [x] Parent Summary mode — show full learning context: placement score, unit-by-unit mastery, skills below threshold, recommended next steps, recent quiz scores
- [x] Mastery-aware question generation — AI generates questions at the right difficulty based on student's current mastery level per skill

## Parent Module — Multi-Child Management
- [x] DB: parentChildren table (parentId → childId FK, enrolledAt, nickname, gradeLevel, relationship)
- [x] DB: extend users table with accountType enum (student | parent | teacher)
- [x] tRPC: parent.enrollChild — create/link a child account by email or new registration
- [x] tRPC: parent.listChildren — list all children with their mastery + progress summaries
- [x] tRPC: parent.removeChild — unlink a child from the parent account
- [x] tRPC: parent.getChildProgress — full progress report for a specific child
- [x] tRPC: parent.updateChildNickname — rename/label a child in the parent's view
- [x] UI: /parent route — Parent Dashboard with child switcher tabs
- [x] UI: Enrol Child form — email lookup or new child registration (name, grade, school)
- [x] UI: Per-child progress card — mastery by unit, quiz scores, placement result, adaptive path
- [x] UI: Child management actions — remove, rename, view full report
- [x] UI: Parent Summary AI mode — pre-load selected child's context automatically
- [x] Notifications: include child name in all guardian notifications
- [x] Navigation: add "Parent Dashboard" link in sidebar for users with children enrolled
