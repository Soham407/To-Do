MASTERPLAN V2: The Goal Decomposition Engine (Cross-Platform)

## 1. Executive Summary
A cross-platform mobile application (React Native/Expo) that acts as an intelligent "Coach," helping users break down huge goals into daily tasks. The core philosophy is **"Flexible Consistency."** It allows users to recover from failures via dynamic recalculation (for numeric goals) or safety buffers (for habits), capturing the *context* of failure through low-friction tagging.

## 2. Target Audience
* **The "All-or-Nothing" Personality:** People who quit habits after one mistake.
* **Students/Self-Learners:** Tracking quantitative progress (pages, hours).
* **MVP Scope:** Single-player mode only. No social features yet.

## 3. Core Features & Functionality

### A. The Onboarding (Conversational UI)
* **Format:** Chat-based interface.
* **Logic:** Differentiates between:
    * **Numeric Goals:** (Reading 800 pages) -> Uses "Recalculation."
    * **Boolean Habits:** (Going to Gym) -> Uses "Buffer System."

### B. The Execution & Check-in
* **Low-Friction Logging:**
    * *Success:* One tap.
    * *Partial/Failure:* Select a "Quick Tag" (e.g., 🤒 Sick, 💼 Work Overload, 😴 Tired).
    * *Optional:* Add a text remark only if they want to.

### C. The "Recovery" Logic (Dual Engine)
1.  **For Numeric Goals (Recalculation):**
    * *Scenario:* User reads 20/40 pages.
    * *Action:* App asks: "Add remaining 20 to tomorrow, or spread over the week?"
2.  **For Boolean Habits (The Buffer):**
    * *Scenario:* User misses Gym.
    * *Action:* App deducts 1 "Life Happens" token (e.g., 3 allowed per month). Streak is *maintained* if they use a token and log a Quick Tag.

### D. The "Hybrid" Report
* **Visuals:** Calendar view showing "Success" (Green), "Buffered" (Yellow), "Failed" (Red).
* **Insights:** Correlations displayed simply (e.g., "You often use 'Tired' tags on Fridays").

## 4. Technical Stack & Architecture

* **Frontend:** **React Native** + **Expo**.
* **UI Library:** `react-native-gifted-chat` (for Coach interface) or custom animated cards.
* **Backend:** **Supabase**.
* **Auth:** **Supabase Anonymous Sign-ins**.
    * *Flow:* User starts immediately (Guest). Device is assigned an Anonymous ID. When they want to save/sync, we "Link" an Email/Password to that ID.
* **Logic:**
    * *MVP:* Client-side math (JavaScript) for recalculation.
    * *Scale:* Move complex recalculation logic to **Supabase Edge Functions** (TypeScript) later.

## 5. Expanded Data Model (Supabase)

**Table: Agendas**
* `id` (UUID)
* `user_id` (UUID - Anonymous or Auth)
* `type` (Enum: 'numeric', 'boolean')
* `buffer_tokens_remaining` (Int, default 3)
* `status` (Active, Completed, Failed)

**Table: Daily_Tasks**
* `id` (UUID)
* `agenda_id` (FK)
* `scheduled_date` (Date)
* `target_val` (Int)
* `actual_val` (Int)
* `status` (Enum: 'pending', 'completed', 'partial', 'skipped_with_buffer', 'failed')
* `failure_tag` (Enum: 'low_energy', 'work', 'health', 'distracted', 'other')
* `mood_rating` (Int: 1-5)
* `was_recalculated` (Boolean)

## 6. User Interface Design Principles
* **Tag-First Input:** Never force the user to type text on a phone unless they want to.
* **Warm Tone:** Error messages should sound like a supportive friend, not a system error.
* **Clear State:** Visually distinguish between a "Buffered Day" (Yellow - Okay!) and a "Missed Day" (Red).

## 7. Development Phases

**Phase 1: The Core (Local)**
* Initialize Expo.
* Build the Chat UI to create a local Agenda.
* Build the Task List with "Quick Tags" for check-ins.

**Phase 2: The Data (Cloud)**
* Connect Supabase.
* Implement Anonymous Auth.
* Sync Agendas and Tasks to the cloud.

**Phase 3: The Logic (Recalc & Buffer)**
* Implement the math to update future `Daily_Tasks` when a numeric goal is missed.
* Implement the logic to deduct `buffer_tokens` when a Boolean habit is skipped.

**Phase 4: Insights**
* Build the Hybrid Report view to visualize the Tags and Progress."