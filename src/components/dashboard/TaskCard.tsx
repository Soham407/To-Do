import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated as RNAnimated,
} from "react-native";
import {
  Check,
  AlertCircle,
  Shield,
  ArrowRight,
  Settings,
  Flame,
  Calendar as CalendarIcon,
  Clock,
  Square,
  CheckSquare,
} from "lucide-react-native";
import { DailyTask, Agenda, TaskStatus, AgendaType } from "../../types";
import { getLocalDateString } from "../../utils/logic";
import { MD3Theme } from "../../config/theme";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { SPRING_CONFIG } from "../../utils/animations";

interface TaskCardProps {
  task: DailyTask;
  agenda: Agenda;
  streak?: number;
  theme: MD3Theme;
  styles: any;
  onClick: (task: DailyTask) => void;
  onSettingsClick: () => void;
  onToggleStatus: (task: DailyTask) => void;
}

const NumericProgressBar: React.FC<{
  percentage: number;
  status: TaskStatus;
  theme: MD3Theme;
  styles: any;
}> = ({ percentage, status, theme, styles }) => {
  const isFailed = status === TaskStatus.FAILED;
  const barColor = isFailed ? theme.error : theme.primary;
  const animatedWidth = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.timing(animatedWidth, {
      toValue: percentage,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  return (
    <View style={styles.progresBarTrack}>
      <RNAnimated.View
        style={[
          styles.progressBarFill,
          {
            width: animatedWidth.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
            backgroundColor: barColor,
          },
        ]}
      />
    </View>
  );
};

const StreakFlame: React.FC<{ streak: number; theme: MD3Theme }> = ({
  streak,
  theme,
}) => {
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const glowAnim = useRef(new RNAnimated.Value(0.2)).current;
  const warningColor = theme.warning ?? "#FFC107";
  const warningTextColor = theme.warningText ?? "#FF9800";

  useEffect(() => {
    let animation: RNAnimated.CompositeAnimation | null = null;

    if (streak >= 7) {
      // Pulse animation for high streaks
      animation = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.parallel([
            RNAnimated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 1000,
              useNativeDriver: true,
            }),
            RNAnimated.timing(glowAnim, {
              toValue: 0.5,
              duration: 1000,
              useNativeDriver: false,
            }),
          ]),
          RNAnimated.parallel([
            RNAnimated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            RNAnimated.timing(glowAnim, {
              toValue: 0.2,
              duration: 1000,
              useNativeDriver: false,
            }),
          ]),
        ])
      );
      animation.start();
    }

    // Cleanup to prevent memory leak
    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [streak]);

  return (
    <RNAnimated.View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: glowAnim.interpolate({
          inputRange: [0.2, 0.5],
          outputRange: [`${warningColor}20`, `${warningColor}40`],
        }),
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 100,
        transform: [{ scale: pulseAnim }],
      }}
      accessibilityLabel={`${streak} day streak`}
    >
      <Flame size={10} color={warningColor} fill={warningColor} />
      <Text
        style={{
          fontSize: 10,
          color: warningTextColor,
          fontWeight: "bold",
          marginLeft: 2,
        }}
      >
        {streak}
      </Text>
    </RNAnimated.View>
  );
};

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  agenda,
  streak,
  theme,
  styles,
  onClick,
  onSettingsClick,
  onToggleStatus,
}) => {
  const isNumeric = agenda.type === AgendaType.NUMERIC;
  // Guard against division by zero
  const percentage =
    isNumeric && task.targetVal > 0
      ? Math.min((task.actualVal / task.targetVal) * 100, 100)
      : 0;

  let cardBg = theme.surfaceContainerLow;
  let iconBg = "transparent";
  let iconColor = "transparent";

  if (task.status === TaskStatus.COMPLETED) {
    cardBg = theme.surfaceContainerHigh;
    iconBg = theme.primary;
    iconColor = theme.onPrimary;
  } else if (task.status === TaskStatus.FAILED) {
    cardBg = theme.errorContainer;
    iconBg = theme.error;
    iconColor = theme.onError;
  } else if (task.status === TaskStatus.SKIPPED_WITH_BUFFER) {
    cardBg = theme.bufferContainer;
    iconBg = theme.bufferBorder;
    iconColor = theme.onBuffer;
  } else if (task.status === TaskStatus.PARTIAL) {
    cardBg = theme.secondaryContainer;
    iconBg = theme.secondary;
    iconColor = theme.onSecondary;
  }

  const renderIcon = () => {
    if (task.status === TaskStatus.PENDING) return null;
    if (task.status === TaskStatus.PARTIAL)
      return (
        <Text style={{ fontSize: 10, fontWeight: "bold", color: iconColor }}>
          %
        </Text>
      );
    if (task.status === TaskStatus.SKIPPED_WITH_BUFFER)
      return <Shield size={14} color={iconColor} />;
    if (task.status === TaskStatus.FAILED)
      return <AlertCircle size={14} color={iconColor} />;
    return <Check size={14} color={iconColor} strokeWidth={3} />;
  };

  const isOneOff = agenda.type === AgendaType.ONE_OFF;

  // Haptic-enhanced handlers
  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleStatus(task);
  }, [task, onToggleStatus]);

  const handleClick = useCallback(() => {
    Haptics.selectionAsync();
    onClick(task);
  }, [task, onClick]);

  const handleSettingsClick = useCallback(() => {
    Haptics.selectionAsync();
    onSettingsClick();
  }, [onSettingsClick]);

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, SPRING_CONFIG);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING_CONFIG);
  };

  return (
    <TouchableOpacity
      onPress={handleClick}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1} // We handle the visual feedback with scale
      style={[styles.card, { backgroundColor: cardBg }]}
      accessibilityLabel={`Task: ${agenda.title}. Status: ${task.status}`}
      accessibilityRole="button"
      accessibilityState={{ checked: task.status === TaskStatus.COMPLETED }}
    >
      <Animated.View style={[animatedStyle, { flex: 1 }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            {isOneOff ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleToggle();
                }}
                style={{ padding: 12, marginLeft: -8, marginVertical: -8 }}
                accessibilityLabel={
                  task.status === TaskStatus.COMPLETED
                    ? "Mark as incomplete"
                    : "Mark as complete"
                }
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: task.status === TaskStatus.COMPLETED,
                }}
              >
                {task.status === TaskStatus.COMPLETED ? (
                  <CheckSquare size={24} color={theme.primary} />
                ) : (
                  <Square size={24} color={theme.outline} />
                )}
              </TouchableOpacity>
            ) : (
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: iconBg,
                    borderColor:
                      task.status === TaskStatus.PENDING
                        ? theme.outline
                        : "transparent",
                    borderWidth: task.status === TaskStatus.PENDING ? 1 : 0,
                  },
                ]}
              >
                {renderIcon()}
              </View>
            )}

            <View style={{ flex: 1 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Text
                  style={[
                    styles.cardTitle,
                    task.status === TaskStatus.COMPLETED &&
                      styles.textLineThrough,
                    { marginRight: 0 },
                  ]}
                  numberOfLines={1}
                >
                  {agenda.title}
                </Text>
                {streak !== undefined && streak > 2 && (
                  <StreakFlame streak={streak} theme={theme} />
                )}
              </View>
              <Text style={styles.cardSubtitle}>
                {task.scheduledDate !== getLocalDateString() && (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <CalendarIcon
                      size={10}
                      color={theme.onSurfaceVariant}
                      style={{ marginRight: 2 }}
                    />
                    <Text style={{ color: theme.secondary, fontWeight: "500" }}>
                      {(() => {
                        const d = new Date(task.scheduledDate + "T00:00:00");
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        if (task.scheduledDate === getLocalDateString(tomorrow))
                          return "Tomorrow";
                        return d.toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        });
                      })()}
                    </Text>
                    <Text style={{ opacity: 0.8 }}> • </Text>
                  </View>
                )}
                {agenda.reminderTime && (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Clock
                      size={10}
                      color={theme.onSurfaceVariant}
                      style={{ marginRight: 2 }}
                    />
                    <Text style={{ color: theme.primary, fontWeight: "500" }}>
                      {new Date(agenda.reminderTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    <Text style={{ opacity: 0.8 }}> • </Text>
                  </View>
                )}
                {isNumeric
                  ? `${task.targetVal} ${agenda.unit || "units"}`
                  : isOneOff
                  ? "Task"
                  : "Daily habit"}
                {task.mood && (
                  <Text style={{ opacity: 0.8 }}> • {task.mood}</Text>
                )}
              </Text>

              {isOneOff && task.subtasks && task.subtasks.length > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      color: theme.onSurfaceVariant,
                      marginRight: 4,
                    }}
                  >
                    {task.subtasks.filter((s) => s.isCompleted).length}/
                    {task.subtasks.length}
                  </Text>
                  <View
                    style={{
                      height: 4,
                      width: 40,
                      backgroundColor: theme.surfaceVariant,
                      borderRadius: 2,
                    }}
                  >
                    <View
                      style={{
                        height: 4,
                        width: `${
                          (task.subtasks.filter((s) => s.isCompleted).length /
                            task.subtasks.length) *
                          100
                        }%`,
                        backgroundColor: theme.primary,
                        borderRadius: 2,
                      }}
                    />
                  </View>
                </View>
              )}
            </View>
          </View>

          <View style={styles.cardRight}>
            {agenda.priority === "HIGH" && (
              <View
                style={{
                  backgroundColor: theme.errorContainer,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                  position: "absolute",
                  top: 0,
                  right: 32,
                }}
                accessibilityLabel="High priority"
              >
                <Text
                  style={{
                    fontSize: 8,
                    fontWeight: "bold",
                    color: theme.error,
                  }}
                >
                  !
                </Text>
              </View>
            )}
            {agenda.priority === "LOW" && (
              <View
                style={{
                  backgroundColor: theme.tertiaryContainer,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                  position: "absolute",
                  top: 0,
                  right: 32,
                }}
                accessibilityLabel="Low priority"
              >
                <Text
                  style={{
                    fontSize: 8,
                    fontWeight: "bold",
                    color: theme.tertiary,
                  }}
                >
                  ○
                </Text>
              </View>
            )}

            {task.status === TaskStatus.PENDING && (
              <ArrowRight
                size={20}
                color={theme.onSurfaceVariant}
                style={{ opacity: 0.5 }}
              />
            )}
            <TouchableOpacity
              onPress={handleSettingsClick}
              style={styles.settingsBtn}
              accessibilityLabel="Goal settings"
              accessibilityRole="button"
            >
              <Settings
                size={18}
                color={theme.onSurfaceVariant}
                style={{ opacity: 0.5 }}
              />
            </TouchableOpacity>
          </View>

          {task.wasRecalculated && (
            <View style={styles.recalcBadge}>
              <Text style={styles.recalcText}>RECALCULATED</Text>
            </View>
          )}
        </View>

        {isNumeric && task.status !== TaskStatus.PENDING && (
          <View style={{ marginTop: 12, marginLeft: 40 }}>
            <NumericProgressBar
              percentage={percentage}
              status={task.status}
              theme={theme}
              styles={styles}
            />
          </View>
        )}

        {task.note && task.status !== TaskStatus.PENDING && (
          <Text style={styles.noteText}>"{task.note}"</Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default React.memo(TaskCard);
