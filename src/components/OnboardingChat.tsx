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
  Alert,
} from "react-native";
import { Agenda, AgendaType, ChatMessage } from "../types";
import { generateId, getTodayDateString } from "../utils/logic";
import { useTheme } from "../context/ThemeContext";
import { Send, ArrowLeft } from "lucide-react-native";
import { supabase } from "../lib/supabase";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface OnboardingChatProps {
  onComplete: (agenda: Agenda | Agenda[]) => void;
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
      text: "Hi! I'm your Goal Coach. I'm here to help you turn your improved productivity into reality. What's a goal or project you'd like to work on?",
      sender: "bot",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Auto scroll when messages change
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 200);
  }, [messages, isTyping]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    // 1. Add user message
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const userMsg: ChatMessage = {
      id: generateId(),
      text,
      sender: "user",
    };
    
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputValue("");
    setIsTyping(true);

    try {
      // 2. Call Edge Function
      const { data, error } = await supabase.functions.invoke('chat-coach', {
        body: { messages: updatedMessages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })) },
      });

      if (error) throw error;

      const { message, is_ready, agendas } = data;

      setIsTyping(false);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      // 3. Handle specific Agendas creation
      if (is_ready && agendas && agendas.length > 0) {
        // Add final bot message
        if (message) {
            setMessages((prev) => [
                ...prev,
                { id: generateId(), text: message, sender: "bot" },
            ]);
        }
        
        // Process Agendas
        const newAgendas: Agenda[] = agendas.map((raw: any) => ({
            id: generateId(),
            title: raw.title || "New Goal",
            type: raw.type as AgendaType,
            priority: raw.priority,
            totalTarget: raw.totalTarget,
            targetVal: raw.targetVal || 1,
            unit: raw.unit || "check-in",
            frequency: "daily",
            startDate: getTodayDateString(),
            bufferTokens: raw.bufferTokens || 0,
            isRecurring: raw.isRecurring ?? true,
        }));

        // Allow user to read the message for a moment before completing
        setTimeout(() => {
            onComplete(newAgendas);
        }, 1500);

      } else {
        // Just a conversation reply
        if (message) {
            setMessages((prev) => [
              ...prev,
              { id: generateId(), text: message, sender: "bot" },
            ]);
        }
      }

    } catch (error: any) {
      console.error("AI Error:", error);
      setIsTyping(false);

      let errorMessage = "Could not connect to the Goal Coach. Please try again.";
      
      // Attempt to extract real error message from Supabase response
      if (error?.context?.json) {
        try {
            const body = await error.context.json();
            if (body?.error) {
                errorMessage = `AI Error: ${body.error}`;
            }
        } catch (e) {
            console.log("Failed to parse error body", e);
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Alert.alert("Connection Error", errorMessage);
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
              onSubmitEditing={() => !isTyping && handleSend(inputValue)}
            />
            <TouchableOpacity
              onPress={() => handleSend(inputValue)}
              disabled={!inputValue.trim() || isTyping}
              style={[
                styles.sendBtn,
                (!inputValue.trim() || isTyping) && styles.sendBtnDisabled,
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
