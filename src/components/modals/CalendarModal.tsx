import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
} from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { useTheme } from "../../context/ThemeContext";
import { X, ChevronLeft, ChevronRight } from "lucide-react-native";
import { Fonts, MD3Theme } from "../../config/theme";
import { DailyTask, TaskStatus } from "../../types";
import { getLocalDateString } from "../../utils/logic";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tasks: DailyTask[];
  onSelectDate: (date: string) => void;
  selectedDate: string;
}

const CalendarModal: React.FC<Props> = ({
  isOpen,
  onClose,
  tasks,
  onSelectDate,
  selectedDate,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  // Generate marked dates for the calendar
  const markedDates = useMemo(() => {
    const marks: any = {};
    const taskMap: Record<string, DailyTask[]> = {};

    tasks.forEach((t) => {
      if (!taskMap[t.scheduledDate]) {
        taskMap[t.scheduledDate] = [];
      }
      taskMap[t.scheduledDate].push(t);
    });

    Object.keys(taskMap).forEach((date) => {
      const dayTasks = taskMap[date];
      const allCompleted = dayTasks.every(
        (t) => t.status === TaskStatus.COMPLETED
      );
      const someCompleted = dayTasks.some(
        (t) => t.status === TaskStatus.COMPLETED
      );

      if (allCompleted) {
        marks[date] = {
          selected: true,
          selectedColor: theme.primary,
          dotColor: theme.onPrimary,
        };
      } else if (someCompleted) {
        marks[date] = {
          selected: true,
          selectedColor: theme.secondaryContainer,
          selectedTextColor: theme.onSecondaryContainer,
        };
      } else {
        marks[date] = {
          marked: true,
          dotColor: theme.onSurfaceVariant,
        };
      }
    });

    // Mark currently selected date
    marks[selectedDate] = {
      ...(marks[selectedDate] || {}),
      selected: true,
      selectedColor: theme.primaryContainer,
      selectedTextColor: theme.onPrimaryContainer,
    };

    return marks;
  }, [tasks, theme, selectedDate]);

  return (
    <Modal
      visible={isOpen}
      animationType="fade"
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
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 9999,
        }}
      >
        <View style={styles.modalView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Calendar</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityLabel="Close calendar"
                accessibilityRole="button"
              >
                <X size={24} color={theme.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <Calendar
              current={selectedDate}
              onDayPress={(day: DateData) => {
                onSelectDate(day.dateString);
                onClose();
              }}
              monthFormat={"MMMM yyyy"}
              hideExtraDays={true}
              firstDay={1}
              onMonthChange={(month: DateData) => {
                // Potential future handling
              }}
              renderArrow={(direction: "left" | "right") => {
                if (direction === "left")
                  return (
                    <ChevronLeft size={24} color={theme.onSurfaceVariant} />
                  );
                return (
                  <ChevronRight size={24} color={theme.onSurfaceVariant} />
                );
              }}
              markedDates={markedDates}
              theme={{
                calendarBackground: theme.surface,
                textSectionTitleColor: theme.onSurfaceVariant,
                selectedDayBackgroundColor: theme.primary,
                selectedDayTextColor: theme.onPrimary,
                todayTextColor: theme.primary,
                dayTextColor: theme.onSurface,
                textDisabledColor: theme.outline,
                dotColor: theme.primary,
                selectedDotColor: theme.onPrimary,
                arrowColor: theme.onSurface,
                monthTextColor: theme.onSurface,
                indicatorColor: theme.primary,
                textDayFontFamily: Fonts.regular,
                textMonthFontFamily: Fonts.bold,
                textDayHeaderFontFamily: Fonts.medium,
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14,
              }}
              style={styles.calendar}
            />

            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View
                  style={[styles.dot, { backgroundColor: theme.primary }]}
                />
                <Text style={styles.legendText}>All Done</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: theme.secondaryContainer },
                  ]}
                />
                <Text style={styles.legendText}>Some Done</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.dot, { backgroundColor: theme.onSurface }]}
                />
                <Text style={styles.legendText}>Pending</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    modalView: {
      width: 350,
      maxWidth: 500,
      backgroundColor: theme.surface,
      borderRadius: 28,
      padding: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    scrollContent: {
      paddingBottom: 8,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    headerTitle: {
      fontSize: 22,
      fontFamily: Fonts.bold,
      color: theme.onSurface,
    },
    closeBtn: {
      padding: 4,
    },
    calendar: {
      borderRadius: 12,
      marginBottom: 16,
    },
    legend: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: 8,
      paddingHorizontal: 16,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 12,
      fontFamily: Fonts.medium,
      color: theme.onSurfaceVariant,
    },
  });

export default CalendarModal;
