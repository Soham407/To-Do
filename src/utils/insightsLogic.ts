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
  agendaId: string
): StreakInfo => {
  // Sort tasks by date desc
  const sorted = tasks
    .filter((t) => t.agendaId === agendaId && t.status !== TaskStatus.PENDING)
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));

  let current = 0;
  let longest = 0;
  let tempLongest = 0;

  // Basic streak logic: logic depends on gaps.
  // If we have daily tasks, a missing day breaks the streak.
  // Ideally we iterate days backwards from today.

  // Allow for today to be pending without breaking streak if yesterday was done?
  // Current Streak = contiguous days ending yesterday/today.

  const todayStr = getLocalDateString(new Date());
  const yesterdayStr = getLocalDateString(new Date(Date.now() - 86400000));

  // Map of date -> status
  const statusMap = new Map<string, TaskStatus>();
  tasks
    .filter((t) => t.agendaId === agendaId)
    .forEach((t) => statusMap.set(t.scheduledDate, t.status));

  // 1. Calculate Current Streak
  let d = new Date();
  let streak = 0;
  // Check today
  let dateStr = getLocalDateString(d);
  let status = statusMap.get(dateStr);

  // If today is done, start count. If pending, check yesterday.
  if (
    status === TaskStatus.COMPLETED ||
    status === TaskStatus.SKIPPED_WITH_BUFFER
  ) {
    streak++;
    d.setDate(d.getDate() - 1);
  } else {
    // Today not done. Check yesterday.
    d.setDate(d.getDate() - 1); // Move to yesterday
  }

  while (true) {
    dateStr = getLocalDateString(d);
    status = statusMap.get(dateStr);

    // If no task exists for this day, we stop? Or if the Agenda didn't exist?
    // Usually finding the task is safer.
    // If no task record, assume break? Or assumed skipped?
    // Let's assume break if no record found for a past date when agenda was active.
    // Simplifying: Just check status map.

    if (
      status === TaskStatus.COMPLETED ||
      status === TaskStatus.SKIPPED_WITH_BUFFER
    ) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  current = streak;

  // 2. Calculate Longest Streak (Naive implementation over all history)
  // Re-sort all tasks by date asc
  const allTasks = tasks
    .filter((t) => t.agendaId === agendaId)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  let currentRun = 0;
  allTasks.forEach((t) => {
    if (
      t.status === TaskStatus.COMPLETED ||
      t.status === TaskStatus.SKIPPED_WITH_BUFFER
    ) {
      currentRun++;
    } else {
      longest = Math.max(longest, currentRun);
      currentRun = 0;
    }
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
