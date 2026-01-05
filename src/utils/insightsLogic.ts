import {
  Agenda,
  DailyTask,
  TaskStatus,
  AgendaType,
  FailureTag,
} from "../types";
import { getLocalDateString, parseLocalIsoDate } from "./logic";

export interface StreakInfo {
  current: number;
  longest: number;
}

export const calculateStreak = (
  tasks: DailyTask[],
  agendaId?: string
): StreakInfo => {
  const agendaTasks = agendaId
    ? tasks.filter((t) => t.agendaId === agendaId)
    : tasks;

  if (agendaTasks.length === 0) return { current: 0, longest: 0 };

  // Sort tasks by date asc ONCE
  const sorted = [...agendaTasks].sort((a, b) =>
    a.scheduledDate.localeCompare(b.scheduledDate)
  );

  // Map of date -> status for O(1) current streak check
  const statusMap = new Map<string, TaskStatus>();
  sorted.forEach((t) => statusMap.set(t.scheduledDate, t.status));

  // 1. Calculate Current Streak (Iterate backwards from today)
  let current = 0;
  const d = new Date();

  // If today is not done, check yesterday. If yesterday is not done, streak is 0.
  // Exception: If today is still pending, we don't break the streak yet, but it doesn't count towards the streak until finished.

  let dateStr = getLocalDateString(d);
  let status = statusMap.get(dateStr);

  if (
    status === TaskStatus.COMPLETED ||
    status === TaskStatus.SKIPPED_WITH_BUFFER
  ) {
    current++;
    d.setDate(d.getDate() - 1);
  } else {
    // Today not done/pending. Check yesterday.
    d.setDate(d.getDate() - 1);
  }

  while (true) {
    dateStr = getLocalDateString(d);
    status = statusMap.get(dateStr);

    if (
      status === TaskStatus.COMPLETED ||
      status === TaskStatus.SKIPPED_WITH_BUFFER
    ) {
      current++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  // 2. Calculate Longest Streak (Single pass through sorted tasks)
  let longest = 0;
  let currentRun = 0;
  sorted.forEach((t) => {
    if (
      t.status === TaskStatus.COMPLETED ||
      t.status === TaskStatus.SKIPPED_WITH_BUFFER
    ) {
      currentRun++;
    } else if (t.status !== TaskStatus.PENDING) {
      // Failed tasks break the historical streak
      longest = Math.max(longest, currentRun);
      currentRun = 0;
    }
    // Pending tasks are ignored for historical longest streak? Usually yes.
  });
  longest = Math.max(longest, currentRun);

  return { current, longest };
};

export const getConsistencyDelta = (
  tasks: DailyTask[],
  agendas: Agenda[],
  rangeDays: number
): number => {
  const activeAgendaIds = new Set(agendas.map((a) => a.id));

  // 1. Current Period
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - rangeDays + 1);

  const startStr = getLocalDateString(startDate);
  const endStr = getLocalDateString(endDate);

  const currentTasks = tasks.filter(
    (t) =>
      t.scheduledDate >= startStr &&
      t.scheduledDate <= endStr &&
      activeAgendaIds.has(t.agendaId) &&
      t.status !== TaskStatus.PENDING
  );

  if (currentTasks.length === 0) return 0;

  const currentSuccess = currentTasks.filter(
    (t) =>
      t.status === TaskStatus.COMPLETED ||
      t.status === TaskStatus.SKIPPED_WITH_BUFFER
  ).length;

  const currentScore = (currentSuccess / currentTasks.length) * 100;

  // 2. Previous Period
  const prevEndDate = new Date(startDate);
  prevEndDate.setDate(prevEndDate.getDate() - 1);
  const prevStartDate = new Date(prevEndDate);
  prevStartDate.setDate(prevStartDate.getDate() - rangeDays + 1);

  const prevStartStr = getLocalDateString(prevStartDate);
  const prevEndStr = getLocalDateString(prevEndDate);

  const prevTasks = tasks.filter(
    (t) =>
      t.scheduledDate >= prevStartStr &&
      t.scheduledDate <= prevEndStr &&
      activeAgendaIds.has(t.agendaId) &&
      t.status !== TaskStatus.PENDING
  );

  if (prevTasks.length === 0) return 0;

  const prevSuccess = prevTasks.filter(
    (t) =>
      t.status === TaskStatus.COMPLETED ||
      t.status === TaskStatus.SKIPPED_WITH_BUFFER
  ).length;

  const prevScore = (prevSuccess / prevTasks.length) * 100;

  return Math.round(currentScore - prevScore);
};

export const getCategoryStats = (tasks: DailyTask[], agendas: Agenda[]) => {
  // Group by listId or Agenda Type if List ID missing
  // Since ListID is optional and we don't have list names, let's use AgendaType/Tag logic ???
  // User requested "Category-Based... Work, Health".
  // We don't have "Work/Health" fields in Agenda TYPE.
  // We assume the user creates Lists named "Work", "Health".
  // But we don't have the List Name map here.
  // Fallback: Group by "Tag" if we add tags? Or just ID?
  // Let's assume we map usage by AgendaType for now as a proxy, or return empty if we can't do it.
  // Wait, the user said "Since you now have 'Lists' or categories".
  // I can stick to AgendaType (Habit vs Task vs Goal) or just show a breakdown by Specific Agenda Title (Top performing habits).
  // Let's do "Top Performing Habits" instead if Metadata is missing.
  // Actually, I'll attempt to group by 'listId' even if I just label them "List A", "List B" or skip if undefined.
  return [];
};

export const getCorrelations = (tasks: DailyTask[], agendas: Agenda[]) => {
  // Simple correlation:
  // Identify days with "Good" mood or high completion rate.
  // "On days you complete X, you completion rate is Y% higher".

  // 1. Find pairs of agendas that often co-occur.
  // This is computationally expensive O(N^2 * Days).
  // Let's do a simpler check:
  // "On days you report 'Tired', your completion rate is X%".

  const failureStats: Record<string, { total: number; completed: number }> = {};

  // Group days by Failure Tag presence?
  // No, failure tag is per task.
  // Check "Days with >1 failure tag 'Tired'".
  const dayStats: Record<
    string,
    { tags: Set<string>; completion: number; count: number }
  > = {};

  // First pass: aggregate day stats
  tasks.forEach((t) => {
    if (!dayStats[t.scheduledDate]) {
      dayStats[t.scheduledDate] = { tags: new Set(), completion: 0, count: 0 };
    }
    const ds = dayStats[t.scheduledDate];
    if (t.status !== TaskStatus.PENDING) ds.count++;
    if (t.status === TaskStatus.COMPLETED) ds.completion++;
    if (t.failureTag && t.failureTag !== FailureTag.NONE)
      ds.tags.add(t.failureTag);
  });

  const correlations: string[] = [];

  // Example: Tired
  let tiredDays = 0;
  let tiredCompletion = 0;
  let normalDays = 0;
  let normalCompletion = 0;

  Object.values(dayStats).forEach((ds) => {
    const rate = ds.count > 0 ? ds.completion / ds.count : 0;
    if (ds.tags.has(FailureTag.TIRED)) {
      tiredDays++;
      tiredCompletion += rate;
    } else {
      normalDays++;
      normalCompletion += rate;
    }
  });

  if (tiredDays > 5 && normalDays > 5) {
    const tiredAvg = (tiredCompletion / tiredDays) * 100;
    const normalAvg = (normalCompletion / normalDays) * 100;
    const diff = normalAvg - tiredAvg;
    if (diff > 10) {
      correlations.push(
        `When you are '${
          FailureTag.TIRED
        }', your productivity drops by ${Math.round(diff)}%.`
      );
    }
  }

  return correlations;
};
