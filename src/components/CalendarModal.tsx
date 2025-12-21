import React from "react";
import {
  Modal,
  View,
  Text,
  Button,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { useTheme } from "../context/ThemeContext";
import { X } from "lucide-react-native";

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
}) => {
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  // Calendar Theme Object
  const calendarTheme = {
    backgroundColor: theme.surface,
    calendarBackground: theme.surface,
    textSectionTitleColor: theme.onSurfaceVariant,
    selectedDayBackgroundColor: theme.primary,
    selectedDayTextColor: theme.onPrimary,
    todayTextColor: theme.primary,
    dayTextColor: theme.onSurface,
    textDisabledColor: theme.onSurfaceVariant + "50",
    dotColor: theme.primary,
    selectedDotColor: theme.onPrimary,
    arrowColor: theme.primary,
    monthTextColor: theme.onSurface,
    indicatorColor: theme.primary,
    textDayFontWeight: "300" as const,
    textMonthFontWeight: "bold" as const,
    textDayHeaderFontWeight: "300" as const,
    textDayFontSize: 16,
    textMonthFontSize: 16,
    textDayHeaderFontSize: 16,
  };

  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Date</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={theme.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <Calendar
            current={selectedDate}
            onDayPress={(day: DateData) => {
              onSelectDate(day.dateString);
              onClose();
            }}
            markedDates={{
              [selectedDate]: {
                selected: true,
                disableTouchEvent: true,
                selectedColor: theme.primary,
              },
            }}
            theme={calendarTheme}
            key={isDark ? "dark" : "light"}
          />
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    centeredView: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalView: {
      backgroundColor: theme.surface,
      borderRadius: 28,
      padding: 24,
      width: "85%",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.onSurface,
    },
    closeBtn: {
      padding: 4,
    },
  });

export default CalendarModal;
