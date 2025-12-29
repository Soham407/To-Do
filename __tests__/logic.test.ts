import {
  getDailyTarget,
  parseLocalIsoDate,
  isDateInRecurrence,
} from "../src/utils/logic";
import { AgendaType, Agenda, Priority } from "../src/types";

describe("Logic Utilities", () => {
  describe("parseLocalIsoDate", () => {
    it("should parse YYYY-MM-DD correctly without timezone shifts", () => {
      const date = parseLocalIsoDate("2024-01-01");
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getDate()).toBe(1);
    });
  });

  describe("getDailyTarget", () => {
    it("should return targetVal if specified", () => {
      const agenda: Agenda = {
        id: "1",
        title: "Test",
        type: AgendaType.NUMERIC,
        targetVal: 20,
        totalTarget: 1000,
        bufferTokens: 3,
        frequency: "daily",
        startDate: "2024-01-01",
      };
      expect(getDailyTarget(agenda)).toBe(20);
    });

    it("should calculate target from totalTarget if targetVal is missing", () => {
      const agenda: Agenda = {
        id: "1",
        title: "Test",
        type: AgendaType.NUMERIC,
        totalTarget: 300,
        bufferTokens: 3,
        frequency: "daily",
        startDate: "2024-01-01",
      };
      // Default duration is 30, so 300/30 = 10
      expect(getDailyTarget(agenda)).toBe(10);
    });
  });

  describe("isDateInRecurrence", () => {
    it("should return true for DAILY pattern", () => {
      const agenda: Agenda = {
        id: "1",
        title: "Test",
        type: AgendaType.BOOLEAN,
        frequency: "daily",
        startDate: "2024-01-01",
        bufferTokens: 0,
        recurrencePattern: "DAILY",
      };
      expect(isDateInRecurrence(new Date(), agenda)).toBe(true);
    });

    it("should return false for WEEKDAYS on a weekend", () => {
      const agenda: Agenda = {
        id: "1",
        title: "Test",
        type: AgendaType.BOOLEAN,
        frequency: "daily",
        startDate: "2024-01-01",
        bufferTokens: 0,
        recurrencePattern: "WEEKDAYS",
      };
      const saturday = new Date(2024, 0, 6); // Saturday
      expect(isDateInRecurrence(saturday, agenda)).toBe(false);
    });
  });
});
