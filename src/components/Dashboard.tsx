import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  FlatList,
  Dimensions,
} from "react-native";
import { Agenda, DailyTask, TaskStatus, AgendaType } from "../types";
import {
  Check,
  Circle,
  AlertCircle,
  Shield,
  ArrowRight,
  Settings,
  Plus,
  ChevronDown,
  Calendar as CalendarIcon,
  Sparkles,
  UserCircle,
  Square,
  CheckSquare,
  Search,
} from "lucide-react-native";
import { TextInput } from "react-native";
import CheckInModal from "./CheckInModal";
import CalendarModal from "./CalendarModal";
import GoalSettingsModal from "./GoalSettingsModal";
import ProfileModal from "./ProfileModal";
import QuickAddModal from "./QuickAddModal";
import { getLocalDateString } from "../utils/logic";
import { useTheme } from "../context/ThemeContext";

interface DashboardProps {
  agendas: Agenda[];
  tasks: DailyTask[];
  onUpdateTask: (
    task: DailyTask,
    strategy?: "TOMORROW" | "SPREAD",
    useBuffer?: boolean
  ) => void;
  onReorderTasks?: (tasks: DailyTask[]) => void;
  onNewGoal: () => void;
  onUpdateAgenda: (id: string, updates: Partial<Agenda>) => void;
  onDeleteAgenda: (id: string) => void;
  isNewUser?: boolean;
  onCreateTask: (title: string, dueDate: string, priority: any) => void;
}

// Internal component to handle individual progress bar
const NumericProgressBar: React.FC<{
  percentage: number;
  status: TaskStatus;
}> = ({ percentage, status }) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const isFailed = status === TaskStatus.FAILED;
  const barColor = isFailed ? theme.error : theme.primary;

  return (
    <View style={styles.progresBarTrack}>
      <View
        style={[
          styles.progressBarFill,
          { width: `${percentage}%`, backgroundColor: barColor },
        ]}
      />
    </View>
  );
};

interface TaskCardProps {
  task: DailyTask;
  agenda: Agenda;
  onClick: (task: DailyTask) => void;
  onSettingsClick: () => void;
  onToggleStatus: (task: DailyTask) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  agenda,
  onClick,
  onSettingsClick,
  onToggleStatus,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const isNumeric = agenda.type === AgendaType.NUMERIC;
  const percentage = isNumeric
    ? Math.min((task.actualVal / task.targetVal) * 100, 100)
    : 0;

  // Status Styles
  let cardBg = theme.surfaceContainerLow;
  let iconBg = "transparent";
  let iconColor = "transparent";

  // Logic for styles
  if (task.status === TaskStatus.COMPLETED) {
    cardBg = theme.surfaceContainerHigh;
    iconBg = theme.primary;
    iconColor = theme.onPrimary;
  } else if (task.status === TaskStatus.FAILED) {
    cardBg = theme.errorContainer;
    iconBg = theme.error;
    iconColor = theme.onError;
  } else if (task.status === TaskStatus.SKIPPED_WITH_BUFFER) {
    // Buffered State: Amber (Custom for now or derive from tertiary)
    cardBg = "#FFF8E1"; // Stick to amber for semantic meaning
    iconBg = "#FFC107";
    iconColor = "#000000";
  } else if (task.status === TaskStatus.PARTIAL) {
    cardBg = theme.secondaryContainer;
    iconBg = theme.secondary;
    iconColor = theme.onSecondary;
  }

  const renderIcon = () => {
    if (task.status === TaskStatus.PENDING) return null;
    if (task.status === TaskStatus.PARTIAL)
      return (
        <Text style={{ fontSize: 10, fontWeight: "bold", color: iconColor }}>
          %
        </Text>
      );
    if (task.status === TaskStatus.SKIPPED_WITH_BUFFER)
      return <Shield size={14} color={iconColor} />;
    if (task.status === TaskStatus.FAILED)
      return <AlertCircle size={14} color={iconColor} />;
    return <Check size={14} color={iconColor} strokeWidth={3} />;
  };

  const isOneOff = agenda.type === AgendaType.ONE_OFF;

  return (
    <TouchableOpacity
      onPress={() => onClick(task)}
      style={[styles.card, { backgroundColor: cardBg }]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          {/* Icon Box or Checkbox */}
          {isOneOff ? (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation(); // Prevent opening modal
                onToggleStatus(task);
              }}
              style={{ padding: 4, marginLeft: -4 }}
            >
              {task.status === TaskStatus.COMPLETED ? (
                <CheckSquare size={24} color={theme.primary} />
              ) : (
                <Square size={24} color={theme.outline} />
              )}
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: iconBg,
                  borderColor:
                    task.status === TaskStatus.PENDING
                      ? theme.outline
                      : "transparent",
                  borderWidth: task.status === TaskStatus.PENDING ? 1 : 0,
                },
              ]}
            >
              {renderIcon()}
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.cardTitle,
                task.status === TaskStatus.COMPLETED && styles.textLineThrough,
              ]}
            >
              {agenda.title}
              {task.mood && <Text style={{ opacity: 0.8 }}> {task.mood}</Text>}
            </Text>
            <Text style={styles.cardSubtitle}>
              {isNumeric
                ? `${task.targetVal} ${agenda.unit || "units"}`
                : "Daily"}
            </Text>

            {/* Subtask Progress Mini Bar */}
            {isOneOff && task.subtasks && task.subtasks.length > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    color: theme.onSurfaceVariant,
                    marginRight: 4,
                  }}
                >
                  {task.subtasks.filter((s) => s.isCompleted).length}/
                  {task.subtasks.length}
                </Text>
                <View
                  style={{
                    height: 4,
                    width: 40,
                    backgroundColor: theme.surfaceVariant,
                    borderRadius: 2,
                  }}
                >
                  <View
                    style={{
                      height: 4,
                      width: `${
                        (task.subtasks.filter((s) => s.isCompleted).length /
                          task.subtasks.length) *
                        100
                      }%`,
                      backgroundColor: theme.primary,
                      borderRadius: 2,
                    }}
                  />
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardRight}>
          {/* Priority Indicator */}
          {agenda.priority === "HIGH" && (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: theme.error,
                position: "absolute",
                top: 4,
                right: 32,
              }}
            />
          )}
          {agenda.priority === "LOW" && (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: theme.tertiary,
                position: "absolute",
                top: 4,
                right: 32,
              }}
            />
          )}

          {task.status === TaskStatus.PENDING && (
            <ArrowRight
              size={20}
              color={theme.onSurfaceVariant}
              style={{ opacity: 0.5 }}
            />
          )}
          <TouchableOpacity
            onPress={onSettingsClick}
            style={styles.settingsBtn}
          >
            <Settings
              size={18}
              color={theme.onSurfaceVariant}
              style={{ opacity: 0.5 }}
            />
          </TouchableOpacity>
        </View>

        {task.wasRecalculated && (
          <View style={styles.recalcBadge}>
            <Text style={styles.recalcText}>RECALCULATED</Text>
          </View>
        )}
      </View>

      {isNumeric && task.status !== TaskStatus.PENDING && (
        <View style={{ marginTop: 12, marginLeft: 40 }}>
          <NumericProgressBar percentage={percentage} status={task.status} />
        </View>
      )}

      {task.note && task.status !== TaskStatus.PENDING && (
        <Text style={styles.noteText}>"{task.note}"</Text>
      )}
    </TouchableOpacity>
  );
};

const Dashboard: React.FC<DashboardProps> = ({
  agendas,
  tasks,
  onUpdateTask,
  onReorderTasks,
  onNewGoal,
  onUpdateAgenda,
  onDeleteAgenda,
  isNewUser,
  onCreateTask,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);
  const [selectedAgenda, setSelectedAgenda] = useState<Agenda | null>(null);
  const [settingsAgenda, setSettingsAgenda] = useState<Agenda | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    getLocalDateString()
  );
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  /* ------------------ Filtering Logic ------------------ */
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "All" | "Today" | "Upcoming" | "Overdue" | "High Priority"
  >("All");

  const [localTasks, setLocalTasks] = useState<DailyTask[]>([]);

  useEffect(() => {
    // 1. Base Filter (Date & Agenda Existence)
    let filtered = tasks.filter((t) =>
      agendas.some((a) => a.id === t.agendaId)
    );

    // 2. Apply "Active Filter" Logic
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
    // "All" keeps everything (allows seeing history if we want, or default to generally showing relevant stuff)
    // Actually, "All" usually implies "All Active" or "Current View".
    // Let's keep "All" as "All for Selected Date" to maintain existing calendar behavior?
    // OR, if user explicitly clicks "All", maybe they want to search global?
    // Let's Hybridize:

    // If Filter is "All" or "Today", we respect the `selectedDate` from the calendar state
    // to map to the original design, UNLESS search text is present (then we search everything).

    if (!searchText && (activeFilter === "All" || activeFilter === "Today")) {
      filtered = filtered.filter((t) => t.scheduledDate === selectedDate);
    }

    // 3. Search Text
    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      filtered = filtered.filter((t) => {
        const ag = agendas.find((a) => a.id === t.agendaId);
        return ag?.title.toLowerCase().includes(lower);
      });
    }

    // 4. Sort Logic (Existing)
    const sorted = filtered.sort((a, b) => {
      // ... (Keep existing sort logic)
      // 1. Status: Pending first
      const statusScore = (status: TaskStatus) =>
        status === TaskStatus.PENDING ? 0 : 1;
      if (statusScore(a.status) !== statusScore(b.status)) {
        return statusScore(a.status) - statusScore(b.status);
      }

      // 2. Priority
      const agendaA = agendas.find((ag) => ag.id === a.agendaId);
      const agendaB = agendas.find((ag) => ag.id === b.agendaId);

      // Higher score = Higher priority
      const priorityScore = (p?: string) => {
        if (p === "HIGH") return 3;
        if (p === "MEDIUM") return 2;
        if (p === "LOW") return 1;
        return 2; // Default Medium
      };

      const scoreA = priorityScore(agendaA?.priority);
      const scoreB = priorityScore(agendaB?.priority);

      if (scoreA !== scoreB) return scoreB - scoreA; // Descending

      // 3. Date
      return a.scheduledDate.localeCompare(b.scheduledDate);
    });

    setLocalTasks(sorted);
  }, [tasks, selectedDate, agendas, searchText, activeFilter]);

  const handleTaskClick = (task: DailyTask) => {
    const agenda = agendas.find((a) => a.id === task.agendaId);
    if (!agenda) return;

    // For ONE_OFF tasks, clicking body behaves normally (opens details)
    setSelectedTask(task);
    setSelectedAgenda(agenda);
  };

  const handleQuickToggle = (task: DailyTask) => {
    // Simple toggle for ONE_OFF tasks
    const newStatus =
      task.status === TaskStatus.COMPLETED
        ? TaskStatus.PENDING
        : TaskStatus.COMPLETED;
    onUpdateTask({ ...task, status: newStatus });
  };

  const isToday = selectedDate === getLocalDateString();
  const dateObj = new Date(selectedDate + "T00:00:00");
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <View style={styles.container}>
      {/* Header & Controls */}
      <View style={styles.headerWrapper}>
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
              {isToday ? "Today" : "Your Plan"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsProfileOpen(true)}
            style={styles.profileBtn}
          >
            <UserCircle size={32} color={theme.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            placeholderTextColor={theme.onSurfaceVariant}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
        >
          {(
            ["All", "Today", "Upcoming", "Overdue", "High Priority"] as const
          ).map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                activeFilter === f && styles.filterChipActive,
              ]}
              onPress={() => {
                setActiveFilter(f);
                // If switching to Today/All, sync Date?
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
      </View>

      {/* List */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>Priorities</Text>

        {agendas.length === 0 ? (
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
            renderItem={({ item }) => {
              const agenda = agendas.find((a) => a.id === item.agendaId);
              if (!agenda) return null;
              return (
                <View style={{ marginBottom: 10 }}>
                  <TaskCard
                    task={item}
                    agenda={agenda}
                    onClick={handleTaskClick}
                    onSettingsClick={() => setSettingsAgenda(agenda)}
                    onToggleStatus={handleQuickToggle}
                  />
                </View>
              );
            }}
          />
        )}
      </View>

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

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      <GoalSettingsModal
        isOpen={!!settingsAgenda}
        onClose={() => setSettingsAgenda(null)}
        agenda={settingsAgenda}
        onUpdateAgenda={(updated) => onUpdateAgenda(updated.id, updated)}
        onDeleteAgenda={onDeleteAgenda}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onCreateTask={onCreateTask}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsQuickAddOpen(true)}
      >
        <Plus size={32} color={theme.onPrimaryContainer} />
      </TouchableOpacity>
    </View>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: theme.background, // Explicit background
    },
    headerWrapper: {
      marginBottom: 16,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginTop: 8,
      marginBottom: 16,
    },
    searchContainer: {
      marginBottom: 12,
      backgroundColor: theme.surfaceContainerHigh,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    searchInput: {
      fontSize: 16,
      color: theme.onSurface,
    },
    filterScroll: {
      marginBottom: 8,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 100,
      backgroundColor: theme.surfaceContainer,
      borderWidth: 1,
      borderColor: "transparent",
    },
    filterChipActive: {
      backgroundColor: theme.secondaryContainer,
      borderColor: theme.primary,
    },
    filterText: {
      fontSize: 14,
      color: theme.onSurfaceVariant,
      fontWeight: "500",
    },
    filterTextActive: {
      color: theme.onSecondaryContainer,
    },
    dateSelector: {
      marginLeft: -4,
      padding: 8,
      borderRadius: 16,
    },
    dateSubtext: {
      flexDirection: "row",
      alignItems: "center",
      color: theme.onSurfaceVariant,
      fontSize: 14,
      fontWeight: "500",
    },
    dateTitle: {
      fontSize: 32,
      color: theme.onSurface,
      fontWeight: "400",
    },
    profileBtn: {
      padding: 8,
      marginRight: -8,
    },
    statsContainer: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      padding: 16,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "flex-start",
    },
    statNumber: {
      fontSize: 36,
      fontWeight: "400",
      color: theme.onSurface,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.onSurfaceVariant,
      marginTop: 4,
    },
    listContainer: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.primary,
      marginLeft: 4,
      marginBottom: 12,
    },

    // Card
    card: {
      padding: 16,
      borderRadius: 24,
      marginBottom: 8,
    },
    cardHeader: {
      position: "relative",
    },
    cardLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    cardRight: {
      position: "absolute",
      right: 0,
      top: 0,
      flexDirection: "row",
      gap: 4,
    },
    iconBox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "400",
      color: theme.onSurface,
      marginRight: 40, // Space for settings
    },
    cardSubtitle: {
      fontSize: 12,
      color: theme.onSurfaceVariant,
      marginTop: 2,
    },
    settingsBtn: {
      padding: 8,
    },
    textLineThrough: {
      textDecorationLine: "line-through",
      opacity: 0.6,
    },
    noteText: {
      marginTop: 8,
      marginLeft: 40,
      fontSize: 12,
      fontStyle: "italic",
      color: theme.onSurfaceVariant,
    },
    recalcBadge: {
      position: "absolute",
      top: 8, // adjust
      right: 8, // adjust
    },
    recalcText: {
      fontSize: 8,
      color: theme.primary,
    },
    progresBarTrack: {
      height: 8,
      width: "100%",
      backgroundColor: theme.surfaceVariant + "33", // 20% opacity
      borderRadius: 4,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 4,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
      backgroundColor: theme.surfaceContainerHigh,
      borderRadius: 24,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      backgroundColor: theme.surfaceVariant,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      color: theme.onSurface,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: theme.onSurfaceVariant,
      marginBottom: 24,
      textAlign: "center",
    },
    createBtn: {
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
    },
    createBtnText: {
      color: theme.onPrimary,
      fontWeight: "500",
    },
    fab: {
      position: "absolute",
      bottom: 120, // Sit above the Bottom Navigation Bar
      right: 24,
      width: 64,
      height: 64,
      borderRadius: 24, // MD3 Large FAB
      backgroundColor: theme.primaryContainer,
      justifyContent: "center",
      alignItems: "center",
      elevation: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
  });

export default Dashboard;
