import React, { useState } from "react";
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
import {
  Trophy,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Check,
} from "lucide-react-native";
import { getLocalDateString } from "../utils/logic";

interface ReportViewProps {
  tasks: DailyTask[];
  agendas: Agenda[];
}

const ReportView: React.FC<ReportViewProps> = ({ tasks, agendas }) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [filter, setFilter] = useState<"week" | "month">("week");

  const daysToShow = filter === "week" ? 7 : 30;
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - daysToShow + 1);
  const startDateStr = getLocalDateString(startDate);

  // Stats Logic
  const rangeTasks = tasks.filter(
    (t) =>
      t.scheduledDate >= startDateStr &&
      agendas.some((a) => a.id === t.agendaId)
  );
  const completedOrFailed = rangeTasks.filter(
    (t) => t.status !== TaskStatus.PENDING
  );
  const successful = completedOrFailed.filter(
    (t) =>
      t.status === TaskStatus.COMPLETED ||
      t.status === TaskStatus.SKIPPED_WITH_BUFFER
  );

  const consistencyScore =
    completedOrFailed.length > 0
      ? Math.round((successful.length / completedOrFailed.length) * 100)
      : 0;

  // Failure Tag Logic
  const tagCounts: Record<string, number> = {};
  completedOrFailed.forEach((t) => {
    if (t.failureTag && t.failureTag !== FailureTag.NONE) {
      tagCounts[t.failureTag] = (tagCounts[t.failureTag] || 0) + 1;
    }
  });
  const topTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

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
          <Calendar size={16} color={theme.primary} />
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
                {calendarDays.map((dateStr) => {
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
                        filter === "week" ? styles.dotLarge : styles.dotSmall,
                        {
                          backgroundColor: bgColor,
                          borderColor: theme.outline,
                        },
                      ]}
                    >
                      {filter === "month" && !content ? (
                        <Text
                          style={{
                            fontSize: 8,
                            color: textColor,
                            opacity: 0.5,
                          }}
                        >
                          {dayNum}
                        </Text>
                      ) : (
                        <Text
                          style={{
                            fontSize: filter === "week" ? 12 : 10,
                            color: textColor,
                            fontWeight: "bold",
                          }}
                        >
                          {content}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Blockers Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <AlertTriangle size={16} color={theme.primary} />
          <Text style={styles.sectionTitle}>Blockers</Text>
        </View>

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
