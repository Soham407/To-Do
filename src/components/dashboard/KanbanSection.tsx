import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  FadeInDown,
  FadeOutUp,
  Layout as ReanimatedLayout,
} from "react-native-reanimated";
import { ChevronDown } from "lucide-react-native";
import { DailyTask, TaskStatus, Agenda } from "../../types";
import { MD3Theme } from "../../config/theme";
import TaskCard from "./TaskCard";
import { StreakInfo } from "../../utils/insightsLogic";

interface KanbanSectionProps {
  title: string;
  tasks: DailyTask[];
  isExpanded: boolean;
  onToggle: () => void;
  theme: MD3Theme;
  styles: any;
  bg: string;
  color: string;
  agendaMap: Map<string, Agenda>;
  streakMap: Map<string, StreakInfo>;
  onTaskClick: (task: DailyTask) => void;
  onSettingsClick: (agenda: Agenda) => void;
  onToggleStatus: (task: DailyTask) => void;
}

const KanbanSection: React.FC<KanbanSectionProps> = ({
  title,
  tasks,
  isExpanded,
  onToggle,
  theme,
  styles,
  bg,
  color,
  agendaMap,
  streakMap,
  onTaskClick,
  onSettingsClick,
  onToggleStatus,
}) => {
  // Chevron rotation animation
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(isExpanded ? "180deg" : "0deg") }],
  }));

  return (
    <View style={{ marginBottom: 12 }}>
      {/* Accordion Header */}
      <TouchableOpacity
        onPress={onToggle}
        style={[
          styles.columnHeader,
          {
            backgroundColor: bg,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 12,
          },
        ]}
        accessibilityLabel={`${title} section, ${tasks.length} tasks`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Text style={[styles.columnTitle, { color: color }]}>{title}</Text>
          <View style={[styles.countBadge, { backgroundColor: theme.surface }]}>
            <Text style={styles.countText}>{tasks.length}</Text>
          </View>
        </View>
        <Animated.View style={chevronStyle}>
          <ChevronDown size={20} color={color} />
        </Animated.View>
      </TouchableOpacity>

      {/* Accordion Content */}
      {isExpanded && (
        <Animated.View
          entering={FadeInDown.springify().damping(15)}
          exiting={FadeOutUp.springify().damping(15)}
          layout={ReanimatedLayout.springify()}
          style={{ marginTop: 8 }}
        >
          {tasks.length === 0 ? (
            <Text
              style={{
                color: theme.onSurfaceVariant,
                fontStyle: "italic",
                textAlign: "center",
                paddingVertical: 16,
              }}
            >
              No tasks here
            </Text>
          ) : (
            tasks.map((item) => {
              const agenda = agendaMap.get(item.agendaId);
              if (!agenda) return null;
              return (
                <View key={item.id} style={{ marginBottom: 10 }}>
                  <TaskCard
                    task={item}
                    agenda={agenda}
                    streak={streakMap.get(agenda.id)?.current ?? 0}
                    theme={theme}
                    styles={styles}
                    onClick={onTaskClick}
                    onSettingsClick={() => onSettingsClick(agenda)}
                    onToggleStatus={onToggleStatus}
                  />
                </View>
              );
            })
          )}
        </Animated.View>
      )}
    </View>
  );
};

export default KanbanSection;
