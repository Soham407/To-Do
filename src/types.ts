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

export interface List {
  id: string;
  userId: string;
  title: string;
  color?: string;
  icon?: string;
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
