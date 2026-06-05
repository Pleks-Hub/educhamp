# Research: Best Practices for Course Management in Tutoring Platforms

## Key Patterns from Leading Platforms

### Khan Academy (Parent Features)
- Parents can assign content (quizzes, articles, videos, unit tests, course challenges)
- Real-time progress tracking: learning minutes, skills practiced, skills mastered
- Activity Overview Report per child across all courses
- Free Parent Dashboard as a single hub for visibility

### IXL (Parent Features)
- Parents can suggest/assign skills by subject and grade level
- Clear skill assignment grid with completion tracking
- Parents select subject → grade level → topic → skill plan
- "Star" skills to suggest them to students
- Clear all suggested skills option

### Kumon
- Daily grading and real-time progress tracking
- Both Instructors and parents monitor student performance
- Parental controls for device management during study

### Course Request/Approval Workflow (K-12 Standard)
- Aeries: Counselors request parent approval of student course selections
- Veracross: Faculty/staff approve course requests, creates approval record with log
- Rediker: Schools can require both student request AND parent approval
- Xello: Send approval requests to parents/guardians for course plans

## Best Practice Summary for EduChamp

### Admin Course Management
1. Admin should see a per-student course enrollment table
2. Admin can add/remove/suspend enrollments
3. Suspension = enrollment exists but is inactive (student can't access but data preserved)
4. Audit log for all admin course actions

### Parent Course Management
1. Grade-based bulk assignment: show all courses for student's grade, let parent select multiple
2. Cross-grade browsing: separate tab/section to browse ALL courses regardless of grade
3. Clear visual distinction between "recommended for grade" and "other courses"
4. Bulk operations: select all grade courses, deselect individual ones

### Student Self-Service
1. Students can browse available courses (read-only catalogue)
2. Students can "request" a course → creates pending request
3. Parent receives notification of request
4. Parent approves/denies from their dashboard
5. On approval, student is auto-enrolled and notified

### Notifications
1. When parent assigns courses → student gets in-app notification
2. When student requests course → parent gets notification
3. When parent approves/denies → student gets notification
