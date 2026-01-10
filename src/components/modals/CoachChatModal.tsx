import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Animated,
  Dimensions,
  Image,
  Modal,
} from "react-native";
import {
  X,
  Send,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Lightbulb,
} from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";
import { MD3Theme, Fonts } from "../../config/theme";
import {
  ChatMessage,
  DailyTask,
  Agenda,
  TaskStatus,
  FailureTag,
  List,
} from "../../types";
import { generateId, getLocalDateString } from "../../utils/logic";
import { calculateStreak } from "../../utils/insightsLogic";
import { supabase } from "../../api/supabase";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tasks: DailyTask[];
  agendas: Agenda[];
  lists: List[];
}

// Animated message bubble component
const AnimatedMessageBubble = ({
  item,
  styles,
}: {
  item: ChatMessage;
  styles: any;
}) => {
  const isUser = item.sender === "user";
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.messageContainer,
        isUser ? styles.alignRight : styles.alignLeft,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {!isUser && (
        <Image
          source={require("../../../assets/adaptive-icon.png")}
          style={styles.avatar}
          resizeMode="contain"
        />
      )}
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
    </Animated.View>
  );
};

// Typing indicator component with proper cleanup
const TypingIndicator = ({ styles }: any) => {
  const bounce1 = useRef(new Animated.Value(0)).current;
  const bounce2 = useRef(new Animated.Value(0)).current;
  const bounce3 = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const createBounceAnimation = (
      animValue: Animated.Value,
      delay: number
    ) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: -8,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    animationRef.current = Animated.parallel([
      createBounceAnimation(bounce1, 0),
      createBounceAnimation(bounce2, 150),
      createBounceAnimation(bounce3, 300),
    ]);
    animationRef.current.start();

    // Cleanup: Stop animation on unmount
    return () => {
      animationRef.current?.stop();
      bounce1.setValue(0);
      bounce2.setValue(0);
      bounce3.setValue(0);
    };
  }, []);

  return (
    <View style={styles.typingContainer} accessibilityLabel="Coach is typing">
      <View style={styles.typingBubble}>
        <Animated.View
          style={[styles.typingDot, { transform: [{ translateY: bounce1 }] }]}
        />
        <Animated.View
          style={[
            styles.typingDot,
            { marginHorizontal: 4, transform: [{ translateY: bounce2 }] },
          ]}
        />
        <Animated.View
          style={[styles.typingDot, { transform: [{ translateY: bounce3 }] }]}
        />
      </View>
    </View>
  );
};

// Quick suggestion chips
const QUICK_SUGGESTIONS = [
  { id: "1", text: "How am I doing?", icon: TrendingUp },
  { id: "2", text: "I need motivation", icon: Sparkles },
  { id: "3", text: "I'm struggling today", icon: AlertCircle },
  { id: "4", text: "Give me a tip", icon: Lightbulb },
];

// Retry message for error state
const RETRY_MESSAGE = "retry_action";

const CoachChatModal: React.FC<Props> = ({
  isOpen,
  onClose,
  tasks,
  agendas,
  lists,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(
    null
  );

  const flatListRef = useRef<FlatList>(null);

  // Build context for the AI
  const buildContext = useMemo(() => {
    // ... existing stats calculation ...
    const today = getLocalDateString(new Date());
    const todayTasks = tasks.filter((t) => t.scheduledDate === today);
    const completedToday = todayTasks.filter(
      (t) => t.status === TaskStatus.COMPLETED
    ).length;

    // Calculate week stats
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = getLocalDateString(weekAgo);
    const weekTasks = tasks.filter(
      (t) =>
        t.scheduledDate >= weekAgoStr &&
        t.scheduledDate <= today &&
        t.status !== TaskStatus.PENDING
    );
    const weekCompleted = weekTasks.filter(
      (t) =>
        t.status === TaskStatus.COMPLETED ||
        t.status === TaskStatus.SKIPPED_WITH_BUFFER
    ).length;
    const weekCompletionRate =
      weekTasks.length > 0
        ? Math.round((weekCompleted / weekTasks.length) * 100)
        : 0;

    // Get recent failure tags
    const recentFailures = tasks
      .filter(
        (t) =>
          t.failureTag &&
          t.failureTag !== FailureTag.NONE &&
          t.scheduledDate >= weekAgoStr
      )
      .map((t) => t.failureTag as string);
    const uniqueFailureTags = [...new Set(recentFailures)];

    // Get streak info for the first agenda
    let streakInfo = { current: 0, longest: 0 };
    if (agendas.length > 0) {
      streakInfo = calculateStreak(tasks, agendas[0].id);
    }

    // Buffer tokens remaining
    const totalBuffers = agendas.reduce((sum, a) => sum + a.bufferTokens, 0);

    const goalsSummary = agendas.slice(0, 3).map((a) => ({
      title: a.title,
      progress: a.totalTarget
        ? `${Math.round(
            (tasks
              .filter((t) => t.agendaId === a.id)
              .reduce((s, t) => s + t.actualVal, 0) /
              a.totalTarget) *
              100
          )}%`
        : "ongoing",
    }));

    return {
      streakInfo,
      todayStats: { completed: completedToday, total: todayTasks.length },
      weekStats: { completionRate: weekCompletionRate },
      recentFailureTags: uniqueFailureTags,
      buffersRemaining: totalBuffers,
      goals: goalsSummary,
      availableLists: lists.map((l) => ({ id: l.id, name: l.name })), // Pass lists to AI
    };
  }, [tasks, agendas, lists]);

  // Reset messages when modal opens
  useEffect(() => {
    if (isOpen) {
      // Start with a greeting based on context
      const greeting = getGreeting();
      setMessages([
        {
          id: "1",
          text: greeting,
          sender: "bot",
        },
      ]);
      setShowSuggestions(true);
    }
  }, [isOpen]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const { todayStats, streakInfo, weekStats } = buildContext;

    let timeGreeting = "Hi there! 👋";
    if (hour < 12) timeGreeting = "Good morning! ☀️";
    else if (hour < 17) timeGreeting = "Good afternoon! 👋";
    else timeGreeting = "Good evening! 🌙";

    let contextNote = "";
    if (streakInfo.current >= 7) {
      contextNote = ` Wow, you're on a ${streakInfo.current}-day streak! 🔥`;
    } else if (
      todayStats.completed === todayStats.total &&
      todayStats.total > 0
    ) {
      contextNote = " You've crushed all your tasks today! 🎉";
    } else if (weekStats.completionRate >= 80) {
      contextNote = " You've had a fantastic week so far!";
    }

    return `${timeGreeting}${contextNote} I'm your Goal Coach. How can I help you today?`;
  };

  useEffect(() => {
    // Auto scroll when messages change
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 200);
  }, [messages, isTyping]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    setShowSuggestions(false);

    // Add user message
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
      // Call the coach-advice Edge Function
      const { data, error } = await supabase.functions.invoke("coach-advice", {
        body: {
          messages: updatedMessages.map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          })),
          context: buildContext,
        },
      });

      setIsTyping(false);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      // Handle rate limit response (no retry)
      if (data?.isRateLimited) {
        setMessages((prev) => [
          ...prev,
          { id: generateId(), text: data.error, sender: "bot" },
        ]);
        return;
      }

      if (error) throw error;

      if (data?.message) {
        setMessages((prev) => [
          ...prev,
          { id: generateId(), text: data.message, sender: "bot" },
        ]);
      }
    } catch (error: any) {
      if (__DEV__) console.error("AI Error:", error);
      setIsTyping(false);
      setLastFailedMessage(text);

      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          text: "Oops! I had trouble connecting. Tap below to try again. 💙",
          sender: "bot",
          options: [RETRY_MESSAGE],
        },
      ]);
    }
  };

  const handleRetry = () => {
    if (lastFailedMessage) {
      // Remove the error message
      setMessages((prev) => prev.slice(0, -1));
      setLastFailedMessage(null);
      handleSend(lastFailedMessage);
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    // Check if this is an error message with retry option
    if (item.options?.includes(RETRY_MESSAGE)) {
      return (
        <View>
          <AnimatedMessageBubble item={item} styles={styles} />
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={handleRetry}
            accessibilityLabel="Retry sending message"
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>🔄 Tap to retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return <AnimatedMessageBubble item={item} styles={styles} />;
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
      statusBarTranslucent={true}
    >
      <View style={styles.modalWrapper}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.coachAvatar}>
                <Sparkles size={20} color={theme.onPrimary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Goal Coach</Text>
                <Text style={styles.headerSubtitle}>
                  Your AI accountability buddy
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={theme.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={
              isTyping ? <TypingIndicator styles={styles} /> : null
            }
          />

          {/* Quick Suggestions */}
          {showSuggestions && messages.length <= 1 && (
            <View style={styles.suggestionsContainer}>
              {QUICK_SUGGESTIONS.map((suggestion) => {
                const Icon = suggestion.icon;
                return (
                  <TouchableOpacity
                    key={suggestion.id}
                    style={styles.suggestionChip}
                    onPress={() => handleSend(suggestion.text)}
                  >
                    <Icon size={14} color={theme.primary} />
                    <Text style={styles.suggestionText}>{suggestion.text}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Input */}
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
                  placeholder="Ask me anything..."
                  placeholderTextColor={theme.onSurfaceVariant + "80"}
                  onSubmitEditing={() => !isTyping && handleSend(inputValue)}
                  multiline
                  maxLength={500}
                  accessibilityLabel="Type your message to the coach"
                  accessibilityHint="Send a message by tapping the send button"
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
                      inputValue.trim()
                        ? theme.onPrimary
                        : theme.onSurfaceVariant
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    modalWrapper: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: theme.surfaceContainerLow,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: Platform.OS === "android" ? 40 : 60,
      paddingBottom: 16,
      backgroundColor: theme.surface,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    coachAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 18,
      fontFamily: Fonts.bold,
      color: theme.onSurface,
    },
    headerSubtitle: {
      fontSize: 12,
      fontFamily: Fonts.regular,
      color: theme.onSurfaceVariant,
    },
    closeBtn: {
      padding: 8,
      borderRadius: 20,
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
      flexDirection: "row", // Enable row layout for avatar + bubble
    },
    alignRight: {
      alignItems: "flex-end",
    },
    avatar: {
      width: 32,
      height: 32,
      marginRight: 8,
      borderRadius: 16,
      backgroundColor: theme.surfaceContainer,
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
      fontFamily: Fonts.regular,
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
    suggestionsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 8,
    },
    suggestionChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: theme.primaryContainer + "40",
      borderWidth: 1,
      borderColor: theme.primary + "30",
    },
    suggestionText: {
      fontSize: 13,
      fontFamily: Fonts.medium,
      color: theme.primary,
    },
    inputWrapper: {
      padding: 16,
      backgroundColor: theme.surfaceContainerLow,
      borderTopWidth: 1,
      borderTopColor: theme.outline + "20",
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      backgroundColor: theme.surfaceContainerHigh,
      borderRadius: 24,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: "transparent",
    },
    input: {
      flex: 1,
      fontSize: 16,
      fontFamily: Fonts.regular,
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
    retryBtn: {
      marginLeft: 0,
      marginTop: 8,
      backgroundColor: theme.primaryContainer,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 16,
      alignSelf: "flex-start",
    },
    retryText: {
      fontSize: 14,
      fontFamily: Fonts.medium,
      color: theme.primary,
    },
  });

export default CoachChatModal;
