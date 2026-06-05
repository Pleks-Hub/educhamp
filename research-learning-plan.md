# Learning Plan Research Notes

## Khan Academy Study Plans (Khanmigo)
- AI-powered conversational approach: asks student about subjects, time available, preferences
- Generates a daily schedule with time blocks
- Prioritizes harder subjects first (when brain is fresh)
- Flexible — can be adjusted
- Tracks adherence over time

## Khan Academy Daily Schedules
- Template-based: PreK-2, 3-5, 6-9, 10-12
- Time-blocked: specific hours for each activity
- Mix of subjects with breaks
- Includes enrichment/creative time
- Downloadable PDFs

## Duolingo Streak Mechanics (Best Practices)
- Daily streak counter (consecutive days of activity)
- Streak freeze (forgiveness mechanism — 1 missed day doesn't break streak)
- Visual progression: fire emoji, increasing flame size
- Milestone celebrations: 7-day, 30-day, 100-day, 365-day
- Social proof: share streaks with friends
- Loss aversion: "Don't lose your X-day streak!"
- Streak ramp-up: increasing rewards as streak grows
- Weekend amulets: protect weekend streaks

## Learning Plan Design Principles (from research)
1. **Simple setup** — 3-5 questions max to generate initial plan
2. **AI-assisted** — system suggests, student confirms
3. **Weekly view** — not daily (less overwhelming)
4. **Flexible** — drag-and-drop to rearrange
5. **Progress tracking** — show adherence percentage
6. **Parent visibility** — read-only view for parents
7. **Optional** — never forced, always available as a tool

## Implementation Plan for EduChamp

### Learning Streak
- Track daily activity (any quiz, lesson, or AI chat counts)
- Show streak on dashboard with fire animation
- Badges: 3-day, 7-day, 14-day, 30-day, 60-day, 100-day, 365-day
- Streak freeze: 1 free per week (or earned through activity)
- Fanfare animation on milestone days (confetti + badge unlock)
- Show on parent dashboard too

### Learning Plan
- Optional tool accessible from sidebar ("My Plan")
- Simple wizard: "How many hours per week?" → "Which days?" → "Preferred time?"
- AI generates weekly schedule based on:
  - Enrolled courses
  - Current progress in each
  - Mastery levels (prioritize weak areas)
  - Student preferences
- Weekly calendar view with course blocks
- Drag-and-drop to customize
- Track adherence: "You followed 80% of your plan this week!"
- Parent can view the plan (read-only) in child detail panel
- Plan auto-adjusts based on progress (suggest changes)
