import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  Button,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Agenda, AgendaType } from "../types";
import { useTheme } from "../context/ThemeContext";
import { X, Trash2, Save } from "lucide-react-native";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  agenda: Agenda | null;
  onUpdateAgenda: (agenda: Agenda) => void;
  onDeleteAgenda: (id: string) => void;
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
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Sync state when agenda opens
  React.useEffect(() => {
    if (agenda) {
      setTitle(agenda.title);
      setTarget(
        agenda.totalTarget ? Math.ceil(agenda.totalTarget / 30).toString() : ""
      );
      setIsConfirmingDelete(false);
    }
  }, [agenda]);

  if (!isOpen || !agenda) return null;

  const isNumeric = agenda.type === AgendaType.NUMERIC;

  const handleSave = () => {
    const updates: Agenda = { ...agenda, title };
    if (isNumeric && target) {
      updates.totalTarget = parseInt(target) * 30; // approx monthly
    }
    onUpdateAgenda(updates);
    onClose();
  };

  const handleDelete = () => {
    if (isConfirmingDelete) {
      onDeleteAgenda(agenda.id);
      onClose();
    } else {
      setIsConfirmingDelete(true);
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Goal Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={theme.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Goal Name</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
            />
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

          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Save size={18} color={theme.onPrimary} />
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {!isConfirmingDelete ? (
            <TouchableOpacity
              onPress={handleDelete}
              style={styles.deleteBtnInitial}
            >
              <Trash2 size={18} color={theme.error} />
              <Text style={styles.deleteBtnText}>Delete Goal</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.deleteConfirmRow}>
              <TouchableOpacity
                onPress={() => setIsConfirmingDelete(false)}
                style={styles.cancelDeleteBtn}
              >
                <Text style={styles.cancelDeleteText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                style={styles.confirmDeleteBtn}
              >
                <Text style={styles.confirmDeleteText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          )}
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
      width: "85%",
      backgroundColor: theme.surface,
      borderRadius: 28,
      padding: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
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
  });

export default GoalSettingsModal;
