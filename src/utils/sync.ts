import React from "react";
import { supabase } from "../api/supabase";
import {
  Agenda,
  DailyTask,
  TaskStatus,
  AgendaType,
  Priority,
  FailureTag,
} from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Types for Supabase response
interface SupabaseSubtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
}

interface SupabaseTask {
  id: string;
  agenda_id: string;
  scheduled_date: string;
  target_val: number | null;
  actual_val: number | null;
  status: string;
  failure_tag?: string;
  note?: string;
  mood?: string;
  was_recalculated?: boolean;
  subtasks?: SupabaseSubtask[];
}

interface SupabaseAgenda {
  id: string;
  title: string;
  type: string;
  buffer_tokens: number;
  total_target: number | null;
  unit: string;
  target_val: number;
  frequency: string;
  start_date: string;
  priority: string;
  due_date: string | null;
  is_recurring: boolean;
  recurrence_pattern: string;
  recurrence_days: number[] | null;
  reminder_time: string | null;
  daily_tasks?: SupabaseTask[];
}

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

  const typedAgendas = agendasData as unknown as SupabaseAgenda[];

  // Flatten the nested data
  const tasksData: SupabaseTask[] = [];
  const subtasksData: SupabaseSubtask[] = [];

  typedAgendas.forEach((agenda) => {
    if (agenda.daily_tasks) {
      agenda.daily_tasks.forEach((task) => {
        tasksData.push(task);
        if (task.subtasks) {
          subtasksData.push(...task.subtasks);
        }
      });
    }
  });

  // Map back to local types
  const mappedAgendas: Agenda[] = typedAgendas.map((a) => ({
    id: a.id,
    title: a.title,
    type: a.type as AgendaType,
    bufferTokens: a.buffer_tokens,
    totalTarget: a.total_target ?? undefined,
    unit: a.unit,
    targetVal: a.target_val,
    frequency: a.frequency as "daily",
    startDate: a.start_date,
    priority: a.priority as Priority,
    due_date: a.due_date || undefined,
    isRecurring: a.is_recurring,
    recurrencePattern: a.recurrence_pattern as any,
    recurrenceDays: a.recurrence_days || undefined,
    reminderTime: a.reminder_time || undefined,
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
      failureTag: t.failure_tag as FailureTag | undefined,
      note: t.note,
      mood: t.mood as any,
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
  setAgendas: React.Dispatch<React.SetStateAction<Agenda[]>>,
  setTasks: React.Dispatch<React.SetStateAction<DailyTask[]>>
) => {
  try {
    const data = await fetchRemoteData();
    if (data) {
      // FIX: Merge inside the setter to ensure we use LATEST state and avoid race conditions
      setAgendas((prevLocal) => {
        const merged = mergeById(prevLocal, data.agendas);
        AsyncStorage.setItem("agendas", JSON.stringify(merged)).catch((err) =>
          console.error("AsyncStorage error (agendas):", err)
        );
        return merged;
      });

      setTasks((prevLocal) => {
        const merged = mergeById(prevLocal, data.tasks);
        AsyncStorage.setItem("tasks", JSON.stringify(merged)).catch((err) =>
          console.error("AsyncStorage error (tasks):", err)
        );
        return merged;
      });
    }
  } catch (error) {
    console.error("Sync failed:", error);
  }
};
