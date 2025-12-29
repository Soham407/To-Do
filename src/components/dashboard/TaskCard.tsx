import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
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
import { MD3Theme } from "../../theme";

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

  return (
    <View style={styles.progresBarTrack}>
      <View
        style={[
          styles.progressBarFill,
          { width: `${percentage}%`, backgroundColor: barColor },
        ]}
      />
    </View>
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
  const percentage = isNumeric
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

  return (
    <TouchableOpacity
      onPress={() => onClick(task)}
      style={[styles.card, { backgroundColor: cardBg }]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          {isOneOff ? (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onToggleStatus(task);
              }}
              style={{ padding: 4, marginLeft: -4 }}
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
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#FFC10720",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 100,
                  }}
                >
                  <Flame size={10} color="#FFC107" fill="#FFC107" />
                  <Text
                    style={{
                      fontSize: 10,
                      color: "#FF9800",
                      fontWeight: "bold",
                      marginLeft: 2,
                    }}
                  >
                    {streak}
                  </Text>
                </View>
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
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: theme.error,
                position: "absolute",
                top: 4,
                right: 32,
              }}
            />
          )}
          {agenda.priority === "LOW" && (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: theme.tertiary,
                position: "absolute",
                top: 4,
                right: 32,
              }}
            />
          )}

          {task.status === TaskStatus.PENDING && (
            <ArrowRight
              size={20}
              color={theme.onSurfaceVariant}
              style={{ opacity: 0.5 }}
            />
          )}
          <TouchableOpacity
            onPress={onSettingsClick}
            style={styles.settingsBtn}
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
    </TouchableOpacity>
  );
};

export default React.memo(TaskCard);
