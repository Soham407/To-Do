import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
} from "react-native";
import { Send, ArrowLeft } from "lucide-react-native";
import { Agenda, AgendaType, ChatMessage } from "../types";
import { generateId, getTodayDateString } from "../utils/logic";
import { MD3Colors } from "../theme";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";

interface OnboardingChatProps {
  onComplete: (agenda: Agenda) => void;
  onCancel: () => void;
}

const OnboardingChat: React.FC<OnboardingChatProps> = ({
  onComplete,
  onCancel,
}) => {
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

  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const newMsg: ChatMessage = { id: generateId(), text, sender: "user" };
    setMessages((prev) => [...prev, newMsg]);
    setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      processInput(text);
      setIsTyping(false);
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
            "Got it. What is the total number you want to reach per day? (e.g., 20)",
            ["10", "20", "50", "100"]
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
        setDraftAgenda({ ...draftAgenda, totalTarget: target * 30 });
        setStep("UNIT");
        addBotMessage("What is the unit? (e.g., pages, minutes, km)", [
          "pages",
          "minutes",
          "hours",
        ]);
        break;
      }

      case "UNIT":
        setDraftAgenda({ ...draftAgenda, unit: input });
        setStep("CONFIRM");
        const dailyTarget =
          draftAgenda.totalTarget && draftAgenda.totalTarget > 0
            ? Math.ceil(draftAgenda.totalTarget / 30)
            : 0; // Fallback logic
        addBotMessage(
          `Perfect. Your daily goal is to do about ${
            dailyTarget || input
          }. If you miss it, we'll recalculate. Ready?`,
          ["Yes", "Cancel"]
        );
        break;

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
            targetVal:
              draftAgenda.targetVal ||
              (draftAgenda.totalTarget
                ? Math.ceil(draftAgenda.totalTarget / 30)
                : 1),
          };
          onComplete(newAgenda);
        } else {
          onCancel();
        }
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onCancel} style={styles.backBtn}>
            <ArrowLeft size={24} color={MD3Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Goal Coach</Text>
        </View>
      </View>

      {/* Chat Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        >
          {messages.map((msg) => (
            <Animated.View
              key={msg.id}
              entering={FadeInUp.duration(300)}
              style={[
                styles.messageRow,
                msg.sender === "user" ? styles.userRow : styles.botRow,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  msg.sender === "user" ? styles.userBubble : styles.botBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    msg.sender === "user" ? styles.userText : styles.botText,
                  ]}
                >
                  {msg.text}
                </Text>
              </View>

              {/* Quick Replies */}
              {msg.options && msg.sender === "bot" && (
                <View style={styles.optionsContainer}>
                  {msg.options.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => handleSend(opt)}
                      style={styles.optionBtn}
                    >
                      <Text style={styles.optionText}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Animated.View>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <Animated.View entering={FadeIn} style={styles.botRow}>
              <View
                style={[styles.bubble, styles.botBubble, styles.typingBubble]}
              >
                <View style={styles.dot} />
                <View style={[styles.dot, { opacity: 0.6 }]} />
                <View style={[styles.dot, { opacity: 0.3 }]} />
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              value={inputValue}
              onChangeText={setInputValue}
              style={styles.input}
              placeholder="Type here..."
              placeholderTextColor={MD3Colors.outline}
              onSubmitEditing={() => handleSend(inputValue)}
              editable={!isTyping}
            />
            <TouchableOpacity
              onPress={() => handleSend(inputValue)}
              disabled={!inputValue.trim() || isTyping}
              style={[
                styles.sendBtn,
                inputValue.trim()
                  ? styles.sendBtnActive
                  : styles.sendBtnInactive,
              ]}
            >
              <Send
                size={20}
                color={
                  inputValue.trim()
                    ? MD3Colors.onPrimary
                    : MD3Colors.onSurfaceVariant
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MD3Colors.surfaceContainerLow,
  },
  header: {
    backgroundColor: MD3Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    color: MD3Colors.onSurface,
  },
  chatContainer: {
    flex: 1,
  },
  messageRow: {
    marginBottom: 16,
    width: "100%",
  },
  userRow: {
    alignItems: "flex-end",
  },
  botRow: {
    alignItems: "flex-start",
  },
  bubble: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: "85%",
  },
  botBubble: {
    backgroundColor: MD3Colors.surfaceContainerHigh,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: MD3Colors.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  botText: {
    color: MD3Colors.onSurface,
  },
  userText: {
    color: MD3Colors.onPrimary,
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    marginLeft: 4,
  },
  optionBtn: {
    backgroundColor: MD3Colors.surface,
    borderWidth: 1,
    borderColor: MD3Colors.outline + "40",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  optionText: {
    color: MD3Colors.primary,
    fontWeight: "500",
    fontSize: 14,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: 60,
    height: 40,
    justifyContent: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: MD3Colors.onSurfaceVariant,
  },
  inputContainer: {
    padding: 16,
    backgroundColor: MD3Colors.surfaceContainerLow,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MD3Colors.surfaceContainerHigh,
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: "transparent",
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 16,
    fontSize: 16,
    color: MD3Colors.onSurface,
  },
  sendBtn: {
    padding: 10,
    borderRadius: 20,
  },
  sendBtnActive: {
    backgroundColor: MD3Colors.primary,
  },
  sendBtnInactive: {
    backgroundColor: MD3Colors.surfaceVariant,
  },
});

export default OnboardingChat;
