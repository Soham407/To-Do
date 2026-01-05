import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
  Animated as RNAnimated,
  TextInput,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  FadeInDown,
  FadeOutUp,
  Layout as ReanimatedLayout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon,
  Sparkles,
  UserCircle,
  List as ListIcon,
  KanbanSquare,
  Plus,
  MessageCircle,
  Zap,
  FolderOpen,
} from "lucide-react-native";
import {
  Agenda,
  DailyTask,
  TaskStatus,
  Priority,
  List,
  DEFAULT_LISTS,
} from "../types";
import CheckInModal from "../components/modals/CheckInModal";
import CalendarModal from "../components/modals/CalendarModal";
import GoalSettingsModal from "../components/modals/GoalSettingsModal";
import ProfileModal from "../components/modals/ProfileModal";
import QuickAddModal from "../components/modals/QuickAddModal";
import CoachChatModal from "../components/modals/CoachChatModal";
import GoalTemplatesModal from "../components/modals/GoalTemplatesModal";
import { getLocalDateString, parseLocalIsoDate } from "../utils/logic";
import { useTheme } from "../context/ThemeContext";
import { SPRING_CONFIG } from "../utils/animations";
import { calculateStreak, StreakInfo } from "../utils/insightsLogic";
import { getDashboardStyles } from "../components/dashboard/DashboardStyles";
import TaskCard from "../components/dashboard/TaskCard";
import ProgressOverview from "../components/dashboard/ProgressOverview";
import ListsFilterBar from "../components/dashboard/ListsFilterBar";
import ListsModal from "../components/modals/ListsModal";
import KanbanSection from "../components/dashboard/KanbanSection";

interface DashboardProps {
  agendas: Agenda[];
  tasks: DailyTask[];
  onUpdateTask: (
    task: DailyTask,
    strategy?: "TOMORROW" | "SPREAD",
    useBuffer?: boolean
  ) => void;
  onNewGoal: () => void;
  onUpdateAgenda: (id: string, updates: Partial<Agenda>) => void;
  onDeleteAgenda: (id: string) => void;
  isNewUser?: boolean;
  onCreateTask: (title: string, dueDate: string, priority: Priority) => void;
  onCreateGoal: (agenda: Agenda) => void;
  lists: List[];
  onUpdateLists: (lists: List[]) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  agendas,
  tasks,
  onNewGoal,
  onUpdateTask,
  onUpdateAgenda,
  onDeleteAgenda,
  onCreateTask,
  onCreateGoal,
  lists,
  onUpdateLists,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(
    () => getDashboardStyles(theme, isDark),
    [theme, isDark]
  );
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);
  const [selectedAgenda, setSelectedAgenda] = useState<Agenda | null>(null);
  const [settingsAgenda, setSettingsAgenda] = useState<Agenda | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isListsOpen, setIsListsOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    getLocalDateString()
  );
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCoachChatOpen, setIsCoachChatOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"LIST" | "BOARD">("LIST");
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "All" | "Today" | "Upcoming" | "Overdue" | "High Priority"
  >("All");
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    "Not Done": true,
    Done: false,
  });

  // Pre-compute agenda map for O(1) lookups
  const agendaMap = useMemo(() => {
    return new Map(agendas.map((a) => [a.id, a]));
  }, [agendas]);

  // Memoize streak calculations to avoid recalculating per-card
  const streakMap = useMemo(() => {
    const map = new Map<string, StreakInfo>();
    agendas.forEach((a) => {
      map.set(a.id, calculateStreak(tasks, a.id));
    });
    return map;
  }, [tasks, agendas]);

  const localTasks = useMemo(() => {
    let filtered = tasks.filter((t) =>
      agendas.some((a) => a.id === t.agendaId)
    );
    const todayStr = getLocalDateString();

    if (activeFilter === "Today") {
      filtered = filtered.filter((t) => t.scheduledDate === todayStr);
    } else if (activeFilter === "Upcoming") {
      filtered = filtered.filter((t) => t.scheduledDate > todayStr);
    } else if (activeFilter === "Overdue") {
      filtered = filtered.filter(
        (t) => t.scheduledDate < todayStr && t.status === TaskStatus.PENDING
      );
    } else if (activeFilter === "High Priority") {
      filtered = filtered.filter((t) => {
        const ag = agendas.find((a) => a.id === t.agendaId);
        return ag?.priority === "HIGH" && t.status === TaskStatus.PENDING;
      });
    }

    if (!searchText && (activeFilter === "All" || activeFilter === "Today")) {
      filtered = filtered.filter((t) => t.scheduledDate === selectedDate);
    }

    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      filtered = filtered.filter((t) => {
        const ag = agendaMap.get(t.agendaId);
        const agendaMatch = ag?.title.toLowerCase().includes(lower);
        const noteMatch = t.note?.toLowerCase().includes(lower);
        return agendaMatch || noteMatch;
      });
    }

    // Filter by selected list
    if (selectedListId) {
      filtered = filtered.filter((t) => {
        const ag = agendaMap.get(t.agendaId);
        return ag?.listId === selectedListId;
      });
    }

    return filtered.sort((a, b) => {
      const statusScore = (status: TaskStatus) =>
        status === TaskStatus.PENDING ? 0 : 1;
      if (statusScore(a.status) !== statusScore(b.status))
        return statusScore(a.status) - statusScore(b.status);

      const agendaA = agendaMap.get(a.agendaId);
      const agendaB = agendaMap.get(b.agendaId);
      const priorityScore = (p?: string) =>
        p === "HIGH" ? 3 : p === "LOW" ? 1 : 2;

      const scoreA = priorityScore(agendaA?.priority);
      const scoreB = priorityScore(agendaB?.priority);
      if (scoreA !== scoreB) return scoreB - scoreA;

      return a.scheduledDate.localeCompare(b.scheduledDate);
    });
  }, [
    tasks,
    selectedDate,
    agendas,
    searchText,
    activeFilter,
    agendaMap,
    selectedListId,
  ]);

  // Compute goal counts per list
  const goalCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    agendas.forEach((a) => {
      if (a.listId) {
        counts[a.listId] = (counts[a.listId] || 0) + 1;
      }
    });
    return counts;
  }, [agendas]);

  const fabScale = useSharedValue(1);

  useEffect(() => {
    if (viewMode === "LIST" && localTasks.length === 0 && agendas.length > 0) {
      fabScale.value = withSpring(1.1, {
        damping: 2,
        stiffness: 150,
        mass: 0.5,
      });
    } else {
      fabScale.value = withSpring(1, SPRING_CONFIG);
    }
  }, [viewMode, localTasks.length, agendas.length]);

  const handleTaskClick = (task: DailyTask) => {
    const agenda = agendas.find((a) => a.id === task.agendaId);
    if (agenda) {
      setSelectedTask(task);
      setSelectedAgenda(agenda);
    }
  };

  const handleQuickToggle = (task: DailyTask) => {
    const newStatus =
      task.status === TaskStatus.COMPLETED
        ? TaskStatus.PENDING
        : TaskStatus.COMPLETED;
    onUpdateTask({ ...task, status: newStatus });
  };

  const formattedDate = useMemo(() => {
    try {
      const dateObj = parseLocalIsoDate(selectedDate);
      if (isNaN(dateObj.getTime())) throw new Error("Invalid Date");

      return dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    } catch (e) {
      return "Selected Date";
    }
  }, [selectedDate]);

  return (
    <View style={styles.container}>
      <BlurView
        intensity={Platform.OS === "ios" ? 40 : 60}
        tint={isDark ? "dark" : "light"}
        style={styles.headerWrapper}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setIsCalendarOpen(true)}
            style={styles.dateSelector}
          >
            <Text style={styles.dateSubtext}>
              {formattedDate}{" "}
              <ChevronDown size={16} color={theme.onSurfaceVariant} />
            </Text>
            <Text style={styles.dateTitle}>
              {selectedDate === getLocalDateString() ? "Today" : "Your Plan"}
            </Text>
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => setIsTemplatesOpen(true)}
              style={[
                styles.coachBtn,
                {
                  backgroundColor: theme.secondaryContainer + "40",
                  borderColor: theme.secondary + "30",
                },
              ]}
              accessibilityLabel="Quick start templates"
              accessibilityRole="button"
            >
              <Zap size={20} color={theme.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsListsOpen(true)}
              style={[
                styles.coachBtn,
                {
                  backgroundColor: theme.tertiaryContainer + "40",
                  borderColor: theme.tertiary + "30",
                },
              ]}
              accessibilityLabel="Manage lists"
              accessibilityRole="button"
            >
              <FolderOpen size={20} color={theme.tertiary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsCoachChatOpen(true)}
              style={styles.coachBtn}
              accessibilityLabel="AI Coach"
              accessibilityRole="button"
            >
              <Sparkles size={22} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsProfileOpen(true)}
              style={styles.profileBtn}
              accessibilityLabel="Profile settings"
              accessibilityRole="button"
            >
              <UserCircle size={32} color={theme.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            placeholderTextColor={theme.onSurfaceVariant}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterScrollContainer}
          >
            {(
              ["All", "Today", "Upcoming", "Overdue", "High Priority"] as const
            ).map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterChip,
                  activeFilter === f && styles.filterChipActive,
                  { marginRight: 8 },
                ]}
                onPress={() => {
                  setActiveFilter(f);
                  if (f === "Today") setSelectedDate(getLocalDateString());
                }}
              >
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === f && styles.filterTextActive,
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.viewToggleBtn}
            onPress={() => setViewMode(viewMode === "LIST" ? "BOARD" : "LIST")}
            accessibilityLabel={
              viewMode === "LIST"
                ? "Switch to board view"
                : "Switch to list view"
            }
          >
            {viewMode === "LIST" ? (
              <KanbanSquare size={20} color={theme.onSurfaceVariant} />
            ) : (
              <ListIcon size={20} color={theme.onSurfaceVariant} />
            )}
          </TouchableOpacity>
        </View>

        {/* Progress Overview - Only show on Today filter */}
        {activeFilter === "Today" && (
          <ProgressOverview tasks={tasks} agendas={agendas} theme={theme} />
        )}

        {/* Lists Filter Bar */}
        <ListsFilterBar
          lists={lists}
          selectedListId={selectedListId}
          onSelectList={setSelectedListId}
          theme={theme}
          goalCounts={goalCounts}
        />
      </BlurView>

      <View style={styles.listContainer}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 8,
          }}
        >
          <Text style={styles.sectionTitle}>
            {viewMode === "LIST" ? "Priorities" : "Kanban Board"}
          </Text>
        </View>

        {viewMode === "LIST" ? (
          agendas.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Sparkles size={24} color={theme.onSurfaceVariant} />
              </View>
              <Text style={styles.emptyTitle}>Welcome!</Text>
              <Text style={styles.emptyText}>
                Create your first goal to start adapting.
              </Text>
              <TouchableOpacity onPress={onNewGoal} style={styles.createBtn}>
                <Text style={styles.createBtnText}>+ Create Goal</Text>
              </TouchableOpacity>
            </View>
          ) : localTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No tasks for this day.</Text>
              <TouchableOpacity
                onPress={() => setSelectedDate(getLocalDateString())}
              >
                <Text style={{ color: theme.primary, marginTop: 10 }}>
                  Jump to Today
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={localTasks}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 100 }}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={5}
              initialNumToRender={10}
              renderItem={({ item, index }) => {
                const agenda = agendaMap.get(item.agendaId);
                if (!agenda) return null;
                return (
                  <Animated.View
                    entering={FadeInDown.delay(index * 100).springify()}
                    style={{ marginBottom: 10 }}
                  >
                    <TaskCard
                      task={item}
                      agenda={agenda}
                      streak={streakMap.get(agenda.id)?.current ?? 0}
                      theme={theme}
                      styles={styles}
                      onClick={handleTaskClick}
                      onSettingsClick={() => setSettingsAgenda(agenda)}
                      onToggleStatus={handleQuickToggle}
                    />
                  </Animated.View>
                );
              }}
            />
          )
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {[
              {
                title: "Not Done",
                filter: (t: DailyTask) => t.status !== TaskStatus.COMPLETED,
                bg: theme.surfaceContainerHighest,
                color: theme.onSurface,
              },
              {
                title: "Done",
                filter: (t: DailyTask) => t.status === TaskStatus.COMPLETED,
                bg: theme.primaryContainer,
                color: theme.onPrimaryContainer,
              },
            ].map((col) => (
              <KanbanSection
                key={col.title}
                title={col.title}
                tasks={localTasks.filter(col.filter)}
                isExpanded={expandedSections[col.title] ?? false}
                onToggle={() => {
                  setExpandedSections((prev) => ({
                    ...prev,
                    [col.title]: !prev[col.title],
                  }));
                }}
                theme={theme}
                styles={styles}
                bg={col.bg}
                color={col.color}
                agendaMap={agendaMap}
                streakMap={streakMap}
                onTaskClick={handleTaskClick}
                onSettingsClick={(agenda) => setSettingsAgenda(agenda)}
                onToggleStatus={handleQuickToggle}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {!!selectedTask && (
        <CheckInModal
          isOpen={!!selectedTask}
          onClose={() => {
            setSelectedTask(null);
            setSelectedAgenda(null);
          }}
          task={selectedTask}
          agenda={selectedAgenda}
          onUpdateTask={onUpdateTask}
          onDeleteAgenda={onDeleteAgenda}
        />
      )}
      {isCalendarOpen && (
        <CalendarModal
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      )}
      {!!settingsAgenda && (
        <GoalSettingsModal
          isOpen={!!settingsAgenda}
          onClose={() => setSettingsAgenda(null)}
          agenda={settingsAgenda}
          onUpdateAgenda={(updated) => onUpdateAgenda(updated.id, updated)}
          onDeleteAgenda={onDeleteAgenda}
        />
      )}
      {isProfileOpen && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />
      )}
      {isQuickAddOpen && (
        <QuickAddModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          onCreateTask={onCreateTask}
        />
      )}
      {isCoachChatOpen && (
        <CoachChatModal
          isOpen={isCoachChatOpen}
          onClose={() => setIsCoachChatOpen(false)}
          tasks={tasks}
          agendas={agendas}
          lists={lists}
        />
      )}
      {isTemplatesOpen && (
        <GoalTemplatesModal
          isOpen={isTemplatesOpen}
          onClose={() => setIsTemplatesOpen(false)}
          onCreateGoal={onCreateGoal}
        />
      )}
      {isListsOpen && (
        <ListsModal
          isOpen={isListsOpen}
          onClose={() => setIsListsOpen(false)}
          lists={lists}
          onUpdateLists={onUpdateLists}
        />
      )}

      <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          style={{
            width: "100%",
            height: "100%",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setIsQuickAddOpen(true)}
          onPressIn={() => {
            fabScale.value = withSpring(0.9, SPRING_CONFIG);
          }}
          onPressOut={() => {
            fabScale.value = withSpring(1, SPRING_CONFIG);
          }}
          activeOpacity={1}
        >
          <Plus size={32} color={theme.onPrimaryContainer} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default Dashboard;
