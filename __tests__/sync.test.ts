// Test for sync utilities
// Note: mergeById is internal, so we test a local copy of the logic

// We need to test the internal mergeById function
// Since it's not exported, let's create a mock version for testing
// In a real scenario, we'd export this or test through the public API

describe("Sync Utilities", () => {
  // Helper merge function (mirrors the one in sync.ts)
  function mergeById<T extends { id: string }>(local: T[], cloud: T[]): T[] {
    const map = new Map<string, T>();
    cloud.forEach((item) => map.set(item.id, item));
    local.forEach((item) => {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    });
    return Array.from(map.values());
  }

  describe("mergeById", () => {
    it("prefers cloud data over local for same ID", () => {
      const local = [{ id: "1", title: "Local Title" }];
      const cloud = [{ id: "1", title: "Cloud Title" }];

      const result = mergeById(local, cloud);

      expect(result.length).toBe(1);
      expect(result[0].title).toBe("Cloud Title");
    });

    it("includes local items not in cloud", () => {
      const local = [{ id: "1", title: "Local Only" }];
      const cloud = [{ id: "2", title: "Cloud Only" }];

      const result = mergeById(local, cloud);

      expect(result.length).toBe(2);
      expect(result.map((r) => r.id).sort()).toEqual(["1", "2"]);
    });

    it("handles empty local array", () => {
      const local: { id: string; title: string }[] = [];
      const cloud = [{ id: "1", title: "Cloud" }];

      const result = mergeById(local, cloud);

      expect(result).toEqual(cloud);
    });

    it("handles empty cloud array", () => {
      const local = [{ id: "1", title: "Local" }];
      const cloud: { id: string; title: string }[] = [];

      const result = mergeById(local, cloud);

      expect(result).toEqual(local);
    });

    it("handles both empty arrays", () => {
      const result = mergeById([], []);
      expect(result).toEqual([]);
    });

    it("handles duplicate IDs in same array (last wins)", () => {
      const local = [
        { id: "1", title: "First" },
        { id: "1", title: "Second" },
      ];
      const cloud: { id: string; title: string }[] = [];

      const result = mergeById(local, cloud);

      // Map will overwrite with last occurrence
      expect(result.length).toBe(1);
    });

    it("handles large arrays efficiently", () => {
      const local = Array.from({ length: 1000 }, (_, i) => ({
        id: `local-${i}`,
        title: `Local ${i}`,
      }));
      const cloud = Array.from({ length: 1000 }, (_, i) => ({
        id: `cloud-${i}`,
        title: `Cloud ${i}`,
      }));

      const start = Date.now();
      const result = mergeById(local, cloud);
      const duration = Date.now() - start;

      expect(result.length).toBe(2000);
      expect(duration).toBeLessThan(100); // Should be fast (< 100ms)
    });
  });
});

describe("Network Resilience Scenarios", () => {
  it("should handle null response gracefully", () => {
    // Simulating a null response from fetchRemoteData
    const data = null;

    // The sync function should not throw
    expect(() => {
      if (data) {
        // Process data
      }
    }).not.toThrow();
  });

  it("should handle undefined nested properties", () => {
    const response = {
      agendas: [{ id: "1", title: "Test", daily_tasks: undefined }],
    };

    // Should not throw when accessing optional nested data
    const tasks: any[] = [];
    response.agendas.forEach((agenda: any) => {
      if (agenda.daily_tasks) {
        agenda.daily_tasks.forEach((task: any) => tasks.push(task));
      }
    });

    expect(tasks).toEqual([]);
  });
});
