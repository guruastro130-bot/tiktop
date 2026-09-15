/**
 * dailyLiveTracker.ts
 * Manages persistent daily Face Live duration counting and 12:00 AM (Midnight) reset logic.
 *
 * Rules:
 * 1. Face Live duration is accumulated across multiple sessions in the same day (resumes from previous time, NOT 0).
 * 2. At 12:00 AM (midnight), a new day starts and duration resets to 0.
 * 3. Incomplete time from the previous day (e.g. 59 mins from 11:01 PM to 12:00 AM) cannot be claimed for rewards.
 */

export interface DailyLiveRecord {
  dateKey: string; // 'YYYY-MM-DD'
  accumulatedSeconds: number;
  claimedMilestone1: boolean; // 1 hour (3600s)
  claimedMilestone2: boolean; // 2 hours (7200s)
  lastUpdated: number;
}

/**
 * Returns today's calendar date key (YYYY-MM-DD) in local time.
 * Midnight (12:00:00 AM) automatically increments the date key to the next day.
 */
export const getTodayDateKey = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStorageKey = (userId: string): string => {
  const cleanId = userId || 'guest_creator';
  return `daily_face_live_${cleanId}`;
};

/**
 * Retrieves the daily record for the user.
 * If the record is from a previous day (prior to 12:00 AM), it automatically initializes a fresh 0-second record.
 */
export const getDailyLiveRecord = (userId: string): DailyLiveRecord => {
  const todayKey = getTodayDateKey();
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (raw) {
      const parsed: DailyLiveRecord = JSON.parse(raw);
      if (parsed.dateKey === todayKey) {
        return {
          dateKey: todayKey,
          accumulatedSeconds: Number(parsed.accumulatedSeconds) || 0,
          claimedMilestone1: Boolean(parsed.claimedMilestone1),
          claimedMilestone2: Boolean(parsed.claimedMilestone2),
          lastUpdated: Number(parsed.lastUpdated) || Date.now(),
        };
      }
    }
  } catch {
    // ignore parse errors
  }

  // Fresh record for today (starts at 12:00 AM with 0 seconds)
  return {
    dateKey: todayKey,
    accumulatedSeconds: 0,
    claimedMilestone1: false,
    claimedMilestone2: false,
    lastUpdated: Date.now(),
  };
};

/**
 * Saves the daily record for the user.
 */
export const saveDailyLiveRecord = (userId: string, record: DailyLiveRecord): void => {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(record));
  } catch {
    // storage quota or restricted environment
  }
};

/**
 * Updates the accumulated live seconds for today.
 * If 12:00 AM rollover occurs, it resets the seconds to 0 for the new day.
 */
export const updateDailyLiveSeconds = (
  userId: string,
  totalSeconds: number,
  claimedMilestone1?: boolean,
  claimedMilestone2?: boolean
): DailyLiveRecord => {
  const todayKey = getTodayDateKey();
  const current = getDailyLiveRecord(userId);

  // If date rolled over past 12:00 AM midnight
  if (current.dateKey !== todayKey) {
    const freshRecord: DailyLiveRecord = {
      dateKey: todayKey,
      accumulatedSeconds: 0,
      claimedMilestone1: false,
      claimedMilestone2: false,
      lastUpdated: Date.now(),
    };
    saveDailyLiveRecord(userId, freshRecord);
    return freshRecord;
  }

  const updatedRecord: DailyLiveRecord = {
    dateKey: todayKey,
    accumulatedSeconds: Math.max(0, totalSeconds),
    claimedMilestone1: claimedMilestone1 !== undefined ? claimedMilestone1 : current.claimedMilestone1,
    claimedMilestone2: claimedMilestone2 !== undefined ? claimedMilestone2 : current.claimedMilestone2,
    lastUpdated: Date.now(),
  };

  saveDailyLiveRecord(userId, updatedRecord);
  return updatedRecord;
};

/**
 * Marks milestone as claimed for today.
 */
export const markDailyMilestoneClaimed = (
  userId: string,
  milestone: 1 | 2
): DailyLiveRecord => {
  const current = getDailyLiveRecord(userId);
  if (milestone === 1) {
    current.claimedMilestone1 = true;
  } else if (milestone === 2) {
    current.claimedMilestone2 = true;
  }
  current.lastUpdated = Date.now();
  saveDailyLiveRecord(userId, current);
  return current;
};

/**
 * Validates if user is eligible to claim a milestone reward today.
 * Returns true only if accumulated seconds on the CURRENT day meet the threshold:
 * Milestone 1 = 3,600s (60 min)
 * Milestone 2 = 7,200s (120 min)
 */
export const isEligibleForLiveReward = (
  userId: string,
  milestone: 1 | 2,
  currentLiveSeconds: number
): { eligible: boolean; reason?: string } => {
  const record = getDailyLiveRecord(userId);
  const todayKey = getTodayDateKey();

  if (record.dateKey !== todayKey) {
    return { eligible: false, reason: '१२ AM मा नयाँ दिन सुरू भएकोले अघिल्लो दिनको समय गणना हुँदैन।' };
  }

  const effectiveSeconds = Math.max(record.accumulatedSeconds, currentLiveSeconds);

  if (milestone === 1) {
    if (record.claimedMilestone1) {
      return { eligible: false, reason: 'आजको १ घण्टाको रिवार्ड दाबी भइसकेको छ।' };
    }
    if (effectiveSeconds < 3600) {
      return { eligible: false, reason: 'आज कम्तीमा १ घण्टा (३६०० सेकेन्ड) पूरा हुनुपर्छ।' };
    }
    return { eligible: true };
  }

  if (milestone === 2) {
    if (record.claimedMilestone2) {
      return { eligible: false, reason: 'आजको २ घण्टाको अधिकतम रिवार्ड दाबी भइसकेको छ।' };
    }
    if (effectiveSeconds < 7200) {
      return { eligible: false, reason: 'आज कम्तीमा २ घण्टा (७२०० सेकेन्ड) पूरा हुनुपर्छ।' };
    }
    return { eligible: true };
  }

  return { eligible: false, reason: 'अमान्य माइलस्टोन।' };
};
