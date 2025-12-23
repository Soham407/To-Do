# 🦅 Goal Coach

> **"Not just a tracker. A flexible automated coach."**

Goal Coach is a React Native mobile application built with **Expo** and **Supabase**. It differs from standard habit trackers by enforcing a "flexible consistency" philosophy: tasks are not just checkboxes; they are commitments that adapt. If you miss a target, the app forces you to choose a recovery strategy, ensuring you never fall behind silently.

## 🌟 Key Features

### 1. 🧠 Goal Decomposition Engine

- **Decomposition**: Instead of asking "How much per day?", the app asks "What is the total target?" (e.g., 500 pages) and calculates the daily milestones automatically.
- **Dynamic Recalculation**:
  - Missed your target today? The app detects the "Shortfall".
  - **Strategy Enforcement**: You _must_ choose to either:
    - `Add to Tomorrow`: Increases tomorrow's load.
    - `Spread`: Redistributes the debt across all remaining days.
    - **Buffer Tokens**: For "Habit" goals, use earned tokens to skip a day without breaking your streak.

### 2. 📊 Neural Insights (SQL-Powered)

- **Hybrid Architecture**:
  - **Real-time**: Immediate UI updates using local Optimistic UI.
  - **Analytical**: Heavy lifting is done by **Supabase RPC** (`get_insights_failure_by_day`).
- **Smart Feedback**: The app analyzes your failure tags (e.g., "Tired", "Busy") and identifies patterns (e.g., _"Insight: You tend to be 'Tired' on Fridays"_).

### 3. 📅 Visual Analytics

- **Performance**: Heavily optimized with `useMemo` for 60fps scrolling.
- **Heatmap**: Month-view calendar visualization (Green=Done, Red=Failed, Amber=Buffered).
- **Consistency Score**: A calculated metric of your reliability.

---

## 🛠 Tech Stack

- **Framework**: React Native (Expo SDK 52)
- **Language**: TypeScript
- **Backend / Database**: Supabase (PostgreSQL)
- **State Management**: React Context + Hooks
- **Persistence**: Hybrid (AsyncStorage for offline-first + Supabase Sync)
- **Visualization**: `react-native-calendars`, `lucide-react-native`

---

## 🚀 Getting Started

### Prerequisites

- Node.js & npm/yarn
- Expo Go app on your phone (or Android Studio/Xcode emulator)
- A Supabase project

### Installation

1. **Clone & Install**

   ```bash
   git clone <repo-url>
   cd Goal_Coach
   npm install
   ```

2. **Environment Setup**
   Create a `.env` file in the root:

   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Database Migration**
   Run the SQL found in `supabase_insights_v1.sql` in your Supabase SQL Editor to enable the Insights engine.

4. **Run**
   ```bash
   npm start
   ```
   Scan the QR code with Expo Go.

---

## 📐 Architecture Highlights

- **Edge Case handling**: The Recalculation Engine automatically appends a "spillover day" if you fail on the last day of a goal, ensuring zero data loss.
- **Memoization**: Report views are computationally expensive. All derived stats are memoized to ensure the UI thread remains unblocked.
- **Strict Typing**: Full TypeScript coverage for all Data Models (`Agenda`, `DailyTask`, `FailureTag`).

---

## 🔮 Future Roadmap (v1.1)

- [ ] **Configurable Duration**: Remove the 30-day default assumption.
- [ ] **Edit capabilities**: Allow manual correction of historical logs.
- [ ] **Social Contracts**: Share stakes with a friend.

---

**Status**: v1.0 Release Candidate
**Verdict**: ALL SYSTEMS GO 🚀
