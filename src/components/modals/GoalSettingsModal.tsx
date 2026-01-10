import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Modal,
  Dimensions,
  ScrollView,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { MD3Theme, Fonts } from "../../config/theme";
import { Agenda, Priority, TaskStatus } from "../../types";
import { X, Trash2, Check, Clock, Flag, Save } from "lucide-react-native";
import { supabase } from "../../api/supabase";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  agenda: Agenda;
  onUpdateAgenda: (updatedAgenda: Agenda) => void;
  onDeleteAgenda: (agendaId: string) => void;
}

const GoalSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  agenda,
  onUpdateAgenda,
  onDeleteAgenda,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const [title, setTitle] = useState(agenda.title);
  const [targetVal, setTargetVal] = useState(agenda.targetVal.toString());
  const [priority, setPriority] = useState<Priority>(agenda.priority);
  const [isActive, setIsActive] = useState(agenda.status === "ACTIVE");

  const handleSave = () => {
    const updated: Agenda = {
      ...agenda,
      title,
      targetVal: parseInt(targetVal) || 1,
      priority,
      status: isActive ? "ACTIVE" : "PAUSED",
    };
    onUpdateAgenda(updated);
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Goal",
      "Are you sure you want to delete this goal? This action cannot be undone.",
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
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Goal Settings</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityLabel="Close settings"
                accessibilityRole="button"
              >
                <X size={24} color={theme.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Goal Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter goal title"
                placeholderTextColor={theme.onSurfaceVariant}
              />
            </View>

            {/* Target Value Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Daily Target</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={targetVal}
                  onChangeText={setTargetVal}
                  keyboardType="numeric"
                />
                <Text style={styles.unitText}>
                  {agenda.unit || "times"} / day
                </Text>
              </View>
            </View>

            {/* Priority Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.priorityRow}>
                {[Priority.LOW, Priority.MEDIUM, Priority.HIGH].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityChip,
                      priority === p && styles.priorityChipActive,
                      priority === p && {
                        borderColor:
                          p === Priority.HIGH
                            ? theme.error
                            : p === Priority.MEDIUM
                            ? theme.tertiary
                            : theme.primary,
                        backgroundColor:
                          p === Priority.HIGH
                            ? theme.errorContainer
                            : p === Priority.MEDIUM
                            ? theme.tertiaryContainer
                            : theme.primaryContainer,
                      },
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Flag
                      size={16}
                      color={
                        priority === p
                          ? p === Priority.HIGH
                            ? theme.onErrorContainer
                            : p === Priority.MEDIUM
                            ? theme.onTertiaryContainer
                            : theme.onPrimaryContainer
                          : theme.onSurfaceVariant
                      }
                    />
                    <Text
                      style={[
                        styles.priorityText,
                        priority === p && {
                          color:
                            p === Priority.HIGH
                              ? theme.onErrorContainer
                              : p === Priority.MEDIUM
                              ? theme.onTertiaryContainer
                              : theme.onPrimaryContainer,
                        },
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Active Switch */}
            <View style={styles.switchRow}>
              <Text style={styles.label}>Active Goal</Text>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{
                  false: theme.surfaceVariant,
                  true: theme.primary,
                }}
                thumbColor={theme.surface}
              />
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <Trash2 size={20} color={theme.error} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
                <Save size={20} color={theme.onPrimary} />
              </TouchableOpacity>
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
      height: 600, // Fixed height
      backgroundColor: theme.surface,
      borderRadius: 28,
      padding: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    scrollContent: {
      paddingBottom: 20,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    headerTitle: {
      fontSize: 22,
      fontFamily: Fonts.bold,
      color: theme.onSurface,
    },
    closeBtn: {
      padding: 4,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontFamily: Fonts.medium,
      color: theme.onSurfaceVariant,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.surfaceContainer,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: Fonts.regular,
      color: theme.onSurface,
      borderWidth: 1,
      borderColor: theme.outline + "40",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    unitText: {
      fontSize: 16,
      fontFamily: Fonts.regular,
      color: theme.onSurfaceVariant,
    },
    priorityRow: {
      flexDirection: "row",
      gap: 8,
    },
    priorityChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.outline + "40",
      backgroundColor: theme.surface,
    },
    priorityChipActive: {
      borderWidth: 1,
    },
    priorityText: {
      fontSize: 14,
      fontFamily: Fonts.medium,
      color: theme.onSurfaceVariant,
    },
    switchRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 32,
    },
    actionRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: "auto",
    },
    deleteBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.errorContainer,
      justifyContent: "center",
      alignItems: "center",
    },
    saveBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.primary,
    },
    saveBtnText: {
      fontSize: 16,
      fontFamily: Fonts.medium,
      color: theme.onPrimary,
    },
  });

export default GoalSettingsModal;
