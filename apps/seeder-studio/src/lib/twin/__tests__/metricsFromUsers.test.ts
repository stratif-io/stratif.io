import { describe, it, expect } from "vitest";
import { metricsFromUsers } from "../metricsFromUsers";
import type { SimulatedUser } from "../simulate";

const mkUser = (
  id: number,
  joinDay: number,
  activeDays: number[],
  reactivationDays: number[] = [],
  churnDay: number | null = null,
): SimulatedUser => ({ id, joinDay, activeDays, reactivationDays, churnDay });

describe("metricsFromUsers", () => {
  it("activeUsers[t] counts users active on day t, scaled", () => {
    const users = [mkUser(0, 0, [0, 1, 2]), mkUser(1, 0, [0, 2])];
    // 2 simulated users, totalUsers=10 → scale=5
    const m = metricsFromUsers(users, 3, 10, 1);
    expect(m.activeUsers[0]).toBe(10); // both active, scaled
    expect(m.activeUsers[1]).toBe(5); // only user 0 active
    expect(m.activeUsers[2]).toBe(10); // both active
  });

  it("newUsers[t] counts users who joined on day t, scaled", () => {
    const users = [
      mkUser(0, 0, [0, 1]),
      mkUser(1, 1, [1, 2]),
      mkUser(2, 1, [1]),
    ];
    const m = metricsFromUsers(users, 3, 3, 1); // scale = 3/3 = 1
    expect(m.newUsers[0]).toBe(1);
    expect(m.newUsers[1]).toBe(2);
    expect(m.newUsers[2]).toBe(0);
  });

  it("totalUsers[t] is cumulative sum of newUsers", () => {
    const users = [mkUser(0, 0, [0]), mkUser(1, 1, [1]), mkUser(2, 2, [2])];
    const m = metricsFromUsers(users, 3, 3, 1);
    expect(m.totalUsers[0]).toBe(1);
    expect(m.totalUsers[1]).toBe(2);
    expect(m.totalUsers[2]).toBe(3);
  });

  it("churnedUsers[t] counts users whose churnDay === t, scaled", () => {
    const users = [mkUser(0, 0, [0], [], 5), mkUser(1, 0, [0, 1, 2], [], null)];
    const m = metricsFromUsers(users, 10, 2, 1); // scale = 2/2 = 1
    expect(m.churnedUsers[5]).toBe(1);
    expect(m.churnedUsers[3]).toBe(0);
  });

  it("reactivatedUsers[t] counts reactivations on day t, scaled", () => {
    const users = [mkUser(0, 0, [0, 3, 4], [3]), mkUser(1, 0, [0, 3], [3])];
    const m = metricsFromUsers(users, 5, 2, 1);
    expect(m.reactivatedUsers[3]).toBe(2);
    expect(m.reactivatedUsers[0]).toBe(0);
  });

  it("events[t] = floor(activeUsers[t] * eventsPerActiveUser)", () => {
    const users = [mkUser(0, 0, [0, 1, 2])];
    const m = metricsFromUsers(users, 3, 1, 5);
    expect(m.events[0]).toBe(5);
    expect(m.events[1]).toBe(5);
  });

  it("stickiness is null for t < 28, number in [0,1] for t >= 28", () => {
    const activeDays = Array.from({ length: 40 }, (_, i) => i);
    const users = [mkUser(0, 0, activeDays)];
    const m = metricsFromUsers(users, 40, 1, 1);
    for (let t = 0; t < 28; t++) expect(m.stickiness[t]).toBeNull();
    for (let t = 28; t < 40; t++) {
      expect(m.stickiness[t]).not.toBeNull();
      expect(m.stickiness[t]!).toBeGreaterThanOrEqual(0);
      expect(m.stickiness[t]!).toBeLessThanOrEqual(1);
    }
  });

  it("stickiness equals 1 when user is active every day", () => {
    const activeDays = Array.from({ length: 60 }, (_, i) => i);
    const users = [mkUser(0, 0, activeDays)];
    const m = metricsFromUsers(users, 60, 1, 1);
    expect(m.stickiness[59]).toBeCloseTo(1, 5);
  });

  it("all array lengths equal days", () => {
    const users = [mkUser(0, 0, [0, 1, 2])];
    const m = metricsFromUsers(users, 5, 1, 1);
    expect(m.activeUsers).toHaveLength(5);
    expect(m.newUsers).toHaveLength(5);
    expect(m.totalUsers).toHaveLength(5);
    expect(m.churnedUsers).toHaveLength(5);
    expect(m.reactivatedUsers).toHaveLength(5);
    expect(m.events).toHaveLength(5);
    expect(m.stickiness).toHaveLength(5);
  });
});
