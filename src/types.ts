export enum AgendaType {
  NUMERIC = "NUMERIC",
  BOOLEAN = "BOOLEAN",
}

export enum TaskStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  PARTIAL = "PARTIAL",
  SKIPPED_WITH_BUFFER = "SKIPPED_WITH_BUFFER",
  FAILED = "FAILED",
}

export enum FailureTag {
  SICK = "🤒 Sick",
  WORK = "💼 Work Overload",
  TIRED = "😴 Tired",
  DISTRACTED = "🐿️ Distracted",
  OTHER = "🤷 Other",
  NONE = "NONE",
}

export interface Agenda {
  id: string;
  title: string;
  type: AgendaType;
  bufferTokens: number;
  totalTarget?: number; // For numeric goals like "Read 500 pages"
  unit?: string; // e.g., "pages", "minutes"
  targetVal?: number; // Daily target value (redundant if calculated from totalTarget, but useful for caching)
  frequency: "daily"; // MVP assumes daily for now
  startDate: string; // ISO Date string
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
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: "bot" | "user";
  options?: string[]; // For quick replies
}
