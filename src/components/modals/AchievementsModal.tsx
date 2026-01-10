import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  FlatList,
} from "react-native";
// import { FlashList } from "@shopify/flash-list"; // Removed
import { Trophy, Award, Star, Zap, Flame, X, Lock } from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";
import { Fonts, MD3Theme } from "../../config/theme";
import { DailyTask } from "../../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tasks: DailyTask[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  condition: (tasks: DailyTask[]) => boolean;
  progress: (tasks: DailyTask[]) => number;
  total: number;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_win",
    title: "First Win",
    description: "Complete your first goal",
    icon: Trophy,
    color: "#FFD700", // Gold
    condition: (tasks) => tasks.some((t) => t.status === "COMPLETED"),
    progress: (tasks) => (tasks.some((t) => t.status === "COMPLETED") ? 1 : 0),
    total: 1,
  },
  {
    id: "hat_trick",
    title: "Hat Trick",
    description: "Complete 3 goals in a single day",
    icon: Star,
    color: "#FF6347", // Tomato
    condition: (tasks) => {
      const dayCounts = tasks.reduce((acc, t) => {
        if (t.status === "COMPLETED") {
          acc[t.scheduledDate] = (acc[t.scheduledDate] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      return Object.values(dayCounts).some((count) => count >= 3);
    },
    progress: (tasks) => {
      const dayCounts = tasks.reduce((acc, t) => {
        if (t.status === "COMPLETED") {
          acc[t.scheduledDate] = (acc[t.scheduledDate] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      const max = Math.max(0, ...Object.values(dayCounts));
      return Math.min(max, 3);
    },
    total: 3,
  },
  {
    id: "week_warrior",
    title: "Week Warrior",
    description: "Complete 20 goals in a week",
    icon: Zap,
    color: "#00BFFF", // Deep Sky Blue
    condition: (tasks) =>
      tasks.filter((t) => t.status === "COMPLETED").length >= 20, // Simplified for demo
    progress: (tasks) =>
      Math.min(tasks.filter((t) => t.status === "COMPLETED").length, 20),
    total: 20,
  },
  {
    id: "streak_master",
    title: "Streak Master",
    description: "Maintain a specific goal streak for 7 days",
    icon: Flame,
    color: "#FF4500", // Orange Red
    condition: (tasks) => false, // Placeholder logic
    progress: (tasks) => 0, // Placeholder
    total: 7,
  },
  {
    id: "early_bird",
    title: "Early Bird",
    description: "Complete a goal before 9 AM",
    icon: Award,
    color: "#32CD32", // Lime Green
    condition: (tasks) => false, // Needs timestamp logic
    progress: (tasks) => 0,
    total: 1,
  },
];

const AchievementsModal: React.FC<Props> = ({ isOpen, onClose, tasks }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  // Calculate total points or level based on unlocked achievements
  const unlockedCount = ACHIEVEMENTS.filter((a) => a.condition(tasks)).length;
  const totalCount = ACHIEVEMENTS.length;
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  const renderItem = ({ item }: { item: Achievement }) => {
    const isUnlocked = item.condition(tasks);
    const currentProgress = item.progress(tasks);
    const Icon = item.icon;

    return (
      <View
        style={[
          styles.card,
          !isUnlocked && styles.cardLocked,
          isUnlocked && { borderColor: item.color + "40" },
        ]}
      >
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: isUnlocked
                ? item.color + "20"
                : theme.surfaceContainerHigh,
            },
          ]}
        >
          {isUnlocked ? (
            <Icon size={24} color={item.color} />
          ) : (
            <Lock size={20} color={theme.onSurfaceVariant} />
          )}
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, !isUnlocked && styles.textLocked]}>
            {item.title}
          </Text>
          <Text style={styles.cardDesc}>{item.description}</Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${(currentProgress / item.total) * 100}%`,
                  backgroundColor: isUnlocked
                    ? item.color
                    : theme.onSurfaceVariant,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {currentProgress} / {item.total}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      onRequestClose={onClose}
      transparent={true}
      statusBarTranslucent={true}
    >
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: Dimensions.get("window").width,
          height: Dimensions.get("window").height,
          backgroundColor: theme.surface, // Full screen opaque background
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Trophy size={28} color={theme.primary} />
            <Text style={styles.headerTitle}>Achievements</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityLabel="Close achievements"
            accessibilityRole="button"
          >
            <X size={24} color={theme.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* Level Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerContent}>
            <Text style={styles.levelText}>
              Level {Math.floor(unlockedCount / 2) + 1}
            </Text>
            <Text style={styles.progressSummary}>
              {unlockedCount} of {totalCount} Unlocked
            </Text>
            <View style={styles.mainProgressBarBg}>
              <View
                style={[
                  styles.mainProgressBarFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
          </View>
          <Trophy
            size={80}
            color={theme.primary + "20"}
            style={styles.bgIcon}
          />
        </View>

        <View style={styles.listContainer}>
          <FlatList
            data={ACHIEVEMENTS}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 60, // Safe area
      paddingHorizontal: 20,
      paddingBottom: 20,
      backgroundColor: theme.surface,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerTitle: {
      fontSize: 24,
      fontFamily: Fonts.bold,
      color: theme.onSurface,
    },
    closeBtn: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: theme.surfaceContainer,
    },
    banner: {
      marginHorizontal: 20,
      marginBottom: 20,
      padding: 20,
      borderRadius: 24,
      backgroundColor: theme.primaryContainer,
      overflow: "hidden",
      position: "relative",
    },
    bannerContent: {
      zIndex: 1,
    },
    bgIcon: {
      position: "absolute",
      right: -10,
      bottom: -10,
      transform: [{ rotate: "-15deg" }],
    },
    levelText: {
      fontSize: 32,
      fontFamily: Fonts.bold,
      color: theme.onPrimaryContainer,
      marginBottom: 4,
    },
    progressSummary: {
      fontSize: 14,
      fontFamily: Fonts.medium,
      color: theme.onPrimaryContainer,
      opacity: 0.8,
      marginBottom: 12,
    },
    mainProgressBarBg: {
      height: 8,
      backgroundColor: theme.surface + "40",
      borderRadius: 4,
      width: "100%",
    },
    mainProgressBarFill: {
      height: 100,
      backgroundColor: theme.primary,
      borderRadius: 4,
    },
    listContainer: {
      flex: 1,
      backgroundColor: theme.surfaceContainerLow,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingTop: 8,
    },
    listContent: {
      padding: 20,
      paddingBottom: 40,
    },
    card: {
      flexDirection: "row",
      backgroundColor: theme.surface,
      padding: 16,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.outline + "10",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    cardLocked: {
      opacity: 0.7,
      backgroundColor: theme.surfaceContainerLow,
      borderWidth: 0,
    },
    iconBox: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    cardContent: {
      flex: 1,
      justifyContent: "center",
    },
    cardTitle: {
      fontSize: 16,
      fontFamily: Fonts.bold,
      color: theme.onSurface,
      marginBottom: 4,
    },
    textLocked: {
      color: theme.onSurfaceVariant,
    },
    cardDesc: {
      fontSize: 12,
      fontFamily: Fonts.regular,
      color: theme.onSurfaceVariant,
      marginBottom: 8,
    },
    progressBarBg: {
      height: 4,
      backgroundColor: theme.surfaceContainerHigh,
      borderRadius: 2,
      marginBottom: 4,
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 2,
    },
    progressText: {
      fontSize: 10,
      fontFamily: Fonts.medium,
      color: theme.onSurfaceVariant,
      alignSelf: "flex-end",
    },
  });

export default AchievementsModal;
