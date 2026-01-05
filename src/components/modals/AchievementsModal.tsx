import React, { useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import SafeModal from "../common/SafeModal";
import {
  X,
  Trophy,
  Zap,
  Flame,
  Target,
  Star,
  Lock,
  ChevronRight,
} from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";
import { MD3Theme, Fonts } from "../../config/theme";
import { DailyTask, Agenda } from "../../types";
import {
  UserStats,
  Achievement,
  ACHIEVEMENTS,
  buildUserStats,
  getLevelProgress,
  getLevelTitle,
  formatXP,
  checkNewAchievements,
} from "../../utils/gamification";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tasks: DailyTask[];
  agendas: Agenda[];
  savedStats?: Partial<UserStats>;
  onStatsUpdate?: (stats: UserStats) => void;
}

// Animated XP bar component
const XPProgressBar = ({
  progress,
  theme,
}: {
  progress: number;
  theme: MD3Theme;
}) => {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={styles(theme).xpBarTrack}>
      <Animated.View
        style={[
          styles(theme).xpBarFill,
          {
            width: widthAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
};

// Achievement card component
const AchievementCard = ({
  achievement,
  isUnlocked,
  theme,
}: {
  achievement: Achievement;
  isUnlocked: boolean;
  theme: MD3Theme;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Animated.View
      style={[
        styles(theme).achievementCard,
        !isUnlocked && styles(theme).achievementLocked,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <View style={styles(theme).achievementContent}>
          <View
            style={[
              styles(theme).achievementIcon,
              isUnlocked && { backgroundColor: theme.primaryContainer },
            ]}
          >
            {isUnlocked ? (
              <Text style={{ fontSize: 24 }}>{achievement.icon}</Text>
            ) : (
              <Lock size={20} color={theme.onSurfaceVariant + "60"} />
            )}
          </View>
          <View style={styles(theme).achievementInfo}>
            <Text
              style={[
                styles(theme).achievementTitle,
                !isUnlocked && { color: theme.onSurfaceVariant + "80" },
              ]}
            >
              {achievement.title}
            </Text>
            <Text style={styles(theme).achievementDesc}>
              {achievement.description}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Stat box component
const StatBox = ({
  icon,
  value,
  label,
  color,
  theme,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
  theme: MD3Theme;
}) => (
  <View style={styles(theme).statBox}>
    <View style={[styles(theme).statIcon, { backgroundColor: color + "20" }]}>
      {icon}
    </View>
    <Text style={styles(theme).statValue}>{value}</Text>
    <Text style={styles(theme).statLabel}>{label}</Text>
  </View>
);

const AchievementsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  tasks,
  agendas,
  savedStats,
  onStatsUpdate,
}) => {
  const { theme } = useTheme();
  const s = useMemo(() => styles(theme), [theme]);

  // Build current stats
  const stats = useMemo(() => {
    return buildUserStats(tasks, agendas, savedStats);
  }, [tasks, agendas, savedStats]);

  // Check for new achievements
  const unlockedAchievements = useMemo(() => {
    const newlyUnlocked = checkNewAchievements(stats, tasks, agendas);
    // Return all unlocked (existing + new)
    const allUnlockedIds = new Set([
      ...stats.achievements,
      ...newlyUnlocked.map((a) => a.id),
    ]);
    return allUnlockedIds;
  }, [stats, tasks, agendas]);

  // Level progress
  const levelProgress = useMemo(
    () => getLevelProgress(stats.totalXP),
    [stats.totalXP]
  );
  const levelTitle = useMemo(() => getLevelTitle(stats.level), [stats.level]);

  // Group achievements by category
  const groupedAchievements = useMemo(() => {
    const groups: Record<string, Achievement[]> = {
      streak: [],
      completion: [],
      consistency: [],
      special: [],
    };
    ACHIEVEMENTS.forEach((a) => {
      groups[a.category].push(a);
    });
    return groups;
  }, []);

  // Notify parent of stat updates
  useEffect(() => {
    if (onStatsUpdate && isOpen) {
      const updatedStats = {
        ...stats,
        achievements: Array.from(unlockedAchievements),
      };
      onStatsUpdate(updatedStats);
    }
  }, [isOpen, unlockedAchievements]);

  return (
    <SafeModal
      visible={isOpen}
      animationType="slide"
      fullScreen={true}
      onClose={onClose}
    >
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Trophy size={24} color={theme.primary} />
            <Text style={s.headerTitle}>Achievements</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <X size={24} color={theme.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
        >
          {/* Level Card */}
          <View style={s.levelCard}>
            <View style={s.levelHeader}>
              <View style={s.levelBadge}>
                <Text style={s.levelNumber}>{stats.level}</Text>
              </View>
              <View style={s.levelInfo}>
                <Text style={s.levelTitle}>{levelTitle}</Text>
                <Text style={s.xpText}>{formatXP(stats.totalXP)} XP Total</Text>
              </View>
              <View style={s.xpBadge}>
                <Zap size={14} color={theme.primary} />
                <Text style={s.xpBadgeText}>{levelProgress.percentage}%</Text>
              </View>
            </View>
            <View style={s.levelProgressSection}>
              <XPProgressBar
                progress={levelProgress.percentage}
                theme={theme}
              />
              <Text style={s.levelProgressText}>
                {levelProgress.current} / {levelProgress.required} XP to Level{" "}
                {stats.level + 1}
              </Text>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={s.statsGrid}>
            <StatBox
              icon={<Flame size={20} color={theme.error} />}
              value={stats.currentStreak}
              label="Current Streak"
              color={theme.error}
              theme={theme}
            />
            <StatBox
              icon={<Star size={20} color={theme.tertiary} />}
              value={stats.longestStreak}
              label="Best Streak"
              color={theme.tertiary}
              theme={theme}
            />
            <StatBox
              icon={<Target size={20} color={theme.primary} />}
              value={stats.tasksCompleted}
              label="Tasks Done"
              color={theme.primary}
              theme={theme}
            />
            <StatBox
              icon={<Trophy size={20} color={theme.secondary} />}
              value={unlockedAchievements.size}
              label="Achievements"
              color={theme.secondary}
              theme={theme}
            />
          </View>

          {/* Achievement Sections */}
          {Object.entries(groupedAchievements).map(
            ([category, achievements]) => (
              <View key={category} style={s.achievementSection}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>
                    {category === "streak"
                      ? "🔥 Streak Masters"
                      : category === "completion"
                      ? "✅ Task Champions"
                      : category === "consistency"
                      ? "💎 Consistency Kings"
                      : "⭐ Special Badges"}
                  </Text>
                  <Text style={s.sectionCount}>
                    {
                      achievements.filter((a) => unlockedAchievements.has(a.id))
                        .length
                    }
                    /{achievements.length}
                  </Text>
                </View>
                <View style={s.achievementGrid}>
                  {achievements.map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      isUnlocked={unlockedAchievements.has(achievement.id)}
                      theme={theme}
                    />
                  ))}
                </View>
              </View>
            )
          )}

          {/* Motivational Footer */}
          <View style={s.footer}>
            <Text style={s.footerText}>
              🎯 Keep completing tasks to unlock more achievements and level up!
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeModal>
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
    levelCard: {
      backgroundColor: theme.surfaceContainerHigh,
      borderRadius: 24,
      padding: 20,
      marginBottom: 20,
    },
    levelHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    levelBadge: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: theme.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    levelNumber: {
      fontSize: 24,
      fontFamily: Fonts.bold,
      color: theme.onPrimary,
    },
    levelInfo: {
      flex: 1,
      marginLeft: 16,
    },
    levelTitle: {
      fontSize: 20,
      fontFamily: Fonts.bold,
      color: theme.onSurface,
    },
    xpText: {
      fontSize: 14,
      fontFamily: Fonts.regular,
      color: theme.onSurfaceVariant,
      marginTop: 2,
    },
    xpBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: theme.primaryContainer,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    xpBadgeText: {
      fontSize: 14,
      fontFamily: Fonts.bold,
      color: theme.primary,
    },
    levelProgressSection: {
      gap: 8,
    },
    xpBarTrack: {
      height: 12,
      backgroundColor: theme.surfaceVariant,
      borderRadius: 6,
      overflow: "hidden",
    },
    xpBarFill: {
      height: "100%",
      backgroundColor: theme.primary,
      borderRadius: 6,
    },
    levelProgressText: {
      fontSize: 12,
      fontFamily: Fonts.regular,
      color: theme.onSurfaceVariant,
      textAlign: "center",
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 24,
    },
    statBox: {
      width: (SCREEN_WIDTH - 52) / 2,
      backgroundColor: theme.surfaceContainerHigh,
      borderRadius: 16,
      padding: 16,
      alignItems: "center",
    },
    statIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    },
    statValue: {
      fontSize: 24,
      fontFamily: Fonts.bold,
      color: theme.onSurface,
    },
    statLabel: {
      fontSize: 12,
      fontFamily: Fonts.regular,
      color: theme.onSurfaceVariant,
      marginTop: 2,
    },
    achievementSection: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: Fonts.bold,
      color: theme.onSurface,
    },
    sectionCount: {
      fontSize: 14,
      fontFamily: Fonts.medium,
      color: theme.onSurfaceVariant,
    },
    achievementGrid: {
      gap: 10,
    },
    achievementCard: {
      backgroundColor: theme.surfaceContainerHigh,
      borderRadius: 16,
      padding: 12,
    },
    achievementLocked: {
      opacity: 0.6,
      backgroundColor: theme.surfaceContainer,
    },
    achievementContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    achievementIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: theme.surfaceVariant,
      justifyContent: "center",
      alignItems: "center",
    },
    achievementInfo: {
      flex: 1,
      marginLeft: 12,
    },
    achievementTitle: {
      fontSize: 15,
      fontFamily: Fonts.medium,
      color: theme.onSurface,
    },
    achievementDesc: {
      fontSize: 12,
      fontFamily: Fonts.regular,
      color: theme.onSurfaceVariant,
      marginTop: 2,
    },
    footer: {
      backgroundColor: theme.primaryContainer + "40",
      borderRadius: 16,
      padding: 16,
      alignItems: "center",
    },
    footerText: {
      fontSize: 14,
      fontFamily: Fonts.medium,
      color: theme.primary,
      textAlign: "center",
    },
  });

export default AchievementsModal;
