import React from "react";
import { Modal, View, Text, Button } from "react-native";

const GoalSettingsModal = ({ isOpen, onClose }: any) => {
  return (
    <Modal visible={isOpen} transparent>
      <View>
        <Text>Settings Modal</Text>
        <Button title="Close" onPress={onClose} />
      </View>
    </Modal>
  );
};
export default GoalSettingsModal;
