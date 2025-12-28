import React, { useState, useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Layout from "./src/components/Layout";
import Dashboard from "./src/components/Dashboard";
import OnboardingChat from "./src/components/OnboardingChat";
import ReportView from "./src/components/ReportView";
import { Agenda, DailyTask, AgendaType, Priority } from "./src/types";
import { ThemeProvider } from "./src/context/ThemeContext";
import {
  createInitialTasks,
  recalculateNumericTasks,
  ensureTasksForDate,
  getTodayDateString,
  generateId,
} from "./src/utils/logic";
import { StatusBar } from "expo-status-bar";
import { migrateLocalDataToSupabase } from "./src/utils/migration";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/components/LoginScreen";
import SignupScreen from "./src/components/SignupScreen";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

function MainApp() {
  const { session, loading: authLoading } = useAuth();
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [view, setView] = useState<"dashboard" | "onboarding" | "report">(
    "onboarding"
  );
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  // Persistence Loading
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedAgendas = await AsyncStorage.getItem("agendas");
        const savedTasks = await AsyncStorage.getItem("tasks");

        if (savedAgendas) {
          const parsedAgendas = JSON.parse(savedAgendas);
          setAgendas(parsedAgendas);
          if (parsedAgendas.length > 0) setView("dashboard");
        }
        if (savedTasks) {
          const parsedTasks = JSON.parse(savedTasks);
          // Sanitize: Remove orphans if agendas exist
          if (savedAgendas) {
            const parsedAgendas = JSON.parse(savedAgendas); // Re-parsing for safety in this scope
            const validAgendaIds = new Set(
              parsedAgendas.map((a: Agenda) => a.id)
            );
            const sanitizedTasks = parsedTasks.filter((t: DailyTask) =>
              validAgendaIds.has(t.agendaId)
            );
            setTasks(sanitizedTasks);
          } else {
            setTasks(parsedTasks);
          }
        }
      } catch (e) {
        console.error("Failed to load storage", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Persistence Saving
  useEffect(() => {
    if (!loading) {
      AsyncStorage.setItem("agendas", JSON.stringify(agendas));
      AsyncStorage.setItem("tasks", JSON.stringify(tasks));
    }
  }, [agendas, tasks, loading]);

  // Migration Trigger
  const migrationGuard = React.useRef(false);

  useEffect(() => {
    const runMigration = async () => {
      if (session?.user && !migrationGuard.current) {
        const userMigrationKey = `otp_migration_complete_${session.user.id}`;

        // Set in-memory guard immediately to prevent race conditions
        migrationGuard.current = true;

        try {
          // Check persistent flag
          const isMigrated = await AsyncStorage.getItem(userMigrationKey);
          if (isMigrated === "true") {
            migrationGuard.current = false;
            return;
          }

          // Run migration
          await migrateLocalDataToSupabase();

          // Set persistent flag on success
          await AsyncStorage.setItem(userMigrationKey, "true");
        } catch (e) {
          console.error("Migration failed, allowing retry:", e);
          // Reset guard to allow retry on next mount/session change
          migrationGuard.current = false;
        }
      }
    };

    runMigration();
  }, [session]);

  // Logic Hardening
  useEffect(() => {
    if (agendas.length === 0 || loading) return;

    const today = getTodayDateString();
    setTasks((prev) => {
      const newTasks = ensureTasksForDate(agendas, prev, today);
      return newTasks.length > 0 ? [...prev, ...newTasks] : prev;
    });
  }, [agendas, loading]);

  const handleAgendaCreated = (newAgenda: Agenda) => {
    const initialTasks = createInitialTasks(newAgenda);
    setAgendas((prev) => {
      const wasEmpty = prev.length === 0;
      const updated = [...prev, newAgenda];
      if (wasEmpty) setIsNewUser(true);
      return updated;
    });
    setTasks((prev) => [...prev, ...initialTasks]);

    setView("dashboard");
  };

  const handleUpdateTask = (
    updatedTask: DailyTask,
    strategy?: "TOMORROW" | "SPREAD",
    useBuffer?: boolean
  ) => {
    let newTasks = tasks.map((t) =>
      t.id === updatedTask.id ? updatedTask : t
    );

    // Recalculation
    if (strategy) {
      const agenda = agendas.find((a) => a.id === updatedTask.agendaId);
      if (agenda && agenda.type === AgendaType.NUMERIC) {
        const missing = updatedTask.targetVal - updatedTask.actualVal;
        if (missing > 0) {
          newTasks = recalculateNumericTasks(
            newTasks,
            updatedTask.id,
            missing,
            strategy
          );
        }
      }
    }

    // Buffer
    if (useBuffer) {
      setAgendas((prev) =>
        prev.map((a) => {
          if (a.id === updatedTask.agendaId) {
            return { ...a, bufferTokens: Math.max(0, a.bufferTokens - 1) };
          }
          return a;
        })
      );
    }

    setTasks(newTasks);
  };

  const handleUpdateAgenda = (id: string, updates: Partial<Agenda>) => {
    setAgendas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
    if (updates.totalTarget && updates.totalTarget > 0) {
      const newDailyTarget = Math.ceil(updates.totalTarget / 30);
      setTasks((prev) =>
        prev.map((t) => {
          if (t.agendaId === id && t.status === "PENDING") {
            return { ...t, targetVal: newDailyTarget };
          }
          return t;
        })
      );
    }
  };

  // Handle view transition when agendas become empty
  useEffect(() => {
    if (!loading && agendas.length === 0) {
      setView("onboarding");
    }
  }, [agendas, loading]);

  const handleDeleteAgenda = (id: string) => {
    setAgendas((prev) => prev.filter((a) => a.id !== id));
    setTasks((prev) => prev.filter((t) => t.agendaId !== id));
  };

  const handleCreateTask = (
    title: string,
    dueDate: string,
    priority: Priority,
    reminderTime?: string
  ) => {
    const newAgenda: Agenda = {
      id: generateId(),
      title,
      type: AgendaType.ONE_OFF,
      priority,
      due_date: dueDate,
      isRecurring: false,
      bufferTokens: 0,
      startDate: getTodayDateString(),
      frequency: "daily",
      targetVal: 1,
      reminderTime: reminderTime,
    };
    handleAgendaCreated(newAgenda);
  };

  if (loading || authLoading) return null; // Or splash screen

  if (!session) {
    if (showSignup) {
      return (
        <SafeAreaProvider>
          <SignupScreen onLogin={() => setShowSignup(false)} />
          <StatusBar style="auto" />
        </SafeAreaProvider>
      );
    }
    return (
      <SafeAreaProvider>
        <LoginScreen onSignup={() => setShowSignup(true)} />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    );
  }

  const renderContent = () => {
    switch (view) {
      case "onboarding":
        return (
          <OnboardingChat
            onComplete={handleAgendaCreated}
            onCancel={() =>
              setView(agendas.length > 0 ? "dashboard" : "onboarding")
            }
          />
        );
      case "dashboard":
        return (
          <Dashboard
            agendas={agendas}
            tasks={tasks}
            onUpdateTask={handleUpdateTask}
            onNewGoal={() => setView("onboarding")}
            onUpdateAgenda={handleUpdateAgenda}
            onDeleteAgenda={handleDeleteAgenda}
            isNewUser={isNewUser}
            onCreateTask={handleCreateTask}
          />
        );
      case "report":
        return <ReportView tasks={tasks} agendas={agendas} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaProvider>
      <Layout
        activeTab={view}
        onTabChange={setView}
        showNav={agendas.length > 0 && view !== "onboarding"}
      >
        {renderContent()}
      </Layout>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
