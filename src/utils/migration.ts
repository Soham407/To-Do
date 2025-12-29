import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../api/supabase";
import { Agenda, DailyTask } from "../types";
import * as Crypto from "expo-crypto";

const MIGRATION_KEY = "supabase_migration_v1_complete";

// Helper to check if string is a valid UUID
const isValidUUID = (uuid: string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    uuid
  );
};

export const migrateLocalDataToSupabase = async () => {
  // 1. Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.log("No user logged in, skipping migration.");
    return;
  }

  // 2. Load local data
  const agendasJson = await AsyncStorage.getItem("agendas");
  const tasksJson = await AsyncStorage.getItem("tasks");

  if (!agendasJson) {
    console.log("No local agendas to migrate.");
    return;
  }

  const agendas: Agenda[] = JSON.parse(agendasJson);
  const tasks: DailyTask[] = tasksJson ? JSON.parse(tasksJson) : [];

  if (agendas.length === 0) {
    console.log("Local agendas list is empty.");
    return;
  }

  console.log(
    `Migrating ${agendas.length} agendas and ${tasks.length} tasks...`
  );

  // ID Mapping (Legacy ID -> New UUID)
  // Load existing map if any (for retries)
  const storedMap = await AsyncStorage.getItem("migration_id_map");
  const agendaIdMap = new Map<string, string>(
    storedMap ? JSON.parse(storedMap) : []
  );

  // Helper for deterministic UUID
  const getDeterministicUUID = async (input: string) => {
    if (isValidUUID(input)) return input;
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA1,
      input
    );
    // Format SHA1 digest (20 bytes hex) into UUID (16 bytes hex)
    // xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    return (
      digest.substring(0, 8) +
      "-" +
      digest.substring(8, 12) +
      "-" +
      digest.substring(12, 16) +
      "-" +
      digest.substring(16, 20) +
      "-" +
      digest.substring(20, 32)
    );
  };

  // 3. Prepare Agendas
  const agendaRows = await Promise.all(
    agendas.map(async (agenda) => {
      let newId = agendaIdMap.get(agenda.id);
      if (!newId) {
        newId = await getDeterministicUUID(agenda.id);
        agendaIdMap.set(agenda.id, newId);
      }

      return {
        id: newId,
        user_id: user.id,
        title: agenda.title,
        type: agenda.type,
        buffer_tokens: agenda.bufferTokens,
        total_target: agenda.totalTarget || null,
        unit: agenda.unit || null,
        target_val: agenda.targetVal || null,
        frequency: agenda.frequency,
        start_date: agenda.startDate,
        priority: agenda.priority || "MEDIUM",
        due_date: agenda.due_date || null,
        is_recurring:
          agenda.isRecurring !== undefined ? agenda.isRecurring : true,
        recurrence_pattern: agenda.recurrencePattern || "DAILY",
        recurrence_days: agenda.recurrenceDays || null,
        reminder_time: agenda.reminderTime || null,
        status: "ACTIVE",
      };
    })
  );

  // Persist map BEFORE upserting tasks (Critical for retries)
  await AsyncStorage.setItem(
    "migration_id_map",
    JSON.stringify(Array.from(agendaIdMap.entries()))
  );

  // Upsert Agendas
  const { error: agendaError } = await supabase
    .from("agendas")
    .upsert(agendaRows, { onConflict: "id" });

  if (agendaError) {
    console.error("Error migrating agendas:", agendaError);
    throw agendaError;
  }

  // 4. Insert Tasks
  if (tasks.length > 0) {
    const taskRows = await Promise.all(
      tasks
        .filter((task) => agendaIdMap.has(task.agendaId))
        .map(async (task) => {
          const newId = await getDeterministicUUID(task.id);

          return {
            id: newId,
            agenda_id: agendaIdMap.get(task.agendaId),
            scheduled_date: task.scheduledDate,
            target_val: task.targetVal,
            actual_val: task.actualVal,
            status: task.status,
            failure_tag: task.failureTag || null,
            note: task.note || null,
            mood: task.mood || null,
            was_recalculated: task.wasRecalculated || false,
          };
        })
    );

    if (taskRows.length > 0) {
      const { error: taskError } = await supabase
        .from("daily_tasks")
        .upsert(taskRows, { onConflict: "id" });

      if (taskError) {
        console.error("Error migrating tasks:", taskError);
        throw taskError;
      }
    }

    // 5. Insert Subtasks
    // We need to flatten ALL subtasks from ALL tasks
    const subtaskRows: any[] = [];

    for (const task of tasks) {
      if (
        task.subtasks &&
        task.subtasks.length > 0 &&
        agendaIdMap.has(task.agendaId)
      ) {
        // We need the NEW task ID for the subtask foreign key.
        // Since we generated deterministic UUIDs for tasks based on their ID, we can re-derive it.
        const taskId = await getDeterministicUUID(task.id);

        for (const sub of task.subtasks) {
          const subId = await getDeterministicUUID(sub.id);
          subtaskRows.push({
            id: subId,
            task_id: taskId,
            title: sub.title,
            is_completed: sub.isCompleted,
            created_at: new Date().toISOString(), // Or separate ID if we tracked it
          });
        }
      }
    }

    if (subtaskRows.length > 0) {
      const { error: subtaskError } = await supabase
        .from("subtasks")
        .upsert(subtaskRows, { onConflict: "id" });

      if (subtaskError) {
        console.error("Error migrating subtasks:", subtaskError);
        // Don't throw, partial success is better than failure here?
        // Better to throw to retry later.
        throw subtaskError;
      }
    }
  }

  console.log("Migration completed successfully.");
};
