import React from "react";
import { Modal, View, Text, Button } from "react-native";
interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}
const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
}) => {
  return (
    <Modal visible={isOpen} transparent>
      <View>
        <Text>Calendar Modal</Text>
        <Button title="Close" onPress={onClose} />
      </View>
    </Modal>
  );
};
export default CalendarModal;
