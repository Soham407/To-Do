export enum AgendaType {
  NUMERIC = "NUMERIC",
  BOOLEAN = "BOOLEAN",
  ONE_OFF = "ONE_OFF",
}

export enum Priority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export enum TaskStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  PARTIAL = "PARTIAL",
  SKIPPED_WITH_BUFFER = "SKIPPED_WITH_BUFFER",
  FAILED = "FAILED",
}

export enum FailureTag {
  SICK = "Sick",
  WORK = "Work Overload",
  TIRED = "Tired",
  DISTRACTED = "Distracted",
  OTHER = "Other",
  NONE = "NONE",
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
}

export interface Agenda {
  id: string;
  title: string;
  type: AgendaType;
  listId?: string; // Optional foreign key to List
  priority?: Priority;
  due_date?: string; // ISO Date string for one-off tasks
  isRecurring?: boolean; // Default true for goals, false for tasks
  bufferTokens: number;
  totalTarget?: number; // For numeric goals like "Read 500 pages"
  unit?: string; // e.g., "pages", "minutes"
  targetVal?: number; // Daily target value (redundant if calculated from totalTarget, but useful for caching)
  frequency: "daily"; // MVP assumes daily for now
  startDate: string; // ISO Date string
  recurrencePattern?: "DAILY" | "WEEKLY" | "WEEKDAYS" | "CUSTOM";
  recurrenceDays?: number[]; // 0 = Sunday, 1 = Monday, etc.
  reminderTime?: string; // ISO String for one-off, or time-of-day reference for recurring
  endDate?: string; // Optional end date for the agenda
  status?: "ACTIVE" | "COMPLETED" | "PAUSED" | "ARCHIVED"; // Goal status
}

export interface DailyTask {
  id: string;
  agendaId: string;
  scheduledDate: string; // ISO Date string
  targetVal: number; // 1 for boolean, N for numeric
  actualVal: number;
  status: TaskStatus;
  failureTag?: FailureTag;
  note?: string;
  mood?: "😢" | "😕" | "😐" | "🙂" | "🤩";
  wasRecalculated?: boolean;
  subtasks?: Subtask[];
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: "bot" | "user";
  options?: string[]; // For quick replies
}

// Lists/Categories for organizing goals
export interface List {
  id: string;
  name: string;
  icon: string; // Emoji icon
  color: string; // Hex color
  order: number;
}

// Goal status for archiving/completing
export enum AgendaStatus {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  PAUSED = "PAUSED",
  ARCHIVED = "ARCHIVED",
}

// Goal Templates for quick start
export interface GoalTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  type: AgendaType;
  suggestedTarget?: number;
  suggestedUnit?: string;
  suggestedDuration?: number; // days
}

// Predefined templates
export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: "read_book",
    title: "Read a Book",
    description: "Track your reading progress page by page",
    category: "Learning",
    icon: "📚",
    type: AgendaType.NUMERIC,
    suggestedTarget: 300,
    suggestedUnit: "pages",
    suggestedDuration: 30,
  },
  {
    id: "exercise_daily",
    title: "Exercise Daily",
    description: "Build a consistent workout habit",
    category: "Health",
    icon: "🏋️",
    type: AgendaType.BOOLEAN,
    suggestedDuration: 30,
  },
  {
    id: "meditate",
    title: "Daily Meditation",
    description: "Start with just 10 minutes a day",
    category: "Wellness",
    icon: "🧘",
    type: AgendaType.NUMERIC,
    suggestedTarget: 10,
    suggestedUnit: "minutes",
    suggestedDuration: 21,
  },
  {
    id: "learn_language",
    title: "Learn a Language",
    description: "Practice vocabulary or lessons daily",
    category: "Learning",
    icon: "🌍",
    type: AgendaType.NUMERIC,
    suggestedTarget: 30,
    suggestedUnit: "minutes",
    suggestedDuration: 90,
  },
  {
    id: "drink_water",
    title: "Drink More Water",
    description: "Stay hydrated throughout the day",
    category: "Health",
    icon: "💧",
    type: AgendaType.NUMERIC,
    suggestedTarget: 8,
    suggestedUnit: "glasses",
    suggestedDuration: 30,
  },
  {
    id: "no_social_media",
    title: "Social Media Detox",
    description: "Limit or avoid social media usage",
    category: "Wellness",
    icon: "📵",
    type: AgendaType.BOOLEAN,
    suggestedDuration: 7,
  },
  {
    id: "journal",
    title: "Daily Journaling",
    description: "Write down your thoughts each day",
    category: "Wellness",
    icon: "📝",
    type: AgendaType.BOOLEAN,
    suggestedDuration: 30,
  },
  {
    id: "sleep_early",
    title: "Sleep Before Midnight",
    description: "Improve sleep schedule",
    category: "Health",
    icon: "🌙",
    type: AgendaType.BOOLEAN,
    suggestedDuration: 21,
  },
];

// Default Lists
export const DEFAULT_LISTS: List[] = [
  { id: "health", name: "Health", icon: "💪", color: "#4CAF50", order: 0 },
  { id: "learning", name: "Learning", icon: "📚", color: "#2196F3", order: 1 },
  { id: "wellness", name: "Wellness", icon: "🧘", color: "#9C27B0", order: 2 },
  { id: "work", name: "Work", icon: "💼", color: "#FF9800", order: 3 },
  { id: "personal", name: "Personal", icon: "⭐", color: "#E91E63", order: 4 },
];
