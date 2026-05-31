# EduChamp — Cross-Device & Cross-Browser Test Matrix

**Sprint:** Cross-Device & Cross-Browser Optimisation  
**Date:** 2026-05-31  
**Status:** Implementation complete — manual QA recommended before next release

---

## 1. Overview

This document records all changes made during the cross-device optimisation sprint, the rationale for each fix, and a structured test matrix for manual QA validation across the target device/browser matrix.

---

## 2. Changes Implemented

### 2.1 Viewport & Layout Foundations (`client/src/index.css`, `Tutor.tsx`)

The project previously used `min-h-screen` (equivalent to `100vh`) across all pages. On mobile browsers, `100vh` includes the browser chrome (address bar), causing content to be clipped when the address bar is visible. All occurrences have been replaced with `min-h-dvh`, which uses `100dvh` (dynamic viewport height) with a `100vh` fallback for older browsers.

The AI Tutor chat container used `h-[calc(100vh-56px)]`. This has been updated to `h-[calc(100dvh-56px)]` via an inline style to ensure the chat area fills the visible viewport correctly on iOS Safari and Chrome for Android.

### 2.2 Safe Area Insets (`client/src/index.css`)

CSS custom properties (`--safe-area-top`, `--safe-area-bottom`, `--safe-area-left`, `--safe-area-right`) have been added to `:root`, backed by `env(safe-area-inset-*)`. The `viewport-fit=cover` meta tag was already present. The AI Tutor input bar now applies `padding-bottom: calc(0.75rem + var(--safe-area-bottom))` so the text field is never obscured by the iPhone home indicator.

### 2.3 iOS Input Zoom Prevention (`client/src/index.css`)

iOS Safari zooms in on any focused input with `font-size < 16px`. A global `@media (max-width: 768px)` rule forces `font-size: max(16px, 1em)` on all `input`, `textarea`, and `select` elements. The `!important` flag is required to override Tailwind's `text-xs`/`text-sm` utilities.

### 2.4 Touch Optimisation (`client/src/index.css`)

`touch-action: manipulation` has been applied globally to `button`, `a`, `[role="button"]`, `[role="tab"]`, `[role="menuitem"]`, and `[role="option"]`. This eliminates the 300 ms tap delay on Android and older iOS without requiring a JavaScript polyfill.

`overscroll-behavior: none` has been set on `html, body` to prevent the full-page rubber-band bounce on iOS Safari when scrolling reaches the top or bottom of the document.

### 2.5 Visual Viewport API — Keyboard Height (`Tutor.tsx`)

A `useEffect` hook subscribes to `window.visualViewport` `resize` and `scroll` events. When the virtual keyboard appears, `keyboardHeight` is computed as `window.innerHeight - vv.height - vv.offsetTop`. The chat input bar's `paddingBottom` is then set to `calc(0.75rem + ${keyboardHeight}px + var(--safe-area-bottom))`, keeping the input field above the keyboard on both iOS and Android.

### 2.6 Exam Prep — Question Navigator Dots (`ExamPrep.tsx`)

The navigator was previously `flex-wrap`, which caused 54 STAAR EOC dots to overflow into multiple rows and push the question card off-screen on small devices. It is now a single horizontally scrollable row (`overflow-x: auto`, `scroll-snap-type: x mandatory`, `-webkit-overflow-scrolling: touch`). Each dot has `scroll-snap-align: start` and `flex-shrink: 0`. Dot size increased from `h-6 w-6` to `h-8 w-8` for a 32 × 32 px tap target.

### 2.7 Exam Prep — Multiple Choice Options (`ExamPrep.tsx`)

Each answer choice row now has `min-height: 48px` and `width: 100%` so the full row is tappable on mobile. The `Label` inside each choice is `flex-1` to fill the available width.

### 2.8 Diagnostic — "Work on this" Button (`Diagnostic.tsx`)

The gap-item row is now `flex-col sm:flex-row` so on mobile the button stacks below the unit label. The button itself is `w-full sm:w-auto` with `min-height: 44px`, meeting the Apple HIG 44 × 44 px minimum tap target.

### 2.9 Curriculum — Lesson Navigator (`Curriculum.tsx`)

The "Browse lessons" toggle button and each lesson row button now have `min-height: 44px` via inline style, meeting the 44 px minimum tap target requirement.

### 2.10 AI Tutor — Mode Selector Buttons (`Tutor.tsx`)

Each mode button in the sidebar now has `min-height: 44px` via inline style, ensuring comfortable tapping on touch devices.

### 2.11 iOS Safari Fixes (`client/src/index.css`)

Two utility classes have been added:

- `.h-fill-available` — uses `height: -webkit-fill-available` as a middle value between the `100vh` fallback and the `100dvh` preferred value. This corrects the iOS Safari behaviour where `100vh` includes the browser chrome.
- `.ar-1-1` / `.ar-16-9` — `@supports not (aspect-ratio: 1)` block that provides padding-top fallbacks for Safari < 15.

### 2.12 PWA Manifest (`client/public/manifest.json`)

- `theme_color` and `background_color` updated from `#1d4ed8` to `#1B2A4A` (the EduChamp brand navy).
- `orientation` changed from `portrait-primary` to `any` so the app works in landscape on iPads.
- `scope: "/"` added for correct PWA scope matching.
- The 192 × 192 and 512 × 512 icons are now listed twice — once with `purpose: "any"` and once with `purpose: "maskable"` — as required by the Web App Manifest specification for correct icon rendering on Android adaptive icons.
- `prefer_related_applications: false` added to suppress the native app install prompt.

### 2.13 Service Worker (`client/public/sw.js`)

A production-grade service worker has been created. The `PWAUpdatePrompt` component already referenced `/sw.js` via `workbox-window` but the file was missing. The service worker implements:

- **Cache-first with background update** for static assets (JS, CSS, fonts, images).
- **Network-first** for navigation requests, with an offline fallback to `/offline.html`.
- **Network-only** for `/api/*` and `/manus-storage/*` to prevent stale API responses.
- `SKIP_WAITING` message handler so the workbox-window `messageSkipWaiting()` call in `PWAUpdatePrompt` correctly activates the new worker.

### 2.14 Performance — Bundle Analysis

Route-based code splitting via `React.lazy` is already applied to all 30+ page routes in `App.tsx`. The `streamdown` / Shiki / KaTeX / Mermaid bundle (~9 MB) is already deferred via `StreamdownRenderer.tsx`. `font-display: swap` is already set on all `@font-face` declarations in `index.html`. No additional splitting is required at this time.

The five heaviest source files are noted below for future refactoring consideration:

| File | Source size | Notes |
|---|---|---|
| `AdminDashboard.tsx` | 219 KB | Candidate for tab-level code splitting |
| `ParentDashboard.tsx` | 128 KB | Candidate for tab-level code splitting |
| `LandingPage.tsx` | 76 KB | Already lazy-loaded; acceptable |
| `Tutor.tsx` | 55 KB | Already lazy-loaded; acceptable |
| `Diagnostic.tsx` | 52 KB | Already lazy-loaded; acceptable |

---

## 3. Manual QA Test Matrix

The following table defines the test cases that should be executed on physical devices or browser DevTools device emulation before the next production release. Each row maps to one or more of the changes above.

| # | Test Case | Expected Result | Devices / Browsers |
|---|---|---|---|
| T-01 | Open any page on iPhone 14 Pro (iOS 17, Safari). Scroll down until address bar hides, then scroll back up. | No content clipped; layout fills visible viewport without overflow. | iPhone Safari |
| T-02 | Open AI Tutor on iPhone. Tap the message input. Virtual keyboard appears. | Input bar remains fully visible above the keyboard; no overlap. | iPhone Safari, Android Chrome |
| T-03 | Open AI Tutor on iPhone. Type a message and send. Dismiss keyboard. | Chat area resizes correctly; no blank space at bottom. | iPhone Safari |
| T-04 | Open any input field (login, onboarding, search) on iPhone. Tap to focus. | Page does NOT zoom in. | iPhone Safari |
| T-05 | Open Exam Prep session with 54 questions on a 375 px wide screen. | Question navigator shows a single scrollable row of dots; no wrapping; dots are 32 × 32 px. | iPhone SE, Android 360 px |
| T-06 | Tap a multiple-choice answer option in Exam Prep on mobile. | Full row is tappable (min 48 px height); selection registers correctly. | iPhone, Android |
| T-07 | Open Diagnostic results on mobile. View a gap unit. | "Work on this" button is full-width; minimum 44 px height; tapping navigates correctly. | iPhone, Android |
| T-08 | Open Curriculum page on mobile. Tap "Browse lessons". | Button has min 44 px height; panel expands; each lesson row is min 44 px. | iPhone, Android |
| T-09 | Open AI Tutor on iPad in landscape orientation. | Layout fills the landscape viewport; no horizontal scrollbar; mode sidebar visible. | iPad Safari landscape |
| T-10 | Install EduChamp as a PWA on Android Chrome. | Install prompt appears; icon uses maskable variant (no white border); theme colour is navy `#1B2A4A`. | Android Chrome |
| T-11 | Install EduChamp as a PWA on iOS Safari (Add to Home Screen). | App opens in standalone mode; status bar colour is navy; landscape rotation works. | iPhone Safari |
| T-12 | Disconnect network. Navigate to a previously visited page. | Offline page (`/offline.html`) shown; no blank screen or unhandled error. | Any device |
| T-13 | Deploy a new version. Open the app in a tab that was open before the deploy. | "A new version of EduChamp is available" toast appears with "Update now" button. | Desktop Chrome / Safari |
| T-14 | Open Admin Dashboard on a 768 px tablet. Scroll the Users table horizontally. | Table scrolls smoothly with momentum; no page-level horizontal overflow. | iPad, Android tablet |
| T-15 | Open AI Tutor on Android Chrome. Tap the mode selector buttons in the sidebar. | Each button has a minimum 44 px tap target; no accidental adjacent-button activation. | Android Chrome |
| T-16 | Open any page on Firefox (latest). | Layout, fonts, and animations render correctly; no console errors. | Firefox desktop |
| T-17 | Open any page on Edge (latest). | Layout, fonts, and animations render correctly; no console errors. | Edge desktop |
| T-18 | Open LandingPage on iPhone. Tap the floating chat launcher button. | Chat panel opens; input field is visible above keyboard; no zoom on focus. | iPhone Safari |
| T-19 | Open ExamPrep on iPhone in landscape. | Timer bar visible; question navigator scrollable; answer options full-width. | iPhone Safari landscape |
| T-20 | Open Diagnostic on a 320 px screen (iPhone SE 1st gen). | "Work on this" button stacks below unit label; no text overflow; all content visible. | iPhone SE (320 px) |

---

## 4. Known Limitations & Future Work

The following items are out of scope for this sprint but are recommended for a follow-up:

- **AdminDashboard tab-level splitting.** At 219 KB source, `AdminDashboard.tsx` is the single largest file. Splitting each admin tab (Users, Courses, Settings, Analytics) into its own lazy-loaded component would reduce the initial admin bundle by an estimated 60–70%.
- **ParentDashboard tab-level splitting.** At 128 KB, the same pattern applies.
- **Drag-and-drop gesture audit.** The `AdventureMap` and `GamificationHub` pages use only `onClick`/`onKeyDown` handlers and are not affected by `touch-action: manipulation`. If drag-to-reorder is added in a future sprint, `touch-action: none` must be applied to the draggable elements.
- **LandingPage fixed chat panel safe-area.** The floating chatbot panel at `fixed bottom-6 right-6` does not yet apply `padding-bottom: var(--safe-area-bottom)`. This is low-priority because the panel is not full-screen, but should be addressed if the panel is extended.
- **iOS 15 aspect-ratio.** The `@supports not (aspect-ratio: 1)` fallback targets Safari < 15. Safari 15 was released in September 2021. Usage data should be checked before removing the fallback.
