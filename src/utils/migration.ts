import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
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
  try {
    // 1. Check if already migrated
    const isMigrated = await AsyncStorage.getItem(MIGRATION_KEY);
    if (isMigrated === "true") {
      console.log("Migration already completed.");
      return;
    }

    // 2. Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.log("No user logged in, skipping migration.");
      return;
    }

    // 3. Load local data
    const agendasJson = await AsyncStorage.getItem("agendas");
    const tasksJson = await AsyncStorage.getItem("tasks");

    if (!agendasJson) {
      console.log("No local agendas to migrate.");
      await AsyncStorage.setItem(MIGRATION_KEY, "true");
      return;
    }

    const agendas: Agenda[] = JSON.parse(agendasJson);
    const tasks: DailyTask[] = tasksJson ? JSON.parse(tasksJson) : [];

    if (agendas.length === 0) {
      console.log("Local agendas list is empty.");
      await AsyncStorage.setItem(MIGRATION_KEY, "true");
      return;
    }

    console.log(
      `Migrating ${agendas.length} agendas and ${tasks.length} tasks...`
    );

    // ID Mapping (Legacy ID -> New UUID)
    const agendaIdMap = new Map<string, string>();

    // 4. Insert Agendas
    const agendaRows = agendas.map((agenda) => {
      // Check if existing ID is valid UUID, if not generate new one
      const newId = isValidUUID(agenda.id) ? agenda.id : Crypto.randomUUID();
      agendaIdMap.set(agenda.id, newId);

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
        status: "ACTIVE",
      };
    });

    const { error: agendaError } = await supabase
      .from("agendas")
      .upsert(agendaRows, { onConflict: "id" });

    if (agendaError) {
      console.error("Error migrating agendas:", agendaError);
      throw agendaError;
    }

    // 5. Insert Tasks
    if (tasks.length > 0) {
      const taskRows = tasks
        .filter((task) => agendaIdMap.has(task.agendaId)) // Only migrate tasks for migrated agendas
        .map((task) => {
          // Check if existing ID is valid UUID
          const newId = isValidUUID(task.id) ? task.id : Crypto.randomUUID();

          return {
            id: newId,
            agenda_id: agendaIdMap.get(task.agendaId), // Use mapped agenda ID
            scheduled_date: task.scheduledDate,
            target_val: task.targetVal,
            actual_val: task.actualVal,
            status: task.status,
            failure_tag: task.failureTag || null,
            note: task.note || null,
            mood: task.mood || null,
            was_recalculated: task.wasRecalculated || false,
          };
        });

      if (taskRows.length > 0) {
        const { error: taskError } = await supabase
          .from("daily_tasks")
          .upsert(taskRows, { onConflict: "id" });

        if (taskError) {
          console.error("Error migrating tasks:", taskError);
          throw taskError;
        }
      }
    }

    // 6. Mark as complete
    await AsyncStorage.setItem(MIGRATION_KEY, "true");
    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    // Do not mark as complete so we can retry later
  }
};
