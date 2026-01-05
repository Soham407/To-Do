import React, { useState, useEffect, useRef } from "react";
import { ActivityIndicator, View, StyleSheet, BackHandler } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Layout from "./src/components/common/Layout";
import DashboardScreen from "./src/screens/DashboardScreen";
import OnboardingChat from "./src/components/onboarding/OnboardingChat";
import ReportScreen from "./src/screens/ReportScreen";
import {
  Agenda,
  DailyTask,
  AgendaType,
  Priority,
  List,
  DEFAULT_LISTS,
} from "./src/types";
import { ThemeProvider } from "./src/context/ThemeContext";
import {
  createInitialTasks,
  recalculateNumericTasks,
  ensureTasksForDate,
  getTodayDateString,
  generateId,
} from "./src/utils/logic";
import { APP_CONSTANTS } from "./src/config/constants";
import { StatusBar } from "expo-status-bar";
import { migrateLocalDataToSupabase } from "./src/utils/migration";
import { NotificationService } from "./src/api/NotificationService"; // Import Service

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/auth/LoginScreen";
import SignupScreen from "./src/screens/auth/SignupScreen";
import { syncWithCloud } from "./src/utils/sync";
import { ToastProvider, useToast } from "./src/components/common/Toast";

// Custom Fonts
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import * as SplashScreen from "expo-splash-screen";

// Keep splash screen visible while fonts load
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore error */
});

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaProvider>
          <Layout showNav={false} activeTab="dashboard" onTabChange={() => {}}>
            <DashboardScreen
              agendas={[]}
              tasks={[]}
              onUpdateTask={() => {}}
              onNewGoal={() => {}}
              onUpdateAgenda={() => {}}
              onDeleteAgenda={() => {}}
              onCreateTask={() => {}}
              onCreateGoal={() => {}}
              lists={[]}
              onUpdateLists={() => {}}
            />
          </Layout>
        </SafeAreaProvider>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_700Bold,
  });

  // Hide splash screen once fonts are ready
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {
        /* ignore error */
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <MainApp />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function MainApp() {
  const { session, loading: authLoading } = useAuth();
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [lists, setLists] = useState<List[]>(DEFAULT_LISTS);
  const [view, setView] = useState<"dashboard" | "onboarding" | "report">(
    "onboarding"
  );
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { showToast } = useToast();

  // Debounce timeout ref for persistence
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Persistence Loading
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedAgendas = await AsyncStorage.getItem("agendas");
        const savedTasks = await AsyncStorage.getItem("tasks");
        const savedLists = await AsyncStorage.getItem("lists");

        let loadedAgendas: Agenda[] = [];
        if (savedAgendas) {
          loadedAgendas = JSON.parse(savedAgendas);
          setAgendas(loadedAgendas);
          if (loadedAgendas.length > 0) setView("dashboard");
        }
        if (savedTasks) {
          const parsedTasks = JSON.parse(savedTasks);
          // Sanitize: Remove orphans if agendas exist
          if (loadedAgendas.length > 0) {
            const validAgendaIds = new Set(
              loadedAgendas.map((a: Agenda) => a.id)
            );
            const sanitizedTasks = parsedTasks.filter((t: DailyTask) =>
              validAgendaIds.has(t.agendaId)
            );
            setTasks(sanitizedTasks);
          } else {
            setTasks(parsedTasks);
          }
        }
        if (savedLists) {
          setLists(JSON.parse(savedLists));
        }
      } catch (e) {
        console.error("Failed to load storage", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Persistence Saving (Debounced for efficiency)
  useEffect(() => {
    if (!loading) {
      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Debounce saves by 500ms to prevent excessive writes
      saveTimeoutRef.current = setTimeout(() => {
        AsyncStorage.setItem("agendas", JSON.stringify(agendas));
        AsyncStorage.setItem("tasks", JSON.stringify(tasks));
        AsyncStorage.setItem("lists", JSON.stringify(lists));
      }, 500);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [agendas, tasks, lists, loading]);

  // Data Initialization Flow Strategy:
  // 1. Load Local Data (already handled in loadData effect)
  // 2. IF Session exists, set backup of local data
  // 3. Run Migration (Local -> Cloud)
  // 4. Run Sync (Cloud -> Local with MERGE)
  const [isMigrationComplete, setIsMigrationComplete] = useState(false);
  const lastInitializedUser = useRef<string | null>(null);

  useEffect(() => {
    const initializeCloudData = async () => {
      // Don't run until session is ready, local load is done, and we haven't already init'd THIS user
      if (
        !session?.user ||
        loading ||
        lastInitializedUser.current === session.user.id
      )
        return;

      lastInitializedUser.current = session.user.id;
      setIsSyncing(true);

      try {
        console.log("🚀 Starting Cloud Data Initialization...");

        // 1. Create a safety backup if it doesn't exist
        const hasBackup = await AsyncStorage.getItem("agendas_backup");
        if (!hasBackup && agendas.length > 0) {
          console.log("📦 Creating safety backup of local data...");
          await AsyncStorage.setItem("agendas_backup", JSON.stringify(agendas));
          await AsyncStorage.setItem("tasks_backup", JSON.stringify(tasks));
        }

        // 2. Run Migration
        const userMigrationKey = `otp_migration_complete_${session.user.id}`;
        const isMigrated = await AsyncStorage.getItem(userMigrationKey);

        if (isMigrated !== "true") {
          console.log("➡️ Running Migration...");
          await migrateLocalDataToSupabase();
          await AsyncStorage.setItem(userMigrationKey, "true");
        }

        setIsMigrationComplete(true);

        // 3. Run Sync (Cloud -> Local with MERGE)
        console.log("🔄 Running Sync...");
        await syncWithCloud(setAgendas, setTasks);

        console.log("✅ Cloud Data Initialization Complete.");
        showToast({
          message: "Data synced successfully",
          type: "success",
          duration: 2000,
        });
      } catch (error) {
        console.error("❌ Data Initialization failed:", error);
        showToast({
          message: "Sync failed. Your data is saved locally.",
          type: "error",
          duration: 5000,
          action: {
            label: "Retry",
            onPress: () => {
              lastInitializedUser.current = null; // Reset to allow retry
            },
          },
        });
      } finally {
        setIsSyncing(false);
      }
    };

    initializeCloudData();
  }, [session, loading]); // Run when session becomes available after local load

  // Logic Hardening
  useEffect(() => {
    if (agendas.length === 0 || loading) return;

    const today = getTodayDateString();
    setTasks((prev) => {
      const newTasks = ensureTasksForDate(agendas, prev, today);
      return newTasks.length > 0 ? [...prev, ...newTasks] : prev;
    });
  }, [agendas, loading]);

  const handleAgendaCreated = (newAgendas: Agenda | Agenda[]) => {
    const agendasList = Array.isArray(newAgendas) ? newAgendas : [newAgendas];

    setAgendas((prev) => {
      const wasEmpty = prev.length === 0;
      const updated = [...prev, ...agendasList];
      if (wasEmpty) setIsNewUser(true);
      return updated;
    });

    const allNewTasks = agendasList.flatMap((agenda) =>
      createInitialTasks(agenda)
    );
    setTasks((prev) => [...prev, ...allNewTasks]);

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

    // Check for streak milestones and send celebration notification
    if (updatedTask.status === "COMPLETED") {
      NotificationService.checkStreakMilestones(
        newTasks,
        updatedTask.agendaId
      ).catch((err) => console.log("Streak check skipped:", err));
    }
  };

  // Initialize Notifications (including smart coaching nudges)
  useEffect(() => {
    const setupNotifications = async () => {
      await NotificationService.registerForPushNotificationsAsync();
      // Set up smart coaching notifications (morning motivation at 8am, evening reminder at 8pm)
      await NotificationService.setupSmartNotifications({
        morningMotivation: true,
        eveningReminder: true,
      });
    };
    setupNotifications();
  }, []);

  const handleUpdateAgenda = (id: string, updates: Partial<Agenda>) => {
    const oldAgenda = agendas.find((a) => a.id === id);
    if (!oldAgenda) return;

    const newAgenda = { ...oldAgenda, ...updates };

    setAgendas((prev) => prev.map((a) => (a.id === id ? newAgenda : a)));

    // Schedule or Cancel Reminder based on changes
    NotificationService.scheduleTaskReminder(newAgenda);

    if (updates.totalTarget && updates.totalTarget > 0) {
      const dailyTarget =
        updates.targetVal !== undefined
          ? updates.targetVal
          : oldAgenda.targetVal ||
            Math.ceil(
              updates.totalTarget / APP_CONSTANTS.DEFAULT_DURATION_DAYS
            );

      setTasks((prev) =>
        prev.map((t) => {
          if (t.agendaId === id && t.status === "PENDING") {
            return { ...t, targetVal: dailyTarget };
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

  // FIX: Android Back Handler
  useEffect(() => {
    const onBackPress = () => {
      if (view !== "dashboard") {
        setView("dashboard");
        return true; // handled
      }
      return false; // exit app
    };

    BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () =>
      BackHandler.removeEventListener("hardwareBackPress", onBackPress);
  }, [view]);

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

    if (reminderTime && reminderTime.trim() !== "") {
      NotificationService.scheduleTaskReminder(newAgenda).catch((err) => {
        console.error("Failed to schedule notification for new task:", err);
      });
    }
  };

  if (loading || authLoading) return null; // Or splash screen

  // Show syncing indicator
  if (isSyncing) {
    return (
      <SafeAreaProvider>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

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
            onCancel={() => setView("dashboard")}
            lists={lists}
          />
        );
      case "dashboard":
        return (
          <DashboardScreen
            agendas={agendas}
            tasks={tasks}
            onUpdateTask={handleUpdateTask}
            onNewGoal={() => setView("onboarding")}
            onUpdateAgenda={handleUpdateAgenda}
            onDeleteAgenda={handleDeleteAgenda}
            isNewUser={isNewUser}
            onCreateTask={handleCreateTask}
            onCreateGoal={handleAgendaCreated}
            lists={lists}
            onUpdateLists={setLists}
          />
        );
      case "report":
        return <ReportScreen tasks={tasks} agendas={agendas} />;
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
