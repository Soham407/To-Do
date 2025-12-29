import { FailureTag } from "../types";

export const APP_CONSTANTS = {
  DEFAULT_DURATION_DAYS: 30,
  INITIAL_TASK_GENERATION_DAYS: 7,
  STREAK_FLAME_THRESHOLD: 3,
  MAX_SUBTASKS_PER_TASK: 10,
  BOARD_SNAP_INTERVAL_OFFSET: 16,
  BOARD_WIDTH_MULTIPLIER: 0.85,
  PLACEHOLDER_ANIMATION_INTERVAL: 3000,
  FAB_PULSE_DURATION: 800,
};

export const RECURRENCE_PATTERNS = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  WEEKDAYS: "WEEKDAYS",
  CUSTOM: "CUSTOM",
} as const;

export const FAILURE_TAG_LABELS: Record<
  FailureTag,
  { label: string; emoji: string }
> = {
  [FailureTag.SICK]: { label: "Sick", emoji: "🤒" },
  [FailureTag.WORK]: { label: "Work Overload", emoji: "💼" },
  [FailureTag.TIRED]: { label: "Tired", emoji: "😴" },
  [FailureTag.DISTRACTED]: { label: "Distracted", emoji: "🐿️" },
  [FailureTag.OTHER]: { label: "Other", emoji: "🤷" },
  [FailureTag.NONE]: { label: "None", emoji: "" },
};
