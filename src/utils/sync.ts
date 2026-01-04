import { supabase } from "../api/supabase";
import { Agenda, DailyTask, TaskStatus, AgendaType, Priority } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const fetchRemoteData = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch all data in ONE query using nested selects
  const { data: agendasData, error: fetchError } = await supabase
    .from("agendas")
    .select(
      `
      *,
      daily_tasks (
        *,
        subtasks (*)
      )
    `
    )
    .eq("user_id", user.id);

  if (fetchError) throw fetchError;
  if (!agendasData) return null;

  // Flatten the nested data
  const tasksData: any[] = [];
  const subtasksData: any[] = [];

  agendasData.forEach((agenda: any) => {
    if (agenda.daily_tasks) {
      agenda.daily_tasks.forEach((task: any) => {
        tasksData.push(task);
        if (task.subtasks) {
          subtasksData.push(...task.subtasks);
        }
      });
    }
  });

  // Map back to local types
  const mappedAgendas: Agenda[] = agendasData.map((a) => ({
    id: a.id,
    title: a.title,
    type: a.type as AgendaType,
    bufferTokens: a.buffer_tokens,
    totalTarget: a.total_target,
    unit: a.unit,
    targetVal: a.target_val,
    frequency: a.frequency,
    startDate: a.start_date,
    priority: a.priority as Priority,
    due_date: a.due_date,
    isRecurring: a.is_recurring,
    recurrencePattern: a.recurrence_pattern,
    recurrenceDays: a.recurrence_days,
    reminderTime: a.reminder_time,
  }));

  const mappedTasks: DailyTask[] = tasksData.map((t) => {
    const taskSubtasks = subtasksData
      .filter((s) => s.task_id === t.id)
      .map((s) => ({
        id: s.id,
        taskId: s.task_id,
        title: s.title,
        isCompleted: s.is_completed,
      }));

    return {
      id: t.id,
      agendaId: t.agenda_id,
      scheduledDate: t.scheduled_date,
      targetVal: t.target_val ?? 1,
      actualVal: t.actual_val ?? 0,
      status: t.status as TaskStatus,
      failureTag: t.failure_tag,
      note: t.note,
      mood: t.mood,
      wasRecalculated: t.was_recalculated,
      subtasks: taskSubtasks,
    };
  });

  return { agendas: mappedAgendas, tasks: mappedTasks };
};

// Helper to merge arrays by ID
function mergeById<T extends { id: string }>(local: T[], cloud: T[]): T[] {
  const map = new Map<string, T>();
  // 1. Add cloud items first (they are the source of truth for remote state)
  cloud.forEach((item) => map.set(item.id, item));
  // 2. Add local items only if they don't exist in the cloud yet
  local.forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
}

export const syncWithCloud = async (
  currentAgendas: Agenda[],
  currentTasks: DailyTask[],
  setAgendas: (a: Agenda[]) => void,
  setTasks: (t: DailyTask[]) => void
) => {
  try {
    const data = await fetchRemoteData();
    if (data) {
      // Merge cloud data with current local data
      const mergedAgendas = mergeById(currentAgendas, data.agendas);
      const mergedTasks = mergeById(currentTasks, data.tasks);

      // Only update if there's actually a change (simple length check or deep equal would be better, but length + merge is usually enough for a primary sync)
      // We update the state
      setAgendas(mergedAgendas);
      setTasks(mergedTasks);

      // Update local storage
      await AsyncStorage.setItem("agendas", JSON.stringify(mergedAgendas));
      await AsyncStorage.setItem("tasks", JSON.stringify(mergedTasks));

      console.log(
        `Sync complete: ${mergedAgendas.length} agendas, ${mergedTasks.length} tasks merged.`
      );
    }
  } catch (error) {
    console.error("Sync failed:", error);
  }
};
