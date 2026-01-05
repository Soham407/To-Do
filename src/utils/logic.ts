import { DailyTask, TaskStatus, Agenda, AgendaType } from "../types";

import * as Crypto from "expo-crypto";

import { APP_CONSTANTS } from "../config/constants";

export const generateId = () => Crypto.randomUUID();

export const getLocalDateString = (date: Date = new Date()) => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    date = new Date(); // Fallback to now for safety
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getTodayDateString = () => getLocalDateString(new Date());

export const parseLocalIsoDate = (isoDateStr: string): Date => {
  if (!isoDateStr) return new Date();

  // Ensure we only look at YYYY-MM-DD even if full ISO string is passed
  const datePart = isoDateStr.substring(0, 10);
  const [y, m, d] = datePart.split("-").map(Number);

  if (isNaN(y) || isNaN(m) || isNaN(d)) return new Date();

  return new Date(y, m - 1, d);
};

export const isDateInRecurrence = (date: Date, agenda: Agenda): boolean => {
  if (agenda.type === AgendaType.ONE_OFF) return true;

  const pattern = agenda.recurrencePattern || "DAILY";
  const day = date.getDay(); // 0 = Sunday

  if (pattern === "DAILY") return true;
  if (pattern === "WEEKLY") {
    const startDay = parseLocalIsoDate(agenda.startDate).getDay();
    return day === startDay;
  }
  if (pattern === "WEEKDAYS") {
    return day >= 1 && day <= 5;
  }
  if (pattern === "CUSTOM") {
    if (!agenda.recurrenceDays || agenda.recurrenceDays.length === 0)
      return false;
    return agenda.recurrenceDays.includes(day);
  }
  return true;
};

export const getDailyTarget = (agenda: Agenda): number => {
  if (agenda.type === AgendaType.NUMERIC) {
    if (agenda.targetVal && agenda.targetVal > 0) {
      return agenda.targetVal;
    }
    if (agenda.totalTarget) {
      return Math.ceil(
        agenda.totalTarget / APP_CONSTANTS.DEFAULT_DURATION_DAYS
      );
    }
    return 10; // Default placeholder
  }
  return 1;
};

export const createInitialTasks = (
  agenda: Agenda,
  days: number = APP_CONSTANTS.INITIAL_TASK_GENERATION_DAYS
): DailyTask[] => {
  const tasks: DailyTask[] = [];
  const today = new Date();
  const dailyTarget = getDailyTarget(agenda);

  if (agenda.type === AgendaType.ONE_OFF || agenda.isRecurring === false) {
    const taskDate = agenda.due_date
      ? parseLocalIsoDate(agenda.due_date)
      : today;

    tasks.push({
      id: generateId(),
      agendaId: agenda.id,
      scheduledDate: getLocalDateString(taskDate),
      targetVal: dailyTarget,
      actualVal: 0,
      status: TaskStatus.PENDING,
      subtasks: [],
    });

    return tasks;
  }

  const start = parseLocalIsoDate(agenda.startDate || getTodayDateString());

  let daysToCreate = days;
  if (agenda.endDate) {
    // Primary: Use endDate if provided by AI
    const end = parseLocalIsoDate(agenda.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    daysToCreate = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  } else if (agenda.totalTarget && agenda.targetVal && agenda.targetVal > 0) {
    // Fallback: Calculate from totalTarget/targetVal (e.g., 1000 pages / 20 per day = 50 days)
    daysToCreate = Math.ceil(agenda.totalTarget / agenda.targetVal);
  }
  // Note: If no endDate/totalTarget, we use the default INITIAL_TASK_GENERATION_DAYS (7)
  // The AI should now provide durationDays which frontend converts to endDate

  for (let i = 0; i < daysToCreate; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);

    if (isDateInRecurrence(date, agenda)) {
      tasks.push({
        id: generateId(),
        agendaId: agenda.id,
        scheduledDate: getLocalDateString(date),
        targetVal: dailyTarget,
        actualVal: 0,
        status: TaskStatus.PENDING,
        subtasks: [],
      });
    }
  }
  return tasks;
};

// Logic Hardening: Ensure tasks exist for a specific date (e.g., Today)
export const ensureTasksForDate = (
  agendas: Agenda[],
  tasks: DailyTask[],
  dateStr: string
): DailyTask[] => {
  const newTasks: DailyTask[] = [];

  agendas.forEach((agenda) => {
    // SKIP ONE-OFF AGENDAS
    // One-off tasks are manually scheduled. We should NOT auto-generate them just because they are missing for "today".
    if (agenda.type === AgendaType.ONE_OFF || agenda.isRecurring === false) {
      return;
    }

    // Check if a task exists for this agenda on the given date
    const hasTask = tasks.some(
      (t) => t.agendaId === agenda.id && t.scheduledDate === dateStr
    );

    const targetDate = parseLocalIsoDate(dateStr);

    // We only create if it DOESN'T exist AND it matches recurrence
    if (!hasTask && isDateInRecurrence(targetDate, agenda)) {
      newTasks.push({
        id: generateId(),
        agendaId: agenda.id,
        scheduledDate: dateStr,
        targetVal: getDailyTarget(agenda),
        actualVal: 0,
        status: TaskStatus.PENDING,
        subtasks: [],
      });
    }
  });

  return newTasks;
};

// Recalculate Logic: Spread missing amount over future tasks
export const recalculateNumericTasks = (
  tasks: DailyTask[],
  failedTaskId: string,
  missingAmount: number,
  strategy: "TOMORROW" | "SPREAD"
): DailyTask[] => {
  const taskIndex = tasks.findIndex((t) => t.id === failedTaskId);
  if (taskIndex === -1) return tasks;

  const newTasks = [...tasks];

  // Logic Hardening: If last day, append a new day to accommodate overflow
  if (taskIndex === newTasks.length - 1) {
    const lastTask = newTasks[taskIndex];
    const lastDate = new Date(lastTask.scheduledDate);
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + 1);

    newTasks.push({
      id: generateId(),
      agendaId: lastTask.agendaId,
      scheduledDate: getLocalDateString(nextDate),
      targetVal: 0, // Will be filled by logic below
      actualVal: 0,
      status: TaskStatus.PENDING,
      wasRecalculated: true,
    });
  }

  if (strategy === "TOMORROW") {
    newTasks[taskIndex + 1] = {
      ...newTasks[taskIndex + 1],
      targetVal: newTasks[taskIndex + 1].targetVal + missingAmount,
      wasRecalculated: true,
    };
  } else if (strategy === "SPREAD") {
    const remainingTasks = newTasks.length - 1 - taskIndex;
    if (remainingTasks > 0) {
      const base = Math.floor(missingAmount / remainingTasks);
      const rem = missingAmount % remainingTasks;

      for (let i = taskIndex + 1; i < newTasks.length; i++) {
        const extra = i - (taskIndex + 1) < rem ? 1 : 0;
        newTasks[i] = {
          ...newTasks[i],
          targetVal: newTasks[i].targetVal + base + extra,
          wasRecalculated: true,
        };
      }
    }
  }

  return newTasks;
};

// Defense-in-depth: Strip HTML tags from AI/user text.
// While React Native Text doesn't execute scripts, this protects
// against future web builds or WebView usage.
export const sanitizeMarkdown = (text: string): string => {
  if (!text) return "";
  // First remove script/style tags with their content
  let sanitized = text.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  );
  sanitized = sanitized.replace(
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    ""
  );
  // Then remove any remaining HTML tags (keep content)
  return sanitized.replace(/<[^>]*>/g, "").trim();
};
