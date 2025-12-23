import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { Agenda, AgendaType, ChatMessage } from "../types";
import { generateId, getTodayDateString } from "../utils/logic";
import { useTheme } from "../context/ThemeContext";
import { Send, ArrowLeft } from "lucide-react-native";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface OnboardingChatProps {
  onComplete: (agenda: Agenda) => void;
  onCancel: () => void;
}

const OnboardingChat: React.FC<OnboardingChatProps> = ({
  onComplete,
  onCancel,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      text: "Hi! I'm your Goal Coach. I'm here to help you break down a big goal. What's the name of the goal you want to achieve?",
      sender: "bot",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [step, setStep] = useState<
    "NAME" | "TYPE" | "TARGET" | "UNIT" | "CONFIRM"
  >("NAME");
  const [draftAgenda, setDraftAgenda] = useState<Partial<Agenda>>({});

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Auto scroll when messages change
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 200);
  }, [messages, isTyping]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newMsg: ChatMessage = {
      id: generateId(),
      text,
      sender: "user",
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      processInput(text);
      setIsTyping(false);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }, 1200);
  };

  const addBotMessage = (text: string, options?: string[]) => {
    setMessages((prev) => [
      ...prev,
      { id: generateId(), text, sender: "bot", options },
    ]);
  };

  const processInput = (input: string) => {
    switch (step) {
      case "NAME":
        setDraftAgenda({ ...draftAgenda, title: input });
        setStep("TYPE");
        addBotMessage(
          "Great! Is this a numeric goal (e.g., 'Read 500 pages') or a habit you want to keep (e.g., 'Go to gym')?",
          ["Numeric Goal", "Habit (Boolean)"]
        );
        break;

      case "TYPE": {
        const isNumeric =
          input.toLowerCase().includes("numeric") ||
          input.toLowerCase().includes("pages") ||
          input.toLowerCase().includes("number");
        const type = isNumeric ? AgendaType.NUMERIC : AgendaType.BOOLEAN;
        setDraftAgenda({ ...draftAgenda, type });

        if (type === AgendaType.NUMERIC) {
          setStep("TARGET");
          addBotMessage(
            "Got it. What is the TOTAL number you want to reach? (e.g., Read 1 book = 300 pages)",
            ["100", "500", "1000", "5000"]
          );
        } else {
          setStep("CONFIRM");
          setDraftAgenda({
            ...draftAgenda,
            type: AgendaType.BOOLEAN,
            targetVal: 1,
            unit: "check-in",
          });
          addBotMessage(
            `Understood. A habit called "${draftAgenda.title}". You'll get 3 "Life Happens" tokens per month. Ready to start?`,
            ["Yes, let's go!", "Cancel"]
          );
        }
        break;
      }

      case "TARGET": {
        const target = parseInt(input.replace(/[^0-9]/g, ""));
        if (isNaN(target)) {
          addBotMessage("Please enter a valid number.");
          return;
        }
        // Option 1: Store pure decomposing intent
        setDraftAgenda({ ...draftAgenda, totalTarget: target });
        setStep("UNIT");
        addBotMessage("What is the unit? (e.g., pages, minutes, km)", [
          "pages",
          "minutes",
          "hours",
        ]);
        break;
      }

      case "UNIT": {
        setDraftAgenda({ ...draftAgenda, unit: input });
        setStep("CONFIRM");
        const safeTotal = draftAgenda.totalTarget || 0;

        // "Magic Number" logic (for now, as per Senior Engineer Advice)
        // Future: Ask for duration
        const duration = 30;
        const dailyTarget = safeTotal > 0 ? Math.ceil(safeTotal / duration) : 0;

        addBotMessage(
          `Perfect. To reach ${safeTotal} ${input} in ${duration} days, you'll need to do about ${dailyTarget} ${input} per day. Ready?`,
          ["Yes", "Cancel"]
        );

        break;
      }

      case "CONFIRM":
        if (input.toLowerCase().includes("yes")) {
          const newAgenda: Agenda = {
            id: generateId(),
            title: draftAgenda.title || "Untitled",
            type: draftAgenda.type || AgendaType.BOOLEAN,
            bufferTokens: 3,
            startDate: getTodayDateString(),
            frequency: "daily",
            totalTarget: draftAgenda.totalTarget,
            unit: draftAgenda.unit,
          };
          onComplete(newAgenda);
        } else {
          onCancel();
        }
        break;
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === "user";
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.alignRight : styles.alignLeft,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.botBubble,
            isUser ? styles.roundBottomRight : styles.roundBottomLeft,
          ]}
        >
          <Text
            style={[styles.msgText, isUser ? styles.userText : styles.botText]}
          >
            {item.text}
          </Text>
        </View>

        {/* Quick Replies */}
        {!isUser && item.options && (
          <View style={styles.quickReplyContainer}>
            {item.options.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => handleSend(opt)}
                style={styles.quickReplyChip}
              >
                <Text style={styles.quickReplyText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Goal Coach</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          isTyping ? (
            <View style={styles.typingContainer}>
              <View style={styles.typingBubble}>
                <View style={styles.typingDot} />
                <View style={[styles.typingDot, { marginHorizontal: 4 }]} />
                <View style={styles.typingDot} />
              </View>
            </View>
          ) : null
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="Type here..."
              placeholderTextColor={theme.onSurfaceVariant + "80"}
              onSubmitEditing={() => handleSend(inputValue)}
            />
            <TouchableOpacity
              onPress={() => handleSend(inputValue)}
              disabled={!inputValue.trim() || isTyping}
              style={[
                styles.sendBtn,
                !inputValue.trim() && styles.sendBtnDisabled,
              ]}
            >
              <Send
                size={20}
                color={
                  inputValue.trim() ? theme.onPrimary : theme.onSurfaceVariant
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surfaceContainerLow,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: Platform.OS === "android" ? 40 : 60,
      paddingBottom: 16,
      backgroundColor: theme.surface,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      zIndex: 10,
    },
    backButton: {
      padding: 8,
      marginRight: 8,
      borderRadius: 20,
    },
    headerTitle: {
      fontSize: 20,
      color: theme.onSurface,
    },
    listContent: {
      padding: 16,
      paddingBottom: 40,
    },
    messageContainer: {
      marginVertical: 4,
      width: "100%",
    },
    alignLeft: {
      alignItems: "flex-start",
    },
    alignRight: {
      alignItems: "flex-end",
    },
    bubble: {
      maxWidth: "85%",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 20,
    },
    userBubble: {
      backgroundColor: theme.primary,
    },
    botBubble: {
      backgroundColor: theme.surfaceContainerHigh,
    },
    roundBottomRight: {
      borderBottomRightRadius: 4,
    },
    roundBottomLeft: {
      borderBottomLeftRadius: 4,
    },
    msgText: {
      fontSize: 16,
      lineHeight: 22,
    },
    userText: {
      color: theme.onPrimary,
    },
    botText: {
      color: theme.onSurface,
    },
    quickReplyContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 8,
      gap: 8,
    },
    quickReplyChip: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.outline + "40",
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    quickReplyText: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: "500",
    },
    typingContainer: {
      marginLeft: 0,
      marginTop: 4,
      alignItems: "flex-start",
    },
    typingBubble: {
      flexDirection: "row",
      backgroundColor: theme.surfaceContainerHigh,
      padding: 16,
      borderRadius: 20,
      borderBottomLeftRadius: 4,
      width: 60,
      justifyContent: "center",
      alignItems: "center",
    },
    typingDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.onSurfaceVariant + "60",
    },
    inputWrapper: {
      padding: 16,
      backgroundColor: theme.surfaceContainerLow,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surfaceContainerHigh,
      borderRadius: 30,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: "transparent",
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.onSurface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      maxHeight: 100,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    sendBtnDisabled: {
      backgroundColor: theme.surfaceVariant,
    },
  });

export default OnboardingChat;
