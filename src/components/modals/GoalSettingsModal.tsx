import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Modal,
  Dimensions,
  ScrollView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Agenda, AgendaType, DEFAULT_LISTS } from "../../types";
import { useTheme, ThemeType } from "../../context/ThemeContext";
import { MD3Theme, Fonts } from "../../config/theme";
import { X, Trash2, Save } from "lucide-react-native";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  agenda: Agenda | null;
  onUpdateAgenda: (agenda: Agenda) => void;
  onDeleteAgenda: (id: string) => void;
}

const DAYS_IN_MONTH = 30;

const GoalSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  agenda,
  onUpdateAgenda,
  onDeleteAgenda,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [recurrencePattern, setRecurrencePattern] = useState<
    "DAILY" | "WEEKLY" | "WEEKDAYS" | "CUSTOM"
  >("DAILY");
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [reminderTime, setReminderTime] = useState<Date | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const placeholders = [
    "e.g. Daily Meditation",
    "e.g. Read 15 mins",
    "e.g. 50 Pushups",
    "e.g. Learn Spanish",
    "e.g. Drink 3L Water",
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  React.useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Sync state when agenda opens
  React.useEffect(() => {
    if (agenda) {
      setTitle(agenda.title);
      setTarget(
        agenda.targetVal
          ? agenda.targetVal.toString()
          : agenda.totalTarget
          ? Math.ceil(agenda.totalTarget / DAYS_IN_MONTH).toString()
          : ""
      );
      setRecurrencePattern(agenda.recurrencePattern || "DAILY");
      setRecurrenceDays(agenda.recurrenceDays || []);
      setSelectedListId(agenda.listId || null);

      // Determine existing reminder
      if (agenda.reminderTime) {
        if (agenda.reminderTime.includes("T")) {
          setReminderTime(new Date(agenda.reminderTime));
        } else {
          // Legacy support or fallback
          const [h, m] = agenda.reminderTime.split(":").map(Number);
          const d = new Date();
          d.setHours(h, m, 0, 0);
          setReminderTime(d);
        }
      } else {
        setReminderTime(null);
      }
    }
  }, [agenda]);

  if (!isOpen || !agenda) return null;

  const isNumeric = agenda.type === AgendaType.NUMERIC;
  const isOneOff = agenda.type === AgendaType.ONE_OFF;
  const itemLabel = isOneOff ? "Task" : "Goal";

  const handleSave = () => {
    const updates: Agenda = {
      ...agenda,
      title,
      recurrencePattern,
      recurrenceDays:
        recurrencePattern === "CUSTOM" ? recurrenceDays : undefined,
      listId: selectedListId || undefined,
    };

    if (reminderTime) {
      updates.reminderTime = reminderTime.toISOString();
    } else {
      updates.reminderTime = undefined;
    }

    if (isNumeric && target) {
      const trimmedTarget = target.trim();
      if (!/^\d+$/.test(trimmedTarget)) {
        Alert.alert(
          "Invalid Input",
          "Please enter a valid daily target (numbers only)."
        );
        return;
      }
      const newTargetVal = parseInt(trimmedTarget, 10);
      updates.targetVal = newTargetVal;

      // If totalTarget exists, keep it consistent, otherwise initialize it
      if (!updates.totalTarget) {
        updates.totalTarget = newTargetVal * DAYS_IN_MONTH;
      }
    }
    onUpdateAgenda(updates);
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      `Delete ${itemLabel}`,
      `Are you sure you want to delete "${agenda.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            onDeleteAgenda(agenda.id);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={isOpen}
      onRequestClose={onClose}
      animationType="fade"
      transparent={true}
      statusBarTranslucent={true}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalView}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>{itemLabel} Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={theme.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showVerticalScrollIndicator={false}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{itemLabel} Name</Text>
              <TextInput
                style={styles.input}
                value={title}
                placeholder={title ? "" : placeholders[placeholderIndex]}
                placeholderTextColor={theme.onSurfaceVariant + "80"}
                onChangeText={setTitle}
              />
            </View>

            {/* Recurrence Settings (Hidden for One-Off if desired, but let's allow editing for flexibility if user wants to convert) */}
            {!isOneOff && (
              <View style={styles.section}>
                <Text style={styles.label}>Frequency</Text>
                <View style={styles.chipsContainer}>
                  {(["DAILY", "WEEKDAYS", "WEEKLY", "CUSTOM"] as const).map(
                    (p) => (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.chip,
                          recurrencePattern === p && styles.chipSelected,
                        ]}
                        onPress={() => setRecurrencePattern(p)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            recurrencePattern === p && styles.chipTextSelected,
                          ]}
                        >
                          {p === "WEEKDAYS"
                            ? "Mon-Fri"
                            : p.charAt(0) + p.slice(1).toLowerCase()}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>

                {recurrencePattern === "CUSTOM" && (
                  <View style={styles.daysContainer}>
                    {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => {
                      const isSelected = recurrenceDays.includes(idx);
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.dayCircle,
                            isSelected && styles.dayCircleSelected,
                          ]}
                          onPress={() => {
                            if (isSelected) {
                              setRecurrenceDays((prev) =>
                                prev.filter((d) => d !== idx)
                              );
                            } else {
                              setRecurrenceDays((prev) => [...prev, idx]);
                            }
                          }}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              isSelected && styles.dayTextSelected,
                            ]}
                          >
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* List Selector (New) */}
            <View style={styles.section}>
              <Text style={styles.label}>List</Text>
              <View style={styles.chipsContainer}>
                {DEFAULT_LISTS.map((list) => {
                  const isSelected = selectedListId === list.id;
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
                      onPress={() => setSelectedListId(list.id)}
                    >
                      <Text style={{ marginRight: 4 }}>{list.icon}</Text>
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && {
                            color: list.color,
                            fontFamily: Fonts.bold,
                          },
                        ]}
                      >
                        {list.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Reminder Section (Time Picker) */}
            <View style={styles.section}>
              <Text style={styles.label}>Reminder</Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <TouchableOpacity
                  onPress={() => setShowPicker(true)}
                  style={styles.timePickerBtn}
                >
                  <Text style={styles.timePickerText}>
                    {reminderTime
                      ? reminderTime.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Add Reminder"}
                  </Text>
                </TouchableOpacity>

                {reminderTime && (
                  <TouchableOpacity onPress={() => setReminderTime(null)}>
                    <X size={24} color={theme.error} />
                  </TouchableOpacity>
                )}
              </View>

              {showPicker && (
                <DateTimePicker
                  value={reminderTime || new Date()}
                  mode="time"
                  display="default"
                  onChange={(event, date) => {
                    if (Platform.OS === "android") setShowPicker(false);
                    if (event.type === "set" && date) setReminderTime(date);
                  }}
                />
              )}
            </View>

            {isNumeric && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Daily Target ({agenda.unit || "units"})
                </Text>
                <TextInput
                  style={styles.input}
                  value={target}
                  onChangeText={setTarget}
                  keyboardType="numeric"
                />
              </View>
            )}
          </ScrollView>

          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Save size={18} color={theme.onPrimary} />
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteBtnInitial}
          >
            <Trash2 size={18} color={theme.error} />
            <Text style={styles.deleteBtnText}>Delete {itemLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    modalBackdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      width: Dimensions.get("window").width,
      height: Dimensions.get("window").height,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
    },
    modalView: {
      width: 350,
      maxWidth: 500,
      height: 600,
      // maxHeight: "90%", // Removed to avoid Android layout conflict
      backgroundColor: theme.surface,
      borderRadius: 28,
      padding: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      overflow: "hidden", // Ensure border radius clips content
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    headerTitle: {
      fontSize: 22,
      color: theme.onSurface,
    },
    closeBtn: {
      padding: 4,
    },
    inputContainer: {
      backgroundColor: theme.surfaceContainerHighest,
      borderRadius: 12, // top rounded in web, doing all here for safer look
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      marginBottom: 16,
    },
    label: {
      fontSize: 12,
      color: theme.primary,
      fontWeight: "500",
      marginBottom: 4,
    },
    input: {
      fontSize: 16,
      color: theme.onSurface,
      padding: 0,
    },
    section: {
      marginBottom: 16,
    },
    chipsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 4,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.outline + "40",
    },
    chipSelected: {
      backgroundColor: theme.primaryContainer,
      borderColor: theme.primary,
    },
    chipText: {
      fontSize: 12,
      color: theme.onSurfaceVariant,
    },
    chipTextSelected: {
      color: theme.onPrimaryContainer,
      fontWeight: "500",
    },
    daysContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 12,
      paddingHorizontal: 4,
    },
    dayCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.surfaceContainerHighest,
    },
    dayCircleSelected: {
      backgroundColor: theme.primary,
    },
    dayText: {
      fontSize: 12,
      color: theme.onSurface,
    },
    dayTextSelected: {
      color: theme.onPrimary,
      fontWeight: "600",
    },
    saveBtn: {
      backgroundColor: theme.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      borderRadius: 100,
      gap: 8,
      marginTop: 8,
    },
    saveBtnText: {
      color: theme.onPrimary,
      fontWeight: "600",
      fontSize: 16,
    },
    divider: {
      height: 1,
      backgroundColor: theme.outline,
      opacity: 0.2,
      marginVertical: 20,
    },
    deleteBtnInitial: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      borderRadius: 100,
      gap: 8,
      backgroundColor: theme.errorContainer + "40", // transparent look
    },
    deleteBtnText: {
      color: theme.error,
      fontWeight: "600",
    },
    deleteConfirmRow: {
      flexDirection: "row",
      gap: 12,
    },
    cancelDeleteBtn: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: theme.surfaceVariant,
      borderRadius: 100,
    },
    cancelDeleteText: {
      color: theme.onSurfaceVariant,
      fontWeight: "600",
    },
    confirmDeleteBtn: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: theme.error,
      borderRadius: 100,
    },
    confirmDeleteText: {
      color: theme.onError,
      fontWeight: "600",
    },
    timePickerBtn: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.surfaceContainerHighest,
      borderRadius: 12,
      alignItems: "center",
      minWidth: 120,
    },
    timePickerText: {
      fontSize: 16,
      color: theme.primary,
      fontWeight: "500",
    },
  });

export default GoalSettingsModal;
