import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import {
  DailyTask,
  Agenda,
  TaskStatus,
  FailureTag,
  AgendaType,
} from "../types";
import { useTheme } from "../context/ThemeContext";
import { X, Check } from "lucide-react-native";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  task: DailyTask | null;
  agenda: Agenda | null;
  onUpdateTask: (
    task: DailyTask,
    strategy?: "TOMORROW" | "SPREAD",
    useBuffer?: boolean
  ) => void;
}

const CheckInModal: React.FC<Props> = ({
  isOpen,
  onClose,
  task,
  agenda,
  onUpdateTask,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [val, setVal] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState<
    "TOMORROW" | "SPREAD" | null
  >(null);
  const [useBuffer, setUseBuffer] = useState(false);
  const [selectedTag, setSelectedTag] = useState<FailureTag>(FailureTag.NONE);

  useEffect(() => {
    if (task) {
      // Start empty if 0 to reduce clutter until user types
      const initialVal =
        task.status === TaskStatus.PENDING && task.actualVal === 0
          ? ""
          : task.actualVal.toString();

      setVal(initialVal);
      setSelectedStrategy(null);
      setUseBuffer(false);
      setSelectedTag(FailureTag.NONE);
    }
  }, [task]);

  if (!task || !agenda) return null;

  const target = task.targetVal || 0;
  const currentVal = parseInt(val) || 0;
  const isShortfall = currentVal < target;
  const missing = target - currentVal;

  const handleSave = () => {
    if (val.trim() === "") {
      Alert.alert("Input Required", "Please enter the amount you achieved.");
      return;
    }

    let status = TaskStatus.COMPLETED;

    if (isShortfall) {
      if (
        agenda.type === AgendaType.NUMERIC &&
        !selectedStrategy &&
        !useBuffer
      ) {
        Alert.alert(
          "Recovery Strategy Required",
          "Since you missed your target, please choose how to handle the remaining amount (Tomorrow or Spread)."
        );
        return;
      }

      if (useBuffer) {
        status = TaskStatus.SKIPPED_WITH_BUFFER;
      } else if (currentVal > 0) {
        status = TaskStatus.PARTIAL;
      } else {
        status = TaskStatus.FAILED;
      }
    }

    const updatedTask: DailyTask = {
      ...task,
      actualVal: currentVal,
      status: status,
      failureTag: isShortfall ? selectedTag : FailureTag.NONE,
    };

    onUpdateTask(
      updatedTask,
      isShortfall && selectedStrategy ? selectedStrategy : undefined,
      useBuffer
    );
    onClose();
  };

  const renderFailureTags = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>What happened?</Text>
      <View style={styles.chipsContainer}>
        {Object.values(FailureTag)
          .filter((t) => t !== FailureTag.NONE)
          .map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.chip,
                  isSelected && {
                    backgroundColor: theme.secondaryContainer,
                    borderColor: theme.secondaryContainer,
                  },
                ]}
                onPress={() => setSelectedTag(tag)}
              >
                {isSelected && (
                  <Check size={14} color={theme.onSecondaryContainer} />
                )}
                <Text
                  style={[
                    styles.chipText,
                    isSelected && { color: theme.onSecondaryContainer },
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
      </View>
    </View>
  );

  const renderRecoveryOptions = () => {
    if (agenda.type === AgendaType.NUMERIC) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Recovery Strategy
            <Text style={{ color: theme.error, fontWeight: "normal" }}>
              {" "}
              — You missed {missing} {agenda.unit}
            </Text>
          </Text>
          <View style={styles.strategyContainer}>
            <TouchableOpacity
              style={[
                styles.cardOption,
                selectedStrategy === "TOMORROW" && styles.cardOptionSelected,
              ]}
              onPress={() => setSelectedStrategy("TOMORROW")}
            >
              <Text
                style={[
                  styles.optionTitle,
                  selectedStrategy === "TOMORROW" && styles.optionTitleSelected,
                ]}
              >
                Add {missing} to Tomorrow
              </Text>
              <Text style={styles.optionSubtitle}>
                Increase tomorrow's target
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.cardOption,
                selectedStrategy === "SPREAD" && styles.cardOptionSelected,
              ]}
              onPress={() => setSelectedStrategy("SPREAD")}
            >
              <Text
                style={[
                  styles.optionTitle,
                  selectedStrategy === "SPREAD" && styles.optionTitleSelected,
                ]}
              >
                Spread over Week
              </Text>
              <Text style={styles.optionSubtitle}>
                Distribute ~{Math.ceil(missing / 6)} per day
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    } else {
      // Boolean type
      if (agenda.bufferTokens > 0) {
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily protection</Text>
            <TouchableOpacity
              style={[
                styles.bufferCard,
                useBuffer && styles.bufferCardSelected,
              ]}
              onPress={() => setUseBuffer(!useBuffer)}
            >
              <View style={styles.tokenIcon}>
                <Text style={{ fontSize: 16 }}>🛡️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bufferTitle}>
                  {useBuffer ? "Token Applied" : "Use Life Token"}
                </Text>
                <Text style={styles.bufferSubtitle}>
                  {agenda.bufferTokens} tokens remaining
                </Text>
              </View>
              {useBuffer && <Check size={20} color={theme.primary} />}
            </TouchableOpacity>
          </View>
        );
      }
    }
    return null;
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
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>{agenda.title}</Text>
                <Text style={styles.subtitle}>
                  Target:{" "}
                  <Text style={{ fontWeight: "bold" }}>
                    {task.targetVal} {agenda.unit || "units"}
                  </Text>
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={24} color={theme.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {/* Input Section */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Actual Achievement</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={val}
                  onChangeText={setVal}
                  placeholder="0"
                  placeholderTextColor={theme.onSurfaceVariant + "80"}
                  autoFocus
                />
                <Text style={styles.unitText}>{agenda.unit || "units"}</Text>
              </View>
            </View>

            {isShortfall && val !== "" && (
              <>
                <View style={styles.divider} />
                {renderFailureTags()}
                {renderRecoveryOptions()}
              </>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save Check-in</Text>
            </TouchableOpacity>
          </View>
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
      width: "90%",
      maxHeight: "85%",
      elevation: 5,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      overflow: "hidden",
    },
    scrollContent: {
      padding: 24,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      color: theme.onSurface,
      fontWeight: "400",
    },
    subtitle: {
      fontSize: 14,
      color: theme.onSurfaceVariant,
      marginTop: 4,
    },
    closeBtn: {
      padding: 4,
      marginTop: -4,
      marginRight: -4,
    },
    inputContainer: {
      marginBottom: 8,
    },
    inputLabel: {
      fontSize: 12,
      color: theme.primary,
      fontWeight: "500",
      marginBottom: 8,
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surfaceContainerHighest,
      borderRadius: 16,
      paddingHorizontal: 16,
      height: 64,
    },
    input: {
      flex: 1,
      fontSize: 24,
      color: theme.onSurface,
      fontWeight: "400",
    },
    unitText: {
      fontSize: 16,
      color: theme.onSurfaceVariant,
      marginLeft: 8,
    },
    divider: {
      height: 1,
      backgroundColor: theme.outline + "20",
      marginVertical: 24,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.onSurface,
      marginBottom: 12,
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
      paddingVertical: 10,
      borderRadius: 100, // Fully rounded for chips
      borderWidth: 1,
      borderColor: theme.outline + "40",
      gap: 8,
    },
    chipText: {
      fontSize: 14,
      color: theme.onSurfaceVariant,
      fontWeight: "500",
    },
    strategyContainer: {
      gap: 12,
    },
    cardOption: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.surfaceContainerLow,
      borderWidth: 1,
      borderColor: "transparent",
    },
    cardOptionSelected: {
      backgroundColor: theme.primaryContainer + "40", // subtle primary
      borderColor: theme.primary,
    },
    optionTitle: {
      fontSize: 16,
      color: theme.onSurface,
      fontWeight: "500",
    },
    optionTitleSelected: {
      color: theme.primary,
    },
    optionSubtitle: {
      fontSize: 12,
      color: theme.onSurfaceVariant,
      marginTop: 4,
    },
    bufferCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderRadius: 16,
      backgroundColor: theme.bufferContainer,
      borderWidth: 1,
      borderColor: "transparent",
      gap: 16,
    },
    bufferCardSelected: {
      borderColor: theme.bufferBorder,
      backgroundColor: theme.bufferContainerSelected,
    },
    tokenIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    bufferTitle: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.onBuffer,
    },
    bufferSubtitle: {
      fontSize: 12,
      color: theme.onBufferVariant,
    },
    footer: {
      padding: 24,
      borderTopWidth: 1,
      borderTopColor: theme.outline + "10",
    },
    saveBtn: {
      backgroundColor: theme.primary,
      borderRadius: 100,
      paddingVertical: 14,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    },
    saveBtnText: {
      fontSize: 16,
      color: theme.onPrimary,
      fontWeight: "600",
    },
  });

export default CheckInModal;
