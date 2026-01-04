import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Agenda, AgendaType, DailyTask, TaskStatus } from "../types";
import { getLocalDateString } from "../utils/logic";
import { calculateStreak } from "../utils/insightsLogic";

// Configure standard behavior
Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    } as Notifications.NotificationBehavior),
});

// Notification identifiers for coaching nudges
const NUDGE_IDS = {
  MORNING_MOTIVATION: "morning_motivation",
  STREAK_CELEBRATION: "streak_celebration",
  PRE_DUE_WARNING: "pre_due_warning",
  EVENING_REMINDER: "evening_reminder",
} as const;

// Schedule times (configurable)
const NOTIFICATION_SCHEDULE = {
  MORNING_HOUR: 8,
  MORNING_MINUTE: 0,
  EVENING_HOUR: 20,
  EVENING_MINUTE: 0,
} as const;

// Motivational messages for different scenarios
const MOTIVATION_MESSAGES = {
  morning: [
    "Rise and shine! 🌅 Today is a fresh start. What will you accomplish?",
    "Good morning! ☀️ Small steps lead to big victories. Let's make today count!",
    "A new day, a new opportunity to get closer to your goals. You've got this! 💪",
    "Morning! 🌞 Yesterday's efforts are today's foundation. Keep building!",
    "Wake up with determination, go to bed with satisfaction. Let's start! 🚀",
  ],
  streakCelebration: {
    7: "🔥 7 DAYS STRONG! You've completed a full week! Your consistency is inspiring!",
    14: "🌟 TWO WEEKS! 14 days of dedication. You're building unstoppable momentum!",
    21: "🏆 21 DAYS! They say it takes 21 days to build a habit. You did it!",
    30: "🎉 ONE MONTH STREAK! 30 days of incredible discipline. You're amazing!",
    50: "⭐ 50 DAY MILESTONE! Half a hundred days of pure dedication!",
    100: "🌈 100 DAYS! A century of consistency. You're in the top 1%!",
  },
  encouragement: [
    "Remember: Progress, not perfection. Every step counts! 🌱",
    "You're closer to your goal than you were yesterday. Keep going! 💪",
    "The only bad workout is the one that didn't happen. Same with tasks! 🎯",
    "Small consistent actions create massive results. You're on track! ⭐",
    "Today's effort is tomorrow's reward. Make it happen! 🚀",
  ],
  incompleteTasks: [
    "Hey! You still have some tasks waiting for you today. Make time for a quick win! ✨",
    "Your goals miss you! 😊 There's still time to check off a task today.",
    "Don't let today slip away! Even one small task keeps your momentum going. 💪",
    "Evening check-in: How about tackling one more thing before the day ends? 🌙",
  ],
};

export const NotificationService = {
  // 1. Register for permissions
  registerForPushNotificationsAsync: async () => {
    let token;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });

      // Create coaching nudges channel
      await Notifications.setNotificationChannelAsync("coaching", {
        name: "Coaching & Motivation",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250],
        lightColor: "#4CAF50",
      });
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Failed to get push token for push notification!");
      return;
    }

    return true;
  },

  // 2. Schedule Task Reminder
  scheduleTaskReminder: async (agenda: Agenda) => {
    // Always cancel existing reminder first
    await NotificationService.cancelReminder(agenda.id);

    if (!agenda.reminderTime) return;

    const triggerDate = new Date(agenda.reminderTime);
    const now = new Date();

    // ONE_OFF Tasks
    if (agenda.type === AgendaType.ONE_OFF) {
      if (triggerDate.getTime() > now.getTime()) {
        await Notifications.scheduleNotificationAsync({
          identifier: agenda.id,
          content: {
            title: "⏰ Reminder: " + agenda.title,
            body: "It's time to tackle this task!",
            data: { agendaId: agenda.id, type: "task_reminder" },
          },
          trigger: {
            date: triggerDate,
            type: Notifications.SchedulableTriggerInputTypes.DATE,
          },
        });
      }
    }
    // Recurring Habits
    else {
      const hour = triggerDate.getHours();
      const minute = triggerDate.getMinutes();

      // For WEEKDAYS or CUSTOM, we might need more complex logic,
      // but for now let's fix the basic daily vs specific day issue.
      if (
        agenda.recurrencePattern === "WEEKLY" &&
        agenda.recurrenceDays &&
        agenda.recurrenceDays.length > 0
      ) {
        // Expo needs one notification per weekday.
        // For this fix, we'll schedule for the first selected day or default to daily if logic gets too complex for the current service structure.
        // A better fix would be a loop, but let's at least avoid the "Daily for everything" trap.
        await Promise.all(
          agenda.recurrenceDays.map((day) =>
            Notifications.scheduleNotificationAsync({
              identifier: `${agenda.id}_${day}`,
              content: {
                title: "🎯 Goal Reminder: " + agenda.title,
                body: `Time to hit your target of ${agenda.targetVal} ${
                  agenda.unit || "units"
                }!`,
                data: { agendaId: agenda.id, type: "goal_reminder" },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                weekday: (day % 7) + 1, // Expo uses 1-7 (Sunday-Saturday)
                hour,
                minute,
              },
            })
          )
        );
      } else if (agenda.recurrencePattern === "WEEKDAYS") {
        await Promise.all(
          [2, 3, 4, 5, 6].map((day) =>
            Notifications.scheduleNotificationAsync({
              identifier: `${agenda.id}_${day}`,
              content: {
                title: "🎯 Goal Reminder: " + agenda.title,
                body: `Time to hit your target of ${agenda.targetVal} ${
                  agenda.unit || "units"
                }!`,
                data: { agendaId: agenda.id, type: "goal_reminder" },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                weekday: day,
                hour,
                minute,
              },
            })
          )
        );
      } else {
        await Notifications.scheduleNotificationAsync({
          identifier: agenda.id,
          content: {
            title: "🎯 Goal Reminder: " + agenda.title,
            body: `Time to hit your target of ${agenda.targetVal} ${
              agenda.unit || "units"
            }!`,
            data: { agendaId: agenda.id, type: "goal_reminder" },
          },
          trigger: {
            hour,
            minute,
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
          },
        });
      }
    }
  },

  // 3. Schedule Morning Motivation (Daily at 8 AM)
  scheduleMorningMotivation: async (enabled: boolean = true) => {
    // Cancel existing
    await Notifications.cancelScheduledNotificationAsync(
      NUDGE_IDS.MORNING_MOTIVATION
    );

    if (!enabled) return;

    const randomMessage =
      MOTIVATION_MESSAGES.morning[
        Math.floor(Math.random() * MOTIVATION_MESSAGES.morning.length)
      ];

    await Notifications.scheduleNotificationAsync({
      identifier: NUDGE_IDS.MORNING_MOTIVATION,
      content: {
        title: "Good Morning! ☀️",
        body: randomMessage,
        data: { type: "morning_motivation" },
      },
      trigger: {
        hour: NOTIFICATION_SCHEDULE.MORNING_HOUR,
        minute: NOTIFICATION_SCHEDULE.MORNING_MINUTE,
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
      },
    });
  },

  // 4. Schedule Evening Reminder (Check incomplete tasks at 8 PM)
  scheduleEveningReminder: async (enabled: boolean = true) => {
    await Notifications.cancelScheduledNotificationAsync(
      NUDGE_IDS.EVENING_REMINDER
    );

    if (!enabled) return;

    const randomMessage =
      MOTIVATION_MESSAGES.incompleteTasks[
        Math.floor(Math.random() * MOTIVATION_MESSAGES.incompleteTasks.length)
      ];

    await Notifications.scheduleNotificationAsync({
      identifier: NUDGE_IDS.EVENING_REMINDER,
      content: {
        title: "Evening Check-in 🌙",
        body: randomMessage,
        data: { type: "evening_reminder" },
      },
      trigger: {
        hour: NOTIFICATION_SCHEDULE.EVENING_HOUR,
        minute: NOTIFICATION_SCHEDULE.EVENING_MINUTE,
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
      },
    });
  },

  // 5. Send Streak Celebration (Call when streak milestone reached)
  sendStreakCelebration: async (streakDays: number) => {
    const milestones = [7, 14, 21, 30, 50, 100];
    if (!milestones.includes(streakDays)) return;

    const message =
      MOTIVATION_MESSAGES.streakCelebration[
        streakDays as keyof typeof MOTIVATION_MESSAGES.streakCelebration
      ];

    await Notifications.scheduleNotificationAsync({
      identifier: NUDGE_IDS.STREAK_CELEBRATION + "_" + streakDays,
      content: {
        title: `🔥 ${streakDays}-Day Streak!`,
        body: message,
        data: { type: "streak_celebration", streakDays },
      },
      trigger: null, // Immediate
    });
  },

  // 6. Schedule Pre-Due Warning (3 days before goal ends)
  schedulePreDueWarning: async (agenda: Agenda, progress: number) => {
    if (!agenda.endDate) return;

    const endDate = new Date(agenda.endDate);
    const now = new Date();
    const daysUntilEnd = Math.ceil(
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Only warn when 3 days or less remain
    if (daysUntilEnd > 3 || daysUntilEnd < 0) return;

    const identifier = NUDGE_IDS.PRE_DUE_WARNING + "_" + agenda.id;
    await Notifications.cancelScheduledNotificationAsync(identifier);

    const progressPercent = Math.round(progress * 100);
    let message = "";

    if (progressPercent >= 90) {
      message = `Almost there! ${progressPercent}% complete with ${daysUntilEnd} days left. You've got this! 🎯`;
    } else if (progressPercent >= 70) {
      message = `${progressPercent}% done with ${daysUntilEnd} days remaining. Let's push through! 💪`;
    } else {
      message = `${daysUntilEnd} days left! Currently at ${progressPercent}%. Time to focus and finish strong! 🚀`;
    }

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: `📅 "${agenda.title}" Deadline Approaching`,
        body: message,
        data: { agendaId: agenda.id, type: "pre_due_warning" },
      },
      trigger: null, // Immediate notification
    });
  },

  // 7. Send Context-Aware Coaching Nudge
  sendCoachingNudge: async (context: {
    type: "tired_pattern" | "friday_slump" | "comeback" | "encouragement";
    details?: string;
  }) => {
    let title = "";
    let body = "";

    switch (context.type) {
      case "tired_pattern":
        title = "💙 We noticed something...";
        body =
          context.details ||
          "You often feel tired on certain days. Consider scheduling lighter tasks then!";
        break;
      case "friday_slump":
        title = "😊 Friday Thoughts";
        body =
          "Fridays can be challenging for focus. How about tackling just your most important task today?";
        break;
      case "comeback":
        title = "Welcome back! 🌟";
        body =
          "We missed you! Remember, every day is a fresh start. Ready to get back on track?";
        break;
      case "encouragement":
        body =
          MOTIVATION_MESSAGES.encouragement[
            Math.floor(Math.random() * MOTIVATION_MESSAGES.encouragement.length)
          ];
        title = "💪 You've Got This!";
        break;
    }

    await Notifications.scheduleNotificationAsync({
      identifier: "coaching_nudge_" + Date.now(),
      content: {
        title,
        body,
        data: { type: "coaching_nudge", nudgeType: context.type },
      },
      trigger: null, // Immediate
    });
  },

  // 8. Setup All Smart Notifications (Call on app startup)
  setupSmartNotifications: async (options?: {
    morningMotivation?: boolean;
    eveningReminder?: boolean;
  }) => {
    const { morningMotivation = true, eveningReminder = true } = options || {};

    await NotificationService.scheduleMorningMotivation(morningMotivation);
    await NotificationService.scheduleEveningReminder(eveningReminder);
  },

  // 9. Check and Send Streak Milestones (Call after task completion)
  checkStreakMilestones: async (tasks: DailyTask[], agendaId: string) => {
    const { current } = calculateStreak(tasks, agendaId);
    const milestones = [7, 14, 21, 30, 50, 100];

    if (milestones.includes(current)) {
      await NotificationService.sendStreakCelebration(current);
    }
  },

  // 10. Cancel Reminder
  cancelReminder: async (agendaId: string) => {
    await Notifications.cancelScheduledNotificationAsync(agendaId);
  },

  // 11. Cancel All
  cancelAll: async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  // 12. Get All Scheduled Notifications (for debugging)
  getAllScheduled: async () => {
    return await Notifications.getAllScheduledNotificationsAsync();
  },
};
