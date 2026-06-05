# Live Flow Test Notes — educhamp.co

## Sign-In Page (Verified Working)
- URL: https://educhamp.co/sign-in
- Shows clean sign-in card with "Welcome to EduChamp" heading
- Two tabs: "Parent / Teacher" and "Student"
- "Continue with Apple / Google" button (Manus OAuth)
- "Apple Sign-In requires an Apple device" note
- "Don't have an account? Sign up free" link → /landing
- "Back to home" link → /landing

## Flow Verification (Code-Level)
1. Parent clicks "Sign Up Free" → OAuth → returns to /api/oauth/callback
2. New parent user → redirected to /onboarding/parent (3-step wizard)
3. After onboarding → redirected to /parent with toast "Let's add your first student"
4. Parent Dashboard shows empty state with 3-step guide
5. "Add Student" opens EnrolChildModal
6. After student added → ChildCoursesPanel shows "Choose Courses Now" CTA
7. Course dialog auto-selects child's grade with ★ indicator

## Conclusion
The live site is deployed and the sign-in page renders correctly. Full end-to-end testing requires actual OAuth authentication which cannot be automated without user credentials.
