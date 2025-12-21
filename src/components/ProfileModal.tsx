import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Image,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import {
  X,
  User,
  Bell,
  Palette,
  LogOut,
  ChevronRight,
} from "lucide-react-native";

export interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Profile</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={24} color={theme.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <User size={32} color={theme.onPrimaryContainer} />
              </View>
              <View>
                <Text style={styles.profileName}>Guest User</Text>
                <Text style={styles.profileEmail}>Goal Coach Trial</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Settings Section */}
            <Text style={styles.sectionTitle}>Settings</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Bell size={20} color={theme.onSurfaceVariant} />
                <Text style={styles.settingText}>Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{
                  false: theme.surfaceVariant,
                  true: theme.primary,
                }}
                thumbColor={theme.surface}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Palette size={20} color={theme.onSurfaceVariant} />
                <Text style={styles.settingText}>Dark Mode</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{
                  false: theme.surfaceVariant,
                  true: theme.primary,
                }}
                thumbColor={theme.surface}
              />
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.settingLeft}>
                <LogOut size={20} color={theme.error} />
                <Text style={[styles.settingText, { color: theme.error }]}>
                  Log Out
                </Text>
              </View>
              <ChevronRight size={20} color={theme.error} />
            </TouchableOpacity>
          </ScrollView>
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
      width: "85%",
      backgroundColor: theme.surface,
      borderRadius: 28,
      padding: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    scrollContent: {
      paddingBottom: 8,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    headerTitle: {
      fontSize: 22,
      color: theme.onSurface,
    },
    closeBtn: {
      padding: 4,
    },
    profileHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginBottom: 8,
    },
    avatarContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.primaryContainer,
      justifyContent: "center",
      alignItems: "center",
    },
    profileName: {
      fontSize: 18,
      fontWeight: "500",
      color: theme.onSurface,
    },
    profileEmail: {
      fontSize: 14,
      color: theme.onSurfaceVariant,
    },
    divider: {
      height: 1,
      backgroundColor: theme.outline,
      opacity: 0.2,
      marginVertical: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.primary,
      marginBottom: 16,
    },
    settingItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    settingLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    settingText: {
      fontSize: 16,
      color: theme.onSurface,
    },
    menuItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
    },
  });

export default ProfileModal;
