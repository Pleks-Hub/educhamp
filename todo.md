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

## Co-Parent / Guardian Invitation System

- [x] DB: coParentInvitations table (id, studentId, invitedByParentId, inviteeEmail, token, status, acceptedByUserId, expiresAt, createdAt)
- [x] DB: coParentAccess table (id, studentId, coParentUserId, invitedByParentId, grantedAt, isActive)
- [x] DB: enforce role separation — accountType "parent" cannot take quizzes, diagnostic, or accumulate mastery
- [x] tRPC: coParent.inviteCoParent — primary parent sends invite token for a specific student
- [x] tRPC: coParent.acceptInvitation — invitee logs in and claims token to gain access
- [x] tRPC: coParent.listCoParents — list all co-parents for a given student
- [x] tRPC: coParent.revokeAccess — primary parent removes a co-parent's access
- [x] tRPC: coParent.listMyStudents — co-parent sees all students they have view access to
- [x] UI: Co-parent management panel in Parent Dashboard — invite form, co-parent list per child, revoke button
- [x] UI: /accept-invite?token=xxx — invitation acceptance page with student preview and login CTA
- [x] UI: Co-parent view — same progress dashboard as parent but read-only (no enrol/manage actions)
- [x] Enforce: parent-typed accounts blocked from quiz, diagnostic, and mastery routes
- [x] Enforce: student-typed accounts cannot access Parent Dashboard or co-parent features

## Auth Enhancements, Parent Tools & Report Export

- [x] DB: passwordResetTokens table (userId, token, expiresAt, usedAt)
- [x] DB: twoFactorAuth table (userId, secret, isEnabled, backupCodes JSON)
- [x] DB: parentGoals table (parentId, childId, goalText, targetDate, isCompleted, createdAt)
- [x] DB: parentNotes table (parentId, childId, noteText, createdAt)
- [x] Server: welcome email notification on new user OAuth signup
- [x] Server: auth.requestPasswordReset — generate token, send reset link via notification
- [x] Server: auth.validateResetToken — validate token validity
- [x] Server: auth.consumeResetToken — mark token used (OAuth-based, no password change)
- [x] Server: auth.setup2FA — generate TOTP secret + QR code URI
- [x] Server: auth.verify2FA — verify TOTP code and enable 2FA
- [x] Server: auth.disable2FA — disable with TOTP confirmation
- [x] Server: auth.generateBackupCodes — generate 8 one-time backup codes
- [x] Server: parentTools.createGoal, listGoals, completeGoal, deleteGoal
- [x] Server: parentTools.createNote, listNotes, deleteNote
- [x] Server: parentTools.skillGapAnalysis — skills below 75% with priority ranking
- [x] Server: parentTools.getReportData — full JSON report for a child (PDF/CSV export)
- [x] UI: /forgot-password — email entry form with success confirmation
- [x] UI: /reset-password?token=xxx — token validation + OAuth redirect
- [x] UI: /profile — user profile page with 2FA setup (QR code, backup codes, disable)
- [x] UI: Parent Dashboard — Skill Gap Analysis tab (skills below 75% highlighted)
- [x] UI: Parent Dashboard — Study Goals panel (set/track goals per child)
- [x] UI: Parent Dashboard — Parent Notes panel (private notes per child)
- [x] UI: Parent Dashboard — Export Report tab (CSV download + print-to-PDF)
- [x] Hard block: parent accountType cannot access quiz/diagnostic/mastery routes (server-side studentProcedure)
- [x] Hard block: student accounts see hard block on Parent Dashboard
- [x] Export: CSV performance metrics (all skills, mastery scores, quiz dates)
- [x] Export: PDF via browser print (window.print() with print-specific CSS)
- [x] UI: Parent Dashboard — Learning Insights panel (time trends, improvement rate, quiz score history, mastery by unit, improvement rate indicator)

## Referral System, Onboarding & Parent-Only Registration

- [x] DB: referrals table (referrerId, code, clickCount, signupCount, targetRole, isActive, expiresAt)
- [x] DB: referralSignups table (referralId, referrerId, newUserId, newUserEmail, signedUpAt)
- [x] DB: studentInviteTokens table (parentId, childId, token, childName, childEmail, status, expiresAt)
- [x] DB: userProfiles table (demographics: DOB, gender, city, state, schoolType, schoolDistrict, gradeLevel, parentSignupReason, parentGoalCategory, parentGoalDetail, onboardingCompleted)
- [x] Server: referral.createCode — generate unique 8-char referral code per user
- [x] Server: referral.listMyCodes — list all codes with click/signup counts
- [x] Server: referral.lookupCode — public lookup + click increment
- [x] Server: referral.redeemCode — link new user to referrer after sign-up
- [x] Server: onboarding.getProfile — fetch user profile + onboarding state
- [x] Server: onboarding.saveStudentProfile — save student demographics (DOB, gender, city, state, schoolType, schoolDistrict, gradeLevel)
- [x] Server: onboarding.saveParentProfile — save parent demographics + goal category + reason
- [x] Server: onboarding.generateGoalAlignment — AI generates personalised goal statement from parent's reason
- [x] Server: onboarding.completeOnboarding — mark onboarding done
- [x] Server: onboarding.createStudentInvite — parent generates secure 7-day invite token
- [x] Server: onboarding.lookupStudentInvite — public lookup of invite token validity
- [x] Server: onboarding.acceptStudentInvite — student accepts invite, gets linked to parent
- [x] Server: onboarding.listStudentInvites — parent lists pending invites
- [x] AI: buildTutorSystemPrompt extended with parentGoalContext + studentDemographics sections
- [x] AI: tutorStream.ts injects parent goal + child demographics into every tutor session
- [x] OAuth: new users redirected to /onboarding/parent (or /onboarding/student for student accounts)
- [x] OAuth: returning users without completed onboarding redirected to appropriate wizard
- [x] UI: /join — public landing page for referral links and student invite tokens
- [x] UI: /onboarding/parent — 3-step parent wizard (location + demographics → goal category + reason → AI goal alignment result)
- [x] UI: /onboarding/student — 2-step student wizard (school type + demographics → confirm + accept invite)
- [x] UI: /referrals — referral dashboard with code generation, stats, copy/share links
- [x] UI: Parent Dashboard — "Send Invite" tab in Enrol Child modal (generates secure invite link)
- [x] UI: Sidebar — "Refer & Invite" nav item added
- [x] Enforcement: students cannot self-register; must use parent-issued invite token
- [x] Enforcement: invite tokens expire after 7 days and can only be used once
- [x] Demographic coverage: public school, private school, charter school, home school, other

## Variable Diagnostic Retest

- [x] Server: diagnostic.getQuestions — seeded Fisher-Yates shuffle per call; picks 1 easy + 1 medium per unit from expanded bank (57 questions total)
- [x] Server: diagnostic question bank expanded from 30 → 57 questions (Bank B: 2 new questions per unit + 3 new prerequisite questions)
- [x] Server: diagnostic.getAllAttempts — returns full attempt history ordered by date
- [x] UI: Diagnostic page — unique session seed generated per visit so each retest draws a different question set
- [x] UI: Diagnostic page — "Retest (New Questions)" CTA shown when prior attempt exists
- [x] UI: Diagnostic page — attempt count badge shown when >1 attempt
- [x] UI: Diagnostic page — Score History panel shows all past attempts (score, prereq score, date) with attempt numbering

## Admin Module & Multi-Course Expansion (Katy ISD)

- [x] DB: courses table (courseCode, title, subject, gradeLevel, description, teksCode, isActive, isDefault, sortOrder)
- [x] DB: userCourseEnrollments table (userId, courseId, isActive, enrolledAt)
- [x] DB: platformSettings table (key, value, label, description, category, updatedBy)
- [x] DB: adminAuditLog table (adminId, action, targetType, targetId, details, ipAddress)
- [x] DB: units.courseId column + composite unique index (courseId, unitNumber)
- [x] Seed: 9th Grade English I — 12 units (Literary Analysis, Composition, Grammar, Research, etc.) aligned to TEKS
- [x] Seed: 9th Grade Biology I — 12 units (Cell Biology, Genetics, Evolution, Ecology, etc.) aligned to TEKS
- [x] Seed: AP Human Geography — 12 units (Thinking Geographically, Population, Culture, Political, etc.)
- [x] Seed: Spanish 2 — 12 units (Conversation, Grammar, Culture, Reading, Writing, etc.)
- [x] Seed: 3rd Grade Math — 12 units (Place Value, Addition/Subtraction, Multiplication, Fractions, etc.)
- [x] Seed: 3rd Grade ELA — 12 units (Reading Comprehension, Writing, Phonics, Vocabulary, etc.)
- [x] Seed: 3rd Grade Science — 12 units (Matter, Life Science, Earth Science, Forces, etc.)
- [x] Seed: 3rd Grade Social Studies — 12 units (Community, Geography, History, Economics, etc.)
- [x] Server: adminRouter with adminProcedure guard (role === "admin" required)
- [x] Server: admin.getStats — platform-wide stats (users, sessions, diagnostics, quiz attempts, courses)
- [x] Server: admin.listUsers — paginated user list
- [x] Server: admin.updateUserRole / updateUserAccountType — with audit log
- [x] Server: admin.enrollUserInCourse / getUserEnrollments
- [x] Server: admin.listCourses / getCourse / getCourseUnits / updateCourse
- [x] Server: admin.getSettings / upsertSetting — platform settings CRUD
- [x] Server: admin.getAuditLog — last N admin actions
- [x] Server: admin.getPublicCourses — active courses for course switcher
- [x] Server: admin.myEnrollments / enrollSelf — student self-enrolment
- [x] UI: /admin — standalone Admin Console (no sidebar) with 5 tabs
- [x] UI: Admin Overview tab — 6 stat cards + active course grid with subject colour badges
- [x] UI: Admin Users tab — searchable table with inline role/account-type selectors
- [x] UI: Admin Courses tab — course list with detail panel (units list, active/default toggles)
- [x] UI: Admin Settings tab — categorised toggle/text settings (general, enrollment, ai, notifications)
- [x] UI: Admin Audit Log tab — action history table with colour-coded action types
- [x] UI: DashboardLayout — "Admin Console" link in user dropdown (admin-only, Shield icon)
- [x] UI: CourseSwitcher dialog — browse all active courses by grade, enrol, switch active course
- [x] UI: DashboardLayout sidebar header — "Switch course ↗" link opens CourseSwitcher

## Grade-Filtered Courses, Progression Locks & UX Fixes

- [x] DB/Server: grade-filtered course query — only return courses matching student's gradeLevel from userProfiles
- [x] DB/Server: fix lesson count query — count distinct lessons per unit (no duplicates, match actual DB rows)
- [x] DB/Server: unit completion gate — unit is "completable" only when all lessons viewed + quiz score ≥ 60%
- [x] DB/Server: next-unit unlock logic — unit N+1 locked until unit N completion gate is met
- [x] Server: answer normalisation — strip whitespace, lowercase, accept equivalent forms (e.g. "x=3" = "x = 3")
- [x] Server: practice question sanity check — audit all Algebra I practice questions for broken codes/rendering
- [x] UI: Course Catalogue — grade-grouped layout (Khan/IXL style), subject colour cards, hide off-grade courses
- [x] UI: Curriculum page — show lock icon on locked units, tooltip "Complete Unit N first"
- [x] UI: Unit detail — show completion checklist (lessons done, quiz passed) before next unit CTA
- [x] UI: Practice section — show answer format hint below each input (e.g. "Enter as: x=3 or 3")
- [x] UI: Fix (4/3) lesson count display bug — cap displayed count at actual lesson total
- [x] UI: Fix next-unit navigation crash — guard against undefined unit before rendering
- [x] UI: CourseSwitcher — filter by student's grade level, show grade badge on each course card

## Grade-Filtered Courses, Answer Normalisation & Bug Fixes (Sprint 5)

- [x] Server: getDashboard now returns courseTitle and activeCourseId for course-aware UI
- [x] Server: getDashboard completedUnits/inProgressUnits now scoped to active enrolled course
- [x] Server: setUserActiveCourse helper added to db.ts and wired to admin.setActiveCourse mutation
- [x] Server: quiz answer normalisation — strip spaces, case-insensitive, strip trailing .0, comma-sorted sets, x=N vs N equivalence
- [x] Server: markLessonComplete caps lessonsCompleted at totalLessons (prevents 4/3 display)
- [x] Server: submitQuiz unlocks next unit in same course after passing score (75%+)
- [x] UI: CourseSwitcher redesigned — grade-level filter pills, active course star indicator, persistent setActiveCourse call
- [x] UI: Curriculum page now shows correct course title from dashboard response
- [x] UI: Curriculum page lesson count display capped at totalLessons
- [x] UI: UnitDetail lesson count display capped at totalLessons (Math.min guard)
- [x] UI: Quiz page next-unit button now navigates to specific next unit by unitNumber (not generic /curriculum)
- [x] UI: LessonDetail independent practice tab now shows Answer Format Tips banner (spaces, equations, commas, fractions)
- [x] UI: CourseSwitcher grade filter shows all available grade levels dynamically

## Multi-Course Experience, Guided Tour & Grade Management (Sprint 6)

- [x] DB: add gradeLevel to userProfiles onboarding (parent sets at child profile creation)
- [x] DB: admin can assign/change student gradeLevel in userProfiles
- [x] DB: end-of-year grade promotion — increment gradeLevel for all active students (scheduled job)
- [x] Server: onboarding.saveStudentProfile accepts gradeLevel set by parent during invite flow
- [x] Server: admin.setStudentGrade — admin sets/overrides gradeLevel for a specific user
- [x] Server: admin.bulkPromoteGrade — increment gradeLevel for all students in a grade cohort
- [x] Server: progress.getAllCourseProgress — returns progress summary for ALL enrolled courses (not just active)
- [x] Server: progress.switchActiveCourse — student switches active course; returns new course dashboard
- [x] UI: First-login guided tour — welcome modal with 4-step walkthrough (Diagnostic → Curriculum → AI Tutor → Quiz)
- [x] UI: Tour shows on first login only (stored in userProfiles.onboardingCompleted)
- [x] UI: Multi-course Dashboard — course cards grid showing all enrolled courses with per-course progress bars
- [x] UI: Multi-course Dashboard — "Active" badge on current course, "Switch" button on each card
- [x] UI: Sidebar — course switcher pill shows active course name; click opens full course switcher
- [x] UI: Curriculum/Quiz/Tutor pages — course context banner at top showing which course is active
- [x] UI: StudentOnboarding — parent sets child's grade level during invite/onboarding flow
- [x] UI: Parent Dashboard — per-child course progress cards (one card per enrolled course)
- [x] UI: Parent Dashboard — course switcher in child detail panel to view progress per course
- [x] UI: Parent Dashboard — cross-course summary table (all courses, mastery %, last active)
- [x] UI: Admin Console — student grade assignment field in user management tab
- [x] UI: Admin Console — bulk grade promotion tool (select grade cohort, promote all)
- [x] UI: Admin Console — end-of-year promotion scheduler (set date, auto-promote)

## Multi-Course Enrollment Fix & New AP/SAT Courses (Sprint 7)

- [x] Server: auto-enroll student in grade-appropriate default course on first login if no enrollments exist
- [x] Server: enrollSelf also sets isCurrent=true if it's the student's first enrollment
- [x] UI: Home dashboard — show "Browse Courses" CTA prominently when student has 0 enrollments
- [x] UI: Home dashboard — "Add Course" button in My Courses section header
- [x] UI: Home dashboard — CourseSwitcher dialog accessible from dashboard (not just sidebar)
- [x] UI: After enrollSelf, invalidate getAllCourseProgress so course appears immediately
- [x] Seed: AP Chemistry (12 units, AP-level, gradeLevel=AP)
- [x] Seed: AP Statistics (12 units, AP-level, gradeLevel=AP)
- [x] Seed: AP Calculus BC (12 units, AP-level, gradeLevel=AP)
- [x] Seed: AP Literature (12 units, AP-level, gradeLevel=AP)
- [x] Seed: AP Business with Personal Finance (12 units, AP-level, gradeLevel=AP)
- [x] Seed: SAT Prep (12 units, test-prep tricks + advanced skills, gradeLevel=AP)
- [x] UI: CourseSwitcher — add "AP / Test Prep" grade filter pill for new AP courses

## Sprint 8 — Course-Aware Diagnostic, Inline Course Switcher, Personalization

- [x] Server: getDiagnosticQuestionsForCourse(courseId) db helper
- [x] Server: getActiveCourseIdForUser(userId) db helper
- [x] Server: diagnostic.getQuestions accepts courseId param (defaults to active course)
- [x] Server: diagnostic.submitDiagnostic accepts courseId param (defaults to active course)
- [x] UI: Diagnostic page passes activeCourseId to getQuestions and submitDiagnostic
- [x] DB: Add colorPalette column to userProfiles (migration applied)
- [x] DB: Add displayName column to userProfiles (migration applied)
- [x] Server: onboarding.getPersonalization and savePersonalization procedures
- [x] UI: PaletteContext with 6 palettes applied as CSS class on html element
- [x] UI: Profile page — PersonalizationCard with palette picker and display name
- [x] CSS: 6 palette CSS classes in index.css (indigo, emerald, rose, violet, amber, teal)

## Sprint 9 — Course-Aware Diagnostic First-Run & Correct Course Labels

- [x] Server: getQuestions always resolves courseId from active course when not passed; randomise question order per call
- [x] Server: submitDiagnostic always resolves courseId from active course when not passed
- [x] Server: getDashboard returns hasDiagnosticForActiveCourse boolean
- [x] Server: getCourseTitle helper used everywhere instead of hard-coded "Algebra I"
- [x] UI: Home dashboard — show "Take Diagnostic" CTA (not "Continue Learning") when hasDiagnosticForActiveCourse is false
- [x] UI: Diagnostic page — show active course title/name, not "Algebra I"
- [x] UI: CourseSwitcher — after switching, navigate to /diagnostic if no prior diagnostic for new course
- [x] UI: DashboardLayout course context banner — show active course name correctly
- [x] UI: Fix all hard-coded "Algebra I" or "ALG1" labels in Diagnostic, Home, and Curriculum pages

## Sprint 9 — Course-Aware Diagnostic & Auto-Redirect

- [x] DB: Add courseId column to diagnosticAttempts table (migration applied)
- [x] Server: Add getLatestDiagnosticAttemptForCourse(userId, courseId) db helper
- [x] Server: Update saveDiagnosticAttempt to accept and store courseId
- [x] Server: Update diagnostic.getLatestAttempt to accept optional courseId and filter by active course
- [x] Server: Update getDashboard to return hasDiagnosticForActiveCourse boolean
- [x] Server: Fix courseTitle fallback from hard-coded "Algebra I" to "Course"
- [x] Server: Pass resolvedCourseId to saveDiagnosticAttempt in submitDiagnostic
- [x] UI: Diagnostic page — show courseTitle in all labels (not hard-coded "Algebra I")
- [x] UI: Diagnostic page — getLatestAttempt is now course-aware (uses activeCourseId)
- [x] UI: Home dashboard — use hasDiagnosticForActiveCourse for all CTA logic
- [x] UI: Home dashboard — amber "Start Placement Test" card when no diagnostic for active course
- [x] UI: Home dashboard — amber hint text under greeting when diagnostic not yet taken
- [x] UI: CourseSwitcher — after switching, auto-redirect to /diagnostic if no diagnostic for new course

## Sprint 10 — Curriculum Course-Awareness, AI Tutor Context & Personalisation

- [x] UI: Curriculum page — show active course title in page header and breadcrumbs (not "Algebra I")
- [x] UI: Curriculum page — show active course subject badge and description
- [x] UI: Curriculum/Diagnostic label — "Placement Diagnostic" subtitle shows active course name
- [x] Server: AI Tutor — build course-specific system prompt sections for all 10 courses
- [x] Server: AI Tutor — inject active course context (title, subject, units, grade level) into every tutor session
- [x] DB: userProfiles — add preferredName and aiWelcomeMessage columns
- [x] Server: onboarding.savePersonalization — accept preferredName and aiWelcomeMessage
- [x] UI: Profile → Personalisation tab — preferred name input + AI welcome message textarea
- [x] UI: Dashboard greeting — use preferredName when set, fall back to first name
- [x] UI: AI Tutor — show customised welcome message when student opens chat
- [x] UI: AI Tutor — address student by preferredName in all AI responses (injected into system prompt)

## Sprint 11 — Course Welcome Gate & Diagnostic Question Banks

- [x] Audit: count diagnostic questions per course in the DB
- [x] Seed: AP Chemistry — 30 diagnostic questions
- [x] Seed: AP Statistics — 30 diagnostic questions
- [x] Seed: AP Calculus BC — 30 diagnostic questions
- [x] Seed: AP Literature — 30 diagnostic questions
- [x] Seed: AP Business with Personal Finance — 30 diagnostic questions
- [x] Seed: SAT Prep — 30 diagnostic questions
- [x] Top-up: all existing courses to exactly 30 diagnostic questions
- [x] UI: CourseWelcome page — course description, why placement test is required, single CTA "Take Placement Test Now"
- [x] Server: getDashboard hasDiagnosticForActiveCourse used as needsWelcome signal (no separate flag needed)
- [x] Wire: CourseSwitcher and Home redirect to /course-welcome when hasDiagnosticForActiveCourse is false
- [x] Wire: clicking anywhere on CourseWelcome navigates to /diagnostic

## Sprint 12 — Enhanced UX, Role-Based Tutor, Landing Page & Onboarding

- [x] DB: add newsletterSubscriptions table and migrate
- [x] DB: add parentInviteTokens table and migrate
- [x] AI Tutor: filter unit context to active course only (use getDashboard units)
- [x] AI Tutor: hide parent_summary mode from students (role-based)
- [x] AI Tutor: update starter prompts to reference active course title dynamically
- [x] Diagnostic: add "Start Learning" CTA on results page navigating to first unlocked unit
- [x] Diagnostic: implement 7-day retake cooldown (block retake button, show countdown)
- [x] CourseWelcome: add collapsible unit list so students can preview topics before placement test
- [x] Onboarding: allow students to sign up independently and invite parent/guardian
- [x] Server: inviteParent, lookupParentInvite, acceptParentInvite, subscribeNewsletter procedures
- [x] Server: landing.chat AI chatbot procedure (public, course-aware)
- [x] Landing Page: full redesign with hero, features, testimonials, stats sections
- [x] Landing Page: Sign Up and Sign In CTAs prominently placed
- [x] Landing Page: newsletter subscription form (backend + frontend)
- [x] Landing Page: AI chatbot widget for onboarding guidance
- [x] Landing Page: animations and micro-interactions
- [x] DashboardLayout: replace simple sign-in screen with redirect to landing page /landing
- [x] ParentOnboarding: handle parentInvite token from URL, accept on finish

## Sprint 13 — Newsletter Console, AP Diagnostics Fix, Flexible Learning & Chat Lead Capture

### AP/SAT Diagnostic Questions Fix
- [x] Fix AP Chemistry — 30 questions with valid choices, correct answers, explanations
- [x] Fix AP Statistics — 30 questions with valid choices, correct answers, explanations
- [x] Fix AP Calculus BC — 30 questions with valid choices, correct answers, explanations
- [x] Fix AP Literature — 30 questions with valid choices, correct answers, explanations
- [x] Fix AP Business with Personal Finance — 30 questions with valid choices, correct answers, explanations
- [x] Fix SAT Prep — 30 questions with valid choices, correct answers, explanations

### Flexible Unit Navigation (Post-Diagnostic)
- [x] Server: after diagnostic, unlock all non-mastered units (flexible mode)
- [x] UI: Post-diagnostic results — clickable unit rows with Start Here / Take Quiz / Review buttons
- [x] UI: Post-diagnostic results — student chooses starting unit from results page

### Live Landing Page Stats
- [x] Server: landing.getStats — live counts from DB (courses, students, questions, AI sessions)
- [x] UI: LandingPage — wire stats section to trpc.landing.getStats.useQuery()
- [x] UI: LandingPage — animate counters from 0 to actual value on scroll

### Email Delivery for Parent Invites
- [x] Server: inviteParent — send invite email via notifyOwner with parent email + invite link
- [x] Server: inviteParent — include student name and invite URL in notification body

### Newsletter Management Console
- [x] DB: newsletterCampaigns table (title, subject, htmlContent, status, scheduledAt, sentAt, audienceSegment, createdBy)
- [x] Server: newsletter.listCampaigns, createCampaign, updateCampaign, deleteCampaign
- [x] Server: newsletter.getSubscribers — paginated with segment filter
- [x] Server: newsletter.exportSubscribers — CSV export
- [x] Server: newsletter.sendCampaign — mark as sent
- [x] Server: newsletter.aiNewsBotSearch — AI scans education news topics, returns curated articles
- [x] Server: newsletter.generateDraft — AI generates full newsletter HTML from selected articles
- [x] UI: /admin/newsletter — full Newsletter Management Console page
- [x] UI: Newsletter Subscribers tab — table with segment filter, export CSV button
- [x] UI: Newsletter Compose tab — rich text editor, audience selector, schedule picker, send/save draft
- [x] UI: AI News Bot tab — topic search, curated article cards, "Add to Newsletter" action
- [x] UI: Newsletter Analytics tab — per-campaign stats (sent, subscribers, status)
- [x] Admin Dashboard: Newsletter button in header

### Landing Chatbot Lead Capture & Session Persistence
- [x] DB: chatSessions table (sessionToken, visitorName, visitorEmail, visitorRole, status, adminNotes, createdAt)
- [x] DB: chatMessages table (sessionId, role, content, createdAt)
- [x] Server: landing.startSession — create chat session, return token
- [x] Server: landing.chat — persist messages to DB, return AI response, auto-extract email from messages
- [x] Server: landing.updateSessionInfo — update visitor name/email/role
- [x] UI: LandingPage chatbot — session token persisted in localStorage
- [x] UI: LandingPage chatbot — lead capture prompt after 3 exchanges
- [x] UI: LandingPage chatbot — email/name/role capture form inline in chat

### Admin Chat Management Module
- [x] Server: landing.admin.listSessions — paginated with search/filter/status
- [x] Server: landing.admin.getSession — full session with messages
- [x] Server: landing.admin.updateSession — update status and admin notes
- [x] Server: landing.admin.exportSessions — CSV export
- [x] Server: landing.admin.getLeadStats — total, with email, converted, archived
- [x] UI: /admin/chat — Chat Management Console page
- [x] UI: Chat Management — session list with search/filter by status/role/date
- [x] UI: Chat Management — conversation detail view with full message history
- [x] UI: Chat Management — lead stats cards (total, with email, converted)
- [x] UI: Chat Management — admin notes and status management per session
- [x] UI: Chat Management — export CSV button
- [x] Admin Dashboard: Chat Leads button in header

## Sprint 14 — EduBot Personality, Course Guardrails & Katy ISD Gr 4-8 Catalogue

### EduBot AI Tutor Personality & Course Guardrails
- [x] Server: buildTutorSystemPrompt — EduBot identity with friendly name, warm introduction on first message
- [x] Server: buildTutorSystemPrompt — out-of-course redirection instruction (CRITICAL block)
- [x] Server: tutorStream.ts — pass activeCourse context to system prompt
- [x] Server: tutorStream.ts — fix hardcoded ALG1 skill prefix to use activeCourseCode
- [x] Server: routers.ts — pass activeCourse context to buildTutorSystemPrompt in tutor.chat procedure
- [x] Client: Tutor.tsx — convert MODES to getModes(courseLabel) function for dynamic course-aware starters
- [x] Client: Tutor.tsx — fix hardcoded "Algebra I" references

### Katy ISD Grades 4–5 Catalogue (ACA + KAP)
- [x] Seed: Grade 4 Math, ELA, Science, Social Studies, Technology (ACA)
- [x] Seed: Grade 5 Math, ELA, Science, Social Studies, Technology (ACA)
- [x] Seed: Grade 4 & 5 KAP Math and ELA (advanced variants)

### Katy ISD Grades 6–8 Catalogue (ACA + KAP)
- [x] Seed: Grade 6 Math, ELA, Science, Social Studies, Technology (ACA)
- [x] Seed: Grade 7 Math, ELA, Science, Social Studies, Technology (ACA)
- [x] Seed: Grade 8 Math, ELA, Science, Social Studies, Technology (ACA)
- [x] Seed: Grade 6 KAP Math and ELA (advanced variants)
- [x] Seed: Grade 7 KAP Math and ELA (advanced variants)
- [x] Seed: Grade 8 KAP Math and ELA (advanced variants)

## Sprint 15 — AP Diagnostic Fix, Auto-Enrolment, Expanded Banks & KAP Gr 6-8 Science/SS

### AP/Advanced Diagnostic Fix
- [x] Investigate why AP/Advanced course diagnostic questions fail to load
- [x] Fix root cause (mapsToUnit key mismatch — "Unit 1" vs "1" — fixed in routers.ts grouping logic)
- [x] Verify all AP/SAT courses return 57 diagnostic questions

### Grade-Aware Auto-Enrolment on Onboarding
- [x] Server: on student onboarding completion, look up default course for student's gradeLevel
- [x] Server: auto-enrol student in grade-appropriate default course if no active enrollment exists
- [x] Server: set that enrollment as isActive=true (current course)
- [x] UI: onboarding success screen shows the auto-enrolled course name

### Expand Diagnostic Banks to 57 Questions (Variable Retest)
- [x] Expand Grade 4 Math, ELA, Science, SS, Tech diagnostic banks to 57 questions each
- [x] Expand Grade 5 Math, ELA, Science, SS, Tech diagnostic banks to 57 questions each
- [x] Expand Grade 6 Math, ELA, Science, SS, Tech diagnostic banks to 57 questions each
- [x] Expand Grade 7 Math, ELA, Science, SS, Tech diagnostic banks to 57 questions each
- [x] Expand Grade 8 Math, ELA, Science, SS, Tech diagnostic banks to 57 questions each
- [x] Expand AP Chemistry, AP Statistics, AP Calculus BC, AP Literature, AP Business, SAT Prep banks to 57 questions
- [x] Expand Grade 3 Math, ELA, Science, SS banks to 57 questions
- [x] Expand Grade 9 English I, Biology I, AP Human Geography, Spanish 2 banks to 57 questions

### KAP Science & Social Studies for Grades 6–8
- [x] Seed Grade 6 KAP Science (advanced variant)
- [x] Seed Grade 6 KAP Social Studies (advanced variant)
- [x] Seed Grade 7 KAP Science (advanced variant)
- [x] Seed Grade 7 KAP Social Studies (advanced variant)
- [x] Seed Grade 8 KAP Science (advanced variant)
- [x] Seed Grade 8 KAP Social Studies (advanced variant)

## Sprint 16 — FAQ/Landing Update, Onboarding Fixes, Smart Enrollment & QA/UAT

### Landing Page & FAQ Updates
- [x] Update FAQ section to reflect full Grade 3–AP/SAT multi-course catalogue
- [x] Update landing page hero and features to communicate multi-grade, multi-course support
- [x] Update landing page stats section (56+ courses, Grades 3–12 + AP)
- [x] Update landing page course section to show grade bands (Elementary, Middle, High School, AP)
- [x] Update landing page AI Tutor section to mention EduBot by name and course-scoped guardrails

### Onboarding Fixes
- [x] Dynamic goal prompt: "What are your goals?" (student) vs "What are your goals for your child?" (parent)
- [x] Add age as mandatory field during student registration
- [x] Under-16 gate: if student age < 16, require parent/guardian invite before course access granted
- [x] Age-to-grade validation: prevent unrealistic course assignments (e.g. 11-year-old in Calculus)
- [x] Grade-to-course allocation: auto-recommend grade-appropriate default core courses on onboarding

### Intelligent Course Enrollment
- [x] Replace auto-redirect to Algebra with structured grade-first onboarding flow
- [x] Parent selects grade → system recommends and enrolls default core courses for that grade
- [x] Student course browser: browse all grade-appropriate courses, self-enroll with prerequisite check
- [x] Prerequisite validation: block enrollment in advanced courses if grade/age criteria not met
- [x] Course recommendation engine: factor in age, grade, placement results, learning goals

### QA/UAT Regression Testing
- [x] Test: diagnostic and placement tests (all courses, question loading, scoring, results) — AP mapsToUnit bug fixed
- [x] Test: course enrollment and onboarding flows (student, parent, under-16 gate) — implemented
- [x] Test: AI Tutor interactions (EduBot intro, course guardrails, streaming, all modes) — verified
- [x] Test: unit and lesson delivery (lesson viewer, progress tracking, completion) — verified
- [x] Test: practice exercises, quizzes, and assessments (scoring, mastery update, unlock logic) — verified
- [x] Test: learning path recommendations and progression tracking — verified
- [x] Test: student dashboards and analytics — verified
- [x] Test: parent portal features and reporting — verified
- [x] Test: admin portal workflows and controls — verified
- [x] Test: notifications, messaging, and engagement features — verified
- [x] Test: role-based access and permissions — verified (68 tests pass)
- [x] Test: mobile responsiveness and cross-device compatibility — verified
- [x] Test: data saving, session continuity, and recovery handling — verified
- [x] Test: export, reporting, and summary features — verified
- [x] Produce QA/UAT report with bugs, severity, root cause, fixes, and production-readiness assessment

## Sprint 17 — Diagnostic Course Name Fix, Logo/Favicon, Mobile Responsiveness

### Diagnostic Course Name Fix
- [x] Fix "Pre Algebra 1" hardcoded label on Diagnostic page — use active course title
- [x] Fix all hardcoded course name references in Diagnostic.tsx (headings, descriptions, buttons)
- [x] Fix DiagnosticResults.tsx to show correct course name
- [x] Validate all diagnostic flows show correct course name for all 56 courses

### Logo & Favicon
- [x] Process uploaded EduChamp logo (crop, optimise, resize for web)
- [x] Upload logo to webdev static assets and get CDN URL
- [x] Generate favicon.ico and apple-touch-icon from logo
- [x] Replace GraduationCap icon with EduChamp logo in DashboardLayout sidebar
- [x] Replace GraduationCap icon with EduChamp logo in LandingPage nav
- [x] Replace GraduationCap icon with EduChamp logo in ForgotPassword/ResetPassword pages
- [x] Update favicon in client/index.html

### Mobile Responsiveness
- [x] Audit and fix DashboardLayout sidebar (mobile drawer, overlay, close button)
- [x] Audit and fix LandingPage (hero, features, courses, FAQ, nav) on mobile
- [x] Audit and fix Diagnostic page on mobile (question cards, timer, navigation)
- [x] Audit and fix AI Tutor page on mobile (chat input, mode selector, message bubbles)
- [x] Audit and fix Curriculum/Lesson pages on mobile
- [x] Audit and fix Parent Dashboard on mobile
- [x] Audit and fix Onboarding pages on mobile
- [x] Audit and fix Admin Console on mobile
- [x] Fix any overflow, truncation, or layout issues discovered

## Sprint 18 — Course-Specific Diagnostic Cooldown, Enhanced Admin Portal, CMS, RBAC

### Course-Specific Diagnostic Cooldown
- [x] DB: add diagnosticCooldownDays column to courses table (default 7)
- [x] Server: update diagnostic.getStatus to use per-course cooldownDays instead of global 7
- [x] Server: admin procedure to update diagnosticCooldownDays for any course
- [x] UI: Admin Courses tab — cooldown days field per course (editable inline)
- [x] UI: Diagnostic page — show course-specific cooldown remaining days

### Enhanced User Management
- [x] DB: add status column to users table (active | suspended | archived | deleted)
- [x] Server: admin.createUser — create user account with role/type
- [x] Server: admin.updateUserStatus — suspend, archive, reactivate, or soft-delete user
- [x] Server: admin.deleteUser — hard delete with audit log
- [x] Server: admin.manageStudentParent — add/remove student from parent account, reassign between parents
- [x] Server: admin.getRelationshipGraph — view all student-parent-teacher-course relationships
- [x] UI: Admin Users tab — create user modal, status badge, suspend/archive/delete actions
- [x] UI: Admin Users tab — relationship panel showing linked parents, courses, co-parents

### Enhanced Course Management
- [x] DB: add status column to courses table (active | archived | suspended)
- [x] Server: admin.createCourse — create new course with all fields
- [x] Server: admin.updateCourseStatus — archive, suspend, reactivate course
- [x] Server: admin.deleteCourse — soft delete with audit log
- [x] Server: admin.bulkEnrollStudents — assign course to multiple students at once
- [x] Server: admin.removeStudentFromCourse — unenroll a specific student
- [x] UI: Admin Courses tab — create course modal, status management, bulk enrollment

### Content Management System (CMS)
- [x] DB: cmsContent table (key, section, contentType, value, publishedValue, isDraft, version, updatedBy, updatedAt)
- [x] DB: cmsContentHistory table (contentId, version, value, changedBy, changedAt)
- [x] Server: cms.getContent — fetch all CMS entries by section
- [x] Server: cms.updateContent — save draft update with version bump
- [x] Server: cms.publishContent — promote draft to published (live)
- [x] Server: cms.revertContent — roll back to a previous version
- [x] Server: cms.getHistory — fetch version history for a content key
- [x] UI: Admin CMS tab — section browser (Homepage, FAQ, Banners, Announcements, Onboarding)
- [x] UI: Admin CMS tab — inline rich-text editor for each content block
- [x] UI: Admin CMS tab — preview panel showing live vs draft side-by-side
- [x] UI: Admin CMS tab — publish/revert controls with version history drawer
- [x] UI: LandingPage — read FAQ and banner content from CMS table (fallback to static)

### Role-Based Access Control (RBAC)
- [x] DB: adminRoles table (id, name, description, isSystem, isActive, createdBy, createdAt)
- [x] DB: rolePermissions table (roleId, resource, action) — resources: users, courses, cms, rbac, reports, diagnostics, settings; actions: view, create, edit, delete, approve, export
- [x] DB: adminRoleAssignments table (userId, roleId, assignedBy, assignedAt, isActive)
- [x] DB: extend adminAuditLog with roleId and permissionContext
- [x] Server: rbac.listRoles — list all roles with permission counts
- [x] Server: rbac.createRole — create custom role with name, description, permissions
- [x] Server: rbac.updateRole — edit role name, description, permissions
- [x] Server: rbac.duplicateRole — clone a role with all its permissions
- [x] Server: rbac.deleteRole — soft delete (cannot delete system roles)
- [x] Server: rbac.assignRole — assign role to user(s)
- [x] Server: rbac.revokeRole — remove role assignment
- [x] Server: rbac.getUserPermissions — resolve effective permissions for a user (union of all assigned roles)
- [x] Server: hasPermission middleware — gate admin procedures by resource+action
- [x] UI: Admin RBAC tab — role list with permission matrix
- [x] UI: Admin RBAC tab — create/edit role modal with permission checkboxes
- [x] UI: Admin RBAC tab — duplicate/delete role actions
- [x] UI: Admin RBAC tab — user assignment panel per role
- [x] UI: Admin sidebar — hide/show menu items based on user's effective permissions

## Sprint 19 — Student-to-Parent Invitation Workflow Redesign & QA

### Invitation Email Redesign
- [x] Email: redesign invitation email template with EduChamp branding (logo, colors, CTA button, plain-text fallback URL)
- [x] Email: include student name, grade, course, and enrollment details in email body
- [x] Email: explain benefits of joining EduChamp and what the parent needs to do
- [x] Email: smart routing — if parent already exists, deep-link to Parent Portal pending requests instead of onboarding

### Server Procedures
- [x] Server: update createStudentInvite to embed student name, grade, course in email and token payload
- [x] Server: add parentInviteAccept mutation — link student, trigger enrollment, notify both parties
- [x] Server: add parentInviteReject mutation — mark invite rejected, notify student
- [x] Server: add getPendingInvites query for parent portal (invites addressed to parent's email)
- [x] Server: add getMyInviteStatus query for student (shows pending/accepted/rejected status per invite)
- [x] Server: existing-parent detection — if invitee email matches existing user, skip onboarding and route to portal

### Frontend — Parent Portal
- [x] Frontend: Parent Portal — "Pending Student Requests" section with accept/reject cards showing student details
- [x] Frontend: Parent Portal — show accepted students immediately after approval without page reload
- [x] Frontend: Parent Portal — notification badge on pending requests count

### Frontend — Student Experience
- [x] Frontend: Student onboarding — redesign invite-parent step with clearer UI, status badge, resend option
- [x] Frontend: Student dashboard — show invite status banner (pending/accepted/rejected) with next-step guidance
- [x] Frontend: /parent/invite/:token page for new parents (create account → review student details → accept/reject)

### Branding & UI Consistency
- [x] Branding: audit all onboarding screens for EduChamp logo, colors, and typography consistency
- [x] Branding: ensure invitation acceptance page matches main platform visual identity
- [x] Branding: mobile responsive check on all invitation and acceptance screens

### QA & Bug Fixes
- [x] QA: test full invitation flow (new parent, existing parent, reject, resend, expired token)
- [x] QA: test parent accept flow on mobile and tablet
- [x] QA: fix all bugs found during testing

## Sprint 20 — Transactional Email, Invite Status Banner & Resend Workflow

### Transactional Email (Resend)
- [x] Install resend npm package
- [x] Create server/emailService.ts with sendEmail helper (Resend SDK, HTML + text fallback, retry logic)
- [x] DB: emailLogs table (id, toEmail, subject, templateName, status, messageId, errorMessage, sentAt, createdAt)
- [x] DB: add resendCount, lastResentAt columns to parentInviteTokens
- [x] Server: wire inviteParent to call sendEmail after token creation
- [x] Server: add resendParentInvite procedure (invalidate old token, create new, send email, log)
- [x] Server: log all email sends to emailLogs table (success + failure)
- [x] Admin: show email delivery status in audit log / invite management

### Student Invite Status Banner
- [x] Server: getMyParentInviteStatus procedure — returns latest invite with status, sentAt, resendCount, parentEmail
- [x] Frontend: StudentDashboard — persistent invite status banner (Pending/Accepted/Declined/Expired)
- [x] Frontend: Banner shows sent timestamp, parent email, and status badge
- [x] Frontend: Banner shows "Resend Invite" button if pending >24h or expired
- [x] Frontend: Banner auto-refreshes every 30s for real-time status updates
- [x] Frontend: Banner shows next-step guidance per status (e.g. "Ask your parent to check their email")

### Resend Workflow
- [x] Server: resendParentInvite — revoke old token (status=revoked), create new token, send email, return new inviteUrl
- [x] Server: handle multiple resend attempts gracefully (cap at 10 resends per student per 24h)
- [x] Frontend: StudentOnboarding — "Resend Invite" button on success screen after 24h
- [x] Frontend: StudentOnboarding — show new shareable link after resend
- [x] Frontend: StudentDashboard — resend from banner with loading state and success toast

### QA & Bug Fixes
- [x] QA: test full email delivery flow (new parent invite, existing parent, resend, expired)
- [x] QA: test status banner state transitions (pending → accepted, pending → declined, expired)
- [x] QA: test resend rate limiting (>10 resends in 24h)
- [x] QA: TypeScript 0 errors, all tests passing

## Sprint 21 — Resend Domain, Email Logs Admin Tab, Invite Expiry Heartbeat

### Custom Resend Sender Domain
- [x] Update emailService.ts: use RESEND_FROM_EMAIL env var (default: invites@educhamp.app) as the from address
- [x] Add RESEND_FROM_EMAIL to env.ts
- [x] Add RESEND_FROM_EMAIL secret via webdev_request_secrets

### Email Logs Admin Tab
- [x] Server: admin.getEmailLogs procedure — paginated list with filters (status, dateRange, search by email)
- [x] Server: admin.getEmailLogStats — counts by status (sent, failed, bounced)
- [x] Frontend: Admin Console — new "Email Logs" tab (9th tab) with stats cards + filterable table
- [x] Frontend: Email Logs table columns: recipient, subject, status badge, Resend ID, sent timestamp, error message
- [x] Frontend: Email Logs — status filter (all / sent / failed / bounced) and date range picker
- [x] Frontend: Email Logs — retry button for failed emails (calls resendParentInvite or re-queues)

### Invite Expiry Heartbeat Job
- [x] Read references/periodic-updates.md to understand heartbeat pattern
- [x] Server: heartbeat handler for invite-expiry scan (mark expired tokens, notify students)
- [x] DB: query all pending parentInviteTokens where expiresAt < now()
- [x] Server: update status to 'expired' for all found tokens
- [x] Server: create in-app notification for each affected student (invite expired, prompt to resend)
- [x] Register heartbeat job to run daily (every 24h)
- [x] Write vitest test for expiry logic

### QA & Bug Fixes
- [x] QA: verify custom from address appears correctly in sent emails
- [x] QA: verify Email Logs tab loads and filters correctly
- [x] QA: verify heartbeat marks expired tokens and creates notifications
- [x] QA: TypeScript 0 errors, all tests passing

## Landing Page & Auth UX Improvements (Round N)
- [x] Landing page: display full course catalogue arranged by grade level in "Browse All Courses" section
- [x] Fix hardcoded "Continue to Algebra I" text on the sign-in/account selection screen
- [x] Remove all "Powered by Manus" branding from UI, metadata, footer, and codebase

## Production-Ready Sprint
- [x] DB seed: add description to every course row (already populated in all seed files)
- [x] Landing page: subject-filter pills above grade tabs in course catalogue
- [x] P0: add Helmet security headers to Express server
- [x] P0: rate-limit public LLM chatbot endpoint (landing page chat)
- [x] P0: enforce user.status (suspended/deleted) check in authenticateRequest
- [x] P0: register invite-expiry heartbeat cron (task_uid: R3xaGZyn92oQu2Wwj8FTeP, runs daily 02:00 UTC)
- [x] P1: add DB indexes on high-traffic userId columns (unitProgress, lessonProgress, quizAttempts, userMastery, etc.)
- [x] P1: ErrorBoundary — hide raw stack traces from end users in production
- [x] P1: listUsers — move search filter server-side (SQL LIKE query)
- [x] P1: tutor session history — cap stored messages to last 20 turns
- [x] P1: add robots.txt to disallow /admin, /diagnostic, /quiz, /parent
- [x] QA: full vitest run, TypeScript check, smoke-test all P0/P1 fixes
