import { DailyTask, Agenda, TaskStatus } from "../types";
import { getLocalDateString } from "./logic";
import { calculateStreak } from "./insightsLogic";

// Safety limit to prevent infinite loops in date calculations
const MAX_DATE_ITERATIONS = 365;

// ===========================
// TYPES & CONSTANTS
// ===========================

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // Emoji
  category: "streak" | "completion" | "consistency" | "special";
  requirement: number;
  unlockedAt?: string; // ISO date when unlocked
}

export interface UserStats {
  totalXP: number;
  level: number;
  tasksCompleted: number;
  currentStreak: number;
  longestStreak: number;
  perfectDays: number; // Days with 100% completion
  buffersUsed: number;
  achievements: string[]; // Achievement IDs
}

export interface XPEvent {
  type:
    | "task_complete"
    | "goal_complete"
    | "streak_bonus"
    | "perfect_day"
    | "achievement";
  amount: number;
  description: string;
}

// XP rewards for different actions
export const XP_REWARDS = {
  TASK_COMPLETE: 10,
  GOAL_COMPLETE: 50,
  STREAK_BONUS_7: 25,
  STREAK_BONUS_14: 50,
  STREAK_BONUS_21: 75,
  STREAK_BONUS_30: 100,
  STREAK_BONUS_50: 150,
  STREAK_BONUS_100: 300,
  PERFECT_DAY: 20,
  ACHIEVEMENT_UNLOCK: 30,
  FIRST_GOAL: 25,
  COMEBACK: 15, // After missing a day and coming back
} as const;

// Level thresholds (XP required for each level)
export const LEVEL_THRESHOLDS = [
  0, // Level 1
  100, // Level 2
  250, // Level 3
  500, // Level 4
  850, // Level 5
  1300, // Level 6
  1900, // Level 7
  2700, // Level 8
  3700, // Level 9
  5000, // Level 10
  6500, // Level 11
  8500, // Level 12
  11000, // Level 13
  14000, // Level 14
  18000, // Level 15
  23000, // Level 16
  29000, // Level 17
  36000, // Level 18
  45000, // Level 19
  55000, // Level 20
];

export const LEVEL_TITLES = [
  "Beginner", // 1
  "Apprentice", // 2
  "Focused", // 3
  "Determined", // 4
  "Consistent", // 5
  "Dedicated", // 6
  "Driven", // 7
  "Disciplined", // 8
  "Master", // 9
  "Champion", // 10
  "Elite", // 11
  "Legend", // 12
  "Unstoppable", // 13
  "Transcendent", // 14
  "Goal Crusher", // 15
  "Habit Hero", // 16
  "Productivity Sage", // 17
  "Time Master", // 18
  "Ultimate Achiever", // 19
  "Goal Coach Legend", // 20
];

// All available achievements
export const ACHIEVEMENTS: Achievement[] = [
  // Streak Achievements
  {
    id: "streak_7",
    title: "Week Warrior",
    description: "Complete a 7-day streak",
    icon: "🔥",
    category: "streak",
    requirement: 7,
  },
  {
    id: "streak_14",
    title: "Fortnight Focus",
    description: "Complete a 14-day streak",
    icon: "💪",
    category: "streak",
    requirement: 14,
  },
  {
    id: "streak_21",
    title: "Habit Builder",
    description: "Complete a 21-day streak",
    icon: "🏗️",
    category: "streak",
    requirement: 21,
  },
  {
    id: "streak_30",
    title: "Monthly Master",
    description: "Complete a 30-day streak",
    icon: "🌟",
    category: "streak",
    requirement: 30,
  },
  {
    id: "streak_50",
    title: "Unstoppable",
    description: "Complete a 50-day streak",
    icon: "⚡",
    category: "streak",
    requirement: 50,
  },
  {
    id: "streak_100",
    title: "Century Champion",
    description: "Complete a 100-day streak",
    icon: "👑",
    category: "streak",
    requirement: 100,
  },

  // Completion Achievements
  {
    id: "tasks_10",
    title: "Getting Started",
    description: "Complete 10 tasks",
    icon: "✅",
    category: "completion",
    requirement: 10,
  },
  {
    id: "tasks_50",
    title: "Task Tackler",
    description: "Complete 50 tasks",
    icon: "🎯",
    category: "completion",
    requirement: 50,
  },
  {
    id: "tasks_100",
    title: "Century Club",
    description: "Complete 100 tasks",
    icon: "💯",
    category: "completion",
    requirement: 100,
  },
  {
    id: "tasks_250",
    title: "Task Titan",
    description: "Complete 250 tasks",
    icon: "🏆",
    category: "completion",
    requirement: 250,
  },
  {
    id: "tasks_500",
    title: "Productivity Pro",
    description: "Complete 500 tasks",
    icon: "🚀",
    category: "completion",
    requirement: 500,
  },
  {
    id: "tasks_1000",
    title: "Task Legend",
    description: "Complete 1000 tasks",
    icon: "🌈",
    category: "completion",
    requirement: 1000,
  },

  // Consistency Achievements
  {
    id: "perfect_3",
    title: "Triple Threat",
    description: "3 perfect days in a row",
    icon: "⭐",
    category: "consistency",
    requirement: 3,
  },
  {
    id: "perfect_7",
    title: "Perfect Week",
    description: "7 perfect days in a row",
    icon: "🌟",
    category: "consistency",
    requirement: 7,
  },
  {
    id: "perfect_14",
    title: "Flawless Fortnight",
    description: "14 perfect days in a row",
    icon: "💎",
    category: "consistency",
    requirement: 14,
  },
  {
    id: "perfect_30",
    title: "Perfect Month",
    description: "30 perfect days in a row",
    icon: "🏅",
    category: "consistency",
    requirement: 30,
  },

  // Special Achievements
  {
    id: "first_goal",
    title: "First Step",
    description: "Create your first goal",
    icon: "🌱",
    category: "special",
    requirement: 1,
  },
  {
    id: "early_bird",
    title: "Early Bird",
    description: "Complete a task before 8 AM",
    icon: "🐦",
    category: "special",
    requirement: 1,
  },
  {
    id: "night_owl",
    title: "Night Owl",
    description: "Complete a task after 10 PM",
    icon: "🦉",
    category: "special",
    requirement: 1,
  },
  {
    id: "comeback_kid",
    title: "Comeback Kid",
    description: "Return after 3+ days away",
    icon: "💪",
    category: "special",
    requirement: 1,
  },
  {
    id: "goal_5",
    title: "Goal Getter",
    description: "Have 5 active goals",
    icon: "🎯",
    category: "special",
    requirement: 5,
  },
  {
    id: "level_5",
    title: "Rising Star",
    description: "Reach level 5",
    icon: "⬆️",
    category: "special",
    requirement: 5,
  },
  {
    id: "level_10",
    title: "Champion",
    description: "Reach level 10",
    icon: "🏆",
    category: "special",
    requirement: 10,
  },
  {
    id: "level_15",
    title: "Master",
    description: "Reach level 15",
    icon: "👑",
    category: "special",
    requirement: 15,
  },
];

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Calculate level from total XP
 */
export const calculateLevel = (xp: number): number => {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
};

/**
 * Get XP progress within current level
 */
export const getLevelProgress = (
  xp: number
): { current: number; required: number; percentage: number } => {
  const level = calculateLevel(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold =
    LEVEL_THRESHOLDS[level] ||
    LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 10000;

  const current = xp - currentThreshold;
  const required = nextThreshold - currentThreshold;
  const percentage = Math.min(100, Math.round((current / required) * 100));

  return { current, required, percentage };
};

/**
 * Get level title
 */
export const getLevelTitle = (level: number): string => {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)] || "Legend";
};

/**
 * Calculate total tasks completed
 */
export const calculateTotalCompleted = (tasks: DailyTask[]): number => {
  return tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
};

/**
 * Calculate perfect days (days where all tasks were completed)
 */
export const calculatePerfectDays = (tasks: DailyTask[]): number => {
  const dayStats = new Map<string, { total: number; completed: number }>();

  tasks.forEach((t) => {
    if (t.status === TaskStatus.PENDING) return;

    const stats = dayStats.get(t.scheduledDate) || { total: 0, completed: 0 };
    stats.total++;
    if (t.status === TaskStatus.COMPLETED) stats.completed++;
    dayStats.set(t.scheduledDate, stats);
  });

  let perfectDays = 0;
  dayStats.forEach((stats) => {
    if (stats.total > 0 && stats.completed === stats.total) {
      perfectDays++;
    }
  });

  return perfectDays;
};

/**
 * Calculate consecutive perfect days (current run)
 */
export const calculateConsecutivePerfectDays = (tasks: DailyTask[]): number => {
  const dayStats = new Map<string, { total: number; completed: number }>();

  tasks.forEach((t) => {
    if (t.status === TaskStatus.PENDING) return;

    const stats = dayStats.get(t.scheduledDate) || { total: 0, completed: 0 };
    stats.total++;
    if (t.status === TaskStatus.COMPLETED) stats.completed++;
    dayStats.set(t.scheduledDate, stats);
  });

  let consecutive = 0;
  const today = getLocalDateString(new Date());
  let checkDate = new Date();

  // Check if today is perfect
  const todayStats = dayStats.get(today);
  if (
    todayStats &&
    todayStats.total > 0 &&
    todayStats.completed === todayStats.total
  ) {
    consecutive++;
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    // If today isn't perfect (or has pending), start from yesterday
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Count backwards with safety limit to prevent infinite loop
  let iterations = 0;
  while (iterations < MAX_DATE_ITERATIONS) {
    iterations++;
    const dateStr = getLocalDateString(checkDate);
    const stats = dayStats.get(dateStr);

    if (stats && stats.total > 0 && stats.completed === stats.total) {
      consecutive++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // No tasks or not perfect - break streak
      break;
    }
  }

  return consecutive;
};

/**
 * Check which achievements are newly unlocked
 */
export const checkNewAchievements = (
  stats: UserStats,
  tasks: DailyTask[],
  agendas: Agenda[]
): Achievement[] => {
  const newlyUnlocked: Achievement[] = [];
  const today = getLocalDateString(new Date());

  ACHIEVEMENTS.forEach((achievement) => {
    // Skip if already unlocked
    if (stats.achievements.includes(achievement.id)) return;

    let isUnlocked = false;

    switch (achievement.category) {
      case "streak":
        isUnlocked = stats.longestStreak >= achievement.requirement;
        break;

      case "completion":
        isUnlocked = stats.tasksCompleted >= achievement.requirement;
        break;

      case "consistency":
        const consecutivePerfect = calculateConsecutivePerfectDays(tasks);
        isUnlocked = consecutivePerfect >= achievement.requirement;
        break;

      case "special":
        if (achievement.id === "first_goal") {
          isUnlocked = agendas.length >= 1;
        } else if (achievement.id === "goal_5") {
          isUnlocked = agendas.length >= 5;
        } else if (achievement.id === "level_5") {
          isUnlocked = stats.level >= 5;
        } else if (achievement.id === "level_10") {
          isUnlocked = stats.level >= 10;
        } else if (achievement.id === "level_15") {
          isUnlocked = stats.level >= 15;
        } else if (achievement.id === "early_bird") {
          const hour = new Date().getHours();
          isUnlocked =
            hour < 8 &&
            tasks.some(
              (t) =>
                t.scheduledDate === today && t.status === TaskStatus.COMPLETED
            );
        } else if (achievement.id === "night_owl") {
          const hour = new Date().getHours();
          isUnlocked =
            hour >= 22 &&
            tasks.some(
              (t) =>
                t.scheduledDate === today && t.status === TaskStatus.COMPLETED
            );
        }
        break;
    }

    if (isUnlocked) {
      newlyUnlocked.push({ ...achievement, unlockedAt: today });
    }
  });

  return newlyUnlocked;
};

/**
 * Calculate XP earned from completing a task
 */
export const calculateTaskXP = (
  task: DailyTask,
  tasks: DailyTask[],
  agendaId: string
): XPEvent[] => {
  const events: XPEvent[] = [];

  // Base XP for task completion
  events.push({
    type: "task_complete",
    amount: XP_REWARDS.TASK_COMPLETE,
    description: "Task completed",
  });

  // Check for streak bonuses
  const streakInfo = calculateStreak(tasks, agendaId);
  const streakMilestones = [7, 14, 21, 30, 50, 100];

  if (streakMilestones.includes(streakInfo.current)) {
    const bonusKey =
      `STREAK_BONUS_${streakInfo.current}` as keyof typeof XP_REWARDS;
    const bonus = XP_REWARDS[bonusKey] || 0;
    if (bonus > 0) {
      events.push({
        type: "streak_bonus",
        amount: bonus,
        description: `${streakInfo.current}-day streak bonus!`,
      });
    }
  }

  // Check for perfect day
  const today = getLocalDateString(new Date());
  const todayTasks = tasks.filter((t) => t.scheduledDate === today);
  const allCompleted = todayTasks.every((t) =>
    t.id === task.id ? true : t.status === TaskStatus.COMPLETED
  );

  if (allCompleted && todayTasks.length > 1) {
    events.push({
      type: "perfect_day",
      amount: XP_REWARDS.PERFECT_DAY,
      description: "Perfect day! All tasks completed",
    });
  }

  return events;
};

/**
 * Build user stats from tasks and agendas
 */
export const buildUserStats = (
  tasks: DailyTask[],
  agendas: Agenda[],
  existingStats?: Partial<UserStats>
): UserStats => {
  const tasksCompleted = calculateTotalCompleted(tasks);
  let longestStreak = 0;
  let currentStreak = 0;

  // Calculate streaks across all agendas
  agendas.forEach((agenda) => {
    const streakInfo = calculateStreak(tasks, agenda.id);
    longestStreak = Math.max(longestStreak, streakInfo.longest);
    currentStreak = Math.max(currentStreak, streakInfo.current);
  });

  const perfectDays = calculatePerfectDays(tasks);
  const existingXP = existingStats?.totalXP || 0;

  // Calculate XP from completed tasks if no existing XP
  let totalXP = existingXP;
  if (totalXP === 0) {
    // Bootstrap XP from history
    totalXP = tasksCompleted * XP_REWARDS.TASK_COMPLETE;
    totalXP += perfectDays * XP_REWARDS.PERFECT_DAY;

    // Add streak bonuses for longest streak
    if (longestStreak >= 7) totalXP += XP_REWARDS.STREAK_BONUS_7;
    if (longestStreak >= 14) totalXP += XP_REWARDS.STREAK_BONUS_14;
    if (longestStreak >= 21) totalXP += XP_REWARDS.STREAK_BONUS_21;
    if (longestStreak >= 30) totalXP += XP_REWARDS.STREAK_BONUS_30;
    if (longestStreak >= 50) totalXP += XP_REWARDS.STREAK_BONUS_50;
    if (longestStreak >= 100) totalXP += XP_REWARDS.STREAK_BONUS_100;
  }

  const level = calculateLevel(totalXP);

  return {
    totalXP,
    level,
    tasksCompleted,
    currentStreak,
    longestStreak,
    perfectDays,
    buffersUsed: existingStats?.buffersUsed || 0,
    achievements: existingStats?.achievements || [],
  };
};

/**
 * Format XP number with suffix (1.2k, 5.5k, etc.)
 */
export const formatXP = (xp: number): string => {
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}k`;
  }
  return xp.toString();
};
