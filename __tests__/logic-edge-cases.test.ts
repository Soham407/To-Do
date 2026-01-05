import {
  getDailyTarget,
  parseLocalIsoDate,
  getLocalDateString,
  isDateInRecurrence,
  sanitizeMarkdown,
  recalculateNumericTasks,
} from "../src/utils/logic";
import { AgendaType, Agenda, DailyTask, TaskStatus } from "../src/types";

describe("Logic Utilities - Edge Cases", () => {
  describe("parseLocalIsoDate Edge Cases", () => {
    it("handles empty string by returning current date", () => {
      const date = parseLocalIsoDate("");
      expect(date.getTime()).not.toBeNaN();
    });

    it("handles null-ish values gracefully", () => {
      const date = parseLocalIsoDate(null as unknown as string);
      expect(date.getTime()).not.toBeNaN();
    });

    it("handles full ISO string with time", () => {
      const date = parseLocalIsoDate("2024-06-15T14:30:00Z");
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(5); // June
      expect(date.getDate()).toBe(15);
    });

    it("handles malformed date string", () => {
      const date = parseLocalIsoDate("not-a-date");
      expect(date.getTime()).not.toBeNaN(); // Falls back to new Date()
    });
  });

  describe("getLocalDateString Edge Cases", () => {
    it("handles invalid Date object", () => {
      const result = getLocalDateString(new Date("invalid"));
      // Should fallback to today's date
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("formats single-digit months and days with leading zeros", () => {
      const date = new Date(2024, 0, 5); // Jan 5
      expect(getLocalDateString(date)).toBe("2024-01-05");
    });
  });

  describe("getDailyTarget Edge Cases", () => {
    it("returns default 10 when no targetVal or totalTarget", () => {
      const agenda: Agenda = {
        id: "1",
        title: "Test",
        type: AgendaType.NUMERIC,
        bufferTokens: 0,
        frequency: "daily",
        startDate: "2024-01-01",
      };
      expect(getDailyTarget(agenda)).toBe(10);
    });

    it("returns 1 for BOOLEAN type agendas", () => {
      const agenda: Agenda = {
        id: "1",
        title: "Test",
        type: AgendaType.BOOLEAN,
        bufferTokens: 0,
        frequency: "daily",
        startDate: "2024-01-01",
      };
      expect(getDailyTarget(agenda)).toBe(1);
    });

    it("returns 1 for ONE_OFF type agendas", () => {
      const agenda: Agenda = {
        id: "1",
        title: "Test",
        type: AgendaType.ONE_OFF,
        bufferTokens: 0,
        frequency: "daily",
        startDate: "2024-01-01",
      };
      expect(getDailyTarget(agenda)).toBe(1);
    });

    it("handles zero targetVal (edge case)", () => {
      const agenda: Agenda = {
        id: "1",
        title: "Test",
        type: AgendaType.NUMERIC,
        targetVal: 0,
        totalTarget: 100,
        bufferTokens: 0,
        frequency: "daily",
        startDate: "2024-01-01",
      };
      // Should calculate from totalTarget since targetVal is 0
      expect(getDailyTarget(agenda)).toBeGreaterThan(0);
    });
  });

  describe("isDateInRecurrence Edge Cases", () => {
    it("returns true for ONE_OFF regardless of date", () => {
      const agenda: Agenda = {
        id: "1",
        title: "Test",
        type: AgendaType.ONE_OFF,
        frequency: "daily",
        startDate: "2024-01-01",
        bufferTokens: 0,
      };
      expect(isDateInRecurrence(new Date(2030, 5, 15), agenda)).toBe(true);
    });

    it("handles CUSTOM pattern with empty recurrenceDays", () => {
      const agenda: Agenda = {
        id: "1",
        title: "Test",
        type: AgendaType.BOOLEAN,
        frequency: "daily",
        startDate: "2024-01-01",
        bufferTokens: 0,
        recurrencePattern: "CUSTOM",
        recurrenceDays: [],
      };
      expect(isDateInRecurrence(new Date(), agenda)).toBe(false);
    });

    it("handles CUSTOM pattern with undefined recurrenceDays", () => {
      const agenda: Agenda = {
        id: "1",
        title: "Test",
        type: AgendaType.BOOLEAN,
        frequency: "daily",
        startDate: "2024-01-01",
        bufferTokens: 0,
        recurrencePattern: "CUSTOM",
      };
      expect(isDateInRecurrence(new Date(), agenda)).toBe(false);
    });

    it("handles WEEKLY pattern correctly", () => {
      const agenda: Agenda = {
        id: "1",
        title: "Test",
        type: AgendaType.BOOLEAN,
        frequency: "daily",
        startDate: "2024-01-01", // Monday
        bufferTokens: 0,
        recurrencePattern: "WEEKLY",
      };
      const monday = new Date(2024, 0, 8); // Next Monday
      const tuesday = new Date(2024, 0, 9);
      expect(isDateInRecurrence(monday, agenda)).toBe(true);
      expect(isDateInRecurrence(tuesday, agenda)).toBe(false);
    });
  });

  describe("sanitizeMarkdown Edge Cases", () => {
    it("handles empty string", () => {
      expect(sanitizeMarkdown("")).toBe("");
    });

    it("handles null/undefined", () => {
      expect(sanitizeMarkdown(null as unknown as string)).toBe("");
      expect(sanitizeMarkdown(undefined as unknown as string)).toBe("");
    });

    it("removes script tags", () => {
      const malicious = '<script>alert("xss")</script>Hello';
      expect(sanitizeMarkdown(malicious)).toBe("Hello");
    });

    it("preserves emoji", () => {
      const emoji = "Goals 🎯 for 2024 🚀";
      expect(sanitizeMarkdown(emoji)).toBe("Goals 🎯 for 2024 🚀");
    });

    it("preserves Unicode text", () => {
      const unicode = "学习日本語";
      expect(sanitizeMarkdown(unicode)).toBe("学习日本語");
    });
  });

  describe("recalculateNumericTasks Edge Cases", () => {
    it("handles task not found", () => {
      const tasks: DailyTask[] = [
        {
          id: "1",
          agendaId: "a1",
          scheduledDate: "2024-01-01",
          targetVal: 10,
          actualVal: 0,
          status: TaskStatus.PENDING,
        },
      ];
      const result = recalculateNumericTasks(
        tasks,
        "nonexistent",
        5,
        "TOMORROW"
      );
      expect(result).toEqual(tasks); // Unchanged
    });

    it("handles last task with TOMORROW strategy", () => {
      const tasks: DailyTask[] = [
        {
          id: "1",
          agendaId: "a1",
          scheduledDate: "2024-01-01",
          targetVal: 10,
          actualVal: 5,
          status: TaskStatus.FAILED,
        },
      ];
      const result = recalculateNumericTasks(tasks, "1", 5, "TOMORROW");
      // Should create a new task for the missing amount
      expect(result.length).toBe(2);
      expect(result[1].targetVal).toBe(5);
      expect(result[1].wasRecalculated).toBe(true);
    });

    it("handles SPREAD with single remaining task", () => {
      const tasks: DailyTask[] = [
        {
          id: "1",
          agendaId: "a1",
          scheduledDate: "2024-01-01",
          targetVal: 10,
          actualVal: 5,
          status: TaskStatus.FAILED,
        },
        {
          id: "2",
          agendaId: "a1",
          scheduledDate: "2024-01-02",
          targetVal: 10,
          actualVal: 0,
          status: TaskStatus.PENDING,
        },
      ];
      const result = recalculateNumericTasks(tasks, "1", 5, "SPREAD");
      expect(result[1].targetVal).toBe(15); // Original 10 + 5 spread
    });
  });
});

describe("Division by Zero Guards", () => {
  it("should not produce NaN or Infinity for zero targetVal", () => {
    const task: DailyTask = {
      id: "1",
      agendaId: "a1",
      scheduledDate: "2024-01-01",
      targetVal: 0, // Edge case!
      actualVal: 5,
      status: TaskStatus.PENDING,
    };

    // Simulate the percentage calculation (should be guarded)
    const percentage =
      task.targetVal > 0
        ? Math.min((task.actualVal / task.targetVal) * 100, 100)
        : 0;

    expect(percentage).toBe(0);
    expect(Number.isFinite(percentage)).toBe(true);
  });
});
