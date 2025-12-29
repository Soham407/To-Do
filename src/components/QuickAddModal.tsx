import React, { useState, useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { Priority } from "../types";
import {
  X,
  Calendar as CalendarIcon,
  Flag,
  Check,
  Bell,
  Clock,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getLocalDateString } from "../utils/logic";
import CalendarModal from "./CalendarModal";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (
    title: string,
    dueDate: string,
    priority: Priority,
    reminderTime?: string
  ) => void;
}

const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  onCreateTask,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const [title, setTitle] = useState("");
  const [dateOption, setDateOption] = useState<"Today" | "Tomorrow" | "Pick">(
    "Today"
  );
  const [customDate, setCustomDate] = useState(getLocalDateString());
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [reminderOption, setReminderOption] = useState<
    "None" | "Morning" | "Afternoon" | "Evening" | "Custom"
  >("None");
  const [customTime, setCustomTime] = useState<Date>(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDateOption("Today");
      setPriority(Priority.MEDIUM);
      setReminderOption("None");
      setCustomTime(new Date());
      setCustomDate(getLocalDateString());

      // Spring animation for modal appearance
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();

      // Auto-focus after a short delay to allow modal animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      scaleAnim.setValue(0.9);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!title.trim()) return;

    let finalDate = getLocalDateString();
    if (dateOption === "Tomorrow") {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      finalDate = getLocalDateString(d);
    } else if (dateOption === "Pick") {
      finalDate = customDate;
    }

    let reminderTime: string | undefined = undefined;
    if (reminderOption !== "None") {
      const d = new Date(finalDate); // Start from due date
      if (reminderOption === "Morning") d.setHours(9, 0, 0, 0);
      else if (reminderOption === "Afternoon") d.setHours(13, 0, 0, 0);
      else if (reminderOption === "Evening") d.setHours(18, 0, 0, 0);
      else if (reminderOption === "Custom") {
        d.setHours(customTime.getHours(), customTime.getMinutes(), 0, 0);
      }
      reminderTime = d.toISOString();
    }

    onCreateTask(title, finalDate, priority, reminderTime);
    onClose();
  };

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case Priority.HIGH:
        return theme.error;
      case Priority.MEDIUM:
        return theme.primary; // Or a specific warning color
      case Priority.LOW:
        return theme.tertiary; // Or success/info
      default:
        return theme.outline;
    }
  };

  const placeholders = [
    "What needs to be done?",
    "e.g. Read 10 pages",
    "e.g. Call Mom",
    "e.g. Project Review",
    "e.g. Drink Water",
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[styles.container, { transform: [{ scale: scaleAnim }] }]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>New Task</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={theme.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={title ? "" : placeholders[placeholderIndex]}
              placeholderTextColor={theme.onSurfaceVariant}
              value={title}
              onChangeText={setTitle}
              onSubmitEditing={handleSave}
            />
          </View>

          <View style={styles.optionsRow}>
            {/* Due Date Section */}
            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>Due Date</Text>
              <View style={styles.chipsContainer}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    dateOption === "Today" && {
                      backgroundColor: theme.primaryContainer,
                    },
                  ]}
                  onPress={() => setDateOption("Today")}
                >
                  <Text
                    style={[
                      styles.chipText,
                      dateOption === "Today" && {
                        color: theme.onPrimaryContainer,
                      },
                    ]}
                  >
                    Today
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.chip,
                    dateOption === "Tomorrow" && {
                      backgroundColor: theme.primaryContainer,
                    },
                  ]}
                  onPress={() => setDateOption("Tomorrow")}
                >
                  <Text
                    style={[
                      styles.chipText,
                      dateOption === "Tomorrow" && {
                        color: theme.onPrimaryContainer,
                      },
                    ]}
                  >
                    Tomorrow
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.chip,
                    dateOption === "Pick" && {
                      backgroundColor: theme.primaryContainer,
                    },
                  ]}
                  onPress={() => {
                    setDateOption("Pick");
                    setIsCalendarOpen(true);
                    Keyboard.dismiss();
                  }}
                >
                  <CalendarIcon
                    size={14}
                    color={
                      dateOption === "Pick"
                        ? theme.onPrimaryContainer
                        : theme.onSurfaceVariant
                    }
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      dateOption === "Pick" && {
                        color: theme.onPrimaryContainer,
                      },
                    ]}
                  >
                    {dateOption === "Pick" &&
                    customDate !== getLocalDateString()
                      ? customDate
                      : "Pick Date"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={[styles.optionsRow, { marginTop: 16 }]}>
            {/* Priority Section */}
            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>Priority</Text>
              <View style={styles.chipsContainer}>
                {[Priority.LOW, Priority.MEDIUM, Priority.HIGH].map((p) => {
                  const isSelected = priority === p;
                  const color = getPriorityColor(p);
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.chip,
                        isSelected && {
                          backgroundColor: color + "20",
                          borderColor: color,
                          borderWidth: 1,
                        }, // Light tint
                      ]}
                      onPress={() => setPriority(p)}
                    >
                      {isSelected && (
                        <Flag
                          size={14}
                          color={color}
                          style={{ marginRight: 4 }}
                          fill={color}
                        />
                      )}
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && { color: color, fontWeight: "600" },
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={[styles.optionsRow, { marginTop: 16 }]}>
            {/* Reminder Section (Simplified for MVP: Quick Slots) */}
            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>Due Time / Reminder</Text>
              <View style={styles.chipsContainer}>
                {(
                  ["None", "Morning", "Afternoon", "Evening", "Custom"] as const
                ).map((r) => {
                  const isSelected = reminderOption === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.chip,
                        isSelected && {
                          backgroundColor: theme.secondaryContainer,
                          borderColor: theme.secondary,
                        },
                      ]}
                      onPress={() => {
                        setReminderOption(r);
                        if (r === "Custom") {
                          setShowTimePicker(true);
                        }
                      }}
                    >
                      {r === "Custom" && (
                        <Clock
                          size={14}
                          color={
                            isSelected
                              ? theme.onSecondaryContainer
                              : theme.onSurfaceVariant
                          }
                          style={{ marginRight: 4 }}
                        />
                      )}
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && {
                            color: theme.onSecondaryContainer,
                            fontWeight: "600",
                          },
                        ]}
                      >
                        {r === "Custom" && reminderOption === "Custom"
                          ? customTime.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : r}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {showTimePicker && (
            <DateTimePicker
              value={customTime}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={(event, date) => {
                setShowTimePicker(Platform.OS === "ios");
                if (event.type === "set" && date) {
                  setCustomTime(date);
                  setReminderOption("Custom");
                }
              }}
            />
          )}

          <TouchableOpacity
            style={[styles.saveButton, !title.trim() && styles.disabledButton]}
            onPress={handleSave}
            disabled={!title.trim()}
          >
            <Text style={styles.saveButtonText}>Create Task</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Nested Calendar Modal for date picking */}
      {isCalendarOpen && (
        <CalendarModal
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          selectedDate={customDate}
          onSelectDate={(date) => {
            setCustomDate(date);
            setDateOption("Pick");
            setIsCalendarOpen(false);
            // Re-focus input if needed, or leave as is
          }}
        />
      )}
    </Modal>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end", // Bottom sheet effect
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    container: {
      backgroundColor: theme.surfaceContainerHigh,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 24,
      paddingBottom: Platform.OS === "ios" ? 40 : 24,
      elevation: 20, // Higher than Layout's navBar (8)
      zIndex: 1000,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    title: {
      fontSize: 22,
      fontWeight: "400",
      color: theme.onSurface,
    },
    closeBtn: {
      padding: 4,
    },
    inputContainer: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12, // Taller touch target
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.outline + "40",
    },
    input: {
      fontSize: 18,
      color: theme.onSurface,
      padding: 0,
    },
    optionsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    optionGroup: {
      flex: 1,
    },
    optionLabel: {
      fontSize: 12,
      color: theme.onSurfaceVariant,
      marginBottom: 8,
      fontWeight: "500",
    },
    chipsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.outline + "40",
      backgroundColor: theme.surface,
    },
    chipText: {
      fontSize: 14,
      color: theme.onSurface,
    },
    saveButton: {
      marginTop: 32,
      backgroundColor: theme.primary,
      borderRadius: 100,
      height: 56,
      justifyContent: "center",
      alignItems: "center",
    },
    disabledButton: {
      opacity: 0.5,
    },
    saveButtonText: {
      color: theme.onPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
  });

export default QuickAddModal;
