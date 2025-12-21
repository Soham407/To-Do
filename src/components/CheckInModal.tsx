import React from "react";
import { Modal, View, Text, Button } from "react-native";
import { DailyTask, Agenda } from "../types";

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
  return (
    <Modal visible={isOpen} animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      >
        <View
          style={{ backgroundColor: "white", padding: 20, borderRadius: 10 }}
        >
          <Text>Check In Modal Placeholder</Text>
          <Button title="Close" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
};
export default CheckInModal;
