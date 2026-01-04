import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Flame, Target, TrendingUp, Trophy } from "lucide-react-native";
import { MD3Theme, Fonts } from "../../config/theme";
import { DailyTask, Agenda, TaskStatus, AgendaType } from "../../types";
import { getLocalDateString } from "../../utils/logic";

interface ProgressOverviewProps {
  tasks: DailyTask[];
  agendas: Agenda[];
  theme: MD3Theme;
}

const ProgressOverview: React.FC<ProgressOverviewProps> = ({
  tasks,
  agendas,
  theme,
}) => {
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const today = getLocalDateString();

  // Calculate today's stats
  const todayTasks = tasks.filter((t) => t.scheduledDate === today);
  const completedToday = todayTasks.filter(
    (t) => t.status === TaskStatus.COMPLETED
  ).length;
  const totalToday = todayTasks.length;
  const completionRate =
    totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  // Calculate current streak
  const calculateStreak = (): number => {
    let streak = 0;
    const sortedDates = [...new Set(tasks.map((t) => t.scheduledDate))]
      .sort()
      .reverse();

    for (const date of sortedDates) {
      if (date > today) continue; // Skip future dates

      const dayTasks = tasks.filter((t) => t.scheduledDate === date);
      const allCompleted = dayTasks.every(
        (t) =>
          t.status === TaskStatus.COMPLETED ||
          t.status === TaskStatus.SKIPPED_WITH_BUFFER
      );

      if (dayTasks.length > 0 && allCompleted) {
        streak++;
      } else if (date < today) {
        break; // Streak broken
      }
    }
    return streak;
  };

  const currentStreak = calculateStreak();

  // Calculate weekly progress
  const getWeeklyProgress = (): number => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = getLocalDateString(weekAgo);

    const weekTasks = tasks.filter(
      (t) => t.scheduledDate >= weekAgoStr && t.scheduledDate <= today
    );
    const weekCompleted = weekTasks.filter(
      (t) => t.status === TaskStatus.COMPLETED
    ).length;

    return weekTasks.length > 0
      ? Math.round((weekCompleted / weekTasks.length) * 100)
      : 0;
  };

  const weeklyProgress = getWeeklyProgress();

  // Count active goals
  const activeGoals = agendas.filter(
    (a) => a.type !== AgendaType.ONE_OFF && (!a.status || a.status === "ACTIVE")
  ).length;

  if (totalToday === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        {/* Today's Progress */}
        <View style={styles.statCard}>
          <View
            style={[styles.iconBg, { backgroundColor: theme.primaryContainer }]}
          >
            <Target size={16} color={theme.primary} />
          </View>
          <Text style={styles.statValue}>
            {completedToday}/{totalToday}
          </Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>

        {/* Current Streak */}
        <View style={styles.statCard}>
          <View
            style={[
              styles.iconBg,
              { backgroundColor: theme.warningContainer ?? "#FFF8E1" },
            ]}
          >
            <Flame size={16} color={theme.warning ?? "#FFC107"} />
          </View>
          <Text style={styles.statValue}>{currentStreak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>

        {/* Weekly Progress */}
        <View style={styles.statCard}>
          <View
            style={[
              styles.iconBg,
              { backgroundColor: theme.secondaryContainer },
            ]}
          >
            <TrendingUp size={16} color={theme.secondary} />
          </View>
          <Text style={styles.statValue}>{weeklyProgress}%</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>

        {/* Active Goals */}
        <View style={styles.statCard}>
          <View
            style={[
              styles.iconBg,
              { backgroundColor: theme.tertiaryContainer },
            ]}
          >
            <Trophy size={16} color={theme.tertiary} />
          </View>
          <Text style={styles.statValue}>{activeGoals}</Text>
          <Text style={styles.statLabel}>Goals</Text>
        </View>
      </View>

      {/* Today's progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${completionRate}%`,
                backgroundColor:
                  completionRate === 100 ? theme.primary : theme.secondary,
              },
            ]}
          />
        </View>
        {completionRate === 100 && (
          <Text style={styles.perfectDay}>🎉 Perfect Day!</Text>
        )}
      </View>
    </View>
  );
};

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.surfaceContainerLow,
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    statCard: {
      alignItems: "center",
      flex: 1,
    },
    iconBg: {
      width: 32,
      height: 32,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 4,
    },
    statValue: {
      fontSize: 16,
      fontFamily: Fonts.bold,
      color: theme.onSurface,
    },
    statLabel: {
      fontSize: 10,
      fontFamily: Fonts.regular,
      color: theme.onSurfaceVariant,
      marginTop: 2,
    },
    progressBarContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    progressTrack: {
      flex: 1,
      height: 6,
      backgroundColor: theme.surfaceVariant,
      borderRadius: 3,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 3,
    },
    perfectDay: {
      fontSize: 12,
      fontFamily: Fonts.medium,
      color: theme.primary,
    },
  });

export default React.memo(ProgressOverview);
