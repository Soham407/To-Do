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

export const getDailyTarget = (agenda: Agenda): number => {
  if (agenda.type === AgendaType.NUMERIC) {
    if (agenda.totalTarget) {
      return Math.ceil(agenda.totalTarget / 30); // Assume 30 days for now
    }
    return 10; // Default placeholder
  }
  return 1; // Boolean is always 1
};

export const createInitialTasks = (
  agenda: Agenda,
  days: number = 7
): DailyTask[] => {
  const tasks: DailyTask[] = [];
  const today = new Date();
  const dailyTarget = getDailyTarget(agenda);

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    tasks.push({
      id: generateId(),
      agendaId: agenda.id,
      scheduledDate: getLocalDateString(date),
      targetVal: dailyTarget,
      actualVal: 0,
      status: TaskStatus.PENDING,
    });
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
    // Check if a task exists for this agenda on the given date
    const hasTask = tasks.some(
      (t) => t.agendaId === agenda.id && t.scheduledDate === dateStr
    );

    if (!hasTask) {
      newTasks.push({
        id: generateId(),
        agendaId: agenda.id,
        scheduledDate: dateStr,
        targetVal: getDailyTarget(agenda),
        actualVal: 0,
        status: TaskStatus.PENDING,
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
  if (taskIndex === -1 || taskIndex === tasks.length - 1) return tasks; // No future tasks

  const newTasks = [...tasks];

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
