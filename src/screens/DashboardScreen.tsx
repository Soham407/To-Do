import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Sparkles } from "lucide-react-native";
import { Agenda, DailyTask, TaskStatus, Priority, List } from "../types";
import CheckInModal from "../components/modals/CheckInModal";
import CalendarModal from "../components/modals/CalendarModal";
import GoalSettingsModal from "../components/modals/GoalSettingsModal";
import ProfileModal from "../components/modals/ProfileModal";
import QuickAddModal from "../components/modals/QuickAddModal";
import CoachChatModal from "../components/modals/CoachChatModal";
import GoalTemplatesModal from "../components/modals/GoalTemplatesModal";
import ListsModal from "../components/modals/ListsModal";
import { getLocalDateString } from "../utils/logic";
import { useTheme } from "../context/ThemeContext";
import { getDashboardStyles } from "../components/dashboard/DashboardStyles";
import TaskCard from "../components/dashboard/TaskCard";
import KanbanSection from "../components/dashboard/KanbanSection";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import DashboardFAB from "../components/dashboard/DashboardFAB";
import { useDashboardController } from "../hooks/useDashboardController";

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

  const {
    selectedTask,
    setSelectedTask,
    selectedAgenda,
    setSelectedAgenda,
    settingsAgenda,
    setSettingsAgenda,
    isQuickAddOpen,
    setIsQuickAddOpen,
    isTemplatesOpen,
    setIsTemplatesOpen,
    isListsOpen,
    setIsListsOpen,
    selectedListId,
    setSelectedListId,
    selectedDate,
    setSelectedDate,
    isCalendarOpen,
    setIsCalendarOpen,
    isProfileOpen,
    setIsProfileOpen,
    isCoachChatOpen,
    setIsCoachChatOpen,
    viewMode,
    setViewMode,
    searchText,
    setSearchText,
    activeFilter,
    setActiveFilter,
    expandedSections,
    setExpandedSections,
    agendaMap,
    streakMap,
    localTasks,
    goalCounts,
    fabScale,
    formattedDate,
    handleTaskClick,
    handleQuickToggle,
  } = useDashboardController({ agendas, tasks, onUpdateTask });

  const ITEM_HEIGHT = 100; // Estimated height for task cards

  return (
    <View style={styles.container}>
      <DashboardHeader
        theme={theme}
        isDark={isDark}
        styles={styles}
        formattedDate={formattedDate}
        selectedDate={selectedDate}
        searchText={searchText}
        setSearchText={setSearchText}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        setSelectedDate={setSelectedDate}
        viewMode={viewMode}
        setViewMode={setViewMode}
        setIsCalendarOpen={setIsCalendarOpen}
        setIsTemplatesOpen={setIsTemplatesOpen}
        setIsListsOpen={setIsListsOpen}
        setIsCoachChatOpen={setIsCoachChatOpen}
        setIsProfileOpen={setIsProfileOpen}
        tasks={tasks}
        agendas={agendas}
        lists={lists}
        selectedListId={selectedListId}
        setSelectedListId={setSelectedListId}
        goalCounts={goalCounts}
      />

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
              getItemLayout={(_, index) => ({
                length: ITEM_HEIGHT,
                offset: ITEM_HEIGHT * index,
                index,
              })}
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
          tasks={tasks}
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

      <DashboardFAB
        fabScale={fabScale}
        theme={theme}
        styles={styles}
        onPress={() => setIsQuickAddOpen(true)}
      />
    </View>
  );
};

export default Dashboard;
