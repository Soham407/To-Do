import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  Share,
} from "react-native";
import {
  Agenda,
  DailyTask,
  TaskStatus,
  FailureTag,
  AgendaType,
} from "../types";
import { useTheme, ThemeType } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../api/supabase";
import {
  Trophy,
  AlertTriangle,
  TrendingUp,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  X,
  Target,
  Clock,
  Zap,
  Share2,
  BookOpen,
  Award,
} from "lucide-react-native";
import { Calendar } from "react-native-calendars";
import { getLocalDateString } from "../utils/logic";
import {
  calculateStreak,
  getConsistencyDelta,
  getCorrelations,
} from "../utils/insightsLogic";
import AchievementsModal from "../components/modals/AchievementsModal";
import WeeklyReflectionModal from "../components/modals/WeeklyReflectionModal";

interface ReportViewProps {
  tasks: DailyTask[];
  agendas: Agenda[];
}

const ReportView: React.FC<ReportViewProps> = ({ tasks, agendas }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => getStyles(theme), [theme]);

  // -- State --
  const [filterMode, setFilterMode] = useState<"7days" | "15days" | "30days">(
    "7days"
  );
  // Custom range logic removed per user request for fixed 7/15/30 filters

  // Detail Modal State
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Neural Insights (Supabase)
  const [insightText, setInsightText] = useState<string | null>(null);

  // New Modal States
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isReflectionOpen, setIsReflectionOpen] = useState(false);

  // -- Derived Date Range --
  const { startDateStr, endDateStr, daysInRange } = useMemo(() => {
    let start = new Date();
    let end = new Date();
    let days = 7;

    if (filterMode === "7days") {
      start.setDate(end.getDate() - 6);
      days = 7;
    } else if (filterMode === "15days") {
      start.setDate(end.getDate() - 14);
      days = 15;
    } else if (filterMode === "30days") {
      start.setDate(end.getDate() - 29);
      days = 30;
    }

    return {
      startDateStr: getLocalDateString(start),
      endDateStr: getLocalDateString(end),
      daysInRange: days,
    };
  }, [filterMode]);

  // -- Stats Calculations --

  const rangeTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.scheduledDate >= startDateStr &&
          t.scheduledDate <= endDateStr &&
          agendas.some((a) => a.id === t.agendaId)
      ),
    [tasks, startDateStr, endDateStr, agendas]
  );

  // 1. Overall Consistency
  const consistencyStats = useMemo(() => {
    const completedOrFailed = rangeTasks.filter(
      (t) => t.status !== TaskStatus.PENDING
    );
    if (completedOrFailed.length === 0) return { score: 0, delta: 0 };

    const success = completedOrFailed.filter(
      (t) =>
        t.status === TaskStatus.COMPLETED ||
        t.status === TaskStatus.SKIPPED_WITH_BUFFER
    ).length;

    const score = Math.round((success / completedOrFailed.length) * 100);
    const delta = getConsistencyDelta(tasks, agendas, daysInRange);

    return { score, delta };
  }, [rangeTasks, tasks, agendas, daysInRange]);

  // 2. Task Completion Stats for the range + Best Streak
  const streakStats = useMemo(() => {
    let bestStreak = 0;

    agendas.forEach((a) => {
      const { current } = calculateStreak(tasks, a.id);
      if (current > bestStreak) bestStreak = current;
    });

    // Total tasks done in the selected range
    const completedInRange = rangeTasks.filter(
      (t) => t.status === TaskStatus.COMPLETED
    ).length;

    // Total scheduled tasks in range (including pending)
    const totalInRange = rangeTasks.length;

    return { bestStreak, completedInRange, totalInRange };
  }, [tasks, agendas, rangeTasks]);

  // 3. Habit Performance List
  const habitPerformance = useMemo(() => {
    return agendas
      .map((agenda) => {
        const agendaTasks = rangeTasks.filter(
          (t) => t.agendaId === agenda.id && t.status !== TaskStatus.PENDING
        );
        const success = agendaTasks.filter(
          (t) =>
            t.status === TaskStatus.COMPLETED ||
            t.status === TaskStatus.SKIPPED_WITH_BUFFER
        ).length;
        const total = agendaTasks.length;
        const score = total > 0 ? Math.round((success / total) * 100) : 0;

        // For numeric goals, calculate average % of target achieved
        let numericProgress = 0;
        if (agenda.type === AgendaType.NUMERIC) {
          const numericTasks = rangeTasks.filter(
            (t) => t.agendaId === agenda.id && t.status !== TaskStatus.PENDING
          );
          if (numericTasks.length > 0) {
            const totalActual = numericTasks.reduce(
              (sum, t) => sum + t.actualVal,
              0
            );
            const totalTarget = numericTasks.reduce(
              (sum, t) => sum + t.targetVal,
              0
            );
            numericProgress =
              totalTarget > 0
                ? Math.round((totalActual / totalTarget) * 100)
                : 0;
          }
        }

        return {
          ...agenda,
          score,
          numericProgress,
          count: total,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [rangeTasks, agendas]);

  // 4. Correlations
  const correlations = useMemo(
    () => getCorrelations(tasks, agendas),
    [tasks, agendas]
  );

  // -- Effects --
  useEffect(() => {
    const fetchInsights = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase.rpc(
          "get_insights_failure_by_day",
          { p_user_id: user.id }
        );
        if (error) throw error;
        if (data && data.length > 0) {
          const top = data[0];
          setInsightText(
            `You tend to report '${top.failure_tag}' most often on ${top.day_label}s.`
          );
        }
      } catch (e) {
        console.error("Failed to fetch insights", e);
      }
    };
    if (rangeTasks.length > 0) fetchInsights();
  }, [user, rangeTasks.length]); // Simple dependency

  // -- Handlers --
  const onDayPress = (day: any) => {
    setSelectedDate(day.dateString);
    setModalVisible(true);
  };

  const getDayDetails = () => {
    if (!selectedDate) return [];
    return tasks.filter(
      (t) =>
        t.scheduledDate === selectedDate &&
        agendas.some((a) => a.id === t.agendaId)
    );
  };

  const handleShare = async () => {
    try {
      const summary = `
📊 Insights Report (${startDateStr} - ${endDateStr})

Consistency: ${consistencyStats.score}%
${
  consistencyStats.delta !== 0
    ? `Trajectory: ${consistencyStats.delta > 0 ? "Up" : "Down"} ${Math.abs(
        consistencyStats.delta
      )}%`
    : ""
}

🔥 Best Streak: ${streakStats.bestStreak} days
🏆 Tasks Done: ${streakStats.completedInRange}/${streakStats.totalInRange}

Habits:
${habitPerformance
  .map(
    (h) =>
      `- ${h.title}: ${h.type === "NUMERIC" ? h.numericProgress : h.score}%`
  )
  .join("\n")}

Generated by GoalCoach.
      `.trim();

      await Share.share({
        message: summary,
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.subtitle}>Your progress & patterns.</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={() => setIsReflectionOpen(true)}
            style={styles.headerBtn}
          >
            <BookOpen size={20} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsAchievementsOpen(true)}
            style={styles.headerBtn}
          >
            <Award size={20} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare}>
            <Share2 size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Filter */}
      <View style={styles.filterSection}>
        <View style={styles.filterTabs}>
          {(["7days", "15days", "30days"] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.filterTab,
                filterMode === m && styles.filterTabActive,
              ]}
              onPress={() => setFilterMode(m)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filterMode === m && styles.filterTabTextActive,
                ]}
              >
                {m === "7days"
                  ? "7 Days"
                  : m === "15days"
                  ? "15 Days"
                  : "30 Days"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stats Cards Row */}
      <View style={styles.statsRow}>
        {/* Consistency Card */}
        <View style={[styles.statCard, { flex: 1.2 }]}>
          <View style={styles.statHeader}>
            <Text style={styles.statLabel}>Consistency</Text>
            <TrendingUp size={16} color={theme.primary} />
          </View>
          <View style={styles.statMain}>
            <Text style={styles.statValue}>{consistencyStats.score}%</Text>

            {consistencyStats.delta !== 0 && (
              <View
                style={[
                  styles.deltaBadge,
                  {
                    backgroundColor:
                      consistencyStats.delta > 0
                        ? theme.primaryContainer
                        : theme.errorContainer,
                  },
                ]}
              >
                {consistencyStats.delta > 0 ? (
                  <ArrowUp size={12} color={theme.onPrimaryContainer} />
                ) : (
                  <ArrowDown size={12} color={theme.onErrorContainer} />
                )}
                <Text
                  style={[
                    styles.deltaText,
                    {
                      color:
                        consistencyStats.delta > 0
                          ? theme.onPrimaryContainer
                          : theme.onErrorContainer,
                    },
                  ]}
                >
                  {Math.abs(consistencyStats.delta)}%
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.statSub}>vs previous {daysInRange} days</Text>
        </View>

        {/* Tasks Completed Card */}
        <View style={[styles.statCard, { flex: 0.8 }]}>
          <View style={styles.statHeader}>
            <Text style={styles.statLabel}>Tasks Done</Text>
            <Trophy size={16} color="#FFC107" />
          </View>
          {(() => {
            const completed = streakStats.completedInRange;
            const total = streakStats.totalInRange;
            const isPartial = total > 0 && completed > 0 && completed < total;
            const valueColor = isPartial ? theme.tertiary : theme.onSurface;

            return (
              <Text style={[styles.statValue, { color: valueColor }]}>
                {completed}
                <Text
                  style={{ fontSize: 16, fontWeight: "400", color: valueColor }}
                >
                  /{total}
                </Text>
              </Text>
            );
          })()}
          <Text style={styles.statSub}>
            🔥 {streakStats.bestStreak} day streak
          </Text>
        </View>
      </View>

      {/* Coach / Insights Section */}
      {(insightText || correlations.length > 0) && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Coach Insights</Text>

          {insightText && (
            <View style={styles.insightBox}>
              <AlertTriangle size={20} color={theme.tertiary} />
              <Text style={styles.insightText}>{insightText}</Text>
            </View>
          )}

          {correlations.map((c, i) => (
            <View key={i} style={styles.insightBox}>
              <TrendingUp size={20} color={theme.secondary} />
              <Text style={styles.insightText}>{c}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Habit Performance (Categories/Breakdown replacement) */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Performance by Habit</Text>
        {habitPerformance.length === 0 ? (
          <Text style={styles.emptyText}>No data for this period.</Text>
        ) : (
          habitPerformance.map((h) => {
            const isNum = h.type === AgendaType.NUMERIC;
            // Use numeric progress for numeric goals, consistency score for habits
            const displayPercent = isNum ? h.numericProgress : h.score;
            const barColor =
              displayPercent >= 80
                ? theme.primary
                : displayPercent >= 50
                ? theme.secondary
                : theme.error;

            return (
              <View key={h.id} style={styles.habitRow}>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <Text style={styles.habitTitle}>{h.title}</Text>
                    <Text style={styles.habitPercent}>{displayPercent}%</Text>
                  </View>

                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(displayPercent, 100)}%`,
                          backgroundColor: barColor,
                        },
                      ]}
                    />
                  </View>

                  {isNum && (
                    <Text style={styles.habitMeta}>Target completion rate</Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.sectionContainer}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 12,
          }}
        >
          <Text style={styles.sectionTitle}>History Log</Text>
          <Text
            style={{
              fontSize: 12,
              color: theme.onSurfaceVariant,
              fontStyle: "italic",
            }}
          >
            Tap a day to details
          </Text>
        </View>
        <View style={styles.calendarContainer}>
          <Calendar
            current={getLocalDateString(new Date())}
            onDayPress={onDayPress}
            markingType="multi-dot"
            markedDates={(() => {
              const marks: any = {};
              rangeTasks.forEach((t) => {
                if (!marks[t.scheduledDate])
                  marks[t.scheduledDate] = { dots: [] };

                let color = theme.surfaceVariant;
                if (t.status === TaskStatus.COMPLETED) color = theme.primary;
                else if (t.status === TaskStatus.FAILED) color = theme.error;
                else if (t.status === TaskStatus.SKIPPED_WITH_BUFFER)
                  color = theme.bufferBorder;

                if (t.status !== TaskStatus.PENDING) {
                  marks[t.scheduledDate].dots.push({ key: t.id, color: color });
                }
              });

              // Also mark selected day
              if (selectedDate) {
                marks[selectedDate] = {
                  ...marks[selectedDate],
                  selected: true,
                  selectedColor: theme.primaryContainer,
                };
              }

              return marks;
            })()}
            theme={{
              backgroundColor: "transparent",
              calendarBackground: "transparent",
              textSectionTitleColor: theme.onSurfaceVariant,
              dayTextColor: theme.onSurface,
              todayTextColor: theme.primary,
              arrowColor: theme.primary,
              monthTextColor: theme.onSurface,
            }}
          />
        </View>
      </View>

      {/* Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDate ? new Date(selectedDate).toDateString() : ""}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={theme.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              {getDayDetails().length === 0 ? (
                <Text style={styles.emptyText}>No activity recorded.</Text>
              ) : (
                getDayDetails().map((t) => (
                  <View key={t.id} style={styles.detailRow}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            t.status === TaskStatus.COMPLETED
                              ? theme.primary
                              : t.status === TaskStatus.FAILED
                              ? theme.error
                              : theme.surfaceVariant,
                        },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailTitle}>
                        {agendas.find((a) => a.id === t.agendaId)?.title ||
                          "Unknown Task"}
                      </Text>
                      {t.note ? (
                        <Text style={styles.detailNote}>Note: {t.note}</Text>
                      ) : null}
                      {t.actualVal > 0 &&
                        agendas.find((a) => a.id === t.agendaId)?.type ===
                          AgendaType.NUMERIC && (
                          <Text style={styles.detailMeta}>
                            Recorded: {t.actualVal}
                          </Text>
                        )}
                    </View>
                    {t.status === TaskStatus.COMPLETED && (
                      <Check size={16} color={theme.primary} />
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Achievements Modal */}
      <AchievementsModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
        tasks={tasks}
        agendas={agendas}
      />

      {/* Weekly Reflection Modal */}
      <WeeklyReflectionModal
        isOpen={isReflectionOpen}
        onClose={() => setIsReflectionOpen(false)}
        tasks={tasks}
        agendas={agendas}
      />
    </ScrollView>
  );
};

const getStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      padding: 16,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    headerBtn: {
      padding: 8,
      backgroundColor: theme.primaryContainer + "40",
      borderRadius: 10,
    },
    title: {
      fontSize: 32,
      color: theme.onSurface,
      fontWeight: "bold",
    },
    subtitle: {
      fontSize: 14,
      color: theme.onSurfaceVariant,
    },
    filterSection: {
      marginBottom: 24,
    },
    filterTabs: {
      flexDirection: "row",
      backgroundColor: theme.surfaceContainer,
      borderRadius: 12,
      padding: 4,
      marginBottom: 12,
    },
    filterTab: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      borderRadius: 8,
    },
    filterTabActive: {
      backgroundColor: theme.primaryContainer,
    },
    filterTabText: {
      fontSize: 14,
      color: theme.onSurfaceVariant,
      fontWeight: "500",
    },
    filterTabTextActive: {
      color: theme.onPrimaryContainer,
      fontWeight: "bold",
    },
    dateRangeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    dateBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.surfaceContainerHigh,
      borderRadius: 8,
    },
    dateBtnText: {
      color: theme.onSurface,
      fontSize: 14,
    },
    statsRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 24,
    },
    statCard: {
      backgroundColor: theme.surfaceContainer,
      borderRadius: 16,
      padding: 16,
    },
    statHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    statLabel: {
      fontSize: 12,
      color: theme.onSurfaceVariant,
      fontWeight: "600",
    },
    statMain: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
      marginBottom: 4,
    },
    statValue: {
      fontSize: 32,
      fontWeight: "bold",
      color: theme.onSurface,
    },
    statSub: {
      fontSize: 11,
      color: theme.onSurfaceVariant,
    },
    deltaBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 100,
      gap: 2,
    },
    deltaText: {
      fontSize: 11,
      fontWeight: "bold",
    },
    sectionContainer: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      color: theme.onSurface,
      fontWeight: "bold",
      marginBottom: 16,
    },
    habitRow: {
      marginBottom: 16,
      backgroundColor: theme.surfaceContainerLow,
      padding: 12,
      borderRadius: 12,
    },
    habitTitle: {
      fontSize: 14,
      color: theme.onSurface,
      fontWeight: "600",
    },
    habitPercent: {
      fontSize: 14,
      color: theme.onSurface,
      fontWeight: "bold",
    },
    habitMeta: {
      fontSize: 10,
      color: theme.onSurfaceVariant,
      marginTop: 4,
    },
    progressBarBg: {
      height: 6,
      backgroundColor: theme.outline + "20",
      borderRadius: 100,
      width: "100%",
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 100,
    },
    calendarContainer: {
      backgroundColor: theme.surfaceContainerLow,
      borderRadius: 16,
      padding: 8,
    },
    emptyText: {
      fontStyle: "italic",
      color: theme.onSurfaceVariant,
    },
    insightBox: {
      flexDirection: "row",
      gap: 12,
      backgroundColor: theme.tertiaryContainer + "40", // transparent tertiary
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
      alignItems: "center",
    },
    insightText: {
      flex: 1,
      fontSize: 13,
      color: theme.onSurface,
      lineHeight: 20,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      height: "60%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.onSurface,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.outline + "20",
    },
    statusDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginTop: 4,
    },
    detailTitle: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.onSurface,
    },
    detailNote: {
      fontSize: 14,
      color: theme.onSurfaceVariant,
      fontStyle: "italic",
      marginTop: 4,
    },
    detailMeta: {
      fontSize: 12,
      color: theme.primary,
      marginTop: 4,
      fontWeight: "500",
    },
  });

export default ReportView;
