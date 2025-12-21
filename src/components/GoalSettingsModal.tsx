import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
} from "react-native";
import { X, Trash2, Save } from "lucide-react-native";
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated";
import { Agenda, AgendaType } from "../types";
import { MD3Colors } from "../theme";

interface GoalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agenda: Agenda | null; // Nullable to handle initial render
  onUpdateAgenda: (id: string, updates: Partial<Agenda>) => void;
  onDeleteAgenda: (id: string) => void;
}

const GoalSettingsModal: React.FC<GoalSettingsModalProps> = ({
  isOpen,
  onClose,
  agenda,
  onUpdateAgenda,
  onDeleteAgenda,
}) => {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (agenda) {
      setTitle(agenda.title);
      setTarget(
        agenda.totalTarget
          ? Math.ceil(agenda.totalTarget / 30).toString()
          : agenda.targetVal
          ? agenda.targetVal.toString()
          : ""
      );
      setIsConfirmingDelete(false);
    }
  }, [agenda]);

  if (!isOpen || !agenda) return null;

  const isNumeric = agenda.type === AgendaType.NUMERIC;

  const handleSave = () => {
    const updates: Partial<Agenda> = { title };
    if (isNumeric && target) {
      // Assuming target is Daily Target
      updates.targetVal = parseInt(target);
      // If totalTarget exists, update it too (approx)
      if (agenda.totalTarget) {
        updates.totalTarget = parseInt(target) * 30;
      }
    }
    onUpdateAgenda(agenda.id, updates);
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
      animationType="none" // We handle animation with Reanimated
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.overlay}
        >
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <Animated.View
              entering={ZoomIn.duration(300).springify()}
              exiting={ZoomOut.duration(200)}
              style={styles.modal}
            >
              <View style={styles.header}>
                <Text style={styles.title}>Goal Settings</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={20} color={MD3Colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              <View style={styles.content}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Goal Name</Text>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    style={styles.input}
                    placeholderTextColor={MD3Colors.outline}
                  />
                </View>

                {isNumeric && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      Daily Target ({agenda.unit})
                    </Text>
                    <TextInput
                      value={target}
                      onChangeText={setTarget}
                      keyboardType="numeric"
                      style={styles.input}
                      placeholderTextColor={MD3Colors.outline}
                    />
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleSave}
                  style={styles.saveBtn}
                  activeOpacity={0.8}
                >
                  <Save size={18} color={MD3Colors.onPrimary} />
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                {!isConfirmingDelete ? (
                  <TouchableOpacity
                    onPress={handleDelete}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={18} color={MD3Colors.error} />
                    <Text style={styles.deleteBtnText}>Delete Goal</Text>
                  </TouchableOpacity>
                ) : (
                  <Animated.View
                    entering={FadeIn.duration(200)}
                    style={styles.confirmContainer}
                  >
                    <TouchableOpacity
                      onPress={() => setIsConfirmingDelete(false)}
                      style={styles.cancelBtn}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleDelete}
                      style={styles.confirmDeleteBtn}
                    >
                      <Text style={styles.confirmDeleteText}>Confirm</Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

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
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    color: MD3Colors.onSurface,
    fontWeight: "400", // M3 prefers simpler weights for headlines
  },
  closeBtn: {
    padding: 8,
    backgroundColor: MD3Colors.surfaceContainerHighest,
    borderRadius: 20,
  },
  content: {
    gap: 16,
  },
  inputContainer: {
    backgroundColor: MD3Colors.surfaceContainerHighest,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: MD3Colors.outline,
  },
  label: {
    fontSize: 12,
    color: MD3Colors.primary,
    fontWeight: "500",
  },
  input: {
    fontSize: 16,
    color: MD3Colors.onSurface,
    paddingVertical: 4,
    height: 48,
  },
  saveBtn: {
    backgroundColor: MD3Colors.primary,
    borderRadius: 100, // Fully rounded
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    elevation: 2,
  },
  saveBtnText: {
    color: MD3Colors.onPrimary,
    fontWeight: "500",
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: MD3Colors.outline + "33", // Low opacity outline
    marginVertical: 4,
  },
  deleteBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    gap: 8,
    opacity: 0.8,
  },
  deleteBtnText: {
    color: MD3Colors.error,
    fontWeight: "500",
    fontSize: 16,
  },
  confirmContainer: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: MD3Colors.surfaceVariant,
    borderRadius: 100,
    alignItems: "center",
  },
  cancelBtnText: {
    color: MD3Colors.onSurfaceVariant,
    fontWeight: "500",
  },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: MD3Colors.error,
    borderRadius: 100,
    alignItems: "center",
    elevation: 2,
  },
  confirmDeleteText: {
    color: MD3Colors.onError,
    fontWeight: "500",
  },
});

export default GoalSettingsModal;
