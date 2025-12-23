import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import {
  Agenda,
  DailyTask,
  TaskStatus,
  FailureTag,
  AgendaType,
} from "../types";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import {
  Trophy,
  AlertTriangle,
  TrendingUp,
  Calendar as CalendarIcon,
  Check,
} from "lucide-react-native";
import { Calendar, DateData } from "react-native-calendars";
import { getLocalDateString } from "../utils/logic";

interface ReportViewProps {
  tasks: DailyTask[];
  agendas: Agenda[];
}

const ReportView: React.FC<ReportViewProps> = ({ tasks, agendas }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [filter, setFilter] = useState<"week" | "month">("week");
  const [insightText, setInsightText] = useState<string | null>(null);

  const daysToShow = filter === "week" ? 7 : 30;

  const startDateStr = React.useMemo(() => {
    const days = daysToShow;
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - days + 1);
    return getLocalDateString(start);
  }, [filter]);

  // Stats Logic (Memoized)
  const rangeTasks = React.useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.scheduledDate >= startDateStr &&
          agendas.some((a) => a.id === t.agendaId)
      ),
    [tasks, startDateStr, agendas]
  );

  const completedOrFailed = React.useMemo(
    () => rangeTasks.filter((t) => t.status !== TaskStatus.PENDING),
    [rangeTasks]
  );

  const successful = React.useMemo(
    () =>
      completedOrFailed.filter(
        (t) =>
          t.status === TaskStatus.COMPLETED ||
          t.status === TaskStatus.SKIPPED_WITH_BUFFER
      ),
    [completedOrFailed]
  );

  const consistencyScore = React.useMemo(
    () =>
      completedOrFailed.length > 0
        ? Math.round((successful.length / completedOrFailed.length) * 100)
        : 0,
    [completedOrFailed.length, successful.length]
  );

  // Failure Tag Logic (Memoized)
  const topTags = React.useMemo(() => {
    const tagCounts: Record<string, number> = {};
    completedOrFailed.forEach((t) => {
      if (t.failureTag && t.failureTag !== FailureTag.NONE) {
        tagCounts[t.failureTag] = (tagCounts[t.failureTag] || 0) + 1;
      }
    });

    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
  }, [completedOrFailed]);

  // Fetch Neural Insights (RPC)
  useEffect(() => {
    const fetchInsights = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase.rpc(
          "get_insights_failure_by_day",
          {
            p_user_id: user.id,
          }
        );
        if (error) throw error;

        if (data && data.length > 0) {
          const top = data[0]; // Highest count
          setInsightText(
            `Insight: You tend to report '${top.failure_tag}' most often on ${top.day_label}s.`
          );
        }
      } catch (e) {
        console.error("Failed to fetch insights", e);
      }
    };

    // Only fetch if we have failed tasks to analyze, avoiding empty calls
    if (completedOrFailed.length > 0) {
      fetchInsights();
    }
  }, [user, tasks]); // Re-run when tasks change (e.g. new check-in)

  // ... existing existing logic for Stats/Tags

  const getCalendarDays = (daysToGenerate: number) => {
    const days = [];
    const end = new Date();
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(end.getDate() - i);
      days.push(getLocalDateString(d));
    }
    return days;
  };

  const calendarDays = getCalendarDays(daysToShow);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.subtitle}>Your progress.</Text>
        </View>
        <View style={styles.headerIcon}>
          <TrendingUp size={24} color={theme.onTertiaryContainer} />
        </View>
      </View>

      {/* Filter Toggles */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            filter === "week" && styles.filterBtnActive,
          ]}
          onPress={() => setFilter("week")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "week" && styles.filterTextActive,
            ]}
          >
            Last 7 Days
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            filter === "month" && styles.filterBtnActive,
          ]}
          onPress={() => setFilter("month")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "month" && styles.filterTextActive,
            ]}
          >
            Last 30 Days
          </Text>
        </TouchableOpacity>
      </View>

      {/* Score Card */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreHeader}>
          <View>
            <Text style={styles.scoreLabel}>Consistency Score</Text>
            <Text style={styles.scoreValue}>{consistencyScore}%</Text>
          </View>
          <Trophy size={32} color={theme.onPrimaryContainer + "80"} />
        </View>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${consistencyScore}%` },
              ]}
            />
          </View>
          <Text style={styles.scoreMessage}>
            {consistencyScore > 80 ? "Excellent" : "Keep it up"}
          </Text>
        </View>
      </View>

      {/* History Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <CalendarIcon size={16} color={theme.primary} />
          <Text style={styles.sectionTitle}>History</Text>
        </View>

        {agendas.length === 0 ? (
          <Text style={styles.emptyText}>No active goals yet.</Text>
        ) : (
          agendas.map((agenda) => (
            <View key={agenda.id} style={styles.agendaCard}>
              <View style={styles.agendaHeader}>
                <Text style={styles.agendaTitle}>{agenda.title}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {agenda.type === AgendaType.NUMERIC ? "NUM" : "HABIT"}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.dotsGrid,
                  filter === "week" ? styles.dotsFlex : styles.dotsWrap,
                ]}
              >
                {filter === "month" ? (
                  <Calendar
                    current={getLocalDateString(new Date())}
                    key={agenda.id + theme.background} // Force re-render on theme change
                    markingType={"custom"}
                    markedDates={(() => {
                      const marks: any = {};
                      tasks
                        .filter((t) => t.agendaId === agenda.id)
                        .forEach((t) => {
                          let color = theme.surfaceVariant;
                          let textColor = theme.onSurfaceVariant;
                          if (t.status === TaskStatus.COMPLETED) {
                            color = theme.primary;
                            textColor = theme.onPrimary;
                          } else if (t.status === TaskStatus.FAILED) {
                            color = theme.error;
                            textColor = theme.onError;
                          } else if (
                            t.status === TaskStatus.SKIPPED_WITH_BUFFER
                          ) {
                            color = "#FFC107";
                            textColor = "#000";
                          } else if (t.status === TaskStatus.PARTIAL) {
                            color = theme.secondary;
                            textColor = theme.onSecondary;
                          }

                          if (t.status !== TaskStatus.PENDING) {
                            marks[t.scheduledDate] = {
                              customStyles: {
                                container: {
                                  backgroundColor: color,
                                  borderRadius: 8,
                                },
                                text: {
                                  color: textColor,
                                  fontWeight: "bold",
                                },
                              },
                            };
                          }
                        });
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
                      textDayHeaderFontWeight: "600",
                    }}
                    hideExtraDays={true}
                    disableMonthChange={true}
                    hideArrows={true} // Simple specific month view? Or allow navigation?
                    // Mentor asked for "streak view" which usually implies static history
                    // But standard calendar is fine. I'll hide arrows to keep it compact as "Last 30 days" implies static window?
                    // "Last 30 Days" filter usually implies a rolling window, but Calendar is month-based (e.g. December).
                    // Showing the current month is a good approximation for "Monthly Report".
                  />
                ) : (
                  calendarDays.map((dateStr) => {
                    const task = tasks.find(
                      (t) =>
                        t.agendaId === agenda.id && t.scheduledDate === dateStr
                    );
                    const status = task ? task.status : null;

                    let bgColor = theme.surfaceVariant + "80"; // Light gray
                    let textColor = theme.onSurfaceVariant;
                    let content = "";

                    if (status) {
                      switch (status) {
                        case TaskStatus.COMPLETED:
                          bgColor = theme.primary;
                          textColor = theme.onPrimary;
                          break;
                        case TaskStatus.FAILED:
                          bgColor = theme.error;
                          textColor = theme.onError;
                          content = "X";
                          break;
                        case TaskStatus.SKIPPED_WITH_BUFFER:
                          bgColor = "#FFC107"; // Amber
                          textColor = "#000";
                          content = "B";
                          break;
                        case TaskStatus.PARTIAL:
                          bgColor = theme.secondary;
                          textColor = theme.onSecondary;
                          content = "%";
                          break;
                        case TaskStatus.PENDING:
                          bgColor = theme.surfaceVariant;
                          break;
                      }
                    }

                    const dayNum = new Date(dateStr).getDate();

                    return (
                      <View
                        key={dateStr}
                        style={[
                          styles.dot,
                          styles.dotLarge, // Always large in Week view
                          {
                            backgroundColor: bgColor,
                            borderColor: theme.outline,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 12, // Always 12 in Week view
                            color: textColor,
                            fontWeight: "bold",
                          }}
                        >
                          {content}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Blockers Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <AlertTriangle size={16} color={theme.primary} />
          <Text style={styles.sectionTitle}>Blockers & Insights</Text>
        </View>

        {insightText && (
          <View
            style={[
              styles.noBlockersBox,
              { marginBottom: 12, backgroundColor: theme.primaryContainer },
            ]}
          >
            <TrendingUp size={16} color={theme.onPrimaryContainer} />
            <Text
              style={{ color: theme.onPrimaryContainer, flex: 1, fontSize: 13 }}
            >
              {insightText}
            </Text>
          </View>
        )}

        {topTags.length === 0 ? (
          <View style={styles.noBlockersBox}>
            <Check size={16} color={theme.onSecondaryContainer} />
            <Text style={styles.noBlockersText}>
              No failures in this period.
            </Text>
          </View>
        ) : (
          topTags.map(([tag, count]) => (
            <View key={tag} style={styles.blockerRow}>
              <Text style={styles.blockerText}>{tag}</Text>
              <View style={styles.blockerCount}>
                <Text style={styles.blockerCountText}>{count}x</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    title: {
      fontSize: 32,
      color: theme.onSurface,
    },
    subtitle: {
      fontSize: 14,
      color: theme.onSurfaceVariant,
    },
    headerIcon: {
      width: 48,
      height: 48,
      backgroundColor: theme.tertiaryContainer,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    filterContainer: {
      flexDirection: "row",
      backgroundColor: theme.surfaceContainer,
      borderRadius: 100,
      padding: 4,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.outline + "20",
    },
    filterBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      borderRadius: 100,
    },
    filterBtnActive: {
      backgroundColor: theme.secondaryContainer,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    filterText: {
      fontSize: 14,
      color: theme.onSurfaceVariant,
      fontWeight: "500",
    },
    filterTextActive: {
      color: theme.onSecondaryContainer,
    },
    scoreCard: {
      backgroundColor: theme.primaryContainer,
      borderRadius: 24,
      padding: 24,
      marginBottom: 24,
    },
    scoreHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 16,
    },
    scoreLabel: {
      fontSize: 14,
      color: theme.onPrimaryContainer,
      opacity: 0.7,
      fontWeight: "500",
    },
    scoreValue: {
      fontSize: 48,
      color: theme.onPrimaryContainer,
      fontWeight: "400",
      lineHeight: 56,
    },
    progressBarContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    progressBarBg: {
      flex: 1,
      height: 8,
      backgroundColor: theme.onPrimaryContainer + "20",
      borderRadius: 100,
      maxWidth: 150,
    },
    progressBarFill: {
      height: "100%",
      backgroundColor: theme.primary,
      borderRadius: 100,
    },
    scoreMessage: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.onPrimaryContainer,
    },
    sectionContainer: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
      marginLeft: 4,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.primary,
    },
    emptyText: {
      fontStyle: "italic",
      color: theme.onSurfaceVariant,
      marginLeft: 8,
    },
    agendaCard: {
      backgroundColor: theme.surfaceContainerHigh,
      borderRadius: 24,
      padding: 16,
      marginBottom: 12,
    },
    agendaHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    agendaTitle: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.onSurface,
    },
    badge: {
      backgroundColor: theme.surfaceVariant,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: "bold",
      color: theme.onSurfaceVariant,
    },
    dotsGrid: {
      flexDirection: "row",
    },
    dotsFlex: {
      justifyContent: "space-between",
    },
    dotsWrap: {
      flexWrap: "wrap",
      gap: 6,
    },
    dot: {
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 100,
      borderWidth: 1,
      borderColor: "transparent",
    },
    dotLarge: {
      width: 36,
      height: 36,
    },
    dotSmall: {
      width: "13%", // Approx for 7 col grid with gap
      aspectRatio: 1,
    },
    noBlockersBox: {
      backgroundColor: theme.secondaryContainer + "80", // transparent
      padding: 16,
      borderRadius: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    noBlockersText: {
      fontSize: 14,
      color: theme.onSecondaryContainer,
    },
    blockerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.surfaceContainer,
      padding: 12,
      borderRadius: 16,
      marginBottom: 8,
    },
    blockerText: {
      fontSize: 14,
      color: theme.onSurface,
      fontWeight: "500",
    },
    blockerCount: {
      backgroundColor: theme.errorContainer,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 100,
    },
    blockerCountText: {
      fontSize: 12,
      fontWeight: "bold",
      color: theme.onErrorContainer,
    },
  });

export default ReportView;
