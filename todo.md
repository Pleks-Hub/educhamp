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
