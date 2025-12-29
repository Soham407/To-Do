import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
  Animated,
  TextInput,
} from "react-native";
import {
  ChevronDown,
  Calendar as CalendarIcon,
  Sparkles,
  UserCircle,
  List,
  KanbanSquare,
  Plus,
} from "lucide-react-native";
import { Agenda, DailyTask, TaskStatus, Priority } from "../types";
import CheckInModal from "../components/modals/CheckInModal";
import CalendarModal from "../components/modals/CalendarModal";
import GoalSettingsModal from "../components/modals/GoalSettingsModal";
import ProfileModal from "../components/modals/ProfileModal";
import QuickAddModal from "../components/modals/QuickAddModal";
import { getLocalDateString, parseLocalIsoDate } from "../utils/logic";
import { useTheme } from "../context/ThemeContext";
import { calculateStreak } from "../utils/insightsLogic";
import { getDashboardStyles } from "../components/dashboard/DashboardStyles";
import TaskCard from "../components/dashboard/TaskCard";

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
}

const Dashboard: React.FC<DashboardProps> = ({
  agendas,
  tasks,
  onNewGoal,
  onUpdateTask,
  onUpdateAgenda,
  onDeleteAgenda,
  onCreateTask,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getDashboardStyles(theme), [theme]);
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);
  const [selectedAgenda, setSelectedAgenda] = useState<Agenda | null>(null);
  const [settingsAgenda, setSettingsAgenda] = useState<Agenda | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    getLocalDateString()
  );
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"LIST" | "BOARD">("LIST");
  const [boardPage, setBoardPage] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "All" | "Today" | "Upcoming" | "Overdue" | "High Priority"
  >("All");

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
        const ag = agendas.find((a) => a.id === t.agendaId);
        return ag?.title.toLowerCase().includes(lower);
      });
    }

    return filtered.sort((a, b) => {
      const statusScore = (status: TaskStatus) =>
        status === TaskStatus.PENDING ? 0 : 1;
      if (statusScore(a.status) !== statusScore(b.status))
        return statusScore(a.status) - statusScore(b.status);

      const agendaA = agendas.find((ag) => ag.id === a.agendaId);
      const agendaB = agendas.find((ag) => ag.id === b.agendaId);
      const priorityScore = (p?: string) =>
        p === "HIGH" ? 3 : p === "LOW" ? 1 : 2;

      const scoreA = priorityScore(agendaA?.priority);
      const scoreB = priorityScore(agendaB?.priority);
      if (scoreA !== scoreB) return scoreB - scoreA;

      return a.scheduledDate.localeCompare(b.scheduledDate);
    });
  }, [tasks, selectedDate, agendas, searchText, activeFilter]);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (viewMode === "LIST" && localTasks.length === 0 && agendas.length > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.stopAnimation();
      scaleAnim.setValue(1);
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
              {selectedDate === getLocalDateString() ? "Today" : "Your Plan"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsProfileOpen(true)}
            style={styles.profileBtn}
          >
            <UserCircle size={32} color={theme.onSurfaceVariant} />
          </TouchableOpacity>
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

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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
          >
            {viewMode === "LIST" ? (
              <KanbanSquare size={20} color={theme.onSurfaceVariant} />
            ) : (
              <List size={20} color={theme.onSurfaceVariant} />
            )}
          </TouchableOpacity>
        </View>
      </View>

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
          {viewMode === "BOARD" && (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={{
                    width: i === boardPage ? 16 : 8,
                    height: 8,
                    borderRadius: 4,
                    marginHorizontal: 3,
                    backgroundColor:
                      i === boardPage ? theme.primary : theme.surfaceVariant,
                  }}
                />
              ))}
            </View>
          )}
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
              renderItem={({ item }) => {
                const agenda = agendas.find((a) => a.id === item.agendaId);
                if (!agenda) return null;
                return (
                  <View style={{ marginBottom: 10 }}>
                    <TaskCard
                      task={item}
                      agenda={agenda}
                      streak={calculateStreak(tasks, agenda.id).current}
                      theme={theme}
                      styles={styles}
                      onClick={handleTaskClick}
                      onSettingsClick={() => setSettingsAgenda(agenda)}
                      onToggleStatus={handleQuickToggle}
                    />
                  </View>
                );
              }}
            />
          )
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.boardContainer}
            decelerationRate="fast"
            snapToInterval={Dimensions.get("window").width * 0.85 + 16}
            onMomentumScrollEnd={(e) => {
              const offsetX = e.nativeEvent.contentOffset.x;
              const width = Dimensions.get("window").width * 0.85 + 16;
              setBoardPage(Math.round(offsetX / width));
            }}
          >
            {[
              {
                title: "To Do",
                filter: (t: DailyTask) => t.status === TaskStatus.PENDING,
                bg: theme.surfaceContainerHighest,
                color: theme.onSurface,
              },
              {
                title: "In Progress",
                filter: (t: DailyTask) =>
                  t.status === TaskStatus.PARTIAL ||
                  t.status === TaskStatus.SKIPPED_WITH_BUFFER,
                bg: theme.secondaryContainer,
                color: theme.onSecondaryContainer,
              },
              {
                title: "Done",
                filter: (t: DailyTask) =>
                  t.status === TaskStatus.COMPLETED ||
                  t.status === TaskStatus.FAILED,
                bg: theme.surfaceContainerHigh,
                color: theme.onSurface,
              },
            ].map((col, idx) => (
              <View key={idx} style={styles.column}>
                <View
                  style={[styles.columnHeader, { backgroundColor: col.bg }]}
                >
                  <Text style={[styles.columnTitle, { color: col.color }]}>
                    {col.title}
                  </Text>
                  <View
                    style={[
                      styles.countBadge,
                      { backgroundColor: theme.surface },
                    ]}
                  >
                    <Text style={styles.countText}>
                      {localTasks.filter(col.filter).length}
                    </Text>
                  </View>
                </View>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 100 }}
                >
                  {localTasks.filter(col.filter).map((item) => {
                    const agenda = agendas.find((a) => a.id === item.agendaId);
                    if (!agenda) return null;
                    return (
                      <View key={item.id} style={{ marginBottom: 10 }}>
                        <TaskCard
                          task={item}
                          agenda={agenda}
                          streak={calculateStreak(tasks, agenda.id).current}
                          theme={theme}
                          styles={styles}
                          onClick={handleTaskClick}
                          onSettingsClick={() => setSettingsAgenda(agenda)}
                          onToggleStatus={handleQuickToggle}
                        />
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            ))}
          </ScrollView>
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

      <Animated.View
        style={[styles.fab, { transform: [{ scale: scaleAnim }] }]}
      >
        <TouchableOpacity
          style={{
            width: "100%",
            height: "100%",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setIsQuickAddOpen(true)}
        >
          <Plus size={32} color={theme.onPrimaryContainer} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default Dashboard;
