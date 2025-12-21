import React, { useState, useEffect } from "react";
import { Modal, View, Text, Button, TextInput, StyleSheet } from "react-native";
import { DailyTask, Agenda, TaskStatus } from "../types";

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
  const [val, setVal] = useState("");

  useEffect(() => {
    if (task) {
      setVal(task.actualVal.toString());
    }
  }, [task]);

  // If no task or agenda is provided, we can't render meaningful content.
  // However, we should still respect isOpen to show/hide the modal (though content will be empty or modal hidden if null).
  // But typically if task is null, modal shouldn't be open.
  // Let's render nothing if missing data to be safe.
  if (!task || !agenda) {
    if (isOpen)
      return (
        <Modal visible={isOpen} transparent>
          <View />
        </Modal>
      ); // Renders empty strictly if open but no data
    return null;
  }

  const handleSave = () => {
    const newVal = parseInt(val) || 0;
    // Simple logic: if actual >= target, check it as COMPLETED, else PARTIAL/PENDING
    // The user can allow refine this logic later.
    const completed = newVal >= task.targetVal;

    // We create the updated task object
    const updatedTask: DailyTask = {
      ...task,
      actualVal: newVal,
      status: completed
        ? TaskStatus.COMPLETED
        : newVal > 0
        ? TaskStatus.PARTIAL
        : TaskStatus.PENDING,
    };

    onUpdateTask(updatedTask);
    onClose();
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.title}>{agenda.title}</Text>
          <Text style={styles.subtitle}>
            Target for {task.scheduledDate}: {task.targetVal}{" "}
            {agenda.unit || "units"}
          </Text>

          <Text style={styles.label}>Actual Achievement:</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={val}
            onChangeText={setVal}
            placeholder="0"
          />

          <View style={styles.buttonContainer}>
            <View style={styles.buttonWrapper}>
              <Button title="Cancel" onPress={onClose} color="#888" />
            </View>
            <View style={styles.buttonWrapper}>
              <Button title="Check In" onPress={handleSave} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: "85%",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  label: {
    alignSelf: "flex-start",
    marginBottom: 5,
    fontWeight: "600",
  },
  input: {
    height: 40,
    width: "100%",
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  buttonWrapper: {
    flex: 1,
    marginHorizontal: 5,
  },
});

export default CheckInModal;
