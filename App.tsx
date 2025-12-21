import React, { useState, useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Layout from "./src/components/Layout";
import Dashboard from "./src/components/Dashboard";
import OnboardingChat from "./src/components/OnboardingChat";
import ReportView from "./src/components/ReportView";
import { Agenda, DailyTask, AgendaType } from "./src/types";
import {
  createInitialTasks,
  recalculateNumericTasks,
  ensureTasksForDate,
  getTodayDateString,
} from "./src/utils/logic";
import { StatusBar } from "expo-status-bar";

export default function App() {
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [view, setView] = useState<"dashboard" | "onboarding" | "report">(
    "onboarding"
  );
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

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
        if (savedTasks) setTasks(JSON.parse(savedTasks));
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

  // Logic Hardening
  useEffect(() => {
    if (agendas.length === 0 || loading) return;

    const today = getTodayDateString();
    const newTasks = ensureTasksForDate(agendas, tasks, today);

    if (newTasks.length > 0) {
      setTasks((prev) => [...prev, ...newTasks]);
    }
  }, [agendas, tasks, loading]);

  const handleAgendaCreated = (newAgenda: Agenda) => {
    const initialTasks = createInitialTasks(newAgenda);
    setAgendas((prev) => [...prev, newAgenda]);
    setTasks((prev) => [...prev, ...initialTasks]);

    if (agendas.length === 0) {
      setIsNewUser(true);
    }
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

  const handleDeleteAgenda = (id: string) => {
    setAgendas((prev) => prev.filter((a) => a.id !== id));
    setTasks((prev) => prev.filter((t) => t.agendaId !== id));
    // Logic from ref: if last one, go to onboarding?
    // Check immediately
    const remaining = agendas.filter((a) => a.id !== id);
    if (remaining.length === 0) {
      setView("onboarding");
    }
  };

  if (loading) return null; // Or splash screen

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
