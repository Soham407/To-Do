import React from "react";
import { Modal, View, Text, Button, StyleSheet, Alert } from "react-native";
import { Agenda } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  agenda: Agenda | null; // Changed to accept explicit null
  onUpdateAgenda: (agenda: Agenda) => void;
  onDeleteAgenda: (agendaId: string) => void;
}

const GoalSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  agenda,
  onUpdateAgenda, // Currently unused in this stub implementation, but part of the interface
  onDeleteAgenda,
}) => {
  if (!isOpen) return null;

  const handleDelete = () => {
    if (agenda) {
      Alert.alert(
        "Delete Goal",
        `Are you sure you want to delete "${agenda.title}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              onDeleteAgenda(agenda.id);
              onClose();
            },
          },
        ]
      );
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
          <Text style={styles.header}>Goal Settings</Text>

          {agenda ? (
            <View style={styles.body}>
              <Text style={styles.label}>Goal Name: {agenda.title}</Text>
              <Text style={styles.label}>Type: {agenda.type}</Text>
              <Text style={styles.label}>
                Buffer Tokens: {agenda.bufferTokens}
              </Text>

              <View style={styles.actionContainer}>
                <Button
                  title="Delete Goal"
                  onPress={handleDelete}
                  color="#FF3B30"
                />
              </View>
            </View>
          ) : (
            <Text>No agenda details available.</Text>
          )}

          <Button title="Close" onPress={onClose} />
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
    width: "80%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    elevation: 5,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  body: {
    width: "100%",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
  },
  actionContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
  },
});

export default GoalSettingsModal;
