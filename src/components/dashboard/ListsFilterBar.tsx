import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { List, DEFAULT_LISTS } from "../../types";
import { MD3Theme, Fonts } from "../../config/theme";
import { Hash } from "lucide-react-native";

interface ListsFilterBarProps {
  lists: List[];
  selectedListId: string | null;
  onSelectList: (listId: string | null) => void;
  theme: MD3Theme;
  goalCounts: Record<string, number>; // listId -> count of goals
}

const ListsFilterBar: React.FC<ListsFilterBarProps> = ({
  lists,
  selectedListId,
  onSelectList,
  theme,
  goalCounts,
}) => {
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const allLists = lists.length > 0 ? lists : DEFAULT_LISTS;
  const totalGoals = Object.values(goalCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* All Goals Chip */}
        <TouchableOpacity
          style={[styles.chip, selectedListId === null && styles.chipActive]}
          onPress={() => onSelectList(null)}
          accessibilityLabel="Show all goals"
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedListId === null }}
        >
          <Hash
            size={14}
            color={
              selectedListId === null
                ? theme.onPrimaryContainer
                : theme.onSurfaceVariant
            }
          />
          <Text
            style={[
              styles.chipText,
              selectedListId === null && styles.chipTextActive,
            ]}
          >
            All
          </Text>
          {totalGoals > 0 && (
            <View
              style={[
                styles.badge,
                selectedListId === null && styles.badgeActive,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  selectedListId === null && styles.badgeTextActive,
                ]}
              >
                {totalGoals}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* List Chips */}
        {allLists.map((list) => {
          const isSelected = selectedListId === list.id;
          const count = goalCounts[list.id] || 0;

          return (
            <TouchableOpacity
              key={list.id}
              style={[
                styles.chip,
                isSelected && {
                  backgroundColor: list.color + "20",
                  borderColor: list.color,
                },
              ]}
              onPress={() => onSelectList(list.id)}
              accessibilityLabel={`Filter by ${list.name}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={styles.chipIcon}>{list.icon}</Text>
              <Text
                style={[styles.chipText, isSelected && { color: list.color }]}
              >
                {list.name}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.badge,
                    isSelected && { backgroundColor: list.color + "30" },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      isSelected && { color: list.color },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      marginBottom: 12,
    },
    scrollContent: {
      paddingHorizontal: 4,
      gap: 8,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 100,
      backgroundColor: theme.surfaceContainer,
      borderWidth: 1,
      borderColor: "transparent",
      gap: 6,
    },
    chipActive: {
      backgroundColor: theme.primaryContainer,
      borderColor: theme.primary,
    },
    chipIcon: {
      fontSize: 14,
    },
    chipText: {
      fontSize: 13,
      fontFamily: Fonts.medium,
      color: theme.onSurfaceVariant,
    },
    chipTextActive: {
      color: theme.onPrimaryContainer,
    },
    badge: {
      backgroundColor: theme.surfaceVariant,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 100,
      minWidth: 20,
      alignItems: "center",
    },
    badgeActive: {
      backgroundColor: theme.primary + "30",
    },
    badgeText: {
      fontSize: 10,
      fontFamily: Fonts.bold,
      color: theme.onSurfaceVariant,
    },
    badgeTextActive: {
      color: theme.primary,
    },
  });

export default React.memo(ListsFilterBar);
