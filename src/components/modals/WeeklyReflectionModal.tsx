import React, { useState, useMemo, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
} from "react-native";
import {
  X,
  BookOpen,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle,
  XCircle,
  Sparkles,
  Send,
  Clock,
} from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";
import { MD3Theme, Fonts } from "../../config/theme";
import { DailyTask, Agenda, TaskStatus, FailureTag } from "../../types";
import { getLocalDateString } from "../../utils/logic";
import { supabase } from "../../api/supabase";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tasks: DailyTask[];
  agendas: Agenda[];
}

interface WeekData {
  startDate: Date;
  endDate: Date;
  tasks: DailyTask[];
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
  perfectDays: number;
  failureTags: Record<string, number>;
  moodAverage: number | null;
  bestDay: string | null;
  worstDay: string | null;
}

// Reflection prompts
const REFLECTION_PROMPTS = [
  "What went well this week?",
  "What could have been better?",
  "What will you focus on next week?",
  "Any patterns you noticed?",
];

// Get week boundaries
const getWeekBoundaries = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

// Format date range
const formatDateRange = (start: Date, end: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  return `${start.toLocaleDateString(
    "en-US",
    options
  )} - ${end.toLocaleDateString("en-US", options)}`;
};

// Build week data
const buildWeekData = (
  tasks: DailyTask[],
  startDate: Date,
  endDate: Date
): WeekData => {
  const startStr = getLocalDateString(startDate);
  const endStr = getLocalDateString(endDate);

  const weekTasks = tasks.filter(
    (t) => t.scheduledDate >= startStr && t.scheduledDate <= endStr
  );

  const completedTasks = weekTasks.filter(
    (t) =>
      t.status === TaskStatus.COMPLETED ||
      t.status === TaskStatus.SKIPPED_WITH_BUFFER
  ).length;

  const nonPendingTasks = weekTasks.filter(
    (t) => t.status !== TaskStatus.PENDING
  );
  const completionRate =
    nonPendingTasks.length > 0
      ? Math.round((completedTasks / nonPendingTasks.length) * 100)
      : 0;

  // Count perfect days
  const dayStats = new Map<string, { total: number; completed: number }>();
  weekTasks.forEach((t) => {
    if (t.status === TaskStatus.PENDING) return;
    const stats = dayStats.get(t.scheduledDate) || { total: 0, completed: 0 };
    stats.total++;
    if (t.status === TaskStatus.COMPLETED) stats.completed++;
    dayStats.set(t.scheduledDate, stats);
  });

  let perfectDays = 0;
  let bestDay: string | null = null;
  let bestDayRate = 0;
  let worstDay: string | null = null;
  let worstDayRate = 100;

  dayStats.forEach((stats, date) => {
    const rate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
    if (stats.total > 0 && stats.completed === stats.total) {
      perfectDays++;
    }
    if (rate > bestDayRate) {
      bestDayRate = rate;
      bestDay = date;
    }
    if (rate < worstDayRate && stats.total > 0) {
      worstDayRate = rate;
      worstDay = date;
    }
  });

  // Count failure tags
  const failureTags: Record<string, number> = {};
  weekTasks.forEach((t) => {
    if (t.failureTag && t.failureTag !== FailureTag.NONE) {
      failureTags[t.failureTag] = (failureTags[t.failureTag] || 0) + 1;
    }
  });

  return {
    startDate,
    endDate,
    tasks: weekTasks,
    completionRate,
    totalTasks: nonPendingTasks.length,
    completedTasks,
    perfectDays,
    failureTags,
    moodAverage: null,
    bestDay,
    worstDay,
  };
};

// Day name helper
const getDayName = (dateStr: string): string => {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { weekday: "short" });
};

const WeeklyReflectionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  tasks,
  agendas,
}) => {
  const { theme } = useTheme();
  const s = useMemo(() => styles(theme), [theme]);

  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [reflectionText, setReflectionText] = useState("");
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [activePrompt, setActivePrompt] = useState(0);

  // Calculate current week data
  const weekData = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() + currentWeekOffset * 7);
    const { start, end } = getWeekBoundaries(now);
    return buildWeekData(tasks, start, end);
  }, [tasks, currentWeekOffset]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentWeekOffset(0);
      setReflectionText("");
      setAiInsight(null);
      setActivePrompt(0);
    }
  }, [isOpen]);

  // Navigate weeks
  const goToPreviousWeek = () => setCurrentWeekOffset((prev) => prev - 1);
  const goToNextWeek = () => {
    if (currentWeekOffset < 0) setCurrentWeekOffset((prev) => prev + 1);
  };

  // Get AI insight
  const getAIInsight = async () => {
    setIsLoadingInsight(true);
    setAiInsight(null);

    try {
      const context = {
        weekStats: {
          completionRate: weekData.completionRate,
          totalTasks: weekData.totalTasks,
          perfectDays: weekData.perfectDays,
        },
        failureTags: Object.entries(weekData.failureTags)
          .map(([tag, count]) => `${tag}: ${count}`)
          .join(", "),
        reflection: reflectionText,
      };

      const { data, error } = await supabase.functions.invoke("coach-advice", {
        body: {
          messages: [
            {
              role: "user",
              content: `Give me a brief weekly insight based on my progress. Completion rate: ${
                weekData.completionRate
              }%, ${
                weekData.perfectDays
              } perfect days out of 7, main challenges: ${
                context.failureTags || "none reported"
              }. ${
                reflectionText ? `My reflection: "${reflectionText}"` : ""
              } Keep it 2-3 sentences, warm and actionable.`,
            },
          ],
          context,
        },
      });

      if (error) throw error;
      setAiInsight(data?.message || "Keep up the great work! 🌟");
    } catch (error) {
      if (__DEV__) console.error("AI Insight error:", error);
      setAiInsight(
        "You're making progress! Remember, consistency beats perfection. 💪"
      );
    } finally {
      setIsLoadingInsight(false);
    }
  };

  // Render day mini-chart
  const renderDayChart = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayData: Record<string, { completed: number; total: number }> = {};

    // Initialize days
    const startDate = new Date(weekData.startDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = getLocalDateString(d);
      dayData[dateStr] = { completed: 0, total: 0 };
    }

    // Populate with task data
    weekData.tasks.forEach((t) => {
      if (t.status === TaskStatus.PENDING) return;
      if (dayData[t.scheduledDate]) {
        dayData[t.scheduledDate].total++;
        if (t.status === TaskStatus.COMPLETED) {
          dayData[t.scheduledDate].completed++;
        }
      }
    });

    return (
      <View style={s.dayChart}>
        {Object.entries(dayData).map(([date, stats], index) => {
          const rate = stats.total > 0 ? stats.completed / stats.total : 0;
          const isPerfect = stats.total > 0 && stats.completed === stats.total;
          const isEmpty = stats.total === 0;

          return (
            <View key={date} style={s.dayColumn}>
              <View
                style={[
                  s.dayBar,
                  {
                    height: isEmpty ? 4 : Math.max(8, rate * 60),
                    backgroundColor: isPerfect
                      ? theme.primary
                      : isEmpty
                      ? theme.outline + "30"
                      : theme.primaryContainer,
                  },
                ]}
              />
              <Text style={s.dayLabel}>{days[index]}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  // Render failure tags breakdown
  const renderFailureTags = () => {
    const entries = Object.entries(weekData.failureTags);
    if (entries.length === 0) {
      return (
        <Text style={s.noDataText}>No challenges reported this week! 🎉</Text>
      );
    }

    return (
      <View style={s.tagsContainer}>
        {entries.map(([tag, count]) => (
          <View key={tag} style={s.tagChip}>
            <Text style={s.tagText}>
              {tag}: {count}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <BookOpen size={24} color={theme.primary} />
            <Text style={s.headerTitle}>Weekly Reflection</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <X size={24} color={theme.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
        >
          {/* Week Navigator */}
          <View style={s.weekNav}>
            <TouchableOpacity
              onPress={goToPreviousWeek}
              style={s.navBtn}
              accessibilityLabel="Go to previous week"
              accessibilityRole="button"
            >
              <ChevronLeft size={24} color={theme.onSurface} />
            </TouchableOpacity>
            <View style={s.weekInfo}>
              <Calendar size={16} color={theme.primary} />
              <Text style={s.weekRange}>
                {formatDateRange(weekData.startDate, weekData.endDate)}
              </Text>
              {currentWeekOffset === 0 && (
                <View style={s.currentBadge}>
                  <Text style={s.currentBadgeText}>This Week</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={goToNextWeek}
              style={s.navBtn}
              disabled={currentWeekOffset >= 0}
              accessibilityLabel="Go to next week"
              accessibilityRole="button"
              accessibilityState={{ disabled: currentWeekOffset >= 0 }}
            >
              <ChevronRight
                size={24}
                color={
                  currentWeekOffset >= 0
                    ? theme.onSurfaceVariant + "40"
                    : theme.onSurface
                }
              />
            </TouchableOpacity>
          </View>

          {/* Summary Card */}
          <View style={s.summaryCard}>
            <View style={s.summaryHeader}>
              <Text style={s.summaryTitle}>Week at a Glance</Text>
              <View
                style={[
                  s.rateBadge,
                  {
                    backgroundColor:
                      weekData.completionRate >= 80
                        ? theme.primary + "20"
                        : weekData.completionRate >= 50
                        ? theme.bufferContainer
                        : theme.errorContainer,
                  },
                ]}
              >
                {weekData.completionRate >= 50 ? (
                  <TrendingUp
                    size={14}
                    color={
                      weekData.completionRate >= 80
                        ? theme.primary
                        : theme.bufferBorder
                    }
                  />
                ) : (
                  <TrendingDown size={14} color={theme.error} />
                )}
                <Text
                  style={[
                    s.rateBadgeText,
                    {
                      color:
                        weekData.completionRate >= 80
                          ? theme.primary
                          : weekData.completionRate >= 50
                          ? theme.bufferBorder
                          : theme.error,
                    },
                  ]}
                >
                  {weekData.completionRate}%
                </Text>
              </View>
            </View>

            <View style={s.statsRow}>
              <View style={s.statItem}>
                <Text style={s.statValue}>{weekData.completedTasks}</Text>
                <Text style={s.statLabel}>Completed</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statValue}>{weekData.totalTasks}</Text>
                <Text style={s.statLabel}>Total Tasks</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statValue}>{weekData.perfectDays}</Text>
                <Text style={s.statLabel}>Perfect Days</Text>
              </View>
            </View>

            {/* Day Chart */}
            <View style={s.chartSection}>
              <Text style={s.chartTitle}>Daily Breakdown</Text>
              {renderDayChart()}
            </View>
          </View>

          {/* Challenges Section */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>This Week's Challenges</Text>
            {renderFailureTags()}
          </View>

          {/* AI Insight Section */}
          <View style={s.insightCard}>
            <View style={s.insightHeader}>
              <Sparkles size={18} color={theme.primary} />
              <Text style={s.insightTitle}>AI Coach Insight</Text>
            </View>
            {aiInsight ? (
              <Text style={s.insightText}>{aiInsight}</Text>
            ) : isLoadingInsight ? (
              <View style={s.loadingContainer}>
                <Clock size={20} color={theme.onSurfaceVariant} />
                <Text style={s.loadingText}>Generating insight...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={s.getInsightBtn}
                onPress={getAIInsight}
                accessibilityLabel="Get AI Coach insight for this week"
                accessibilityRole="button"
              >
                <Sparkles size={16} color={theme.onPrimary} />
                <Text style={s.getInsightBtnText}>Get AI Insight</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Reflection Prompts */}
          <View style={s.reflectionSection}>
            <Text style={s.sectionTitle}>Reflect & Plan</Text>
            <View style={s.promptTabs}>
              {REFLECTION_PROMPTS.map((prompt, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    s.promptTab,
                    activePrompt === index && s.promptTabActive,
                  ]}
                  onPress={() => setActivePrompt(index)}
                >
                  <Text
                    style={[
                      s.promptTabText,
                      activePrompt === index && s.promptTabTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {prompt.replace("?", "")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.promptQuestion}>
              {REFLECTION_PROMPTS[activePrompt]}
            </Text>
            <TextInput
              style={s.reflectionInput}
              placeholder="Write your thoughts..."
              placeholderTextColor={theme.onSurfaceVariant + "80"}
              multiline
              textAlignVertical="top"
              value={reflectionText}
              onChangeText={setReflectionText}
              accessibilityLabel={`Reflection: ${REFLECTION_PROMPTS[activePrompt]}`}
              accessibilityHint="Write your weekly reflection here"
            />
          </View>

          {/* Motivational Footer */}
          <View style={s.footer}>
            <Text style={s.footerEmoji}>
              {weekData.completionRate >= 80
                ? "🌟"
                : weekData.completionRate >= 50
                ? "💪"
                : "🌱"}
            </Text>
            <Text style={s.footerText}>
              {weekData.completionRate >= 80
                ? "Outstanding week! You're crushing it!"
                : weekData.completionRate >= 50
                ? "Good progress! Keep building momentum."
                : "Every step counts. You've got this!"}
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 50,
      paddingBottom: 16,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.outline + "20",
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerTitle: {
      fontSize: 22,
      fontFamily: Fonts.bold,
      color: theme.onSurface,
    },
    closeBtn: {
      padding: 8,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    weekNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    navBtn: {
      padding: 8,
    },
    weekInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    weekRange: {
      fontSize: 16,
      fontFamily: Fonts.medium,
      color: theme.onSurface,
    },
    currentBadge: {
      backgroundColor: theme.primaryContainer,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    currentBadgeText: {
      fontSize: 10,
      fontFamily: Fonts.bold,
      color: theme.primary,
    },
    summaryCard: {
      backgroundColor: theme.surfaceContainerHigh,
      borderRadius: 24,
      padding: 20,
      marginBottom: 20,
    },
    summaryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    summaryTitle: {
      fontSize: 18,
      fontFamily: Fonts.bold,
      color: theme.onSurface,
    },
    rateBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
    },
    rateBadgeText: {
      fontSize: 14,
      fontFamily: Fonts.bold,
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: 20,
    },
    statItem: {
      alignItems: "center",
    },
    statValue: {
      fontSize: 28,
      fontFamily: Fonts.bold,
      color: theme.onSurface,
    },
    statLabel: {
      fontSize: 12,
      fontFamily: Fonts.regular,
      color: theme.onSurfaceVariant,
      marginTop: 4,
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.outline + "30",
    },
    chartSection: {
      borderTopWidth: 1,
      borderTopColor: theme.outline + "20",
      paddingTop: 16,
    },
    chartTitle: {
      fontSize: 14,
      fontFamily: Fonts.medium,
      color: theme.onSurfaceVariant,
      marginBottom: 12,
    },
    dayChart: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "flex-end",
      height: 80,
    },
    dayColumn: {
      alignItems: "center",
      width: 36,
    },
    dayBar: {
      width: 24,
      borderRadius: 4,
      marginBottom: 8,
    },
    dayLabel: {
      fontSize: 10,
      fontFamily: Fonts.medium,
      color: theme.onSurfaceVariant,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: Fonts.bold,
      color: theme.onSurface,
      marginBottom: 12,
    },
    tagsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    tagChip: {
      backgroundColor: theme.errorContainer + "60",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
    },
    tagText: {
      fontSize: 13,
      fontFamily: Fonts.medium,
      color: theme.error,
    },
    noDataText: {
      fontSize: 14,
      fontFamily: Fonts.regular,
      color: theme.onSurfaceVariant,
      fontStyle: "italic",
    },
    insightCard: {
      backgroundColor: theme.primaryContainer + "30",
      borderRadius: 20,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.primary + "30",
    },
    insightHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    insightTitle: {
      fontSize: 14,
      fontFamily: Fonts.bold,
      color: theme.primary,
    },
    insightText: {
      fontSize: 14,
      fontFamily: Fonts.regular,
      color: theme.onSurface,
      lineHeight: 22,
    },
    loadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    loadingText: {
      fontSize: 14,
      fontFamily: Fonts.regular,
      color: theme.onSurfaceVariant,
    },
    getInsightBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: theme.primary,
      paddingVertical: 12,
      borderRadius: 12,
    },
    getInsightBtnText: {
      fontSize: 14,
      fontFamily: Fonts.medium,
      color: theme.onPrimary,
    },
    reflectionSection: {
      marginBottom: 20,
    },
    promptTabs: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 12,
    },
    promptTab: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderRadius: 8,
      backgroundColor: theme.surfaceContainer,
      alignItems: "center",
    },
    promptTabActive: {
      backgroundColor: theme.primaryContainer,
    },
    promptTabText: {
      fontSize: 10,
      fontFamily: Fonts.medium,
      color: theme.onSurfaceVariant,
      textAlign: "center",
    },
    promptTabTextActive: {
      color: theme.primary,
    },
    promptQuestion: {
      fontSize: 16,
      fontFamily: Fonts.medium,
      color: theme.onSurface,
      marginBottom: 12,
    },
    reflectionInput: {
      backgroundColor: theme.surfaceContainerHigh,
      borderRadius: 16,
      padding: 16,
      minHeight: 120,
      fontSize: 14,
      fontFamily: Fonts.regular,
      color: theme.onSurface,
      borderWidth: 1,
      borderColor: theme.outline + "20",
    },
    footer: {
      alignItems: "center",
      padding: 20,
    },
    footerEmoji: {
      fontSize: 32,
      marginBottom: 8,
    },
    footerText: {
      fontSize: 14,
      fontFamily: Fonts.medium,
      color: theme.onSurfaceVariant,
      textAlign: "center",
    },
  });

export default WeeklyReflectionModal;
