MASTERPLAN V3: The Intelligent Adaptation Engine (V1.0 Release Candidate)

## 1. Executive Summary

A cross-platform mobile application (React Native/Expo) that acts as an intelligent "Coach," helping users break down huge goals into daily tasks. The core philosophy is **"Flexible Consistency."** It allows users to recover from failures via dynamic recalculation (for numeric goals) or safety buffers (for habits), capturing the _context_ of failure through low-friction tagging. **V3 expands this with a robust Gamification Engine and AI-driven coaching for long-term engagement.**

## 2. Target Audience

- **The "All-or-Nothing" Personality:** People who quit habits after one mistake.
- **Students/Self-Learners:** Tracking quantitative progress (pages, hours).
- **The "Gamer" Mindset:** Users motivated by levels, XP, and achievements.
- **MVP Scope:** High-fidelity single-player experience with cloud sync.

## 3. Core Features & Functionality

### A. The AI Onboarding & Coaching (Gemini Integration)

- **Intelligent Setup:** Chat-based interface using Gemini Flash to convert natural language (e.g., "I want to read 10 books this year") into structured Agendas.
- **Adaptive Nudges:** Supabase Edge Functions analyze progress and provide context-aware advice (e.g., "You're on a 5-day streak! Keep it up" or "Fridays are tough for you, maybe schedule lighter tasks?").

### B. The Recovery Logic (The "Flex" Engine)

1. **Recalculation (Numeric):** Spreads missed quantitative targets over future days.
2. **Safety Buffer (Boolean):** Uses "Life Happens" tokens to protect streaks from unavoidable misses, provided a "Quick Tag" (context) is logged.

### C. Gamification Engine (XP & Levels)

- **XP Rewards:** Earn XP for completing tasks, perfect days, and maintaining streaks.
- **Leveling System:** 20 levels with unique titles (from "Beginner" to "Goal Coach Legend").
- **Achievements:** 20+ unlockable medals across categories: Streak, Completion, Consistency, and Special milestones.

### D. Offline-First Sync Engine

- **Local-First:** Immediate response via local state.
- **Sync Background:** Robust `mergeById` strategy for syncing with Supabase.
- **Migration Flow:** Seamlessly upgrades Guest users (Anonymous) to Full Accounts (Email/Social) without data loss.

## 4. Technical Stack & Architecture

- **Frontend:** React Native + Expo.
- **State Management:** Refs and Custom Hooks (e.g., `useDashboardController`).
- **Animations:** React Native Reanimated (Layout Animations, Shared Values).
- **Backend:** Supabase (Auth, Postgres, Edge Functions).
- **AI:** Google Gemini (via Supabase Edge Functions).

## 5. Data Model (Key Entities)

- **Agendas:** Goals/Habits with configuration (type, target, priority, buffer tokens).
- **Daily_Tasks:** Daily instances of Agendas with tracking (actual vs target, status, tags, mood).
- **Profile/Stats (Metadata):** XP, Level, Unlocked Achievements, Longest Streak.
- **AI Usage Logs:** Tracking rate limits for AI coaching.

## 6. Implementation Status (V1.0 Polish)

- [x] **Phase 1: Core UI & Chat** (Complete)
- [x] **Phase 2: Supabase Integration & Auth** (Complete)
- [x] **Phase 3: Logic Engines (Recalc/Buffer)** (Complete)
- [x] **Phase 4: Insights & Gamification** (Complete)
- [x] **Phase 5: Refactoring & Performance** (Complete - Dashboard Refactor)
- [ ] **Phase 6: Release & Production Prep** (In Progress)

## 7. Next Steps for Release

1. **Test Migration Strategy:** Verify local-to-cloud mapping for guest users.
2. **Final Edge Function Deployment:** Ensure all secrets (GEMINI_API_KEY) are set in prod.
3. **Performance Monitoring:** Monitor `FlatList` performance with `getItemLayout`.
4. **App Store Assets:** Generate screenshots and marketing copy.
