import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Agenda, DailyTask, TaskStatus, FailureTag } from "../types";
import { MD3Colors } from "../theme";
import {
  TrendingUp,
  AlertTriangle,
  Calendar,
  Trophy,
  Check,
} from "lucide-react-native";
import { getLocalDateString } from "../utils/logic";

interface Props {
  agendas: Agenda[];
  tasks: DailyTask[];
}

const ReportView: React.FC<Props> = ({ agendas, tasks }) => {
  const [filter, setFilter] = useState<"week" | "month">("week");

  const daysToShow = filter === "week" ? 7 : 30;
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - daysToShow + 1);
  const startDateStr = getLocalDateString(startDate);

  const rangeTasks = tasks.filter((t) => t.scheduledDate >= startDateStr);
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.title}>Insights</Text>
            <Text style={styles.subtitle}>Your progress.</Text>
          </View>
          <View style={styles.iconContainer}>
            <TrendingUp size={24} color={MD3Colors.onTertiaryContainer} />
          </View>
        </View>

        {/* Segmented Button */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              filter === "week" && styles.segmentBtnActive,
            ]}
            onPress={() => setFilter("week")}
          >
            <Text
              style={[
                styles.segmentText,
                filter === "week" && styles.segmentTextActive,
              ]}
            >
              Last 7 Days
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              filter === "month" && styles.segmentBtnActive,
            ]}
            onPress={() => setFilter("month")}
          >
            <Text
              style={[
                styles.segmentText,
                filter === "month" && styles.segmentTextActive,
              ]}
            >
              Last 30 Days
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Score Card */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreTopRow}>
          <View>
            <Text style={styles.scoreLabel}>Consistency Score</Text>
            <Text style={styles.scoreValue}>{consistencyScore}%</Text>
          </View>
          <Trophy size={32} color={MD3Colors.onPrimaryContainer + "80"} />
        </View>

        <View style={styles.scoreBottomRow}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${consistencyScore}%` },
              ]}
            />
          </View>
          <Text style={styles.scoreComment}>
            {consistencyScore > 80 ? "Excellent" : "Keep it up"}
          </Text>
        </View>
      </View>

      {/* History */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Calendar size={16} color={MD3Colors.primary} />
          <Text style={styles.sectionTitle}>History</Text>
        </View>

        {agendas.length === 0 ? (
          <Text style={styles.emptyText}>No active goals yet.</Text>
        ) : (
          agendas.map((agenda) => {
            const calendarDays = getCalendarDays(daysToShow);
            return (
              <View key={agenda.id} style={styles.historyCard}>
                <View style={styles.historyCardHeader}>
                  <Text style={styles.agendaTitle}>{agenda.title}</Text>
                  <View style={styles.agendaBadge}>
                    <Text style={styles.agendaBadgeText}>
                      {agenda.type === "NUMERIC" ? "NUM" : "HABIT"}
                    </Text>
                  </View>
                </View>

                <View
                  style={filter === "week" ? styles.weekGrid : styles.monthGrid}
                >
                  {calendarDays.map((dateStr) => {
                    const task = tasks.find(
                      (t) =>
                        t.agendaId === agenda.id && t.scheduledDate === dateStr
                    );
                    const status = task ? task.status : null;
                    let bgColor = MD3Colors.surfaceVariant + "80"; // default
                    let borderColor = MD3Colors.outline;
                    let content = null;

                    if (status) {
                      switch (status) {
                        case TaskStatus.COMPLETED:
                          bgColor = MD3Colors.primary;
                          borderColor = MD3Colors.primary;
                          break;
                        case TaskStatus.FAILED:
                          bgColor = MD3Colors.error;
                          borderColor = MD3Colors.error;
                          // content = <X size={10} color={MD3Colors.onError} />;
                          break;
                        case TaskStatus.SKIPPED_WITH_BUFFER:
                          bgColor = MD3Colors.tertiary;
                          borderColor = MD3Colors.tertiary;
                          break;
                        case TaskStatus.PARTIAL:
                          bgColor = MD3Colors.secondary;
                          borderColor = MD3Colors.secondary;
                          break;
                        case TaskStatus.PENDING:
                          bgColor = MD3Colors.surfaceVariant;
                          borderColor = MD3Colors.outline;
                          break;
                      }
                    }

                    return (
                      <View
                        key={dateStr}
                        style={[
                          styles.dayCircle,
                          filter === "month" && styles.dayCircleSmall,
                          {
                            backgroundColor: bgColor,
                            borderColor: borderColor,
                            borderWidth: status ? 0 : 1,
                          },
                        ]}
                      >
                        {/* Optional: Add content based on status for accessibility if needed */}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Blockers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AlertTriangle size={16} color={MD3Colors.primary} />
          <Text style={styles.sectionTitle}>Blockers</Text>
        </View>

        {topTags.length === 0 ? (
          <View style={styles.noBlockersCard}>
            <Check size={16} color={MD3Colors.onSecondaryContainer} />
            <Text style={styles.noBlockersText}>
              No failures in this period.
            </Text>
          </View>
        ) : (
          <View style={styles.blockersList}>
            {topTags.map(([tag, count]) => (
              <View key={tag} style={styles.blockerRow}>
                <Text style={styles.blockerName}>{tag}</Text>
                <View style={styles.blockerCount}>
                  <Text style={styles.blockerCountText}>{count}x</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: MD3Colors.surface,
  },
  header: {
    gap: 16,
    marginBottom: 24,
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 28, // Matches text-3xl
    color: MD3Colors.onSurface,
    fontWeight: "400",
  },
  subtitle: {
    fontSize: 14,
    color: MD3Colors.onSurfaceVariant,
    marginTop: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: MD3Colors.tertiaryContainer,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: MD3Colors.surfaceContainer,
    borderRadius: 100, // Full pill
    padding: 4,
    borderWidth: 1,
    borderColor: MD3Colors.outline + "30",
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 100,
    alignItems: "center",
  },
  segmentBtnActive: {
    backgroundColor: MD3Colors.secondaryContainer,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "500",
    color: MD3Colors.onSurfaceVariant,
  },
  segmentTextActive: {
    fontWeight: "600",
    color: MD3Colors.onSecondaryContainer,
  },
  scoreCard: {
    backgroundColor: MD3Colors.primaryContainer,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    // overflow: "hidden", // masked view not supported directly in RN view without prop
  },
  scoreTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  scoreLabel: {
    fontSize: 14,
    color: MD3Colors.onPrimaryContainer,
    opacity: 0.7,
    fontWeight: "500",
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: "600", // slightly bolder
    color: MD3Colors.onPrimaryContainer,
    letterSpacing: -1,
  },
  scoreBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: MD3Colors.onPrimaryContainer + "1A", // 10% opacity
    borderRadius: 4,
    maxWidth: 120,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: MD3Colors.primary,
    borderRadius: 4,
  },
  scoreComment: {
    fontSize: 12,
    fontWeight: "500",
    color: MD3Colors.onPrimaryContainer,
  },
  section: {
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
    color: MD3Colors.primary,
  },
  emptyText: {
    color: MD3Colors.onSurfaceVariant,
    fontStyle: "italic",
    marginLeft: 8,
  },
  historyCard: {
    backgroundColor: MD3Colors.surfaceContainerHigh,
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
  },
  historyCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  agendaTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: MD3Colors.onSurface,
  },
  agendaBadge: {
    backgroundColor: MD3Colors.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  agendaBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: MD3Colors.onSurfaceVariant,
  },
  weekGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleSmall: {
    width: "12%", // approx for 7 cols
    aspectRatio: 1,
  },
  noBlockersCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    backgroundColor: MD3Colors.secondaryContainer + "80", // 50%
    borderRadius: 16,
  },
  noBlockersText: {
    fontSize: 14,
    color: MD3Colors.onSecondaryContainer,
  },
  blockersList: {
    gap: 8,
  },
  blockerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: MD3Colors.surfaceContainer,
    borderRadius: 16,
  },
  blockerName: {
    fontSize: 14,
    fontWeight: "500",
    color: MD3Colors.onSurface,
  },
  blockerCount: {
    backgroundColor: MD3Colors.errorContainer,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  blockerCountText: {
    fontSize: 12,
    fontWeight: "bold",
    color: MD3Colors.onErrorContainer,
  },
});

export default ReportView;
