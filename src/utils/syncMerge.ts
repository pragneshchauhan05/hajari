import { Worker, MonthlyWorkerAttendance } from '../types';

/**
 * Intelligently merges local attendance database with cloud attendance database.
 * NEVER deletes or overwrites valid local entries (upad, status, notes)
 * if cloud is outdated, behind, or empty.
 */
export const mergeAttendanceDB = (
  local: Record<string, MonthlyWorkerAttendance>,
  cloud: Record<string, MonthlyWorkerAttendance>,
  allowedWorkerIds?: Set<string>
): { merged: Record<string, MonthlyWorkerAttendance>; hasLocalUnsynced: boolean } => {
  const isAllowedKey = (key: string) => {
    if (!allowedWorkerIds) return true;
    const workerId = key.split('_')[0];
    return allowedWorkerIds.has(workerId);
  };

  const filteredLocal: Record<string, MonthlyWorkerAttendance> = {};
  for (const [k, v] of Object.entries(local || {})) {
    if (isAllowedKey(k)) filteredLocal[k] = v;
  }

  const filteredCloud: Record<string, MonthlyWorkerAttendance> = {};
  for (const [k, v] of Object.entries(cloud || {})) {
    if (isAllowedKey(k)) filteredCloud[k] = v;
  }

  if (Object.keys(filteredCloud).length === 0) {
    return { merged: { ...filteredLocal }, hasLocalUnsynced: Object.keys(filteredLocal).length > 0 };
  }

  if (Object.keys(filteredLocal).length === 0) {
    return { merged: { ...filteredCloud }, hasLocalUnsynced: false };
  }

  const merged: Record<string, MonthlyWorkerAttendance> = { ...filteredCloud };
  let hasLocalUnsynced = false;

  for (const [key, localMonth] of Object.entries(filteredLocal)) {
    if (!merged[key]) {
      // Cloud doesn't have this worker's month at all - keep local!
      merged[key] = localMonth;
      hasLocalUnsynced = true;
    } else {
      // Cloud has this month - merge day by day safely
      const mergedMonth: MonthlyWorkerAttendance = { ...merged[key] };

      for (const [dayStr, localRecord] of Object.entries(localMonth)) {
        const day = Number(dayStr);
        const cloudRecord = mergedMonth[day];

        const localHasData =
          Boolean(localRecord?.status) ||
          (typeof localRecord?.upad === 'number' && localRecord.upad > 0) ||
          Boolean(localRecord?.note);

        const cloudHasData =
          cloudRecord &&
          (Boolean(cloudRecord.status) ||
            (typeof cloudRecord.upad === 'number' && cloudRecord.upad > 0) ||
            Boolean(cloudRecord.note));

        if (localHasData && !cloudHasData) {
          // Local has data that cloud doesn't have yet - PRESERVE LOCAL!
          mergedMonth[day] = localRecord;
          hasLocalUnsynced = true;
        } else if (localHasData && cloudHasData) {
          // Both have data: if cloud upad is 0 or missing but local upad > 0, preserve local upad!
          if ((!cloudRecord.upad || cloudRecord.upad === 0) && localRecord.upad && localRecord.upad > 0) {
            mergedMonth[day] = {
              ...cloudRecord,
              upad: localRecord.upad,
              note: localRecord.note || cloudRecord.note || '',
            };
            hasLocalUnsynced = true;
          }
        }
      }

      merged[key] = mergedMonth;
    }
  }

  return { merged, hasLocalUnsynced };
};

/**
 * Merges local workers with cloud workers.
 * Ensures no locally added workers or wage history entries vanish if cloud hasn't synced them yet.
 * Filters out foreign workers belonging to another user.
 */
export const mergeWorkers = (
  local: Worker[],
  cloud: Worker[],
  currentUserId?: string | null,
  currentUserEmail?: string | null
): { merged: Worker[]; hasLocalUnsynced: boolean } => {
  const curEmail = currentUserEmail?.trim().toLowerCase() || '';

  const isForeign = (w: Worker) => {
    const wEmail = (w.userEmail || '').trim().toLowerCase();
    const wName = (w.name || '').trim().toLowerCase();

    // If worker has userEmail and it doesn't match current user, it's foreign
    if (curEmail && wEmail && wEmail !== curEmail) return true;

    // If worker has userId and it doesn't match current user, it's foreign
    if (currentUserId && w.userId && w.userId !== currentUserId) return true;

    // Strict cross-contamination block for known foreign account emails
    if (wEmail.includes('bharatchauhan103') || wEmail.includes('bharatchauhan')) {
      if (!curEmail.includes('bharatchauhan')) {
        return true;
      }
    }

    return false;
  };

  const filteredLocal = (local || []).filter((w) => !isForeign(w));
  const filteredCloud = (cloud || []).filter((w) => !isForeign(w));

  if (filteredCloud.length === 0) {
    return { merged: [...filteredLocal], hasLocalUnsynced: filteredLocal.length > 0 };
  }

  if (filteredLocal.length === 0) {
    return { merged: [...filteredCloud], hasLocalUnsynced: false };
  }

  const localMap = new Map(filteredLocal.map((w) => [w.id, w]));
  const cloudIds = new Set(filteredCloud.map((w) => w.id));
  let hasLocalUnsynced = false;

  // Merge existing workers in cloud with local additions/history
  const merged: Worker[] = filteredCloud.map((cw) => {
    const lw = localMap.get(cw.id);
    if (!lw) return cw;

    // Combine wage history entries
    const combinedHistory = { ...(cw.wageHistory || {}), ...(lw.wageHistory || {}) };
    const historyChanged = JSON.stringify(combinedHistory) !== JSON.stringify(cw.wageHistory || {});

    const lwTime = typeof lw.updatedAt === 'number' ? lw.updatedAt : 0;
    const cwTime = typeof cw.updatedAt === 'number' ? cw.updatedAt : 0;
    const isLocalNewer = lwTime > cwTime;

    // Merge inactiveMonths: ensure month deactivations are never lost on browser refresh
    const localInactive = Array.isArray(lw.inactiveMonths) ? lw.inactiveMonths : [];
    const cloudInactive = Array.isArray(cw.inactiveMonths) ? cw.inactiveMonths : [];

    let resolvedInactive: string[];
    if (isLocalNewer) {
      // Local has freshest state (e.g. user just deactivated or reactivated worker on this device)
      resolvedInactive = localInactive;
    } else if (cwTime > lwTime) {
      // Cloud is strictly newer (e.g. edited from mobile device)
      resolvedInactive = cloudInactive;
    } else {
      // Timestamps match or legacy: union them so deactivations are never lost on reload
      resolvedInactive = Array.from(new Set([...cloudInactive, ...localInactive]));
    }

    const inactiveChanged = JSON.stringify([...resolvedInactive].sort()) !== JSON.stringify([...cloudInactive].sort());

    // Merge isDeleted
    let resolvedIsDeleted: boolean;
    if (isLocalNewer) {
      resolvedIsDeleted = lw.isDeleted === true;
    } else if (cwTime > lwTime) {
      resolvedIsDeleted = cw.isDeleted === true;
    } else {
      resolvedIsDeleted = lw.isDeleted === true || cw.isDeleted === true;
    }

    const isDeletedChanged = resolvedIsDeleted !== (cw.isDeleted === true);

    const sortedKeys = Object.keys(combinedHistory).sort();
    const latestWage = sortedKeys.length > 0 
      ? combinedHistory[sortedKeys[sortedKeys.length - 1]] 
      : (isLocalNewer ? (lw.dailyWage || cw.dailyWage) : (cw.dailyWage || lw.dailyWage));

    const latestUpdatedAt = Math.max(lwTime, cwTime) || Date.now();

    if (historyChanged || inactiveChanged || isDeletedChanged || isLocalNewer) {
      hasLocalUnsynced = true;
    }

    return {
      ...cw,
      userId: cw.userId || currentUserId || undefined,
      userEmail: cw.userEmail || currentUserEmail || undefined,
      name: isLocalNewer ? (lw.name || cw.name) : (cw.name || lw.name),
      village: isLocalNewer ? (lw.village || cw.village) : (cw.village || lw.village),
      mobile: isLocalNewer ? (lw.mobile || cw.mobile) : (cw.mobile || lw.mobile),
      dailyWage: latestWage,
      wageHistory: Object.keys(combinedHistory).length > 0 ? combinedHistory : undefined,
      inactiveMonths: resolvedInactive.length > 0 ? resolvedInactive : undefined,
      isDeleted: resolvedIsDeleted,
      updatedAt: latestUpdatedAt,
    };
  });

  // Preserve local workers not present in cloud
  for (const w of filteredLocal) {
    if (!cloudIds.has(w.id)) {
      merged.push({
        ...w,
        userId: w.userId || currentUserId || undefined,
        userEmail: w.userEmail || currentUserEmail || undefined,
      });
      hasLocalUnsynced = true;
    }
  }

  return { merged, hasLocalUnsynced };
};
