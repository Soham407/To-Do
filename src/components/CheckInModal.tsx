import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
} from "react-native";
import {
  Agenda,
  DailyTask,
  TaskStatus,
  FailureTag,
  AgendaType,
} from "../types";
import {
  X,
  CheckCircle,
  RefreshCw,
  Shield,
  FileText,
  ChevronRight,
} from "lucide-react-native";
import { MD3Colors } from "../theme";

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

type Mood = "😢" | "😕" | "😐" | "🙂" | "🤩";

const CheckInModal: React.FC<Props> = ({
  isOpen,
  onClose,
  task,
  agenda,
  onUpdateTask,
}) => {
  const [step, setStep] = useState<
    "INPUT" | "FAILURE_TAG" | "RECOVERY" | "MOOD"
  >("INPUT");
  const [inputVal, setInputVal] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<FailureTag | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<{
    status: TaskStatus;
    strategy?: "TOMORROW" | "SPREAD";
    useBuffer?: boolean;
  } | null>(null);

  const [mood, setMood] = useState<Mood | null>(null);
  const [note, setNote] = useState<string>("");
  const [showNoteInput, setShowNoteInput] = useState(false);

  useEffect(() => {
    if (task) {
      setInputVal(task.actualVal ? task.actualVal.toString() : "");
      setStep("INPUT");
      setMood(null);
      setNote("");
      setShowNoteInput(false);
      setSelectedTag(null);
      setPendingUpdate(null);
    }
  }, [task]);

  if (!isOpen || !task || !agenda) return null;

  const isNumeric = agenda.type === AgendaType.NUMERIC;
  const target = task.targetVal;

  const handleNext = () => {
    const val = inputVal === "" ? 0 : Number(inputVal);
    if (val >= target) {
      setPendingUpdate({ status: TaskStatus.COMPLETED });
      setStep("MOOD");
      return;
    }
    setStep("FAILURE_TAG");
  };

  const handleTagSelect = (tag: FailureTag) => {
    setSelectedTag(tag);
    setStep("RECOVERY");
  };

  const handleRecovery = (
    action: "BUFFER" | "FAIL" | "RECALC_TOMORROW" | "RECALC_SPREAD"
  ) => {
    if (action === "BUFFER") {
      setPendingUpdate({
        status: TaskStatus.SKIPPED_WITH_BUFFER,
        useBuffer: true,
      });
    } else if (action === "FAIL") {
      setPendingUpdate({ status: TaskStatus.FAILED });
    } else if (action === "RECALC_TOMORROW") {
      setPendingUpdate({ status: TaskStatus.PARTIAL, strategy: "TOMORROW" });
    } else if (action === "RECALC_SPREAD") {
      setPendingUpdate({ status: TaskStatus.PARTIAL, strategy: "SPREAD" });
    }
    setStep("MOOD");
  };

  const handleFinalSubmit = () => {
    if (!pendingUpdate) return;
    const val = inputVal === "" ? 0 : Number(inputVal);
    const updatedTask: DailyTask = {
      ...task,
      actualVal: val,
      failureTag: selectedTag || FailureTag.NONE,
      mood: mood || undefined,
      note: note || undefined,
      status: pendingUpdate.status,
    };
    onUpdateTask(updatedTask, pendingUpdate.strategy, pendingUpdate.useBuffer);
    onClose();
  };

  const renderInputStep = () => (
    <View style={styles.stepContainer}>
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <Text style={styles.heading}>{agenda.title}</Text>
        <Text style={styles.subtext}>
          Target: {target} {agenda.unit || "units"}
        </Text>
      </View>

      {isNumeric ? (
        <View style={{ alignItems: "center", marginVertical: 20 }}>
          <TextInput
            value={inputVal}
            onChangeText={setInputVal}
            keyboardType="numeric"
            autoFocus
            style={styles.numericInput}
            placeholder="0"
            placeholderTextColor={MD3Colors.outline}
          />
          <Text style={styles.unitText}>{agenda.unit || "units"} done</Text>
        </View>
      ) : (
        <View
          style={{
            flexDirection: "row",
            gap: 16,
            justifyContent: "center",
            marginVertical: 20,
          }}
        >
          <TouchableOpacity
            onPress={() => setInputVal("0")}
            style={[
              styles.boolBtn,
              inputVal === "0"
                ? {
                    backgroundColor: MD3Colors.errorContainer,
                    borderColor: MD3Colors.error,
                  }
                : {},
            ]}
          >
            <X
              size={32}
              color={
                inputVal === "0"
                  ? MD3Colors.onErrorContainer
                  : MD3Colors.outline
              }
            />
            <Text
              style={[
                styles.boolText,
                inputVal === "0" ? { color: MD3Colors.onErrorContainer } : {},
              ]}
            >
              Missed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setInputVal("1")}
            style={[
              styles.boolBtn,
              inputVal === "1"
                ? {
                    backgroundColor: MD3Colors.primaryContainer,
                    borderColor: MD3Colors.primary,
                  }
                : {},
            ]}
          >
            <CheckCircle
              size={32}
              color={
                inputVal === "1"
                  ? MD3Colors.onPrimaryContainer
                  : MD3Colors.outline
              }
            />
            <Text
              style={[
                styles.boolText,
                inputVal === "1" ? { color: MD3Colors.onPrimaryContainer } : {},
              ]}
            >
              Done
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity onPress={handleNext} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTagStep = () => (
    <View style={styles.stepContainer}>
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <Text style={styles.heading}>What happened?</Text>
        <Text style={styles.subtext}>Categorize to find patterns.</Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {Object.values(FailureTag)
          .filter((t) => t !== "NONE")
          .map((tag) => (
            <TouchableOpacity
              key={tag}
              onPress={() => handleTagSelect(tag)}
              style={styles.tagBtn}
            >
              <Text style={styles.tagText}>{tag}</Text>
            </TouchableOpacity>
          ))}
      </View>
    </View>
  );

  const renderRecoveryStep = () => {
    if (!isNumeric) {
      const hasBuffer = agenda.bufferTokens > 0;
      return (
        <View style={styles.stepContainer}>
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <View style={styles.iconCircle}>
              <Shield size={24} color={MD3Colors.onTertiaryContainer} />
            </View>
            <Text style={styles.heading}>Use a Buffer?</Text>
            <Text style={styles.subtext}>
              {agenda.bufferTokens} tokens remaining.
            </Text>
          </View>

          {hasBuffer ? (
            <TouchableOpacity
              onPress={() => handleRecovery("BUFFER")}
              style={[
                styles.primaryBtn,
                { backgroundColor: MD3Colors.tertiary },
              ]}
            >
              <Text style={styles.primaryBtnText}>Use Token (Keep Streak)</Text>
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.msgBox,
                { backgroundColor: MD3Colors.errorContainer },
              ]}
            >
              <Text style={{ color: MD3Colors.onErrorContainer }}>
                No tokens remaining.
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={() => handleRecovery("FAIL")}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>Accept Break</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const missing = target - (Number(inputVal) || 0);
    return (
      <View style={styles.stepContainer}>
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: MD3Colors.secondaryContainer },
            ]}
          >
            <RefreshCw size={24} color={MD3Colors.onSecondaryContainer} />
          </View>
          <Text style={styles.heading}>
            Recalculate {missing} {agenda.unit}?
          </Text>
          <Text style={styles.subtext}>Flexible consistency.</Text>
        </View>

        <TouchableOpacity
          onPress={() => handleRecovery("RECALC_TOMORROW")}
          style={[
            styles.primaryBtn,
            { backgroundColor: MD3Colors.secondaryContainer },
          ]}
        >
          <Text
            style={{ color: MD3Colors.onSecondaryContainer, fontWeight: "600" }}
          >
            Add {missing} to Tomorrow
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleRecovery("RECALC_SPREAD")}
          style={[
            styles.primaryBtn,
            { backgroundColor: MD3Colors.secondary, marginTop: 10 },
          ]}
        >
          <Text style={styles.primaryBtnText}>Spread over remaining days</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMoodStep = () => (
    <View style={styles.stepContainer}>
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <Text style={styles.heading}>How did you feel?</Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        {(["😢", "😕", "😐", "🙂", "🤩"] as Mood[]).map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => setMood(m)}
            style={[
              styles.moodBtn,
              mood === m ? { backgroundColor: MD3Colors.primaryContainer } : {},
            ]}
          >
            <Text style={{ fontSize: 24 }}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!showNoteInput ? (
        <TouchableOpacity
          onPress={() => setShowNoteInput(true)}
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            padding: 10,
          }}
        >
          <FileText size={16} color={MD3Colors.primary} />
          <Text style={{ color: MD3Colors.primary, fontWeight: "500" }}>
            Add a note (optional)
          </Text>
        </TouchableOpacity>
      ) : (
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Any context?"
          style={styles.noteInput}
          multiline
        />
      )}

      <TouchableOpacity
        onPress={handleFinalSubmit}
        disabled={!mood}
        style={[
          styles.primaryBtn,
          !mood
            ? { backgroundColor: MD3Colors.surfaceVariant, opacity: 0.5 }
            : {},
        ]}
      >
        <Text
          style={[
            styles.primaryBtnText,
            !mood ? { color: MD3Colors.onSurfaceVariant } : {},
          ]}
        >
          Finish
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.closeBtnContainer}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={MD3Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            {step === "INPUT" && renderInputStep()}
            {step === "FAILURE_TAG" && renderTagStep()}
            {step === "RECOVERY" && renderRecoveryStep()}
            {step === "MOOD" && renderMoodStep()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end", // Bottom sheet style
  },
  modal: {
    backgroundColor: MD3Colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    minHeight: 400,
    maxHeight: "85%",
  },
  closeBtnContainer: {
    alignItems: "flex-end",
    marginBottom: 10,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: MD3Colors.surfaceVariant,
    borderRadius: 20,
  },
  stepContainer: {
    paddingVertical: 10,
  },
  heading: {
    fontSize: 24,
    color: MD3Colors.onSurface,
    textAlign: "center",
  },
  subtext: {
    fontSize: 14,
    color: MD3Colors.onSurfaceVariant,
    marginTop: 4,
    textAlign: "center",
  },
  numericInput: {
    fontSize: 48,
    color: MD3Colors.onSurface,
    textAlign: "center",
    borderBottomWidth: 1,
    borderBottomColor: MD3Colors.outline,
    width: 200,
  },
  unitText: {
    marginTop: 8,
    color: MD3Colors.onSurfaceVariant,
  },
  boolBtn: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MD3Colors.outline + "33", // opacity
    alignItems: "center",
    gap: 8,
  },
  boolText: {
    fontSize: 14,
    fontWeight: "500",
    color: MD3Colors.onSurfaceVariant,
  },
  primaryBtn: {
    backgroundColor: MD3Colors.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 20,
  },
  primaryBtnText: {
    color: MD3Colors.onPrimary,
    fontWeight: "600",
    fontSize: 16,
  },
  tagBtn: {
    width: "48%",
    padding: 16,
    backgroundColor: MD3Colors.surfaceContainer,
    borderRadius: 16,
    marginBottom: 8,
  },
  tagText: {
    color: MD3Colors.onSurface,
    fontWeight: "500",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: MD3Colors.tertiaryContainer,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  msgBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  secondaryBtn: {
    marginTop: 10,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: MD3Colors.outline,
    borderRadius: 30,
  },
  secondaryBtnText: {
    color: MD3Colors.onSurface,
    fontWeight: "500",
  },
  moodBtn: {
    padding: 10,
    borderRadius: 30,
  },
  noteInput: {
    backgroundColor: MD3Colors.surfaceContainer,
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
    minHeight: 80,
    textAlignVertical: "top",
  },
});

export default CheckInModal;
