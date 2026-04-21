import type { SimulatedUser } from "./simulate";

export interface MetricsOutput {
  events: number[];
  activeUsers: number[];
  newUsers: number[];
  churnedUsers: number[];
  reactivatedUsers: number[];
  stickiness: (number | null)[];
  totalUsers: number[];
}

export function metricsFromUsers(
  users: SimulatedUser[],
  days: number,
  totalUsers: number,
  eventsPerActiveUser: number,
): MetricsOutput {
  const scale = users.length > 0 ? totalUsers / users.length : 1;

  const activeUsers = new Array<number>(days).fill(0);
  const newUsers = new Array<number>(days).fill(0);
  const churnedUsers = new Array<number>(days).fill(0);
  const reactivatedUsers = new Array<number>(days).fill(0);

  for (const user of users) {
    for (const day of user.activeDays) {
      if (day < days) activeUsers[day]++;
    }
    if (user.joinDay < days) newUsers[user.joinDay]++;
    if (user.churnDay !== null && user.churnDay < days)
      churnedUsers[user.churnDay]++;
    for (const day of user.reactivationDays) {
      if (day < days) reactivatedUsers[day]++;
    }
  }

  for (let t = 0; t < days; t++) {
    activeUsers[t] = Math.round(activeUsers[t] * scale);
    newUsers[t] = Math.round(newUsers[t] * scale);
    churnedUsers[t] = Math.round(churnedUsers[t] * scale);
    reactivatedUsers[t] = Math.round(reactivatedUsers[t] * scale);
  }

  // totalUsers: cumulative sum of newUsers
  const totalUsersArr = new Array<number>(days).fill(0);
  let cumulative = 0;
  for (let t = 0; t < days; t++) {
    cumulative += newUsers[t];
    totalUsersArr[t] = cumulative;
  }

  // events
  const events = activeUsers.map((au) => Math.floor(au * eventsPerActiveUser));

  // MAU via sliding window
  // Build sorted entry list of (day, userId) from activeDays
  type Entry = { day: number; userId: number };
  const entries: Entry[] = [];
  for (const user of users) {
    for (const day of user.activeDays) {
      if (day < days) entries.push({ day, userId: user.id });
    }
  }
  entries.sort((a, b) => a.day - b.day || a.userId - b.userId);

  const mauCounts = new Array<number>(days).fill(0);
  const windowUsers = new Map<number, number>(); // userId -> mostRecentActiveDay
  let entryIdx = 0;

  for (let t = 0; t < days; t++) {
    // Add entries with day <= t
    while (entryIdx < entries.length && entries[entryIdx].day <= t) {
      const { day, userId } = entries[entryIdx];
      const existing = windowUsers.get(userId);
      if (existing === undefined || day > existing) {
        windowUsers.set(userId, day);
      }
      entryIdx++;
    }

    // Evict users whose most recent active day < t - 27
    const cutoff = t - 27;
    for (const [userId, lastDay] of windowUsers) {
      if (lastDay < cutoff) windowUsers.delete(userId);
    }

    mauCounts[t] = windowUsers.size;
  }

  // stickiness
  const stickiness: (number | null)[] = new Array(days).fill(null);
  for (let t = 28; t < days; t++) {
    const mau = Math.round(mauCounts[t] * scale);
    if (mau > 0) {
      stickiness[t] = Math.min(1, activeUsers[t] / mau);
    } else {
      stickiness[t] = 0;
    }
  }

  return {
    events,
    activeUsers,
    newUsers,
    churnedUsers,
    reactivatedUsers,
    stickiness,
    totalUsers: totalUsersArr,
  };
}
