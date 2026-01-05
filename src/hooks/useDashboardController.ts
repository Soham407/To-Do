import { useState, useMemo, useEffect } from "react";
import { useSharedValue, withSpring } from "react-native-reanimated";
import { Agenda, DailyTask, TaskStatus, Priority, List } from "../types";
import { getLocalDateString, parseLocalIsoDate } from "../utils/logic";
import { calculateStreak, StreakInfo } from "../utils/insightsLogic";
import { SPRING_CONFIG } from "../utils/animations";

interface DashboardControllerProps {
  agendas: Agenda[];
  tasks: DailyTask[];
  onUpdateTask: (task: DailyTask) => void;
}

export const useDashboardController = ({
  agendas,
  tasks,
  onUpdateTask,
}: DashboardControllerProps) => {
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

  // Memoize streak calculations (Optimized to avoid O(N*M))
  const streakMap = useMemo(() => {
    const map = new Map<string, StreakInfo>();

    // Group tasks by agendaId first O(M)
    const tasksByAgenda = new Map<string, DailyTask[]>();
    tasks.forEach((t) => {
      if (!tasksByAgenda.has(t.agendaId)) {
        tasksByAgenda.set(t.agendaId, []);
      }
      tasksByAgenda.get(t.agendaId)!.push(t);
    });

    // Calculate streaks using pre-grouped tasks O(N + M_i)
    agendas.forEach((a) => {
      const agendaTasks = tasksByAgenda.get(a.id) || [];
      if (agendaTasks.length > 0) {
        map.set(a.id, calculateStreak(agendaTasks));
      } else {
        map.set(a.id, { current: 0, longest: 0 });
      }
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

  return {
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
  };
};
