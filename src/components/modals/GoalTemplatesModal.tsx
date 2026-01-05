import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import SafeModal from "../common/SafeModal";
import { useTheme } from "../../context/ThemeContext";
import { Fonts, MD3Theme } from "../../config/theme";
import {
  X,
  Sparkles,
  ChevronRight,
  Target,
  Clock,
  Zap,
} from "lucide-react-native";
import {
  GoalTemplate,
  GOAL_TEMPLATES,
  DEFAULT_LISTS,
  Agenda,
  AgendaType,
  Priority,
} from "../../types";
import { getLocalDateString } from "../../utils/logic";
import * as Haptics from "expo-haptics";

interface GoalTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGoal: (agenda: Agenda) => void;
}

const GoalTemplatesModal: React.FC<GoalTemplatesModalProps> = ({
  isOpen,
  onClose,
  onCreateGoal,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(
    null
  );
  const [customTitle, setCustomTitle] = useState("");
  const [customTarget, setCustomTarget] = useState("");
  const [customDuration, setCustomDuration] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(GOAL_TEMPLATES.map((t) => t.category))];

  const filteredTemplates = selectedCategory
    ? GOAL_TEMPLATES.filter((t) => t.category === selectedCategory)
    : GOAL_TEMPLATES;

  const handleSelectTemplate = (template: GoalTemplate) => {
    Haptics.selectionAsync();
    setSelectedTemplate(template);
    setCustomTitle(template.title);
    setCustomTarget(template.suggestedTarget?.toString() || "1");
    setCustomDuration(template.suggestedDuration?.toString() || "30");
  };

  const handleCreateGoal = () => {
    if (!selectedTemplate) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const duration = parseInt(customDuration) || 30;
    const target = parseInt(customTarget) || 1;
    const dailyTarget =
      selectedTemplate.type === AgendaType.NUMERIC
        ? Math.ceil(target / duration)
        : 1;

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + duration);

    const newAgenda: Agenda = {
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: customTitle || selectedTemplate.title,
      type: selectedTemplate.type,
      bufferTokens: 3,
      totalTarget:
        selectedTemplate.type === AgendaType.NUMERIC ? target : undefined,
      unit: selectedTemplate.suggestedUnit,
      targetVal: dailyTarget,
      frequency: "daily",
      startDate: getLocalDateString(today),
      endDate: getLocalDateString(endDate),
      priority: Priority.MEDIUM,
      listId: DEFAULT_LISTS.find(
        (l) => l.name.toLowerCase() === selectedTemplate.category.toLowerCase()
      )?.id,
      status: "ACTIVE",
    };

    onCreateGoal(newAgenda);
    resetAndClose();
  };

  const resetAndClose = () => {
    setSelectedTemplate(null);
    setCustomTitle("");
    setCustomTarget("");
    setCustomDuration("");
    setSelectedCategory(null);
    onClose();
  };

  return (
    <SafeModal visible={isOpen} animationType="slide" onClose={resetAndClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Sparkles size={24} color={theme.primary} />
              <Text style={styles.headerTitle}>
                {selectedTemplate ? "Customize Goal" : "Quick Start Templates"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={resetAndClose}
              style={styles.closeBtn}
              accessibilityLabel="Close templates"
              accessibilityRole="button"
            >
              <X size={24} color={theme.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {!selectedTemplate ? (
            <>
              {/* Category Filter */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryContainer}
              >
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    !selectedCategory && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(null)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      !selectedCategory && styles.categoryTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      selectedCategory === cat && styles.categoryChipActive,
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        selectedCategory === cat && styles.categoryTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Templates Grid */}
              <ScrollView
                style={styles.templatesScroll}
                contentContainerStyle={styles.templatesGrid}
              >
                {filteredTemplates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={styles.templateCard}
                    onPress={() => handleSelectTemplate(template)}
                    accessibilityLabel={`Select ${template.title} template`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.templateIcon}>{template.icon}</Text>
                    <Text style={styles.templateTitle}>{template.title}</Text>
                    <Text style={styles.templateDesc} numberOfLines={2}>
                      {template.description}
                    </Text>
                    <View style={styles.templateMeta}>
                      <View style={styles.metaBadge}>
                        <Target size={10} color={theme.primary} />
                        <Text style={styles.metaText}>
                          {template.type === AgendaType.NUMERIC
                            ? "Numeric"
                            : "Habit"}
                        </Text>
                      </View>
                      {template.suggestedDuration && (
                        <View style={styles.metaBadge}>
                          <Clock size={10} color={theme.secondary} />
                          <Text style={styles.metaText}>
                            {template.suggestedDuration}d
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : (
            /* Customization View */
            <ScrollView style={styles.customizeScroll}>
              <View style={styles.previewCard}>
                <Text style={styles.previewIcon}>{selectedTemplate.icon}</Text>
                <View>
                  <Text style={styles.previewTitle}>
                    {selectedTemplate.title}
                  </Text>
                  <Text style={styles.previewType}>
                    {selectedTemplate.type === AgendaType.NUMERIC
                      ? `${selectedTemplate.suggestedTarget} ${selectedTemplate.suggestedUnit}`
                      : "Daily Habit"}
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Goal Name</Text>
                <TextInput
                  style={styles.input}
                  value={customTitle}
                  onChangeText={setCustomTitle}
                  placeholder="Give your goal a name"
                  placeholderTextColor={theme.onSurfaceVariant}
                />
              </View>

              {selectedTemplate.type === AgendaType.NUMERIC && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Total Target ({selectedTemplate.suggestedUnit})
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={customTarget}
                    onChangeText={setCustomTarget}
                    keyboardType="numeric"
                    placeholder={`e.g., ${selectedTemplate.suggestedTarget}`}
                    placeholderTextColor={theme.onSurfaceVariant}
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Duration (days)</Text>
                <TextInput
                  style={styles.input}
                  value={customDuration}
                  onChangeText={setCustomDuration}
                  keyboardType="numeric"
                  placeholder={`e.g., ${selectedTemplate.suggestedDuration}`}
                  placeholderTextColor={theme.onSurfaceVariant}
                />
              </View>

              {/* Daily breakdown preview */}
              {selectedTemplate.type === AgendaType.NUMERIC &&
                customTarget &&
                customDuration &&
                !isNaN(parseInt(customTarget)) &&
                !isNaN(parseInt(customDuration)) &&
                parseInt(customDuration) > 0 && (
                  <View style={styles.breakdownCard}>
                    <Zap size={16} color={theme.primary} />
                    <Text style={styles.breakdownText}>
                      That's{" "}
                      <Text style={styles.breakdownHighlight}>
                        {Math.ceil(
                          parseInt(customTarget) / parseInt(customDuration)
                        )}{" "}
                        {selectedTemplate.suggestedUnit}
                      </Text>{" "}
                      per day
                    </Text>
                  </View>
                )}

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setSelectedTemplate(null)}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={handleCreateGoal}
                >
                  <Text style={styles.createButtonText}>Create Goal</Text>
                  <ChevronRight size={20} color={theme.onPrimary} />
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeModal>
  );
};

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    container: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      maxHeight: "85%",
      paddingBottom: Platform.OS === "ios" ? 34 : 24,
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
    categoryScroll: {
      maxHeight: 50,
    },
    categoryContainer: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
    },
    categoryChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 100,
      backgroundColor: theme.surfaceContainer,
      marginRight: 8,
    },
    categoryChipActive: {
      backgroundColor: theme.primaryContainer,
    },
    categoryText: {
      fontSize: 14,
      fontFamily: Fonts.medium,
      color: theme.onSurfaceVariant,
    },
    categoryTextActive: {
      color: theme.onPrimaryContainer,
    },
    templatesScroll: {
      flex: 1,
    },
    templatesGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      padding: 16,
      gap: 12,
    },
    templateCard: {
      width: "47%",
      backgroundColor: theme.surfaceContainerLow,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.outline + "20",
    },
    templateIcon: {
      fontSize: 32,
      marginBottom: 8,
    },
    templateTitle: {
      fontSize: 16,
      fontFamily: Fonts.bold,
      color: theme.onSurface,
      marginBottom: 4,
    },
    templateDesc: {
      fontSize: 12,
      fontFamily: Fonts.regular,
      color: theme.onSurfaceVariant,
      marginBottom: 12,
      lineHeight: 16,
    },
    templateMeta: {
      flexDirection: "row",
      gap: 8,
    },
    metaBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: theme.surfaceContainer,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 100,
    },
    metaText: {
      fontSize: 10,
      fontFamily: Fonts.medium,
      color: theme.onSurfaceVariant,
    },
    customizeScroll: {
      padding: 20,
    },
    previewCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      backgroundColor: theme.primaryContainer,
      padding: 16,
      borderRadius: 16,
      marginBottom: 24,
    },
    previewIcon: {
      fontSize: 40,
    },
    previewTitle: {
      fontSize: 18,
      fontFamily: Fonts.bold,
      color: theme.onPrimaryContainer,
    },
    previewType: {
      fontSize: 14,
      fontFamily: Fonts.regular,
      color: theme.onPrimaryContainer + "CC",
    },
    inputGroup: {
      marginBottom: 20,
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
    breakdownCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: theme.secondaryContainer,
      padding: 12,
      borderRadius: 12,
      marginBottom: 24,
    },
    breakdownText: {
      fontSize: 14,
      fontFamily: Fonts.regular,
      color: theme.onSecondaryContainer,
    },
    breakdownHighlight: {
      fontFamily: Fonts.bold,
      color: theme.primary,
    },
    buttonRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
    },
    backButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 100,
      backgroundColor: theme.surfaceContainer,
      alignItems: "center",
    },
    backButtonText: {
      fontSize: 16,
      fontFamily: Fonts.medium,
      color: theme.onSurface,
    },
    createButton: {
      flex: 2,
      flexDirection: "row",
      paddingVertical: 16,
      borderRadius: 100,
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    createButtonText: {
      fontSize: 16,
      fontFamily: Fonts.medium,
      color: theme.onPrimary,
    },
  });

export default GoalTemplatesModal;
