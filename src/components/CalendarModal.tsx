import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { getLocalDateString } from "../utils/logic";
import { MD3Colors } from "../theme";

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
}

const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
}) => {
  const [viewDate, setViewDate] = useState(() => {
    return selectedDate ? new Date(selectedDate + "T00:00:00") : new Date();
  });

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onSelectDate(getLocalDateString(newDate));
    onClose();
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const todayStr = getLocalDateString(new Date());

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.monthTitle}>
              {viewDate.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </Text>
            <View style={styles.navBtns}>
              <TouchableOpacity
                onPress={handlePrevMonth}
                style={styles.iconBtn}
              >
                <ChevronLeft size={20} color={MD3Colors.onSurface} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNextMonth}
                style={styles.iconBtn}
              >
                <ChevronRight size={20} color={MD3Colors.onSurface} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.iconBtn, { marginLeft: 8 }]}
              >
                <X size={20} color={MD3Colors.onSurface} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Days Header */}
          <View style={styles.weekHeader}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <Text key={i} style={styles.weekDayText}>
                {d}
              </Text>
            ))}
          </View>

          {/* Grid */}
          <View style={styles.grid}>
            {days.map((day, idx) => {
              if (day === null) {
                return <View key={`empty-${idx}`} style={styles.dayCell} />;
              }

              const currentDayStr = getLocalDateString(
                new Date(year, month, day)
              );
              const isSelected = currentDayStr === selectedDate;
              const isToday = currentDayStr === todayStr;

              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => handleDayClick(day)}
                  style={[
                    styles.dayCell,
                    isSelected && styles.selectedDay,
                    !isSelected && isToday && styles.todayDay,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.selectedDayText,
                      !isSelected && isToday && styles.todayDayText,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => {
                onSelectDate(todayStr);
                onClose();
              }}
              style={styles.jumpBtn}
            >
              <Text style={styles.jumpBtnText}>Jump to Today</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const CELL_SIZE = 40;
const GAP = 4;
// Calculate width dynamically or fixed. Fixed is easier for now.

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: MD3Colors.surface,
    borderRadius: 28,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: MD3Colors.onSurfaceVariant,
  },
  navBtns: {
    flexDirection: "row",
    gap: 4,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: MD3Colors.surfaceVariant + "44", // slight bg
  },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  weekDayText: {
    width: CELL_SIZE,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "bold",
    color: MD3Colors.onSurfaceVariant,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    // justifyContent: "space-between", // problematic with empty slots at end
    gap: GAP,
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "500",
    color: MD3Colors.onSurface,
  },
  selectedDay: {
    backgroundColor: MD3Colors.primary,
  },
  selectedDayText: {
    color: MD3Colors.onPrimary,
  },
  todayDay: {
    borderWidth: 1,
    borderColor: MD3Colors.primary,
  },
  todayDayText: {
    color: MD3Colors.primary,
  },
  footer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: MD3Colors.outline + "33",
    alignItems: "flex-end",
  },
  jumpBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: MD3Colors.primary + "1A",
    borderRadius: 20,
  },
  jumpBtnText: {
    color: MD3Colors.primary,
    fontWeight: "500",
    fontSize: 14,
  },
});

export default CalendarModal;
