import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { X, UserCircle, Cloud, LogOut } from "lucide-react-native";
import { MD3Colors } from "../theme";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleReset = async () => {
    Alert.alert(
      "Reset All Data",
      "Are you sure? This will wipe all your goals and progress.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.clear();
            // In a real app, we'd probably restart or reload via context
            Alert.alert("Reset Complete", "Please restart the app.");
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={MD3Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* User Badge */}
            <View style={styles.userCard}>
              <View style={styles.avatar}>
                <UserCircle size={40} color={MD3Colors.primary} />
              </View>
              <View>
                <Text style={styles.userName}>Guest User</Text>
                <Text style={styles.userStatus}>Local Storage Only</Text>
              </View>
            </View>

            {/* Sync CTA */}
            <View style={styles.syncCard}>
              <View style={styles.syncTextContainer}>
                <Text style={styles.syncTitle}>Sync & Backup</Text>
                <Text style={styles.syncDesc}>
                  Link an account to save your progress across devices.
                </Text>
              </View>
              <TouchableOpacity style={styles.syncBtn} disabled>
                <Cloud size={20} color={MD3Colors.onSurfaceVariant} />
                <Text style={styles.syncBtnText}>Coming Soon</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Reset */}
            <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
              <LogOut size={20} color={MD3Colors.error} />
              <Text style={styles.resetBtnText}>Reset All Data</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    color: MD3Colors.onSurface,
    fontWeight: "600",
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    gap: 16,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: MD3Colors.primaryContainer,
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    color: MD3Colors.onSurface,
  },
  userStatus: {
    fontSize: 14,
    color: MD3Colors.onSurfaceVariant,
  },
  syncCard: {
    backgroundColor: MD3Colors.surfaceContainerLow,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  syncTextContainer: {
    gap: 4,
  },
  syncTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: MD3Colors.onSurface,
  },
  syncDesc: {
    fontSize: 12,
    color: MD3Colors.onSurfaceVariant,
  },
  syncBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: MD3Colors.surfaceVariant,
    opacity: 0.7,
  },
  syncBtnText: {
    color: MD3Colors.onSurfaceVariant,
    fontSize: 14,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: MD3Colors.outline + "33",
    marginVertical: 8,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 30,
    backgroundColor: MD3Colors.errorContainer,
  },
  resetBtnText: {
    color: MD3Colors.onErrorContainer,
    fontSize: 16,
    fontWeight: "500",
  },
});

export default ProfileModal;
