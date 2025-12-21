import React from "react";
import { Modal, View, Text, Button } from "react-native";

const ProfileModal = ({ isOpen, onClose }: any) => {
  return (
    <Modal visible={isOpen} transparent>
      <View>
        <Text>Profile Modal</Text>
        <Button title="Close" onPress={onClose} />
      </View>
    </Modal>
  );
};
export default ProfileModal;
