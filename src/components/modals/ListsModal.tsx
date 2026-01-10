import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Dimensions,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { Fonts, MD3Theme } from "../../config/theme";
import { X, Plus, Trash2, Edit2 } from "lucide-react-native";
import { List } from "../../types";
import * as Haptics from "expo-haptics";

interface ListsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lists: List[];
  onUpdateLists: (lists: List[]) => void;
}

const EMOJI_OPTIONS = [
  "📚",
  "💪",
  "💻",
  "🎨",
  "🌱",
  "🏠",
  "💰",
  "🛒",
  "🎓",
  "👨‍💻",
  "🧘",
  "🍎",
];

const ListsModal: React.FC<ListsModalProps> = ({
  isOpen,
  onClose,
  lists,
  onUpdateLists,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const [mode, setMode] = useState<"view" | "create" | "edit">("view");
  const [editingList, setEditingList] = useState<List | null>(null);
  const [listName, setListName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("📚");

  const resetForm = () => {
    setMode("view");
    setEditingList(null);
    setListName("");
    setSelectedIcon("📚");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const startCreate = () => {
    setMode("create");
    setListName("");
    setSelectedIcon("📚");
    Haptics.selectionAsync();
  };

  const startEdit = (list: List) => {
    setMode("edit");
    setEditingList(list);
    setListName(list.name);
    setSelectedIcon(list.icon || "📝");
    Haptics.selectionAsync();
  };

  const handleSubmit = () => {
    if (!listName.trim()) return;

    if (mode === "create") {
      const newList: List = {
        id: `list_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: listName.trim(),
        icon: selectedIcon,
        isDefault: false,
      };
      onUpdateLists([...lists, newList]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (mode === "edit" && editingList) {
      const updatedLists = lists.map((l) =>
        l.id === editingList.id
          ? { ...l, name: listName.trim(), icon: selectedIcon }
          : l
      );
      onUpdateLists(updatedLists);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    resetForm();
  };

  const handleDelete = (listId: string) => {
    Alert.alert(
      "Delete List",
      "Are you sure? Tasks in this list will be moved to Inbox.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updatedLists = lists.filter((l) => l.id !== listId);
            onUpdateLists(updatedLists);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      onRequestClose={handleClose}
      transparent={true}
      statusBarTranslucent={true}
    >
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <TouchableOpacity
                  onPress={mode === "view" ? handleClose : resetForm}
                  style={styles.closeBtn}
                >
                  {mode === "view" ? (
                    <X size={24} color={theme.onSurfaceVariant} />
                  ) : (
                    <Text style={styles.cancelText}>Cancel</Text>
                  )}
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                  {mode === "view"
                    ? "My Lists"
                    : mode === "create"
                    ? "New List"
                    : "Edit List"}
                </Text>
              </View>
              {mode === "view" && (
                <TouchableOpacity onPress={startCreate} style={styles.addBtn}>
                  <Plus size={24} color={theme.primary} />
                </TouchableOpacity>
              )}
            </View>

            {mode === "view" ? (
              <ScrollView
                style={styles.listScroll}
                contentContainerStyle={styles.listContent}
              >
                {lists.map((list) => (
                  <View key={list.id} style={styles.listItem}>
                    <View style={styles.listInfo}>
                      <Text style={styles.listIcon}>{list.icon || "📝"}</Text>
                      <Text style={styles.listName}>{list.name}</Text>
                      <Text style={styles.listCount}>
                        {/* Task count could be passed here if needed */}
                      </Text>
                    </View>
                    {!list.isDefault && (
                      <View style={styles.listActions}>
                        <TouchableOpacity
                          onPress={() => startEdit(list)}
                          style={styles.actionBtn}
                        >
                          <Edit2 size={18} color={theme.onSurfaceVariant} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(list.id)}
                          style={styles.actionBtn}
                        >
                          <Trash2 size={18} color={theme.error} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <ScrollView style={styles.formScroll}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>List Name</Text>
                  <TextInput
                    style={styles.input}
                    value={listName}
                    onChangeText={setListName}
                    placeholder="e.g., Work, Personal, Gym"
                    placeholderTextColor={theme.onSurfaceVariant}
                    autoFocus
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Icon</Text>
                  <View style={styles.emojiGrid}>
                    {EMOJI_OPTIONS.map((emoji) => (
                      <TouchableOpacity
                        key={emoji}
                        style={[
                          styles.emojiItem,
                          selectedIcon === emoji && styles.emojiItemActive,
                        ]}
                        onPress={() => setSelectedIcon(emoji)}
                      >
                        <Text style={styles.emojiText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    !listName.trim() && styles.submitBtnDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!listName.trim()}
                >
                  <Text style={styles.submitBtnText}>
                    {mode === "create" ? "Create List" : "Save Changes"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    modalBackdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      width: Dimensions.get("window").width,
      height: Dimensions.get("window").height,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      zIndex: 9999,
    },
    keyboardView: {
      width: "100%",
    },
    container: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingBottom: Platform.OS === "ios" ? 34 : 24,
      maxHeight: "90%",
      minHeight: 300,
      width: "100%",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.outline + "20",
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: Fonts.bold,
      color: theme.onSurface,
    },
    closeBtn: {
      padding: 4,
    },
    cancelText: {
      fontSize: 16,
      fontFamily: Fonts.medium,
      color: theme.primary,
    },
    addBtn: {
      padding: 4,
    },
    listScroll: {
      maxHeight: 400,
    },
    listContent: {
      padding: 20,
    },
    listItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.outline + "10",
    },
    listInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    listIcon: {
      fontSize: 24,
    },
    listName: {
      fontSize: 16,
      fontFamily: Fonts.medium,
      color: theme.onSurface,
    },
    listCount: {
      fontSize: 14,
      fontFamily: Fonts.regular,
      color: theme.onSurfaceVariant,
    },
    listActions: {
      flexDirection: "row",
      gap: 12,
    },
    actionBtn: {
      padding: 8,
    },
    formScroll: {
      padding: 20,
    },
    inputGroup: {
      marginBottom: 24,
    },
    label: {
      fontSize: 14,
      fontFamily: Fonts.medium,
      color: theme.onSurfaceVariant,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.surfaceContainer,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: Fonts.regular,
      color: theme.onSurface,
      borderWidth: 1,
      borderColor: theme.outline + "40",
    },
    emojiGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    emojiItem: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.surfaceContainer,
      justifyContent: "center",
      alignItems: "center",
    },
    emojiItemActive: {
      backgroundColor: theme.primaryContainer,
      borderWidth: 2,
      borderColor: theme.primary,
    },
    emojiText: {
      fontSize: 24,
    },
    submitBtn: {
      backgroundColor: theme.primary,
      borderRadius: 100,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 8,
    },
    submitBtnDisabled: {
      backgroundColor: theme.surfaceVariant,
      opacity: 0.5,
    },
    submitBtnText: {
      fontSize: 16,
      fontFamily: Fonts.medium,
      color: theme.onPrimary,
    },
  });

export default ListsModal;
