import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  FlatList,
  Modal,
  Dimensions,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { Fonts, MD3Theme } from "../../config/theme";
import { X, Plus, Edit2, Trash2, Check, Folder } from "lucide-react-native";
import { List, DEFAULT_LISTS } from "../../types";
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
  "🧘",
  "💼",
  "⭐",
  "🎯",
  "🏃",
  "💡",
  "🎨",
  "🌿",
  "🔥",
  "💰",
];
const COLOR_OPTIONS = [
  "#4CAF50", // Green
  "#2196F3", // Blue
  "#9C27B0", // Purple
  "#FF9800", // Orange
  "#E91E63", // Pink
  "#00BCD4", // Cyan
  "#795548", // Brown
  "#607D8B", // Blue Grey
];

const ListsModal: React.FC<ListsModalProps> = ({
  isOpen,
  onClose,
  lists,
  onUpdateLists,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const [isEditing, setIsEditing] = useState(false);
  const [editingList, setEditingList] = useState<List | null>(null);
  const [newName, setNewName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("📚");
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);

  const currentLists = lists.length > 0 ? lists : DEFAULT_LISTS;

  const handleAddNew = () => {
    setIsEditing(true);
    setEditingList(null);
    setNewName("");
    setSelectedIcon("📚");
    setSelectedColor(COLOR_OPTIONS[0]);
  };

  const handleEdit = (list: List) => {
    setIsEditing(true);
    setEditingList(list);
    setNewName(list.name);
    setSelectedIcon(list.icon);
    setSelectedColor(list.color);
  };

  const handleSave = () => {
    if (!newName.trim()) {
      Alert.alert("Error", "Please enter a list name");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (editingList) {
      // Update existing
      const updated = currentLists.map((l) =>
        l.id === editingList.id
          ? {
              ...l,
              name: newName.trim(),
              icon: selectedIcon,
              color: selectedColor,
            }
          : l
      );
      onUpdateLists(updated);
    } else {
      // Add new
      const newList: List = {
        id: `list_${Date.now()}`,
        name: newName.trim(),
        icon: selectedIcon,
        color: selectedColor,
        order: currentLists.length,
      };
      onUpdateLists([...currentLists, newList]);
    }

    setIsEditing(false);
    setEditingList(null);
  };

  const handleDelete = (list: List) => {
    const isDefault = DEFAULT_LISTS.some((d) => d.id === list.id);

    Alert.alert(
      "Delete List",
      isDefault
        ? "This is a default list. Goals in this list will become uncategorized."
        : `Delete "${list.name}"? Goals in this list will become uncategorized.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const updated = currentLists.filter((l) => l.id !== list.id);
            onUpdateLists(updated);
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingList(null);
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      onRequestClose={onClose}
      transparent={true}
      statusBarTranslucent={true}
    >
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: Dimensions.get("window").width,
          height: Dimensions.get("window").height,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 9999,
        }}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Folder size={24} color={theme.primary} />
              <Text style={styles.headerTitle}>
                {isEditing
                  ? editingList
                    ? "Edit List"
                    : "New List"
                  : "Manage Lists"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={isEditing ? handleCancel : onClose}
              style={styles.closeBtn}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <X size={24} color={theme.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {!isEditing ? (
            <>
              {/* Lists View */}
              <FlatList
                data={currentLists}
                keyExtractor={(item) => item.id}
                style={styles.listContainer}
                renderItem={({ item: list }) => (
                  <View style={styles.listItem}>
                    <View style={styles.listItemLeft}>
                      <View
                        style={[
                          styles.listIcon,
                          { backgroundColor: list.color + "20" },
                        ]}
                      >
                        <Text style={styles.listEmoji}>{list.icon}</Text>
                      </View>
                      <Text style={styles.listName}>{list.name}</Text>
                    </View>
                    <View style={styles.listItemActions}>
                      <TouchableOpacity
                        onPress={() => handleEdit(list)}
                        style={styles.actionBtn}
                        accessibilityLabel={`Edit ${list.name}`}
                        accessibilityRole="button"
                      >
                        <Edit2 size={18} color={theme.onSurfaceVariant} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(list)}
                        style={styles.actionBtn}
                        accessibilityLabel={`Delete ${list.name}`}
                        accessibilityRole="button"
                      >
                        <Trash2 size={18} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />

              {/* Add Button */}
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddNew}
                accessibilityLabel="Add new list"
                accessibilityRole="button"
              >
                <Plus size={20} color={theme.onPrimary} />
                <Text style={styles.addButtonText}>Add New List</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Edit/Create View */
            <ScrollView style={styles.editContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>List Name</Text>
                <TextInput
                  style={styles.input}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="e.g., Fitness, Learning"
                  placeholderTextColor={theme.onSurfaceVariant}
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Icon</Text>
                <View style={styles.optionsGrid}>
                  {EMOJI_OPTIONS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.emojiOption,
                        selectedIcon === emoji && {
                          backgroundColor: selectedColor + "30",
                          borderColor: selectedColor,
                        },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedIcon(emoji);
                      }}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Color</Text>
                <View style={styles.optionsGrid}>
                  {COLOR_OPTIONS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        selectedColor === color && styles.colorOptionSelected,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedColor(color);
                      }}
                    >
                      {selectedColor === color && (
                        <Check size={16} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Preview */}
              <View style={styles.previewContainer}>
                <Text style={styles.inputLabel}>Preview</Text>
                <View
                  style={[
                    styles.previewChip,
                    {
                      backgroundColor: selectedColor + "20",
                      borderColor: selectedColor,
                    },
                  ]}
                >
                  <Text style={styles.previewEmoji}>{selectedIcon}</Text>
                  <Text style={[styles.previewText, { color: selectedColor }]}>
                    {newName || "List Name"}
                  </Text>
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: selectedColor }]}
                onPress={handleSave}
                accessibilityLabel="Save list"
                accessibilityRole="button"
              >
                <Check size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>
                  {editingList ? "Save Changes" : "Create List"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      maxHeight: "80%",
      paddingBottom: 34,
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
      gap: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: Fonts.bold,
      color: theme.onSurface,
    },
    closeBtn: {
      padding: 4,
    },
    listContainer: {
      maxHeight: 350,
      padding: 16,
    },
    listItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginBottom: 8,
      backgroundColor: theme.surfaceContainerLow,
      borderRadius: 12,
    },
    listItemLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    listIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
    },
    listEmoji: {
      fontSize: 20,
    },
    listName: {
      fontSize: 16,
      fontFamily: Fonts.medium,
      color: theme.onSurface,
    },
    listItemActions: {
      flexDirection: "row",
      gap: 8,
    },
    actionBtn: {
      padding: 8,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primary,
      marginHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 100,
      gap: 8,
    },
    addButtonText: {
      fontSize: 16,
      fontFamily: Fonts.medium,
      color: theme.onPrimary,
    },
    editContainer: {
      padding: 20,
    },
    inputGroup: {
      marginBottom: 24,
    },
    inputLabel: {
      fontSize: 14,
      fontFamily: Fonts.medium,
      color: theme.onSurfaceVariant,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.surfaceContainer,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      fontFamily: Fonts.regular,
      color: theme.onSurface,
      borderWidth: 1,
      borderColor: theme.outline + "40",
    },
    optionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    emojiOption: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: theme.surfaceContainer,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: "transparent",
    },
    emojiText: {
      fontSize: 20,
    },
    colorOption: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 3,
      borderColor: "transparent",
    },
    colorOptionSelected: {
      borderColor: "rgba(255,255,255,0.5)",
    },
    previewContainer: {
      marginBottom: 24,
    },
    previewChip: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 100,
      borderWidth: 1,
      gap: 8,
    },
    previewEmoji: {
      fontSize: 16,
    },
    previewText: {
      fontSize: 14,
      fontFamily: Fonts.medium,
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      borderRadius: 100,
      gap: 8,
    },
    saveButtonText: {
      fontSize: 16,
      fontFamily: Fonts.medium,
      color: "#FFFFFF",
    },
  });

export default ListsModal;
