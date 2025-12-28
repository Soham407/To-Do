import {
  DailyTask,
  TaskStatus,
  FailureTag,
  Agenda,
  AgendaType,
} from "../types";

import * as Crypto from "expo-crypto";

export const generateId = () => Crypto.randomUUID();

// Helper to get local date string YYYY-MM-DD
export const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getTodayDateString = () => getLocalDateString(new Date());

export const isDateInRecurrence = (date: Date, agenda: Agenda): boolean => {
  // Always include start date? Or respect pattern? Usually start date implies participation.
  // But let's strictly follow pattern.

  if (agenda.type === AgendaType.ONE_OFF) return true; // Handled separately usually

  const pattern = agenda.recurrencePattern || "DAILY";
  const day = date.getDay(); // 0 = Sunday

  if (pattern === "DAILY") return true;
  if (pattern === "WEEKLY") {
    // Create only on same day of week as startDate
    const startDay = new Date(agenda.startDate).getDay();
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
    if (agenda.totalTarget) {
      return Math.ceil(agenda.totalTarget / 30); // Assume 30 days for now
    }
    return 10; // Default placeholder
  }
  // Boolean and One-Off are always 1 (Done/Not Done)
  return 1;
};

export const createInitialTasks = (
  agenda: Agenda,
  days: number = 7
): DailyTask[] => {
  const tasks: DailyTask[] = [];
  const today = new Date();
  const dailyTarget = getDailyTarget(agenda);

  // 1. HANDLE ONE-OFF TASKS
  // If it's not recurring, we only create ONE task for the specific due date (or today)
  if (agenda.type === AgendaType.ONE_OFF || agenda.isRecurring === false) {
    // Use agenda.dueDate if available, otherwise default to today
    const taskDate = agenda.due_date ? new Date(agenda.due_date) : today;

    tasks.push({
      id: generateId(),
      agendaId: agenda.id,
      scheduledDate: getLocalDateString(taskDate),
      targetVal: dailyTarget,
      actualVal: 0,
      status: TaskStatus.PENDING,
    });

    return tasks;
  }

  // 2. HANDLE REGULAR RECURRING HABITS (Existing Logic)
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

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

    const targetDate = new Date(dateStr + "T00:00:00"); // Ensure local time parsing appropriately or use helpers

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
