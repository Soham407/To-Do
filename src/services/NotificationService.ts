import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Agenda, AgendaType } from "../types";

// Configure standard behavior
Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    } as Notifications.NotificationBehavior),
});

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

    // In a real app we might get the ExpoPushToken here to send to backend
    // token = (await Notifications.getExpoPushTokenAsync()).data;

    return true;
  },

  // 2. Schedule Reminder
  scheduleTaskReminder: async (agenda: Agenda) => {
    if (!agenda.reminderTime) return;

    // Remove existing notification for this agenda to avoid duplicates
    await NotificationService.cancelReminder(agenda.id);

    const triggerDate = new Date(agenda.reminderTime);
    const now = new Date();

    // 2a. ONE_OFF Tasks
    if (agenda.type === AgendaType.ONE_OFF) {
      // Only schedule if in future
      if (triggerDate.getTime() > now.getTime()) {
        await Notifications.scheduleNotificationAsync({
          identifier: agenda.id,
          content: {
            title: "Reminder: " + agenda.title,
            body: "It's time to tackle this task!",
            data: { agendaId: agenda.id },
          },
          trigger: {
            date: triggerDate, // Specific point in time
            type: Notifications.SchedulableTriggerInputTypes.DATE,
          },
        });
      }
    }
    // 2b. Recurring Habits (Daily, etc.)
    else {
      // Extract hour/minute from reminderTime
      const hour = triggerDate.getHours();
      const minute = triggerDate.getMinutes();

      // Expo Notifications Trigger Input for recurring
      // We will keep it simple: Daily trigger at X time
      // Handling strict "Weekdays only" via Expo's local scheduler is complex
      // without scheduling multiple individual triggers.
      // For MVP, we will set a simplistic "Daily" trigger if the pattern is recurring.

      await Notifications.scheduleNotificationAsync({
        identifier: agenda.id,
        content: {
          title: "Goal Reminder: " + agenda.title,
          body: `Don't forget to hit your target of ${agenda.targetVal} ${
            agenda.unit || "units"
          }!`,
          data: { agendaId: agenda.id },
        },
        trigger: {
          hour,
          minute,
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
        },
      });
    }
  },

  // 3. Cancel Reminder
  cancelReminder: async (agendaId: string) => {
    await Notifications.cancelScheduledNotificationAsync(agendaId);
  },

  // 4. Cancel All (Logout/Reset)
  cancelAll: async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};
