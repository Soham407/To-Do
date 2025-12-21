import React from "react";
import { Modal, View, Text, Button } from "react-native";

const CalendarModal = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
}: any) => {
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
