import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { GiftedChat, IMessage, Reply, User } from "react-native-gifted-chat";
import { Agenda, AgendaType, ChatMessage } from "../types";
import { generateId, getTodayDateString } from "../utils/logic";
import { MD3Colors } from "../theme";

interface OnboardingChatProps {
  onComplete: (agenda: Agenda) => void;
  onCancel: () => void;
}

const BOT_USER: User = {
  _id: 2,
  name: "Goal Coach",
  avatar: "https://placeimg.com/140/140/any",
};

const OnboardingChat: React.FC<OnboardingChatProps> = ({
  onComplete,
  onCancel,
}) => {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [step, setStep] = useState<
    "NAME" | "TYPE" | "TARGET" | "UNIT" | "CONFIRM"
  >("NAME");
  const [draftAgenda, setDraftAgenda] = useState<Partial<Agenda>>({});
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    setMessages([
      {
        _id: 1,
        text: "Hi! I'm your Goal Coach. I'm here to help you break down a big goal. What's the name of the goal you want to achieve?",
        createdAt: new Date(),
        user: BOT_USER,
      },
    ]);
  }, []);

  const onSend = (newMessages: IMessage[] = []) => {
    setMessages((previousMessages) =>
      GiftedChat.append(previousMessages, newMessages)
    );
    // Safe check if message exists
    if (!newMessages[0]) return;

    const text = newMessages[0].text;

    setIsTyping(true);
    setTimeout(() => {
      processInput(text);
      setIsTyping(false);
    }, 1200);
  };

  const addBotMessage = (text: string, options?: string[]) => {
    const msg: IMessage = {
      _id: generateId(),
      text,
      createdAt: new Date(),
      user: BOT_USER,
    };

    if (options && options.length > 0) {
      msg.quickReplies = {
        type: "radio", // or 'checkbox'
        keepIt: true,
        values: options.map((opt) => ({ title: opt, value: opt })),
      };
    }

    setMessages((previousMessages) =>
      GiftedChat.append(previousMessages, [msg])
    );
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

      case "TARGET":
        const target = parseInt(input.replace(/[^0-9]/g, ""));
        if (isNaN(target)) {
          addBotMessage("Please enter a valid number.");
          return;
        }
        setDraftAgenda({ ...draftAgenda, totalTarget: target * 30 }); // Logic matches ref
        setStep("UNIT");
        addBotMessage("What is the unit? (e.g., pages, minutes, km)", [
          "pages",
          "minutes",
          "hours",
        ]);
        break;

      case "UNIT":
        setDraftAgenda({ ...draftAgenda, unit: input });
        setStep("CONFIRM");
        const dailyTarget =
          draftAgenda.totalTarget && draftAgenda.totalTarget > 0
            ? Math.ceil(draftAgenda.totalTarget / 30)
            : 0;
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
          };
          onComplete(newAgenda);
        } else {
          onCancel();
        }
        break;
    }
  };

  // Handle Quick Reply Press
  const onQuickReply = (replies: Reply[]) => {
    onSend([
      {
        _id: generateId(),
        createdAt: new Date(),
        text: replies[0].title,
        user: { _id: 1 }, // Me
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: MD3Colors.surfaceContainerLow }}>
      <GiftedChat
        messages={messages}
        onSend={(messages) => onSend(messages)}
        user={{
          _id: 1,
        }}
        isTyping={isTyping}
        onQuickReply={onQuickReply}
        quickReplyStyle={{
          borderRadius: 20,
          backgroundColor: MD3Colors.surface,
          borderWidth: 1,
          borderColor: MD3Colors.outline + "40",
        }}
        // Basic customization via props if available, else standard
      />
    </View>
  );
};

export default OnboardingChat;
